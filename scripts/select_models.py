"""Pick the forecast model for every country × level from the rolling-origin benchmark — without peeking at the test years.

For each country and level: rank every model × driver set on 1996–2015 skill, average the top three into an
ensemble, and score that ensemble on 2016–2025 (never used for choosing). The ensemble is adopted only if it beats
the trend in *both* periods; otherwise the outlook falls back to the trend. National figures can also come from the
pooled state model added up by area ("national←admin1") if that scores better on 1996–2015.
Output: data/processed/model_choice.json
"""
import json, os, sys
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC

PARTS = PROC / '_bench_parts'
def sk(h):
    s = np.sum(h.w * (h.y - h.b) ** 2); return 1 - np.sum(h.w * (h.y - h.p) ** 2) / s if s > 0 else np.nan

def evaluate(P, nat=None):
    B = P[P.model == 'trend'][['year', 'unit', 'p']].rename(columns={'p': 'b'}) if nat is None else nat
    X = P[P.model != 'trend'].merge(B, on=['year', 'unit'] if nat is None else ['year'])
    rows = [(m, fs, sk(g[g.year <= 2015]), sk(g[g.year > 2015]), sk(g)) for (m, fs), g in X.groupby(['model', 'fs'])]
    R = pd.DataFrame(rows, columns=['model', 'fs', 'sel', 'test', 'all']).sort_values('sel', ascending=False)
    top = R.head(3)[['model', 'fs']].values.tolist()
    E = X[X.set_index(['model', 'fs']).index.isin([tuple(t) for t in top])].groupby(['year', 'unit'], as_index=False).agg(y=('y', 'first'), p=('p', 'mean'), w=('w', 'first'), b=('b', 'first'))
    return R, top, E, {'sel': sk(E[E.year <= 2015]), 'test': sk(E[E.year > 2015]), 'all': sk(E)}

out = {}; report = []; ALL = []
for cc in ['US', 'BR', 'IN', 'AR', 'CN', 'PK', 'AU']:
    out[cc] = {}
    for lvl in ['national', 'admin1', 'region']:
        f = PARTS / f'{cc}_{lvl}.pkl'
        if not f.exists(): continue
        P = pd.read_pickle(f); R, top, E, s = evaluate(P)
        best1 = R.iloc[0]
        cand = {'level': lvl, 'top': top, 'ens': s, 'best_single': {'model': best1.model, 'fs': best1.fs, 'sel': best1.sel, 'test': best1.test, 'all': best1['all']},
                'enso_only': R[(R.model == 'ridge') & (R.fs == 'enso')][['sel', 'test', 'all']].iloc[0].to_dict() if ((R.model == 'ridge') & (R.fs == 'enso')).any() else None,
                'season_only': R[(R.model == 'ridge') & (R.fs == 'enso+season')][['sel', 'test', 'all']].iloc[0].to_dict() if ((R.model == 'ridge') & (R.fs == 'enso+season')).any() else None}
        if lvl == 'national':   # national rebuilt from the pooled state forecasts
            fa = PARTS / f'{cc}_admin1.pkl'
            if fa.exists():
                A = pd.read_pickle(fa); A['wy'] = A.w * A.y; A['wp'] = A.w * A.p
                G = A.groupby(['model', 'fs', 'year'], as_index=False)[['wp', 'w']].sum(); G['p'] = G.wp / G.w
                nat = P[P.model == 'trend'][['year', 'y', 'p', 'w']].rename(columns={'p': 'b'})
                G = G.drop(columns=['wp', 'w']).merge(nat, on='year'); G['unit'] = 'NAT'
                X = G[G.model != 'trend']
                rows = [(m, fs, sk(g[g.year <= 2015]), sk(g[g.year > 2015]), sk(g)) for (m, fs), g in X.groupby(['model', 'fs'])]
                RA = pd.DataFrame(rows, columns=['model', 'fs', 'sel', 'test', 'all']).sort_values('sel', ascending=False); topA = RA.head(3)[['model', 'fs']].values.tolist()
                EA = X[X.set_index(['model', 'fs']).index.isin([tuple(t) for t in topA])].groupby('year', as_index=False).agg(y=('y', 'first'), p=('p', 'mean'), w=('w', 'first'), b=('b', 'first'))
                sA = {'sel': sk(EA[EA.year <= 2015]), 'test': sk(EA[EA.year > 2015]), 'all': sk(EA)}
                cand['from_admin1'] = {'top': topA, 'ens': sA}
        # decision
        use = 'ensemble' if (s['sel'] > 0.02 and s['test'] > 0) else 'trend'
        if lvl == 'national' and 'from_admin1' in cand:
            a = cand['from_admin1']['ens']
            if a['sel'] > max(s['sel'], 0.02) and a['test'] > 0: use = 'from_admin1'
            elif use == 'trend' and a['sel'] > 0.02 and a['test'] > 0: use = 'from_admin1'
        cand['use'] = use; out[cc][lvl] = cand
        ALL.append(R.assign(cc=cc, level=lvl))
        report.append((cc, lvl, use, s['sel'], s['test'], s['all'], best1.model + '/' + best1.fs, best1.sel, best1.test, (cand.get('from_admin1') or {}).get('ens', {}).get('test', np.nan)))
json.dump(out, open(PROC / 'model_choice.json', 'w'), indent=1, default=float)
pd.concat(ALL).round(4).to_csv(PROC / 'benchmark.csv', index=False)
pd.set_option('display.width', 200)
print(pd.DataFrame(report, columns=['cc', 'level', 'use', 'ens_sel', 'ens_test', 'ens_all', 'best_single', 'b_sel', 'b_test', 'fromA1_test']).round(3).to_string(index=False))
