"""Sindh district cotton from Development Statistics of Sindh (Table 4.29), Sindh Bureau of Statistics / Crop Reporting Service.
Production is in bales (some volumes mislabel the column 'M. Tons'; magnitudes and provincial totals are bales). Crop year 'YYYY-YY' -> YYYY."""
import re, subprocess, pandas as pd
D='data/raw/pakistan/sindh/'
FILES=['DS-2014_p126_cotton.pdf','Development-Statistics-of-Sindh-2017_p126_cotton.pdf','Development-Statistics-of-Sindh-2019_p129_cotton.pdf','DS-2020_25-01-2022_p128_cotton.pdf']   # table 4.29 pages extracted from each edition
num=r'(--|-|[\d,]+)'
rows=[]
for f in FILES:
    t=subprocess.run(['pdftotext','-layout',D+f,'-'],capture_output=True,text=True).stdout.splitlines()
    i=next(k for k,l in enumerate(t) if 'AREA AND PRODUCTION OF COTTON BY DISTRICT' in l)
    y0=int(re.search(r'(\d{4})-\d{2}\s+TO',' '.join(t[i:i+3])).group(1))
    for l in t[i+3:i+80]:
        if 'Source' in l: break
        m=re.match(r'^\s*([A-Za-z][A-Za-z .]+?)\s+'+r'\s+'.join([num]*6)+r'\s*$',l)
        if not m: continue
        nm=m.group(1).strip(); v=[None if x in('--','-') else float(x.replace(',','')) for x in m.groups()[1:]]
        for k in range(3):
            rows.append(dict(district=nm,year=y0+k,area_ha=v[k],prod_bales=v[3+k],src=f))
df=pd.DataFrame(rows)
ALIAS={'tandoallahyar':'Tando Allahyar','tandoallahyar':'Tando Allahyar','sbabad':'S.B.Abad','shaheedbenazirabad':'S.B.Abad','nawabshah':'S.B.Abad','nausheroferoze':'Naushero Feroze','umerkot':'Umerkot','umarkot':'Umerkot','tandomuhammadkhan':'Tando Muhammad Khan','kambershahdadkot':'Kamber Shahdadkot'}
df['district']=df.district.map(lambda n: ALIAS.get(re.sub(r'[^a-z]','',n.lower()),n))
# overlap check between volumes
ov=df.pivot_table(index=['district','year'],columns='src',values='prod_bales')
print('years per volume:',df.groupby('src').year.agg(['min','max']).to_dict('index'))
multi=ov[ov.notna().sum(axis=1)>1]
print('overlapping district-years:',len(multi),' max rel diff:',(multi.max(axis=1)/multi.min(axis=1)-1).max())
df=df.sort_values('src',key=lambda s:s.map({f:i for i,f in enumerate(FILES)})).drop_duplicates(['district','year'],keep='last')
df['province']='Sindh'; df['area_000ha']=df.area_ha.fillna(0)/1000; df['prod_000bales']=df.prod_bales.fillna(0)/1000
tot=df[df.district=='SINDH'].set_index('year')[['area_000ha','prod_000bales']]
dd=df[df.district!='SINDH']; s=dd.groupby('year')[['area_000ha','prod_000bales']].sum()
print(pd.concat([s,tot.add_suffix('_total')],axis=1).round(1))
dd[['province','district','year','area_000ha','prod_000bales','src']].to_csv('data/raw/pakistan/pakistan_sindh_district_cotton_2010_2018.csv',index=False)
