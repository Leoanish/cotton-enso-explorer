"""Seasonal SST anomaly fields (JAS and NDJ of each year 1950-2025) from ERSST v5, 4° grid, int8 (0.1 °C), base64."""
import netCDF4 as nc, numpy as np, json, base64, datetime, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import F, PROC
if not F['ersst'].exists():
    sys.exit('ERSST file missing: run scripts/fetch_ersst.sh first (see data/raw/ersst/README.md)')
d=nc.Dataset(str(F['ersst']))
t=nc.num2date(d.variables['time'][:], d.variables['time'].units)
years=np.array([x.year for x in t]); months=np.array([x.month for x in t])
sst=d.variables['sst'][:]  # masked array (time, lat, lon), lat 88..-88 step -2, lon 0..358
lat=d.variables['lat'][:]; lon=d.variables['lon'][:]
# climatology 1991-2020 per month
clim=np.ma.zeros((12,)+sst.shape[1:])
for m in range(1,13):
    sel=(months==m)&(years>=1991)&(years<=2020); clim[m-1]=sst[sel].mean(axis=0)
anom=sst-clim[months-1]
def season_mean(y,mlist):
    idx=[]
    for (yy,mm) in mlist:
        k=np.where((years==yy)&(months==mm))[0]
        if len(k): idx.append(k[0])
    if len(idx)<2: return None
    return anom[idx].mean(axis=0)
def coarsen(a):  # 89x180 (2°) -> 44x90 (4°): average 2x2 blocks (drop last lat row)
    a=a[:88,:]; a=a.reshape(44,2,90,2); m=np.ma.mean(np.ma.mean(a,axis=3),axis=1); return m
out={'lat0':87.0,'dlat':-4.0,'nlat':44,'lon0':1.0,'dlon':4.0,'nlon':90,'years':[],'JAS':[],'NDJ':[]}
for y in range(1950,2026):
    jas=season_mean(y,[(y,7),(y,8),(y,9)]); ndj=season_mean(y,[(y,11),(y,12),(y+1,1)])
    if jas is None: continue
    out['years'].append(y)
    for key,f in (('JAS',jas),('NDJ',ndj)):
        if f is None: out[key].append(None); continue
        c=coarsen(f); arr=np.clip(np.round(c.filled(np.nan)*10),-120,120); arr=np.where(np.isnan(arr),-128,arr).astype(np.int8)
        out[key].append(base64.b64encode(arr.tobytes()).decode())
print(len(out['years']), out['years'][0], out['years'][-1], 'NDJ none:', sum(1 for x in out['NDJ'] if x is None))
OUTF=PROC / 'sst_fields.json'
json.dump(out,open(OUTF,'w'),separators=(',',':'))
print(os.path.getsize(OUTF))
# sanity: Niño3.4 mean of NDJ 1997 from the 4° field
import numpy as np
f=np.frombuffer(base64.b64decode(out['NDJ'][out['years'].index(1997)]),dtype=np.int8).reshape(44,90).astype(float)/10
lats=87-4*np.arange(44); lons=1+4*np.arange(90)
sel=np.ix_((lats<=5)&(lats>=-5),(lons>=190)&(lons<=240)); v=f[sel]; print('Nino3.4 NDJ 1997 ~', np.nanmean(np.where(v<-12,np.nan,v)))
