"""Growing-season weather for every cotton area: temperature, rainfall and three drought indices.

Inputs (scripts/fetch_climate.sh downloads them to data/raw/climate/, ~830 MB, not committed):
  air.nc     GHCN-CAMS 2 m air temperature, 0.5°, monthly 1948–present (NOAA PSL)
  precl.nc   PREC/L land precipitation, 0.5°, monthly 1948–present (NOAA PSL; mm/day)
  scpdsi.nc  CRU TS 4.10 self-calibrating Palmer Drought Severity Index, 0.5°, monthly 1903–2025 (UEA CRU)

For each area (county, district, …), every 0.5° cell whose centre lies inside the area's outline is averaged
(cos-latitude weights); small areas with no cell centre inside take the nearest land cell. States/zones and
the country are the cotton-area-weighted mean of their areas' monthly values. Then, over the country's growing
window (same months as the ENSO analysis):
  t    mean temperature anomaly, °C, vs 1991–2020
  p    rainfall anomaly, % of the 1991–2020 window mean
  spi  Standardized Precipitation Index of the window rainfall total (gamma fit, McKee et al. 1993)
  spei Standardized Precipitation-Evapotranspiration Index of window rainfall minus Thornthwaite PET
       (3-parameter log-logistic by L-moments, Vicente-Serrano et al. 2010)
  pdsi window mean scPDSI (Wells et al. 2004; CRU ends 2025)
SPI/SPEI distributions are fitted on 1950–2025 and the current year is scored against them.
Output: data/processed/climate.json
"""
import json, math, os, sys
import numpy as np
from netCDF4 import Dataset, num2date
from shapely.geometry import shape, Point
from shapely.prepared import prep
from scipy import stats
from scipy.special import gamma as G
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import RAW, GEO, PROC

CL = RAW / 'climate'
Y0, Y1 = 1950, 2026
# growing window as (year offset, month) — matches DATA.windows
WIN = {
    'US': [(0, m) for m in range(5, 11)], 'CN': [(0, m) for m in range(5, 11)], 'PK': [(0, m) for m in range(5, 11)],
    'IN': [(0, m) for m in range(6, 12)],
    'BR': [(-1, 12)] + [(0, m) for m in range(1, 6)],
    'AR': [(-1, 11), (-1, 12)] + [(0, m) for m in range(1, 5)],
    'AU': [(-1, 11), (-1, 12)] + [(0, m) for m in range(1, 5)],
}
GEOF = {'US': 'us', 'BR': 'br', 'IN': 'in', 'AR': 'ar', 'CN': 'cn', 'PK': 'pk', 'AU': 'au'}

D = json.load(open(PROC / 'dashboard_data.json'))


def grid(nc, latn, lonn):
    la = np.asarray(nc.variables[latn][:], float); lo = np.asarray(nc.variables[lonn][:], float)
    return la, lo


def months(nc):
    t = nc.variables['time']
    ds = num2date(t[:], t.units, getattr(t, 'calendar', 'standard'), only_use_cftime_datetimes=False)
    return [(d.year, d.month) for d in ds]


# ---- which cells belong to which area ------------------------------------------------------------
nc = Dataset(CL / 'air.nc'); LA, LO = grid(nc, 'lat', 'lon'); nc.close()
LO180 = np.where(LO > 180, LO - 360, LO)


def cells_for(geom, lat, lon):
    g = prep(geom); minx, miny, maxx, maxy = geom.bounds
    iy = np.where((LA >= miny) & (LA <= maxy))[0]; ix = np.where((LO180 >= minx) & (LO180 <= maxx))[0]
    out = [(i, j) for i in iy for j in ix if g.contains(Point(LO180[j], LA[i]))]
    if not out:
        i = int(np.argmin(abs(LA - lat))); j = int(np.argmin(abs(LO180 - lon))); out = [(i, j)]
    return out


AREAS = {}   # cc -> {id: (cells, lat, areaMean)}
for cc, g in GEOF.items():
    P = {str(f['id']): f for f in json.load(open(GEO / f'{g}_polys.json'))['features']}
    AREAS[cc] = {}
    for r in D['countries'][cc]['regions']:
        f = P.get(str(r['id']))
        cells = cells_for(shape(f['geometry']), r['lat'], r['lon']) if f else cells_for(Point(r['lon'], r['lat']).buffer(0.01), r['lat'], r['lon'])
        AREAS[cc][r['id']] = (cells, r['lat'], r['areaMean'])
allcells = sorted({c for cc in AREAS for v in AREAS[cc].values() for c in v[0]})
print('areas', sum(len(v) for v in AREAS.values()), 'cells', len(allcells))


def extract(fn, var, latn, lonn, scale=None):
    """time × cell matrix for every needed cell (NaN where missing); cells mapped by nearest grid point."""
    nc = Dataset(CL / fn); la, lo = grid(nc, latn, lonn); lo180 = np.where(lo > 180, lo - 360, lo)
    ms = months(nc); keep = [k for k, (y, m) in enumerate(ms) if y >= 1948]
    ii = np.array([int(np.argmin(abs(la - LA[i]))) for i, j in allcells]); jj = np.array([int(np.argmin(abs(lo180 - LO180[j]))) for i, j in allcells])
    v = nc.variables[var]; v.set_auto_maskandscale(True)
    out = np.full((len(keep), len(allcells)), np.nan, np.float32)
    for n, k in enumerate(keep):
        a = v[k]; a = np.ma.filled(a.astype(np.float32), np.nan)
        out[n] = a[ii, jj]
    nc.close()
    return [ms[k] for k in keep], out


def fill_coastal(M, name):
    """cells that are all-NaN (ocean side of a coast) borrow the nearest cell that has data."""
    bad = np.where(np.isnan(M).all(0))[0]; good = np.where(~np.isnan(M).all(0))[0]
    if len(bad):
        pts = np.array([(LA[i], LO180[j]) for i, j in allcells])
        for b in bad:
            d = ((pts[good] - pts[b]) ** 2).sum(1); M[:, b] = M[:, good[int(np.argmin(d))]]
        print(name, 'filled', len(bad), 'coastal cells')
    return M


tm, T = extract('air.nc', 'air', 'lat', 'lon'); T = fill_coastal(T, 'T')
if np.nanmean(T) > 100: T -= 273.15
pm, P = extract('precl.nc', 'precip', 'lat', 'lon'); P = fill_coastal(P, 'P')
assert tm == pm
dim = np.array([[31, 28 + (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] for y, m in pm], np.float32)
P = P * dim[:, None]                                  # mm/day → mm/month
dm, Dr = extract('scpdsi.nc', 'scpdsi', 'latitude', 'longitude'); Dr = fill_coastal(Dr, 'PDSI')
Dr[(Dr < -20) | (Dr > 20)] = np.nan
cidx = {c: k for k, c in enumerate(allcells)}
MI = {ym: k for k, ym in enumerate(tm)}; DI = {ym: k for k, ym in enumerate(dm)}
LAST = tm[-1]; print('climate through', LAST, 'pdsi through', dm[-1])


def area_monthly(cells):
    k = [cidx[c] for c in cells]; w = np.cos(np.radians([LA[i] for i, j in cells]))
    def avg(M):
        X = M[:, k]; m = ~np.isnan(X); return np.where(m.any(1), np.nansum(X * w, 1) / np.maximum((m * w).sum(1), 1e-9), np.nan)
    return avg(T), avg(P), avg(Dr)


def thornthwaite(t, lat):
    """monthly PET (mm) from monthly mean T (°C); heat index from the 1991–2020 monthly climatology."""
    mon = np.array([m for y, m in tm]); yrs = np.array([y for y, m in tm])
    clim = np.array([np.nanmean(t[(mon == m) & (yrs >= 1991) & (yrs <= 2020)]) for m in range(1, 13)])
    I = np.sum(np.where(clim > 0, (clim / 5) ** 1.514, 0)); I = max(I, 1e-3)
    a = 6.75e-7 * I ** 3 - 7.71e-5 * I ** 2 + 1.792e-2 * I + 0.49239
    phi = math.radians(lat); out = np.zeros_like(t)
    for k, (y, m) in enumerate(tm):
        doy = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][m - 1]
        dec = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
        ws = math.acos(max(-1, min(1, -math.tan(phi) * math.tan(dec)))); N = 24 / math.pi * ws
        days = dim[k]; tt = t[k]
        if np.isnan(tt): out[k] = np.nan; continue
        if tt <= 0: pe = 0
        elif tt < 26.5: pe = 16 * (10 * tt / I) ** a
        else: pe = -415.85 + 32.24 * tt - 0.43 * tt * tt
        out[k] = pe * (N / 12) * (days / 30)
    return out


def loglogistic_spei(x, ref):
    r = np.sort(ref[~np.isnan(ref)]); n = len(r)
    if n < 20: return np.full_like(x, np.nan)
    F = (np.arange(1, n + 1) - 0.35) / n
    w0 = r.mean(); w1 = np.mean((1 - F) * r); w2 = np.mean((1 - F) ** 2 * r)
    b = (2 * w1 - w0) / (6 * w1 - w0 - 6 * w2)
    if not (b > 1): return np.where(np.isnan(x), np.nan, (x - r.mean()) / r.std(ddof=1))
    a = (w0 - 2 * w1) * b / (G(1 + 1 / b) * G(1 - 1 / b)); g = w0 - a * G(1 + 1 / b) * G(1 - 1 / b)
    with np.errstate(all='ignore'):
        cdf = 1 / (1 + (a / np.maximum(x - g, 1e-9)) ** b)
    return stats.norm.ppf(np.clip(cdf, 1e-4, 1 - 1e-4))


def gamma_spi(x, ref):
    r = ref[~np.isnan(ref)]
    if len(r) < 20: return np.full_like(x, np.nan)
    q = np.mean(r <= 0); rp = r[r > 0]
    try: a, loc, sc = stats.gamma.fit(rp, floc=0)
    except Exception: return np.where(np.isnan(x), np.nan, (x - r.mean()) / r.std(ddof=1))
    cdf = q + (1 - q) * stats.gamma.cdf(np.maximum(x, 0), a, 0, sc)
    return stats.norm.ppf(np.clip(cdf, 1e-4, 1 - 1e-4))


def indices(cc, t, p, d, lat):
    pet = thornthwaite(t, lat); yrs = list(range(Y0, Y1 + 1))
    W = WIN[cc]; Tw, Pw, Bw, Dw, full = [], [], [], [], []
    for Y in yrs:
        ks = [MI.get((Y + o, m)) for o, m in W]; have = [k for k in ks if k is not None]
        full.append(len(have) == len(W))
        if len(have) < max(3, len(W) - 2): Tw.append(np.nan); Pw.append(np.nan); Bw.append(np.nan); Dw.append(np.nan); continue
        Tw.append(np.nanmean(t[have])); sc = len(W) / len(have)     # scale partial windows to a full-season total
        Pw.append(np.nansum(p[have]) * sc); Bw.append(np.nansum(p[have] - pet[have]) * sc)
        kd = [DI.get((Y + o, m)) for o, m in W]; kd = [k for k in kd if k is not None]
        Dw.append(np.nanmean(d[kd]) if len(kd) == len(W) else np.nan)
    Tw, Pw, Bw, Dw = map(np.array, (Tw, Pw, Bw, Dw)); yr = np.array(yrs)
    base = (yr >= 1991) & (yr <= 2020); ref = yr <= 2025
    return {
        't': Tw - np.nanmean(Tw[base]),
        'p': (Pw / np.nanmean(Pw[base]) - 1) * 100,
        'spi': gamma_spi(Pw, Pw[ref]),
        'spei': loglogistic_spei(Bw, Bw[ref]),
        'pdsi': Dw,
        '_full': full,
    }


def pack(ix):
    r = lambda a, k: [None if (v is None or not np.isfinite(v)) else round(float(v), k) for v in a]
    return {'t': r(ix['t'], 2), 'p': r(ix['p'], 1), 'spi': r(ix['spi'], 2), 'spei': r(ix['spei'], 2), 'pdsi': r(ix['pdsi'], 2)}


out = {'years': list(range(Y0, Y1 + 1)), 'through': f'{LAST[0]}-{LAST[1]:02d}', 'pdsiThrough': f'{dm[-1][0]}-{dm[-1][1]:02d}',
       'baseline': '1991–2020', 'countries': {}, 'partial': {}}
for cc in WIN:
    c = D['countries'][cc]; res = {'regions': {}, 'admin1': {}, 'national': None}
    mon = {}
    for r in c['regions']:
        cells, lat, am = AREAS[cc][r['id']]; t, p, d = area_monthly(cells); mon[r['id']] = (t, p, d, lat, am)
        ix = indices(cc, t, p, d, lat); res['regions'][r['id']] = pack(ix)
    def agg(ids):
        ws = np.array([mon[i][4] for i in ids], float); ws = ws / ws.sum()
        st = lambda k: np.nansum([mon[i][k] * w for i, w in zip(ids, ws)], 0)
        return st(0), st(1), np.where(np.isnan(np.array([mon[i][2] for i in ids])).all(0), np.nan, np.nansum([np.nan_to_num(mon[i][2]) * w for i, w in zip(ids, ws)], 0)), float(np.sum([mon[i][3] * w for i, w in zip(ids, ws)]))
    for a in c['admin1']:
        ids = [r['id'] for r in c['regions'] if r['admin1'] == a['name']]
        if not ids: continue
        t, p, d, lat = agg(ids); res['admin1'][a['name']] = pack(indices(cc, t, p, d, lat))
    t, p, d, lat = agg([r['id'] for r in c['regions']]); ixn = indices(cc, t, p, d, lat); res['national'] = pack(ixn)
    out['partial'][cc] = [y for y, f in zip(out['years'], ixn['_full']) if not f and np.isfinite(ixn['t'][y - Y0])]
    out['countries'][cc] = res
    n26 = res['national']; k = 2026 - Y0
    print(cc, 'national 2026: t', n26['t'][k], 'p', n26['p'][k], 'spei', n26['spei'][k], '| 2025 pdsi', n26['pdsi'][k - 1], 'partial', out['partial'][cc])
json.dump(out, open(PROC / 'climate.json', 'w'), separators=(',', ':'))
print('climate.json', round(os.path.getsize(PROC / 'climate.json') / 1e6, 2), 'MB')
