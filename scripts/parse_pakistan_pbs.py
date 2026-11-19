import pdfplumber, re, pandas as pd, sys
NAMES={133:('Punjab',['Attock','Rawalpindi','Islamabad','Jhelum','Chakwal','Sargodha','Khushab','Mianwali','Bhakkar']),
134:('Punjab',['Faisalabad','Toba Tek Singh','Jhang','Gujrat','Mandi Bahauddin','Sialkot','Narowal','Gujranwala','Hafizabad']),
135:('Punjab',['Sheikhupura','Nankana Sahib','Lahore','Kasur','Okara','Sahiwal','Pakpattan','Multan','Lodhran']),
136:('Punjab',['Khanewal','Vehari','Muzaffargarh','Layyah','Dera Ghazi Khan','Rajanpur','Bahawalpur','Rahim Yar Khan','Bahawalnagar']),
137:('Sindh',['Khairpur','Ghotki','Sukkur','Naushahro Feroze','Nawabshah','Jacobabad','Kashmore','Shikarpur']),
138:('Sindh',['Larkana','Kambar Shahdadkot','Sanghar','Tharparkar','Mirpur Khas','Umerkot','Dadu','Jamshoro']),
139:('Sindh',['Hyderabad','Matiari','Tando Allahyar','Tando Muhammad Khan','Badin','Thatta','Karachi']),
140:('Khyber Pakhtunkhwa',['Peshawar','Charsadda','Nowshera','Mardan','Swabi','Kohat','Hangu','Karak','Mansehra']),
141:('Khyber Pakhtunkhwa',['Battagram','Abbottabad','Haripur','Kohistan','Malakand','Swat','Bunir','Shangla','Dir Lower']),
142:('Khyber Pakhtunkhwa',['Dir Upper','Chitral','Dera Ismail Khan','Tank','Bannu','Lakki Marwat','Mohmand Agency','Khyber','Kurram']),
143:('Khyber Pakhtunkhwa',['Orakzai','Bajour','North Waziristan','South Waziristan','FR Peshawar','FR Kohat','FR Bannu','FR Dera Ismail Khan']),
144:('Balochistan',['Quetta','Pishin','Killa Abdullah','Chagai','Loralai','Musa Khail','Barkhan','Zhob','Killa Saifullah']),
145:('Balochistan',['Sibi','Ziarat','Kohlu','Kachhi','Dera Bugti','Nasirabad','Jafferabad','Jhal Magsi?','Bolan']),
146:('Balochistan',['Mastung','Khuzdar','Awaran','Kharan','Lasbela','Turbat','Panjgoor','Gwadar','Jhal Magsi','Kalat'])}
NAMES[145]=('Balochistan',['Sibi','Ziarat','Kohlu','Kachhi','Dera Bugti','Nasirabad','Jafferabad','Tamboo','Bolan'])
p=pdfplumber.open(sys.argv[1]); rows=[]
for pg,(prov,names) in NAMES.items():
    L=p.pages[pg-1].extract_text().split('\n'); part='area'
    for l in L:
        if 'Production' in l: part='prod'
        m=re.match(r'^(\d{4})-(\d{2})\s+(.*)$',l)
        if not m: continue
        vals=[float(x) if re.match(r'^-?[0-9.]+$',x) else float('nan') for x in m.group(3).split()]
        assert len(vals)==len(names),(pg,l)
        y=int(m.group(1))
        for n,v in zip(names,vals): rows.append((prov,n,y,part,v))
df=pd.DataFrame(rows,columns=['province','district','year','what','value']).pivot_table(index=['province','district','year'],columns='what',values='value').reset_index()
df=df.rename(columns={'area':'area_000ha','prod':'prod_000bales'})
df.to_csv(sys.argv[2],index=False); print(df.shape, df.year.min(), df.year.max())
g=df.groupby('year')[['area_000ha','prod_000bales']].sum(); g['yield_kg_ha']=g.prod_000bales*170/g.area_000ha; print(g.iloc[[0,9,19,27]])
