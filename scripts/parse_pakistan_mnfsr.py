"""Parse MNFSR 'Crops Area and Production (District wise)' cotton table (Table No. 8).
Production column is labelled 000 Tons but values are 000 bales (170 kg). Crop year '2022-23' -> year 2022."""
import re, subprocess, sys, pandas as pd
SRC={'data/raw/pakistan/mnfsr_2022_23_cotton_p32-33.pdf':(1,2,2021),   # pages 32-33 of 'Crops Area and Production (District wise) 2022-23'
     'data/raw/pakistan/mnfsr_2023_24_cotton_p41-42.pdf':(1,2,2022)}   # pages 41-42 of 'Cap_2024_updated_Final' (2023-24)
num=r'(-?[\d,]+\.?\d*)'
rows=[]
for f,(a,b,y0) in SRC.items():
    txt=subprocess.run(['pdftotext','-f',str(a),'-l',str(b),'-layout',f,'-'],capture_output=True,text=True).stdout
    prov=None; pending=None
    for line in txt.splitlines():
        s=line.strip()
        if re.match(r'^[A-Za-z][A-Za-z .]+$',s) and not re.match(r'^(PUNJAB|SINDH|KPK|KP|BALOCHISTAN|BALUCHISTAN|Province|DISTRICT|COTTON|Area|Production|Table|hectares|Total)',s,re.I):
            pending=s; continue
        m0=re.match(r'^'+r'\s+'.join([num]*8)+r'\s*$',s)
        if m0 and pending: s=pending+' '+s
        pending=None
        m=re.match(r'^(PUNJAB|SINDH|KPK|KP|BALOCHISTAN|BALUCHISTAN)\b',s,re.I)
        if m: prov={'PUNJAB':'Punjab','SINDH':'Sindh','KPK':'Khyber Pakhtunkhwa','KP':'Khyber Pakhtunkhwa'}.get(m.group(1).upper(),'Balochistan'); continue
        if 'Province/' in s and 'PUNJAB' in s.upper(): prov='Punjab'
        m=re.match(r'^([A-Za-z][A-Za-z .\'\-]+?)\s+'+r'\s+'.join([num]*8)+r'\s*$',s)
        if m and prov:
            v=[float(x.replace(',','')) for x in m.groups()[1:]]
            name=m.group(1).strip()
            if name.lower()=='total': continue
            rows+= [dict(province=prov,district=name,year=y0,area_000ha=v[0],prod_000bales=v[4],src=f.split('/')[-1]),
                    dict(province=prov,district=name,year=y0+1,area_000ha=v[2],prod_000bales=v[6],src=f.split('/')[-1])]
        elif re.match(r'^Total\s',s) and prov=='Punjab' and 'SINDH' in txt: pass
df=pd.DataFrame(rows)
# the 2022 year appears in both reports: check agreement then keep newest
d22=df[df.year==2022].pivot_table(index='district',columns='src',values='prod_000bales')
print('2022 overlap max abs diff:',(d22.iloc[:,0]-d22.iloc[:,1]).abs().max())
df=df.sort_values('src').drop_duplicates(['province','district','year'],keep='last')
df.to_csv('data/raw/pakistan/pakistan_district_cotton_2021_2023.csv',index=False)
print(df.groupby(['year','province'])[['area_000ha','prod_000bales']].sum().round(1))
