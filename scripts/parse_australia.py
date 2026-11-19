"""ABARES Australian Crop Report state data -> data/raw/australia/au_state_cotton.csv (NSW, Queensland; harvest years; forecasts dropped).
Sheet layout: row 6 = season headers from column 3 ('1989–90' ... '2026–27 f'); block 'Cotton lint a' followed by Area ('000 ha) and Production (kt)."""
import pandas as pd, re, glob, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import ROOT
D=ROOT/'data'/'raw'/'australia'; f=sorted(glob.glob(str(D/'*StateCropData*.xlsx')))[-1]; rows=[]
for s in ['Australia','New South Wales','Queensland','South Australia','Tasmania','Victoria','Western Australia']:
    d=pd.read_excel(f,sheet_name=s,header=None); hdr=d.iloc[6,3:].tolist()
    i=next(i for i in range(len(d)) if str(d.iloc[i,1]).startswith('Cotton lint'))
    assert str(d.iloc[i+1,1]).strip()=='Area' and str(d.iloc[i+2,1]).strip()=='Production', s
    for h,a,p in zip(hdr,d.iloc[i+1,3:],d.iloc[i+2,3:]):
        if pd.isna(h): continue
        m=re.match(r'(\d{4})\D(\d{2})\s*([fs]?)',str(h).strip())
        rows.append(dict(state=s,season=str(h).strip(),year=int(m.group(1))+1,flag=m.group(3),area_ha=pd.to_numeric(a,errors='coerce')*1000,prod_t_lint=pd.to_numeric(p,errors='coerce')*1000))
df=pd.DataFrame(rows); df.to_csv(D/'abares_state_cotton_all.csv',index=False)
st=df[df.state!='Australia'].groupby('year')[['area_ha','prod_t_lint']].sum(); au=df[df.state=='Australia'].set_index('year')[['area_ha','prod_t_lint']]
print('state sum / national, min:',(st/au).min().round(3).to_dict())
out=df[df.state.isin(['New South Wales','Queensland'])&(df.flag!='f')&(df.area_ha>0)&(df.prod_t_lint>0)]
out[['state','year','season','flag','area_ha','prod_t_lint']].to_csv(D/'au_state_cotton.csv',index=False); print(out.groupby('state').year.agg(['min','max','count']))
