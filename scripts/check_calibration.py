"""Checks that the dashboard's 90% ranges behave like 90% ranges.

For every area × phase, the years are shuffled at random (so ENSO has no real effect) and the
Welch 90% interval used by the dashboard is recomputed. A well-calibrated method flags ≈10% of
them as "confident". The old 400-draw percentile bootstrap is shown for comparison.
Run:  python3 scripts/check_calibration.py
"""
import json, os, sys
import numpy as np
from scipy import stats
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC

D = json.load(open(PROC / 'dashboard_data.json'))
rng = np.random.default_rng(42)

def welch(a, b):
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    df = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))
    h = stats.t.ppf(0.95, df) * np.sqrt(va + vb); d = a.mean() - b.mean()
    return d - h, d + h

def boot(a, b, B=400):
    bs = a[rng.integers(0, len(a), (B, len(a)))].mean(1) - b[rng.integers(0, len(b), (B, len(b)))].mean(1)
    bs.sort(); return bs[int(B * .05)], bs[int(B * .95)]

rows = []
for cc in ['US', 'BR', 'IN', 'AR']:
    C = D['countries'][cc]; ph = C['phases']
    for r in C['regions'] + C['admin1'] + [C['national']]:
        an = np.array(r['anom']); lab = np.array([(ph.get(str(y)) or {'phase': 'Neutral'})['phase'] for y in r['years']])
        for p in ['El Niño', 'La Niña']:
            na, nb = (lab == p).sum(), (lab == 'Neutral').sum()
            if na < 3 or nb < 3: continue
            fw = fb = 0
            for _ in range(20):
                s = rng.permutation(an); a, b = s[:na], s[na:na + nb]
                lo, hi = welch(a, b); fw += lo > 0 or hi < 0
                lo, hi = boot(a, b); fb += lo > 0 or hi < 0
            rows.append((na, fw / 20, fb / 20))
rows = np.array(rows)
print('Share flagged "confident" when there is no real effect (ideal: 10%)')
for lo, hi in [(3, 4), (5, 7), (8, 11), (12, 99)]:
    m = (rows[:, 0] >= lo) & (rows[:, 0] <= hi)
    print(f'  {lo:>2}–{hi:<2} event years: Welch {rows[m,1].mean():6.1%}   old bootstrap {rows[m,2].mean():6.1%}   ({m.sum()} area×phase)')
print(f'  all            : Welch {rows[:,1].mean():6.1%}   old bootstrap {rows[:,2].mean():6.1%}')
