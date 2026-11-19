"""Extend ICRISAT district cotton (1966 boundaries, ends 2019) to 2024 with UPAg (Ministry of Agriculture) district data.
Districts are matched by state + name. For each matched ICRISAT district, UPAg values over the 2013–2019 overlap are
calibrated to ICRISAT (median ratio of yields and of areas); a district is extended only if the overlap is close
(>=4 years, median yield ratio within 0.75–1.33, and year-to-year ratio scatter (MAD) <= 0.12). Output: data/raw/india_des/india_icrisat_ext_2020_2024.csv"""
import re, unicodedata, pandas as pd, numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import F, ROOT
# spelling variants (same district) -- applied to both sources
SPELL={'ananthapuramu':'anantapur','ysrkadapa':'cuddapah','kadapa':'cuddapah','spsrnellore':'nellore','sripottisriramulunellore':'nellore',
 'ahilyanagar':'ahmednagar','ahmadnagar':'ahmednagar','buldhana':'buldana','chhatrapatisambhajinagar':'aurangabad','dharashiv':'osmanabad','beed':'bid',
 'yavatmal':'yeotmal','amravati':'amarawati','khargonewestnimar':'khargone','westnimar':'khargone','khandwaeastnimar':'khandwa','eastnimar':'khandwa','narsinghpur':'narsimhapur',
 'mehsana':'mahesana','panchmahals':'panchmahal','kachchh':'kutch','dangs':'dang','ahmadabad':'ahmedabad',
 'hisar':'hissar','sriganganagar':'ganganagar','ferozepur':'ferozpur','firozpur':'ferozpur','bathinda':'bhatinda','srimuktsarsahib':'shrimukatsarsahib','muktsar':'shrimukatsarsahib',
 'mysuru':'mysore','belagavi':'belgaum','ballari':'bellary','vijayapura':'bijapur','kalaburagi':'gulbarga','bagalkote':'bagalkot','davanagere':'davangere','chikkamagaluru':'chikmagalur','shivamogga':'shimoga','tumakuru':'tumkur',
 'thoothukkudi':'tuticorin','thoothukudi':'tuticorin','tirunelveli':'thirunelveli','ramanathapuram':'ramananthapuram','viluppuram':'villupuram','tiruchirappalli':'tiruchirapalli',
 'rangareddy':'rangareddy','rangareddi':'rangareddy'}
# districts created after 1966 -> parent, used only when ICRISAT has no district of that name in the state
PARENT={'adilabad':['nirmal','mancherial','kumurambheemasifabad'],'karimnagar':['jagitial','peddapalli','rajannasircilla'],
 'warangal':['hanumakonda','warangalurban','warangalrural','jangoan','jayashankarbhupalapally','mahabubabad','mulugu'],'khammam':['bhadradrikothagudem'],
 'nalgonda':['suryapet','yadadribhuvanagiri'],'mahabubnagar':['nagarkurnool','wanaparthy','jogulambagadwal','narayanpet'],'medak':['sangareddy','siddipet'],
 'nizamabad':['kamareddy'],'rangareddy':['vikarabad','medchalmalkajgiri'],
 'akola':['washim'],'parbhani':['hingoli'],'dhule':['nandurbar'],'bhandara':['gondia'],
 'khandwa':['burhanpur'],'khargone':['barwani'],'jhabua':['alirajpur'],'shajapur':['agarmalwa'],
 'ferozpur':['fazilka'],'thirunelveli':['tenkasi'],'bhatinda':[],'villupuram':['kallakurichi'],'coimbatore':['tiruppur'],'raichur':['koppal'],'gulbarga':['yadgir'],'bellary':['vijayanagara']}
def nm(s): s=unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower(); s=re.sub(r'[^a-z]','',s); return SPELL.get(s,s)
ic=pd.read_csv(F['icrisat_new'])
ic=ic.rename(columns={'Dist Code':'code','Year':'year','State Name':'state','Dist Name':'dist','COTTON AREA (1000 ha)':'area','COTTON PRODUCTION (1000 tons)':'prod'})
bad=(ic.state.str.lower()=='rajasthan')&(ic.year.isin([2012,2013,2014,2015,2017])); ic.loc[bad,'prod']=ic.loc[bad,'prod']*1000/170   # same ICRISAT unit fix as build_core
ic=ic[(ic.area>0)&(ic['prod']>0)].copy(); ic['yield']=ic['prod']/ic['area']*1000
icmeta=ic.drop_duplicates('code').set_index('code')[['state','dist']]
# Telangana districts are listed under Andhra Pradesh in ICRISAT
up=pd.read_csv(F['upag'] if 'upag' in F else ROOT/'data/raw/india_des/india_upag_cotton_2013_2024.csv')
up['year']=up.year.str[:4].astype(int)
up=up.groupby(['year','state_name','district_name'],as_index=False)[['area','production']].sum()
up=up[(up.area>0)&(up.production>0)]
icnames={}
for st,dd in zip(icmeta.state,icmeta.dist): icnames.setdefault(nm(st),set()).add(nm(dd))
CHILD={c:p for p,cs in PARENT.items() for c in cs}
def upkey(st,d):
    s_,d_=nm(st),nm(d)
    if d_ in icnames.get(s_,()): return (s_,d_)
    if CHILD.get(d_) in icnames.get(s_,()): return (s_,CHILD[d_])
    return (s_,None)
up['k']=[upkey(s,d) for s,d in zip(up.state_name,up.district_name)]
up=up[[k[1] is not None for k in up.k]]
agg=up.groupby(['k','year'],as_index=False)[['area','production']].sum()   # several new districts can map to one 1966 parent
agg['yield']=agg.production*1000/agg.area   # kg/ha
icmeta['k']=[(nm(s),nm(d)) for s,d in zip(icmeta.state,icmeta.dist)]
rows=[]; report=[]
for code,m in icmeta.iterrows():
    u=agg[agg.k==m.k]
    if u.empty: continue
    i=ic[ic.code==code].set_index('year'); uu=u.set_index('year')
    ov=sorted(set(i.index)&set(uu.index)&set(range(2013,2020)))
    if len(ov)<4: report.append((code,m.dist,'overlap<4',len(ov))); continue
    ry=(i.loc[ov,'yield']/uu.loc[ov,'yield']); ra=(i.loc[ov,'area']*1000/uu.loc[ov,'area'])
    medy=float(ry.median()); meda=float(ra.median()); mad=float((np.log(ry)-np.log(medy)).abs().median())
    ok=(0.75<=medy<=1.33) and mad<=0.12
    report.append((code,m.dist,'ok' if ok else 'rejected',len(ov),round(medy,2),round(meda,2),round(mad,3)))
    if not ok: continue
    for y in [y for y in uu.index if y>=2020]:
        rows.append(dict(code=code,year=y,area=uu.loc[y,'area']*meda/1000,yield_=uu.loc[y,'yield']*medy))
out=pd.DataFrame(rows); out['prod']=out.area*out.yield_/1000   # 1000 ha, 1000 t (ICRISAT units)
out.rename(columns={'yield_':'yield'}).to_csv(ROOT/'data/raw/india_des/india_icrisat_ext_2020_2024.csv',index=False)
rep=pd.DataFrame(report,columns=['code','district','status','nOverlap','yieldRatio','areaRatio','mad'][:max(len(r) for r in report)])
rep.to_csv(ROOT/'data/raw/india_des/india_ext_match_report.csv',index=False)
print(rep.status.value_counts()); print('extended districts',out.code.nunique(),'years',sorted(out.year.unique()))
