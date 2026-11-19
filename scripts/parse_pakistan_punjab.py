"""Punjab district cotton 2011-2018: Punjab Development Statistics 2017 (Tables 51 & 55, 2011-12..2015-16)
and Crop Reporting Service 'Final estimates of major Kharif crops' 2016-17, 2017-18, 2018-19. Crop year 'YYYY-YY' -> YYYY."""
import re, subprocess, pandas as pd
D='data/raw/pakistan/punjab/'
def txt(f,a=None,b=None):
    c=['pdftotext','-layout']+(['-f',str(a),'-l',str(b)] if a else [])+[D+f,'-']
    return subprocess.run(c,capture_output=True,text=True).stdout
num=r'(-|\(a\)|[\d,]+\.?\d*)'
def val(x): return 0.0 if x in('-','(a)') else float(x.replace(',',''))
rows=[]; totals={}
for page,col in [(1,'area_000ha'),(2,'prod_000bales')]:   # = PDS 2017 pages 107 (Table 51) and 111 (Table 55)
    for line in txt('pds-2017_tables51_55.pdf',page,page).splitlines():
        m=re.match(r'^\s*([A-Za-z][A-Za-z .\-]+?)\s+'+r'\s+'.join([num]*5)+r'\s*$',line)
        if not m: continue
        nm=m.group(1).strip(); v=[val(x) for x in m.groups()[1:]]
        if nm=='The Punjab': totals.update({(2011+i,col):v[i] for i in range(5)}); continue
        if 'Divn' in nm: continue
        for i in range(5): rows.append(dict(district=nm,year=2011+i,var=col,v=v[i]))
for f,y in [('kharif.-2016-17.pdf',2016),('finalestimationofmajorkharif2017-18.pdf',2017),('final-estimation-of-major-kharif-crops-2018-19.pdf',2018)]:
    for line in txt(f).splitlines():
        m=re.match(r'^\s*([A-Za-z][A-Za-z .\-]*?[A-Za-z.])\s+'+r'\s+'.join([r'([\d,]+\.?\d*)']*12)+r'\s*$',line)
        if not m: continue
        nm=m.group(1).strip(); v=[float(x.replace(',','')) for x in m.groups()[1:]]
        if nm=='The Punjab': totals[(y,'area_000ha')]=v[2]; totals[(y,'prod_000bales')]=v[3]; continue
        if 'Divn' in nm: continue
        rows.append(dict(district=nm,year=y,var='area_000ha',v=v[2])); rows.append(dict(district=nm,year=y,var='prod_000bales',v=v[3]))
df=pd.DataFrame(rows).pivot_table(index=['district','year'],columns='var',values='v').reset_index()
df['province']='Punjab'
s=df.groupby('year')[['area_000ha','prod_000bales']].sum()
s['area_total']=[totals.get((y,'area_000ha')) for y in s.index]; s['prod_total']=[totals.get((y,'prod_000bales')) for y in s.index]
print(s.round(1))
df.to_csv('data/raw/pakistan/pakistan_punjab_district_cotton_2011_2018.csv',index=False)
print(sorted(df.district.unique()))
