"""China provincial cotton: NBS bulletins (2019-2025, + 2021 from a verbatim republication), NBS Statistical Yearbooks
(data years 2006-2013; 2001 sown area) and the 1961-2017 provincial yield compilation (Mendeley bms88fv7zz).
Writes data/raw/china/china_province_cotton_merged.csv (year, prov, yield_kgha, ysrc, area_kha, asrc, area_w, area_flag)."""
import pandas as pd, numpy as np, io, re, glob, itertools, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import ROOT
R=ROOT/'data'/'raw'/'china'; N=R/'nbs'
ZH={'全国总计':'NationalTotal','北京':'Beijing','天津':'Tianjin','河北':'Hebei','山西':'Shanxi','内蒙古':'InnerMongolia','辽宁':'Liaoning','吉林':'Jilin','黑龙江':'Heilongjiang','上海':'Shanghai','江苏':'Jiangsu','浙江':'Zhejiang','安徽':'Anhui','福建':'Fujian','江西':'Jiangxi','山东':'Shandong','河南':'Henan','湖北':'Hubei','湖南':'Hunan','广东':'Guangdong','广西':'Guangxi','海南':'Hainan','重庆':'Chongqing','四川':'Sichuan','贵州':'Guizhou','云南':'Yunnan','西藏':'Tibet','陕西':'Shaanxi','甘肃':'Gansu','青海':'Qinghai','宁夏':'Ningxia','新疆':'Xinjiang'}
# ---- 1. bulletins: column order varies, so identify columns by consistency (area x yield = output) and by province sums
rows=[]
for f in sorted(glob.glob(str(N/'bulletins'/'*.html'))):
    y=int(os.path.basename(f)[:4]); tabs=pd.read_html(io.StringIO(open(f,encoding='utf-8',errors='ignore').read()))
    t=[x for x in tabs if ('Xinjiang' in x.astype(str).to_string() or '新' in x.astype(str).to_string()) and x.shape[0]>20][-1]
    recs=[]
    for _,r in t.iterrows():
        name=re.sub(r'\s+','',str(r.iloc[0])); v=[]
        for x in r.iloc[1:4]:
            try: v.append(float(str(x).replace(',','')))
            except: v.append(np.nan)
        if name and not all(np.isnan(v)): recs.append((ZH.get(name,name),*v))
    g=pd.DataFrame(recs,columns=['prov','c1','c2','c3'])
    best=min(itertools.permutations(['c1','c2','c3']),key=lambda p: np.nanmedian(np.abs(g[p[2]]*1e4/g[p[0]]-g[p[1]])/g[p[1]]))
    g=g.rename(columns={best[0]:'area_kha',best[1]:'yield_kgha',best[2]:'prod_10kt'})
    nat=g[g.prov=='NationalTotal'].iloc[0]; pr=g[g.prov!='NationalTotal']
    if abs(pr.yield_kgha.sum()-nat.yield_kgha)<abs(pr.area_kha.sum()-nat.area_kha):   # area and yield are interchangeable in the product check
        g=g.rename(columns={'area_kha':'yield_kgha','yield_kgha':'area_kha'})
    g['year']=y; rows.append(g)
# 2021: provincial table from the verbatim republication of the NBS bulletin (marketscreener, 15 Dec 2021)
y21=[('NationalTotal',3028.1,1892.6,573.1),('Tianjin',3.7,1085.1,0.4),('Hebei',139.8,1142.4,16.0),('Jiangsu',5.8,1362.2,0.8),('Zhejiang',4.0,1391.5,0.6),('Anhui',34.4,845.8,2.9),('Jiangxi',11.0,1557.8,1.7),('Shandong',110.2,1272.9,14.0),('Henan',11.5,1215.4,1.4),('Hubei',120.7,902.4,10.9),('Hunan',60.2,1337.9,8.0),('Guangxi',1.1,1038.3,0.1),('Sichuan',2.1,960.7,0.2),('Gansu',16.2,1882.8,3.1),('Xinjiang',2506.1,2046.4,512.9)]
rows.append(pd.DataFrame(y21,columns=['prov','area_kha','yield_kgha','prod_10kt']).assign(year=2021))
bl=pd.concat(rows); bl.to_csv(N/'cn_bulletins_2019_2025.csv',index=False)
for y,g in bl.groupby('year'):
    n=g[g.prov=='NationalTotal'].iloc[0]; p=g[g.prov!='NationalTotal']
    print('bulletin',y,'sum area',round(p.area_kha.sum(),1),'national',n.area_kha)
bl=bl[bl.prov!='NationalTotal'].dropna(subset=['area_kha','yield_kgha'])
# ---- 2. yearbooks (YYYY_out = output by region, YYYY_ph = yield per hectare; data year = yearbook year - 1)
PROVS=['Beijing','Tianjin','Hebei','Shanxi','Inner Mongolia','Liaoning','Jilin','Heilongjiang','Shanghai','Jiangsu','Zhejiang','Anhui','Fujian','Jiangxi','Shandong','Henan','Hubei','Hunan','Guangdong','Guangxi','Hainan','Chongqing','Sichuan','Guizhou','Yunnan','Tibet','Shaanxi','Gansu','Qinghai','Ningxia','Xinjiang']
def load(Y,k):
    x=N/'yearbook'/f'{Y}_{k}.xls'
    if x.exists(): t=pd.read_excel(x,header=None)
    else: t=max(pd.read_html(io.StringIO(open(N/'yearbook'/f'{Y}_{k}.htm','rb').read().decode('gbk','ignore'))),key=lambda q:q.size)
    return t.map(lambda q:'' if pd.isna(q) else str(q).strip())
yb=[]
for Y in range(2007,2015):
    d={}
    for k in ['out','ph']:
        t=load(Y,k); ci=next(i for i in range(10) if 'Cotton' in t.iloc[i].tolist()); ci=t.iloc[ci].tolist().index('Cotton')
        for _,r in t.iterrows():
            nm_=re.sub(r'\s+',' ',r.iloc[0]).strip()
            if nm_ in PROVS:
                try: d.setdefault(nm_,{})[k]=float(r.iloc[ci])
                except ValueError: pass
    for p,v in d.items():
        if 'out' in v and 'ph' in v and v['ph']>0: yb.append(dict(year=Y-1,prov=p.replace(' ',''),prod_10kt=v['out'],yield_kgha=round(v['ph'],1),area_kha=round(v['out']*1e4/v['ph'],1)))
yb=pd.DataFrame(yb); yb.to_csv(N/'cn_yearbook_2006_2013.csv',index=False)
t=max(pd.read_html(io.StringIO(open(N/'yearbook'/'yb2002_L1214e.htm','rb').read().decode('gbk','ignore'))),key=lambda q:q.size).map(lambda q:'' if pd.isna(q) else str(q).strip())
a01={r.iloc[0].replace(' ',''):float(r.iloc[12]) for _,r in t.iterrows() if re.fullmatch(r'\d+(\.\d+)?',r.iloc[12])}   # column 12 = Cotton
# ---- 3. merge
x=pd.read_excel(R/'china_provincial_crop_yield_1961_2017.xlsx',sheet_name='Cotton',header=None)
names=x.iloc[1,1:].tolist(); x=x.iloc[2:].set_index(0); x.columns=names; x.index=x.index.astype(int)
xl=x.stack().rename('y').reset_index(); xl.columns=['year','prov','y']; xl['y']=pd.to_numeric(xl.y,errors='coerce'); xl=xl[xl.y>0]
rec={(r.year,r.prov):dict(yield_kgha=r.y,ysrc='compilation') for r in xl.itertuples()}
for r in yb.itertuples():
    k=(r.year,r.prov)
    if r.year==2008:   # YB2009's per-hectare column is not cotton (implied national 1,829 kg/ha) -> area from output / compilation yield
        if k in rec: rec[k].update(area_kha=round(r.prod_10kt*1e4/rec[k]['yield_kgha'],1),asrc='NBS yearbook output / yield')
        continue
    rec.setdefault(k,{}).update(yield_kgha=r.yield_kgha,ysrc='NBS yearbook',area_kha=r.area_kha,asrc='NBS yearbook')
for r in bl.itertuples(): rec[(r.year,r.prov)]=dict(yield_kgha=r.yield_kgha,ysrc='NBS bulletin',area_kha=r.area_kha,asrc='NBS bulletin')
for p,a in a01.items():
    if (2001,p) in rec: rec[(2001,p)].update(area_kha=a,asrc='NBS yearbook 2002 sown area')
df=pd.DataFrame([dict(year=k[0],prov=k[1],**v) for k,v in rec.items()]).sort_values(['prov','year'])
out=[]
for p,g in df.groupby('prov'):
    g=g.set_index('year').copy(); a=g.area_kha.astype(float)
    g['area_w']=a.interpolate(method='index',limit_area='inside').bfill().ffill(); g['area_flag']=np.where(a.notna(),'official','interpolated/held'); out.append(g.reset_index())
df=pd.concat(out); df=df[df.area_w.notna()]
df.to_csv(R/'china_province_cotton_merged.csv',index=False)
nat=df.groupby('year').apply(lambda g: np.average(g.yield_kgha,weights=g.area_w),include_groups=False).round(0)
print('rebuilt national yield:',nat.loc[[2001,2010,2013,2019,2021,2023,2025]].to_dict())
