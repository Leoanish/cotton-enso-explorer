"""Loaders for the exploratory China (CN) and Pakistan (PK) layers (and Australia when its file is present).
Executed from build_data.py; uses pd/np/json/ROOT from there."""
import re
RAW=ROOT/'data'/'raw'
WINDOWS['CN']=dict(desc='May–Oct of crop year (sown Apr–May, picked Sep–Nov)', months=[(0,4),(0,5),(0,6),(0,7),(0,8),(0,9)])
WINDOWS['PK']=dict(desc='May–Oct of crop year (kharif: sown Apr–Jun, picked Sep–Dec)', months=[(0,4),(0,5),(0,6),(0,7),(0,8),(0,9)])
WINDOWS['AU']=dict(desc='Nov (prev yr)–Apr of harvest year (sown Oct–Nov, picked Apr–Jun)', months=[(-1,10),(-1,11),(0,0),(0,1),(0,2),(0,3)])

# ---------------- China (provinces; admin1 = traditional cotton zone)
CN_ZONE={'Xinjiang':'Northwest inland','Gansu':'Northwest inland','Ningxia':'Northwest inland','InnerMongolia':'Northwest inland',
 'Hebei':'Yellow River valley','Shandong':'Yellow River valley','Henan':'Yellow River valley','Shanxi':'Yellow River valley','Shaanxi':'Yellow River valley','Tianjin':'Yellow River valley','Beijing':'Yellow River valley',
 'Jiangsu':'Yangtze River valley','Anhui':'Yangtze River valley','Hubei':'Yangtze River valley','Hunan':'Yangtze River valley','Jiangxi':'Yangtze River valley','Zhejiang':'Yangtze River valley','Shanghai':'Yangtze River valley','Sichuan':'Yangtze River valley','Chongqing':'Yangtze River valley'}
CN_NE={'InnerMongolia':'Inner Mongolia'}
def load_cn():
    d=pd.read_csv(RAW/'china'/'china_province_cotton_merged.csv')
    d=d[d.prov.isin(CN_ZONE)].copy()
    d['code']='CN-'+d.prov; d['name']=d.prov.map(lambda p: CN_NE.get(p,p)); d['admin1']=d.prov.map(CN_ZONE)
    d['area']=d.area_w*1000; d['yield']=d.yield_kgha; d['prod']=d['yield']*d['area']/1000
    return d[['code','year','name','admin1','area','prod','yield']]

# ---------------- Pakistan (stable district units = 1981 boundaries, later splits merged back)
def _k(s): return re.sub(r'[^a-z]','',str(s).lower())
PK_UNIT={}
def _u(name,*keys):
    for k in keys: PK_UNIT[k]=name
_u('Multan (incl. Khanewal, Lodhran)','multan','khanewal','lodhran')
_u('Sahiwal (incl. Pakpattan)','sahiwal','pakpattan')
_u('Jhang (incl. Chiniot)','jhang','chiniot')
_u('Muzaffargarh (incl. Kot Addu)','muzaffargarh','mgarh','kotaddu')
_u('Dera Ghazi Khan','deraghazikhan','dgkhan')
_u('Rahim Yar Khan','rahimyarkhan','rykhan')
_u('Toba Tek Singh','tobateksingh','ttsingh')
_u('Vehari','vehari','vihari')
_u('Sheikhupura (incl. Nankana Sahib)','sheikhupura','sheikhpura','nankanasahib')
_u('Mandi Bahauddin','mandibahauddin','mbdin','mandibahaudin')
_u('Hyderabad (incl. Matiari, Tando Allahyar, T.M. Khan)','hyderabad','matiari','tandoallahyar','tandomuhammadkhan','tmkhan')
_u('Dadu (incl. Jamshoro)','dadu','jamshoro')
_u('Tharparkar–Mirpurkhas–Umerkot','tharparkar','mirpurkhas','umerkot','umarkot')
_u('Sukkur (incl. Ghotki)','sukkur','ghotki')
_u('Khairpur–Nawabshah–N. Feroze','khairpur','nawabshah','sbabad','shaheedbenazirabad','shaheedbenazir','naushahroferoze','nferoze','nausheroferoze','naushehroferoze')
_u('Larkana–Jacobabad (incl. Shikarpur, Kashmore, Kamber)','larkana','shikarpur','kambershahdadkot','kambershahdatkot','kambershahdat','qambarshahdadkot','jacobabad','kashmore')
def pk_unit(n):
    k=_k(n); return PK_UNIT.get(k, str(n).strip().title())
def load_pk():
    P=RAW/'pakistan'
    a=pd.read_csv(P/'pakistan_district_cotton_1981_2008.csv')
    b=pd.read_csv(P/'pakistan_punjab_district_cotton_2011_2018.csv')
    c=pd.read_csv(P/'pakistan_sindh_district_cotton_2010_2018.csv')
    c=c[c.year!=2011]   # Sindh 2011-12 (flood year): published area is not consistent with production (implied lint yields >1.5 t/ha) -> dropped
    d=pd.read_csv(P/'pakistan_district_cotton_2021_2023.csv')
    df=pd.concat([x[['province','district','year','area_000ha','prod_000bales']] for x in (a,b,c,d)])
    df=df[df.province.isin(['Punjab','Sindh'])].copy()
    df['unit']=df.district.map(pk_unit)
    g=df.groupby(['province','unit','year'],as_index=False)[['area_000ha','prod_000bales']].sum()
    g=g[(g.area_000ha>0.5)&(g.prod_000bales>0)]
    g['area']=g.area_000ha*1000; g['prod']=g.prod_000bales*1000*0.17009   # t lint (PBS: 1 bale = 170.09 kg)
    g['yield']=g['prod']*1000/g['area']
    g['code']='PK-'+g.unit.map(_k); g['name']=g.unit; g['admin1']=g.province
    return g[['code','year','name','admin1','area','prod','yield']]

# ---------------- Australia (states), only if the ABARES state file has been supplied
def load_au():
    f=RAW/'australia'/'au_state_cotton.csv'
    if not f.exists(): return None
    d=pd.read_csv(f)   # columns: state, year (harvest), area_ha, prod_t_lint
    d['code']='AU-'+d.state.map(_k); d['name']=d.state; d['admin1']=d.state
    d['area']=d.area_ha; d['prod']=d.prod_t_lint; d['yield']=d['prod']*1000/d['area']
    return d[(d.area>0)&(d['prod']>0)][['code','year','name','admin1','area','prod','yield']]

def centroids_from(geojson_path, key_fn):
    """area-weighted centroid of each feature's outer rings (lon,lat)"""
    g=json.load(open(geojson_path)); out={}
    for f in g['features']:
        k=key_fn(f)
        if not k or f['geometry'] is None: continue
        polys=f['geometry']['coordinates'] if f['geometry']['type']=='MultiPolygon' else [f['geometry']['coordinates']]
        A=X=Y=0.0
        for p in polys:
            r=np.array(p[0]); x,y=r[:,0],r[:,1]; cr=x[:-1]*y[1:]-x[1:]*y[:-1]; a=cr.sum()/2
            if a==0: continue
            A+=a; X+=((x[:-1]+x[1:])*cr).sum()/6; Y+=((y[:-1]+y[1:])*cr).sum()/6
        if A: 
            o=out.setdefault(k,[0,0,0]); o[0]+=X; o[1]+=Y; o[2]+=A
    return {k:(round(v[1]/v[2],3),round(v[0]/v[2],3)) for k,v in out.items()}

def _mapshaper(feats, out, simplify, dissolve=None):
    tmp=str(GEO/('_tmp_'+os.path.basename(out))); json.dump({'type':'FeatureCollection','features':feats},open(tmp,'w'))
    cmd=['npx','--no-install','mapshaper',tmp]
    if dissolve: cmd+=['-rename-fields','grp='+dissolve,'-dissolve','grp','-rename-fields',dissolve+'=grp']
    cmd=cmd+['-simplify',simplify,'keep-shapes','-o',str(GEO/out),'format=geojson','precision=0.001','force']
    subprocess.run(cmd,check=True,capture_output=True); os.remove(tmp)
    g=json.load(open(GEO/out))
    for ft in g['features']:
        ge=ft['geometry']
        if ge is None: continue
        if ge['type']=='Polygon': ge['coordinates']=[r[::-1] for r in ge['coordinates']]
        else: ge['coordinates']=[[r[::-1] for r in poly] for poly in ge['coordinates']]
        if 'id' in ft['properties']: ft['id']=ft['properties'].pop('id')
    g['features']=[f for f in g['features'] if f.get('geometry')]
    json.dump(g,open(GEO/out,'w'),separators=(',',':')); print(out,len(g['features']),os.path.getsize(GEO/out))
    return g

def build_new_geo(countries):
    ne=json.load(open(RAW/'boundaries'/'ne_10m_admin1_chn_pak_aus.geojson'))
    def adm(a3): return [f for f in ne['features'] if f['properties']['adm0_a3']==a3]
    if 'CN' in countries:
        ids={r['id'] for r in countries['CN']['regions']}
        cn=[f for f in adm('CHN') if f['properties']['name']!='Paracel Islands']
        nm=lambda f: f['properties']['name_en'].replace(' ','')
        _mapshaper([{'type':'Feature','properties':{'id':'CN-'+nm(f)},'geometry':f['geometry']} for f in cn if 'CN-'+nm(f) in ids],'cn_polys.json','6%')
        _mapshaper([{'type':'Feature','properties':{'name':CN_ZONE.get(nm(f),'Other provinces')},'geometry':f['geometry']} for f in cn],'cn_states.json','3%',dissolve='name')
    if 'PK' in countries:
        pkn={'Sind':'Sindh','K.P.':'Khyber Pakhtunkhwa','Baluchistan':'Balochistan'}
        _mapshaper([{'type':'Feature','properties':{'name':pkn.get(f['properties']['name'],f['properties']['name'])},'geometry':f['geometry']} for f in adm('PAK')],'pk_states.json','5%')
        gb=json.load(open(RAW/'boundaries'/'pak_adm2.geojson')); ids={r['id'] for r in countries['PK']['regions']}
        feats=[]
        for f in gb['features']:
            code='PK-'+_k(pk_unit(f['properties']['shapeName']))
            if code in ids: feats.append({'type':'Feature','properties':{'id':code},'geometry':f['geometry']})
        _mapshaper(feats,'pk_polys.json','15%',dissolve='id')
        missing=ids-{f['properties']['id'] for f in feats}; print('PK units without polygon:',missing)
    if 'AU' in countries:
        _mapshaper([{'type':'Feature','properties':{'name':f['properties']['name']},'geometry':f['geometry']} for f in adm('AUS') if f['properties']['name'] in ('New South Wales','Queensland','Victoria','South Australia','Western Australia','Northern Territory','Tasmania','Australian Capital Territory')],'au_states.json','3%')
        ids={r['id'] for r in countries['AU']['regions']}
        _mapshaper([{'type':'Feature','properties':{'id':'AU-'+_k(f['properties']['name'])},'geometry':f['geometry']} for f in adm('AUS') if 'AU-'+_k(f['properties']['name']) in ids],'au_polys.json','3%')
