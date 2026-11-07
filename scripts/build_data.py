"""Extends build_data.py: adds Argentina, US irrigated/non-irrigated variants, Brazil 1974-1999, polygons."""
import json, os, re, unicodedata, subprocess
import numpy as np, pandas as pd
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import F, GEO, PROC, ROOT, opn
_core=os.path.join(os.path.dirname(os.path.abspath(__file__)),'build_core.py')
exec(open(_core).read().split("us=load_us()")[0])   # reuse the core helpers and loaders

WINDOWS['AR']=dict(desc='Nov (prev yr)–Apr of harvest year (sown Oct–Dec, picked Mar–Jun)', months=[(-1,10),(-1,11),(0,0),(0,1),(0,2),(0,3)])
WINDOWS['US_IRR']=WINDOWS['US']; WINDOWS['US_NON']=WINDOWS['US']

# ---------------- US variants
def load_us_variant(kind):
    def read(fn,col):
        d=pd.read_csv(F['nass'] / (fn + '.gz'),dtype=str)
        d=d[d['County ANSI'].notna()&(d['County ANSI']!='')]
        d[col]=pd.to_numeric(d['Value'].str.replace(',',''),errors='coerce')
        d['code']=d['State ANSI'].str.zfill(2)+d['County ANSI'].str.zfill(3)
        d['year']=d['Year'].astype(int)
        return d[['code','year','State','County',col]]
    y=read(f'nass_cotton_upland_{kind}_county_yield.csv','yld'); a=read(f'nass_cotton_upland_{kind}_county_acres.csv','acres')
    df=y.merge(a[['code','year','acres']],on=['code','year'],how='left').dropna(subset=['yld'])
    df['area']=df['acres']*0.404686; df['yield']=df['yld']*1.12085; df['prod']=df['yield']*df['area']/1000
    df['name']=df['County'].str.title(); df['admin1']=df['State'].str.title()
    cent=json.load(open(GEO / 'us_county_centroids.json'))
    df['lat']=df['code'].map(lambda c: cent.get(c,[None,None])[0]); df['lon']=df['code'].map(lambda c: cent.get(c,[None,None])[1])
    return df.dropna(subset=['lat'])

# ---------------- Argentina
def load_ar():
    a=pd.read_csv(F['magyp'])
    a=a[a.departamento.str.lower()!='sin definir'].copy()
    a['code']=a['departamento_id'].astype(str); a['year']=a['anio'].astype(int)+1   # label by harvest year
    a['area']=pd.to_numeric(a['superficie_cosechada_ha'],errors='coerce'); a['prod']=pd.to_numeric(a['produccion_tm'],errors='coerce')
    a=a[(a.area>0)&(a['prod']>0)]; a['yield']=a['prod']*1000/a['area']
    a['name']=a['departamento']; a['admin1']=a['provincia']
    cent=json.load(open(GEO / 'ar_dept_centroids.json'))
    a['lat']=a['code'].map(lambda c: cent.get(c,[None,None])[0]); a['lon']=a['code'].map(lambda c: cent.get(c,[None,None])[1])
    return a.dropna(subset=['lat'])[['code','year','name','admin1','area','prod','yield','lat','lon']]

# ---------------- Brazil with 1974-1999 extension
def load_brazil_long(br):
    fn=F['ibge_hist']
    if not os.path.exists(str(fn)): print('no BR historical file'); return br
    h=pd.read_csv(fn,dtype=str); h['value']=pd.to_numeric(h['value'],errors='coerce'); h=h.dropna()
    h['year']=h['year'].astype(int)
    piv=h.pivot_table(index=['mun_code','mun_name','year'],columns='var_code',values='value').reset_index()
    piv=piv.rename(columns={'214':'prod','216':'area'})
    if 'prod' not in piv or 'area' not in piv: print('BR hist cols',piv.columns.tolist()); return br
    piv=piv.dropna(subset=['prod','area']); piv=piv[(piv.area>0)&(piv['prod']>0)]
    piv['yield']=piv['prod']*1000/piv['area']
    piv['code']=piv['mun_code'].str[:7]
    # names/UF from the modern table where the code exists; else parse "Name (UF)"
    meta=br.drop_duplicates('code').set_index('code')[['name','admin1','uf']]
    piv['name']=piv['code'].map(meta['name']); piv['admin1']=piv['code'].map(meta['admin1']); piv['uf']=piv['code'].map(meta['uf'])
    nm=piv['mun_name'].str.extract(r'^(.*?)\s[-(]\s?(\w\w)\)?$')
    UF={'RO':'Rondônia','AC':'Acre','AM':'Amazonas','RR':'Roraima','PA':'Pará','AP':'Amapá','TO':'Tocantins','MA':'Maranhão','PI':'Piauí','CE':'Ceará','RN':'Rio Grande do Norte','PB':'Paraíba','PE':'Pernambuco','AL':'Alagoas','SE':'Sergipe','BA':'Bahia','MG':'Minas Gerais','ES':'Espírito Santo','RJ':'Rio de Janeiro','SP':'São Paulo','PR':'Paraná','SC':'Santa Catarina','RS':'Rio Grande do Sul','MS':'Mato Grosso do Sul','MT':'Mato Grosso','GO':'Goiás','DF':'Distrito Federal'}
    piv['name']=piv['name'].fillna(nm[0]); piv['uf']=piv['uf'].fillna(nm[1]); piv['admin1']=piv['admin1'].fillna(piv['uf'].map(UF))
    piv=piv.dropna(subset=['name','admin1'])
    out=pd.concat([piv[['code','name','admin1','uf','year','area','prod','yield']], br[['code','name','admin1','uf','year','area','prod','yield']]])
    out=out.drop_duplicates(['code','year'],keep='last').sort_values(['code','year'])
    print('BR long', out.year.min(), out.year.max(), out.code.nunique())
    return out

# ---------------- polygons (simplified, cotton areas only)
def polygons(cc, ids, src_geojson, key_fn, simplify='10%'):
    g=json.load(opn(src_geojson)); feats=[]
    for f in g['features']:
        k=key_fn(f)
        if k in ids: feats.append({'type':'Feature','id':k,'properties':{},'geometry':f['geometry']})
    tmp=str(GEO / f'_tmp_{cc}.json'); json.dump({'type':'FeatureCollection','features':feats},open(tmp,'w'))
    out=str(GEO / f'{cc.lower()}_polys.json')
    subprocess.run(['npx','--no-install','mapshaper',tmp,'-simplify',simplify,'keep-shapes','-o',out,'format=geojson','precision=0.001','id-field=id','force'],check=True,capture_output=True)
    g=json.load(open(out))
    for ft in g['features']:
        ge=ft['geometry']
        if ge is None: continue
        if ge['type']=='Polygon': ge['coordinates']=[r[::-1] for r in ge['coordinates']]
        else: ge['coordinates']=[[r[::-1] for r in poly] for poly in ge['coordinates']]
    g['features']=[f for f in g['features'] if f.get('geometry')]
    json.dump(g,open(out,'w'),separators=(',',':')); os.remove(tmp)
    print(cc,'polys',len(g['features']),os.path.getsize(out))
    return g

def clean(df,cap=8000):
    df=df.copy(); df=df[df['yield']<=cap]
    med=df.groupby('code')['yield'].transform('median')
    bad=(df['yield']>5*med)|(df['yield']<0.05*med)
    print('dropped outliers',int(bad.sum()))
    return df[~bad]
# ================= build
us=load_us(); us_irr=load_us_variant('irrigated'); us_non=load_us_variant('nonirrigated')
br0,cent=load_brazil(); br=load_brazil_long(br0)
ind=load_india(); ar=load_ar()
TURNOUT={'BR':0.40,'AR':0.33}
for df,cc in ((br,'BR'),(ar,'AR')):
    df['yield']=df['yield']*TURNOUT[cc]; df['prod']=df['prod']*TURNOUT[cc]
us,us_irr,us_non,ind=[clean(x,3500) for x in (us,us_irr,us_non,ind)]; br,ar=[clean(x,3500) for x in (br,ar)]

countries={
 'US': build_country('US','United States','County','kg lint/ha',us,None,min_years=25,min_area=400),
 'US_IRR': build_country('US_IRR','United States · irrigated','County','kg lint/ha',us_irr,None,min_years=15,min_area=400),
 'US_NON': build_country('US_NON','United States · non-irrigated','County','kg lint/ha',us_non,None,min_years=15,min_area=400),
 'BR': build_country('BR','Brazil','Municipality','kg lint/ha',br,cent,min_years=15,min_area=300),
 'IN': build_country('IN','India','District','kg lint/ha',ind,None,min_years=20,min_area=5000),
 'AR': build_country('AR','Argentina','Department','kg lint/ha',ar,None,min_years=15,min_area=500),
}
countries['US']['variants']=[['US','All upland'],['US_IRR','Irrigated'],['US_NON','Non-irrigated']]
for v in ['US_IRR','US_NON']: countries[v]['variantOf']='US'
countries['US']['crop']='Upland cotton lint · lb/acre × 1.121 → kg/ha'
countries['BR']['crop']='Algodão herbáceo em caroço (seed cotton) × 0.40 ginning turnout → lint'
countries['IN']['crop']='Cotton lint (170-kg bales → tonnes)'
countries['AR']['crop']='Algodón en bruto (seed cotton) × 0.33 ginning turnout → lint'
UFABBR={v:k for k,v in {'RO':'Rondônia','AC':'Acre','AM':'Amazonas','RR':'Roraima','PA':'Pará','AP':'Amapá','TO':'Tocantins','MA':'Maranhão','PI':'Piauí','CE':'Ceará','RN':'Rio Grande do Norte','PB':'Paraíba','PE':'Pernambuco','AL':'Alagoas','SE':'Sergipe','BA':'Bahia','MG':'Minas Gerais','ES':'Espírito Santo','RJ':'Rio de Janeiro','SP':'São Paulo','PR':'Paraná','SC':'Santa Catarina','RS':'Rio Grande do Sul','MS':'Mato Grosso do Sul','MT':'Mato Grosso','GO':'Goiás','DF':'Distrito Federal'}.items()}
for a in countries['BR']['admin1']: a['geoKey']=UFABBR.get(a['name'],a['name'])
for cc,c in countries.items(): print(cc,'regions',len(c['regions']),'admin1',len(c['admin1']),c['yearRange'])

# polygons
ids_us=set(r['id'] for r in countries['US']['regions'])|set(r['id'] for r in countries['US_IRR']['regions'])|set(r['id'] for r in countries['US_NON']['regions'])
subprocess.run(['node','-e',"const tc=require('topojson-client');const fs=require('fs');const us=JSON.parse(fs.readFileSync('node_modules/us-atlas/counties-10m.json'));fs.writeFileSync('data/geo/_us_counties.json',JSON.stringify(tc.feature(us,us.objects.counties)))"],cwd=str(ROOT),check=True)
polygons('US',ids_us,str(GEO / '_us_counties.json'),lambda f:f['id'],'12%')
polygons('BR',set(r['id'] for r in countries['BR']['regions']),F['br_mun'],lambda f:str(f['properties'].get('cod_ibge'))[:7],'8%')
def norm(s): s=unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower(); return re.sub(r'[^a-z0-9]','',s)
arkey={}
for _,r in ar[['code','name','admin1']].drop_duplicates('code').iterrows(): arkey[(norm(r.admin1),norm(r['name']))]=r.code
polygons('AR',set(r['id'] for r in countries['AR']['regions']),F['ar_dept'],lambda f: arkey.get((norm(f['properties']['provincia']),norm(f['properties']['departamento'])),None),'4%')
# India: ICRISAT dist code -> 2011 census district code
new=pd.read_csv(F['icrisat_new'],usecols=['Dist Code','Indian census District Code 2011']).drop_duplicates('Dist Code')
c2011={str(int(r['Indian census District Code 2011'])):str(r['Dist Code']) for _,r in new.iterrows() if pd.notna(r['Indian census District Code 2011'])}
inids=set(r['id'] for r in countries['IN']['regions'])
polygons('IN',inids,F['in_dist'],lambda f: c2011.get(str(int(f['properties']['dt_code'])) if f['properties'].get('dt_code') else None),'10%')

out=dict(
  generated=pd.Timestamp.now('UTC').strftime('%Y-%m-%d'),
  oni=dict(t=[round(float(x),3) for x in oni.t], v=[round(float(x),2) for x in oni.anom_c], year=[int(x) for x in oni.year], season=list(oni.season)),
  events=[{k:v for k,v in e.items() if k not in ('a','b')} for e in events],
  windows={k:v['desc'] for k,v in WINDOWS.items() if k in ('US','BR','IN','AR')},
  countries=countries,
  sources=dict(
    oni='NOAA Climate Prediction Center — Oceanic Niño Index (ERSSTv5, Niño 3.4, 3-month running mean)',
    US='USDA NASS Quick Stats — upland cotton yield (lb/acre) and acres harvested by county, incl. irrigated / non-irrigated practice splits (1972–2018), survey program, 1950–2025',
    BR='IBGE — Produção Agrícola Municipal (PAM), tables 1612 & 5457: algodão herbáceo em caroço, área colhida and quantidade produzida by municipality, 1974–2025',
    IN='ICRISAT District Level Database — cotton area and production by district, 1966–2019',
    AR='Ministerio de Economía (Argentina), Dirección de Estimaciones Agrícolas — algodón by departamento, campañas 1969/70–2024/25'),
)
json.dump(out, open(OUT,'w'), separators=(',',':'), ensure_ascii=False)
print('bytes', os.path.getsize(OUT))

try: os.remove(str(GEO / '_us_counties.json'))
except OSError: pass
