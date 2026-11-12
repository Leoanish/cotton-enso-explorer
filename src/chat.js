// ============================================================================
// Ask the data — an agentic chat assistant for the Cotton × ENSO Explorer.
// The model (open-weight gpt-oss on Groq) never sees the API key and never
// invents numbers: it calls the tools below, which run in this page against
// the same data and functions that draw the charts.
// ============================================================================
(function(){
'use strict';

// After deploying chat-proxy/ (see chat-proxy/README.md) paste its URL here.
const CHAT_PROXY = '/*CHAT_PROXY*/';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GUIDE_URL = 'https://github.com/Leoanish/cotton-enso-explorer/blob/main/docs/knowledge_base.md';
const MAX_ROUNDS = 6;
const LS = { key:'cottonEnso.groqKey', model:'cottonEnso.groqModel', mode:'cottonEnso.chatMode' };
const lsGet = k => { try{ return localStorage.getItem(k)||''; }catch(e){ return ''; } };
const lsSet = (k,v) => { try{ v?localStorage.setItem(k,v):localStorage.removeItem(k); }catch(e){} };
const proxyOn = () => CHAT_PROXY && !CHAT_PROXY.startsWith('/*');

// ---------------------------------------------------------------- the guide
const KB_MD = JSON.parse(document.getElementById('KB').textContent);
const STOP = new Set('a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their then there these this to was what when where which who why will with you your vs about show tell explain does did much many'.split(' '));
const tok = s => norm2(s).split(/[^a-z0-9.]+/).filter(w=>w&&!STOP.has(w)).map(stem);
function norm2(s){ return String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
function stem(w){ if(w.length>4){ for(const suf of ['ing','ies','es','ed','s']) if(w.endsWith(suf)&&w.length-suf.length>=3) return suf==='ies'?w.slice(0,-3)+'y':w.slice(0,-suf.length); } return w; }
const KB = (()=>{ const out=[]; let part=''; const lines=KB_MD.split('\n'); let cur=null;
  const push=()=>{ if(cur){ cur.body=cur.body.trim(); out.push(cur); } };
  for(const ln of lines){ if(/^## /.test(ln)){ push(); cur=null; part=ln.replace(/^## /,'').trim(); continue; }
    const m=ln.match(/^### (\d+\.\d+)\s+(.*)$/); if(m){ push(); cur={id:m[1],title:m[2].trim(),part,body:'',kw:''}; continue; }
    if(!cur) continue; if(/^Keywords:/i.test(ln)){ cur.kw=ln.replace(/^Keywords:\s*/i,''); continue; } cur.body+=ln+'\n'; }
  push();
  // BM25 index: title and keywords count three times
  const docs=out.map(d=>{ const t=[...tok(d.title),...tok(d.title),...tok(d.title),...tok(d.kw),...tok(d.kw),...tok(d.kw),...tok(d.body)]; const tf=new Map(); t.forEach(w=>tf.set(w,(tf.get(w)||0)+1)); return {tf,len:t.length}; });
  const df=new Map(); docs.forEach(d=>d.tf.forEach((_,w)=>df.set(w,(df.get(w)||0)+1))); const avg=docs.reduce((s,d)=>s+d.len,0)/docs.length;
  out.search=(q,k=3)=>{ const qs=[...new Set(tok(q))]; const N=docs.length; const sc=docs.map((d,i)=>{ let s=0; for(const w of qs){ const f=d.tf.get(w)||0; if(!f) continue; const idf=Math.log(1+(N-df.get(w)+.5)/(df.get(w)+.5)); s+=idf*f*2.2/(f+1.2*(.25+.75*d.len/avg)); } const id=q.match(/\b(\d+\.\d+)\b/); if(id&&out[i].id===id[1]) s+=50; return {i,s}; }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s); return sc.slice(0,k).map(x=>out[x.i]); };
  out.byId=id=>out.find(d=>d.id===id); return out; })();

// ---------------------------------------------------------------- helpers over the dashboard
const r1 = x => (x==null||isNaN(x)) ? null : Math.round(x*10)/10;
const CCA={us:'US',usa:'US',unitedstates:'US',america:'US',unitedstatesofamerica:'US',brazil:'BR',brasil:'BR',br:'BR',india:'IN',in:'IN',argentina:'AR',ar:'AR',usirr:'US_IRR',irrigated:'US_IRR',usirrigated:'US_IRR',irrigatedus:'US_IRR',usnon:'US_NON',nonirrigated:'US_NON',usnonirrigated:'US_NON',dryland:'US_NON',rainfed:'US_NON',usdryland:'US_NON'};
function resolveCC(x){ if(!x) return null; if(DATA.countries[x]) return x; const k=norm(x); if(CCA[k]) return CCA[k]; for(const cc in DATA.countries) if(norm(DATA.countries[cc].name)===k) return cc; return null; }
const SET_FROM = o => { o=o||{}; const s={}; if(o.years!=null&&o.years!=='') s.minYear=(o.years==='all'||+o.years<=1950)?0:+o.years; if(o.events) s.minInt=o.events==='all'?'weak':(o.events==='strong'?'strong':o.events==='moderate'?'moderate':'weak'); if(o.count) s.weight=o.count==='event'?'event':'year'; return s; };
function withSettings(o,fn){ const save={minYear:S.minYear,minInt:S.minInt,weight:S.weight}; try{ Object.assign(S,SET_FROM(o)); return fn(); } finally{ Object.assign(S,save); } }
const settingsNow = () => ({years:S.minYear?S.minYear+'→':'all', events:S.minInt==='weak'?'all':S.minInt+'+', count:'per '+S.weight});

function findPlaces(q,cc){
  const raw=String(q||'').trim(); const [p0,p1]=raw.split(',').map(s=>s&&s.trim()); const k=norm(p0||''), st=p1?norm(p1):null;
  const ccs=cc?[cc]:ORDER.filter(c=>DATA.countries[c]); const hits=[];
  for(const c of ccs){ const C=DATA.countries[c];
    if(!k||['national','country','nation','whole','all'].includes(k)||norm(C.name)===k||resolveCC(p0)===c){ hits.push({cc:c,r:C.national,level:'national',score:4}); continue; }
    for(const a of C.admin1){ const n=norm(a.name); const s=n===k?3.5:n.startsWith(k)?2:n.includes(k)?1:0; if(s) hits.push({cc:c,r:a,level:'state',score:s}); }
    for(const g of C.regions){ if(st&&norm(g.admin1)!==st&&!norm(g.admin1).startsWith(st)) continue; const n=norm(g.name); const s=n===k?3:n.startsWith(k)?1.5:n.includes(k)&&k.length>3?.8:0; if(s) hits.push({cc:c,r:g,level:'area',score:s+(st?1:0)}); }
  }
  hits.sort((a,b)=>b.score-a.score||(b.r.areaMean||0)-(a.r.areaMean||0)); return hits;
}
function resolvePlace(country,place){
  const cc=resolveCC(country); if(country&&!cc) return {error:`Unknown country "${country}". Use US, Brazil, India, Argentina, US_IRR (irrigated) or US_NON (non-irrigated).`};
  const hits=findPlaces(place,cc||(place?null:S.cc)); if(!hits.length) return {error:`No place matching "${place}"${cc?' in '+DATA.countries[cc].name:''}. Try find_place.`};
  const top=hits.filter(h=>h.score===hits[0].score).filter((h,i,a)=>a.findIndex(x=>x.r===h.r)===i);
  const here=top.filter(h=>h.cc===S.cc);
  if(top.length>1&&here.length!==1) return {ambiguous:true,candidates:top.slice(0,8).map(placeLabel),hint:'Ask again with "Name, State" and/or a country.'};
  return {hit:top.length>1?here[0]:hits[0]};
}
const levelName=(h)=>h.level==='area'?DATA.countries[h.cc].level.toLowerCase():h.level;
const placeLabel=h=>({name:h.r.name,level:levelName(h),state:h.level==='area'?h.r.admin1:undefined,country:DATA.countries[h.cc].name,code:h.cc});

function phaseOut(o){ if(!o||!o.n) return {years:0,note:'no years of this phase in range'};
  const L=o.lagMean, lv=k=>L[k]&&L[k].n?r1(L[k].mean):null;
  return {effect_vs_neutral_pct:r1(o.diff), range90_pct:o.ci?o.ci.map(r1):null, confident:!!o.sig, obs:o.nUnits, events:o.nEvents, crop_years:o.years.join(','), below_trend:`${o.below}/${o.nUnits}`, mean_yield:Math.round(o.yieldMean), worst:o.worst&&`${o.worst.year} ${r1(o.worst.anom)}%`, best:o.best&&`${o.best.year} ${r1(o.best.anom)}%`, avg_pct_from_trend_around_events:{before2:lv(-2),before1:lv(-1),during:lv(0),after1:lv(1),after2:lv(2)}};
}
function statsBlock(h){ const st=statsFor(h.r,h.cc); const ss=strengthStats(h.r,h.cc); const C=DATA.countries[h.cc];
  const str={}; for(const p of ['El Niño','La Niña']) str[p]=['weak','moderate','strong'].map(k=>{ const x=ss[p][k]; const nm=k==='strong'?'strong+':k; return x.n?`${nm} ${r1(x.diff)}% (${x.n} obs, ${x.ci?(x.sig?'confident':'uncertain'):'too few for a range'})`:`${nm}: none`; }).join('; ');
  return {...placeLabel(h), unit:C.unit, data_years:st.years?st.years.join('–'):null, seasons:st.n, mean_yield:Math.round(st.yieldMean), harvested_ha_avg:Math.round(h.r.areaMean||0), sub_areas:h.r.nRegions,
    neutral:{years:st.neutral.n, mean_yield:Math.round(st.neutral.yieldMean), mean_pct_from_trend:r1(st.neutral.mean)},
    el_nino:phaseOut(st['El Niño']), la_nina:phaseOut(st['La Niña']), by_strength:str,
    weak_event_years_left_out:st.nExcluded||undefined, settings:settingsNow()};
}
function resolveEvent(q){ const s=String(q||'').trim(); if(!s) return {error:'Give an event id (EN1997) or a label such as "1997-98 El Niño".'};
  const id=s.toUpperCase().replace(/\s/g,''); let e=DATA.events.find(x=>x.id===id); if(e) return {e};
  const k=norm2(s); const type=/nina|cold/.test(k)?'La Niña':/nino|warm/.test(k)?'El Niño':null;
  const lab=k.replace(/[–—]/g,'-').match(/(\d{4})\s*-\s*(\d{2,4})/); let cands=DATA.events;
  if(lab){ const y=+lab[1]; cands=cands.filter(x=>x.startYear===y); }
  else { const y=k.match(/\d{4}/); if(y){ const Y=+y[0]; cands=cands.filter(x=>x.startYear<=Y&&x.endYear>=Y); } else cands=[]; }
  if(type) cands=cands.filter(x=>x.type===type);
  if(cands.length===1) return {e:cands[0]}; if(!cands.length) return {error:`No event matches "${s}". Use list_events.`};
  return {ambiguous:true,candidates:cands.map(x=>`${x.id} (${x.type} ${x.label}, ${x.intensity})`)}; }
const evShort=e=>({id:e.id,type:e.type,label:e.label,strength:e.intensity,start:`${e.startSeason} ${e.startYear}`,end:`${e.endSeason} ${e.endYear}`,seasons:e.durationSeasons,peak_oni_c:e.peak,peak_at:`${e.peakSeason} ${e.peakYear}`,years_since_previous_same_type:e.gapFromPrevSame});
function evAnom(r,ys){ const v=ys.map(y=>anomAt(r,y)).filter(x=>x!=null); return v.length?r1(mean(v)):null; }

// ---------------------------------------------------------------- tools
const SETTINGS_PROP={type:'object',description:'Optional what-if settings for this calculation only (the screen is not changed).',properties:{years:{type:'string',description:'"all" or a start year, e.g. "1980", "2000"'},events:{type:'string',enum:['all','moderate','strong']},count:{type:'string',enum:['year','event']}}};
const TOOLS={
  search_guide:{d:'Search the dashboard guide (definitions, data sources, methods, how numbers are calculated, what each chart/tab/colour means, limitations, headline results). Call this for any how/why/what-is question.',p:{query:{type:'string'}},req:['query'],
    run:a=>({sections:KB.search(a.query,3).map((s,i)=>{ const b=s.body.replace(/ *\| */g,'|').replace(/\n{2,}/g,'\n'); const L=i?1100:1800; return {cite:'§'+s.id,title:s.title,text:b.length>L?b.slice(0,L)+' …':b}; })})},
  find_place:{d:'Find counties/municipalities/districts/departments or states by (partial) name. Returns names, states and countries.',p:{name:{type:'string'},country:{type:'string'}},req:['name'],
    run:a=>{ const cc=resolveCC(a.country); const h=findPlaces(a.name,cc); return {matches:h.slice(0,10).map(placeLabel),total:h.length}; }},
  get_place_stats:{d:'ENSO statistics for a country, state or local area: El Niño and La Niña effect vs neutral years (% from trend), 90% range, confident or not, years, worst/best year, before/during/after averages, effect by strength. Omit place for the national figure. Use "Name, State" for ambiguous county names.',p:{country:{type:'string',description:'US, Brazil, India, Argentina, US_IRR, US_NON'},place:{type:'string'},settings:SETTINGS_PROP},req:[],
    run:a=>withSettings(a.settings,()=>{ const R=resolvePlace(a.country,a.place); if(!R.hit) return R; return statsBlock(R.hit); })},
  get_year:{d:'One crop year for a place: its ENSO phase, event, strength, growing-window ONI, yield, trend and % from trend.',p:{country:{type:'string'},year:{type:'integer'},place:{type:'string'}},req:['country','year'],
    run:a=>{ const R=resolvePlace(a.country,a.place); if(!R.hit) return R; const h=R.hit, C=DATA.countries[h.cc]; const ph=C.phases[a.year]; const i=h.r.years.indexOf(+a.year);
      if(i<0) return {...placeLabel(h),year:a.year,error:`No yield for ${a.year}. Data cover ${h.r.years[0]}–${h.r.years[h.r.years.length-1]}.`};
      const ev=ph&&ph.event?DATA.events.find(e=>e.id===ph.event):null;
      return {...placeLabel(h),year:+a.year,phase:ph?ph.phase:'Neutral',event:ev?`${ev.id} (${ev.type} ${ev.label})`:null,strength:ph&&ph.intensity,growing_window_mean_oni_c:ph?ph.oni:null,yield:Math.round(h.r.yield_[i]),trend:Math.round(h.r.trend[i]),pct_from_trend:h.r.anom[i],harvested_ha:h.r.area&&h.r.area[i]!=null?Math.round(h.r.area[i]):null,unit:C.unit}; }},
  get_event:{d:'Details of one ENSO event and how it hit cotton: national % from trend in each country\'s affected crop years plus the worst/best states. Give country to also get the worst/best local areas there; give place for one place.',p:{event:{type:'string',description:'id like EN1997 / LN2010, or "2015 El Niño", "1998-00 La Niña"'},country:{type:'string'},place:{type:'string'}},req:['event'],
    run:a=>{ const E=resolveEvent(a.event); if(!E.e) return E; const e=E.e; const out={event:evShort(e),by_country:[]};
      for(const cc of ORDER){ const C=DATA.countries[cc]; if(!C) continue; const ys=eventYears(e.id,cc); if(!ys.length){ out.by_country.push({country:C.name,crop_years:[],note:'no crop year assigned to this event (growing season ONI not beyond ±0.5, or outside the data years)'}); continue; }
        const st=C.admin1.map(s=>({name:s.name,pct:evAnom(s,ys)})).filter(x=>x.pct!=null).sort((x,y)=>x.pct-y.pct);
        out.by_country.push({country:C.name,crop_years:ys,national_pct_from_trend:evAnom(C.national,ys),worst_states:st.slice(0,3),best_states:st.slice(-3).reverse()}); }
      const cc=resolveCC(a.country); if(cc){ const C=DATA.countries[cc]; const ys=eventYears(e.id,cc); if(ys.length){ const ar=C.regions.map(g=>({name:g.name,state:g.admin1,pct:evAnom(g,ys)})).filter(x=>x.pct!=null).sort((x,y)=>x.pct-y.pct); out.areas_in_country={country:C.name,level:C.level,crop_years:ys,areas_with_data:ar.length,below_trend:ar.filter(x=>x.pct<0).length,worst:ar.slice(0,5),best:ar.slice(-5).reverse()}; } }
      if(a.place){ const R=resolvePlace(a.country,a.place); if(R.hit){ const ys=eventYears(e.id,R.hit.cc); out.place={...placeLabel(R.hit),crop_years:ys,pct_from_trend:evAnom(R.hit.r,ys),each_year:ys.map(y=>({year:y,pct:anomAt(R.hit.r,y)}))}; } else out.place=R; }
      return out; }},
  list_events:{d:'List ENSO events (1950–2024) with strength, peak and dates. Filters optional.',p:{type:{type:'string',enum:['El Niño','La Niña','any']},min_strength:{type:'string',enum:['weak','moderate','strong','very strong']},from_year:{type:'integer'},to_year:{type:'integer'}},req:[],
    run:a=>{ let ev=DATA.events; if(a.type&&a.type!=='any') ev=ev.filter(e=>e.type===a.type); if(a.min_strength) ev=ev.filter(e=>INT_RANK[e.intensity]>=INT_RANK[a.min_strength]); if(a.from_year) ev=ev.filter(e=>e.endYear>=a.from_year); if(a.to_year) ev=ev.filter(e=>e.startYear<=a.to_year);
      const last=DATA.oni.v.length-1; return {count:ev.length,events:ev.map(e=>`${e.id} | ${e.type} ${e.label} | ${e.intensity} | peak ${e.peak>0?'+':''}${e.peak} °C ${e.peakSeason} ${e.peakYear} | ${e.durationSeasons} seasons`),latest_oni:`${DATA.oni.v[last]} °C (${DATA.oni.season[last]} ${DATA.oni.year[last]})`}; }},
  rank_places:{d:'Rank local areas or states by their El Niño or La Niña effect (vs neutral), across one or all countries. Defaults: local areas, worst first, confident only, at least 5 observations.',p:{phase:{type:'string',enum:['El Niño','La Niña']},country:{type:'string'},level:{type:'string',enum:['area','state']},order:{type:'string',enum:['worst','best']},n:{type:'integer'},confident_only:{type:'boolean'},settings:SETTINGS_PROP},req:['phase'],
    run:a=>withSettings(a.settings,()=>{ const cc=resolveCC(a.country); if(a.country&&!cc) return {error:'Unknown country'}; const ccs=cc?[cc]:ORDER; const lvl=a.level==='state'?'state':'area'; const conf=a.confident_only!==false; const n=Math.min(15,Math.max(1,a.n||8)); const rows=[];
      for(const c of ccs){ const C=DATA.countries[c]; if(!C) continue; for(const r of (lvl==='state'?C.admin1:C.regions)){ const st=statsFor(r,c); const o=st[a.phase]; if(o.nUnits<5||st.neutral.n<5) continue; if(conf&&!o.sig) continue; rows.push({name:r.name,state:lvl==='area'?r.admin1:undefined,country:C.name,effect_pct:r1(o.diff),range90:o.ci?o.ci.map(r1):null,confident:!!o.sig,obs:o.nUnits}); } }
      rows.sort((x,y)=>a.order==='best'?y.effect_pct-x.effect_pct:x.effect_pct-y.effect_pct); return {phase:a.phase,level:lvl,qualifying:rows.length,rule:`≥5 ${a.phase} observations and ≥5 neutral years${conf?', 90% range excludes zero':''}`,top:rows.slice(0,n),settings:settingsNow()}; })},
  country_summary:{d:'National El Niño and La Niña effects for all countries side by side (plus US irrigated and non-irrigated), with ranges and the worst ENSO harvest.',p:{settings:SETTINGS_PROP},req:[],
    run:a=>withSettings(a.settings,()=>({settings:settingsNow(),countries:Object.keys(DATA.countries).map(cc=>{ const C=DATA.countries[cc]; const st=statsFor(C.national,cc); const f=o=>o.n?{effect_pct:r1(o.diff),range90:o.ci?o.ci.map(r1):null,confident:!!o.sig,obs:o.nUnits,events:o.nEvents}:null; let worst=null; for(const e of DATA.events){ const ys=eventYears(e.id,cc).filter(y=>y>=S.minYear); if(!ys.length) continue; const v=evAnom(C.national,ys); if(v!=null&&(!worst||v<worst.pct)) worst={event:`${e.type} ${e.label}`,crop_years:ys,pct:v}; }
      return {country:C.name,code:cc,years:C.yearRange.join('–'),mean_yield:Math.round(st.yieldMean),unit:C.unit,el_nino:f(st['El Niño']),la_nina:f(st['La Niña']),worst_enso_harvest:worst}; })}))},
  quadrants:{d:'Area-weighted average effect in the NW (US), NE (India), SW (Brazil, Argentina) and SE quadrants of the globe for one phase.',p:{phase:{type:'string',enum:['El Niño','La Niña']},settings:SETTINGS_PROP},req:['phase'],
    run:a=>withSettings(a.settings,()=>{ const h=hemStats(a.phase); const o={}; for(const [k,v] of Object.entries(h)) o[k]=v?{effect_pct:r1(v.mean),range90:v.ci.map(r1),areas:v.n,below_zero:v.below,countries:v.countries.map(c=>DATA.countries[c].name)}:'no cotton areas'; return {phase:a.phase,quadrants:o,settings:settingsNow()}; })},
  open_view:{d:'Change what the user sees in the dashboard: tab, country, place, event, map metric and settings. Use it to show the evidence for your answer.',p:{tab:{type:'string',enum:['overview','explore','trends','data','events','compare','sources']},country:{type:'string'},place:{type:'string'},event:{type:'string'},map_metric:{type:'string',enum:['yield','la_nina','el_nino']},years:{type:'string'},events:{type:'string',enum:['all','moderate','strong']},count:{type:'string',enum:['year','event']}},req:[],
    run:a=>{ const TAB={overview:'findings',explore:'map',map:'map',trends:'area',data:'data',events:'events',compare:'compare',sources:'sources'}; const done=[];
      if(a.country){ const cc=resolveCC(a.country); if(!cc) return {error:'Unknown country'}; if(cc!==S.cc){ S.cc=cc; S.a1=null; S.sel=null; S.zoom=null; } done.push('country '+DATA.countries[cc].name); }
      if(a.place){ const R=resolvePlace(a.country||null,a.place); if(!R.hit) return R; const h=R.hit; S.cc=h.cc; S.zoom=null; if(h.level==='national'){ S.a1=null; S.sel=null; } else if(h.level==='state'){ S.a1=h.r.name; S.sel=null; } else { S.a1=h.r.admin1; S.sel=h.r.id; } done.push('place '+h.r.name); }
      if(a.event){ const E=resolveEvent(a.event); if(E.e){ S.event=E.e.id; done.push('event '+E.e.id); } }
      if(a.map_metric){ S.metric={yield:'yield',la_nina:'nina',el_nino:'nino'}[a.map_metric]||'yield'; done.push('map '+a.map_metric); }
      const st=SET_FROM(a); if(Object.keys(st).length){ Object.assign(S,st); done.push('settings '+JSON.stringify(settingsNow())); }
      if(a.tab&&TAB[a.tab]) S.tab=TAB[a.tab]; else if(!a.tab&&a.place&&['events','compare','sources'].includes(S.tab)) S.tab='map';
      if(typeof G!=='undefined'&&G.playing){ G.playing=false; clearInterval(G.timer); const pb=document.getElementById('globePlay'); if(pb) pb.textContent='▶ Play'; }
      renderAll(); if(window.innerWidth<760) closeChat(); return {ok:true,now_showing:viewNow(),changed:done}; }},
};
const TOOL_SCHEMAS=Object.entries(TOOLS).map(([name,t])=>({type:'function',function:{name,description:t.d,parameters:{type:'object',properties:t.p,required:t.req}}}));
const TAB_NAMES={findings:'Overview',map:'Explore',area:'Trends',data:'Data',events:'Events',compare:'Compare',sources:'Sources'};
function viewNow(){ const f=cur(); const C=country(); return {tab:TAB_NAMES[S.tab],country:C.name,place:f.r.name,level:f.level==='region'?C.level:f.level==='admin1'?'state':'national',state:f.level==='region'?f.r.admin1:undefined,event:S.event||undefined,map_metric:S.metric,settings:settingsNow()}; }

function systemPrompt(){ return `You are the guide inside the "Cotton × ENSO Explorer" dashboard, which links El Niño/La Niña to cotton yields in the US, Brazil, India and Argentina by country, state and county/municipality/district/department.
Rules:
1. Every number you state must come from a tool result in this chat. Never use memory for figures. If the tools cannot answer, say so plainly.
2. For definitions, methods, data sources, chart meanings or limitations call search_guide first. For places, years, events and rankings call the data tools. Call several tools at once when useful.
3. An "effect" is the average % deviation from that place's own yield trend in El Niño (or La Niña) crop years minus the same in neutral years. Always say whether it is confident (90% range excludes zero) or uncertain, and how many years it rests on. It is an association, not proof of cause.
4. Write for a non-expert: short paragraphs or bullets, ≤170 words unless asked for more, key numbers in **bold**, plain words over jargon, one small example when it helps.
5. Cite guide sections you used like [§4.4]. Do not invent sections.
6. When a view would show the evidence, call open_view (e.g. the place on the Explore map or its Trends) and say what you opened.
Defaults: settings apply as shown below; use the settings argument only for what-if questions. Country codes: US, Brazil, India, Argentina, US_IRR (irrigated), US_NON (non-irrigated).
The user is looking at: ${JSON.stringify(viewNow())}`; }

// ---------------------------------------------------------------- model call
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function conn(){ const key=lsGet(LS.key); const mode=lsGet(LS.mode)||(proxyOn()?'proxy':key?'key':''); return {mode:mode==='key'&&key?'key':(proxyOn()?'proxy':(key?'key':'')),key,model:lsGet(LS.model)||'openai/gpt-oss-120b'}; }
async function callLLM(messages,{noTools=false}={}){
  const c=conn(); if(!c.mode) throw Object.assign(new Error('not-configured'),{code:'setup'});
  const body={messages}; if(!noTools){ body.tools=TOOL_SCHEMAS; body.tool_choice='auto'; }
  let url,headers={'Content-Type':'application/json'};
  if(c.mode==='key'){ url=GROQ_URL; headers.Authorization='Bearer '+c.key; Object.assign(body,{model:c.model,temperature:0.2,max_completion_tokens:1100}); if(/gpt-oss/.test(c.model)) body.reasoning_effort='low'; }
  else { url=CHAT_PROXY.replace(/\/+$/,'')+'/chat'; body.max_tokens=1100; }
  for(let attempt=0;attempt<4;attempt++){
    let r; try{ r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)}); }catch(e){ throw Object.assign(new Error('network'),{code:'network'}); }
    if(r.ok){ const j=await r.json(); j._model=r.headers.get('x-model')||j.model; return j; }
    let txt=''; try{ txt=await r.text(); }catch(e){}
    if(r.status===429){ let wait=+r.headers.get('retry-after'); if(!wait){ const m=txt.match(/try again in ([\d.]+)\s*(ms|s|m)/i); if(m) wait=m[2]==='ms'?+m[1]/1000:m[2]==='m'?+m[1]*60:+m[1]; }
      if(!wait||wait>40||attempt===3) throw Object.assign(new Error('rate'),{code:'rate',wait}); setStatus(`The free AI tier is busy — retrying in ${Math.ceil(wait)} s…`); await sleep(Math.ceil(wait)*1000+300); continue; }
    if(r.status===400&&/tool_use_failed|failed_generation/.test(txt)&&attempt<2){ continue; }
    if(r.status===401) throw Object.assign(new Error('auth'),{code:'auth'});
    throw Object.assign(new Error('HTTP '+r.status+': '+txt.slice(0,240)),{code:'http'});
  }
}

// ---------------------------------------------------------------- agent loop
let HIST=[], BUSY=false;
async function ask(q){
  if(BUSY||!q.trim()) return; BUSY=true; setBusy(true); hideSuggest();
  addMsg('user',q); const box=addMsg('bot',''); const steps=el('div','cx-steps'); box.appendChild(steps); const ans=el('div','cx-md'); box.appendChild(ans);
  const messages=[{role:'system',content:systemPrompt()},...HIST.slice(-6),{role:'user',content:q}];
  const cited=new Set(); let final='',model='';
  try{
    for(let round=0;round<=MAX_ROUNDS;round++){
      setStatus(round?'Reading the results…':'Thinking…');
      const j=await callLLM(messages,{noTools:round===MAX_ROUNDS}); model=j._model||model; const m=j.choices&&j.choices[0]&&j.choices[0].message; if(!m) throw new Error('Empty reply');
      const calls=m.tool_calls||[];
      if(!calls.length){ final=(m.content||'').trim(); break; }
      messages.push({role:'assistant',content:m.content||'',tool_calls:calls});
      for(const tc of calls){ let args={}; try{ args=JSON.parse(tc.function.arguments||'{}')||{}; }catch(e){}
        const t=TOOLS[tc.function.name]; let res; try{ res=t?t.run(args):{error:'unknown tool '+tc.function.name}; }catch(e){ res={error:String(e.message||e)}; }
        if(tc.function.name==='search_guide'&&res.sections) res.sections.forEach(s=>cited.add(s.cite.slice(1)));
        steps.appendChild(stepChip(tc.function.name,args,res));
        let s=JSON.stringify(res); if(s.length>4200) s=s.slice(0,4200)+'…(truncated)';
        messages.push({role:'tool',tool_call_id:tc.id,content:s}); }
      scrollDown();
    }
    if(!final) final='I could not finish that answer — please try rephrasing.';
    ans.innerHTML=md(final); wireCites(ans);
    const foot=el('div','cx-foot'); foot.textContent=`${(model||'').replace('openai/','')} · computed from this dashboard's data`; box.appendChild(foot);
    HIST.push({role:'user',content:q},{role:'assistant',content:final.slice(0,1600)});
  }catch(e){ ans.innerHTML=errHtml(e); }
  setStatus(''); setBusy(false); scrollDown();
}
function errHtml(e){
  if(e.code==='setup') return setupHtml();
  if(e.code==='rate') return `<p>The free AI tier has hit its per-minute limit${e.wait?` (wait about ${Math.ceil(e.wait)} s)`:''}. Please try again shortly — everything else in the dashboard works as usual.</p>`;
  if(e.code==='auth') return `<p>The Groq API key was rejected. Open <b>⚙</b> in this panel to fix it.</p>`;
  if(e.code==='network') return `<p>Couldn't reach the AI service. If you opened this page inside another app's preview, open the public site instead: <a href="https://leoanish.github.io/cotton-enso-explorer/" target="_blank" rel="noopener">leoanish.github.io/cotton-enso-explorer</a>.</p>`;
  return `<p>Something went wrong: ${esc(e.message||String(e))}</p>`; }

// ---------------------------------------------------------------- rendering
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function inline(s){ return s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<i>$2</i>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|#[^)\s]*)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/\[§\s?(\d+\.\d+)\]/g,(m,id)=>{ const s=KB.byId(id); return s?`<button class="cx-cite" data-id="${id}" title="${esc(s.title)}">§${id}</button>`:''; })
  .replace(/【[^】]*】/g,''); }
function md(src){ const lines=esc(src).split('\n'); let out='',list=null,tbl=null,code=null;
  const close=()=>{ if(list){ out+=`</${list}>`; list=null; } if(tbl){ out+=tableHtml(tbl); tbl=null; } };
  for(const ln of lines){
    if(/^```/.test(ln)){ if(code!==null){ out+=`<pre>${code}</pre>`; code=null; } else { close(); code=''; } continue; } if(code!==null){ code+=ln+'\n'; continue; }
    if(/^\s*\|.*\|\s*$/.test(ln)){ if(list){ out+=`</${list}>`; list=null; } (tbl=tbl||[]).push(ln); continue; } else if(tbl){ out+=tableHtml(tbl); tbl=null; }
    let m;
    if((m=ln.match(/^\s*[-*•]\s+(.*)/))){ if(list!=='ul'){ close(); out+='<ul>'; list='ul'; } out+=`<li>${inline(m[1])}</li>`; continue; }
    if((m=ln.match(/^\s*\d+[.)]\s+(.*)/))){ if(list!=='ol'){ close(); out+='<ol>'; list='ol'; } out+=`<li>${inline(m[1])}</li>`; continue; }
    close();
    if((m=ln.match(/^#{1,4}\s+(.*)/))){ out+=`<h4>${inline(m[1])}</h4>`; continue; }
    if(/^\s*(---|\*\*\*)\s*$/.test(ln)){ out+='<hr>'; continue; }
    if(ln.trim()) out+=`<p>${inline(ln)}</p>`; }
  close(); if(code!==null) out+=`<pre>${code}</pre>`; return out; }
function tableHtml(rows){ const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()); const body=rows.filter(r=>!/^\s*\|?\s*:?-{2,}/.test(r)); if(!body.length) return '';
  const [h,...rest]=body; return `<div class="cx-tw"><table><thead><tr>${cells(h).map(c=>`<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map(r=>`<tr>${cells(r).map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function wireCites(root){ root.querySelectorAll('.cx-cite').forEach(b=>b.onclick=()=>showSection(b.dataset.id)); }
function slug(t){ return t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s/g,'-'); }
function showSection(id){ const s=KB.byId(id); if(!s) return; const p=document.getElementById('cxSec'); p.querySelector('.cx-sec-t').textContent=`§${s.id} ${s.title}`; p.querySelector('.cx-sec-b').innerHTML=md(s.body); p.querySelector('a').href=GUIDE_URL+'#'+slug(s.id+' '+s.title); p.classList.add('open'); }
const ICON={search_guide:'📘',find_place:'🔎',get_place_stats:'📊',get_year:'📅',get_event:'🌊',list_events:'🗓️',rank_places:'🏆',country_summary:'🌎',quadrants:'🧭',open_view:'👁️'};
function stepChip(name,a,res){ const lab={search_guide:`Guide: “${a.query||''}”`,find_place:`Find “${a.name||''}”`,get_place_stats:`Stats · ${[a.place,a.country].filter(Boolean).join(', ')||'national'}${a.settings?' · what-if':''}`,get_year:`${a.place||a.country} · ${a.year}`,get_event:`Event ${a.event||''}${a.country?' · '+a.country:''}`,list_events:'List events',rank_places:`Rank ${a.level==='state'?'states':'areas'} · ${a.phase||''}${a.country?' · '+a.country:''}`,country_summary:'All countries',quadrants:`Quadrants · ${a.phase||''}`,open_view:`Opened ${[a.tab,a.place||a.country,a.event].filter(Boolean).join(' · ')||'view'}`}[name]||name;
  const d=el('details','cx-step'+(res&&res.error?' err':'')); const s=el('summary'); s.textContent=`${ICON[name]||'⚙'} ${lab}`; d.appendChild(s); const pre=el('pre'); pre.textContent=JSON.stringify(res,null,1).slice(0,3000); d.appendChild(pre); return d; }
function el(t,c){ const e=document.createElement(t); if(c) e.className=c; return e; }

// ---------------------------------------------------------------- UI
const CSS=`
.cx-fab{position:fixed;right:18px;bottom:18px;z-index:60;border:0;border-radius:999px;padding:11px 17px 11px 14px;background:var(--accent);color:#111;font:inherit;font-weight:700;font-size:13.5px;display:flex;gap:8px;align-items:center;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .15s}
.cx-fab:hover{transform:translateY(-2px)} .cx-fab .sp{font-size:16px} body.cx-open .cx-fab{opacity:0;pointer-events:none}
.cx{position:fixed;top:0;right:0;height:100%;width:min(440px,100vw);z-index:70;background:var(--panel);border-left:1px solid var(--line-2);box-shadow:-20px 0 50px rgba(0,0,0,.35);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .22s ease}
body.cx-open .cx{transform:none}
.cx-h{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 18px;border-bottom:1px solid var(--line)} .cx-h .t{flex:1;min-width:0} .cx-h b{font-size:15px;display:block} .cx-h small{color:var(--ink-3);font-size:11.5px}
.cx-h button{border:1px solid var(--line);background:var(--panel-2);color:var(--ink-2);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px} .cx-h button:hover{color:var(--ink)}
.cx-b{flex:1;overflow:auto;padding:14px 16px 6px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
.cx-m{max-width:100%;font-size:13.5px;line-height:1.55} .cx-m.user{align-self:flex-end;background:var(--panel-2);border:1px solid var(--line-2);padding:8px 12px;border-radius:14px 14px 4px 14px;max-width:85%;white-space:pre-wrap}
.cx-m.bot{align-self:stretch} .cx-md p{margin:0 0 8px} .cx-md ul,.cx-md ol{margin:0 0 8px;padding-left:20px} .cx-md li{margin:2px 0} .cx-md h4{margin:10px 0 4px;font-size:13px}
.cx-md code{background:var(--panel-2);padding:1px 5px;border-radius:5px;font-size:12px} .cx-md pre{background:var(--panel-2);padding:8px;border-radius:8px;overflow:auto;font-size:12px} .cx-md a{color:var(--accent)} .cx-md hr{border:0;border-top:1px solid var(--line);margin:10px 0}
.cx-tw{overflow:auto;margin:4px 0 10px;border:1px solid var(--line);border-radius:8px} .cx-tw table{border-collapse:collapse;font-size:12px;width:100%} .cx-tw th,.cx-tw td{padding:5px 8px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap} .cx-tw th{color:var(--ink-3);font-weight:600}
.cx-cite{border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink-2);border-radius:6px;font-size:11px;padding:0 5px;margin:0 1px;cursor:pointer;font:inherit;font-size:11px;vertical-align:1px} .cx-cite:hover{color:var(--accent);border-color:var(--accent)}
.cx-steps{display:flex;flex-direction:column;gap:4px;margin-bottom:6px} .cx-step{font-size:11.5px;color:var(--ink-3)} .cx-step summary{cursor:pointer;list-style:none;display:inline-block;padding:2px 8px;border:1px solid var(--line);border-radius:999px;background:var(--panel-2)} .cx-step summary::-webkit-details-marker{display:none} .cx-step.err summary{border-color:var(--neg);color:var(--neg)}
.cx-step pre{max-height:180px;overflow:auto;font-size:10.5px;background:var(--panel-2);padding:6px 8px;border-radius:8px;margin:4px 0 2px;white-space:pre-wrap}
.cx-foot{font-size:10.5px;color:var(--ink-3);margin-top:2px}
.cx-sug{display:flex;flex-wrap:wrap;gap:6px} .cx-sug button{border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink-2);border-radius:999px;padding:6px 11px;font:inherit;font-size:12.5px;cursor:pointer;text-align:left} .cx-sug button:hover{color:var(--ink);border-color:var(--accent)}
.cx-hello{color:var(--ink-2);font-size:13.5px} .cx-hello b{color:var(--ink)}
.cx-status{font-size:12px;color:var(--ink-3);padding:0 18px 4px;min-height:18px} .cx-status:not(:empty)::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent);margin-right:7px;animation:cxp 1s infinite alternate}
@keyframes cxp{from{opacity:.25}to{opacity:1}}
.cx-in{display:flex;gap:8px;padding:10px 14px 8px;border-top:1px solid var(--line)} .cx-in textarea{flex:1;resize:none;min-height:42px;max-height:140px;background:var(--panel-2);color:var(--ink);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px;font:inherit;font-size:13.5px} .cx-in textarea:focus{outline:none;border-color:var(--accent)}
.cx-in button{border:0;background:var(--accent);color:#111;border-radius:12px;width:44px;font-size:17px;font-weight:800;cursor:pointer} .cx-in button:disabled{opacity:.4;cursor:wait}
.cx-note{font-size:10.5px;color:var(--ink-3);padding:0 16px 10px}
.cx-cfg{display:none;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--panel-2);font-size:12.5px;color:var(--ink-2)} .cx-cfg.open{display:block}
.cx-cfg label{display:block;margin:8px 0 4px;color:var(--ink-3);font-size:11.5px;text-transform:uppercase;letter-spacing:.06em} .cx-cfg input,.cx-cfg select{width:100%;background:var(--panel);color:var(--ink);border:1px solid var(--line-2);border-radius:8px;padding:7px 9px;font:inherit;font-size:12.5px}
.cx-cfg .row{display:flex;gap:8px;margin-top:10px} .cx-setup{border:1px dashed var(--line-2);border-radius:12px;padding:12px;font-size:13px;color:var(--ink-2)} .cx-setup b{color:var(--ink)}
.cx-sec{position:absolute;inset:auto 10px 120px 10px;max-height:60%;overflow:auto;background:var(--panel);border:1px solid var(--line-2);border-radius:12px;box-shadow:var(--shadow);padding:12px 14px;display:none;font-size:12.5px;line-height:1.55} .cx-sec.open{display:block}
.cx-sec .hd{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px} .cx-sec .cx-sec-t{flex:1;font-weight:700;font-size:13px} .cx-sec button{border:0;background:transparent;color:var(--ink-3);cursor:pointer;font-size:15px} .cx-sec a{font-size:11.5px;color:var(--accent)}
.cx-sec table{border-collapse:collapse;font-size:11.5px} .cx-sec td,.cx-sec th{border-bottom:1px solid var(--line);padding:3px 6px;text-align:left}
@media (max-width:760px){ .cx-fab{right:12px;bottom:12px} }
@media print{ .cx,.cx-fab{display:none} }`;
let B,TA,SEND,ST;
function build(){
  const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
  const fab=el('button','cx-fab'); fab.id='cxFab'; fab.innerHTML='<span class="sp">✦</span>Ask the data'; fab.title='Ask questions about the data, methods and results'; fab.onclick=openChat; document.body.appendChild(fab);
  const p=el('aside','cx'); p.id='cx'; p.setAttribute('aria-label','Ask the data'); p.innerHTML=`
    <div class="cx-h"><div class="t"><b>✦ Ask the data</b><small id="cxSub">Open-weight AI · answers from this dashboard's data and guide</small></div>
      <button id="cxCfgBtn" title="Connection settings">⚙</button><button id="cxNew" title="New conversation">⟲</button><button id="cxClose" title="Close">✕</button></div>
    <div class="cx-cfg" id="cxCfg"></div>
    <div class="cx-b" id="cxBody"></div>
    <div class="cx-status" id="cxStatus"></div>
    <div class="cx-in"><textarea id="cxIn" rows="1" placeholder="Ask about any place, event or number…"></textarea><button id="cxSend" title="Send">↑</button></div>
    <div class="cx-note">AI can make mistakes. Every figure is computed by the dashboard — click the steps above an answer to see the raw results.</div>
    <div class="cx-sec" id="cxSec"><div class="hd"><span class="cx-sec-t"></span><button onclick="this.closest('.cx-sec').classList.remove('open')">✕</button></div><div class="cx-sec-b"></div><a target="_blank" rel="noopener">Open in the full guide ↗</a></div>`;
  document.body.appendChild(p);
  B=p.querySelector('#cxBody'); TA=p.querySelector('#cxIn'); SEND=p.querySelector('#cxSend'); ST=p.querySelector('#cxStatus');
  p.querySelector('#cxClose').onclick=closeChat; p.querySelector('#cxNew').onclick=()=>{ if(BUSY) return; HIST=[]; hello(); };
  p.querySelector('#cxCfgBtn').onclick=()=>{ const c=p.querySelector('#cxCfg'); c.classList.toggle('open'); if(c.classList.contains('open')) cfgHtml(); };
  SEND.onclick=()=>{ const q=TA.value; TA.value=''; autoGrow(); ask(q); };
  TA.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); SEND.click(); } if(e.key==='Escape') closeChat(); });
  TA.addEventListener('input',autoGrow);
  document.addEventListener('keydown',e=>{ if((e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName))&&!document.body.classList.contains('cx-open')){ e.preventDefault(); openChat(); } });
  hello();
}
function autoGrow(){ TA.style.height='auto'; TA.style.height=Math.min(140,TA.scrollHeight)+'px'; }
function openChat(){ document.body.classList.add('cx-open'); if(!HIST.length) hello(); setTimeout(()=>TA.focus(),230); }
function closeChat(){ document.body.classList.remove('cx-open'); }
function addMsg(who,text){ const m=el('div','cx-m '+who); if(text) m.textContent=text; B.appendChild(m); scrollDown(); return m; }
function scrollDown(){ B.scrollTop=B.scrollHeight; }
function setStatus(t){ ST.textContent=t; } function setBusy(b){ SEND.disabled=b; TA.disabled=false; }
function hideSuggest(){ B.querySelectorAll('.cx-sug').forEach(s=>s.remove()); }
function suggestions(){ const C=country(), f=cur(), lv=C.level.toLowerCase(); const out=[];
  if(f.level!=='national') out.push(`Explain ${f.r.name}'s numbers in simple words`);
  out.push(`How does El Niño affect ${C.name.split(' · ')[0]} cotton?`, `Which ${lv==='municipality'?'municipalities':lv==='county'?'counties':lv+'s'} lose most in La Niña years?`, 'What does “confident” mean here?', 'How did the 2015–16 El Niño hit each country?', 'Does India’s El Niño loss still hold since 2000?', 'How is the % from trend calculated?');
  if(baseCC(S.cc)==='US') out.push('Irrigated vs dryland cotton in La Niña years');
  return out.slice(0,6); }
function hello(){ B.innerHTML=''; const h=el('div','cx-hello');
  h.innerHTML=`<p>Hi! Ask me anything about this dashboard — a <b>place</b>, an <b>event</b>, a <b>number you see</b>, or <b>how it was calculated</b>. I look things up in the dashboard's own data and its guide, and I can open the right view for you.</p>`;
  B.appendChild(h); if(!conn().mode){ const s=el('div'); s.innerHTML=setupHtml(); B.appendChild(s); wireSetup(s); return; }
  const sg=el('div','cx-sug'); suggestions().forEach(q=>{ const b=el('button'); b.textContent=q; b.onclick=()=>ask(q); sg.appendChild(b); }); B.appendChild(sg);
  const c=conn(); document.getElementById('cxSub').textContent=c.mode==='key'?`${c.model.replace('openai/','')} via your Groq key · answers from this dashboard`:'Open-weight AI (gpt-oss) · answers from this dashboard\'s data and guide'; }
function setupHtml(){ return `<div class="cx-setup"><p><b>The assistant isn't connected yet.</b></p>
  <p>Paste a free Groq API key to use it now — it is stored only in this browser and sent only to Groq. Create one at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>.</p>
  <input id="cxKeyIn" type="password" placeholder="gsk_…" autocomplete="off" style="width:100%;margin:6px 0;background:var(--panel-2);color:var(--ink);border:1px solid var(--line-2);border-radius:8px;padding:8px"><button class="btn primary" id="cxKeySave">Save key</button>
  <p class="muted" style="font-size:11.5px;margin-top:8px">Site owner: deploy <code>chat-proxy/</code> (see its README) so visitors don't need a key.</p></div>`; }
function wireSetup(root){ const b=root.querySelector('#cxKeySave'); if(!b) return; b.onclick=()=>{ const v=root.querySelector('#cxKeyIn').value.trim(); if(!/^gsk_\w{20,}/.test(v)){ toast('That does not look like a Groq key (gsk_…)'); return; } lsSet(LS.key,v); lsSet(LS.mode,'key'); hello(); }; }
function cfgHtml(){ const c=conn(), box=document.getElementById('cxCfg');
  box.innerHTML=`<div><b>Connection</b></div>
   <label>Use</label><select id="cxMode">${proxyOn()?'<option value="proxy">Dashboard server (no key needed)</option>':''}<option value="key">My own Groq API key</option></select>
   <label>Groq API key (kept in this browser only)</label><input id="cxKey" type="password" placeholder="gsk_…" value="${esc(c.key)}" autocomplete="off">
   <label>Model (own key)</label><select id="cxModel">${['openai/gpt-oss-120b','openai/gpt-oss-20b','llama-3.3-70b-versatile','qwen/qwen3-32b'].map(m=>`<option ${m===c.model?'selected':''}>${m}</option>`).join('')}</select>
   <div class="row"><button class="btn primary" id="cxSave">Save</button><button class="btn" id="cxForget">Forget key</button></div>`;
  box.querySelector('#cxMode').value=c.mode||'key';
  box.querySelector('#cxSave').onclick=()=>{ lsSet(LS.key,box.querySelector('#cxKey').value.trim()); lsSet(LS.model,box.querySelector('#cxModel').value); lsSet(LS.mode,box.querySelector('#cxMode').value); box.classList.remove('open'); hello(); toast('Chat settings saved'); };
  box.querySelector('#cxForget').onclick=()=>{ lsSet(LS.key,''); lsSet(LS.mode,''); box.classList.remove('open'); hello(); toast('Key removed from this browser'); }; }

// test hooks (used by the automated checks; harmless in production)
window.__chat={TOOLS,KB,TOOL_SCHEMAS,systemPrompt,ask,md,resolvePlace,resolveEvent};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
