// ===================================================================== weather & outlook
// CLIM: growing-season weather per area (×10 integers, see scripts/build_page.py); OUTL: ridge-model outlook (scripts/build_outlook.py)
const CLIM=JSON.parse(document.getElementById('CLIM').textContent);
const OUTL=JSON.parse(document.getElementById('OUTL').textContent);
const DRY='#c27c3a', WET='#2f9fb3';
const WXV=[['t','Temperature','°C',10,'season mean vs 1991–2020'],['p','Rainfall','%',1,'season total vs 1991–2020'],['spi','SPI','',10,'rain-only drought index'],['spei','SPEI','',10,'rain minus evaporative demand'],['pdsi','scPDSI','',10,'Palmer soil-moisture index (to 2025)']];
function levelOf(r){ return r.id==='NAT'?'national':String(r.id).startsWith('A1:')?'admin1':'region'; }
function climOf(r,cc=S.cc){ const C=CLIM.countries[baseCC(cc)]; if(!C) return null; const l=levelOf(r); return l==='region'?(C.regions[r.id]||null):l==='admin1'?(C.admin1[r.name]||null):C.national; }
function wxAt(w,y){ if(!w) return null; const k=y-CLIM.years[0]; if(k<0||k>=CLIM.years.length) return null; const g=(a,s)=>a[k]==null?null:a[k]/s; const o={t:g(w.t,10),p:g(w.p,1),spi:g(w.spi,10),spei:g(w.spei,10),pdsi:g(w.pdsi,10)}; return o.t==null&&o.spei==null?null:o; }
function fcOf(r,cc=S.cc){ const O=OUTL.countries[baseCC(cc)]; if(!O) return null; const l=levelOf(r); return l==='region'?(O.regions[r.id]||null):l==='admin1'?(O.admin1[r.name]||null):O.national; }
const fcYear=(cc=S.cc)=>(OUTL.countries[baseCC(cc)]||{}).year||2026;
function skillWord(sk){ return sk>=0.1?['useful','y']:sk>=0.03?['some','m']:sk>0.005?['little','m']:['none — trend only','n']; }
const sgn=(v,d=1)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
// what kind of season was it?
function wxTags(w){ if(!w) return []; const t=[];
  if(w.spei!=null&&w.spei<=-1) t.push(['dry',`drought · SPEI ${sgn(w.spei)}`]); else if(w.spei!=null&&w.spei>=1.3) t.push(['wet',`very wet · SPEI ${sgn(w.spei)}`]);
  if(w.t!=null&&w.t>=0.8) t.push(['hot',`hot · ${sgn(w.t)} °C`]); else if(w.t!=null&&w.t<=-0.8) t.push(['cool',`cool · ${sgn(w.t)} °C`]);
  return t; }
const tagHtml=t=>`<span class="wxt ${t[0]}">${t[1]}</span>`;
// weather in El Niño / La Niña / neutral crop years for one place (respects the Settings filters)
function phaseWx(r,cc=S.cc){ const w=climOf(r,cc); if(!w) return null; const s=seriesOf(r,cc).filter(d=>!d.excluded); const g={'El Niño':[],'La Niña':[],'Neutral':[]};
  for(const d of s){ const x=wxAt(w,d.year); if(x&&g[d.phase]) g[d.phase].push(x); }
  const out={n:{}}; for(const p in g) out.n[p]=g[p].length;
  for(const [k] of WXV){ const v=p=>g[p].map(x=>x[k]).filter(x=>x!=null); const nu=v('Neutral'); out[k]={neutral:mean(nu)};
    for(const p of ['El Niño','La Niña']){ const a=v(p); const ci=bootCI(a,nu); out[k][p]={n:a.length,mean:mean(a),diff:mean(a)-mean(nu),ci,sig:!!ci&&(ci[0]>0||ci[1]<0)}; } }
  return out; }

// ---------- Overview tiles
function wxTile(p,cc){ const c=country(cc); const pw=phaseWx(c.national,cc); if(!pw||!pw.n[p]) return null; const T=pw.t[p], R=pw.p[p], E=pw.spei[p];
  const parts=[]; if(T.n) parts.push(`<span class="${T.diff>0?'neg':'pos'}${T.sig?'':' unc'}">${sgn(T.diff)}°</span>`); if(R.n) parts.push(`<span class="${R.diff<0?'neg':'pos'}${R.sig?'':' unc'}">${sgn(R.diff,0)}%</span>`);
  const desc=[T.sig?(T.diff>0?'hotter':'cooler'):null,R.sig?(R.diff<0?'drier':'wetter'):null].filter(Boolean);
  return {k:'Weather',big:parts.join('<i class="sl">·</i>'),cls:'multi',conf:null,tag:`heat · rain · SPEI ${sgn(E.diff)}`,
    h:desc.length?`${p} seasons in ${c.name}'s cotton belt run ${desc.join(' and ')}`:`${p} seasons bring no clear change in ${c.name}'s growing-season weather`,
    d:`Over the growing window, ${p} crop years vs neutral years: temperature ${sgn(T.diff,2)} °C${T.sig?' (confident)':''}, rainfall ${sgn(R.diff,0)}%${R.sig?' (confident)':''}, SPEI ${sgn(E.diff,2)}${E.sig?' (confident)':''}, scPDSI ${isNaN(pw.pdsi[p].diff)?'n/a':sgn(pw.pdsi[p].diff,2)}. This is the mechanism ENSO works through — see which bad years were droughts or heat waves.`,go:{cc,tab:'wx',sel:'NAT'}}; }
function outlookTile(cc){ const c=country(cc); const f=fcOf(c.national,cc); if(!f) return null; const Y=fcYear(cc); const [sw]=skillWord(f.sk);
  const drv=driverText(f);
  return {k:`Outlook ${Y}`,big:`${fmt0(f.kg)}<span class="u"> kg/ha</span>`,cls:'',conf:null,tag:`${fx(f.pct)} vs trend · skill ${sw.split(' ')[0]}`,
    h:f.sk>0.005?`${c.name}'s ${Y} crop looks ${f.pct<-2?'below':f.pct>2?'above':'close to'} trend${drv?' — '+drv:''}`:`No reliable signal for ${Y}: expect about the trend yield`,
    d:`Best estimate ${fmt0(f.kg)} kg lint/ha (${fx(f.pct)} vs the ${fmt0(f.trend)} trend; 90% range ${fx(f.lo)} to ${fx(f.hi)}). Hindcast skill ${Math.max(0,f.sk*100).toFixed(0)}% of year-to-year variation — ${f.sk>0.005?'ENSO and weather beat the trend line in past years':'ENSO and season weather never beat the trend line here, so the outlook is the trend'}.`,go:{cc,tab:'wx',sel:'NAT'}}; }
function driverText(f){ const n=['El Niño/La Niña','heat','drought/wetness']; const big=f.c.map((v,i)=>[v,n[i]]).filter(x=>Math.abs(x[0])>=0.5).sort((a,b)=>Math.abs(b[0])-Math.abs(a[0])); return big.map(x=>`${x[1]} ${fx(x[0])}`).join(', '); }

// ---------- Explore map metrics
function metricWx(r,lvl){ if(S.metric==='fc'){ const f=fcOf(r); return {v:f?f.pct:null,sig:!!f&&f.sk>0.005}; }
  const w=climOf(r); const x=wxAt(w,latestWxYear()); return {v:x?x.spei:null,sig:true}; }
function latestWxYear(cc=S.cc){ const b=baseCC(cc); const Y=fcYear(cc); return b==='AU'?Y-1:Y; }   // AU outlook is 2027; its latest observed season is 2026
function wxLegend(items){ if(S.metric==='fc'){ const L=Math.max(5,Math.ceil((d3.quantile(items.map(d=>Math.abs(d.v)).filter(x=>x!=null).sort(d3.ascending),0.9)||5)/5)*5);
    return {color:d3.scaleDiverging().domain([-L,0,L]).interpolator(t=>d3.interpolateRgbBasis([css('--neg'),css('--mid'),css('--pos')])(t)),
      html:`<b>Outlook ${fcYear()}</b><br>predicted % vs trend<div class="ramp"></div><div class="rl"><span>−${L}%</span><span>0</span><span>+${L}%</span></div><div style="margin-top:6px"><span class="sw" style="background:var(--pos);opacity:.28"></span>faded = no skill, trend only</div>`}; }
  const Y=latestWxYear(); return {color:d3.scaleDiverging().domain([-2.5,0,2.5]).interpolator(t=>d3.interpolateRgbBasis([DRY,css('--mid'),WET])(t)),
    html:`<b>Drought ${Y} season</b><br>SPEI over the growing window<div class="ramp" style="background:linear-gradient(90deg,${DRY},${css('--mid')},${WET})"></div><div class="rl"><span>−2.5 dry</span><span>0</span><span>+2.5 wet</span></div><div class="muted" style="margin-top:4px">≤ −1 = drought · weather through ${CLIM.through}</div>`}; }
function wxTip(r){ const f=fcOf(r), x=wxAt(climOf(r),latestWxYear()); let s='';
  if(x) s+=`<br>${latestWxYear()} season: <b>${sgn(x.t)} °C</b> · rain <b>${sgn(x.p,0)}%</b> · SPEI <b>${sgn(x.spei)}</b>`;
  if(f) s+=`<br>Outlook ${fcYear()}: <b>${fmt0(f.kg)}</b> kg/ha (${fx(f.pct)}) · skill ${skillWord(f.sk)[0]}`; return s; }

// ---------- Explore side line
function renderWxLine(){ const el=document.getElementById('wxLine'); if(!el) return; const f=cur(); const fc=fcOf(f.r), x=wxAt(climOf(f.r),latestWxYear());
  if(!fc&&!x){ el.innerHTML=''; return; }
  el.innerHTML=`<div class="wxline">${fc?`<div><span class="muted">Outlook ${fcYear()}</span> <b>${fmt0(fc.kg)}</b> kg/ha <span class="${fc.pct<0?'neg':'pos'}">${fx(fc.pct)}</span> <span class="muted">· skill ${skillWord(fc.sk)[0]}</span></div>`:''}${x?`<div><span class="muted">${latestWxYear()} season</span> ${sgn(x.t)} °C · rain ${sgn(x.p,0)}% · SPEI ${sgn(x.spei)} ${wxTags(x).map(tagHtml).join('')}</div>`:''}<button class="btn sm" onclick="setTab('wx')">Weather & outlook →</button></div>`; }

// ---------- Weather & outlook tab
function renderWx(){ const c=country(); const f=cur(); const r=f.r; const w=climOf(r); const fc=fcOf(r); const Y=fcYear();
  document.querySelectorAll('.wxName').forEach(e=>e.textContent=r.name);
  // 1 outlook card
  const oc=document.getElementById('wxOutlook');
  if(fc){ const [sw,sc]=skillWord(fc.sk); const x=fc.wx; const mx=Math.max(4,...fc.c.map(Math.abs)); const bar=(v,l)=>`<div class="drv"><span>${l}</span><div class="dbar"><i style="${v<0?'right:50%':'left:50%'};width:${Math.abs(v)/mx*50}%;background:var(--${v<0?'neg':'pos'})"></i></div><b class="${v<0?'neg':v>0?'pos':'muted'}">${fx(v)}</b></div>`;
    const span=Math.max(30,Math.ceil(Math.max(Math.abs(fc.lo),Math.abs(fc.hi))/10)*10); const P=v=>50+v/span*50;
    oc.innerHTML=`<div class="ol-top"><div><div class="ol-big">${fmt0(fc.kg)}<span> kg lint/ha</span></div><div class="ol-sub"><b class="${fc.pct<0?'neg':'pos'}">${fx(fc.pct)}</b> vs the ${fmt0(fc.trend)} kg/ha trend · ${Y} crop</div></div><div class="skill ${sc}" title="Share of past year-to-year swings the model would have called (leave-one-year-out)"><span>hindcast skill</span><b>${Math.max(0,fc.sk*100).toFixed(0)}%</b><i>${sw}</i></div></div>
      <div class="ol-range" title="90% range"><div class="track"><i class="zero" style="left:50%"></i><i class="rng" style="left:${P(fc.lo)}%;width:${P(fc.hi)-P(fc.lo)}%"></i><i class="pt" style="left:${P(fc.pct)}%"></i></div><div class="rl"><span>−${span}%</span><span>90% range ${fx(fc.lo)} to ${fx(fc.hi)}</span><span>+${span}%</span></div></div>
      <div class="drvs"><div class="muted ol-h">What moves the estimate</div>${bar(fc.c[0],'El Niño / La Niña')}${bar(fc.c[1],'Heat')}${bar(fc.c[2],'Drought / wetness')}</div>
      <p class="ol-say">${fc.sk>0.005?`In past years, ENSO and season weather explained about <b>${(fc.sk*100).toFixed(0)}%</b> of ${r.name}'s ups and downs out of sample${driverText(fc)?`; for ${Y} they point to <b>${driverText(fc)}</b>`:''}.`:`In past years neither ENSO nor season weather beat the plain trend line for ${r.name}, so the model leans on the trend: expect about <b>${fmt0(fc.trend)}</b> kg/ha, give or take ${Math.round((fc.hi-fc.lo)/2)}%.`} ${x?`This season so far: <b>${sgn(x.t)} °C</b>, SPEI <b>${sgn(x.spei)}</b> ${wxTags(x).map(tagHtml).join(' ')}.`:`${Y} weather is not observed yet, so normal weather is assumed; ENSO uses the latest ONI (${OUTL.oniThrough}).`}</p>`; }
  else oc.innerHTML=`<p class="muted">No outlook for ${r.name}: it has too few recent seasons (an area needs data within the last six years and at least 15 seasons with weather).</p>`;
  renderHindcast(r,fc); renderWxChart(r,w); renderPhaseWx(r); renderWorst(r,w); renderSkillGrid(); }

function renderHindcast(r,fc){ const host=document.getElementById('wxHind'); host.innerHTML=''; const note=document.getElementById('wxHindNote');
  let src=fc&&fc.hc?fc:null, label=r.name; if(!src&&levelOf(r)==='region'){ const a=admin1Of(r.admin1); const fa=a&&fcOf(a); if(fa&&fa.hc){ src=fa; label=a.name; } }
  if(!src){ note.textContent='No hindcast available here.'; return; }
  const hc=src.hc, n=hc.y.length; const W=host.clientWidth||600, H=250, m={l:44,r:10,t:10,b:26}; const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleBand().domain(hc.y).range([m.l,W-m.r]).padding(0.25); const ext=d3.max(hc.obs.concat(hc.pred).map(Math.abs))||10; const y=d3.scaleLinear().domain([-ext,ext]).nice().range([H-m.b,m.t]);
  axisY(svg,y,m,W,d=>d+'%');
  svg.append('g').selectAll('rect').data(hc.y.map((yy,i)=>({yy,o:hc.obs[i],p:hc.pred[i]}))).enter().append('rect').attr('x',d=>x(d.yy)).attr('width',x.bandwidth()).attr('y',d=>y(Math.max(0,d.o))).attr('height',d=>Math.abs(y(d.o)-y(0))).attr('fill',d=>d.o<0?css('--neg'):css('--pos')).attr('opacity',.45)
    .on('mousemove',(ev,d)=>showTip(`<b>${d.yy}</b><br>actual ${fx(d.o)} · hindcast ${fx(d.p)}`,ev)).on('mouseleave',hideTip);
  svg.append('path').datum(hc.y.map((yy,i)=>[x(yy)+x.bandwidth()/2,y(hc.pred[i])])).attr('d',d3.line()).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',2.2);
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(hc.y.filter(v=>v%10===0)).tickSize(0)).call(g=>g.select('.domain').remove());
  note.innerHTML=`${label}: bars = actual % from trend, gold line = what the model would have said <i>without seeing that year</i>. Skill ${Math.max(0,src.sk*100).toFixed(0)}%${src.sk>0.005?` · correlation ${src.r.toFixed(2)}`:' — the line stays near zero because the model fell back to the trend'} · ${n} seasons.${label!==r.name?` (Local areas use their state's chart; the area's own skill is ${Math.max(0,fc?fc.sk*100:0).toFixed(0)}%.)`:''}`; }

function renderWxChart(r,w){ const host=document.getElementById('wxChart'); host.innerHTML=''; if(!w){ host.innerHTML='<p class="muted">No weather data for this place.</p>'; return; }
  const s=seriesOf(r).map(d=>({...d,w:wxAt(w,d.year)})).filter(d=>d.w); if(!s.length) return;
  const W=host.clientWidth||900, H1=190, H2=140, gap=18, m={l:46,r:46,t:10,b:24}; const H=m.t+H1+gap+H2+m.b;
  const svg=d3.select(host).append('svg').attr('width','100%').attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleBand().domain(s.map(d=>d.year)).range([m.l,W-m.r]).padding(0.2);
  const ea=d3.max(s,d=>Math.abs(d.anom))||10; const y1=d3.scaleLinear().domain([-ea,ea]).nice().range([m.t+H1,m.t]);
  const y2=d3.scaleLinear().domain([-2.8,2.8]).range([m.t+H1+gap+H2,m.t+H1+gap]); const tx=d3.max(s,d=>Math.abs(d.w.t||0))||1; const yT=d3.scaleLinear().domain([-Math.max(1.5,tx),Math.max(1.5,tx)]).range(y2.range());
  const g1=svg.append('g'); g1.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y1).ticks(4).tickSize(-(W-m.l-m.r)).tickFormat(d=>d+'%')).call(g=>g.selectAll('line').attr('class','grid-line')).call(g=>g.select('.domain').remove());
  const g2=svg.append('g'); g2.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y2).tickValues([-2,-1,0,1,2]).tickSize(-(W-m.l-m.r))).call(g=>g.selectAll('line').attr('class','grid-line')).call(g=>g.select('.domain').remove());
  g2.append('g').attr('class','axis').attr('transform',`translate(${W-m.r},0)`).call(d3.axisRight(yT).ticks(4).tickFormat(d=>(d>0?'+':'')+d+'°')).call(g=>g.select('.domain').remove());
  svg.append('text').attr('x',W-m.r).attr('text-anchor','end').attr('y',m.t+H1+gap-4).attr('fill',css('--ink-3')).style('font-size','12px').text(W<600?'SPEI bars · line = temp':'SPEI bars (brown = drought, teal = wet) · line = temperature anomaly (right axis)');
  const tipH=d=>`<b>${d.year}</b> · ${d.rawPhase}${d.excluded?' (weak)':''}<br>yield <b>${fx(d.anom)}</b> from trend<br>temp ${sgn(d.w.t)} °C · rain ${sgn(d.w.p,0)}%<br>SPI ${d.w.spi==null?'–':sgn(d.w.spi)} · SPEI ${sgn(d.w.spei)} · scPDSI ${d.w.pdsi==null?'–':sgn(d.w.pdsi)}${wxTags(d.w).length?'<br>'+wxTags(d.w).map(t=>t[1]).join(' · '):''}`;
  const yr=svg.append('g').selectAll('g').data(s).enter().append('g').on('mousemove',(ev,d)=>showTip(tipH(d),ev)).on('mouseleave',hideTip);
  yr.append('rect').attr('x',d=>x(d.year)-x.step()*x.paddingInner()/2).attr('width',x.step()).attr('y',m.t).attr('height',H1+gap+H2).attr('fill','transparent');
  yr.append('rect').attr('x',d=>x(d.year)).attr('width',x.bandwidth()).attr('y',d=>y1(Math.max(0,d.anom))).attr('height',d=>Math.abs(y1(d.anom)-y1(0))).attr('fill',d=>phColor(d.phase)).attr('opacity',d=>d.excluded?.35:.9);
  yr.append('rect').attr('x',d=>x(d.year)).attr('width',x.bandwidth()).attr('y',d=>y2(Math.max(0,d.w.spei||0))).attr('height',d=>Math.abs(y2(d.w.spei||0)-y2(0))).attr('fill',d=>(d.w.spei||0)<0?DRY:WET).attr('opacity',.85);
  svg.append('path').datum(s.filter(d=>d.w.t!=null)).attr('d',d3.line().x(d=>x(d.year)+x.bandwidth()/2).y(d=>yT(d.w.t))).attr('fill','none').attr('stroke',css('--accent')).attr('stroke-width',1.8).attr('pointer-events','none');
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickValues(s.map(d=>d.year).filter(v=>v%5===0)).tickSize(0)).call(g=>g.select('.domain').remove());
  // headline: how often do bad years coincide with a weather extreme?
  const k=Math.max(3,Math.round(s.length*0.2)); const worst=s.slice().sort((a,b)=>a.anom-b.anom).slice(0,k); const ext=d=>wxTags(d.w).some(t=>t[0]==='dry'||t[0]==='hot'||t[0]==='wet');
  const a=worst.filter(ext).length, base=s.filter(ext).length/s.length; const dry=worst.filter(d=>(d.w.spei||0)<=-1).length;
  const rr=(()=>{ const xs=s.map(d=>d.w.spei), ys=s.map(d=>d.anom); const f=ols(xs,ys); return f?{b:f.b,r:Math.sign(f.b)*Math.sqrt(f.r2)}:null; })();
  document.getElementById('wxChartNote').innerHTML=`In ${r.name}'s worst ${k} seasons, <b>${a}</b> had a drought, heat or very wet season (${dry} were droughts) — vs ${Math.round(base*100)}% of all seasons. ${rr?`Yield vs SPEI correlation ${rr.r>=0?'+':'−'}${Math.abs(rr.r).toFixed(2)}: ${Math.abs(rr.r)<0.15?'season-wide water balance barely tracks yield here (irrigation, or losses from pests, prices or harvest-time weather)':rr.b>0?'wetter seasons tend to yield more — water-limited cotton':'wetter seasons tend to yield less — floods, waterlogging or pests'}.`:''}`; }

function renderPhaseWx(r){ const el=document.getElementById('wxPhase'); const pw=phaseWx(r); if(!pw){ el.innerHTML='<p class="muted">No weather data.</p>'; return; }
  const cell=(o,k)=>{ if(!o||!o.n||isNaN(o.diff)) return '<td class="muted">–</td>'; const dec=k==='p'?0:k==='t'?2:2; const bad=k==='t'?o.diff>0:o.diff<0; return `<td><b class="${o.sig?(bad?'neg':'pos'):'muted'}">${sgn(o.diff,dec)}${k==='t'?' °C':k==='p'?'%':''}</b>${o.sig?' <span class="cf y">✓</span>':''}<div class="ci">${o.ci?`${sgn(o.ci[0],dec)} to ${sgn(o.ci[1],dec)}`:''}</div></td>`; };
  el.innerHTML=`<table class="wxtab"><thead><tr><th></th><th><span class="dot" style="background:var(--nino)"></span>El Niño <span class="muted">vs neutral</span></th><th><span class="dot" style="background:var(--nina)"></span>La Niña <span class="muted">vs neutral</span></th></tr></thead><tbody>${WXV.map(([k,l,u,_,h])=>`<tr><th>${l}<div class="ci">${h}</div></th>${cell(pw[k]['El Niño'],k)}${cell(pw[k]['La Niña'],k)}</tr>`).join('')}</tbody></table>
  <div class="muted" style="font-size:14px;margin-top:6px">${pw.n['El Niño']} El Niño, ${pw.n['La Niña']} La Niña and ${pw.n.Neutral} neutral seasons with weather · ✓ = 90% range excludes zero · red = the direction that hurts cotton (hotter, drier)</div>`; }

function renderWorst(r,w){ const el=document.getElementById('wxWorst'); if(!w){ el.innerHTML=''; return; } const s=seriesOf(r).map(d=>({...d,w:wxAt(w,d.year)})).filter(d=>d.w).sort((a,b)=>a.anom-b.anom).slice(0,6);
  el.innerHTML=s.map(d=>{ const t=wxTags(d.w); return `<li><span class="yr">${d.year}</span><span class="dot" style="background:${phColor(d.rawPhase==='Neutral'?'Neutral':d.rawPhase)}"></span><b class="neg">${fx(d.anom)}</b><span class="tags">${t.length?t.map(tagHtml).join(''):'<span class="wxt none">no season-wide extreme — look to pests, floods at picking, prices or policy</span>'}</span></li>`; }).join(''); }

function renderSkillGrid(){ const el=document.getElementById('wxSkill'); const P=v=>Math.max(0,v*100);
  const rows=ORDERX().map(cc=>{ const O=OUTL.countries[cc]; if(!O||!O.national) return ''; const cp=O.compare; const mx=20; const b=(v,cl)=>`<div class="sbar"><i class="${cl}" style="width:${Math.min(100,P(v)/mx*100)}%"></i><span>${P(v).toFixed(0)}%</span></div>`;
    return `<tr onclick="S.cc='${cc}';S.a1=null;S.sel=null;renderAll()"><th>${META[cc].flag} ${META[cc].name}</th><td>${b(cp.enso,'en')}</td><td>${b(cp.weather,'wx')}</td><td>${b(Math.max(O.skill.national,0),'bo')}</td><td><b class="${O.national.pct<0?'neg':'pos'}">${fx(O.national.pct)}</b> <span class="muted">${O.year}</span></td></tr>`; }).join('');
  el.innerHTML=`<table class="skilltab"><thead><tr><th></th><th>ENSO only</th><th>Weather only</th><th>Model used</th><th>Outlook</th></tr></thead><tbody>${rows}</tbody></table>`; }

// ---------- Sources: the weather datasets
const WX_SOURCES=L=>({t:'Weather — the mechanism and the outlook',items:[
  {ic:'🌡️',nm:'GHCN-CAMS land temperature',pub:'NOAA Climate Prediction Center · served by NOAA PSL',use:'Monthly 2 m air temperature on a 0.5° grid, averaged over each cotton area and growing window into a temperature anomaly vs 1991–2020, and used for evaporative demand (Thornthwaite PET) in SPEI.',
    kv:[['Coverage',`1948 → ${CLIM.through}`],['Grid','0.5°'],['File','air.mon.mean.nc, ~190 MB']],links:[L('https://psl.noaa.gov/data/gridded/data.ghcncams.html','Dataset page',true),L(RAWDIR('scripts/fetch_climate.sh'),'Download script')]},
  {ic:'🌧️',nm:'PREC/L land precipitation',pub:'NOAA Climate Prediction Center · served by NOAA PSL',use:'Monthly precipitation on a 0.5° grid: growing-window rainfall anomaly, SPI (gamma fit) and, with temperature, SPEI (log-logistic fit), both fitted on 1950–2025.',
    kv:[['Coverage',`1948 → ${CLIM.through}`],['Grid','0.5°'],['File','precip.mon.mean.0.5x0.5.nc, ~290 MB']],links:[L('https://psl.noaa.gov/data/gridded/data.precl.html','Dataset page',true),L(RAWDIR('scripts/fetch_climate.sh'),'Download script')]},
  {ic:'🏜️',nm:'CRU TS 4.10 scPDSI',pub:'Climatic Research Unit, University of East Anglia',use:'Self-calibrating Palmer Drought Severity Index — a soil-moisture drought index independent of our SPI/SPEI — averaged over each growing window.',
    kv:[['Coverage',`1903 → ${CLIM.pdsiThrough}`],['Grid','0.5°'],['Reference','Osborn et al.; van der Schrier et al. 2013']],links:[L('https://crudata.uea.ac.uk/cru/data/drought/','CRU drought data',true)],notes:[['','Too large for GitHub: run <b>scripts/fetch_climate.sh</b>, then <b>build_climate.py</b> and <b>build_outlook.py</b>.']]}]});
