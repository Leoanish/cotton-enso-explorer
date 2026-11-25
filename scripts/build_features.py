"""Feature table for the model benchmark: one row per (country, level, unit, crop year).

Target: yield deviation from trend (%), as everywhere else in the dashboard.
Features (all over the country's growing window unless stated):
  ocean   oni (window mean), oni_pre (3 months before the window), oni_tend (last 2 − first 2 window months),
          nino12, nino4, flavour (Niño1+2 − Niño4: eastern vs central-Pacific El Niño), dmi (Indian Ocean Dipole),
          atl3 (Atlantic Niño), tna (tropical North Atlantic), pdo — computed from ERSST v5 vs 1991–2020; PDO from NCEI
  season  t, p, spi, spei (from climate.json), sm (soil-moisture anomaly, CPC), sm0 (soil moisture the month before sowing)
  timing  t_e/t_m/t_l and p_e/p_m/p_l (early/mid/late thirds of the window; rain as monthly z-scores), tmax_m (hottest month anomaly)
  memory  lag1 (last year's yield deviation)
Output: data/processed/_features.pkl (not committed)
"""
import json, os, sys
import numpy as np, pandas as pd
from netCDF4 import Dataset, num2date
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import PROC, RAW

CL = RAW / 'climate'
D = json.load(open(PROC / 'dashboard_data.json')); C = json.load(open(PROC / 'climate.json'))
WIN = {'US': [(0, m) for m in range(5, 11)], 'CN': [(0, m) for m in range(5, 11)], 'PK': [(0, m) for m in range(5, 11)],
       'IN': [(0, m) for m in range(6, 12)], 'BR': [(-1, 12)] + [(0, m) for m in range(1, 6)],
       'AR': [(-1, 11), (-1, 12)] + [(0, m) for m in range(1, 5)], 'AU': [(-1, 11), (-1, 12)] + [(0, m) for m in range(1, 5)]}

# ---------------- ocean indices from ERSST v5 (monthly anomalies vs 1991–2020)
nc = Dataset(CL / 'sst.mnmean.nc'); t = nc['time']; ds = num2date(t[:], t.units)
ym = [(d.year, d.month) for d in ds]; k0 = next(i for i, x in enumerate(ym) if x[0] >= 1948)
la = nc['lat'][:]; lo = nc['lon'][:]; SST = np.ma.filled(nc['sst'][k0:].astype(float), np.nan); ym = ym[k0:]; nc.close()
def box(n, s, w, e):
    w %= 360; e %= 360
    li = (la <= n) & (la >= s); lj = (lo >= w) & (lo <= e) if w <= e else ((lo >= w) | (lo <= e))
    wts = np.cos(np.radians(la[li]))[:, None] * np.ones(lj.sum())[None, :]
    X = SST[:, li][:, :, lj]; m = ~np.isnan(X)
    return np.nansum(X * wts, (1, 2)) / (m * wts).sum((1, 2))
def anom(x):
    a = x.copy(); mon = np.array([m for y, m in ym]); yr = np.array([y for y, m in ym])
    for m in range(1, 13):
        k = mon == m; a[k] = x[k] - np.nanmean(x[k & (yr >= 1991) & (yr <= 2020)])
    return a
IDX = {
    'nino34': anom(box(5, -5, -170, -120)), 'nino12': anom(box(0, -10, -90, -80)), 'nino4': anom(box(5, -5, 160, -150)),
    'dmi': anom(box(10, -10, 50, 70)) - anom(box(0, -10, 90, 110)), 'atl3': anom(box(3, -3, -20, 0)), 'tna': anom(box(23.5, 5.5, -57.5, -15)),
}
pdo = {}
for line in open(CL / 'pdo.dat').read().splitlines()[2:]:
    p = line.split()
    if len(p) == 13 and p[0].isdigit():
        for m, v in enumerate(p[1:], 1):
            if float(v) < 90: pdo[(int(p[0]), m)] = float(v)
MI = {x: i for i, x in enumerate(ym)}
def idx_mean(name, months):
    if name == 'pdo': v = [pdo.get(x) for x in months]; v = [a for a in v if a is not None]
    else: v = [IDX[name][MI[x]] for x in months if x in MI]
    return float(np.mean(v)) if len(v) >= max(1, len(months) - 2) else np.nan
def shift(y, m, k):
    n = y * 12 + (m - 1) + k; return (n // 12, n % 12 + 1)

# ---------------- per-unit monthly weather
M = np.load(PROC / '_area_monthly.npz'); tm = [tuple(x) for x in M['months']]; TI = {x: i for i, x in enumerate(tm)}
mon_arr = np.array([m for y, m in tm]); yr_arr = np.array([y for y, m in tm])
def monthly_anoms(arr):
    t, p, pet, sm = arr
    def a(x, z=False):
        o = np.full_like(x, np.nan)
        for m in range(1, 13):
            k = mon_arr == m; ref = x[k & (yr_arr >= 1991) & (yr_arr <= 2020)]
            mu, sd = np.nanmean(ref), np.nanstd(ref)
            o[k] = (x[k] - mu) / (sd if (z and sd > 1e-6) else 1)
        return o
    return a(t), a(np.sqrt(np.maximum(p, 0)), True), a(sm, True)

rows = []
YRS = C['years']
for cc, W in WIN.items():
    c = D['countries'][cc]; cl = C['countries'][cc]; nW = len(W); th = [W[:nW // 3], W[nW // 3:2 * nW // 3], W[2 * nW // 3:]]
    units = [('region', r, cl['regions'].get(r['id']), f"{cc}|R|{r['id']}") for r in c['regions']] + \
            [('admin1', a, cl['admin1'].get(a['name']), f"{cc}|A|{a['name']}") for a in c['admin1']] + \
            [('national', c['national'], cl['national'], f"{cc}|N|NAT")]
    for lvl, r, w, key in units:
        if w is None or key not in M.files: continue
        ta, pz, sz = monthly_anoms(M[key]); yrs = r['years']; an = dict(zip(yrs, r['anom']))
        for Y in range(1950, 2027):
            k = Y - YRS[0]
            mons = [(Y + o, m) for o, m in W]; have = [TI[x] for x in mons if x in TI]
            if len(have) < 3 or w['t'][k] is None: continue
            f = {'cc': cc, 'level': lvl, 'unit': r['id'] if lvl != 'admin1' else r['name'], 'year': Y, 'y': an.get(Y, np.nan),
                 'lag1': an.get(Y - 1, np.nan), 'area': r['areaMean'], 'lat': r.get('lat', np.nan), 'lon': r.get('lon', np.nan),
                 't': w['t'][k], 'p': w['p'][k], 'spi': w['spi'][k], 'spei': w['spei'][k]}
            for nm in ['nino34', 'nino12', 'nino4', 'dmi', 'atl3', 'tna', 'pdo']: f[nm] = idx_mean(nm, mons)
            f['oni'] = f.pop('nino34'); f['flavour'] = f['nino12'] - f['nino4']
            first = mons[0]; f['oni_pre'] = float(np.nanmean([IDX['nino34'][MI[shift(*first, -j)]] for j in (1, 2, 3) if shift(*first, -j) in MI]))
            f['oni_tend'] = float(np.nanmean([IDX['nino34'][MI[x]] for x in mons[-2:] if x in MI]) - np.nanmean([IDX['nino34'][MI[x]] for x in mons[:2] if x in MI]))
            for nm, part in zip('eml', th):
                ii = [TI[x] for x in [(Y + o, m) for o, m in part] if x in TI]
                f['t_' + nm] = float(np.nanmean(ta[ii])) if ii else np.nan; f['p_' + nm] = float(np.nanmean(pz[ii])) if ii else np.nan
            f['tmax_m'] = float(np.nanmax(ta[have])); f['sm'] = float(np.nanmean(sz[have]))
            p0 = shift(*first, -1); f['sm0'] = float(sz[TI[p0]]) if p0 in TI else np.nan
            rows.append(f)
F = pd.DataFrame(rows)
F.to_pickle(PROC / '_features.pkl')
print(F.shape, F.groupby(['cc', 'level']).size().unstack().fillna(0).astype(int))
print(F[F.level == 'national'][['oni', 'nino12', 'nino4', 'dmi', 'pdo', 'sm', 'sm0', 't_m', 'p_m']].describe().round(2).T[['mean', 'std', 'min', 'max']])
# sanity: our window ONI vs the dashboard's
ph = D['countries']['US']['phases']; x = F[(F.cc == 'US') & (F.level == 'national')]
v = np.array([(ph.get(str(y)) or {}).get('oni', np.nan) or np.nan for y in x.year], float); ok = ~np.isnan(v)
print('ONI check r =', round(np.corrcoef(x.oni.values[ok], v[ok])[0, 1], 4))
