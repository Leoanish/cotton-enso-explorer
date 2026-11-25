"""Which model and which drivers predict cotton yield deviations best — tested like a real forecast.

Rolling origin: for every test year Y (1996–2025) each model is trained only on years < Y and predicts Y.
Models are ranked on 1996–2015 ("selection") and the winner is judged on 2016–2025 ("test"), which played no
part in choosing it. Skill = 1 − SSE(model) / SSE(trend), area-weighted, where "trend" predicts each unit's own
average past deviation (i.e. the trend line). Levels: national series, states pooled within a country, local
areas pooled within a country, and national figures rebuilt from the pooled state / local forecasts.
Output: data/processed/_bench_parts/*.pkl (rolling-origin predictions, not committed); scored by select_models.py
"""
import os, sys, time, warnings
import numpy as np, pandas as pd
from sklearn.linear_model import Lasso
from sklearn.cross_decomposition import PLSRegression
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC
warnings.filterwarnings('ignore')

F = pd.read_pickle(PROC / '_features.pkl')
F['oni_neg'] = np.minimum(F.oni, 0); F['spei_dry2'] = np.minimum(F.spei, 0) ** 2; F['spei_wet2'] = np.maximum(F.spei, 0) ** 2
F['t_hot2'] = np.maximum(F.t, 0) ** 2; F['p_m_dry2'] = np.minimum(F.p_m, 0) ** 2; F['p_l_wet2'] = np.maximum(F.p_l, 0) ** 2
OCEAN = ['oni', 'oni_neg', 'oni_pre', 'oni_tend', 'nino12', 'nino4', 'dmi', 'atl3', 'tna', 'pdo']
SEASON = ['t', 'spei', 'spei_dry2', 'spei_wet2']
WX = SEASON + ['p', 'spi', 'sm', 'sm0', 't_e', 't_m', 't_l', 'p_e', 'p_m', 'p_l', 'tmax_m', 't_hot2', 'p_m_dry2', 'p_l_wet2']
FS = {'enso': ['oni', 'oni_neg'], 'ocean': OCEAN, 'season': SEASON, 'enso+season': ['oni', 'oni_neg'] + SEASON,
      'weather': WX, 'all': OCEAN + WX, 'all+lag': OCEAN + WX + ['lag1']}
TEST = list(range(1996, 2026)); SEL = [y for y in TEST if y <= 2015]; HOLD = [y for y in TEST if y > 2015]


def prep(tr, te, cols):
    mu = tr[cols].mean(); sd = tr[cols].std().replace(0, 1).fillna(1)
    Xtr = ((tr[cols] - mu) / sd).fillna(0).values; Xte = ((te[cols] - mu) / sd).fillna(0).values
    um = tr.groupby('unit').y.mean(); btr = tr.unit.map(um).values; bte = te.unit.map(um).fillna(tr.y.mean()).values
    return Xtr, Xte, tr.y.values - btr, bte, tr.area.values


def ridge_fit(X, y, w, lam):
    sw = np.sqrt(w / w.mean()); Xw = X * sw[:, None]; yw = y * sw
    return np.linalg.solve(Xw.T @ Xw + lam * np.eye(X.shape[1]), Xw.T @ yw)


def inner_folds(years, k=5):
    u = np.unique(years); return [np.isin(years, u[i::k]) for i in range(k)]


def m_ridge(tr, te, cols):
    X, Xt, y, b, w = prep(tr, te, cols); n = len(np.unique(tr.year)); best = None
    for lam in [0.3, 1, 3, 10, 30, 100, 1e3, 1e6]:
        L = lam * len(y) / n; e = 0
        for f in inner_folds(tr.year.values):
            beta = ridge_fit(X[~f], y[~f], w[~f], L); e += np.sum(w[f] * (y[f] - X[f] @ beta) ** 2)
        if best is None or e < best[0]: best = (e, L)
    return b + Xt @ ridge_fit(X, y, w, best[1])


def m_lasso(tr, te, cols):
    X, Xt, y, b, w = prep(tr, te, cols); best = None
    for a in [0.03, 0.1, 0.3, 1, 3, 10]:
        e = 0
        for f in inner_folds(tr.year.values):
            m = Lasso(alpha=a, max_iter=4000).fit(X[~f], y[~f], sample_weight=w[~f]); e += np.sum(w[f] * (y[f] - m.predict(X[f])) ** 2)
        if best is None or e < best[0]: best = (e, a)
    return b + Lasso(alpha=best[1], max_iter=4000).fit(X, y, sample_weight=w).predict(Xt)


def m_pls(tr, te, cols):
    X, Xt, y, b, w = prep(tr, te, cols)
    return b + PLSRegression(n_components=min(2, X.shape[1])).fit(X, y).predict(Xt).ravel()


def m_rf(tr, te, cols):
    X, Xt, y, b, w = prep(tr, te, cols + (['lat', 'lon'] if tr.unit.nunique() > 1 else []))
    m = RandomForestRegressor(n_estimators=100, min_samples_leaf=max(5, len(y) // 400), max_features=0.4, n_jobs=2, random_state=0)
    return b + m.fit(X, y, sample_weight=w).predict(Xt)


def m_hgb(tr, te, cols):
    X, Xt, y, b, w = prep(tr, te, cols + (['lat', 'lon'] if tr.unit.nunique() > 1 else []))
    m = HistGradientBoostingRegressor(max_iter=200, learning_rate=0.03, max_depth=3, min_samples_leaf=max(10, len(y) // 300), l2_regularization=1.0, random_state=0)
    return b + m.fit(X, y, sample_weight=w).predict(Xt)


UR_LAM = {}
def m_unit_ridge(tr, te, cols):
    """separate ridge per unit; λ chosen once per level & feature set by inner CV on the first training window, then reused"""
    X, Xt, y, b, w = prep(tr, te, cols); out = b.copy(); units_tr = tr.unit.values; units_te = te.unit.values
    key = (tr.cc.iloc[0], tr.level.iloc[0], tuple(cols)); best = UR_LAM.get(key)
    for lam in ([] if best else [1, 3, 10, 30, 100, 1e6]):
        e = 0
        for f in inner_folds(tr.year.values, 4):
            for u in np.unique(units_tr[f]):
                a = (units_tr == u) & ~f; t_ = (units_tr == u) & f
                if a.sum() < 8: continue
                beta = ridge_fit(X[a], y[a] - y[a].mean(), np.ones(a.sum()), lam); e += np.sum(w[t_] * (y[t_] - y[a].mean() - X[t_] @ beta) ** 2)
        if best is None or e < best[0]: best = (e, lam)
    UR_LAM[key] = best
    for u in np.unique(units_te):
        a = units_tr == u; t_ = units_te == u
        if a.sum() < 8: continue
        beta = ridge_fit(X[a], y[a] - y[a].mean(), np.ones(a.sum()), best[1]); out[t_] = b[t_] + y[a].mean() + Xt[t_] @ beta
    return out


def m_trend(tr, te, cols):
    return prep(tr, te, cols[:1])[3]


MODELS = {'trend': m_trend, 'ridge': m_ridge, 'lasso': m_lasso, 'pls': m_pls, 'rf': m_rf, 'gbm': m_hgb, 'unit-ridge': m_unit_ridge}
PLAN = {   # which model × feature set to run at each level (trees only on the richer sets at local level to keep it tractable)
    'national': [(m, f) for m in ['ridge', 'lasso', 'pls', 'rf', 'gbm'] for f in FS] + [('trend', 'enso')],
    'admin1': [(m, f) for m in ['ridge', 'lasso', 'pls', 'rf', 'gbm', 'unit-ridge'] for f in FS] + [('trend', 'enso')],
    'region': [('ridge', f) for f in FS] + [('lasso', f) for f in ['all', 'all+lag']] + [(m, f) for m in ['rf', 'gbm'] for f in ['enso+season', 'all', 'all+lag']] + [('unit-ridge', 'enso+season'), ('unit-ridge', 'all'), ('trend', 'enso')],
}

PARTS = PROC / '_bench_parts'


def main():
    PARTS.mkdir(exist_ok=True)
    t0 = time.time()
    ONLY = sys.argv[1:]                 # optional: country codes to run (parts are cached, so runs resume)
    for cc in ['IN', 'PK', 'BR', 'AR', 'CN', 'AU', 'US']:
        for lvl in ['national', 'admin1', 'region']:
            if cc == 'AU' and lvl == 'region': continue          # AU regions are its states
            part = PARTS / f'{cc}_{lvl}.pkl'
            if part.exists() or (ONLY and cc not in ONLY): continue
            preds = []
            D = F[(F.cc == cc) & (F.level == lvl)].copy(); D = D[D.year <= 2025]
            for mname, fs in PLAN[lvl]:
                if lvl == 'region' and cc == 'US' and ((mname in ('rf', 'gbm') and fs != 'all+lag') or mname == 'unit-ridge'): continue   # 32k rows: keep it tractable
                cols = FS[fs]
                for Y in TEST:
                    tr = D[(D.year < Y) & D.y.notna()]; te = D[(D.year == Y) & D.y.notna()]
                    if len(te) == 0 or tr.year.nunique() < 15: continue
                    p = MODELS[mname](tr, te, cols)
                    preds.append(pd.DataFrame({'cc': cc, 'level': lvl, 'model': mname, 'fs': fs, 'year': Y, 'unit': te.unit.values, 'y': te.y.values, 'p': p, 'w': te.area.values}))
            pd.concat(preds, ignore_index=True).to_pickle(part)
            print(cc, lvl, f'{time.time() - t0:.0f}s', flush=True)
    need = [f'{cc}_{l}.pkl' for cc in ['IN', 'PK', 'BR', 'AR', 'CN', 'AU', 'US'] for l in ['national', 'admin1', 'region'] if not (cc == 'AU' and l == 'region')]
    if not all((PARTS / n).exists() for n in need): sys.exit('parts still missing: ' + ', '.join(n for n in need if not (PARTS / n).exists()))
    print('all parts done — run scripts/select_models.py')


if __name__ == '__main__':
    main()
