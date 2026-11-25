"""Yield outlook for the current season, with honest hindcast skill.

For every area (county/district/…), state/zone and country, yield deviation from trend (%) is modelled as a ridge
regression on six standardised drivers of the growing window:
  ENSO   window ONI and its La Niña part (min(ONI,0)) — lets El Niño and La Niña act differently
  heat   window mean temperature anomaly (°C)
  water  SPEI, plus squared drought (min(SPEI,0)²) and squared wetness (max(SPEI,0)²) — both extremes can hurt
Ridge strength λ is chosen per country and level by leave-one-year-out hindcasts from a grid that runs up to
"trust nothing" (λ = 1e6, i.e. predict the area's average deviation). So where ENSO and weather never helped in
past years, the outlook falls back to the trend on its own.

Outlook = trend projected to the target year (straight line through the last 10 trend values) × (1 + predicted
deviation). 90 % range = ± 1.645 × the area's hindcast RMSE. Skill = mean-square skill score of the hindcast
deviations against the area's average deviation (1 = perfect, 0 = no better than trend, < 0 = worse).
Target year: 2026 crop for every country, except Australia (2026 harvest already in the data → 2027 crop, ENSO
persisted from the latest ONI, weather assumed normal). Output: data/processed/outlook.json
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC

D = json.load(open(PROC / 'dashboard_data.json')); C = json.load(open(PROC / 'climate.json'))
Y0 = C['years'][0]
LAMS = [1, 3, 10, 30, 100, 1e6]
ONIWIN = {'US': [(0, s) for s in range(4, 10)], 'CN': [(0, s) for s in range(4, 10)], 'PK': [(0, s) for s in range(4, 10)],
          'IN': [(0, s) for s in range(5, 11)], 'BR': [(-1, 11)] + [(0, s) for s in range(0, 5)],
          'AR': [(-1, 10), (-1, 11)] + [(0, s) for s in range(0, 4)], 'AU': [(-1, 10), (-1, 11)] + [(0, s) for s in range(0, 4)]}
SE = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ']
ONI = {(y, SE.index(s)): v for y, s, v in zip(D['oni']['year'], D['oni']['season'], D['oni']['v'])}
LASTONI = D['oni']['v'][-1]


def win_oni(cc, Y):
    v = [ONI.get((Y + o, s)) for o, s in ONIWIN[cc]]; have = [x for x in v if x is not None]
    if len(have) >= 4: return float(np.mean(have)), len(have) == len(v)
    return float(np.mean(have + [LASTONI] * (len(v) - len(have)))), False   # persistence for unobserved seasons


def feats(oni, t, s):
    oni, t, s = map(lambda a: np.asarray(a, float), (oni, t, s))
    return np.c_[oni, np.minimum(oni, 0), t, s, np.minimum(s, 0) ** 2, np.maximum(s, 0) ** 2]
GROUP = [0, 0, 1, 2, 2, 2]          # enso, heat, water


def fit(X, y, lam):
    mu = X.mean(0); sd = X.std(0); sd[sd < 1e-9] = 1; Z = (X - mu) / sd; ym = y.mean()
    b = np.linalg.solve(Z.T @ Z + lam * np.eye(Z.shape[1]), Z.T @ (y - ym))
    return mu, sd, ym, b


def rows(cc, r, w):
    ph = D['countries'][cc]['phases']; out = []
    for y, a in zip(r['years'], r['anom']):
        k = y - Y0
        if 0 <= k < len(C['years']) and w['spei'][k] is not None and w['t'][k] is not None and str(y) in ph and ph[str(y)]['oni'] is not None:
            out.append((y, a, ph[str(y)]['oni'], w['t'][k], w['spei'][k]))
    return np.array(out, float)


def loyo(A, lam):
    X = feats(A[:, 2], A[:, 3], A[:, 4]); y = A[:, 1]; p = np.zeros(len(y)); c0 = np.zeros(len(y))
    for i in range(len(y)):
        m = np.ones(len(y), bool); m[i] = False; mu, sd, ym, b = fit(X[m], y[m], lam)
        p[i] = ym + ((X[i] - mu) / sd) @ b; c0[i] = ym
    return p, c0


def target_year(cc):
    last = D['countries'][cc]['national']['years'][-1]
    return 2027 if last >= 2026 else 2026


def project_trend(r, Y):
    yrs = np.array(r['years'], float); tr = np.array(r['trend'], float); k = yrs >= yrs.max() - 9
    if k.sum() < 3: return float(tr[-1])
    b, a = np.polyfit(yrs[k], tr[k], 1); return float(max(0.0, a + b * Y))


def lists(cc):
    c = D['countries'][cc]; cl = C['countries'][cc]
    return {'region': [(r, cl['regions'].get(r['id'])) for r in c['regions']],
            'admin1': [(a, cl['admin1'].get(a['name'])) for a in c['admin1']],
            'national': [(c['national'], cl['national'])]}


out = {'method': 'ridge on ENSO + heat + SPEI, λ by leave-one-year-out', 'oniThrough': f"{D['oni']['season'][-1]} {D['oni']['year'][-1]}",
       'weatherThrough': C['through'], 'countries': {}}
for cc in ['US', 'BR', 'IN', 'AR', 'CN', 'PK', 'AU']:
    Y = target_year(cc); oni_t, oni_full = win_oni(cc, Y); kY = Y - Y0
    lastY = D['countries'][cc]['national']['years'][-1]
    res = {'year': Y, 'oni': round(oni_t, 2), 'oniObserved': oni_full, 'weatherObserved': kY < len(C['years']),
           'lam': {}, 'skill': {}, 'compare': {}, 'regions': {}, 'admin1': {}, 'national': None}
    for lvl, L in lists(cc).items():
        data = [(r, w, rows(cc, r, w)) for r, w in L if w]
        data = [(r, w, A) for r, w, A in data if len(A) >= 15]
        # choose λ by pooled hindcast skill
        best = None; cache = {}
        for lam in LAMS:
            se = sc = 0
            for r, w, A in data:
                p, c0 = loyo(A, lam); cache[(r['id'], lam)] = (p, c0)
                se += np.sum((A[:, 1] - p) ** 2); sc += np.sum((A[:, 1] - c0) ** 2)
            s = 1 - se / sc if sc else 0
            if best is None or s > best[1] + 1e-9: best = (lam, s)
        lam = best[0]; res['lam'][lvl] = lam; res['skill'][lvl] = round(best[1], 3)
        if lvl == 'national':       # which drivers carry the signal: ENSO only / weather only / both
            for name, cols in [('enso', [0, 1]), ('weather', [2, 3, 4, 5]), ('both', [0, 1, 2, 3, 4, 5])]:
                se = sc = 0
                for r, w, A in data:
                    X = feats(A[:, 2], A[:, 3], A[:, 4])[:, cols]; y = A[:, 1]
                    for i in range(len(y)):
                        m = np.ones(len(y), bool); m[i] = False; mu, sd, ym, b = fit(X[m], y[m], 10)
                        se += (y[i] - ym - ((X[i] - mu) / sd) @ b) ** 2; sc += (y[i] - ym) ** 2
                res['compare'][name] = round(1 - se / sc, 3)
        for r, w, A in data:
            if r['years'][-1] < lastY - 5: continue                      # no longer grows cotton
            p, c0 = cache[(r['id'], lam)]; y = A[:, 1]
            rmse = float(np.sqrt(np.mean((y - p) ** 2))); sk = 1 - np.sum((y - p) ** 2) / max(np.sum((y - c0) ** 2), 1e-9)
            X = feats(A[:, 2], A[:, 3], A[:, 4]); mu, sd, ym, b = fit(X, y, lam)
            if kY < len(C['years']) and w['t'][kY] is not None and w['spei'][kY] is not None:
                t, s = w['t'][kY], w['spei'][kY]; wobs = True
            else:
                t, s = 0.0, 0.0; wobs = False                         # season not observed yet → normal weather
            x = feats([oni_t], [t], [s])[0]; z = (x - mu) / sd; parts = z * b
            pct = float(ym + parts.sum()); contrib = [round(float(parts[[i for i, g in enumerate(GROUP) if g == k]].sum()), 1) for k in range(3)]
            tr = project_trend(r, Y); kg = tr * (1 + pct / 100)
            F = {'pct': round(pct, 1), 'lo': round(pct - 1.645 * rmse, 1), 'hi': round(pct + 1.645 * rmse, 1),
                 'kg': round(kg), 'trend': round(tr), 'c': contrib, 'base': round(float(ym), 1), 'sk': round(float(sk), 3),
                 'r': round(float(np.corrcoef(y, p)[0, 1]), 2) if np.std(p) > 1e-9 else 0.0,
                 'wx': {'t': round(t, 2), 'spei': round(s, 2)} if wobs else None, 'n': int(len(y))}
            if lvl != 'region':
                F['hc'] = {'y': [int(v) for v in A[:, 0]], 'obs': [round(float(v), 1) for v in y], 'pred': [round(float(v), 1) for v in p]}
            if lvl == 'region': res['regions'][r['id']] = F
            elif lvl == 'admin1': res['admin1'][r['name']] = F
            else: res['national'] = F
    n = res['national']
    print(cc, Y, 'oni', res['oni'], 'λ', res['lam'], 'skill', res['skill'], 'compare', res['compare'],
          '| national', n and (n['pct'], n['lo'], n['hi'], n['kg'], n['trend'], n['c']), 'areas', len(res['regions']))
    out['countries'][cc] = res
json.dump(out, open(PROC / 'outlook.json', 'w'), separators=(',', ':'))
print('outlook.json', round(os.path.getsize(PROC / 'outlook.json') / 1e6, 2), 'MB')
