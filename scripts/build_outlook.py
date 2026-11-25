"""Yield outlook for the current season, from the model that won the rolling-origin benchmark.

Pipeline: build_features.py → model_benchmark.py (every model × driver set, forecasting each year 1996–2025 from
earlier years only) → select_models.py (top-3 ensemble chosen on 1996–2015, kept only if it also beats the trend on
2016–2025) → this script.

For each country and level the chosen ensemble (or the trend, where nothing passed) is refitted on every season up
to 2025 and applied to this season's ocean and weather drivers.
  outlook yield = trend projected to the target year (line through the last ten trend values) × (1 + deviation)
  90 % range    = deviation ± 1.645 × the unit's forecast RMSE over 1996–2025 (shrunk towards its level's RMSE)
  skill         = 1 − SSE(forecast) / SSE(trend) over the 1996–2025 rolling forecasts (and the 2016–2025 test alone)
  drivers       = how much the forecast moves when each driver group (oceans/ENSO, heat, water, last year) is set
                  to its average — an approximate, model-agnostic split
Target year: 2026 for every country except Australia (2026 already in the data → 2027 crop; its weather is not
observed until April 2027, so the outlook is the trend). Output: data/processed/outlook.json
"""
import json, os, sys, warnings
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC
import model_benchmark as MB
warnings.filterwarnings('ignore')

D = json.load(open(PROC / 'dashboard_data.json')); C = json.load(open(PROC / 'climate.json'))
CH = json.load(open(PROC / 'model_choice.json')); F = MB.F
GROUPS = {'ocean': MB.OCEAN, 'heat': ['t', 't_e', 't_m', 't_l', 'tmax_m', 't_hot2'],
          'water': ['spei', 'spi', 'p', 'p_e', 'p_m', 'p_l', 'sm', 'sm0', 'spei_dry2', 'spei_wet2', 'p_m_dry2', 'p_l_wet2'], 'memory': ['lag1']}
Y0 = C['years'][0]


def target_year(cc):
    return 2027 if D['countries'][cc]['national']['years'][-1] >= 2026 else 2026


def project_trend(r, Y):
    yrs = np.array(r['years'], float); tr = np.array(r['trend'], float); k = yrs >= yrs.max() - 9
    if k.sum() < 3: return float(tr[-1])
    b, a = np.polyfit(yrs[k], tr[k], 1); return float(max(0.0, a + b * Y))


def ens_predict(tr, te, top):
    """mean prediction of the chosen models, plus the same with each driver group held at its average"""
    full = np.zeros(len(te)); parts = {g: np.zeros(len(te)) for g in GROUPS}
    for m, fs in top:
        cols = MB.FS[fs]; pm = MB.MODELS[m](tr, te, cols); full += pm / len(top)
        for g, gc in GROUPS.items():
            used = [c for c in gc if c in cols]
            if not used: parts[g] += 0; continue
            te2 = te.copy(); te2[used] = tr[used].mean().values
            parts[g] += (pm - MB.MODELS[m](tr, te2, cols)) / len(top)
    return full, parts


def rolling(cc, lvl, choice):
    """1996–2025 rolling forecasts of the chosen predictor, from the cached benchmark parts"""
    P = pd.read_pickle(MB.PARTS / f'{cc}_{lvl}.pkl'); T = P[P.model == 'trend'][['year', 'unit', 'y', 'p', 'w']].rename(columns={'p': 'b'})
    if choice == 'trend': return T.assign(p=T.b)
    X = P[P.set_index(['model', 'fs']).index.isin([tuple(t) for t in CH[cc][lvl]['top']])]
    E = X.groupby(['year', 'unit'], as_index=False).p.mean()
    return T.merge(E, on=['year', 'unit'])


def unit_stats(R):
    lvl_mse = np.average((R.y - R.p) ** 2, weights=R.w); out = {}
    for u, g in R.groupby('unit'):
        n = len(g); mse = np.mean((g.y - g.p) ** 2); k = 10
        rm = float(np.sqrt((n * mse + k * lvl_mse) / (n + k)))
        sb = np.sum((g.y - g.b) ** 2); sk = 1 - np.sum((g.y - g.p) ** 2) / sb if sb > 0 else 0.0
        out[u] = (rm, float(sk), {'y': g.year.astype(int).tolist(), 'obs': g.y.round(1).tolist(), 'pred': g.p.round(1).tolist()})
    return out


def lists(cc):
    c = D['countries'][cc]
    return {'region': [(r['id'], r) for r in c['regions']], 'admin1': [(a['name'], a) for a in c['admin1']], 'national': [('NAT', c['national'])]}


out = {'method': 'top-3 ensemble chosen by rolling-origin skill on 1996–2015, kept only if it also beats the trend on 2016–2025',
       'weatherThrough': C['through'], 'oniThrough': f"{D['oni']['season'][-1]} {D['oni']['year'][-1]}", 'countries': {}}
for cc in ['US', 'BR', 'IN', 'AR', 'CN', 'PK', 'AU']:
    Y = target_year(cc); lastY = D['countries'][cc]['national']['years'][-1]
    res = {'year': Y, 'levels': {}, 'regions': {}, 'admin1': {}, 'national': None}
    for lvl, L in lists(cc).items():
        ch = CH[cc].get(lvl)
        if ch is None: continue
        use = ch['use']
        if cc == 'AU' and Y == 2027: use = 'trend'                       # 2026–27 weather not observed yet
        src = 'admin1' if use == 'from_admin1' else lvl
        choice = 'trend' if use == 'trend' else 'ensemble'
        Dl = F[(F.cc == cc) & (F.level == src)]
        tr = Dl[(Dl.year <= 2025) & Dl.y.notna()]; te = Dl[Dl.year == Y]
        if te.empty: te = tr.drop_duplicates('unit', keep='last').assign(year=Y)   # no weather row for the target year → trend
        if choice == 'trend':
            pred = MB.m_trend(tr, te, ['oni']); parts = {g: np.zeros(len(te)) for g in GROUPS}
        else:
            top = CH[cc][src]['top'] if use != 'from_admin1' else CH[cc]['admin1']['top']
            pred, parts = ens_predict(tr, te, top)
        R = rolling(cc, src, choice)
        if use == 'from_admin1':          # national = area-weighted sum of the state forecasts
            w = te.area.values / te.area.sum(); pred = np.array([np.sum(pred * w)]); parts = {g: np.array([np.sum(v * w)]) for g, v in parts.items()}
            R['wy'] = R.w * R.y; R['wp'] = R.w * R.p
            G = R.groupby('year', as_index=False)[['wp', 'w']].sum(); G['p'] = G.wp / G.w
            Tn = pd.read_pickle(MB.PARTS / f'{cc}_national.pkl'); Tn = Tn[Tn.model == 'trend'][['year', 'unit', 'y', 'p', 'w']].rename(columns={'p': 'b'})
            R = Tn.merge(G[['year', 'p']], on='year'); te = F[(F.cc == cc) & (F.level == 'national') & (F.year == Y)]
            if te.empty: te = Tn.tail(1).assign(unit='NAT')
        US = unit_stats(R)
        ens = CH[cc][src]['ens'] if use == 'from_admin1' else ch['ens']
        if use == 'from_admin1': ens = ch['from_admin1']['ens']
        res['levels'][lvl] = {'use': use, 'models': (CH[cc]['admin1']['top'] if use == 'from_admin1' else ch['top']) if choice != 'trend' else [],
                              'skill': {k: (round(v, 3) if v == v else None) for k, v in ens.items()} if choice != 'trend' else {'sel': 0, 'test': 0, 'all': 0},
                              'candidate': {k: (round(v, 3) if v == v else None) for k, v in ch['ens'].items()},
                              'best_single': ch['best_single'], 'enso_only': ch.get('enso_only'), 'season_only': ch.get('season_only')}
        byid = dict(L)
        for i, u in enumerate(te.unit.values):
            r = byid.get(u)
            if r is None or u not in US or r['years'][-1] < lastY - 5: continue
            rm, sk, hc = US[u]; pct = float(pred[i]); trv = project_trend(r, Y); k = Y - Y0
            w = C['countries'][cc]['national'] if lvl == 'national' else (C['countries'][cc]['admin1'].get(u) if lvl == 'admin1' else C['countries'][cc]['regions'].get(u))
            wx = {'t': w['t'][k], 'spei': w['spei'][k]} if (w and k < len(C['years']) and w['t'][k] is not None) else None
            Fu = {'pct': round(pct, 1), 'lo': round(pct - 1.645 * rm, 1), 'hi': round(pct + 1.645 * rm, 1), 'kg': round(trv * (1 + pct / 100)), 'trend': round(trv),
                  'c': [round(float(parts[g][i]), 1) for g in GROUPS], 'sk': round(sk, 3), 'use': use, 'wx': wx}
            if lvl != 'region': Fu['hc'] = hc
            if lvl == 'region': res['regions'][u] = Fu
            elif lvl == 'admin1': res['admin1'][u] = Fu
            else: res['national'] = Fu
    if cc == 'AU' and not res['regions']:      # Australia's local areas are its states
        for r in D['countries'][cc]['regions']:
            if r['admin1'] in res['admin1']: res['regions'][r['id']] = {k: v for k, v in res['admin1'][r['admin1']].items() if k != 'hc'}
    n = res['national']; out['countries'][cc] = res
    print(cc, Y, {l: (v['use'], v['skill']['all'], v['skill']['test']) for l, v in res['levels'].items()}, '| national', n and (n['pct'], n['lo'], n['hi'], n['kg'], n['c']), '| areas', len(res['regions']))
B = pd.read_csv(PROC / 'benchmark.csv')
out['bench'] = [[r.cc, r.level, r.model, r.fs, *(None if pd.isna(v) else round(float(v), 3) for v in (r.sel, r.test, r['all']))] for _, r in B.iterrows()]
json.dump(out, open(PROC / 'outlook.json', 'w'), separators=(',', ':'), default=float)
print('outlook.json', round(os.path.getsize(PROC / 'outlook.json') / 1e6, 2), 'MB')
