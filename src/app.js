const DATA = JSON.parse(document.getElementById('DATA').textContent);
const GEO = JSON.parse(document.getElementById('GEO').textContent);
const META = { US:{flag:'🇺🇸', name:'United States'}, BR:{flag:'🇧🇷', name:'Brazil'}, IN:{flag:'🇮🇳', name:'India'}, AR:{flag:'🇦🇷', name:'Argentina'} };
const ORDER = ['US','BR','IN','AR'];
const TABS = ['findings','map','area','events','compare','data','sources'];
const S = { cc:'US', a1:null, sel:null, metric:'yield', mapStyle:'choro', showLevel:'region', minYear:0, event:null, minInt:'weak', hemPhase:'La Niña', tab:'findings', trendView:'yield', rankPhase:'La Niña', pins:[], sort:{col:'year',dir:-1}, weight:'year', mask:true, zoom:null };
const INT_RANK={weak:0,moderate:1,strong:2,'very strong':3};
const passes=p=> !p.event || INT_RANK[p.intensity]>=INT_RANK[S.minInt];
const eventPasses=e=> INT_RANK[e.intensity]>=INT_RANK[S.minInt];
const fmt1=d3.format('+.1f'), fmt0=d3.format(','), fmtP=d3.format('.1f');
const tip=document.getElementById('tip');
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const PH={'El Niño':'nino','La Niña':'nina','Neutral':'neu','Weak event':'neu'};
const phColor=p=> p==='El Niño'?css('--nino'):p==='La Niña'?css('--nina'):css('--neutral');
const short=p=> p==='El Niño'?'EN':p==='La Niña'?'LN':'Neu';
const baseCC=cc=> DATA.countries[cc].variantOf||cc;
const norm=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const UNITS=()=>S.weight==='event'?'events':'years';
const CI_HELP='90% confidence range from 400 bootstrap resamples of the phase years and the neutral years. Confident = the range excludes zero.';

// ---------- stats helpers
function mean(a){ return a.length? a.reduce((s,x)=>s+x,0)/a.length : NaN; }
function variance(a){ const m=mean(a); return a.length>1? a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1) : NaN; }
function lgamma(x){ const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5]; let y=x,t=x+5.5; t-=(x+0.5)*Math.log(t); let s=1.000000000190015; for(let j=0;j<6;j++) s+=c[j]/++y; return -t+Math.log(2.5066282746310005*s/x); }
function betacf(a,b,x){ const MAXIT=200,EPS=3e-12,FPMIN=1e-300; let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap; if(Math.abs(d)<FPMIN)d=FPMIN; d=1/d; let h=d; for(let m=1;m<=MAXIT;m++){ const m2=2*m; let aa=m*(b-m)*x/((qam+m2)*(a+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; h*=d*c; aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN)d=FPMIN; c=1+aa/c; if(Math.abs(c)<FPMIN)c=FPMIN; d=1/d; const del=d*c; h*=del; if(Math.abs(del-1)<EPS)break; } return h; }
function ibeta(a,b,x){ if(x<=0)return 0; if(x>=1)return 1; const bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x)); return x<(a+1)/(a+b+2)? bt*betacf(a,b,x)/a : 1-bt*betacf(b,a,1-x)/b; }
function tPvalue(t,df){ if(!isFinite(t)||!isFinite(df)||df<=0) return NaN; return ibeta(df/2,0.5,df/(df+t*t)); }
function welch(a,b){ if(a.length<2||b.length<2) return {t:NaN,p:NaN}; const va=variance(a)/a.length, vb=variance(b)/b.length; const t=(mean(a)-mean(b))/Math.sqrt(va+vb); const df=(va+vb)**2/((va*va)/(a.length-1)+(vb*vb)/(b.length-1)); return {t,p:tPvalue(t,df)}; }
function ols(xs,ys){ const n=xs.length; if(n<3) return null; const mx=mean(xs),my=mean(ys); let sxy=0,sxx=0,syy=0; for(let i=0;i<n;i++){ sxy+=(xs[i]-mx)*(ys[i]-my); sxx+=(xs[i]-mx)**2; syy+=(ys[i]-my)**2; } if(!sxx) return null; const b=sxy/sxx,a=my-b*mx; const r2=syy?(sxy*sxy)/(sxx*syy):0; const resid=ys.map((y,i)=>y-(a+b*xs[i])); const se=Math.sqrt(resid.reduce((s,e)=>s+e*e,0)/(n-2)/sxx); return {a,b,r2,n,se,x0:d3.min(xs),x1:d3.max(xs)}; }



// ---------- data access
const country=(cc=S.cc)=>DATA.countries[cc];
function listFor(level,cc=S.cc){ const c=country(cc); return level==='region'?c.regions: level==='admin1'?c.admin1:[c.national]; }
function admin1Of(name,cc=S.cc){ return country(cc).admin1.find(a=>a.name===name)||null; }
function regionOf(id,cc=S.cc){ return country(cc).regions.find(r=>r.id===id)||null; }
function cur(){ const c=country(); if(S.sel){ const r=regionOf(S.sel); if(r){ S.a1=r.admin1; return {r,level:'region'}; } S.sel=null; } if(S.a1){ const a=admin1Of(S.a1); if(a) return {r:a,level:'admin1'}; S.a1=null; } return {r:c.national,level:'national'}; }
function findAny(id,cc){ if(id==='NAT'||!id) return {r:country(cc).national,level:'national'}; const r=regionOf(id,cc); if(r) return {r,level:'region'}; const a=country(cc).admin1.find(a=>a.id===id||a.name===id); if(a) return {r:a,level:'admin1'}; return null; }
function seriesOf(r,cc=S.cc){ const ph=country(cc).phases; const out=[]; for(let i=0;i<r.years.length;i++){ const y=r.years[i]; if(y<S.minYear) continue; const p=ph[y]||{phase:'Neutral',oni:null}; const ok=passes(p); out.push({year:y,yield:r.yield_[i],trend:r.trend[i],anom:r.anom[i],area:r.area?r.area[i]:null,phase:ok?p.phase:'Weak event',rawPhase:p.phase,oni:p.oni,event:p.event,intensity:p.intensity,excluded:!ok}); } return out; }
function eventYears(evId,cc=S.cc){ const ph=country(cc).phases; return Object.keys(ph).map(Number).filter(y=>ph[y].event===evId).sort((a,b)=>a-b); }
function anomAt(r,y){ const i=r.years.indexOf(y); return i>=0?r.anom[i]:null; }
function bootCI(a,b,B=400){ if(a.length<3||b.length<3) return null; let seed=12345+a.length*7+b.length; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const out=new Float64Array(B); for(let i=0;i<B;i++){ let sa=0,sb=0; for(let j=0;j<a.length;j++) sa+=a[Math.floor(rnd()*a.length)]; for(let j=0;j<b.length;j++) sb+=b[Math.floor(rnd()*b.length)]; out[i]=sa/a.length-sb/b.length; } out.sort(); return [out[Math.floor(B*0.05)],out[Math.floor(B*0.95)]]; }
const statCache=new Map(); function cacheKey(){ return [S.minYear,S.minInt,S.weight].join('|'); }
function statsFor(r,cc=S.cc){ const ck=cacheKey()+'|'+cc+'|'+r.id; if(statCache.has(ck)) return statCache.get(ck); const res=statsForRaw(r,cc); statCache.set(ck,res); return res; }
function statsForRaw(r,cc=S.cc){
  const s=seriesOf(r,cc); const byPhase={'Neutral':[],'El Niño':[],'La Niña':[],'Weak event':[]}; s.forEach(d=>byPhase[d.phase].push(d));
  const neu=byPhase['Neutral'].map(d=>d.anom);
  const out={ n:s.length, nExcluded:byPhase['Weak event'].length, neutral:{n:neu.length,mean:mean(neu),yieldMean:mean(byPhase['Neutral'].map(d=>d.yield)),sd:Math.sqrt(variance(neu))}, yieldMean:mean(s.map(d=>d.yield)), series:s, years:s.length?[s[0].year,s[s.length-1].year]:null };
  for(const p of ['El Niño','La Niña']){ let a=byPhase[p].map(d=>d.anom); const evSet=new Set(byPhase[p].map(d=>d.event).filter(Boolean)); let nUnits=a.length;
    if(S.weight==='event'){ const byEv=d3.group(byPhase[p].filter(d=>d.event),d=>d.event); a=[...byEv.values()].map(g=>mean(g.map(d=>d.anom))); nUnits=a.length; }
    const ci=bootCI(a,neu);
    out[p]={n:byPhase[p].length,nEvents:evSet.size,nUnits,mean:mean(a),sd:Math.sqrt(variance(a)),diff:mean(a)-mean(neu),ci,sig:ci?(ci[0]>0||ci[1]<0):false,below:a.filter(x=>x<0).length,years:byPhase[p].map(d=>d.year),yieldMean:mean(byPhase[p].map(d=>d.yield)),worst:byPhase[p].length?byPhase[p].reduce((m,d)=>d.anom<m.anom?d:m):null,best:byPhase[p].length?byPhase[p].reduce((m,d)=>d.anom>m.anom?d:m):null};
    const prof=[]; for(const ev of evSet){ const ys=eventYears(ev,cc).filter(y=>y>=S.minYear); if(!ys.length) continue; const f=ys[0],l=ys[ys.length-1]; const g={ev,lags:{}}; g.lags[-2]=anomAt(r,f-2); g.lags[-1]=anomAt(r,f-1); g.lags[0]=mean(ys.map(y=>anomAt(r,y)).filter(x=>x!=null)); g.lags[1]=anomAt(r,l+1); g.lags[2]=anomAt(r,l+2); if(isNaN(g.lags[0])) continue; prof.push(g); }
    out[p].profile=prof; out[p].lagMean={}; for(const k of [-2,-1,0,1,2]){ const v=prof.map(g=>g.lags[k]).filter(x=>x!=null&&!isNaN(x)); out[p].lagMean[k]={mean:mean(v),n:v.length}; }
  }
  return out;
}
const sigTag=o=> !o.ci?'' : o.sig?`<span class="sig strong" title="${CI_HELP}">${fmt1(o.ci[0])} to ${fmt1(o.ci[1])}% · confident</span>` : `<span class="sig" title="${CI_HELP}">${fmt1(o.ci[0])} to ${fmt1(o.ci[1])}% · uncertain</span>`;

// ---------- ui helpers
function showTip(html,ev){ tip.innerHTML=html; tip.style.opacity=1; const x=ev.clientX+14,y=ev.clientY+14,w=tip.offsetWidth,h=tip.offsetHeight; tip.style.left=(x+w>innerWidth-10?ev.clientX-w-14:x)+'px'; tip.style.top=(y+h>innerHeight-10?ev.clientY-h-14:y)+'px'; }
function hideTip(){ tip.style.opacity=0; }
let toastT; function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }
function axisY(svg,y,m,W,fmt){ svg.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(fmt)).call(g=>g.selectAll('line').attr('class','grid-line')).call(g=>g.select('.domain').remove()); }
function fx(v){ return (v>=0?'+':'')+v.toFixed(1)+'%'; }

// ---------- header / crumbs / settings
function renderTabs(){
  const el=document.getElementById('countryTabs'); el.innerHTML='';
  for(const cc of ORDER){ if(!DATA.countries[cc]) continue; const b=document.createElement('button'); b.innerHTML=`<span class="flag">${META[cc].flag}</span>${META[cc].name}`; if(cc===baseCC(S.cc)) b.classList.add('active'); b.onclick=()=>{ if(baseCC(S.cc)===cc) return; S.cc=cc; S.sel=null; S.a1=null; S.zoom=null; renderAll(); }; el.appendChild(b); }
  const base=country(baseCC(S.cc)); const pr=document.getElementById('practiceRow'); const vs=document.getElementById('varSeg');
  if(base.variants){ pr.style.display='flex'; vs.innerHTML=base.variants.map(([k,l])=>`<button data-v="${k}" class="${S.cc===k?'active':''}">${l}</button>`).join(''); vs.onclick=ev=>{ const b=ev.target.closest('button'); if(!b) return; S.cc=b.dataset.v; if(S.sel&&!regionOf(S.sel)) S.sel=null; if(S.a1&&!admin1Of(S.a1)) S.a1=null; renderAll(); }; } else pr.style.display='none';
  document.getElementById('settingsSummary').textContent=`${S.minYear?S.minYear+'→':'All years'} · ${S.minInt==='weak'?'all events':S.minInt+' events'}${S.weight==='event'?' · per event':''}${country().variantOf?' · '+country().name.split('· ')[1]:''}`;
}
function renderCrumbs(){
  const c=country(); const f=cur(); const e=S.event?DATA.events.find(x=>x.id===S.event):null; const pinned=S.pins.some(p=>p.cc===S.cc&&p.id===f.r.id);
  let h=`<span class="cty"><button onclick="goLevel('national')" ${f.level==='national'?'style="color:var(--ink)"':''}>${META[baseCC(S.cc)].flag} ${c.name}</button>`;
  if(S.a1){ h+=`<span class="sep">›</span><button onclick="goLevel('admin1')" ${f.level==='admin1'?'style="color:var(--ink)"':''}>${S.a1}</button>`; }
  if(f.level==='region'){ h+=`<span class="sep">›</span><b>${f.r.name}</b>`; }
  h+=`<span class="muted" style="font-size:12px;margin-left:4px">${f.level==='national'?'whole country':f.level==='admin1'?'state · click the map to open a '+c.level.toLowerCase():c.level}</span>`;
  h+=`</span>`; if(document.body.classList.contains('global')) h+=`<span class="muted" style="font-size:12.5px">Showing all four countries together${S.tab==='compare'?' · pin places from Explore to compare them here':''}</span>`;
  h+=`<span class="right">${e?`<span class="chip">${e.type} ${e.label} <span class="muted">${e.intensity}</span> <button class="btn ghost sm" onclick="S.event=null;renderAll()" title="Clear event">×</button></span>`:''}<button class="btn sm cty" onclick="togglePin()">${pinned?'📌 Pinned':'📌 Pin'}</button><button class="btn sm" onclick="copyLink()">🔗 Link</button></span>`;
  document.getElementById('crumbs').innerHTML=h;
}
window.goLevel=function(l){ if(l==='national'){ S.a1=null; S.sel=null; S.zoom=null; } else if(l==='admin1'){ S.sel=null; } if(S.tab!=='map'&&S.tab!=='area'&&S.tab!=='data') S.tab='map'; renderAll(); };
window.togglePin=function(){ const f=cur(); const key={cc:S.cc,id:f.r.id}; const i=S.pins.findIndex(p=>p.cc===key.cc&&p.id===key.id); if(i>=0) S.pins.splice(i,1); else { if(S.pins.length>=4){ toast('Up to four pins — remove one first'); return; } S.pins.push(key); toast(`Pinned ${f.r.name} (${S.pins.length}/4)`); } renderCrumbs(); if(S.tab==='compare') renderCompare(); if(S.tab==='map') renderSelection(); };
window.copyLink=function(){ const u=location.href.split('#')[0]+'#'+hashState(); (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Link copied')).catch(()=>toast('Copy failed — use the address bar')); };

// ---------- hash  (#US-map-r48165-LN2010-moderate-all)
function hashState(){ const f=cur(); const sid=f.level==='national'?'n':f.level==='admin1'?('a'+country().admin1.indexOf(f.r)):('r'+f.r.id); return [S.cc,S.tab,sid,S.event||'x',S.minInt.replace(' ',''),S.minYear||'all',S.weight].join('-'); }
function applyHash(){ const h=location.hash.replace('#',''); if(!h) return false; const p=h.split('-'); if(p.length<3||!DATA.countries[p[0]]) return false; S.cc=p[0]; if(TABS.includes(p[1])) S.tab=p[1]; const sid=p[2]; S.sel=null; S.a1=null; if(sid[0]==='a'){ const a=country().admin1[+sid.slice(1)]; if(a) S.a1=a.name; } else if(sid[0]==='r'){ S.sel=sid.slice(1); } if(p[3]&&p[3]!=='x'&&DATA.events.some(e=>e.id===p[3])) S.event=p[3]; if(['weak','moderate','strong'].includes(p[4])) S.minInt=p[4]; if(p[5]&&p[5]!=='all') S.minYear=+p[5]; if(p[6]==='event') S.weight='event'; return true; }
function writeHash(){ try{ history.replaceState(null,'','#'+hashState()); }catch(e){} }

// ---------- KPIs
function renderKPIs(){
  const evs=DATA.events.filter(e=>e.endYear>=Math.max(1950,S.minYear)); const en=evs.filter(e=>e.type==='El Niño'), ln=evs.filter(e=>e.type==='La Niña');
  const by=arr=>['weak','moderate','strong','very strong'].map(k=>[k,arr.filter(e=>e.intensity===k).length]).filter(x=>x[1]).map(x=>x[1]+' '+x[0]).join(' · ');
  const g=arr=>{ const v=arr.map(e=>e.gapFromPrevSame).filter(x=>x!=null); return v.length?mean(v):NaN; };
  const last=DATA.oni.v.length-1, lv=DATA.oni.v[last]; const state=lv>=0.5?'El Niño conditions':lv<=-0.5?'La Niña conditions':'Neutral';
  const tiles=[{h:'Record',v:`${Math.max(1950,S.minYear)}–${DATA.oni.year[last]}`,s:'NOAA Oceanic Niño Index'},{h:'El Niño events',v:en.length,s:by(en),cls:'nino'},{h:'La Niña events',v:ln.length,s:by(ln),cls:'nina'},{h:'Typical gap',v:`${g(en).toFixed(1)} / ${g(ln).toFixed(1)}<small>yrs</small>`,s:'El Niño / La Niña, onset to onset'},{h:'Latest ONI',v:`${lv>0?'+':''}${lv.toFixed(2)}<small>°C</small>`,s:`${state} · ${DATA.oni.season[last]} ${DATA.oni.year[last]}`}];
  document.getElementById('kpis').innerHTML=tiles.map(t=>`<div class="card kpi"><h3>${t.h}</h3><div class="v" ${t.cls?`style="color:var(--${t.cls})"`:''}>${t.v}</div><div class="sub">${t.s}</div></div>`).join('');
}

// ---------- ONI timeline
function renderONI(){
  const host=document.getElementById('oniChart'); host.innerHTML=''; const W=host.clientWidth||1000,H=190,m={t:14,r:12,b:24,l:34};
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`); const t=DATA.oni.t,v=DATA.oni.v;
  const x=d3.scaleLinear().domain([t[0],t[t.length-1]+1/12]).range([m.l,W-m.r]); const y=d3.scaleLinear().domain([-2.4,2.9]).range([H-m.b,m.t]);
  svg.append('g').selectAll('rect.ev').data(DATA.events).enter().append('rect').attr('x',d=>x(d.start_t)).attr('width',d=>Math.max(2,x(d.end_t+1/12)-x(d.start_t))).attr('y',m.t).attr('height',H-m.b-m.t).attr('fill',d=>d.type==='El Niño'?css('--nino'):css('--nina')).attr('opacity',d=>S.event===d.id?0.32:eventPasses(d)?0.11:0.05).style('cursor','pointer')
    .on('mousemove',(ev,d)=>showTip(`<b>${d.type} ${d.label}</b> · ${d.intensity}<br><span class="mut">Peak ${d.peak>0?'+':''}${d.peak} °C (${d.peakSeason} ${d.peakYear}) · ${d.durationSeasons} seasons · ${d.startSeason} ${d.startYear} → ${d.endSeason} ${d.endYear}</span>`,ev)).on('mouseleave',hideTip).on('click',(ev,d)=>focusEvent(d));
  if(S.minYear>t[0]) svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',x(S.minYear)-m.l).attr('height',H-m.b-m.t).attr('fill',css('--bg')).attr('opacity',.55);
  [-2,-1,0,1,2].forEach(k=>svg.append('line').attr('class','grid-line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(k)).attr('y2',y(k)));
  [0.5,-0.5].forEach(k=>svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(k)).attr('y2',y(k)).attr('stroke',k>0?css('--nino'):css('--nina')).attr('stroke-dasharray','3 3').attr('opacity',.5));
  const bw=Math.max(1,(x(t[1])-x(t[0]))*0.95);
  svg.append('g').selectAll('rect.b').data(t.map((tt,i)=>({t:tt,v:v[i]}))).enter().append('rect').attr('x',d=>x(d.t)).attr('width',bw).attr('y',d=>d.v>=0?y(d.v):y(0)).attr('height',d=>Math.abs(y(d.v)-y(0))).attr('fill',d=>d.v>=0.5?css('--nino'):d.v<=-0.5?css('--nina'):css('--neutral')).attr('opacity',d=>Math.abs(d.v)>=0.5?0.95:0.6);
  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.b-m.t).attr('fill','transparent').style('cursor','pointer').on('click',ev=>{ const [mx]=d3.pointer(ev); jumpGlobe(x.invert(mx)); }).on('mousemove',ev=>{ const [mx]=d3.pointer(ev); const j=Math.max(0,Math.min(t.length-1,d3.bisector(d=>d).left(t,x.invert(mx)))); showTip(`<b>${DATA.oni.season[j]} ${DATA.oni.year[j]}</b><br>ONI ${v[j]>0?'+':''}${v[j].toFixed(2)} °C`,ev); }).on('mouseleave',hideTip).lower();
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(Math.min(16,Math.floor(W/70))).tickFormat(d3.format('d')).tickSize(3));
  svg.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([-2,-1,0,1,2]).tickFormat(d=>(d>0?'+':'')+d).tickSize(3));
  svg.append('text').attr('x',W-m.r).attr('y',m.t+10).attr('text-anchor','end').attr('fill',css('--nino')).style('font-size','11px').style('font-weight',600).text('El Niño ≥ +0.5');
  svg.append('text').attr('x',W-m.r).attr('y',H-m.b-6).attr('text-anchor','end').attr('fill',css('--nina')).style('font-size','11px').style('font-weight',600).text('La Niña ≤ −0.5');
  const ph=svg.append('g').attr('pointer-events','none'); G.oni={x,ph,top:m.t,bot:H-m.b};
  ph.append('rect').attr('class','ph-band').attr('y',m.t).attr('height',H-m.b-m.t).attr('fill',css('--accent')).attr('opacity',.14);
  ph.append('line').attr('class','ph-line').attr('y1',m.t-6).attr('y2',H-m.b).attr('stroke',css('--accent')).attr('stroke-width',2);
  ph.append('circle').attr('class','ph-dot').attr('r',4.5).attr('fill',css('--accent')).attr('stroke',css('--bg')).attr('stroke-width',2);
  ph.append('text').attr('class','ph-lab').attr('y',m.t-8).attr('text-anchor','middle').style('font-size','11px').style('font-weight',800).attr('fill',css('--accent')).attr('stroke',css('--bg')).attr('stroke-width',3).attr('paint-order','stroke');
  G.oni.y=y; if(G.year&&G.years) movePlayhead();
}
function renderEventsStrip(){
  for(const id of ['eventsStrip','eventsStrip2']){ const el=document.getElementById(id); if(!el) continue; el.innerHTML='';
    for(const e of DATA.events.filter(e=>e.endYear>=Math.max(S.minYear-1,1950))){ const b=document.createElement('button'); b.dataset.id=e.id; b.className=(e.type==='El Niño'?'nino':'nina')+(S.event===e.id?' active':''); if(!eventPasses(e)) b.style.opacity=.45; b.innerHTML=`<span class="dot" style="background:${e.type==='El Niño'?'var(--nino)':'var(--nina)'}"></span>${e.label}<span class="int">${e.intensity}</span>`; b.onclick=()=>focusEvent(e); el.appendChild(b); } }
}


// ---------- cadence
function renderCadence(){
  const evs=DATA.events, en=evs.filter(e=>e.type==='El Niño'), ln=evs.filter(e=>e.type==='La Niña'); const gaps=t=>t.map(e=>e.gapFromPrevSame).filter(x=>x!=null);
  document.getElementById('cadenceStats').innerHTML=[['El Niño events since 1950',en.length,`every ${mean(gaps(en)).toFixed(1)} yrs on average · gaps ${d3.min(gaps(en))}–${d3.max(gaps(en))} yrs`],['La Niña events since 1950',ln.length,`every ${mean(gaps(ln)).toFixed(1)} yrs · gaps ${d3.min(gaps(ln))}–${d3.max(gaps(ln))} yrs`],['Typical length',`≈${(mean(evs.map(e=>e.durationSeasons))+2).toFixed(0)} months`,`longest ${d3.max(evs,e=>e.durationSeasons)+2} months`],['Strong or stronger',evs.filter(e=>/strong/.test(e.intensity)).length,`of ${evs.length} events`]].map(([h,v,s])=>`<div>${h}<b>${v}</b>${s}</div>`).join('');
  const host=document.getElementById('gapChart'); host.innerHTML=''; const W=host.clientWidth||400,H=120,m={t:10,r:14,b:24,l:70};
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`); const x=d3.scaleLinear().domain([0,d3.max(evs,e=>e.gapFromPrevSame||0)+1]).nice().range([m.l,W-m.r]);
  [['El Niño',en,css('--nino')],['La Niña',ln,css('--nina')]].forEach(([name,arr,col],i)=>{ const cy=m.t+22+i*44; svg.append('text').attr('x',m.l-8).attr('y',cy+4).attr('text-anchor','end').attr('fill',col).style('font-size','12px').style('font-weight',600).text(name); svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',cy).attr('y2',cy).attr('class','grid-line'); const mu=mean(gaps(arr)); svg.append('line').attr('x1',x(mu)).attr('x2',x(mu)).attr('y1',cy-16).attr('y2',cy+16).attr('stroke',col).attr('stroke-width',2).attr('opacity',.8); svg.append('text').attr('x',x(mu)).attr('y',cy-19).attr('text-anchor','middle').attr('fill',col).style('font-size','10.5px').text(`mean ${mu.toFixed(1)}`); svg.selectAll(null).data(arr.filter(e=>e.gapFromPrevSame!=null)).enter().append('circle').attr('cx',e=>x(e.gapFromPrevSame)).attr('cy',(e,j)=>cy+((j%3)-1)*7).attr('r',5).attr('fill',col).attr('opacity',.85).attr('stroke',css('--panel')).attr('stroke-width',1.5).on('mousemove',(ev,e)=>showTip(`<b>${e.type} ${e.label}</b><br><span class="mut">${e.gapFromPrevSame} yrs after the previous ${e.type}</span>`,ev)).on('mouseleave',hideTip); });
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(8).tickSize(3)); svg.append('text').attr('x',W-m.r).attr('y',H-4).attr('text-anchor','end').attr('fill',css('--ink-3')).style('font-size','10.5px').text('years');
  const h2=document.getElementById('durChart'); h2.innerHTML=''; const W2=h2.clientWidth||400,H2=120,m2={t:10,r:14,b:24,l:34}; const s2=d3.select(h2).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W2} ${H2}`);
  const x2=d3.scaleLinear().domain([4,d3.max(evs,e=>e.durationSeasons)+1]).range([m2.l,W2-m2.r]); const y2=d3.scaleLinear().domain([0.5,2.7]).range([H2-m2.b,m2.t]); [1,1.5,2].forEach(k=>s2.append('line').attr('class','grid-line').attr('x1',m2.l).attr('x2',W2-m2.r).attr('y1',y2(k)).attr('y2',y2(k)));
  s2.selectAll('circle').data(evs).enter().append('circle').attr('cx',e=>x2(e.durationSeasons)).attr('cy',e=>y2(Math.abs(e.peak))).attr('r',e=>S.event===e.id?8:5.5).attr('fill',e=>e.type==='El Niño'?css('--nino'):css('--nina')).attr('opacity',e=>eventPasses(e)?.85:.3).attr('stroke',css('--panel')).attr('stroke-width',1.5).style('cursor','pointer').on('mousemove',(ev,e)=>showTip(`<b>${e.type} ${e.label}</b> · ${e.intensity}<br><span class="mut">${e.durationSeasons} seasons · peak ${Math.abs(e.peak)} °C</span>`,ev)).on('mouseleave',hideTip).on('click',(ev,e)=>{ S.event=e.id; setTab('events'); });
  s2.append('g').attr('class','axis').attr('transform',`translate(0,${H2-m2.b})`).call(d3.axisBottom(x2).ticks(8).tickSize(3)); s2.append('g').attr('class','axis').attr('transform',`translate(${m2.l},0)`).call(d3.axisLeft(y2).tickValues([0.5,1,1.5,2,2.5]).tickSize(3)); s2.append('text').attr('x',W2-m2.r).attr('y',H2-4).attr('text-anchor','end').attr('fill',css('--ink-3')).style('font-size','10.5px').text('seasons');
}
function renderPhaseStrip(){
  const host=document.getElementById('phaseStrip'); host.innerHTML=''; const ccs=ORDER.filter(cc=>DATA.countries[cc]); const y0=Math.max(1950,S.minYear), y1=2025; const yrs=d3.range(y0,y1+1);
  const W=host.clientWidth||900, L=150, rowH=26, gap=8, H=ccs.length*(rowH+gap)+26; const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleBand().domain(yrs).range([L,W-6]).padding(.12);
  ccs.forEach((cc,i)=>{ const c=DATA.countries[cc]; const yy=i*(rowH+gap);
    svg.append('text').attr('x',0).attr('y',yy+11).style('font-size','12px').style('font-weight',600).attr('fill',css('--ink')).text(`${META[cc].flag} ${META[cc].name}`);
    svg.append('text').attr('x',0).attr('y',yy+24).style('font-size','10px').attr('fill',css('--ink-3')).text('window '+c.window.replace(/\s*\(.*?\)/g,'').replace(' of crop year','').replace(' of harvest year',''));
    svg.append('g').selectAll('rect').data(yrs.filter(y=>c.phases[y])).enter().append('rect').attr('x',y=>x(y)).attr('y',yy).attr('width',x.bandwidth()).attr('height',rowH).attr('rx',2)
      .attr('fill',y=>phColor(c.phases[y].phase)).attr('opacity',y=>!passes(c.phases[y])?0.18:c.phases[y].phase==='Neutral'?0.35:0.3+Math.min(0.7,Math.abs(c.phases[y].oni)/2))
      .on('mousemove',(ev,y)=>{ const p=c.phases[y]; showTip(`<b>${META[cc].flag} ${c.name} · crop year ${y}</b><br>${p.phase}${p.intensity?' ('+p.intensity+')':''}<br><span class="mut">Window ${c.window.replace(/\s*\(.*?\)/g,'')} · mean ONI ${p.oni>0?'+':''}${p.oni} °C</span>`,ev); }).on('mouseleave',hideTip);
  });
  svg.append('g').selectAll('text').data(yrs.filter(y=>y%5===0)).enter().append('text').attr('x',y=>x(y)+x.bandwidth()/2).attr('y',H-6).attr('text-anchor','middle').attr('fill',css('--ink-3')).style('font-size','10.5px').text(y=>y);
}



// ---------- map (hierarchical)
function geoNameKey(){ const b=baseCC(S.cc); return b==='IN'?'st_nm':b==='BR'?'uf':'name'; }
function admin1ForFeature(f){ const key=norm(f.properties[geoNameKey()]); return country().admin1.find(a=>norm(a.geoKey||a.name)===key)||null; }
function featureForAdmin1(a){ const key=norm(a.geoKey||a.name); return GEO[baseCC(S.cc)].states.features.find(f=>norm(f.properties[geoNameKey()])===key)||null; }
function metricOf(st){ if(S.metric==='yield') return {v:st.yieldMean,sig:true}; const p=S.metric==='nina'?'La Niña':'El Niño'; return {v:st[p].nUnits>=3?st[p].diff:null,sig:!!st[p].sig}; }
function renderMap(){
  const c=country(); const host=document.getElementById('map'); host.innerHTML=''; const W=host.clientWidth||600,H=Math.max(440,Math.round(W*0.8));
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`); const base=baseCC(S.cc); const geo=GEO[base].states; const root=svg.append('g');
  const f=cur(); const stateView=!!S.a1; const a1=stateView?admin1Of(S.a1):null; const a1feat=a1?featureForAdmin1(a1):null;
  const proj=d3.geoMercator();
  if(stateView&&a1feat) proj.fitExtent([[W*0.08,H*0.08],[W*0.92,H*0.92]],a1feat);
  else proj.fitExtent([[12,12],[W-12,H-12]],geo);
  const path=d3.geoPath(proj);
  // colour scale over the items shown
  const countyMode=!stateView&&S.showLevel==='region';
  const items= stateView ? c.regions.filter(r=>r.admin1===S.a1).map(r=>({r,lvl:'region',...metricOf(statsFor(r))})) : countyMode ? c.regions.map(r=>({r,lvl:'region',...metricOf(statsFor(r))})) : c.admin1.map(a=>({r:a,lvl:'admin1',...metricOf(statsFor(a))}));
  const a1stats=new Map(c.admin1.map(a=>[norm(a.geoKey||a.name),{r:a,lvl:'admin1',...metricOf(statsFor(a))}]));
  let color,legend;
  if(S.metric==='yield'){ const ext=d3.extent(items.map(d=>d.v).filter(x=>x!=null)); color=d3.scaleSequential(d3.interpolateYlGnBu).domain([ext[1],ext[0]]); legend=`<b>Average yield</b> · ${c.unit}<div class="ramp" style="background:linear-gradient(90deg,${d3.interpolateYlGnBu(1)},${d3.interpolateYlGnBu(.5)},${d3.interpolateYlGnBu(0)})"></div><div class="rl"><span>${fmt0(Math.round(ext[1]||0))}</span><span>${fmt0(Math.round(ext[0]||0))}</span></div>`; }
  else { const lim=Math.min(30,Math.max(10,d3.quantile(items.map(d=>Math.abs(d.v)).filter(x=>x!=null).sort(d3.ascending),0.9)||15)); const L=Math.ceil(lim/5)*5; color=d3.scaleDiverging().domain([-L,0,L]).interpolator(t=>d3.interpolateRgbBasis([css('--neg'),css('--mid'),css('--pos')])(t)); legend=`<b>${S.metric==='nina'?'La Niña':'El Niño'} years vs neutral</b><br>average % from trend<div class="ramp"></div><div class="rl"><span>−${L}%</span><span>0</span><span>+${L}%</span></div><div style="margin-top:6px"><span class="sw" style="background:var(--pos);opacity:.28"></span>faded = not confident (90% range crosses 0)</div><div><span class="sw" style="background:var(--neutral)"></span>grey = fewer than 3 ${S.metric==='nina'?'La Niña':'El Niño'} years</div>`; }
  document.getElementById('mapLegend').innerHTML=legend;
  const fill=d=>d.v==null?css('--neutral'):color(d.v); const fade=d=>(S.mask&&!d.sig)?0.28:0.92;
  const tipHtml=d=>{ const st=statsFor(d.r); return `<b>${d.r.name}</b>${d.lvl==='region'?' · '+d.r.admin1:''}<br><span class="mut">${fmt0(Math.round(d.r.areaMean))} ha · ${st.n} seasons${d.lvl==='admin1'?` · ${d.r.nRegions} ${c.level.toLowerCase()} areas`:''}</span><br>El Niño <b>${st['El Niño'].n?fmt1(st['El Niño'].diff)+'%':'n/a'}</b> (${st['El Niño'].nUnits}) · La Niña <b>${st['La Niña'].n?fmt1(st['La Niña'].diff)+'%':'n/a'}</b> (${st['La Niña'].nUnits})<br><span class="mut">avg yield ${fmt0(Math.round(st.yieldMean))} · ${d.lvl==='admin1'?'click to open the state':(!S.a1?'click to open '+d.r.admin1:(S.sel===d.r.id?'click again to deselect':'click to select'))}</span>`; };
  // base state outlines
  const byA1=new Map(); for(const d of items) if(d.lvl==='admin1') byA1.set(norm(d.r.geoKey||d.r.name),d);
  const hasA1=key=>a1stats.has(key);
  root.append('g').selectAll('path').data(geo.features).enter().append('path').attr('d',path).attr('vector-effect','non-scaling-stroke')
    .attr('fill',ft=>{ if(stateView) return css('--panel-2'); const d=byA1.get(norm(ft.properties[geoNameKey()])); return (S.mapStyle==='choro'&&d)?fill(d):css('--panel-2'); })
    .attr('fill-opacity',ft=>{ if(stateView) return (a1feat&&ft===a1feat)?0.5:1; const d=byA1.get(norm(ft.properties[geoNameKey()])); return (S.mapStyle==='choro'&&d)?fade(d):1; })
    .attr('stroke',ft=>(stateView&&a1feat&&ft===a1feat)?css('--accent'):css('--line-2')).attr('stroke-width',ft=>(stateView&&a1feat&&ft===a1feat)?1.6:0.8).style('cursor',ft=>hasA1(norm(ft.properties[geoNameKey()]))?'pointer':'default')
    .on('mousemove',(ev,ft)=>{ const d=a1stats.get(norm(ft.properties[geoNameKey()])); showTip(d?tipHtml(d)+(stateView&&a1feat===ft?'<br><span class="mut">click the state background to go back to the country</span>':''):`<b>${ft.properties[geoNameKey()]}</b><br><span class="mut">no cotton data</span>`,ev); }).on('mouseleave',hideTip)
    .on('click',(ev,ft)=>{ if(stateView&&a1feat===ft){ S.a1=null; S.sel=null; S.zoom=null; renderAll(); return; } const a=admin1ForFeature(ft); if(a){ S.a1=a.name; S.sel=null; S.zoom=null; renderAll(); } });
  if(stateView||countyMode){
    const polys=GEO[base].polys; const byId=new Map(items.map(d=>[d.r.id,d]));
    if(S.mapStyle==='choro'&&polys){ root.append('g').selectAll('path').data(polys.features.filter(ft=>byId.has(ft.id))).enter().append('path').attr('d',path).attr('vector-effect','non-scaling-stroke').attr('fill',ft=>fill(byId.get(ft.id))).attr('fill-opacity',ft=>fade(byId.get(ft.id))).attr('stroke',ft=>ft.id===S.sel?css('--accent'):css('--bg')).attr('stroke-width',ft=>ft.id===S.sel?2.5:0.6).style('cursor','pointer').on('mousemove',(ev,ft)=>showTip(tipHtml(byId.get(ft.id)),ev)).on('mouseleave',hideTip).on('click',(ev,ft)=>clickRegion(byId.get(ft.id).r));
      const missing=items.filter(d=>!polys.features.some(ft=>ft.id===d.r.id)); if(missing.length) drawBubbles(root,missing,proj,fill,fade,tipHtml,6); }
    else drawBubbles(root,items,proj,fill,fade,tipHtml,stateView?22:16);
    if(countyMode) root.append('g').selectAll('path').data(geo.features).enter().append('path').attr('d',path).attr('fill','none').attr('stroke',css('--ink-3')).attr('stroke-width',0.9).attr('vector-effect','non-scaling-stroke').attr('pointer-events','none');
  } else if(S.mapStyle!=='choro'){ drawBubbles(root,items,proj,fill,fade,tipHtml,34,true); }
  const zoom=d3.zoom().scaleExtent([1,14]).on('zoom',ev=>{ const k=ev.transform.k; root.attr('transform',ev.transform); root.selectAll('.bubbles circle').attr('r',function(){ return +this.getAttribute('data-r')/Math.sqrt(k); }); S.zoom=ev.transform; }); svg.call(zoom).on('dblclick.zoom',null); if(S.zoom&&S.zoom.k>1) svg.call(zoom.transform,S.zoom);
  const zu=document.getElementById('zUp'); zu.style.display=stateView?'block':'none'; zu.onclick=()=>{ S.a1=null; S.sel=null; S.zoom=null; renderAll(); };
  document.querySelectorAll('#showSeg button').forEach(b=>b.disabled=stateView);
  document.getElementById('zIn').onclick=()=>svg.transition().duration(250).call(zoom.scaleBy,1.6); document.getElementById('zOut').onclick=()=>svg.transition().duration(250).call(zoom.scaleBy,1/1.6); document.getElementById('zReset').onclick=()=>{ S.zoom=null; svg.transition().duration(250).call(zoom.transform,d3.zoomIdentity); };
  document.getElementById('mapTitle').textContent= stateView ? `${S.a1} · ${items.length} ${c.level.toLowerCase()} areas` : countyMode ? `${c.name} · ${items.length} ${c.level.toLowerCase()} areas` : `${c.name} · ${c.admin1.length} states`;
  document.getElementById('mapNote').innerHTML= stateView ? `Click a ${c.level.toLowerCase()} to select it, click it again to deselect. Click the state background or ↩ to return to the country. Scroll or ＋/－ to zoom.` : countyMode ? `Every ${c.level.toLowerCase()} is coloured by its own effect. Click one to open its state, then pick the ${c.level.toLowerCase()}. Switch to <i>States</i> to see state averages instead.` : `Each state is coloured by its own effect. Click one to open its ${c.level.toLowerCase()} areas.`;
}
function drawBubbles(root,items,proj,fill,fade,tipHtml,maxR,isA1){
  const rScale=d3.scaleSqrt().domain([0,d3.max(items,d=>d.r.areaMean)||1]).range([3,maxR]);
  root.append('g').attr('class','bubbles').selectAll('circle').data(items.slice().sort((a,b)=>b.r.areaMean-a.r.areaMean)).enter().append('circle').attr('cx',d=>proj([d.r.lon,d.r.lat])[0]).attr('cy',d=>proj([d.r.lon,d.r.lat])[1]).attr('r',d=>rScale(d.r.areaMean)).attr('data-r',d=>rScale(d.r.areaMean)).attr('fill',fill).attr('fill-opacity',fade).attr('stroke',d=>d.r.id===S.sel?css('--accent'):css('--panel')).attr('stroke-width',d=>d.r.id===S.sel?3:1).attr('vector-effect','non-scaling-stroke').style('cursor','pointer')
    .on('mousemove',(ev,d)=>showTip(tipHtml(d),ev)).on('mouseleave',hideTip).on('click',(ev,d)=>{ if(isA1){ S.a1=d.r.name; S.sel=null; S.zoom=null; renderAll(); } else clickRegion(d.r); });
}
function clickRegion(r){ if(!S.a1){ S.a1=r.admin1; S.sel=null; S.zoom=null; renderAll(); return; } if(S.sel===r.id){ S.sel=null; } else S.sel=r.id; renderSelection(); renderMap(); writeHash(); }

// ---------- Explore right panel
function renderSelection(){
  const c=country(); const f=cur(); const r=f.r; const st=statsFor(r);
  const sub=f.level==='region'?`${c.level} · ${r.admin1} · ${fmt0(Math.round(r.areaMean))} ha harvested on average`:f.level==='admin1'?`State · ${r.nRegions} ${c.level.toLowerCase()} areas · ${fmt0(Math.round(r.areaMean))} ha`:`Whole country, production-weighted · ${fmt0(Math.round(r.areaMean))} ha`;
  document.getElementById('selTitle').textContent=r.name; document.getElementById('selSub').textContent=sub; ['histTitle','tblTitle','trendTitle'].forEach(id=>document.getElementById(id).textContent=r.name);
  const en=st['El Niño'],ln=st['La Niña']; const gap=t=>{ const ev=DATA.events.filter(e=>e.type===t&&e.endYear>=(st.years?st.years[0]:1950)); const g=ev.map(e=>e.gapFromPrevSame).filter(x=>x!=null); return g.length?mean(g):NaN; };
  document.getElementById('coverage').innerHTML=`<span>Data <b>${st.years?st.years[0]+'–'+st.years[1]:'–'}</b> · <b>${st.n}</b> seasons</span><span><span class="dot" style="background:var(--nino)"></span> El Niño <b>${en.nEvents}</b> events / <b>${en.n}</b> years</span><span><span class="dot" style="background:var(--nina)"></span> La Niña <b>${ln.nEvents}</b> events / <b>${ln.n}</b> years</span><span>Neutral <b>${st.neutral.n}</b> years</span><span class="muted">events recur every ≈${gap('El Niño').toFixed(1)} / ${gap('La Niña').toFixed(1)} yrs</span>`;
  const phr=(p,o)=> o.n?`<b class="${PH[p]}">${p}</b> years ran <b>${fmt1(o.diff)}%</b> against neutral (${o.below} of ${o.nUnits} ${UNITS()} below trend)${sigTag(o)}`:`no ${p} years in range`;
  document.getElementById('story').innerHTML=`In <b>${r.name}</b>, ${phr('La Niña',ln)}. ${phr('El Niño',en)}. A neutral year averages <b>${fmt0(Math.round(st.neutral.yieldMean))} ${c.unit}</b>.`;
  const card=(name,cls,o)=>{ const d=o.diff,w=Math.min(100,Math.abs(d)/30*100); return `<div class="phase"><div class="name"><span class="dot" style="background:var(--${cls})"></span>${name}</div><div class="big ${o.n?(d<0?'neg':'pos'):''}">${o.n?fmt1(d)+'%':'—'}</div><div class="meta">vs neutral · ${o.nUnits} ${UNITS()}${o.ci?`<br><span class="ci">90% range ${fmt1(o.ci[0])} to ${fmt1(o.ci[1])}% · ${o.sig?'<b>confident</b>':'uncertain'}</span>`:''}<br>${o.n?`${o.below}/${o.nUnits} below trend · avg ${fmt0(Math.round(o.yieldMean))}<br>worst ${o.worst.year} (${fmt1(o.worst.anom)}%) · best ${o.best.year} (${fmt1(o.best.anom)}%)`:'no years in range'}</div><div class="bar"><i style="width:${o.n?w:0}%;background:var(--${d<0?'neg':'pos'})"></i></div></div>`; };
  document.getElementById('impact').innerHTML=`<div class="phase"><div class="name"><span class="dot" style="background:var(--neutral)"></span>Neutral years</div><div class="big">${fmt0(Math.round(st.neutral.yieldMean))}<span style="font-size:13px;font-weight:500;color:var(--ink-2)"> ${c.unit}</span></div><div class="meta">the baseline · ${st.neutral.n} years<br>${fmt1(st.neutral.mean)}% from trend · all years avg ${fmt0(Math.round(st.yieldMean))}</div><div class="bar"><i style="width:0"></i></div></div>`+card('El Niño years','nino',en)+card('La Niña years','nina',ln);
  const lag=(o,k)=>o.lagMean[k].n?`<span class="v ${o.lagMean[k].mean<0?'neg':'pos'}">${fmt1(o.lagMean[k].mean)}%</span>`:'<span class="v muted">–</span>';
  document.getElementById('after').innerHTML=`<span></span><span class="hd">event year</span><span class="hd">1 yr after</span><span class="hd">2 yrs after</span><span class="lb" style="color:var(--nino)">El Niño</span>${lag(en,0)}${lag(en,1)}${lag(en,2)}<span class="lb" style="color:var(--nina)">La Niña</span>${lag(ln,0)}${lag(ln,1)}${lag(ln,2)}`;
  document.getElementById('impactNote').innerHTML=`${st.nExcluded?`<b>${st.nExcluded}</b> weak-event year${st.nExcluded>1?'s':''} left out. `:''}% = deviation from this place's own long-term trend, so yield growth isn't mistaken for climate. "After" rows average the one and two crop years following each event.<span class="help" title="${CI_HELP}">?</span>`;
  // children list
  const ch=document.getElementById('children');
  if(f.level!=='region'){ const kids= f.level==='national'? c.admin1.map(a=>({x:a,go:()=>{S.a1=a.name;S.sel=null;S.zoom=null;renderAll();}})) : c.regions.filter(g=>g.admin1===S.a1).map(g=>({x:g,go:()=>{S.sel=g.id;renderAll();}}));
    const rows=kids.map(k=>{ const s=statsFor(k.x); return {k,s,v:s['La Niña'].nUnits>=3?s['La Niña'].diff:NaN}; }).sort((a,b)=>(isNaN(a.v)?1:0)-(isNaN(b.v)?1:0)||a.v-b.v);
    window.__kids=rows; ch.innerHTML=`<div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${f.level==='national'?'States':c.level+' areas in '+S.a1}, most hurt by La Niña first</div><ul class="rank">${rows.slice(0,12).map((d,i)=>`<li onclick="__kids[${i}].k.go()"><span><span class="n">${i+1}</span>${d.k.x.name}${f.level==='national'?` <span class="muted">${d.k.x.nRegions} areas</span>`:''}</span><span class="vals"><span class="${d.s['El Niño'].diff<0?'neg':'pos'}" title="El Niño">${d.s['El Niño'].nUnits>=3?fmt1(d.s['El Niño'].diff)+'%':'–'}</span><span class="${isNaN(d.v)?'muted':d.v<0?'neg':'pos'}" title="La Niña">${isNaN(d.v)?'–':fmt1(d.v)+'%'}${d.s['La Niña'].sig?' ✓':''}</span></span></li>`).join('')}</ul><div class="muted" style="font-size:11px;margin-top:4px">columns: El Niño · La Niña (✓ = confident) · ${rows.length>12?`showing 12 of ${rows.length} · `:''}click to open</div>`; }
  else ch.innerHTML='';
  renderCrumbs(); const pb=document.getElementById('pinBtn'); if(pb){ const pinned=S.pins.some(p=>p.cc===S.cc&&p.id===r.id); pb.textContent=pinned?'📌 Pinned':'📌 Pin to compare'; pb.onclick=togglePin; }
  if(S.tab==='area'){ renderHist(r,st); renderTrend(r,st); renderStrength(r); renderLag(r,st); } if(S.tab==='data') renderTable(r); if(S.tab==='area'){ renderEventsStrip(); renderEventPanel(); }
}
function renderTrendMini(){ const host=document.getElementById('trendMini'); if(!host) return; host.innerHTML=''; const W=220,H=80; const svg=d3.select(host).append('svg').attr('width',W).attr('height',H); const pts=[[0,60],[20,52],[40,58],[60,42],[80,48],[100,30],[120,40],[140,26],[160,18],[180,28],[200,12]]; const tr=d3.line().x(d=>d[0]+10).y(d=>d[1]+8).curve(d3.curveBasis)(pts.map((p,i)=>[p[0],62-i*5])); svg.append('path').attr('d',tr).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',2); pts.forEach((p,i)=>{ const ty=62-i*5+8; const y=p[1]+8; svg.append('line').attr('x1',p[0]+10).attr('x2',p[0]+10).attr('y1',ty).attr('y2',y).attr('stroke',y>ty?css('--neg'):css('--pos')).attr('stroke-width',2); svg.append('circle').attr('cx',p[0]+10).attr('cy',y).attr('r',3).attr('fill',y>ty?css('--neg'):css('--pos')); }); svg.append('text').attr('x',W-2).attr('y',H-2).attr('text-anchor','end').attr('fill',css('--ink-3')).style('font-size','10px').text('bars = distance from trend'); }
function renderHist(r,st){ renderTrendMini();
  const host=document.getElementById('histChart'); host.innerHTML=''; const s=st.series,c=country(); const W=host.clientWidth||1000,H=260,m={t:18,r:16,b:28,l:54};
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`); const x=d3.scaleBand().domain(s.map(d=>d.year)).range([m.l,W-m.r]).padding(.2); const y=d3.scaleLinear().domain([0,d3.max(s,d=>Math.max(d.yield,d.trend))*1.08]).nice().range([H-m.b,m.t]);
  axisY(svg,y,m,W,fmt0);
  svg.selectAll('rect').data(s).enter().append('rect').attr('x',d=>x(d.year)).attr('width',x.bandwidth()).attr('y',d=>y(d.yield)).attr('height',d=>H-m.b-y(d.yield)).attr('rx',2).attr('fill',d=>phColor(d.phase)).attr('opacity',d=>d.phase==='Neutral'?.55:d.phase==='Weak event'?.22:.9)
    .on('mousemove',(ev,d)=>showTip(`<b>${d.year}</b> · <span style="color:${phColor(d.rawPhase)}">${d.rawPhase}${d.intensity?' ('+d.intensity+')':''}${d.excluded?' · excluded':''}</span><br>Yield <b>${fmt0(Math.round(d.yield))}</b> · trend ${fmt0(Math.round(d.trend))} → <b class="${d.anom<0?'neg':'pos'}">${fmt1(d.anom)}%</b><br><span class="mut">Window ONI ${d.oni==null?'n/a':(d.oni>0?'+':'')+d.oni}${d.area?` · ${fmt0(Math.round(d.area))} ha`:''}</span>`,ev)).on('mouseleave',hideTip);
  svg.append('path').datum(s).attr('d',d3.line().x(d=>x(d.year)+x.bandwidth()/2).y(d=>y(d.trend)).curve(d3.curveMonotoneX)).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',2.2);
  if(x.bandwidth()>20) svg.selectAll('text.lbl').data(s.filter(d=>d.phase==='El Niño'||d.phase==='La Niña')).enter().append('text').attr('x',d=>x(d.year)+x.bandwidth()/2).attr('y',d=>y(d.yield)-5).attr('text-anchor','middle').style('font-size','10px').style('font-weight',600).attr('fill',d=>d.anom<0?css('--neg'):css('--pos')).text(d=>fmt1(d.anom)+'%');
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(s.map(d=>d.year).filter(y=>y%(x.bandwidth()>14?2:5)===0)).tickSize(3)); svg.append('text').attr('x',m.l-44).attr('y',m.t-6).attr('fill',css('--ink-3')).style('font-size','10.5px').text(c.unit);
}

function renderTrend(r,st){
  const host=document.getElementById('trendChart'); host.innerHTML=''; const c=country(),s=st.series,v=S.trendView; const W=host.clientWidth||1000,H=300,m={t:18,r:84,b:28,l:54};
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`); const val=d=>v==='yield'?d.yield:d.anom;
  const x=d3.scaleLinear().domain(d3.extent(s,d=>d.year)).nice().range([m.l,W-m.r]); const ext=d3.extent(s,val); const y=d3.scaleLinear().domain(v==='yield'?[0,ext[1]*1.08]:[Math.min(-20,ext[0]*1.1),Math.max(20,ext[1]*1.1)]).nice().range([H-m.b,m.t]);
  axisY(svg,y,m,W,d=>v==='yield'?fmt0(d):(d>0?'+':'')+d+'%'); if(v==='anom') svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',css('--ink-3'));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(Math.min(14,Math.floor(W/80))).tickFormat(d3.format('d')).tickSize(3));
  svg.selectAll('circle').data(s).enter().append('circle').attr('cx',d=>x(d.year)).attr('cy',d=>y(val(d))).attr('r',d=>d.phase==='Weak event'?3:4.5).attr('fill',d=>phColor(d.phase)).attr('fill-opacity',d=>d.phase==='Weak event'?.25:d.phase==='Neutral'?.55:.9).attr('stroke',css('--panel')).attr('stroke-width',1).on('mousemove',(ev,d)=>showTip(`<b>${d.year}</b> · ${d.rawPhase}${d.intensity?' ('+d.intensity+')':''}${d.excluded?' · excluded':''}<br>${fmt0(Math.round(d.yield))} ${c.unit} · <b class="${d.anom<0?'neg':'pos'}">${fmt1(d.anom)}%</b> from trend`,ev)).on('mouseleave',hideTip);
  const fits={}; const labelYs=[];
  for(const [p,col] of [['Neutral',css('--neutral')],['El Niño',css('--nino')],['La Niña',css('--nina')]]){ const g=s.filter(d=>d.phase===p); const f=ols(g.map(d=>d.year),g.map(val)); fits[p]=f; if(!f) continue; svg.append('line').attr('x1',x(f.x0)).attr('x2',x(f.x1)).attr('y1',y(f.a+f.b*f.x0)).attr('y2',y(f.a+f.b*f.x1)).attr('stroke',col).attr('stroke-width',p==='Neutral'?2:3).attr('stroke-dasharray',p==='Neutral'?'6 4':null); let ly=y(f.a+f.b*f.x1)+4; while(labelYs.some(o=>Math.abs(o-ly)<13)) ly+=13; labelYs.push(ly); svg.append('text').attr('x',x(f.x1)+6).attr('y',ly).attr('fill',col).style('font-size','11px').style('font-weight',700).text(`${short(p)} ${f.b>=0?'+':''}${v==='yield'?f.b.toFixed(1):f.b.toFixed(2)}${v==='yield'?'/yr':' %/yr'}`); }
  const unit=v==='yield'?c.unit.split(' ')[0]+' per yr':'%-pts per yr';
  const card=(p,cls,f,o)=>`<div class="phase"><div class="name"><span class="dot" style="background:var(--${cls})"></span>${p} years</div><div class="big" style="color:var(--${cls})">${f?(f.b>=0?'+':'')+(v==='yield'?f.b.toFixed(1):f.b.toFixed(2))+' <span style="font-size:12px;font-weight:500;color:var(--ink-2)">'+unit+'</span>':'—'}</div><div class="kv"><span>years</span><b>${f?f.n:0}</b><span>slope ± s.e.</span><b>${f?`${f.b.toFixed(2)} ± ${f.se.toFixed(2)}`:'–'}</b><span>R²</span><b>${f?f.r2.toFixed(2):'–'}</b><span>mean yield</span><b>${o.n?fmt0(Math.round(o.yieldMean)):'–'}</b><span>variability (sd of %)</span><b>${o.n>1?o.sd.toFixed(1)+'%':'–'}</b><span>mean % from trend</span><b>${o.n?fmt1(o.mean)+'%':'–'}</b></div></div>`;
  const box=document.getElementById('trendStats'); box.innerHTML=card('Neutral','neutral',fits['Neutral'],st.neutral)+card('El Niño','nino',fits['El Niño'],st['El Niño'])+card('La Niña','nina',fits['La Niña'],st['La Niña']);
  const en=fits['El Niño'],ln=fits['La Niña'],ne=fits['Neutral']; const note=document.createElement('div'); note.className='muted'; note.style.cssText='font-size:12px;margin-top:6px;grid-column:1/-1';
  note.innerHTML=v==='yield'?`Steeper than neutral = that phase is catching up over time; flatter = it keeps lagging the technology trend.${en&&ne?` El Niño trends ${en.b>ne.b?'faster':'slower'} than neutral (${en.b.toFixed(1)} vs ${ne.b.toFixed(1)})`:''}${ln&&ne?`; La Niña ${ln.b>ne.b?'faster':'slower'} (${ln.b.toFixed(1)} vs ${ne.b.toFixed(1)}).`:'.'} Slopes with s.e. of a similar size are not distinguishable.`:`Fits through the detrended deviations: a non-zero slope means the phase's penalty or bonus is changing over the decades (e.g. irrigation shrinking La Niña losses).`;
  box.appendChild(note);
}

function strengthStats(r,cc=S.cc){
  // ignores the strength threshold on purpose; respects year range and weighting
  const ph=country(cc).phases; const rows=[]; for(let i=0;i<r.years.length;i++){ const y=r.years[i]; if(y<S.minYear) continue; const p=ph[y]||{phase:'Neutral'}; rows.push({year:y,anom:r.anom[i],phase:p.phase,event:p.event,intensity:p.intensity}); }
  const neu=rows.filter(d=>d.phase==='Neutral').map(d=>d.anom); const out={neutral:{n:neu.length,mean:mean(neu)}};
  for(const p of ['El Niño','La Niña']){ out[p]={}; for(const cls of ['weak','moderate','strong']){ let g=rows.filter(d=>d.phase===p&&d.event&&(cls==='strong'?/strong/.test(d.intensity):d.intensity===cls)); let a=g.map(d=>d.anom); if(S.weight==='event'){ a=[...d3.group(g,d=>d.event).values()].map(x=>mean(x.map(d=>d.anom))); } const ci=bootCI(a,neu); out[p][cls]={n:a.length,nYears:g.length,diff:a.length?mean(a)-mean(neu):NaN,ci,sig:ci?(ci[0]>0||ci[1]<0):false}; } }
  return out;
}
function renderStrength(r){
  const host=document.getElementById('strChart'); if(!host) return; host.innerHTML=''; document.getElementById('strTitle').textContent=r.name; const ss=strengthStats(r); const c=country();
  const W=host.clientWidth||900,H=230,m={t:16,r:16,b:34,l:46}; const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const cats=[]; for(const p of ['El Niño','La Niña']) for(const cls of ['weak','moderate','strong']) cats.push({p,cls,label:`${short(p)} ${cls==='strong'?'strong+':cls}`,...ss[p][cls]});
  const vals=cats.flatMap(d=>d.ci?[d.ci[0],d.ci[1]]:[d.diff]).filter(x=>!isNaN(x)); const lim=Math.max(10,Math.ceil((d3.max(vals.map(Math.abs))||10)/5)*5);
  const x=d3.scaleBand().domain(cats.map(d=>d.label)).range([m.l,W-m.r]).padding(.3); const y=d3.scaleLinear().domain([-lim,lim]).range([H-m.b,m.t]);
  axisY(svg,y,m,W,d=>(d>0?'+':'')+d+'%'); svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',css('--ink-3'));
  svg.selectAll('rect').data(cats.filter(d=>!isNaN(d.diff))).enter().append('rect').attr('x',d=>x(d.label)).attr('width',x.bandwidth()).attr('y',d=>Math.min(y(0),y(d.diff))).attr('height',d=>Math.abs(y(d.diff)-y(0))).attr('rx',3).attr('fill',d=>phColor(d.p)).attr('fill-opacity',d=>d.sig?.95:.45)
    .on('mousemove',(ev,d)=>showTip(`<b>${d.p} · ${d.cls==='strong'?'strong & very strong':d.cls}</b><br>${fmt1(d.diff)}% vs neutral · ${d.n} ${UNITS()}${d.ci?`<br><span class="mut">90% range ${fmt1(d.ci[0])} to ${fmt1(d.ci[1])}% · ${d.sig?'confident':'uncertain'}</span>`:''}`,ev)).on('mouseleave',hideTip);
  svg.selectAll('line.ci').data(cats.filter(d=>d.ci)).enter().append('line').attr('x1',d=>x(d.label)+x.bandwidth()/2).attr('x2',d=>x(d.label)+x.bandwidth()/2).attr('y1',d=>y(d.ci[0])).attr('y2',d=>y(d.ci[1])).attr('stroke',css('--ink')).attr('stroke-width',1.5).attr('opacity',.7);
  svg.selectAll('text.v').data(cats).enter().append('text').attr('x',d=>x(d.label)+x.bandwidth()/2).attr('y',d=>isNaN(d.diff)?y(0)-6:(d.diff<0?y(d.diff)+14:y(d.diff)-6)).attr('text-anchor','middle').style('font-size','11px').style('font-weight',700).attr('fill',d=>isNaN(d.diff)?css('--ink-3'):d.diff<0?css('--neg'):css('--pos')).text(d=>isNaN(d.diff)?'no data':fmt1(d.diff)+'%');
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickSize(3)).call(g=>g.selectAll('text').style('font-size','11px'));
  svg.selectAll('text.n').data(cats).enter().append('text').attr('x',d=>x(d.label)+x.bandwidth()/2).attr('y',H-4).attr('text-anchor','middle').style('font-size','10px').attr('fill',css('--ink-3')).text(d=>`n=${d.n}`);
  const s=p=>['weak','moderate','strong'].map(k=>ss[p][k]).filter(d=>d.n); const mono=p=>{ const v=s(p); return v.length>=2 && v.every((d,i)=>i===0||d.diff<=v[i-1].diff); };
  document.getElementById('strText').innerHTML=`${mono('La Niña')?'La Niña losses grow with event strength here.':'La Niña effects do not scale cleanly with strength here.'} ${mono('El Niño')?'El Niño effects also grow with strength.':'El Niño effects do not scale cleanly with strength.'} Solid bars = confident; pale = uncertain. Neutral baseline: ${ss.neutral.n} years.`;
}
function renderLag(r,st){
  const host=document.getElementById('lagChart'); host.innerHTML=''; const W=host.clientWidth||500,H=230,m={t:16,r:36,b:30,l:42}; const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scalePoint().domain([-2,-1,0,1,2]).range([m.l,W-m.r]); const all=[]; ['El Niño','La Niña'].forEach(p=>st[p].profile.forEach(g=>Object.values(g.lags).forEach(v=>{if(v!=null&&!isNaN(v))all.push(v);})));
  const lim=Math.max(15,Math.min(60,Math.ceil((d3.max(all.map(Math.abs))||15)/5)*5)); const y=d3.scaleLinear().domain([-lim,lim]).range([H-m.b,m.t]); axisY(svg,y,m,W,d=>(d>0?'+':'')+d+'%');
  svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',css('--ink-3')); svg.append('rect').attr('x',x(0)-18).attr('y',m.t).attr('width',36).attr('height',H-m.b-m.t).attr('fill',css('--ink-3')).attr('opacity',.08);
  const ln=d3.line().defined(d=>d[1]!=null&&!isNaN(d[1])).x(d=>x(d[0])).y(d=>y(d[1]));
  for(const p of ['El Niño','La Niña']){ const col=phColor(p); st[p].profile.forEach(g=>{ svg.append('path').datum([-2,-1,0,1,2].map(k=>[k,g.lags[k]])).attr('d',ln).attr('fill','none').attr('stroke',col).attr('stroke-width',1).attr('opacity',.28).on('mousemove',ev=>showTip(`<b>${p} ${DATA.events.find(e=>e.id===g.ev)?.label}</b><br>${[-2,-1,0,1,2].map(k=>`${k>0?'+':''}${k}: ${g.lags[k]==null||isNaN(g.lags[k])?'–':fmt1(g.lags[k])+'%'}`).join(' · ')}`,ev)).on('mouseleave',hideTip); });
    const pts=[-2,-1,0,1,2].map(k=>[k,st[p].lagMean[k].n?st[p].lagMean[k].mean:null]); svg.append('path').datum(pts).attr('d',ln).attr('fill','none').attr('stroke',col).attr('stroke-width',3); svg.selectAll(null).data(pts.filter(d=>d[1]!=null)).enter().append('circle').attr('cx',d=>x(d[0])).attr('cy',d=>y(d[1])).attr('r',5).attr('fill',col).attr('stroke',css('--panel')).attr('stroke-width',2).on('mousemove',(ev,d)=>showTip(`<b>${p}</b> · lag ${d[0]>0?'+':''}${d[0]}<br>mean <b>${fmt1(d[1])}%</b> across ${st[p].lagMean[d[0]].n} events`,ev)).on('mouseleave',hideTip);
    const last=pts.slice().reverse().find(d=>d[1]!=null); if(last) svg.append('text').attr('x',x(2)+8).attr('y',y(last[1])+4).attr('fill',col).style('font-size','11px').style('font-weight',700).text(short(p)); }
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickFormat(k=>k===0?'event':k<0?`${k} yr`:`+${k} yr`).tickSize(3));
  const en=st['El Niño'].lagMean,la=st['La Niña'].lagMean; document.getElementById('lagText').innerHTML=`${st['La Niña'].profile.length} La Niña and ${st['El Niño'].profile.length} El Niño events in range. La Niña ${[-2,-1,0,1,2].map(k=>`<b>${la[k].n?fmt1(la[k].mean)+'%':'–'}</b>`).join(' → ')} · El Niño ${[-2,-1,0,1,2].map(k=>`<b>${en[k].n?fmt1(en[k].mean)+'%':'–'}</b>`).join(' → ')}. Multi-year events use their average as the event year.`;
}

function renderEventPanel(){
  const c=country(),el=document.getElementById('evPanel'),f=cur(),r=f.r;
  if(!S.event){ el.innerHTML=`<div class="banner">Pick an event above to see how it played out in <b>${r.name}</b> and which ${c.level.toLowerCase()} areas were hit hardest.</div>`; document.getElementById('evTitle').textContent='Event drill-down'; return; }
  const e=DATA.events.find(x=>x.id===S.event); const ys=eventYears(e.id);
  document.getElementById('evTitle').innerHTML=`${e.type} ${e.label} <span class="pill ${e.type==='El Niño'?'nino':'nina'}">${e.intensity}</span>${eventPasses(e)?'':' <span class="sig">below your threshold — shown here, excluded from phase stats</span>'}`;
  if(!ys.length){ el.innerHTML=`<div class="banner">This event doesn't overlap ${c.name}'s growing window in any crop year with data (${c.yearRange[0]}–${c.yearRange[1]}), or its window-mean ONI stayed inside ±0.5 °C.</div>`; return; }
  const f0=ys[0],l0=ys[ys.length-1]; const seq=[f0-2,f0-1,...ys,l0+1,l0+2];
  const cell=y=>{ const a=anomAt(r,y),i=r.years.indexOf(y); return a==null?`<div class="phase"><div class="name muted">${y}</div><div class="big muted">–</div><div class="meta">no data</div></div>`:`<div class="phase"><div class="name">${y}${ys.includes(y)?' <span class="pill '+(e.type==='El Niño'?'nino':'nina')+'">event</span>':''}</div><div class="big ${a<0?'neg':'pos'}">${fmt1(a)}%</div><div class="meta">${fmt0(Math.round(r.yield_[i]))} · trend ${fmt0(Math.round(r.trend[i]))}</div></div>`; };
  const rank=c.regions.map(g=>({g,a:mean(ys.map(y=>anomAt(g,y)).filter(x=>x!=null))})).filter(d=>!isNaN(d.a)).sort((a,b)=>a.a-b.a); const worst=rank.slice(0,5),best=rank.slice(-5).reverse(); const natl=mean(ys.map(y=>anomAt(c.national,y)).filter(x=>x!=null));
  const li=d=>`<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;border-bottom:1px solid var(--line);cursor:pointer" onclick="selectId('${d.g.id}')"><span>${d.g.name} <span class="muted">${d.g.admin1}</span></span><b class="${d.a<0?'neg':'pos'}">${fmt1(d.a)}%</b></div>`;
  el.innerHTML=`<div class="muted" style="font-size:12.5px;margin-bottom:6px">${c.name} crop year${ys.length>1?'s':''} ${ys.join(', ')} · peak ONI ${e.peak>0?'+':''}${e.peak} °C in ${e.peakSeason} ${e.peakYear} · ${e.durationSeasons} seasons</div><div class="impact ev" style="grid-template-columns:repeat(${Math.min(seq.length,6)},minmax(0,1fr))">${seq.map(cell).join('')}</div><div class="muted" style="font-size:12px;margin:8px 0 10px"><b style="color:var(--ink)">${r.name}</b>: two years before → event → two after. National, production-weighted, in the event year${ys.length>1?'s':''}: <b class="${natl<0?'neg':'pos'}">${isNaN(natl)?'–':fmt1(natl)+'%'}</b>.</div><div class="row eq" style="gap:10px"><div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Hardest hit</div>${worst.map(li).join('')}</div><div><div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Did best</div>${best.map(li).join('')}</div></div>`;
}
function renderEventCountries(){ const tl=document.getElementById('evcTitle'); if(tl){ const e=S.event?DATA.events.find(x=>x.id===S.event):null; tl.textContent=e?`${e.type} ${e.label} · every country`:'Same event, every country'; }
  const el=document.getElementById('evCountries'); if(!S.event){ el.innerHTML='<div class="banner">Pick an event to compare its footprint across countries.</div>'; return; }
  const e=DATA.events.find(x=>x.id===S.event); const rows=[]; let wsum=0,wa=0;
  for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; const ys=eventYears(e.id,cc); const nat=c.national; const a=ys.length?mean(ys.map(y=>anomAt(nat,y)).filter(x=>x!=null)):NaN; const prodW=nat.prod?mean(nat.prod.slice(-10)):0; const rank=c.regions.map(g=>({g,a:mean(ys.map(y=>anomAt(g,y)).filter(x=>x!=null))})).filter(d=>!isNaN(d.a)).sort((a,b)=>a.a-b.a); const w=rank[0]; rows.push({cc,c,ys,a,prodW,w}); if(!isNaN(a)&&prodW){ wsum+=prodW; wa+=a*prodW; } }
  const sup=wsum?wa/wsum:NaN;
  el.innerHTML=`<div class="cards">${rows.map(d=>`<div class="cc"><div class="t"><span><span class="flag">${META[d.cc].flag}</span> ${d.c.name}</span><span class="muted" style="font-weight:500;font-size:11.5px">${d.ys.length?'crop '+d.ys.join(', '):'no overlap'}</span></div><div class="big ${isNaN(d.a)?'muted':d.a<0?'neg':'pos'}">${isNaN(d.a)?'–':fmt1(d.a)+'%'}</div><div class="muted" style="font-size:12px">national, vs trend${d.w?`<br>hardest hit: <b style="color:var(--ink)">${d.w.g.name}</b> ${fmt1(d.w.a)}%`:''}<br><span class="muted">window ${d.c.window.replace(/\s*\(.*?\)/g,'')}</span></div></div>`).join('')}</div><div class="banner" style="margin-top:10px">Across the four countries, weighting each by its average production over its last decade, the <b>${e.type} ${e.label}</b> crop years came in at <b class="${sup<0?'neg':'pos'}">${isNaN(sup)?'–':fmt1(sup)+'%'}</b> versus trend — a rough read on the combined supply shock (these four grow roughly 60% of world cotton).</div>`;
}

window.selectId=function(id){ S.sel=id; setTab('map'); };
// ---------- findings
function renderFindings(){
  const cc=S.cc, c=country(), base=baseCC(cc); const el=document.getElementById('findings'); const cards=[]; const go=(st)=>JSON.stringify(st).replace(/"/g,'&quot;');
  document.getElementById('findCountry').textContent=c.name;
  const nat=statsFor(c.national,cc); const U=UNITS();
  // country info card
  const ph=c.phases; const yrs=Object.keys(ph).map(Number).filter(y=>y>=S.minYear); const byStr=(p)=>['weak','moderate','strong','very strong'].map(k=>[k,new Set(yrs.filter(y=>ph[y].phase===p&&ph[y].intensity===k).map(y=>ph[y].event)).size]).filter(x=>x[1]);
  document.getElementById('countryCard').innerHTML=`<div class="card"><div class="card-title"><h2>${META[base].flag} ${c.name}${c.variantOf?' · '+c.name.split('· ')[1]:''}</h2><span class="hint">${c.crop}</span></div>
    <div class="grid kpis"><div class="kpi"><h3>${c.level} areas</h3><div class="v">${fmt0(c.regions.length)}</div><div class="sub">in ${c.admin1.length} states</div></div><div class="kpi"><h3>Crop years</h3><div class="v">${Math.max(c.yearRange[0],S.minYear)}–${c.yearRange[1]}</div><div class="sub">${yrs.length} seasons</div></div><div class="kpi"><h3>El Niño events</h3><div class="v" style="color:var(--nino)">${nat['El Niño'].nEvents}</div><div class="sub">${byStr('El Niño').map(x=>x[1]+' '+x[0]).join(' · ')||'none'}</div></div><div class="kpi"><h3>La Niña events</h3><div class="v" style="color:var(--nina)">${nat['La Niña'].nEvents}</div><div class="sub">${byStr('La Niña').map(x=>x[1]+' '+x[0]).join(' · ')||'none'}</div></div><div class="kpi"><h3>Neutral years</h3><div class="v">${nat.neutral.n}</div><div class="sub">the baseline</div></div><div class="kpi"><h3>Growing window</h3><div class="v" style="font-size:16px;line-height:1.3;margin-top:8px">${c.window.replace(/\s*\(.*?\)/g,'')}</div><div class="sub">${c.window.match(/\((.*?)\)/)?.[1]||''}</div></div></div>
    <div class="muted" style="font-size:12px;margin-top:10px">Source: ${DATA.sources[base]}. Avg national yield ${fmt0(Math.round(nat.yieldMean))} ${c.unit}.</div></div>`;
  const pct=o=>o.ci?`90% range ${fmt1(o.ci[0])} to ${fmt1(o.ci[1])}%`:'';
  // 1-2 national effects
  for(const p of ['La Niña','El Niño']){ const o=nat[p]; if(!o.n) continue; cards.push({k:`${p} · national`,big:fx(o.diff),cls:o.diff<0?'neg':'pos',h:`${c.name}'s cotton runs ${fx(o.diff)} in ${p} years${o.sig?'':' — but the range crosses zero'}`,d:`Production-weighted national yield vs neutral years, ${o.nUnits} ${U} (${o.below} below trend). ${pct(o)}; ${o.sig?'confident':'uncertain'}. Worst ${o.worst.year} (${fx(o.worst.anom)}), best ${o.best.year} (${fx(o.best.anom)}).`,go:{cc,tab:'map',sel:'NAT'}}); }
  // 3 most sensitive state per phase
  for(const p of ['La Niña','El Niño']){ const all=c.admin1.map(a=>({a,st:statsFor(a,cc)})).filter(x=>x.st[p].nUnits>=5&&x.st.neutral.n>=8); if(!all.length) continue; all.sort((x,y)=>(y.st[p].sig-x.st[p].sig)||(x.st[p].diff-y.st[p].diff)); const w=all[0]; const o=w.st[p]; cards.push({k:`${p} · states`,big:fx(o.diff),cls:o.diff<0?'neg':'pos',h:`${w.a.name} is the most ${p}-sensitive state${o.sig?'':' (uncertain)'}`,d:`${w.a.nRegions} ${c.level.toLowerCase()} areas; ${o.below} of ${o.nUnits} ${U} below trend. ${pct(o)}.`,go:{cc,tab:'map',sel:w.a.name,level:'admin1'}}); }
  // 4 hardest-hit area (confident), La Niña then El Niño
  { const p=['La Niña','El Niño'].find(p=>c.regions.some(r=>{const s=statsFor(r,cc); return s[p].sig&&s[p].nUnits>=5;}))||'La Niña'; const all=c.regions.map(r=>({r,st:statsFor(r,cc)})).filter(x=>x.st[p].nUnits>=5&&x.st[p].sig).sort((x,y)=>x.st[p].diff-y.st[p].diff); const w=all[0]; if(w) cards.push({k:`${p} · ${c.level.toLowerCase()} areas`,big:fx(w.st[p].diff),cls:'neg',h:`${w.r.name}, ${w.r.admin1} is the hardest-hit ${c.level.toLowerCase()} with a confident effect`,d:`${w.st[p].below} of ${w.st[p].nUnits} ${p} ${U} below trend over ${w.st.n} seasons. ${pct(w.st[p])}. ${all.length} areas in ${c.name} show a confident ${p} loss.`,go:{cc,tab:'map',sel:w.r.id}}); }
  // 5 worst event for this country
  { let best=null; for(const e of DATA.events){ const ys=eventYears(e.id,cc).filter(y=>y>=S.minYear); if(!ys.length) continue; const a=mean(ys.map(y=>anomAt(c.national,y)).filter(x=>x!=null)); if(isNaN(a)) continue; if(!best||a<best.a) best={e,a,ys}; } if(best) cards.push({k:'Worst event',big:fx(best.a),cls:'neg',h:`${best.e.type} ${best.e.label} was ${c.name}'s worst ENSO harvest`,d:`National yield ${fx(best.a)} from trend in crop year${best.ys.length>1?'s':''} ${best.ys.join(', ')}. ${best.e.intensity} event, peak ONI ${best.e.peak>0?'+':''}${best.e.peak} °C.`,go:{cc,tab:'events',event:best.e.id}}); }
  // 6 strength
  { const ss=strengthStats(c.national,cc); for(const p of ['La Niña']){ const w=ss[p].weak,m=ss[p].moderate,s=ss[p].strong; const parts=[['weak',w],['moderate',m],['strong+',s]].filter(x=>x[1].n); if(parts.length>=2){ const mono=parts.every((x,i)=>i===0||x[1].diff<=parts[i-1][1].diff); cards.push({k:`${p} · by strength`,big:parts.map(x=>fx(x[1].diff)).join(' / '),cls:'',h:mono?`Stronger La Niñas hurt ${c.name} more`:`In ${c.name}, La Niña damage does not simply scale with strength`,d:parts.map(x=>`${x[0]}: ${fx(x[1].diff)} (${x[1].n} ${U})`).join(' · ')+'. See the strength panel in Trends.',go:{cc,tab:'area',sel:'NAT'}}); } } }
  // 7 after
  { const p='La Niña'; const l=nat[p].lagMean; if(l[0].n&&l[1].n) cards.push({k:`After a ${p}`,big:`${fx(l[0].mean)} → ${fx(l[1].mean)}`,cls:l[1].mean>l[0].mean?'pos':'neg',h:`${c.name} ${l[1].mean>l[0].mean?'recovers':'keeps losing'} the year after a La Niña`,d:`Event year ${fx(l[0].mean)}, one year after ${fx(l[1].mean)}${l[2].n?`, two after ${fx(l[2].mean)}`:''} (${l[0].n} events).`,go:{cc,tab:'area',sel:'NAT'}}); }
  // 8 irrigation (US)
  if(base==='US'&&DATA.countries.US_IRR&&DATA.countries.US_NON){ const p='La Niña'; const i=statsFor(DATA.countries.US_IRR.national,'US_IRR')[p], n=statsFor(DATA.countries.US_NON.national,'US_NON')[p]; const gap=n.diff-i.diff; const h=Math.abs(gap)<3?'Irrigated and dryland cotton respond to La Niña about the same':(n.diff<i.diff?'Dryland cotton loses more than irrigated in La Niña years':'Per harvested acre, dryland cotton holds up better than irrigated in La Niña years');
    cards.push({k:'Irrigation',big:`${fx(n.diff)} vs ${fx(i.diff)}`,cls:'',h,d:`Non-irrigated counties ${fx(n.diff)} (${n.nUnits} ${U}, ${n.sig?'confident':'uncertain'}) vs irrigated ${fx(i.diff)} (${i.nUnits}, ${i.sig?'confident':'uncertain'}), 1972–2018.${n.diff>i.diff?' Caution: yields are per <i>harvested</i> acre — abandoned dryland fields in drought years flatter the survivors.':''}`,go:{cc:'US_NON',tab:'map',sel:'NAT'}}); }
  // 9 quadrant teaser
  { const hs=hemStats('La Niña'); const mine=c.regions.length?quadOf(mean(c.regions.map(r=>r.lat)),mean(c.regions.map(r=>r.lon))):'NW'; const others=QUADS.filter(([k])=>k!==mine&&hs[k]); if(hs[mine]&&others.length) cards.push({k:'Quadrants · La Niña',big:`${mine} ${fx(hs[mine].mean)}`,cls:hs[mine].mean<0?'neg':'pos',h:`${c.name} sits in the ${QUADS.find(q=>q[0]===mine)[1].toLowerCase()} quadrant of the globe`,d:`La Niña runs ${fx(hs[mine].mean)} there (${hs[mine].n} areas), against ${others.map(([k])=>`${k} ${fx(hs[k].mean)}`).join(' · ')}. See the quadrant map in Compare.`,go:{tab:'compare'}}); }
  el.innerHTML=cards.map(c=>`<div class="fc" onclick="goTo(${go(c.go)})"><div class="k"><span>${c.k}</span></div><div class="big ${c.cls}">${c.big}</div><div class="h">${c.h}</div><div class="d">${c.d}</div><div class="go">See the evidence →</div></div>`).join('');
}
window.goTo=function(st){ if(st.cc) S.cc=st.cc; S.zoom=null; if(st.sel==='NAT'){ S.a1=null; S.sel=null; } else if(st.level==='admin1'){ S.a1=st.sel; S.sel=null; } else if(st.sel){ S.sel=st.sel; } if(st.event) S.event=st.event; setTab(st.tab||'map'); };

// ---------- hemispheres
const QUADS=[['NW','North-west','US'],['NE','North-east','India'],['SW','South-west','Brazil · Argentina'],['SE','South-east','']];
const quadOf=(lat,lon)=>(lat>=0?'N':'S')+(lon>=0?'E':'W');
function hemStats(p){
  const groups={NW:[],NE:[],SW:[],SE:[]}; const cset={NW:new Set(),NE:new Set(),SW:new Set(),SE:new Set()};
  for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; for(const r of c.regions){ const st=statsFor(r,cc); if(st[p].nUnits<3||st.neutral.n<5) continue; const q=quadOf(r.lat,r.lon); groups[q].push({d:st[p].diff,w:r.areaMean,cc}); cset[q].add(cc); } }
  const out={}; for(const k of Object.keys(groups)){ const g=groups[k]; if(!g.length){ out[k]=null; continue; } const wm=arr=>d3.sum(arr,x=>x.d*x.w)/d3.sum(arr,x=>x.w); let seed=99+g.length; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const B=300,bs=[]; for(let i=0;i<B;i++){ const smp=[]; for(let j=0;j<g.length;j++) smp.push(g[Math.floor(rnd()*g.length)]); bs.push(wm(smp)); } bs.sort(d3.ascending); out[k]={mean:wm(g),ci:[bs[Math.floor(B*.05)],bs[Math.floor(B*.95)]],n:g.length,countries:[...cset[k]],below:g.filter(x=>x.d<0).length}; }
  return out;
}
function renderHemis(){
  const p=S.hemPhase; const hs=hemStats(p); const host=document.getElementById('hemMap'); host.innerHTML=''; const W=host.clientWidth||600,H=Math.round(W*0.52); const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const proj=d3.geoNaturalEarth1().fitExtent([[4,4],[W-4,H-4]],{type:'Sphere'}); const path=d3.geoPath(proj);
  svg.append('path').datum({type:'Sphere'}).attr('d',path).attr('fill',css('--panel-2')).attr('stroke',css('--line-2'));
  const nat={}; for(const cc of ORDER){ if(DATA.countries[cc]) nat[cc]=statsFor(DATA.countries[cc].national,cc)[p]; }
  const col=d3.scaleDiverging().domain([-15,0,15]).interpolator(t=>d3.interpolateRgbBasis([css('--neg'),css('--mid'),css('--pos')])(t));
  svg.append('g').selectAll('path').data(GEO.WORLD.features).enter().append('path').attr('d',path).attr('fill',f=>f.id&&nat[f.id]?col(nat[f.id].diff):css('--line')).attr('fill-opacity',f=>f.id?(nat[f.id]&&nat[f.id].sig?.95:.5):.6).attr('stroke',css('--bg')).attr('stroke-width',.5)
    .on('mousemove',(ev,f)=>{ if(f.id&&nat[f.id]) showTip(`<b>${META[f.id].name}</b> · ${p}<br>national <b>${fmt1(nat[f.id].diff)}%</b> vs neutral (${nat[f.id].nUnits} ${UNITS()}) · ${nat[f.id].sig?'confident':'uncertain'}`,ev); }).on('mouseleave',hideTip);
  svg.append('path').datum({type:'LineString',coordinates:d3.range(-180,181,2).map(x=>[x,0])}).attr('d',path).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',1).attr('stroke-dasharray','4 3');
  svg.append('path').datum({type:'LineString',coordinates:d3.range(-90,91,2).map(y=>[0,y])}).attr('d',path).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',1).attr('stroke-dasharray','4 3');
  const lab=(txt,lon,lat)=>{ const [x,y]=proj([lon,lat]); svg.append('text').attr('x',x).attr('y',y).attr('fill',css('--ink-2')).style('font-size','11px').style('font-weight',700).attr('text-anchor','middle').text(txt); };
  const QPOS={NW:[-125,48],NE:[95,52],SW:[-120,-42],SE:[110,-42]};
  for(const [k,name] of QUADS){ const h=hs[k]; const [x,y]=proj(QPOS[k]); const g=svg.append('g').attr('transform',`translate(${x},${y})`);
    g.append('rect').attr('x',-58).attr('y',-26).attr('width',116).attr('height',40).attr('rx',9).attr('fill',css('--panel')).attr('fill-opacity',.88).attr('stroke',css('--line-2'));
    g.append('text').attr('y',-11).attr('text-anchor','middle').style('font-size','10.5px').style('font-weight',700).attr('fill',css('--ink-3')).text(k+' · '+name.toLowerCase());
    g.append('text').attr('y',8).attr('text-anchor','middle').style('font-size','15px').style('font-weight',800).attr('fill',h?(h.mean<0?css('--neg'):css('--pos')):css('--ink-3')).text(h?fmt1(h.mean)+'%':'no data'); }
  for(const cc of Object.keys(nat)){ const c=DATA.countries[cc]; const [x,y]=proj([mean(c.regions.map(r=>r.lon)),mean(c.regions.map(r=>r.lat))]); svg.append('text').attr('x',x).attr('y',y-8).attr('text-anchor','middle').style('font-size','12px').style('font-weight',800).attr('fill',css('--ink')).attr('stroke',css('--bg')).attr('stroke-width',3).attr('paint-order','stroke').text(`${fmt1(nat[cc].diff)}%`); }
  svg.append('text').attr('x',W/2).attr('y',H-6).attr('text-anchor','middle').attr('fill',css('--ink-3')).style('font-size','10.5px').text(`${p} years vs neutral · countries coloured by national effect · dashed lines split the globe into four quadrants`);
  const cell=(k,name,who)=>{ const h=hs[k]; return `<div class="cc" style="min-height:118px"><div class="t"><span>${k} · ${name}</span><span class="muted" style="font-size:11px;font-weight:500">${h?h.countries.map(c=>META[c].flag).join(' '):''}</span></div><div class="big ${h?(h.mean<0?'neg':'pos'):'muted'}">${h?fmt1(h.mean)+'%':'—'}</div><div class="muted" style="font-size:12px">${h?`${who} · ${h.n} areas, ${h.below} below trend<br>90% range ${fmt1(h.ci[0])} to ${fmt1(h.ci[1])}% · ${(h.ci[0]>0||h.ci[1]<0)?'<b>confident</b>':'uncertain'}`:'No cotton areas in this dataset yet<br>(Australia would sit here)'}</div></div>`; };
  const have=QUADS.filter(([k])=>hs[k]).map(([k,n])=>({k,n,v:hs[k].mean})).sort((x,y)=>x.v-y.v);
  document.getElementById('hemStats').innerHTML=`<div class="cards" style="grid-template-columns:1fr 1fr">${QUADS.map(([k,n,w])=>cell(k,n,w)).join('')}</div><div class="banner" style="margin-top:10px">In ${p} years the <b>${have[0].k}</b> quadrant fares worst (${fmt1(have[0].v)}%) and the <b>${have[have.length-1].k}</b> best (${fmt1(have[have.length-1].v)}%). North vs south is mostly a timing story — northern cotton grows during an event's build-up, southern cotton through its peak. Each quadrant is effectively one or two countries, so read it alongside the country cards.</div>`;
}

// ---------- ENSO on the globe (animation)
const NINO_BOXES=[{n:'Niño 4',w:160,e:-150,s:-5,no:5},{n:'Niño 3.4',w:-170,e:-120,s:-5,no:5},{n:'Niño 3',w:-150,e:-90,s:-5,no:5},{n:'Niño 1+2',w:-90,e:-80,s:-10,no:0}];
const ZONES={'El Niño':[{t:'wet',n:'Southern US & Gulf · wetter (Nov–Mar)',lon:-95,lat:31,r:9},{t:'wet',n:'Peru–Ecuador coast · wetter',lon:-79,lat:-4,r:5},{t:'wet',n:'SE South America · wetter (Nov–Feb)',lon:-58,lat:-30,r:9},{t:'dry',n:'NE Brazil & Amazon · drier',lon:-45,lat:-6,r:10},{t:'dry',n:'India · weaker monsoon (Jun–Sep)',lon:78,lat:21,r:10},{t:'dry',n:'Indonesia · N Australia · drier',lon:125,lat:-8,r:14},{t:'dry',n:'Southern Africa · drier (Dec–Mar)',lon:27,lat:-22,r:9}],
 'La Niña':[{t:'dry',n:'Southern US & Gulf · drier (Nov–Mar)',lon:-95,lat:31,r:9},{t:'dry',n:'SE South America · drier (Nov–Feb)',lon:-58,lat:-30,r:9},{t:'wet',n:'NE Brazil & Amazon · wetter',lon:-45,lat:-6,r:10},{t:'wet',n:'India · stronger monsoon (Jun–Sep)',lon:78,lat:21,r:10},{t:'wet',n:'Indonesia · N Australia · wetter',lon:125,lat:-8,r:14},{t:'wet',n:'Southern Africa · wetter (Dec–Mar)',lon:27,lat:-22,r:9}]};
const SST=JSON.parse(document.getElementById('SST').textContent); const SSTcache={};
function sstField(year,season){ const k=season+year; if(SSTcache[k]!==undefined) return SSTcache[k]; const i=SST.years.indexOf(year); if(i<0||!SST[season][i]){ SSTcache[k]=null; return null; } const bin=atob(SST[season][i]); const arr=new Int8Array(bin.length); for(let j=0;j<bin.length;j++) arr[j]=(bin.charCodeAt(j)<<24)>>24; SSTcache[k]=arr; return arr; }
function sstAt(arr,lat,lon){ // bilinear on the 4° grid; lon 0..360; returns °C or NaN
  let x=(((lon%360)+360)%360-SST.lon0)/SST.dlon, y=(lat-SST.lat0)/SST.dlat; if(y<0||y>SST.nlat-1) return NaN; x=((x%SST.nlon)+SST.nlon)%SST.nlon; const x0=Math.floor(x),y0=Math.floor(y),x1=(x0+1)%SST.nlon,y1=Math.min(SST.nlat-1,y0+1),fx=x-x0,fy=y-y0; const g=(yy,xx)=>{ const v=arr[yy*SST.nlon+xx]; return v===-128?NaN:v/10; }; const a=g(y0,x0),b=g(y0,x1),c=g(y1,x0),d=g(y1,x1); const vals=[a,b,c,d]; if(vals.every(isNaN)) return NaN; const w=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy]; let s=0,ws=0; for(let i=0;i<4;i++) if(!isNaN(vals[i])){ s+=vals[i]*w[i]; ws+=w[i]; } return ws?s/ws:NaN; }
const G={zones:true,str:'all',year:2025,season:'NDJ',playing:false,timer:null,nodes:null,proj:null,path:null,zoneG:null,tongue:null,px:null,canvas:null};
function globeYears(){ const ys=[]; for(let y=Math.max(1950,S.minYear);y<=2025;y++){ if(G.str==='all'){ ys.push(y); continue; } let hit=false; for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; const p=c.phases[y]; if(p&&p.event&&(G.str==='strong'?/strong/.test(p.intensity):p.intensity===G.str)) hit=true; } if(hit) ys.push(y); } return ys; }
function oniAt(year,sidx){ const i=DATA.oni.year.findIndex((y,k)=>y===year&&DATA.oni.season[k]===['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ'][sidx]); return i>=0?DATA.oni.v[i]:null; }
function renderGlobe(){
  const host=document.getElementById('globeMap'); if(!host) return; host.innerHTML=`<div class="globe-badge" id="globeBadge"><div class="r1"><span class="yr" id="gbYear">—</span><span class="tag" id="gbSeason">Nov–Jan</span></div><div class="ev" id="gbEvent">—</div><div class="kv2"><div><span>ONI</span><b id="gbOni">—</b></div><div><span>Event peak</span><b id="gbPeak">—</b></div><div><span>Event</span><b id="gbLabel">—</b></div></div><div class="meter"><i id="gbMark" style="left:50%"></i></div><div class="ticks"><span>La Niña −2.5</span><span>0</span><span>+2.5 El Niño</span></div></div>`; const W=host.clientWidth||1000,H=Math.round(W*0.5);
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; cv.style.cssText=`position:absolute;left:0;top:0;width:100%;height:auto;border-radius:12px`; host.appendChild(cv); G.canvas=cv;
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`).style('position','relative');
  const proj=d3.geoNaturalEarth1().rotate([-200,0]).fitExtent([[4,4],[W-4,H-4]],{type:'Sphere'}); const path=d3.geoPath(proj); G.proj=proj; G.path=path;
  // precompute pixel -> (lat,lon) at 2px blocks
  const step=2; const px=[]; for(let y=0;y<H;y+=step) for(let x=0;x<W;x+=step){ const ll=proj.invert([x+1,y+1]); if(!ll||!isFinite(ll[0])||Math.abs(ll[1])>90) continue; const back=proj(ll); if(!back||Math.abs(back[0]-x-1)>2||Math.abs(back[1]-y-1)>2) continue; px.push(x,y,ll[1],ll[0]); } G.px=new Float32Array(px); G.step=step;
  svg.append('path').datum({type:'Sphere'}).attr('d',path).attr('fill','none').attr('stroke',css('--line-2'));
  svg.append('path').datum(d3.geoGraticule10()).attr('d',path).attr('fill','none').attr('stroke',css('--line')).attr('stroke-width',.4);
  svg.append('g').selectAll('path').data(GEO.WORLD.features).enter().append('path').attr('d',path).attr('fill',f=>f.id?css('--line-2'):css('--line')).attr('fill-opacity',.95).attr('stroke',css('--bg')).attr('stroke-width',.4);
  // zones
  G.zoneG=svg.append('g');
  // Niño boxes
  const bx=svg.append('g'); for(const b of NINO_BOXES){ const ring=[[b.w,b.s],[b.e,b.s],[b.e,b.no],[b.w,b.no],[b.w,b.s]]; const poly={type:'Polygon',coordinates:[ring.reverse()]}; bx.append('path').datum(poly).attr('d',path).attr('class','nino-box').attr('data-n',b.n).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',b.n==='Niño 3.4'?1.4:.6).attr('stroke-opacity',b.n==='Niño 3.4'?.95:.5).on('mousemove',ev=>showTip(`<b>${b.n}</b><br><span class="mut">${b.n==='Niño 3.4'?'ONI is the 3-month mean SST anomaly here':'NOAA SST monitoring region'}</span>`,ev)).on('mouseleave',hideTip); }
  const [lx,ly]=proj([-145,6.5]); svg.append('text').attr('x',lx).attr('y',ly).attr('text-anchor','middle').style('font-size','11px').style('font-weight',700).attr('fill',css('--accent')).attr('stroke',css('--bg')).attr('stroke-width',3).attr('paint-order','stroke').text('Niño 3.4 box — ONI measured here');
  const [tx,ty]=proj([-130,-12]); G.tongue=svg.append('text').attr('x',tx).attr('y',ty).attr('text-anchor','middle').style('font-size','22px').style('font-weight',800).style('letter-spacing','-.01em').attr('stroke',css('--bg')).attr('stroke-width',5).attr('paint-order','stroke');
  // cotton dots
  const dots=[]; for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; for(const r of c.regions) dots.push({cc,r,xy:proj([r.lon,r.lat])}); }
  G.nodes=svg.append('g').selectAll('circle').data(dots).enter().append('circle').attr('cx',d=>d.xy[0]).attr('cy',d=>d.xy[1]).attr('r',2.2).attr('fill',css('--neutral')).attr('fill-opacity',.8).attr('stroke','none')
    .on('mousemove',(ev,d)=>{ const an=anomAt(d.r,G.year); showTip(`<b>${d.r.name}</b> · ${d.r.admin1}<br>crop year ${G.year}: ${an==null?'no data':`<b class="${an<0?'neg':'pos'}">${fmt1(an)}%</b> from trend`}`,ev); }).on('mouseleave',hideTip);
  G.zoneLabG=svg.append('g').attr('pointer-events','none');
  // legend
  const lg=svg.append('g').attr('transform',`translate(${W-230},${H-48})`); lg.append('rect').attr('width',222).attr('height',40).attr('rx',8).attr('fill',css('--panel')).attr('fill-opacity',.9).attr('stroke',css('--line'));
  const grad=svg.append('defs').append('linearGradient').attr('id','gcolor'); grad.append('stop').attr('offset','0%').attr('stop-color',css('--neg')); grad.append('stop').attr('offset','50%').attr('stop-color',css('--mid')); grad.append('stop').attr('offset','100%').attr('stop-color',css('--pos'));
  lg.append('rect').attr('x',10).attr('y',8).attr('width',100).attr('height',7).attr('rx',3).attr('fill','url(#gcolor)'); lg.append('text').attr('x',10).attr('y',30).style('font-size','10px').attr('fill',css('--ink-3')).text('cotton −40%'); lg.append('text').attr('x',110).attr('y',30).attr('text-anchor','end').style('font-size','10px').attr('fill',css('--ink-3')).text('+40%'); const g2=svg.append('defs').append('linearGradient').attr('id','gsst'); g2.append('stop').attr('offset','0%').attr('stop-color','#3c5ef0'); g2.append('stop').attr('offset','50%').attr('stop-color',css('--panel-2')); g2.append('stop').attr('offset','100%').attr('stop-color','#f04a30'); lg.append('rect').attr('x',122).attr('y',8).attr('width',90).attr('height',7).attr('rx',3).attr('fill','url(#gsst)'); lg.append('text').attr('x',122).attr('y',30).style('font-size','10px').attr('fill',css('--ink-3')).text('sea −3 °C'); lg.append('text').attr('x',212).attr('y',30).attr('text-anchor','end').style('font-size','10px').attr('fill',css('--ink-3')).text('+3 °C');
  const ys=globeYears(); const sl=document.getElementById('globeYear'); sl.min=0; sl.max=Math.max(0,ys.length-1); G.years=ys; if(!ys.includes(G.year)) G.year=ys[ys.length-1]||2025; sl.value=ys.indexOf(G.year); globeFrame();
}
function globeFrame(){
  const y=G.year; const col=d3.scaleDiverging().domain([-40,0,40]).interpolator(t=>d3.interpolateRgbBasis([css('--neg'),css('--mid'),css('--pos')])(t));
  G.nodes.attr('fill',d=>{ const an=anomAt(d.r,y); return an==null?css('--neutral'):col(an); }).attr('fill-opacity',d=>anomAt(d.r,y)==null?.35:.95).attr('r',d=>{ const an=anomAt(d.r,y); return an==null?1.8:2.2+Math.min(3,Math.abs(an)/15); });
  // ONI for the season most relevant: use US window peak (ASO) and DJF of the following year for the southern crops → show both
  const oDJF=oniAt(y,0), oJAS=oniAt(y,7), oNDJ=oniAt(y,11); const oc=d3.scaleDiverging().domain([-2.5,0,2.5]).interpolator(t=>d3.interpolateRgbBasis([css('--nina'),css('--neutral'),css('--nino')])(t));
  paintSST(y);
  const sidx=G.season==='NDJ'?11:7; const oni=G.season==='NDJ'?oNDJ:oJAS; const tt=y+sidx/12; const ev=DATA.events.find(e=>e.start_t<=tt+1e-6&&tt<=e.end_t+1e-6);
  const kind= ev? ev.type : (oni==null?'—':(oni>=0.5?'El Niño-like':oni<=-0.5?'La Niña-like':'Neutral'));
  const colr= ev? (ev.type==='El Niño'?css('--nino'):css('--nina')) : css('--ink-2');
  const pos=oni==null?50:Math.max(0,Math.min(100,(oni+2.5)/5*100));
  const $=id=>document.getElementById(id); if($('gbYear')){ $('gbYear').textContent=y; $('gbSeason').textContent=G.season==='NDJ'?'Nov–Jan':'Jul–Sep'; const evEl=$('gbEvent'); evEl.textContent=ev?`${ev.type} · ${ev.intensity}`:kind; evEl.style.color=colr; $('gbOni').textContent=oni==null?'—':(oni>0?'+':'')+oni.toFixed(2)+' °C'; $('gbPeak').textContent=ev?(ev.peak>0?'+':'')+ev.peak.toFixed(2)+' °C':'—'; $('gbLabel').textContent=ev?ev.label:(kind.endsWith('-like')?'short spell':'none'); $('gbMark').style.left=pos+'%'; }
  if(G.tongue) G.tongue.text(ev?ev.type.toUpperCase():(kind==='Neutral'?'NEUTRAL':'')).attr('fill',colr).attr('opacity',ev?1:.55);
  G.curEvent=ev?ev.id:null; drawZones(ev?ev.type:null,ev?ev.intensity:null); movePlayhead();
  const evs=[]; for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; const p=c.phases[y]; if(p&&p.event) evs.push(`${META[cc].flag} ${p.phase} ${p.intensity}`); }
  document.getElementById('globeLabel').textContent=`Cotton harvests tied to an event this year: ${evs.length?evs.join(' · '):'none'}`;
}
function paintSST(year){
  const cv=G.canvas; if(!cv||!G.px) return; const ctx=cv.getContext('2d'); ctx.clearRect(0,0,cv.width,cv.height); const arr=sstField(year,G.season); if(!arr){ return; }
  const px=G.px, st=G.step; const img=ctx.createImageData(cv.width,cv.height); const data=img.data; const W=cv.width; const dark=document.documentElement.dataset.theme!=='light';
  const base=dark?[26,29,36]:[246,246,243]; const blue=dark?[66,120,235]:[70,110,220], red=dark?[235,78,52]:[220,60,40];
  const colAt=(v)=>{ const t=Math.max(-1,Math.min(1,v/3)); const k=Math.pow(Math.abs(t),1.15); const tg=t<0?blue:red; return [Math.round(base[0]+(tg[0]-base[0])*k),Math.round(base[1]+(tg[1]-base[1])*k),Math.round(base[2]+(tg[2]-base[2])*k)]; };

  for(let i=0;i<px.length;i+=4){ const x=px[i],y=px[i+1]; const v=sstAt(arr,px[i+2],px[i+3]); let c; if(isNaN(v)) c=base; else { c=colAt(v); } for(let dy=0;dy<st;dy++) for(let dx=0;dx<st;dx++){ const k=((y+dy)*W+(x+dx))*4; data[k]=c[0]; data[k+1]=c[1]; data[k+2]=c[2]; data[k+3]=255; } }
  ctx.putImageData(img,0,0);
}
function seasonT(y){ return y+(G.season==='NDJ'?11:7)/12; }
function movePlayhead(){ const o=G.oni; if(!o||!o.x) return; const tt=seasonT(G.year); const X=o.x(tt); const w=Math.max(3,o.x(tt+3/12)-o.x(tt)); const oni=G.season==='NDJ'?oniAt(G.year,11):oniAt(G.year,7);
  o.ph.select('.ph-band').attr('x',X-w/2).attr('width',w); o.ph.select('.ph-line').attr('x1',X).attr('x2',X); o.ph.select('.ph-dot').attr('cx',X).attr('cy',o.y(oni==null?0:oni)); o.ph.select('.ph-lab').attr('x',X).text(`${G.season==='NDJ'?'Nov–Jan':'Jul–Sep'} ${G.year}`);
  document.querySelectorAll('#eventsStrip button').forEach(b=>b.classList.toggle('playing',b.dataset.id===G.curEvent)); }
function jumpGlobe(tt){ const off=(G.season==='NDJ'?11:7)/12; let y=Math.round(tt-off); y=Math.max(1950,Math.min(2025,y)); if(!G.years.includes(y)){ G.str='all'; document.querySelectorAll('#globeStr button').forEach(b=>b.classList.toggle('active',b.dataset.s==='all')); renderGlobe(); } G.year=y; document.getElementById('globeYear').value=G.years.indexOf(y); globeFrame(); }
window.focusEvent=function(e){ S.event=e.id; if(S.tab==='area'){ renderEventsStrip(); renderCrumbs(); renderEventPanel(); writeHash(); return; } const pk=e.peakYear+['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ'].indexOf(e.peakSeason)/12; renderEventsStrip(); renderCrumbs(); renderEventPanel(); renderEventCountries(); writeHash(); jumpGlobe(Math.min(Math.max(pk,e.start_t),e.end_t)); const g=document.getElementById('globeMap'); if(g){ const r=g.getBoundingClientRect(); if(r.top<0||r.top>innerHeight*0.6) document.getElementById('eventsStrip').scrollIntoView({behavior:'smooth',block:'start'}); } };
function drawZones(phase,intensity){
  const z=G.zoneG; if(!z) return; z.selectAll('*').remove(); if(G.zoneLabG) G.zoneLabG.selectAll('*').remove(); if(!G.zones||!phase) return; const path=G.path, proj=G.proj;
  for(const zn of ZONES[phase]){ const circ=d3.geoCircle().center([zn.lon,zn.lat]).radius(zn.r)(); const c=zn.t==='wet'?css('--nina'):css('--nino');
    const k={weak:0,moderate:1,strong:2,'very strong':3}[intensity]??1; z.append('path').datum(circ).attr('d',path).attr('fill',c).attr('fill-opacity',[.07,.14,.22,.3][k]).attr('stroke',c).attr('stroke-dasharray',k>=2?null:'4 3').attr('stroke-width',[0.8,1.2,1.8,2.4][k]).on('mousemove',ev=>showTip(`<b>${zn.n}</b><br><span class="mut">what a ${phase} usually brings here · schematic · drawn ${intensity||''} for this event</span>`,ev)).on('mouseleave',hideTip);
    const [x,y]=proj([zn.lon,zn.lat]); G.zoneLabG.append('text').attr('x',x).attr('y',y-zn.r*2.3-4).attr('text-anchor','middle').style('font-size','10.5px').style('font-weight',700).attr('fill',c).attr('stroke',css('--bg')).attr('stroke-width',3).attr('paint-order','stroke').text(zn.t==='wet'?'usually wetter':'usually drier'); }
}
function globeStep(){ const ys=G.years; const i=ys.indexOf(G.year); const j=(i+1)%ys.length; G.year=ys[j]; document.getElementById('globeYear').value=j; globeFrame(); }
document.getElementById('globePlay').onclick=()=>{ G.playing=!G.playing; document.getElementById('globePlay').textContent=G.playing?'❚❚ Pause':'▶ Play'; clearInterval(G.timer); if(G.playing) G.timer=setInterval(globeStep,700); };
document.getElementById('globeYear').oninput=e=>{ G.year=G.years[+e.target.value]; globeFrame(); };
document.getElementById('globeZones').onchange=e=>{ G.zones=e.target.checked; globeFrame(); };
seg('globeStr','s',v=>{ G.str=v; renderGlobe(); });
seg('globeSeason','s',v=>{ G.season=v; globeFrame(); });


// ---------- sources tab
const REPO='https://github.com/Leoanish/cotton-enso-explorer';
const RAWDIR=p=>`${REPO}/tree/main/${p}`;
function renderSources(){
  const C=DATA.countries, n=cc=>C[cc]?C[cc].regions.length:0, yr=cc=>C[cc]?`${C[cc].yearRange[0]}–${C[cc].yearRange[1]}`:'–';
  const L=(href,label,primary)=>`<a href="${href}" target="_blank" rel="noopener"${primary?' class="primary"':''}>${label} ↗</a>`;
  document.getElementById('srcHeroLinks').innerHTML=L(REPO,'GitHub repository',true)+L(`${REPO}/tree/main/data/raw`,'All raw data')+L(`${REPO}#rebuilding`,'How to rebuild');
  const groups=[
   {t:'ENSO — the climate signal',items:[
     {ic:'🌊',nm:'Oceanic Niño Index (ONI)',pub:'NOAA Climate Prediction Center',use:'3-month running mean of sea-surface temperature anomaly in the Niño 3.4 region. Defines every El Niño and La Niña event, its strength, and which crop years it touched.',
      kv:[['Coverage',`${DATA.oni.year[0]} → ${DATA.oni.season[DATA.oni.season.length-1]} ${DATA.oni.year[DATA.oni.year.length-1]}, every season`],['Unit','°C anomaly'],['Threshold','±0.5 °C for ≥ 5 seasons = event']],
      links:[L('https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v5/','Official ONI table',true),L('https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt','Data file'),L('https://github.com/ahuang11/oni','Mirror we pulled'),L(RAWDIR('data/raw/noaa'),'Our copy')],
      notes:[['warn','NOAA now publishes an ERSST v6-based ONI and, since NWS statement 26-05, uses the <b>Relative ONI (RONI)</b> for official ENSO monitoring. This dashboard uses the ERSST v5 ONI, which CPC still updates monthly. '+L('https://cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/v5/','RONI table')]]},
     {ic:'🌡️',nm:'ERSST v5 sea-surface temperature',pub:'NOAA NCEI · served by NOAA PSL',use:'Monthly global sea-surface temperature on a 2° grid. We compute Nov–Jan and Jul–Sep anomalies against 1991–2020 for every year and show them on the animated globe.',
      kv:[['Coverage','1854 → present, monthly; we use 1950–2025'],['Grid','2° (shown at 4°)'],['File','sst.mnmean.nc, ~160 MB']],
      links:[L('https://www.ncei.noaa.gov/products/extended-reconstructed-sst','Official product page',true),L('https://psl.noaa.gov/thredds/catalog/Datasets/noaa.ersst.v5/catalog.html','File catalog'),L(RAWDIR('data/raw/ersst'),'How to download')],
      notes:[['','Too large for GitHub, so the repo stores the processed fields (<b>data/processed/sst_fields.json</b>) and a one-line script that re-downloads the original.']]},
     {ic:'🗺️',nm:'Typical El Niño / La Niña impact zones',pub:'NOAA Climate.gov, after the Climate Prediction Center',use:'The dashed "usually wetter / usually drier" circles on the globe. Drawn by hand from NOAA\'s published global-impact maps — a schematic, not data for any particular year.',
      kv:[['Type','Schematic, not measured'],['Seasons','Dec–Feb and Jun–Aug patterns']],
      links:[L('https://www.climate.gov/news-features/featured-images/global-impacts-el-nino-and-la-nina','NOAA impact maps',true)]}
   ]},
   {t:'Cotton yields — the crop response',items:[
     {ic:'🇺🇸',nm:'USDA NASS Quick Stats',pub:'U.S. Department of Agriculture, National Agricultural Statistics Service',use:'Upland cotton yield (lb/acre) and harvested acres by county, from the annual survey program, plus the irrigated / non-irrigated splits behind the Practice setting.',
      kv:[['Coverage',`${n('US')} counties, ${yr('US')}; irrigation splits ${yr('US_IRR')}`],['Unit','lb/acre × 1.121 → kg lint/ha'],['Query','Survey · Crops · Field crops · Cotton · Yield / Area harvested · County']],
      links:[L('https://quickstats.nass.usda.gov/','Quick Stats',true),L('https://quickstats.nass.usda.gov/api','API documentation'),L(RAWDIR('data/raw/usda_nass'),'Our copy (6 files)')],
      notes:[['','Public domain (U.S. Government work). Counties reported under "Other (combined) counties" are excluded because they can\'t be mapped.']]},
     {ic:'🇧🇷',nm:'IBGE — Produção Agrícola Municipal (PAM)',pub:'Instituto Brasileiro de Geografia e Estatística',use:'Harvested area and production of algodão herbáceo (seed cotton) for every município. Table 5457 covers 2000 onward; table 1612 supplies 1974–1999.',
      kv:[['Coverage',`${n('BR')} municipalities, ${yr('BR')}`],['Unit','t seed cotton → × 0.40 ginning turnout → kg lint/ha'],['Variables','214 production · 216 area harvested · product 2688']],
      links:[L('https://sidra.ibge.gov.br/Tabela/5457','SIDRA table 5457',true),L('https://sidra.ibge.gov.br/Tabela/1612','SIDRA table 1612'),L('https://apisidra.ibge.gov.br/values/t/1612/n6/all/v/214,216/p/1990/c81/2688','Example API query'),L('https://github.com/elisiara/agrodata','2000–2025 export'),L(RAWDIR('data/raw/ibge'),'Our copy')],
      notes:[['','Seed-cotton yields are converted with one fixed turnout, so Brazilian yield <i>levels</i> are approximate; the % effects are unaffected.']]},
     {ic:'🇮🇳',nm:'ICRISAT District Level Database (DLD)',pub:'International Crops Research Institute for the Semi-Arid Tropics',use:'Cotton area and production by district, compiled by ICRISAT from Indian government statistics and harmonised to fixed district boundaries.',
      kv:[['Coverage',`${n('IN')} districts, ${yr('IN')}`],['Unit','170-kg bales → tonnes → kg lint/ha'],['Files','1966–2017 apportioned + 1990–2019 series']],
      links:[L('http://data.icrisat.org/dld/index.html','ICRISAT DLD',true),L('https://github.com/2026ak05087/ML','1966–2017 mirror'),L('https://github.com/KalaRenganathan/causal-ml-crop-yield','1990–2019 mirror'),L(RAWDIR('data/raw/icrisat'),'Our copy')],
      notes:[['','The two series are joined at 1990 only where district codes and names match.']]},
     {ic:'🇦🇷',nm:'Estimaciones Agrícolas — algodón',pub:'Ministerio de Economía (Argentina), Dirección de Estimaciones Agrícolas',use:'Area sown and harvested, production and yield of cotton by departamento for every campaign.',
      kv:[['Coverage',`${n('AR')} departments, ${yr('AR')}`],['Unit','t seed cotton → × 0.33 ginning turnout → kg lint/ha'],['Season label','harvest year (2019/20 campaign → 2020)']],
      links:[L('https://datos.magyp.gob.ar/dataset/estimaciones-agricolas','Open-data portal',true),L(RAWDIR('data/raw/magyp'),'Our copy')],
      notes:[['','Rows with an undefined department ("sin definir") are excluded because they can\'t be mapped.']]}
   ]},
   {t:'Maps & boundaries',items:[
     {ic:'🧭',nm:'U.S. counties and states',pub:'U.S. Census Bureau via us-atlas',use:'County shapes and centroids for the US map.',kv:[['Scale','1:10,000,000']],links:[L('https://github.com/topojson/us-atlas','us-atlas',true)]},
     {ic:'🌍',nm:'World countries',pub:'Natural Earth via world-atlas',use:'Country outlines on the globe and quadrant maps.',kv:[['Scale','1:110,000,000']],links:[L('https://github.com/topojson/world-atlas','world-atlas',true),L('https://www.naturalearthdata.com/','Natural Earth')]},
     {ic:'🧭',nm:'Brazil municipalities & states',pub:'IBGE boundaries, via pam-dashboard',use:'Município shapes and state outlines for Brazil.',kv:[['Format','GeoJSON']],links:[L('https://github.com/rschapo/pam-dashboard','pam-dashboard',true),L(RAWDIR('data/raw/boundaries'),'Our copy')]},
     {ic:'🧭',nm:'India districts',pub:'Census 2011 boundaries, via india-maps-data',use:'District shapes, matched to ICRISAT districts by census code.',kv:[['Format','GeoJSON']],links:[L('https://github.com/udit-001/india-maps-data','india-maps-data',true),L(RAWDIR('data/raw/boundaries'),'Our copy')]},
     {ic:'🧭',nm:'Argentina departments',pub:'via departamentos_argentina',use:'Department shapes and province outlines, matched by province and name.',kv:[['Format','GeoJSON']],links:[L('https://github.com/mgaitan/departamentos_argentina','departamentos_argentina',true),L(RAWDIR('data/raw/boundaries'),'Our copy')]}
   ]},
   {t:'What we did to the data',items:[
     {ic:'⚙️',nm:'Processing & method',pub:'This project',use:'Matching each crop year to an event through its country\'s growing window, detrending every area\'s yields, computing effects against neutral years, and the 90% bootstrap ranges.',
      kv:[['Scripts','scripts/build_core.py, build_data.py, build_sst.py'],['Rebuild','make all  (≈ 15 s)']],
      links:[`<a href="#" onclick="setTab('data');setTimeout(()=>document.getElementById('foot').scrollIntoView({behavior:'smooth'}),200);return false;" class="primary">Full method ↓</a>`,L(`${REPO}/tree/main/scripts`,'Scripts'),L(`${REPO}/tree/main/data/processed`,'Processed data')]},
     {ic:'📄',nm:'Cite this dashboard',pub:'Bhattarai, A. (2026). Cotton × ENSO Explorer.',use:'If you use the dashboard or its harmonised dataset, please cite it and the original providers above.',
      kv:[['Code licence','MIT'],['Data','each source under its own terms']],
      links:[L(`${REPO}/blob/main/CITATION.cff`,'Citation file',true),L(`${REPO}/blob/main/LICENSE`,'Licence')]}
   ]}
  ];
  document.getElementById('srcGroups').innerHTML=groups.map(g=>`<div class="src-group"><h3>${g.t}</h3><div class="src-grid">${g.items.map(s=>`<div class="src"><div class="hd"><div class="ic">${s.ic}</div><div><div class="nm">${s.nm}</div><div class="pub">${s.pub}</div></div></div><div class="use">${s.use}</div>${s.kv?`<div class="kv3">${s.kv.map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join('')}</div>`:''}<div class="links">${s.links.join('')}</div>${(s.notes||[]).map(([c,x])=>`<div class="note ${c}">${x}</div>`).join('')}</div>`).join('')}</div></div>`).join('');
}

// ---------- compare tab
function renderCompare(){ renderHemis();
  const host=document.getElementById('pinCards'); const chart=document.getElementById('pinChart');
  if(!S.pins.length){ host.innerHTML='<div class="banner">Nothing pinned yet. In Explore, open a country, state or county and press 📌 Pin. Pins work across countries.</div>'; chart.innerHTML=''; }
  else {
    const items=S.pins.map(p=>{ const f=findAny(p.id,p.cc); return f?{...p,r:f.r,level:f.level,st:statsFor(f.r,p.cc),c:DATA.countries[p.cc]}:null; }).filter(Boolean);
    host.innerHTML=items.map((d,i)=>`<div class="cc"><div class="t"><span><span class="flag">${META[baseCC(d.cc)].flag}</span> ${d.r.name}</span><button class="btn sm" onclick="unpin(${i})">×</button></div><div class="muted" style="font-size:12px">${d.r.admin1||d.level} · ${d.c.name}${d.c.variantOf?' ('+d.c.name.split('· ')[1]+')':''}</div><div style="display:flex;gap:14px;margin-top:8px"><div><div class="muted" style="font-size:11px">El Niño</div><div class="big ${d.st['El Niño'].n?(d.st['El Niño'].diff<0?'neg':'pos'):'muted'}" style="font-size:22px">${d.st['El Niño'].n?fmt1(d.st['El Niño'].diff)+'%':'–'}</div><div class="muted" style="font-size:11px">${d.st['El Niño'].sig?'confident':'uncertain'} · n=${d.st['El Niño'].nUnits}</div></div><div><div class="muted" style="font-size:11px">La Niña</div><div class="big ${d.st['La Niña'].n?(d.st['La Niña'].diff<0?'neg':'pos'):'muted'}" style="font-size:22px">${d.st['La Niña'].n?fmt1(d.st['La Niña'].diff)+'%':'–'}</div><div class="muted" style="font-size:11px">${d.st['La Niña'].sig?'confident':'uncertain'} · n=${d.st['La Niña'].nUnits}</div></div><div><div class="muted" style="font-size:11px">Neutral avg</div><div class="big" style="font-size:22px">${fmt0(Math.round(d.st.neutral.yieldMean))}</div><div class="muted" style="font-size:11px">${d.c.unit.split(' ')[0]}</div></div></div></div>`).join('');
    chart.innerHTML=''; const W=chart.clientWidth||900,H=240,m={t:14,r:16,b:28,l:44}; const svg=d3.select(chart).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
    const allS=items.map(d=>d.st.series); const x=d3.scaleLinear().domain([d3.min(allS,s=>s[0].year),d3.max(allS,s=>s[s.length-1].year)]).range([m.l,W-m.r]); const lim=Math.min(80,Math.ceil(d3.max(allS,s=>d3.max(s,d=>Math.abs(d.anom)))/10)*10||30); const y=d3.scaleLinear().domain([-lim,lim]).range([H-m.b,m.t]);
    axisY(svg,y,m,W,d=>(d>0?'+':'')+d+'%'); svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',css('--ink-3'));
    const ph=country().phases; const yrs=Object.keys(ph).map(Number).filter(y=>y>=S.minYear&&ph[y].event&&passes(ph[y])); const bw=Math.max(1,(x(1)-x(0))); yrs.forEach(yy=>svg.append('rect').attr('x',x(yy)-bw/2).attr('y',m.t).attr('width',bw).attr('height',H-m.b-m.t).attr('fill',phColor(ph[yy].phase)).attr('opacity',.1));
    const cols=[css('--accent'),'#9b7bff','#2ec4b6','#ff6bb5']; items.forEach((d,i)=>{ svg.append('path').datum(d.st.series).attr('d',d3.line().x(p=>x(p.year)).y(p=>y(p.anom)).curve(d3.curveMonotoneX)).attr('fill','none').attr('stroke',cols[i]).attr('stroke-width',2); svg.append('text').attr('x',m.l+6).attr('y',m.t+12+i*14).attr('fill',cols[i]).style('font-size','11px').style('font-weight',700).text(d.r.name); });
    svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(12).tickFormat(d3.format('d')).tickSize(3));
    svg.append('text').attr('x',W-m.r).attr('y',m.t+10).attr('text-anchor','end').attr('fill',css('--ink-3')).style('font-size','10.5px').text(`% from trend · shading = ${country().name} event years`);
  }
  // ranking
  const p=S.rankPhase; const all=[]; for(const cc of ORDER){ const c=DATA.countries[cc]; if(!c) continue; for(const r of c.regions){ const st=statsFor(r,cc); if(st[p].nUnits>=5&&st.neutral.n>=5&&st[p].sig) all.push({cc,r,d:st[p].diff,n:st[p].nUnits,ci:st[p].ci}); } }
  all.sort((a,b)=>a.d-b.d); const li=(d,i)=>`<li onclick="S.cc='${d.cc}';S.sel='${d.r.id}';S.zoom=null;setTab('map')"><span><span class="n">${i+1}</span>${META[d.cc].flag} ${d.r.name} <span class="muted">${d.r.admin1}</span></span><b class="${d.d<0?'neg':'pos'}">${fmt1(d.d)}%</b></li>`;
  document.getElementById('rankWorst').innerHTML=all.slice(0,12).map(li).join(''); document.getElementById('rankBest').innerHTML=all.slice(-12).reverse().map(li).join('');
  document.getElementById('rankNote').textContent=`${all.length} areas with a confident ${p} effect (≥5 ${p} and ≥5 neutral years, 90% range excludes zero) · click to open`;
  // national cards + chart
  const nats=ORDER.filter(cc=>DATA.countries[cc]).map(cc=>({cc,c:DATA.countries[cc],st:statsFor(DATA.countries[cc].national,cc)}));
  document.getElementById('natCards').innerHTML=nats.map(d=>`<div class="cc"><div class="t"><span><span class="flag">${META[d.cc].flag}</span> ${d.c.name}</span></div><div style="display:flex;gap:12px;margin-top:6px"><div><div class="muted" style="font-size:11px">El Niño</div><div class="big ${d.st['El Niño'].diff<0?'neg':'pos'}" style="font-size:20px">${fmt1(d.st['El Niño'].diff)}%</div></div><div><div class="muted" style="font-size:11px">La Niña</div><div class="big ${d.st['La Niña'].diff<0?'neg':'pos'}" style="font-size:20px">${fmt1(d.st['La Niña'].diff)}%</div></div></div><div class="muted" style="font-size:11px">n = ${d.st['El Niño'].n} / ${d.st['La Niña'].n} · ${d.c.yearRange[0]}–${d.c.yearRange[1]}</div></div>`).join('');
  const nc=document.getElementById('natChart'); nc.innerHTML=''; const W=nc.clientWidth||600,H=200,m={t:14,r:16,b:28,l:44}; const svg=d3.select(nc).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([Math.max(1950,S.minYear),2025]).range([m.l,W-m.r]); const y=d3.scaleLinear().domain([-30,30]).range([H-m.b,m.t]); axisY(svg,y,m,W,d=>(d>0?'+':'')+d+'%'); svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',css('--ink-3'));
  const cols={US:css('--accent'),BR:'#2ec4b6',IN:'#9b7bff',AR:'#ff6bb5'}; nats.forEach(d=>{ svg.append('path').datum(d.st.series).attr('d',d3.line().x(p=>x(p.year)).y(p=>y(Math.max(-30,Math.min(30,p.anom)))).curve(d3.curveMonotoneX)).attr('fill','none').attr('stroke',cols[d.cc]).attr('stroke-width',1.8).attr('opacity',.9); });
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')).tickSize(3));
  nats.forEach((d,i)=>svg.append('text').attr('x',m.l+6+i*90).attr('y',m.t+10).attr('fill',cols[d.cc]).style('font-size','11px').style('font-weight',700).text(d.c.name));
}
window.unpin=function(i){ S.pins.splice(i,1); renderCompare(); renderCrumbs(); };


// ---------- table
function renderTable(r){
  const c=country(); let s=seriesOf(r); const {col,dir}=S.sort; const key={year:d=>d.year,phase:d=>d.rawPhase,oni:d=>d.oni??-99,yield:d=>d.yield,trend:d=>d.trend,anom:d=>d.anom,area:d=>d.area??-1}[col]; s=s.slice().sort((a,b)=>(key(a)>key(b)?1:key(a)<key(b)?-1:0)*dir);
  const th=(k,l)=>`<th data-col="${k}">${l}${col===k?(dir>0?' ▲':' ▼'):''}</th>`;
  document.getElementById('yrTable').innerHTML=`<thead><tr>${th('year','Year')}${th('phase','Phase')}${th('oni','Window ONI')}${th('yield','Yield ('+c.unit.split(' ')[0]+')')}${th('trend','Trend')}${th('anom','% from trend')}${th('area','Harvested ha')}</tr></thead><tbody>`+s.map(d=>`<tr class="${d.phase==='El Niño'?'ev-nino':d.phase==='La Niña'?'ev-nina':''}"><td>${d.year}</td><td><span class="pill ${PH[d.rawPhase]}" ${d.excluded?'style="opacity:.5"':''}>${d.rawPhase}${d.intensity?' · '+d.intensity:''}${d.excluded?' · excluded':''}</span></td><td>${d.oni==null?'–':(d.oni>0?'+':'')+d.oni.toFixed(2)}</td><td>${fmt0(Math.round(d.yield))}</td><td>${fmt0(Math.round(d.trend))}</td><td class="${d.anom<0?'neg':'pos'}"><b>${fmt1(d.anom)}%</b></td><td>${d.area?fmt0(Math.round(d.area)):'–'}</td></tr>`).join('')+'</tbody>';
  document.querySelectorAll('#yrTable th').forEach(h=>h.onclick=()=>{ const k=h.dataset.col; S.sort= S.sort.col===k?{col:k,dir:-S.sort.dir}:{col:k,dir:k==='year'?-1:1}; renderTable(r); });
}

function renderFoot(){
  document.getElementById('foot').innerHTML=`<h4>Method</h4>
  <b>Events.</b> NOAA's Oceanic Niño Index (3-month running mean of ERSSTv5 anomalies, Niño 3.4). An event is ≥5 consecutive overlapping seasons at or beyond ±0.5 °C; strength is the peak category held for ≥3 seasons (weak &lt;1.0, moderate 1.0–1.4, strong 1.5–1.9, very strong ≥2.0 °C). Using hundredths merges a few back-to-back events (e.g. 2014–16) relative to CPC's table.<br>
  <b>Which crop year an event hits.</b> Each crop year takes the mean ONI over the country's growing window — ${Object.entries(DATA.windows).map(([k,v])=>`<b>${k}</b> ${v}`).join('; ')}. ≥ +0.5 and overlapping an El Niño → El Niño year; ≤ −0.5 and overlapping a La Niña → La Niña year; otherwise neutral. So "El Niño years" are the harvests whose growing season ran during the event.<br>
  <b>Event strength.</b> "Moderate+" (default) leaves crop years tied to weak events out of every group, so they neither dilute the signal nor pose as neutral years. Strength is the event's peak category, not that year's ONI.<br>
  <b>Yield deviation.</b> Each place gets a robust LOWESS trend through its own yields (span ≈ 14 years, min 35% of the series); deviation = yield ÷ trend − 1, clipped to −95…+250%. Phase effect = mean deviation in phase years − mean in neutral years. "Per event" averages a multi-year event into one observation.<br>
  <b>Confidence.</b> 90% bootstrap range: 400 resamples of the phase observations and of the neutral years; "confident" when the range excludes zero. Small n widens the range — a county with 6 La Niña years will rarely be confident; states and countries usually are.<br>
  <b>After the event.</b> The one and two crop years following each event's last affected year, averaged over events. They can overlap the next event, so treat them as indicative.<br>
  <b>Aggregates.</b> State and national series = production ÷ harvested area over all reporting areas, not only those mapped. Cross-country reads weight each country by its average production over its last ten years.<br>
  <b>Units.</b> Everything is shown as kg of lint per hectare. ${ORDER.filter(cc=>DATA.countries[cc]).map(cc=>`<b>${cc}</b> ${DATA.countries[cc].crop}`).join(' · ')}. Brazil and Argentina report seed cotton, converted with a fixed ginning turnout; levels there are approximate, % deviations are exact.<br>
  <b>Inclusion.</b> Places need ≥25 (US), ≥20 (India) or ≥15 (Brazil, Argentina, US practice splits) seasons and a minimum average harvested area. Yields above 3,500 kg lint/ha or below 5% of a place's median are treated as reporting errors.
  <h4>Sources</h4>${Object.values(DATA.sources).map(s=>'• '+s).join('<br>')}<br>• NOAA PSL — ERSST v5 monthly sea-surface temperature, 2° grid; seasonal anomalies vs 1991–2020 shown at 4° in "ENSO on the globe"<br>Built ${DATA.generated}. Inspired by the ENSO-Yield Explorer (corn/soy, US) and the AgroENSO project.`;
}
// ---------- exports
function svgToPng(host,name){
  const svg=host.querySelector('svg'); if(!svg){ toast('Nothing to export'); return; }
  const clone=svg.cloneNode(true); const vb=svg.viewBox.baseVal; const W=vb.width||svg.clientWidth,H=vb.height||svg.clientHeight; clone.setAttribute('width',W); clone.setAttribute('height',H);
  const src=svg.querySelectorAll('*'),dst=clone.querySelectorAll('*'); src.forEach((el,i)=>{ const cs=getComputedStyle(el); ['fill','stroke','stroke-width','stroke-dasharray','font-size','font-family','font-weight','opacity','fill-opacity'].forEach(p=>{ const v=cs.getPropertyValue(p); if(v&&v!=='none'||p==='fill') dst[i].style.setProperty(p,v); }); });
  const xml=new XMLSerializer().serializeToString(clone); const img=new Image(); const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
  img.onload=()=>{ const cv=document.createElement('canvas'); cv.width=W*2; cv.height=H*2; const ctx=cv.getContext('2d'); ctx.fillStyle=css('--panel'); ctx.fillRect(0,0,cv.width,cv.height); ctx.drawImage(img,0,0,cv.width,cv.height); cv.toBlob(b=>saveFile(b,name+'.png'),'image/png'); };
  img.onerror=()=>toast('Export failed'); img.src=url;
}
let DL=null, DLready=false; (async()=>{ try{ if(window.claude&&window.claude.use){ DL=await window.claude.use('downloads'); } }catch(e){} DLready=true; })();
async function saveFile(data,name){
  if(window.claude&&window.claude.use){ if(!DLready){ toast('One moment…'); await new Promise(r=>setTimeout(r,800)); } if(DL){ try{ await DL.save({filename:name,data}); toast(`Saved ${name}`); }catch(e){ if(e&&e.code==='declined') toast('Save cancelled'); else toast('Save unavailable here — open the standalone file'); } return; } }
  try{ const a=document.createElement('a'); a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data])); a.download=name; document.body.appendChild(a); a.click(); a.remove(); toast(`Saved ${name}`); }catch(e){ toast('Save failed'); }
}
function saveText(txt,name){ saveFile(txt,name); }
function csvArea(){ const f=cur(),c=country(),s=seriesOf(f.r); const rows=[['country','area','admin1','year','phase','intensity','excluded','window_oni','yield_'+c.unit.split(' ')[0],'trend','pct_from_trend','harvested_ha'],...s.map(d=>[c.code,f.r.name,f.r.admin1||'',d.year,d.rawPhase,d.intensity||'',d.excluded?1:0,d.oni??'',Math.round(d.yield),Math.round(d.trend),d.anom,d.area?Math.round(d.area):''])]; saveText(rows.map(r=>r.map(v=>/[",]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\n'),`cotton_enso_${c.code}_${f.r.name.replace(/\W+/g,'_')}.csv`); }
function csvAll(){ const rows=[['country','level','id','area','admin1','lat','lon','seasons','mean_yield','neutral_n','neutral_mean_pct','elnino_n','elnino_vs_neutral_pct','elnino_p','lanina_n','lanina_vs_neutral_pct','lanina_p','lanina_year_after_pct','elnino_year_after_pct']]; for(const cc of Object.keys(DATA.countries)){ const c=DATA.countries[cc]; for(const [lvl,list] of [['region',c.regions],['admin1',c.admin1],['national',[c.national]]]) for(const r of list){ const st=statsFor(r,cc); rows.push([cc,lvl,r.id,r.name,r.admin1||'',r.lat??'',r.lon??'',st.n,Math.round(st.yieldMean),st.neutral.n,st.neutral.mean.toFixed(1),st['El Niño'].n,st['El Niño'].n?st['El Niño'].diff.toFixed(1):'',st['El Niño'].n>1&&!isNaN(st['El Niño'].p)?st['El Niño'].p.toFixed(3):'',st['La Niña'].n,st['La Niña'].n?st['La Niña'].diff.toFixed(1):'',st['La Niña'].n>1&&!isNaN(st['La Niña'].p)?st['La Niña'].p.toFixed(3):'',st['La Niña'].lagMean[1].n?st['La Niña'].lagMean[1].mean.toFixed(1):'',st['El Niño'].lagMean[1].n?st['El Niño'].lagMean[1].mean.toFixed(1):'']); } } saveText(rows.map(r=>r.map(v=>/[",]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\n'),`cotton_enso_all_areas_${S.minInt}_${S.minYear||'all'}.csv`); }



// ---------- search
function setupSearch(){
  const inp=document.getElementById('regionSearch'),ul=document.getElementById('searchList');
  const items=()=>{ const out=[]; for(const cc of Object.keys(DATA.countries)){ const c=DATA.countries[cc]; if(c.variantOf&&cc!==S.cc) continue; if(!c.variantOf&&baseCC(S.cc)===cc&&S.cc!==cc) continue; out.push({cc,id:'NAT',name:c.name,sub:'country',lvl:'national'}); c.admin1.forEach(a=>out.push({cc,id:a.name,name:a.name,sub:c.name+' · state',lvl:'admin1'})); c.regions.forEach(r=>out.push({cc,id:r.id,name:r.name,sub:r.admin1+' · '+c.name,lvl:'region'})); } return out; };
  inp.oninput=()=>{ const q=inp.value.trim().toLowerCase(); if(!q){ul.style.display='none';return;} const hits=items().filter(i=>i.name.toLowerCase().includes(q)||(i.sub||'').toLowerCase().includes(q)).sort((a,b)=>(a.cc===S.cc?0:1)-(b.cc===S.cc?0:1)).slice(0,30); ul.innerHTML=hits.map(h=>`<li data-id="${h.id}" data-cc="${h.cc}" data-lvl="${h.lvl}">${META[baseCC(h.cc)].flag} ${h.name}<small>${h.sub}</small></li>`).join(''); ul.style.display=hits.length?'block':'none'; ul.querySelectorAll('li').forEach(li=>li.onclick=()=>{ S.cc=li.dataset.cc; S.zoom=null; if(li.dataset.lvl==='national'){ S.a1=null; S.sel=null; } else if(li.dataset.lvl==='admin1'){ S.a1=li.dataset.id; S.sel=null; } else { S.sel=li.dataset.id; } inp.value=''; ul.style.display='none'; if(S.tab==='findings'||S.tab==='compare') S.tab='map'; renderAll(); }); };
  inp.onblur=()=>setTimeout(()=>ul.style.display='none',150);
}

// ---------- tabs & controls
window.setTab=function(t){ if(G.playing){ G.playing=false; clearInterval(G.timer); const b=document.getElementById('globePlay'); if(b) b.textContent='▶ Play'; } S.tab=t; document.querySelectorAll('#subtabs button').forEach(b=>b.classList.toggle('active',b.dataset.t===t)); document.querySelectorAll('section[data-tab]').forEach(s=>s.classList.toggle('active',s.dataset.tab===t)); window.scrollTo({top:0}); renderTab(); writeHash(); };
document.getElementById('subtabs').onclick=e=>{ const b=e.target.closest('button'); if(b) setTab(b.dataset.t); };
function renderTab(){ const t=S.tab; const glob=(t==='events'||t==='compare'||t==='sources'); document.body.classList.toggle('global',glob); cur(); renderCrumbs(); if(t==='findings') renderFindings(); else if(t==='map'){ renderSelection(); renderMap(); } else if(t==='area') renderSelection(); else if(t==='events'){ renderKPIs(); renderONI(); renderEventsStrip(); renderGlobe(); renderCadence(); renderPhaseStrip(); renderEventCountries(); } else if(t==='compare') renderCompare(); else if(t==='sources') renderSources(); else if(t==='data'){ renderSelection(); renderFoot(); } }
function seg(id,attr,fn){ document.getElementById(id).onclick=e=>{ const b=e.target.closest('button'); if(!b||b.disabled) return; document.querySelectorAll('#'+id+' button').forEach(x=>x.classList.toggle('active',x===b)); fn(b.dataset[attr]); }; }
seg('rangeSeg','r',v=>{ S.minYear=v==='all'?0:+v; renderAll(); });
seg('intSeg','i',v=>{ S.minInt=v; renderAll(); });
seg('wSeg','w',v=>{ S.weight=v; renderAll(); });
seg('metricSeg','m',v=>{ S.metric=v; renderMap(); });
seg('styleSeg','s',v=>{ S.mapStyle=v; renderMap(); });
seg('showSeg','l',v=>{ S.showLevel=v; renderMap(); });
seg('trendSeg','v',v=>{ S.trendView=v; const f=cur(); renderTrend(f.r,statsFor(f.r)); });
seg('rankSeg','p',v=>{ S.rankPhase=v; renderCompare(); });
seg('hemSeg','p',v=>{ S.hemPhase=v; renderHemis(); });
const sb=document.getElementById('settingsBtn'), sp=document.getElementById('settings'); sb.onclick=e=>{ e.stopPropagation(); sp.classList.toggle('open'); }; document.addEventListener('click',e=>{ if(!sp.contains(e.target)&&e.target!==sb) sp.classList.remove('open'); });
document.getElementById('themeBtn').onclick=()=>{ const h=document.documentElement; h.dataset.theme=h.dataset.theme==='dark'?'light':'dark'; try{localStorage.setItem('enso-theme',h.dataset.theme);}catch(e){} renderAll(); };
document.getElementById('clearPins').onclick=()=>{ S.pins=[]; renderCompare(); renderCrumbs(); };
document.getElementById('dlArea').onclick=csvArea; document.getElementById('dlAll').onclick=csvAll;
document.querySelectorAll('[data-png]').forEach(b=>b.onclick=()=>svgToPng(document.getElementById(b.dataset.png),`cotton_enso_${b.dataset.png}_${S.cc}`));
let rt; window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(renderTab,150); });
window.addEventListener('hashchange',()=>{ if(applyHash()) renderAll(); });
document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); document.getElementById('regionSearch').focus(); } });
function syncControls(){ document.querySelectorAll('#rangeSeg button').forEach(b=>b.classList.toggle('active',(b.dataset.r==='all'?0:+b.dataset.r)===S.minYear)); document.querySelectorAll('#intSeg button').forEach(b=>b.classList.toggle('active',b.dataset.i===S.minInt)); document.querySelectorAll('#wSeg button').forEach(b=>b.classList.toggle('active',b.dataset.w===S.weight)); document.querySelectorAll('#styleSeg button').forEach(b=>b.classList.toggle('active',b.dataset.s===S.mapStyle)); document.querySelectorAll('#showSeg button').forEach(b=>b.classList.toggle('active',b.dataset.l===S.showLevel)); document.querySelectorAll('#metricSeg button').forEach(b=>b.classList.toggle('active',b.dataset.m===S.metric)); document.querySelectorAll('#subtabs button').forEach(b=>b.classList.toggle('active',b.dataset.t===S.tab)); document.querySelectorAll('section[data-tab]').forEach(s=>s.classList.toggle('active',s.dataset.tab===S.tab)); }
function renderAll(){ statCache.clear(); renderTabs(); syncControls(); cur(); renderTab(); writeHash(); }
try{ const th=localStorage.getItem('enso-theme'); if(th) document.documentElement.dataset.theme=th; }catch(e){}
window.dismissIntro=function(){ document.getElementById('intro').style.display='none'; try{localStorage.setItem('enso-intro','1');}catch(e){} };
try{ if(localStorage.getItem('enso-intro')) document.getElementById('intro').style.display='none'; }catch(e){}
setupSearch(); applyHash(); renderAll();
