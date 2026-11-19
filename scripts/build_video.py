"""ENSO × cotton animation, 1950–2025 (plus the ongoing 2026 event on the ONI strip).
Each year: the observed Nov–Jan sea-surface temperature anomaly (NOAA ERSST v5, vs 1991–2020) and every mapped cotton
area as a dot coloured by its yield deviation from trend in the crop year that winter's ENSO state touches
(northern crops: the season ending that autumn; southern crops: the harvest the following autumn).
Usage: python scripts/build_video.py [--frames 1997,2010]  (stills only)  — otherwise writes media/*.mp4 and *.gif"""
import json, base64, sys, os, subprocess, numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import ROOT, PROC, GEO
for f in fm.findSystemFonts():
    if 'Inter' in f: fm.fontManager.addfont(f)
plt.rcParams['font.family']='Inter'
W,H,FPS=1280,720,30; DPI=100
D=json.load(open(PROC/'dashboard_data.json')); SST=json.load(open(PROC/'sst_fields.json')); WORLD=json.load(open(GEO/'world.json'))
BG='#0e1117'; INK='#e8eaf0'; INK2='#a8adbb'; INK3='#6b7180'; LAND='#252a35'; LANDSTUDY='#3a4152'
NORTH={'US','IN','CN','PK'}; SOUTH={'BR','AR','AU'}   # southern harvest year = winter year + 1
CC=[c for c in ['US','BR','IN','AR','CN','PK','AU'] if c in D['countries']]
def field(year):
    i=SST['years'].index(year) if year in SST['years'] else -1
    if i<0 or not SST['NDJ'][i]: return None
    a=np.frombuffer(base64.b64decode(SST['NDJ'][i]),dtype=np.int8).reshape(SST['nlat'],SST['nlon']).astype(float)
    a[a==-128]=np.nan; a/=10
    # grid lon0=1 step 4 (0..360) -> roll to -180..180
    lons=SST['lon0']+np.arange(SST['nlon'])*SST['dlon']; order=np.argsort(((lons+180)%360)-180)
    a=a[:,order]
    # fill land/missing cells from ocean neighbours so the coastline is drawn by the land layer, not by grid squares
    for _ in range(25):
        m=np.isnan(a)
        if not m.any(): break
        pad=np.pad(a,1,mode='wrap')[:, :]; nb=np.stack([np.roll(a,1,0),np.roll(a,-1,0),np.roll(a,1,1),np.roll(a,-1,1)])
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter('ignore'); fillv=np.nanmean(nb,axis=0)
        a[m]=fillv[m]
    return a
LON=np.sort(((SST['lon0']+np.arange(SST['nlon'])*SST['dlon']+180)%360)-180); LAT=SST['lat0']+np.arange(SST['nlat'])*SST['dlat']
# dots
dots=[]
for cc in CC:
    for r in D['countries'][cc]['regions']:
        dots.append(dict(cc=cc,lon=r['lon'],lat=r['lat'],a=float(r['areaMean']),y=dict(zip(r['years'],r['anom']))))
ON=np.array([d['lon'] for d in dots]); AT=np.array([d['lat'] for d in dots]); AREA=np.array([d['a'] for d in dots])
SIZE=np.clip(np.sqrt(AREA)/28,1.2,26)
def anoms(year):
    return np.array([d['y'].get(year+(1 if d['cc'] in SOUTH else 0),np.nan) for d in dots])
oni_t=np.array(D['oni']['t']); oni_v=np.array(D['oni']['v'])
EVENTS=D['events']
def event_for(year):
    # the event whose span covers Nov(year)–Jan(year+1)
    t=year+11/12
    best=None
    for e in EVENTS:
        if e['start_t']<=t+0.01 and e['end_t']>=t-0.01: best=e
    return best
sst_cmap=LinearSegmentedColormap.from_list('sst',['#2c6fb7','#6fa3d6','#1a1f2b','#e0795a','#c0392b'])
dot_cmap=LinearSegmentedColormap.from_list('dot',['#b8641d','#e3b26b','#d9dbe0','#7cc3a4','#1f8a70'])
def draw(year, nxt=None, f=0.0):
    fig=plt.figure(figsize=(W/DPI,H/DPI),dpi=DPI,facecolor=BG)
    ax=fig.add_axes([0.0,0.215,1.0,0.7]); ax.set_facecolor(BG); ax.set_xlim(-180,180); ax.set_ylim(-56,66); ax.set_aspect('auto'); ax.axis('off')
    A=field(year); 
    if nxt is not None and f>0:
        B=field(nxt)
        if A is not None and B is not None: A=(1-f)*A+f*B
    if A is not None:
        ax.imshow(np.ma.masked_invalid(A),extent=[LON[0]-2,LON[-1]+2,LAT[-1]-2,LAT[0]+2],origin='upper',cmap=sst_cmap,norm=TwoSlopeNorm(0,-3,3),interpolation='bilinear',alpha=0.95,zorder=1)
    for ft in WORLD['features']:
        g=ft['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        col=LANDSTUDY if ft.get('id') in CC else LAND
        for p in polys:
            r=np.array(p[0])
            if np.ptp(r[:,0])>300: continue   # polygons crossing the dateline would smear across the map
            ax.fill(r[:,0],r[:,1],color=col,lw=0.4,ec='#0e1117',zorder=2)
    # Nino 3.4 box
    ax.plot([-170,-120,-120,-170,-170],[-5,-5,5,5,-5],color=INK2,lw=0.8,ls=(0,(3,2)),zorder=3)
    ax.text(-145,7,'Niño 3.4',color=INK2,fontsize=8,ha='center',zorder=3)
    an=anoms(year)
    if nxt is not None and f>0:
        bn=anoms(nxt); an=np.where(np.isnan(an),bn,np.where(np.isnan(bn),an,(1-f)*an+f*bn))
    ok=~np.isnan(an)
    ax.scatter(ON[~ok],AT[~ok],s=SIZE[~ok],facecolors='none',edgecolors=INK3,linewidths=0.4,zorder=4)
    ax.scatter(ON[ok],AT[ok],s=SIZE[ok]*1.0,c=np.clip(an[ok],-40,40),cmap=dot_cmap,vmin=-40,vmax=40,edgecolors='#0e1117',linewidths=0.25,zorder=5)
    # country labels with this year's national deviation
    for cc in CC:
        c=D['countries'][cc]; n=c['national']; yy=year+(1 if cc in SOUTH else 0)
        v=dict(zip(n['years'],n['anom'])).get(yy)
        lon=np.mean([r['lon'] for r in c['regions']]); lat=np.mean([r['lat'] for r in c['regions']])
        off={'US':(0,10),'BR':(15,-3),'IN':(-13,-11),'AR':(-17,-5),'CN':(12,8),'PK':(-9,9),'AU':(18,-4)}[cc]
        txt=f"{c['name'].split(' ·')[0]}{' β' if c.get('exploratory') else ''}\n" + (f"{round(v):+d}%".replace('+0%','±0%').replace('-0%','±0%') if v is not None else '—')
        colr=INK if v is None else ('#e3b26b' if v<-5 else '#7cc3a4' if v>5 else INK)
        ax.text(lon+off[0],lat+off[1],txt,color=colr,fontsize=9.5,fontweight='bold',ha='center',va='center',zorder=6,linespacing=1.1,
                bbox=dict(boxstyle='round,pad=0.25',fc=BG,ec='none',alpha=0.6))
    # title
    yr=year if f<0.5 or nxt is None else nxt
    e=event_for(yr)
    fig.text(0.03,0.945,f"{yr}–{str(yr+1)[2:]}",color=INK,fontsize=30,fontweight='bold',va='center')
    lab='Neutral winter' if not e else f"{e['type']} · {e['intensity']}"+(' · ongoing' if e.get('ongoing') else '')
    col='#e0795a' if e and e['type']=='El Niño' else '#6fa3d6' if e else INK2
    fig.text(0.205,0.945,lab,color=col,fontsize=17,fontweight='bold',va='center')
    fig.text(0.97,0.957,'Cotton × ENSO Explorer',color=INK,fontsize=12,fontweight='bold',ha='right',va='center')
    fig.text(0.97,0.927,'Ocean: Nov–Jan sea-surface temperature anomaly (NOAA ERSST v5)\nDots: each mapped cotton area, yield vs its trend in the crop year that winter touches',color=INK3,fontsize=8,ha='right',va='center',linespacing=1.3)
    # legends
    lx=fig.add_axes([0.03,0.165,0.18,0.018]); lx.imshow(np.linspace(-40,40,200)[None,:],aspect='auto',cmap=dot_cmap,vmin=-40,vmax=40); lx.set_xticks([0,100,199]); lx.set_xticklabels(['−40%','trend','+40%'],color=INK2,fontsize=8); lx.set_yticks([]); [s.set_visible(False) for s in lx.spines.values()]; lx.tick_params(length=0,pad=2)
    fig.text(0.03,0.195,'Cotton yield vs trend',color=INK2,fontsize=8.5)
    sx=fig.add_axes([0.24,0.165,0.15,0.018]); sx.imshow(np.linspace(-3,3,200)[None,:],aspect='auto',cmap=sst_cmap,norm=TwoSlopeNorm(0,-3,3)); sx.set_xticks([0,100,199]); sx.set_xticklabels(['−3 °C','0','+3 °C'],color=INK2,fontsize=8); sx.set_yticks([]); [s.set_visible(False) for s in sx.spines.values()]; sx.tick_params(length=0,pad=2)
    fig.text(0.24,0.195,'Sea-surface temperature anomaly',color=INK2,fontsize=8.5)
    fig.text(0.42,0.18,'Dot size = cotton area · hollow = no data that year · β = exploratory · southern-hemisphere dots show the following harvest',color=INK3,fontsize=8,va='center')
    # ONI strip
    ox=fig.add_axes([0.03,0.035,0.94,0.1]); ox.set_facecolor(BG)
    ox.fill_between(oni_t,0,oni_v,where=oni_v>=0,color='#e0795a',lw=0,alpha=0.85); ox.fill_between(oni_t,0,oni_v,where=oni_v<0,color='#6fa3d6',lw=0,alpha=0.85)
    ox.axhline(0.5,color=INK3,lw=0.5,ls=':'); ox.axhline(-0.5,color=INK3,lw=0.5,ls=':')
    tcur=yr+11/12 if f==0 or nxt is None else year+11/12+f
    ox.axvline(tcur,color=INK,lw=1.5); ox.set_xlim(1950,oni_t.max()+0.3); ox.set_ylim(-2.4,2.9)
    for s in ox.spines.values(): s.set_visible(False)
    ox.set_yticks([]); ox.set_xticks(range(1950,2030,10)); ox.tick_params(colors=INK3,labelsize=8,length=0)
    ox.text(1950.3,2.5,'Oceanic Niño Index (NOAA CPC)',color=INK2,fontsize=8,va='top')
    fig.canvas.draw(); buf=np.asarray(fig.canvas.buffer_rgba())[:,:,:3].copy(); plt.close(fig); return buf
years=[y for y in SST['years'] if y<=2025]
if '--frames' in sys.argv:
    from PIL import Image
    for y in map(int,sys.argv[sys.argv.index('--frames')+1].split(',')):
        Image.fromarray(draw(y)).save(f'/home/claude/shots/video_{y}.jpg',quality=92); print('still',y)
    sys.exit()
HOLD=14; MOVE=6   # frames per year: hold then crossfade into the next
tmp=str(ROOT/'media'/'_tmp_enso_cotton.mp4'); out=str(ROOT/'media'/'enso_cotton_1950_2025.mp4')
p=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',tmp],stdin=subprocess.PIPE)
for i,y in enumerate(years):
    fr=draw(y).tobytes()
    for _ in range(HOLD if i<len(years)-1 else 60): p.stdin.write(fr)
    if i<len(years)-1:
        for k in range(1,MOVE+1): p.stdin.write(draw(y,years[i+1],k/(MOVE+1)).tobytes())
    if y%10==0: print('year',y,flush=True)
p.stdin.close(); rc=p.wait()
if rc==0: os.replace(tmp,out); print('wrote',out,os.path.getsize(out))
# GIF: one frame per year, 640 px
gif=str(ROOT/'media'/'enso_cotton_1950_2025.gif')
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out,'-vf',f'select=not(mod(n\\,{HOLD+MOVE})),setpts=N/(2*TB),scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4','-r','2',gif],check=True)
print('wrote',gif,os.path.getsize(gif))
