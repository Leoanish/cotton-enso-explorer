"""Build the compact JSON used by the cotton × ENSO dashboard.

Sources (all raw files under ./raw):
  - ONI: NOAA CPC oni.ascii.txt (GitHub mirror ahuang11/oni)
  - Brazil: IBGE PAM table 5457, municipality level, 2000-2025 (GitHub mirror elisiara/agrodata)
  - India: ICRISAT District Level Database (1966-2017 file + 1990-2019 API pull)
"""
import json, re, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import F, GEO, PROC, opn
import numpy as np, pandas as pd
from statsmodels.nonparametric.smoothers_lowess import lowess

OUT = str(PROC / 'dashboard_data.json')
SEASONS = ['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ']  # index = centre month-1

# ------------------------------------------------------------------ ONI + events
oni = pd.read_csv(F['oni'])
oni['sidx'] = oni['season'].map({s:i for i,s in enumerate(SEASONS)})
oni = oni.sort_values(['year','sidx']).reset_index(drop=True)
oni['t'] = oni['year'] + oni['sidx']/12.0
vals = oni['anom_c'].values

def runs(mask):
    out=[]; start=None
    for i,m in enumerate(mask):
        if m and start is None: start=i
        if not m and start is not None: out.append((start,i-1)); start=None
    if start is not None: out.append((start,len(mask)-1))
    return out

def intensity(seg, sign):
    # CPC/GGWeather convention: category met for >=3 consecutive overlapping seasons
    for label,thr in [('very strong',2.0),('strong',1.5),('moderate',1.0)]:
        m = (sign*seg >= thr)
        if any(all(m[i:i+3]) for i in range(len(m)-2)): return label
    return 'weak'

events=[]
for sign,name in [(1,'El Niño'),(-1,'La Niña')]:
    for a,b in runs(sign*vals >= 0.5):
        if b-a+1 < 5: continue
        seg = vals[a:b+1]
        pk = a + int(np.argmax(sign*seg))
        events.append(dict(
            type=name, startYear=int(oni.year[a]), startSeason=SEASONS[oni.sidx[a]],
            endYear=int(oni.year[b]), endSeason=SEASONS[oni.sidx[b]],
            start_t=round(float(oni.t[a]),3), end_t=round(float(oni.t[b]),3),
            peak=round(float(vals[pk]),2), peakYear=int(oni.year[pk]), peakSeason=SEASONS[oni.sidx[pk]],
            durationSeasons=int(b-a+1), intensity=intensity(seg,sign), a=int(a), b=int(b)))
events.sort(key=lambda e:e['a'])
for i,e in enumerate(events):
    e['id'] = f"{'EN' if e['type']=='El Niño' else 'LN'}{e['startYear']}"
    # label like 1997-98
    e['label'] = f"{e['startYear']}–{str(e['endYear'])[2:]}" if e['endYear']!=e['startYear'] else str(e['startYear'])
# gaps between consecutive events (onset to onset) of same type & any type
for i,e in enumerate(events):
    e['gapFromPrevAny'] = round(e['start_t']-events[i-1]['end_t'],2) if i>0 else None
    prev_same=[x for x in events[:i] if x['type']==e['type']]
    e['gapFromPrevSame'] = round(e['start_t']-prev_same[-1]['start_t'],2) if prev_same else None

# ------------------------------------------------------------------ crop-season phase per country
# window = list of (year offset, season index) relative to the crop-year label
WINDOWS = {
  'IN': dict(desc='Jun–Nov of crop year (kharif: sown Jun–Jul, picked Oct–Jan)', months=[(0,5),(0,6),(0,7),(0,8),(0,9),(0,10)]),
  'BR': dict(desc='Dec (prev yr)–May of harvest year (sown Dec–Jan, picked Jun–Aug)', months=[(-1,11),(0,0),(0,1),(0,2),(0,3),(0,4)]),
  'US': dict(desc='May–Oct of crop year (planted Apr–May, picked Sep–Nov)', months=[(0,4),(0,5),(0,6),(0,7),(0,8),(0,9)]),
}
oni_lookup = {(int(r.year),int(r.sidx)):float(r.anom_c) for r in oni.itertuples()}
oni_index  = {(int(r.year),int(r.sidx)):i for i,r in enumerate(oni.itertuples())}

def phase_for(cc, year):
    w = WINDOWS[cc]['months']
    v=[oni_lookup.get((year+dy,s)) for dy,s in w]
    v=[x for x in v if x is not None]
    if len(v)<4: return None
    m=float(np.mean(v))
    idxs=[oni_index.get((year+dy,s)) for dy,s in w]; idxs=[i for i in idxs if i is not None]
    ov=[e for e in events if not (e['b']<min(idxs) or e['a']>max(idxs))]
    ph='Neutral'; ev=None
    if m>=0.5:
        cand=[e for e in ov if e['type']=='El Niño']
        if cand: ph='El Niño'; ev=max(cand,key=lambda e:e['peak'])
    elif m<=-0.5:
        cand=[e for e in ov if e['type']=='La Niña']
        if cand: ph='La Niña'; ev=min(cand,key=lambda e:e['peak'])
    return dict(phase=ph, oni=round(m,2), event=ev['id'] if ev else None, intensity=ev['intensity'] if ev else None)

# ------------------------------------------------------------------ helpers
def detrend(years, y):
    n=len(y); frac=min(0.9, max(0.35, 14.0/n))
    tr = lowess(y, years, frac=frac, it=2, return_sorted=False)
    tr = np.maximum(tr, 0.25*np.median(y))
    anom = np.clip((np.array(y)/tr - 1.0)*100.0, -95, 250)
    return tr, anom

def series_block(years, yld, area=None, prod=None):
    years=[int(x) for x in years]; yld=[float(x) for x in yld]
    tr,an = detrend(np.array(years,float), np.array(yld))
    d=dict(years=years, yield_=[round(x,1) for x in yld], trend=[round(float(x),1) for x in tr], anom=[round(float(x),1) for x in an])
    if area is not None: d['area']=[None if (x is None or (isinstance(x,float) and math.isnan(x))) else round(float(x),1) for x in area]
    if prod is not None: d['prod']=[None if (x is None or (isinstance(x,float) and math.isnan(x))) else round(float(x),1) for x in prod]
    return d

def aggregate(df, keycols):
    d=df.dropna(subset=['area','prod'])
    g=d.groupby(keycols+['year']).agg(area=('area','sum'), prod=('prod','sum')).reset_index()
    g=g[g.area>0]; g['yield']=g['prod']*1000/g['area']
    return g

# ------------------------------------------------------------------ BRAZIL
def load_brazil():
    def read(fn):
        import csv, io
        rows=list(csv.reader(opn(fn, encoding='utf-8-sig'), delimiter=';'))
        rows=[r for r in rows[3:] if len(r)>=4]
        # year header row is shorter (blank trailing cells); pad all rows to max width
        w=max(len(r) for r in rows); rows=[r+['']*(w-len(r)) for r in rows]
        df=pd.DataFrame(rows, dtype=str)
        df=df[df[0].isin(['Nível','BR','MU'])].reset_index(drop=True)
        yrow=df.iloc[0,3:].replace('',np.nan).ffill().tolist(); prods=df.iloc[1,3:].tolist()
        years=yrow
        cols=[(int(y),p) for y,p in zip(years,prods)]
        body=df.iloc[2:].copy()
        keep=[i for i,(y,p) in enumerate(cols) if p.startswith('Algodão herbáceo')]
        out=body.iloc[:,[0,1,2]+[3+i for i in keep]]
        out.columns=['lvl','code','name']+[cols[i][0] for i in keep]
        out=out[out.lvl=='MU']
        long=out.melt(id_vars=['lvl','code','name'],var_name='year',value_name='v')
        long['v']=pd.to_numeric(long['v'].str.replace('.','',regex=False),errors='coerce')
        return long[['code','name','year','v']]
    a=read(F['ibge_area']).rename(columns={'v':'area'})
    q=read(F['ibge_prod']).rename(columns={'v':'prod'})
    df=a.merge(q,on=['code','name','year']); df=df.dropna(); df=df[(df.area>0)&(df['prod']>0)]
    df['yield']=df['prod']*1000/df['area']   # kg/ha (seed cotton)
    df['uf']=df['name'].str.extract(r'\((\w\w)\)$')[0]; df['name']=df['name'].str.replace(r'\s\(\w\w\)$','',regex=True)
    df['year']=df['year'].astype(int)
    # centroids from geo_mun.json
    geo=json.load(opn(F['br_mun']))
    cent={}
    def coords(g):
        if g['type']=='Polygon': return [p for ring in g['coordinates'] for p in ring]
        return [p for poly in g['coordinates'] for ring in poly for p in ring]
    for f in geo['features']:
        code=str(f['properties'].get('cod_ibge') or f['properties'].get('codarea') or f['properties'].get('CD_MUN'))
        pts=coords(f['geometry']); xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        cent[code[:7]]=(round(sum(ys)/len(ys),3), round(sum(xs)/len(xs),3))
    UF={'RO':'Rondônia','AC':'Acre','AM':'Amazonas','RR':'Roraima','PA':'Pará','AP':'Amapá','TO':'Tocantins','MA':'Maranhão','PI':'Piauí','CE':'Ceará','RN':'Rio Grande do Norte','PB':'Paraíba','PE':'Pernambuco','AL':'Alagoas','SE':'Sergipe','BA':'Bahia','MG':'Minas Gerais','ES':'Espírito Santo','RJ':'Rio de Janeiro','SP':'São Paulo','PR':'Paraná','SC':'Santa Catarina','RS':'Rio Grande do Sul','MS':'Mato Grosso do Sul','MT':'Mato Grosso','GO':'Goiás','DF':'Distrito Federal'}
    df['admin1']=df['uf'].map(UF)
    return df, cent

def build_country(cc, name, level, unit, df, cent=None, min_years=15, min_area=300, admin1_min_years=15):
    """df columns: code,name,admin1,year,area,prod,yield ; cent: code->(lat,lon) or df has lat/lon"""
    years_all=sorted(df.year.unique())
    phases={int(y):phase_for(cc,int(y)) for y in years_all}
    regions=[]
    for code,g in df.groupby('code'):
        g=g.sort_values('year')
        if len(g)<min_years or np.nanmean(g.area)<min_area: continue
        blk=series_block(g.year,g['yield'],g.area,g['prod'])
        if cent is not None: lat,lon=cent.get(str(code),(None,None))
        else: lat,lon=float(g.lat.iloc[0]),float(g.lon.iloc[0])
        if lat is None or (isinstance(lat,float) and math.isnan(lat)): continue
        regions.append(dict(id=str(code), name=g['name'].iloc[0], admin1=g['admin1'].iloc[0], lat=lat, lon=lon, areaMean=round(float(g.area.mean()),0), **blk))
    # admin1 aggregates (from all rows, not just filtered)
    ag=aggregate(df,['admin1']); admin1=[]
    for a1,g in ag.groupby('admin1'):
        g=g.sort_values('year')
        if len(g)<admin1_min_years: continue
        rs=[r for r in regions if r['admin1']==a1]
        if rs: lat=float(np.mean([r['lat'] for r in rs])); lon=float(np.mean([r['lon'] for r in rs]))
        else: continue
        admin1.append(dict(id='A1:'+a1, name=a1, lat=round(lat,3), lon=round(lon,3), areaMean=round(float(g.area.mean()),0), nRegions=len(rs), **series_block(g.year,g['yield'],g.area,g['prod'])))
    nat=aggregate(df.assign(k=1),['k']).sort_values('year')
    national=dict(id='NAT', name=name, areaMean=round(float(nat.area.mean()),0), **series_block(nat.year,nat['yield'],nat.area,nat['prod']))
    return dict(code=cc, name=name, level=level, unit=unit, window=WINDOWS[cc]['desc'], yearRange=[int(years_all[0]),int(years_all[-1])],
                phases=phases, regions=regions, admin1=sorted(admin1,key=lambda r:-r['areaMean']), national=national)

# ------------------------------------------------------------------ INDIA
def load_india():
    new=pd.read_csv(F['icrisat_new'])
    old=pd.read_csv(F['icrisat_old'])
    cols={'COTTON AREA (1000 ha)':'area','COTTON PRODUCTION (1000 tons)':'prod'}
    n=new.rename(columns=cols)[['Dist Code','Year','State Name','Dist Name','LATITUDE','LONGITUDE','area','prod']]
    o=old.rename(columns=cols)[['Dist Code','Year','State Name','Dist Name','area','prod']]
    o=o[o.Year<1990]
    meta=n.drop_duplicates('Dist Code').set_index('Dist Code')
    o=o[o['Dist Code'].isin(meta.index)]
    o=o[o.apply(lambda r: str(r['Dist Name']).strip().lower()==str(meta.loc[r['Dist Code'],'Dist Name']).strip().lower(),axis=1)]
    o['LATITUDE']=o['Dist Code'].map(meta['LATITUDE']); o['LONGITUDE']=o['Dist Code'].map(meta['LONGITUDE'])
    df=pd.concat([o,n]).sort_values(['Dist Code','Year'])
    df=df[(df.area>0)&(df['prod']>0)]
    df=df.rename(columns={'Dist Code':'code','Year':'year','State Name':'admin1','Dist Name':'name','LATITUDE':'lat','LONGITUDE':'lon'})
    df['area']=df['area']*1000; df['prod']=df['prod']*1000  # ha, tonnes (lint)
    df['yield']=df['prod']*1000/df['area']  # kg/ha
    df=df[df['yield']<3000]  # drop implausible
    df['name']=df['name'].str.title(); df['admin1']=df['admin1'].str.title()
    return df


# ------------------------------------------------------------------ USA
def load_us():
    def read(fn,col):
        d=pd.read_csv(F['nass'] / (fn + '.gz'),dtype=str)
        d=d[d['County ANSI'].notna()&(d['County ANSI']!='')]
        d[col]=pd.to_numeric(d['Value'].str.replace(',',''),errors='coerce')
        d['code']=d['State ANSI'].str.zfill(2)+d['County ANSI'].str.zfill(3)
        d['year']=d['Year'].astype(int)
        return d[['code','year','State','County',col]]
    y=read('nass_cotton_upland_county_yield.csv','yld'); a=read('nass_cotton_upland_county_acres_harvested.csv','acres')
    df=y.merge(a[['code','year','acres']],on=['code','year'],how='left').dropna(subset=['yld'])
    df['area']=df['acres']*0.404686            # ha
    df['yield']=df['yld']*1.12085              # lb/acre -> kg/ha
    df['prod']=df['yield']*df['area']/1000     # tonnes lint
    df['name']=df['County'].str.title().str.replace(' Of ',' of '); df['admin1']=df['State'].str.title()
    cent=json.load(open(GEO / 'us_county_centroids.json'))
    df['lat']=df['code'].map(lambda c: cent.get(c,[None,None])[0]); df['lon']=df['code'].map(lambda c: cent.get(c,[None,None])[1])
    df=df.dropna(subset=['lat']); df=df[df.year>=1950]
    return df

us=load_us()
br,cent=load_brazil()
ind=load_india()
countries={
 'US': build_country('US','United States','County','kg/ha lint (converted from lb/acre)',us,None,min_years=25,min_area=400),
 'BR': build_country('BR','Brazil','Municipality','kg/ha seed cotton (em caroço)',br,cent,min_years=15,min_area=300),
 'IN': build_country('IN','India','District','kg/ha lint',ind,None,min_years=20,min_area=5000),
}
for cc,c in countries.items():
    print(cc, 'regions',len(c['regions']),'admin1',len(c['admin1']), c['yearRange'])

out=dict(
  generated=pd.Timestamp.now('UTC').strftime('%Y-%m-%d'),
  oni=dict(t=[round(float(x),3) for x in oni.t], v=[round(float(x),2) for x in oni.anom_c], year=[int(x) for x in oni.year], season=list(oni.season)),
  events=[{k:v for k,v in e.items() if k not in ('a','b')} for e in events],
  windows={k:v['desc'] for k,v in WINDOWS.items()},
  countries=countries,
  sources=dict(
    oni='NOAA Climate Prediction Center, Oceanic Niño Index (ERSSTv5, 3-month running mean, Niño 3.4)',
    BR='IBGE, Produção Agrícola Municipal (PAM), Tabela 5457 — algodão herbáceo em caroço, área colhida & quantidade produzida por município, 2000–2025',
    US='USDA NASS Quick Stats — Cotton, Upland: yield (lb/acre) and acres harvested by county, survey program, 1950–2025 (downloaded 6 Nov 2026)',
    IN='ICRISAT District Level Database — cotton area & production by district (1966–2017 apportioned file + 1990–2019 API series)'),
)
json.dump(out, open(OUT,'w'), separators=(',',':'), ensure_ascii=False)
import os; print('bytes', os.path.getsize(OUT))
print('events', len(events));
for e in events: print(e['id'], e['label'], e['intensity'], e['peak'], e['durationSeasons'], e['gapFromPrevSame'])
