/* Grokiversity prototype: ECON 101 Unit 1 — Scarcity, Choice, and Exchange. No backend; progress in localStorage. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
function onEl(sel, ev, fn, opts){ const el=typeof sel==='string'?$(sel):sel; if(el) el.addEventListener(ev, fn, opts); return el; }
const deg = r => r*180/Math.PI, rad = d => d*Math.PI/180;
const KEY = 'grokiversity.econ101.v1';
function readStore(key){
  try{
    let raw=localStorage.getItem(key);
    if(raw==null){
      const old=key.replace(/^grokiversity/,'grokeversity');
      if(old!==key){
        raw=localStorage.getItem(old);
        if(raw!=null) localStorage.setItem(key, raw);
      }
    }
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
const store = (()=>{ const s=readStore(KEY); return (s && typeof s==='object') ? s : {}; })();
store.score = store.score || {};
[1,2,3,4].forEach(k=>{ store.score[k] = store.score[k] || {}; });
store.current = store.current || 1;
store.slide = store.slide || {};
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
function renderMath(el){ if(window.renderMathInElement) renderMathInElement(el||document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false}); }
function say(html, who='t'){ const m=document.createElement('div'); m.className='msg '+who; m.innerHTML=html; const chat=$('#chat'); if(chat){ chat.appendChild(m); chat.scrollTop=1e9; } renderMath(m); }
function toast(t){ const el=$('#toast'); if(!el) return; el.textContent=t; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2400); }

function eventClient(e){
  const t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0]);
  if(t) return {x:t.clientX,y:t.clientY};
  return {x:e.clientX,y:e.clientY};
}
function svgPt(svg,e){
  const c=eventClient(e);
  const p=svg.createSVGPoint();
  p.x=c.x; p.y=c.y;
  const ctm=svg.getScreenCTM();
  if(!ctm) return {x:0,y:0};
  return p.matrixTransform(ctm.inverse());
}
function hitHandle(id,cx,cy,color){
  color=color||'#ff8a65';
  return `<circle id="${id}" class="handle" cx="${cx}" cy="${cy}" r="36" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2"/>`;
}
(function(){
  let cap=null;
  document.addEventListener('pointerdown',e=>{
    const t=e.target;
    if(t && t.closest && t.closest('input,button,textarea,select,label,a,.q,.check,.q-actions,.choices')){ cap=null; return; }
    cap = (t && t.closest) ? t.closest('svg.diagram') : null;
  }, true);
  document.addEventListener('pointermove',e=>{
    if(!cap) return;
    if(e.target && cap.contains(e.target)) return;
    cap.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,composed:true,pointerId:e.pointerId,pointerType:e.pointerType||'touch',clientX:e.clientX,clientY:e.clientY,isPrimary:e.isPrimary!==false,buttons:e.buttons}));
  }, true);
  const clear=()=>{ cap=null; };
  document.addEventListener('pointerup',clear,true);
  document.addEventListener('pointercancel',clear,true);
})();
function fitDiagram(svg){
  if(!svg || !svg.getAttribute) return 0;
  const raw=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  if(raw.length!==4 || !raw[2] || !raw[3]) return svg.clientWidth||0;
  const parent=svg.parentElement;
  let avail=0;
  if(parent){
    const cs=getComputedStyle(parent);
    const pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
    avail=Math.max(0, parent.clientWidth-pad);
  }
  if(avail<8){
    const slide=svg.closest('.slide');
    if(slide) avail=Math.max(0, slide.clientWidth-32);
  }
  if(avail<8) return 0;
  const maxH=parseFloat(getComputedStyle(svg).maxHeight);
  const cap=(maxH && isFinite(maxH)) ? maxH : Infinity;
  const w=avail;
  let h=w*raw[3]/raw[2];
  if(h>cap) h=cap;
  if(h<80) h=Math.min(120, isFinite(cap)?cap:120);
  svg.setAttribute('width', String(raw[2]));
  svg.setAttribute('height', String(raw[3]));
  svg.style.setProperty('--diagram-ar', raw[2]+' / '+raw[3]);
  const wPx=Math.round(w)+'px', hPx=Math.round(h)+'px';
  if(svg.style.width!==wPx) svg.style.width=wPx;
  if(svg.style.height!==hPx) svg.style.height=hPx;
  return w;
}


function redrawSlide(s){
  if(!s) return;
  const id=s.dataset.id;
  if(id==='oc') drawOC();
  if(id==='ppf') drawPPF();
  if(id==='trade') drawTrade();
  if(id==='sd') drawSD();
  s.querySelectorAll('svg.diagram').forEach(fitDiagram);
}

const _diagRO=new ResizeObserver(entries=>{
  for(const ent of entries){
    const el=ent.target;
    if(!el) continue;
    if(el.tagName==='svg' || (el.matches && el.matches('svg.diagram'))){
      fitDiagram(el);
    } else {
      const root=el.classList && el.classList.contains('slide') ? el : (el.querySelector && el.querySelector('.slide.on'));
      if(root) root.querySelectorAll('svg.diagram').forEach(fitDiagram);
    }
  }
});
function observeDiagrams(s){
  if(!s || !window.ResizeObserver) return;
  try{
    _diagRO.observe(s);
    const stage=s.closest('.stage-wrap')||s.closest('.concept');
    if(stage) _diagRO.observe(stage);
    s.querySelectorAll('svg.diagram').forEach(svg=>_diagRO.observe(svg));
  }catch(e){}
}
function currentSlide(){
  const c=document.querySelector('.concept:not([hidden])');
  return (c && c.querySelector('.slide.on')) || document.querySelector('.slide.on');
}
function refreshVisibleDiagrams(){
  const s=currentSlide();
  if(s) s.querySelectorAll('svg.diagram').forEach(fitDiagram);
}
window.addEventListener('resize', refreshAndRedraw);
if(window.visualViewport) visualViewport.addEventListener('resize', refreshAndRedraw);


const ROOT = document.documentElement.dataset.root || '';
const ASSET_V=(function(){
  const scripts=document.getElementsByTagName('script');
  for(let i=0;i<scripts.length;i++){
    const src=scripts[i].src||'';
    const m=src.match(/econ\.js\?v=([^&]+)/);
    if(m) return m[1];
  }
  return '';
})();
function asset(p){ return ROOT + p; }
function lessonUrl(q){
  const base=asset('econ/unit-1.html');
  const bits=[];
  if(ASSET_V) bits.push('v='+ASSET_V);
  if(q) bits.push(q.replace(/^\?/,''));
  return bits.length? base+'?'+bits.join('&') : base;
}
function refreshAndRedraw(){
  const s=currentSlide();
  if(s) redrawSlide(s);
}
window.addEventListener('resize', refreshAndRedraw);
if(window.visualViewport) visualViewport.addEventListener('resize', refreshAndRedraw);
window.addEventListener('orientationchange', function(){ setTimeout(refreshAndRedraw, 200); });
window.addEventListener('pageshow', refreshAndRedraw);
document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshAndRedraw(); });


async function copyPrompt(){
  let txt = ($('#tutorPromptText') && ($('#tutorPromptText').textContent||'').replace(/<!--TUTOR_PROMPT_(START|END)-->/g,'').trim()) || '';
  if(!txt){ try{ txt = await (await fetch(asset('tutor-prompt-econ.md'))).text(); }catch(e){} }
  if(!txt){ toast('Could not load the prompt. Open tutor-prompt-econ.md instead.'); return; }
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Tutor prompt copied. Paste it into Grok and say “start”.');
  say('Prompt copied ✅. Open Grok, paste it as your first message, then type <b>start</b>. That tutor grades strictly and won\'t give away answers.');
}
if($('#copyPrompt')) onEl('#copyPrompt','click',copyPrompt);


const CONCEPTS = [[1,'Scarcity and opportunity cost'],[2,'The production possibilities frontier'],[3,'Comparative advantage and trade'],[4,'Markets: supply and demand']];
const unlocked = c => c===1 || (c<=4 && mastery(c-1)>=80);
function mastery(c){ const q=Q[c]; if(!q) return 0; const v=Object.values(store.score[c]||{}); return Math.round(100*v.reduce((a,b)=>a+b,0)/q.length); }
function slides(c){ return $$('#c'+c+' .slide'); }
function lastUnlocked(){ let n=1; while(n<4 && unlocked(n+1)) n++; return n; }

/* ---------- unit overview (not a concept slide; ?c= and #s indexes stay unchanged) ---------- */
function hasExplicitLessonRoute(){
  const q=new URLSearchParams(location.search);
  if(q.has('c')) return true;
  if(/#s=?[0-9]+/i.test(location.hash||'')) return true;
  return false;
}
function isOverviewRoute(){
  const q=new URLSearchParams(location.search);
  const h=(location.hash||'').toLowerCase();
  if(q.get('overview')==='1' || h==='#overview') return true;
  if(hasExplicitLessonRoute()) return false;
  return !!$('#unitOverview');
}
function writeOverviewRoute(){
  if((location.search+location.hash)!=='?overview=1') history.replaceState(null,'','?overview=1');
}
function fillOverviewConcepts(){
  const host=$('#overviewConcepts'); if(!host) return;
  host.innerHTML = CONCEPTS.map(([n,t])=>{
    const open=unlocked(n);
    const st=mastery(n)>=80?'✓':(open?'':'🔒');
    return `<button type="button" class="overview-c ${open?'':'locked'}" data-c="${n}" ${open?'':'disabled aria-disabled="true"'}><span class="n">${n}</span><span class="t">${t}</span><span class="st">${st}</span></button>`;
  }).join('');
  $$('#overviewConcepts .overview-c').forEach(b=>b.addEventListener('click',()=>{
    const c=+b.dataset.c;
    if(!unlocked(c)) return;
    startUnit(c, 0);
  }));
}
function showOverview(){
  window._grokeOverview=true;
  const ov=$('#unitOverview');
  if(ov) ov.hidden=false;
  $$('.concept').forEach(d=>d.hidden=true);
  fillOverviewConcepts();
  if($('#crumb')) $('#crumb').textContent='ECON 101 › Unit 1 › Overview';
  if($('#slidePos')) $('#slidePos').textContent='Overview';
  if($('#prevSlide')) $('#prevSlide').disabled=true;
  if($('#nextSlide')){ $('#nextSlide').disabled=false; $('#nextSlide').textContent='Start'; }
  if($('#dots')) $('#dots').innerHTML='';
  writeOverviewRoute();
  if(typeof closeDrawers==='function') closeDrawers();
  if(typeof resetPageScroll==='function') resetPageScroll();
}
function hideOverview(){
  window._grokeOverview=false;
  const ov=$('#unitOverview');
  if(ov) ov.hidden=true;
}
function startUnit(c,i){
  hideOverview();
  go(c||1, (i===undefined||i===null)?0:i);
}
if($('#startUnit')) onEl('#startUnit','click',()=>startUnit(1,0));
function readRoute(){
  const q=new URLSearchParams(location.search);
  let c=parseInt(q.get('c')||'',10);
  if(!c) c=store.current||1;
  const hs=(location.hash||'').match(/s=?([0-9]+)/i);
  let i=hs ? (parseInt(hs[1],10)-1) : (store.slide[c]||0);
  if(!unlocked(c)) c=lastUnlocked();
  const n=slides(c).length;
  i=Math.max(0, Math.min((n||1)-1, i));
  return {c,i};
}
function writeRoute(c,i){
  const next=`?c=${c}#s${i+1}`;
  if((location.search+location.hash)!==next) history.replaceState(null,'',next);
}
function drawCrumb(){
  const el=$('#crumb'); if(!el) return;
  el.textContent=`ECON 101 › Unit 1 › Concept ${store.current}`;
}
function setDrawer(name,on){
  const back=$('#'+name+'Back'), pan=$('#'+name+'Drawer'), btn=$('#'+name+'Btn');
  if(back){ back.hidden=!on; back.classList.toggle('on',on); }
  if(pan){ pan.hidden=!on; pan.classList.toggle('on',on); }
  if(btn) btn.setAttribute('aria-expanded', on?'true':'false');
}
function closeDrawers(){ setDrawer('concepts',false); setDrawer('tutor',false); }
function drawList(){
  $('#clist').innerHTML = CONCEPTS.map(([n,t])=>{ const st = mastery(n)>=80?'✓':(unlocked(n)?'●':'🔒');
    return `<button type="button" class="cbtn ${n===store.current?'active':''} ${!unlocked(n)?'locked':''}" data-c="${n}"><span>${n} · ${t}</span><span>${st}</span></button>`; }).join('');
  $$('#clist .cbtn').forEach(b=>b.addEventListener('click',()=>{ go(+b.dataset.c); closeDrawers(); }));
  const m = mastery(store.current); $('#mpct').textContent = m+'%'; $('#mbar').style.width=m+'%';
}
function go(c, i){
  hideOverview();
  if(!unlocked(c)){ say(`That concept unlocks when you reach 80% mastery on the previous one. Want a hint on a question you’re stuck on?`); return; }
  store.current=c; save();
  $$('.concept').forEach(d=>d.hidden = d.id!=='c'+c);
  if($('#deckTitle')) $('#deckTitle').textContent = CONCEPTS[c-1][1];
  drawCrumb();
  drawList();
  const idx = (i!==undefined && i!==null) ? i : (store.slide[c]||0);
  const panel=$('#c'+c);
  if(panel) panel.getBoundingClientRect();
  showSlide(c, idx, 'jump');
}
function showSlide(c, i, dir){
  const ss=slides(c); if(!ss.length) return;
  i=Math.max(0, Math.min(ss.length-1, i));
  const prev=+$('#c'+c).dataset.i || 0;
  ss.forEach((s,j)=>{
    s.classList.remove('on','exit-left','exit-right');
    if(j===i) s.classList.add('on');
    else if(dir!=='jump' && j===prev && prev!==i) s.classList.add(dir==='back'?'exit-right':'exit-left');
  });
  $('#c'+c).dataset.i=i;
  store.slide[c]=i; save();
  writeRoute(c,i);
  clearTimeout(showSlide.hideT);
  showSlide.hideT=setTimeout(()=>$$('.slide').forEach(s=>s.classList.remove('exit-left','exit-right')), 450);
  const n=ss.length;
  $('#slidePos').textContent=(i+1)+' / '+n;
  $('#prevSlide').disabled = i===0 && c!==1;
  $('#nextSlide').disabled = i===n-1;
  $('#nextSlide').textContent = (ss[i].dataset.id||'').startsWith('quiz') && i<n-1 ? 'Next problem' : 'Next';
  $('#dots').innerHTML = ss.map((s,j)=>`<button type="button" class="dot ${j===i?'on':''} ${(s.dataset.id||'').startsWith('quiz')?'quiz':''}" data-i="${j}" aria-label="Slide ${j+1}"></button>`).join('');
  $$('#dots .dot').forEach(b=>b.addEventListener('click',()=>showSlide(c, +b.dataset.i, +b.dataset.i<i?'back':'fwd')));
  ss[i].getBoundingClientRect();
  onShow(ss[i]);
  renderMath(ss[i]);
}
function onShow(s){
  if(!s) return;
  s.querySelectorAll('.term').forEach((t,i)=>{ t.classList.remove('in','hot'); setTimeout(()=>t.classList.add('in'), 80+i*160); });
  const run=()=>redrawSlide(s);
  run();
  let tries=0;
  const retry=()=>{
    run();
    const ok=[].slice.call(s.querySelectorAll('svg.diagram')).every(function(el){ const r=el.getBoundingClientRect(); return r.width>=8 && r.height>=8; });
    if(!ok && tries++<24) requestAnimationFrame(retry);
  };
  requestAnimationFrame(retry);
  [50,100,250,500,1000].forEach(function(ms){ setTimeout(run, ms); });
  observeDiagrams(s);
  s.querySelectorAll('svg.diagram').forEach(guardSvgTouch);
}
function guardSvgTouch(svg){
  if(!svg || svg.dataset.touchGuard) return;
  svg.dataset.touchGuard='1';
  const stop=function(e){
    if(e.target && e.target.closest && e.target.closest('input,button,textarea,select,label,a,.q,.check,.q-actions')) return;
    if(e.cancelable) e.preventDefault();
  };
  svg.addEventListener('touchstart', stop, {passive:false});
  svg.addEventListener('touchmove', stop, {passive:false});
}
function refreshAndRedraw(){
  const s=currentSlide();
  if(s) redrawSlide(s);
}
onEl('#prevSlide','click',()=>{ if(window._grokeOverview) return; const c=store.current; const i=store.slide[c]||0; if(c===1 && i===0){ showOverview(); return; } showSlide(c, i-1, 'back'); });
onEl('#nextSlide','click',()=>{ if(window._grokeOverview){ startUnit(1,0); return; } const c=store.current; showSlide(c, (store.slide[c]||0)+1, 'fwd'); });
document.addEventListener('keydown',e=>{
  if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(e.key==='Escape') closeDrawers();
  if(e.key==='ArrowRight') $('#nextSlide').click();
  if(e.key==='ArrowLeft') $('#prevSlide').click();
});
function applyLessonRoute(){
  if(isOverviewRoute()){ showOverview(); return; }
  hideOverview();
  const r=readRoute();
  if(r.c!==store.current) go(r.c, r.i);
  else showSlide(r.c, r.i, 'jump');
}
window.addEventListener('hashchange', applyLessonRoute);
window.addEventListener('popstate', applyLessonRoute);
if($('#conceptsBtn')){
  onEl('#conceptsBtn','click',()=>{ const on=!$('#conceptsDrawer').classList.contains('on'); closeDrawers(); setDrawer('concepts',on); });
  onEl('#conceptsBack','click',()=>setDrawer('concepts',false));
}
if($('#tutorBtn')){
  onEl('#tutorBtn','click',()=>{ const on=!$('#tutorDrawer').classList.contains('on'); closeDrawers(); setDrawer('tutor',on); });
  onEl('#tutorBack','click',()=>setDrawer('tutor',false));
}


/* ---------- interactives ---------- */
function bindDrag(svg, onMove, hit){
  if(!svg || svg.dataset.dragBound) return;
  svg.dataset.dragBound='1';
  let on=false;
  const go=function(e){
    if(!on) return;
    if(e.cancelable) e.preventDefault();
    onMove(e);
  };
  svg.addEventListener('pointerdown', function(e){
    const t=e.target;
    if(t && t.closest && t.closest('input,button,textarea,select,label,a')) return;
    const p=svgPt(svg,e);
    if(hit && !hit(p,e)) return;
    on=true;
    try{ svg.setPointerCapture(e.pointerId); }catch(_){}
    go(e);
  });
  svg.addEventListener('pointermove', go);
  const end=function(){ on=false; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function setRow(id, label, value){
  const el=$(id); if(!el) return;
  if(el.children.length>=2){ el.children[0].textContent=label; el.children[1].textContent=value; }
  else el.textContent=label+': '+value;
}

/* C1: split a day between work and study */
const oc={hours:12, work:5, wage:16, points:4};
function drawOC(){
  const svg=$('#ocSvg'); if(!svg) return;
  const W=520,H=220, pad=36, y=110, x0=pad, x1=W-pad;
  const w=Math.max(0, Math.min(oc.hours, oc.work));
  const frac=w/oc.hours;
  const x=x0+frac*(x1-x0);
  const study=oc.hours-w;
  const earn=w*oc.wage, pts=study*oc.points;
  svg.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="none"/>
    <text x="${(x0+x1)/2}" y="36" text-anchor="middle" fill="#c5cae9" font-size="14">A ${oc.hours}-hour day</text>
    <rect x="${x0}" y="${y-22}" width="${x-x0}" height="44" rx="8" fill="#ff8a65" fill-opacity=".85"/>
    <rect x="${x}" y="${y-22}" width="${x1-x}" height="44" rx="8" fill="#4dd0e1" fill-opacity=".85"/>
    <text x="${x0+10}" y="${y+5}" fill="#0f1220" font-size="13" font-weight="700">Work</text>
    <text x="${x1-10}" y="${y+5}" text-anchor="end" fill="#0f1220" font-size="13" font-weight="700">Study</text>
    ${hitHandle('ocHandle',x,y,'#ffd54f')}
    <text x="${(x0+x1)/2}" y="180" text-anchor="middle" fill="#9fa8da" font-size="13">Drag the split</text>`;
  const r1=$('#ocWork'), r2=$('#ocStudy'), r3=$('#ocEarn'), r4=$('#ocPts'), r5=$('#ocCost');
  if(r1) r1.textContent=w+' hours';
  if(r2) r2.textContent=study+' hours';
  if(r3) r3.textContent='$'+earn;
  if(r4) r4.textContent=pts+' points';
  if(r5) r5.textContent='$'+oc.wage+'  (the wage you give up)';
  bindDrag(svg, function(e){
    const p=svgPt(svg,e);
    const f=Math.max(0, Math.min(1, (p.x-x0)/(x1-x0)));
    oc.work=Math.round(f*oc.hours);
    drawOC();
  }, function(p){ return Math.abs(p.y-y)<50; });
}

/* C2: bowed PPF, draggable point */
const ppf={xmax:10, ymax:8, x:6, y:0, gx:60, gy:36, gw:420, gh:220};
function ppfYmax(x){
  const t=1-Math.pow(x/ppf.xmax,2);
  return t<=0?0:ppf.ymax*Math.sqrt(t);
}
function ppfMap(x,y){
  return {cx: ppf.gx + (x/ppf.xmax)*ppf.gw, cy: ppf.gy+ppf.gh - (y/ppf.ymax)*ppf.gh};
}
function ppfInv(px,py){
  const x=(px-ppf.gx)/ppf.gw*ppf.xmax;
  const y=(ppf.gy+ppf.gh-py)/ppf.gh*ppf.ymax;
  return {x:x, y:y};
}
function drawPPF(){
  const svg=$('#ppfSvg'); if(!svg) return;
  if(!ppf.ready){ ppf.y=ppfYmax(ppf.x); ppf.ready=1; }
  const pts=[];
  for(let i=0;i<=40;i++){
    const x=ppf.xmax*i/40, y=ppfYmax(x), p=ppfMap(x,y);
    pts.push(p.cx+','+p.cy);
  }
  const origin=ppfMap(0,0), top=ppfMap(0,ppf.ymax), right=ppfMap(ppf.xmax,0);
  const x=Math.max(0, ppf.x), y=Math.max(0, ppf.y);
  const p=ppfMap(x,y);
  const r2=(x/ppf.xmax)**2+(y/ppf.ymax)**2;
  let status, color='#26a69a';
  if(r2>1.012){ status='Unattainable'; color='#ef5350'; }
  else if(r2>0.97){ status='Efficient (on the frontier)'; color='#26a69a'; }
  else { status='Inefficient (inside)'; color='#ffd54f'; }
  let ocTxt='—';
  const yF=ppfYmax(x);
  if(r2<=1.02 && yF>0.15 && x<ppf.xmax-0.05){
    const slope=(ppf.ymax*ppf.ymax*x)/(ppf.xmax*ppf.xmax*yF);
    ocTxt=slope.toFixed(2)+' robots per pizza';
  }
  const shade=['M '+origin.cx+' '+origin.cy, 'L '+pts[0]];
  pts.forEach(s=>shade.push('L '+s));
  shade.push('Z');
  svg.innerHTML = `
    <rect x="0" y="0" width="520" height="300" fill="none"/>
    <path d="${shade.join(' ')}" fill="#4dd0e1" fill-opacity=".10"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="#82b1ff" stroke-width="3"/>
    <line x1="${origin.cx}" y1="${origin.cy}" x2="${right.cx}" y2="${right.cy}" stroke="#90a4ae" stroke-width="1.5"/>
    <line x1="${origin.cx}" y1="${origin.cy}" x2="${top.cx}" y2="${top.cy}" stroke="#90a4ae" stroke-width="1.5"/>
    <text x="${right.cx}" y="${right.cy+18}" text-anchor="middle" fill="#c5cae9" font-size="13">Pizzas</text>
    <text x="${top.cx-8}" y="${top.cy-8}" text-anchor="end" fill="#c5cae9" font-size="13">Robots</text>
    <circle cx="${p.cx}" cy="${p.cy}" r="6" fill="${color}" stroke="#fff" stroke-width="2"/>
    ${hitHandle('ppfHandle',p.cx,p.cy,'#ffd54f')}
    <text x="260" y="292" text-anchor="middle" fill="#9fa8da" font-size="13">Drag the point</text>`;
  const sx=$('#ppfX'), sy=$('#ppfY'), st=$('#ppfStatus'), so=$('#ppfOC');
  if(sx) sx.textContent=x.toFixed(1)+' pizzas';
  if(sy) sy.textContent=y.toFixed(1)+' robots';
  if(st) st.textContent=status;
  if(so) so.textContent=ocTxt;
  bindDrag(svg, function(e){
    const q=ppfInv(svgPt(svg,e).x, svgPt(svg,e).y);
    ppf.x=Math.max(0, Math.min(ppf.xmax*1.15, q.x));
    ppf.y=Math.max(0, Math.min(ppf.ymax*1.15, q.y));
    drawPPF();
  });
}

/* C3: two linear PPFs */
const trade={
  ha:8, hb:8,
  aX:2, aY:1,  // Ava: 2 bread/hr or 1 cloth/hr → 16 bread or 8 cloth; OC bread=0.5
  bX:1, bY:2,  // Ben: 1 bread/hr or 2 cloth/hr → 8 bread or 16 cloth; OC bread=2
  ta:0.5, tb:0.5
};
function tradeMax(who){
  if(who==='a') return {x: trade.ha*trade.aX, y: trade.ha*trade.aY};
  return {x: trade.hb*trade.bX, y: trade.hb*trade.bY};
}
function drawTrade(){
  const svg=$('#tradeSvg'); if(!svg) return;
  const panels=[{who:'a', name:'Ava', x0:20, x1:250}, {who:'b', name:'Ben', x0:270, x1:500}];
  const y0=40, y1=230;
  let html='';
  const pts={};
  panels.forEach(function(pan){
    const m=tradeMax(pan.who);
    const t=pan.who==='a'?trade.ta:trade.tb;
    const x=m.x*(1-t), y=m.y*t;
    const ox=pan.x0+28, oy=y1-10, w=pan.x1-pan.x0-40, h=y1-y0-20;
    const sx=ox+w, sy=oy-h;
    const px=ox+(x/m.x)*w, py=oy-(y/m.y)*h;
    pts[pan.who]={x:x,y:y,px:px,py:py};
    html += `<text x="${(pan.x0+pan.x1)/2}" y="22" text-anchor="middle" fill="#c5cae9" font-size="14">${pan.name}</text>
      <line x1="${ox}" y1="${oy}" x2="${sx}" y2="${oy}" stroke="#90a4ae"/>
      <line x1="${ox}" y1="${oy}" x2="${ox}" y2="${sy}" stroke="#90a4ae"/>
      <line x1="${ox}" y1="${oy-h}" x2="${ox+w}" y2="${oy}" stroke="#82b1ff" stroke-width="3"/>
      <text x="${sx}" y="${oy+16}" text-anchor="middle" fill="#9fa8da" font-size="11">Bread</text>
      <text x="${ox-6}" y="${sy-6}" text-anchor="end" fill="#9fa8da" font-size="11">Cloth</text>
      <circle cx="${px}" cy="${py}" r="6" fill="#ff8a65" stroke="#fff" stroke-width="2"/>
      ${hitHandle('tr'+pan.who,px,py,'#ffd54f')}`;
  });
  html += `<text x="260" y="268" text-anchor="middle" fill="#9fa8da" font-size="13">Drag each point</text>`;
  svg.innerHTML=html;
  const ax=pts.a.x, ay=pts.a.y, bx=pts.b.x, by=pts.b.y;
  if($('#trAX')) $('#trAX').textContent=ax.toFixed(1)+' bread';
  if($('#trAY')) $('#trAY').textContent=ay.toFixed(1)+' cloth';
  if($('#trBX')) $('#trBX').textContent=bx.toFixed(1)+' bread';
  if($('#trBY')) $('#trBY').textContent=by.toFixed(1)+' cloth';
  if($('#trTot')) $('#trTot').textContent=(ax+bx).toFixed(1)+' bread, '+(ay+by).toFixed(1)+' cloth';
  const ocA=trade.aY/trade.aX, ocB=trade.bY/trade.bX;
  if($('#trOCA')) $('#trOCA').textContent=ocA.toFixed(2)+' cloth per bread';
  if($('#trOCB')) $('#trOCB').textContent=ocB.toFixed(2)+' cloth per bread';
  if($('#trCA')) $('#trCA').textContent= ocA<ocB ? 'Ava in bread, Ben in cloth' : (ocB<ocA ? 'Ben in bread, Ava in cloth' : 'Neither (same cost)');
  bindDrag(svg, function(e){
    const p=svgPt(svg,e);
    const hitA=p.x<260;
    const pan=hitA?{x0:20,x1:250,who:'a'}:{x0:270,x1:500,who:'b'};
    const m=tradeMax(pan.who);
    const ox=pan.x0+28, oy=230-10, w=pan.x1-pan.x0-40, h=230-40-20;
    // project onto the PPF line from (ox, oy-h)=(0, ymax) to (ox+w, oy)=(xmax,0)
    let t=(p.x-ox)/w; // 0 at left (all Y) wait: x = xmax*(1-t) so t=0 is all X at right? 
    // t is fraction of hours on Y: left-top is t=1 (x=0), right-bottom is t=0 (y=0)
    // px = ox + (x/m.x)*w = ox + (1-t)*w  => t = 1 - (p.x-ox)/w
    t=1-(p.x-ox)/w;
    // also use y
    const ty=(oy-p.y)/h; // y/m.y
    t=(t+ty)/2;
    t=Math.max(0, Math.min(1, t));
    if(hitA) trade.ta=t; else trade.tb=t;
    drawTrade();
  });
}

/* C4: supply and demand with draggable curves and a posted price */
const sd={a:24, b:0.2, c:4, d:0.2, p:14};
function sdEq(){
  const Q=(sd.a-sd.c)/(sd.b+sd.d);
  const P=sd.a-sd.b*Q;
  return {P:P, Q:Q};
}
function sdQd(P){ return (sd.a-P)/sd.b; }
function sdQs(P){ return (P-sd.c)/sd.d; }
function sdMap(Q,P){
  const gx=56, gy=20, gw=430, gh=230;
  const Qmax=80, Pmax=28;
  return {x: gx+(Q/Qmax)*gw, y: gy+gh-(P/Pmax)*gh, gx, gy, gw, gh, Qmax, Pmax};
}
function sdInv(x,y){
  const m=sdMap(0,0);
  return {Q:(x-m.gx)/m.gw*m.Qmax, P:(m.gy+m.gh-y)/m.gh*m.Pmax};
}
function drawSD(){
  const svg=$('#sdSvg'); if(!svg) return;
  const eq=sdEq();
  const m0=sdMap(0,0);
  function pts(isD){
    const arr=[];
    for(let i=0;i<=40;i++){
      const Q=i/40*m0.Qmax;
      const P=isD? (sd.a-sd.b*Q) : (sd.c+sd.d*Q);
      if(P<0||P>m0.Pmax+2) continue;
      const p=sdMap(Q,P);
      arr.push(p);
    }
    return arr;
  }
  const dpts=pts(true), spts=pts(false);
  const e=sdMap(eq.Q, eq.P);
  const posted=Math.max(0.5, sd.p);
  const pl=sdMap(0, posted), pr=sdMap(m0.Qmax, posted);
  const Qd=sdQd(posted), Qs=sdQs(posted);
  const pd=sdMap(Math.max(0,Qd), posted), ps=sdMap(Math.max(0,Qs), posted);
  const atEq=Math.abs(posted-eq.P)<0.25;
  let shade='';
  if(atEq && eq.Q>0){
    const choke=sdMap(0, sd.a);
    const mid=sdMap(eq.Q, eq.P);
    const originP=sdMap(0, eq.P);
    shade += `<polygon points="${choke.x},${choke.y} ${mid.x},${mid.y} ${originP.x},${originP.y}" class="cs-shade"/>`;
    const sint=sdMap(0, Math.max(0,sd.c));
    const sbase=sd.c>=0?sint:sdMap(0,0);
    shade += `<polygon points="${sbase.x},${sbase.y} ${mid.x},${mid.y} ${originP.x},${originP.y}" class="ps-shade"/>`;
  } else {
    const qa=Math.min(Qd,Qs), qb=Math.max(Qd,Qs);
    if(isFinite(qa) && isFinite(qb) && qb>qa){
      const a=sdMap(qa, posted), b=sdMap(qb, posted);
      const y2=posted>eq.P? sdMap(qa, eq.P).y : a.y;
      shade += `<rect class="xs-shade" x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,e.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(a.y-e.y)}"/>`;
    }
  }
  const dMid=dpts[Math.floor(dpts.length/2)]||e;
  const sMid=spts[Math.floor(spts.length/2)]||e;
  svg.innerHTML = `
    <rect x="0" y="0" width="520" height="300" fill="none"/>
    ${shade}
    <line x1="${m0.gx}" y1="${m0.y}" x2="${sdMap(m0.Qmax,0).x}" y2="${m0.y}" stroke="#90a4ae"/>
    <line x1="${m0.gx}" y1="${m0.y}" x2="${m0.gx}" y2="${sdMap(0,m0.Pmax).y}" stroke="#90a4ae"/>
    <text x="${sdMap(m0.Qmax,0).x}" y="${m0.y+16}" text-anchor="end" fill="#c5cae9" font-size="13">Quantity</text>
    <text x="${m0.gx-8}" y="${sdMap(0,m0.Pmax).y}" text-anchor="end" fill="#c5cae9" font-size="13">Price</text>
    <polyline points="${dpts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#4dd0e1" stroke-width="3"/>
    <polyline points="${spts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#ff8a65" stroke-width="3"/>
    <line x1="${pl.x}" y1="${pl.y}" x2="${pr.x}" y2="${pr.y}" stroke="#ffd54f" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="${e.x}" cy="${e.y}" r="5" fill="#e8eaf6"/>
    ${hitHandle('sdDem',dMid.x,dMid.y,'#4dd0e1')}
    ${hitHandle('sdSup',sMid.x,sMid.y,'#ff8a65')}
    ${hitHandle('sdP',pl.x+8,pl.y,'#ffd54f')}
    <text x="260" y="294" text-anchor="middle" fill="#9fa8da" font-size="13">Drag a curve or the price</text>`;
  const csVal=atEq? 0.5*(sd.a-eq.P)*eq.Q : null;
  const psVal=atEq? 0.5*(eq.P-sd.c)*eq.Q : null;
  if($('#sdPstar')) $('#sdPstar').textContent='$'+eq.P.toFixed(1)+'/unit';
  if($('#sdQstar')) $('#sdQstar').textContent=eq.Q.toFixed(1)+' units';
  if($('#sdPosted')) $('#sdPosted').textContent='$'+posted.toFixed(1)+'/unit';
  const QdShow=isFinite(Qd)?Math.max(0,Qd):NaN, QsShow=isFinite(Qs)?Math.max(0,Qs):NaN;
  if($('#sdQd')) $('#sdQd').textContent=isFinite(QdShow)?QdShow.toFixed(1)+' units':'—';
  if($('#sdQs')) $('#sdQs').textContent=isFinite(QsShow)?QsShow.toFixed(1)+' units':'—';
  const gap=QdShow-QsShow;
  if($('#sdGap')) $('#sdGap').textContent= !isFinite(gap)? '—' : (Math.abs(gap)<0.15? 'Equilibrium' : (gap>0? 'Shortage of '+gap.toFixed(1) : 'Surplus of '+(-gap).toFixed(1)));
  if($('#sdCS')) $('#sdCS').textContent= csVal==null? '—' : '$'+Math.round(csVal);
  if($('#sdPS')) $('#sdPS').textContent= psVal==null? '—' : '$'+Math.round(psVal);
  bindDrag(svg, function(e){
    const p=svgPt(svg,e);
    const inv=sdInv(p.x,p.y);
    const which=svg.dataset.sdHit;
    if(which==='p'){ sd.p=Math.max(0.5, Math.min(27, inv.P)); }
    else if(which==='d'){
      // vertical shift of demand: new intercept so curve passes near pointer Q at this P: P = a - b Q => a = P + b Q
      const Q=Math.max(0, inv.Q);
      sd.a=Math.max(sd.c+2, Math.min(36, inv.P + sd.b*Q));
    } else if(which==='s'){
      // P = c + d Q => c = P - d Q
      const Q=Math.max(0, inv.Q);
      sd.c=Math.max(-6, Math.min(sd.a-2, inv.P - sd.d*Q));
    }
    drawSD();
  }, function(p){
    const eqv=sdEq();
    const e=sdMap(eqv.Q, eqv.P);
    const dMid=sdMap((sd.a-e.y? (sd.a-14)/sd.b : 25), 14);
    // choose nearest handle
    const dem=pts(true); const dM=dem[Math.floor(dem.length/2)]||e;
    const sup=pts(false); const sM=sup[Math.floor(sup.length/2)]||e;
    const price={x:sdMap(0,sd.p).x+8, y:sdMap(0,sd.p).y};
    function dist(h){ return (p.x-h.x)**2+(p.y-h.y)**2; }
    const dd=dist(dM), ds=dist(sM), dp=dist(price);
    const m=Math.min(dd,ds,dp);
    if(m>70*70) return false;
    svg.dataset.sdHit = m===dp?'p':(m===dd?'d':'s');
    return true;
  });
}

function specializeTrade(){
  // Ava CA in bread if ocA < ocB: t=0 (all X). Ben all Y: t=1
  const ocA=trade.aY/trade.aX, ocB=trade.bY/trade.bX;
  if(ocA<=ocB){ trade.ta=0; trade.tb=1; } else { trade.ta=1; trade.tb=0; }
  drawTrade();
}
if($('#specializeBtn')) onEl('#specializeBtn','click', specializeTrade);

function tidyText(str){
  return String(str==null?'':str)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g,"'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g,'"')
    .replace(/[\u00A0\u202F\u2000-\u200A\uFEFF]/g,' ')
    .replace(/[\u2212\u2010-\u2015\uFE58\uFE63\uFF0D]/g,'-')
    .replace(/[\u00B7\u22C5\u2022\u2219]/g,'·')
    .replace(/^\s+|\s+$/g,'')
    .replace(/[.,;:]+$/,'');
}
function normU(u){
  return tidyText(u).replace(/\s+/g,'').replace(/⋅|•/g,'·').replace(/-/g,'·');
}
const UNITS={
  N:1, kN:1000, lbf:4.4482216152605,
  m:1, mm:0.001, cm:0.01, in:0.0254, ft:0.3048,
  'N·m':1, 'N.m':1, Nm:1, 'kN·m':1000, 'kN.m':1000, kNm:1000, 'lbf·ft':1.3558179483314004,
  deg:1, '°':1, rad:180/Math.PI,
  '%':1,
  '$':1, USD:1, '¢':0.01,
  '$/unit':1, 'USD/unit':1,
  units:1, unit:1, goods:1,
  hours:1, hour:1, hr:1, h:1
};
const UNIT_ALIAS={
  n:'N', newton:'N', newtons:'N',
  kn:'kN', kilonewton:'kN', kilonewtons:'kN',
  lbf:'lbf', lb:'lbf', lbs:'lbf', pound:'lbf', pounds:'lbf', poundforce:'lbf',
  m:'m', meter:'m', meters:'m', metre:'m', metres:'m',
  mm:'mm', millimeter:'mm', millimeters:'mm', millimetre:'mm', millimetres:'mm',
  cm:'cm', centimeter:'cm', centimeters:'cm', centimetre:'cm', centimetres:'cm',
  in:'in', inch:'in', inches:'in',
  ft:'ft', foot:'ft', feet:'ft',
  'n·m':'N·m','n.m':'N·m',nm:'N·m',newtonmeter:'N·m',newtonmetre:'N·m',newtonmeters:'N·m',newtonmetres:'N·m',
  'kn·m':'kN·m','kn.m':'kN·m',knm:'kN·m',kilonewtonmeter:'kN·m',
  'lbf·ft':'lbf·ft', lbfft:'lbf·ft', 'lb·ft':'lbf·ft', lbft:'lbf·ft', 'ft·lbf':'lbf·ft',
  poundfoot:'lbf·ft', poundfeet:'lbf·ft',
  deg:'deg', degree:'deg', degrees:'deg', '°':'°',
  rad:'rad', radian:'rad', radians:'rad',
  '%':'%', percent:'%', pct:'%',
  '$':'$', usd:'$', dollar:'$', dollars:'$',
  '¢':'¢', cent:'¢', cents:'¢',
  '$/unit':'$/unit', 'usd/unit':'$/unit', 'dollars/unit':'$/unit', 'dollar/unit':'$/unit',
  units:'units', unit:'units', goods:'units',
  hours:'hours', hour:'hours', hr:'hours', h:'hours'
};
const UNIT_MENUS={
  F:['N','kN','lbf'],
  M:['N·m','kN·m','lbf·ft'],
  L:['mm','cm','m','in','ft'],
  A:['°','rad'],
  P:['%'],
  USD:['$','¢'],
  PRICE:['$/unit'],
  QTY:['units'],
  TIME:['hours']
};
function canonUnit(u){
  const n=normU(u);
  if(!n) return '';
  if(n in UNITS) return n;
  const low=n.toLowerCase();
  if(low in UNIT_ALIAS) return UNIT_ALIAS[low];
  const compact=low.replace(/[·.]/g,'');
  if(compact in UNIT_ALIAS) return UNIT_ALIAS[compact];
  const keys=Object.keys(UNITS);
  for(let i=0;i<keys.length;i++){
    if(keys[i].toLowerCase()===low || normU(keys[i]).toLowerCase()===low) return keys[i];
  }
  if(low==='deg' || low==='degree' || low==='degrees' || compact==='deg') return 'deg';
  return n;
}
function unitKind(u){
  u=canonUnit(u)||normU(u);
  if(/^(deg|°|degree|degrees|rad|radian|radians)$/i.test(u) || u==='deg' || u==='°' || u==='rad') return 'A';
  if(u==='N'||u==='kN'||u==='lbf') return 'F';
  if(u==='m'||u==='mm'||u==='cm'||u==='in'||u==='ft') return 'L';
  if(u==='N·m'||u==='N.m'||u==='Nm'||u==='kN·m'||u==='kN.m'||u==='kNm'||u==='lbf·ft') return 'M';
  if(u==='%') return 'P';
  if(u==='$'||u==='USD'||u==='¢') return 'USD';
  if(u==='$/unit'||u==='USD/unit') return 'PRICE';
  if(u==='units'||u==='unit'||u==='goods') return 'QTY';
  if(u==='hours'||u==='hour'||u==='hr'||u==='h') return 'TIME';
  return '';
}
function menuKind(u){ return unitKind(u); }
function unitMenu(u){
  const k=menuKind(u);
  return k && UNIT_MENUS[k] ? UNIT_MENUS[k] : null;
}
function selectDefault(u){
  const c=canonUnit(u)||u;
  if(c==='deg') return '°';
  if(c==='N.m'||c==='Nm') return 'N·m';
  if(c==='kN.m'||c==='kNm') return 'kN·m';
  return c;
}
function convertToWanted(v, from, want){
  const f=canonUnit(from)||from, t=canonUnit(want)||want;
  if(v==null || !isFinite(v)) return {err:'Enter a number.'};
  if(!f || f===t) return {v:v};
  if(!(f in UNITS) || !(t in UNITS)) return {err:'Unknown unit “'+(from||want)+'”.'};
  if(unitKind(f)!==unitKind(t)) return {err:'Wrong kind of unit: expected '+unitHint(want)+'.'};
  return {v:v*UNITS[f]/UNITS[t], from:f};
}
function unitHint(unit){
  if(unit==='N·m'||unit==='N.m'||unit==='Nm') return 'N·m';
  if(unit==='deg') return '°';
  if(unit==='kN') return 'kN';
  if(unit==='%') return '%';
  if(unit==='USD') return '$';
  if(unit==='USD/unit') return '$/unit';
  return unit;
}
function moneyBody(v){
  if(v==null || !isFinite(+v)) return String(v);
  v=+v;
  if(Math.abs(v-Math.round(v))<1e-9) return String(Math.round(v));
  var s=v.toFixed(2);
  return s;
}
function formatExact(a){
  if(a.u==='count' || a.u==='1') return String(a.v);
  if(a.u==='$' || a.u==='USD') return '$'+moneyBody(a.v);
  if(a.u==='¢') return moneyBody(a.v)+'¢';
  if(a.u==='$/unit' || a.u==='USD/unit') return '$'+moneyBody(a.v)+'/unit';
  if(a.u==='deg') return a.v+'°';
  if(a.u==='%') return a.v+' %';
  return a.v+' '+a.u;
}
function isHalfInt(v){
  const a=Math.abs(v);
  return Math.abs(a-Math.floor(a)-0.5)<=1e-8;
}
function roundHalfAway(v){
  if(!isFinite(v)) return v;
  if(v===0) return 0;
  const s=v<0?-1:1;
  return s*Math.floor(Math.abs(v)+0.5);
}
function intTargets(v){
  if(isHalfInt(v)) return [Math.floor(v), Math.ceil(v)];
  return [roundHalfAway(v)];
}
function usesIntRound(a){
  if(!a || a.ri===false || a.u==='count') return false;
  if(a.ri===true) return true;
  if(Math.abs(a.v-roundHalfAway(a.v))<1e-9) return true;
  return Math.abs(a.v)>=10-1e-12;
}
function closeInt(user, targets){
  return targets.some(function(t){ return Math.abs(user-t)<=1e-6*Math.max(1, Math.abs(t)); });
}
function formatAns(a, short){
  if(a.u==='count') return String(a.v);
  if(!usesIntRound(a)) return formatExact(a);
  const ts=intTargets(a.v);
  const body=ts.length===2?(ts[0]+' or '+ts[1]):String(ts[0]);
  let unit;
  if(a.u==='deg') unit='°';
  else if(a.u==='1') unit='';
  else if(a.u==='%') unit=' %';
  else if(a.u==='$'||a.u==='USD'){ return (ts.length===2?('$'+ts[0]+' or $'+ts[1]):('$'+ts[0])) + (short || (ts.length===1 && Math.abs(ts[0]-a.v)<1e-9)?'':' (exact '+formatExact(a)+')'); }
  else if(a.u==='$/unit'||a.u==='USD/unit'){ const sh=ts.length===2?('$'+ts[0]+'/unit or $'+ts[1]+'/unit'):('$'+ts[0]+'/unit'); return sh + (short || (ts.length===1 && Math.abs(ts[0]-a.v)<1e-9)?'':' (exact '+formatExact(a)+')'); }
  else unit=(' '+a.u);
  const shown=body+unit;
  if(short || (ts.length===1 && Math.abs(ts[0]-a.v)<1e-9)) return shown;
  return shown+' (exact '+formatExact(a)+')';
}
function ansPlaceholder(a){
  if(a.u==='count') return 'whole number';
  if(a.u==='1') return 'number';
  if(usesIntRound(a)) return 'whole number';
  return 'number';
}
function quizRoundHint(q){
  const any=(q.ans||[]).some(usesIntRound);
  const allCount=(q.ans||[]).every(function(a){ return a.u==='count'; });
  const anyMenu=(q.ans||[]).some(function(a){ return !!unitMenu(a.u); });
  if(allCount) return '<p class="sub q-round-hint">Enter a whole number. No units needed.</p>';
  const unitBit=anyMenu?' Pick a unit from the menu if you want a different one (for example ¢ instead of $).':'';
  if(any) return '<p class="sub q-round-hint">Round to the nearest whole number in the unit shown.'+unitBit+' More precise answers within 1% still count.</p>';
  return '<p class="sub q-round-hint">Enter a precise value. Small-magnitude answers count within 1% (or the stated tolerance) — do not round these to 0 or 1.'+unitBit+'</p>';
}

function parseQty(str, unit, fromUnit){
  const raw=tidyText(str);
  if(!raw) return {err:'Enter a number.'};
  let s=raw;
  if(/^[+-]?\d+,\d+/.test(s) && s.indexOf('.')===-1) s=s.replace(',','.');
  const m=s.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if(!m) return {err:'Enter a number.'};
  const v=parseFloat(m[1]);
  if(!isFinite(v)) return {err:'Enter a number.'};
  const numText=m[1];
  let typed=tidyText(m[2]||'').replace(/[.,;:]+$/,'');
  if(unit==='count'){
    if(typed && !/^(count|qty|nodes)?$/i.test(typed)) return {err:'This is a count — no unit needed.', numText:numText};
    return {v:v, numText:numText};
  }
  if(unit==='1'){
    if(!typed || canonUnit(typed)==='1') return {v:v, numText:numText};
    if(canonUnit(typed)==='%') return {v:v/100, numText:numText, syncedUnit:'%'};
    return {err:'This quantity is a bare number (no unit).', numText:numText};
  }
  const fallback=fromUnit || '';
  const source=typed ? typed : fallback;
  if(!source){
    // Bare number is in the asked unit (the menu default).
    return {v:v, numText:numText};
  }
  if(unit==='%'){
    const cu=canonUnit(source);
    if(cu==='%' || source==='%') return {v:v, numText:numText, syncedUnit: typed? '%': undefined};
    if(cu==='1' || source==='1') return {v:v*100, numText:numText};
    return {err:'Use % .', numText:numText};
  }
  const conv=convertToWanted(v, source, unit);
  if(conv.err) return {err:conv.err, numText:numText};
  const out={v:conv.v, numText:numText};
  if(typed){
    const cu=canonUnit(typed);
    out.syncedUnit = (cu==='deg') ? '°' : selectDefault(cu||typed);
  }
  return out;
}
function gradeAns(a, raw, fromUnit){
  const p=parseQty(raw,a.u, fromUnit);
  if(p.err) return {ok:false, err:p.err, syncedUnit:p.syncedUnit, numText:p.numText};
  if(!nearly(a,p.v)) return {ok:false, err:"isn't right yet.", syncedUnit:p.syncedUnit, numText:p.numText};
  return {ok:true, syncedUnit:p.syncedUnit, numText:p.numText};
}
function unitSelectHTML(a, i){
  const menu=unitMenu(a.u);
  if(!menu) return '';
  const def=selectDefault(a.u);
  return '<select class="unit-select" data-i="'+i+'" data-want="'+a.u+'" aria-label="Unit for '+(a.q||'answer')+'">'+
    menu.map(function(u){ return '<option value="'+u+'"'+(u===def?' selected':'')+'>'+u+'</option>'; }).join('')+
    '</select>';
}
function fieldHTML(a, i, inpAttrs){
  const inp='<input data-i="'+i+'" '+inpAttrs+' placeholder="'+ansPlaceholder(a)+'">';
  const sel=unitSelectHTML(a,i);
  if(!sel) return '<label>'+a.q+'<br>'+inp+'</label>';
  return '<label>'+a.q+'<br><span class="unit-field">'+inp+sel+'</span></label>';
}
function syncTypedUnit(inp, sel, want){
  if(!inp || !sel) return;
  const p=parseQty(inp.value, want, sel.value);
  if(p.syncedUnit){
    const opts=[].slice.call(sel.options);
    for(let i=0;i<opts.length;i++){
      if(opts[i].value===p.syncedUnit || canonUnit(opts[i].value)===canonUnit(p.syncedUnit)){
        sel.value=opts[i].value;
        break;
      }
    }
    if(p.numText!=null && /[A-Za-z°%]/.test(inp.value)) inp.value=p.numText;
  }
}
function attachUnitField(inp, want){
  if(!inp || inp.dataset.unitReady) return null;
  inp.dataset.unitReady='1';
  inp.setAttribute('type','text');
  inp.setAttribute('inputmode','decimal');
  inp.setAttribute('enterkeyhint','go');
  inp.setAttribute('autocomplete','off');
  inp.setAttribute('autocapitalize','off');
  inp.setAttribute('autocorrect','off');
  inp.setAttribute('spellcheck','false');
  const menu=unitMenu(want);
  if(!menu) return null;
  let sel=inp.parentElement && inp.parentElement.classList.contains('unit-field') ? inp.parentElement.querySelector('select') : null;
  if(!sel){
    const wrap=document.createElement('span');
    wrap.className='unit-field';
    inp.replaceWith(wrap);
    wrap.appendChild(inp);
    sel=document.createElement('select');
    sel.className='unit-select';
    if(inp.dataset.i!=null) sel.dataset.i=inp.dataset.i;
    sel.dataset.want=want;
    sel.setAttribute('aria-label','Unit');
    const def=selectDefault(want);
    menu.forEach(function(u){
      const o=document.createElement('option'); o.value=u; o.textContent=u;
      if(u===def) o.selected=true;
      sel.appendChild(o);
    });
    wrap.appendChild(sel);
  }
  const sync=function(){ syncTypedUnit(inp, sel, want); };
  inp.addEventListener('input', sync);
  inp.addEventListener('change', sync);
  inp.addEventListener('blur', sync);
  return sel;
}


const Q={
 1:[{id:'q1.1',diff:'easy',text:'Opportunity cost of a concert.',
     ans:[{q:'opportunity cost',v:105,u:'$',tp:1}],
     hints:['Include the ticket and the wages given up.','Skip costs paid either way.']},
    {id:'q1.2',diff:'medium',text:'Accounting and economic profit.',
     ans:[{q:'accounting profit',v:60000,u:'$',tp:1},{q:'economic profit',v:20000,u:'$',tp:1}],
     hints:['Accounting profit subtracts only explicit costs.','Economic profit also subtracts implicit costs.']},
    {id:'q1.3',diff:'medium',text:'Opportunity cost of one more table.',
     ans:[{q:'OC of one table',v:3,u:'units',tp:1}],
     hints:['The opportunity cost is how many chairs you give up.','Use the ratio of the two intercepts.']},
    {id:'q1.4',diff:'hard',text:'Opportunity cost of a year of college.',
     ans:[{q:'opportunity cost',v:30800,u:'$',tp:1}],
     hints:['Add tuition, books, and foregone wages.','Count only extra housing above the rent you would pay anyway.']}],
 2:[{id:'q2.1',diff:'easy',text:'Output on a linear PPF.',
     ans:[{q:'cloth',v:12,u:'units',tp:1}],
     hints:['On a linear PPF, Y = Y_max − (Y_max/X_max) X.']},
    {id:'q2.2',diff:'medium',text:'Opportunity cost on a linear PPF.',
     ans:[{q:'OC of one computer',v:3,u:'units',tp:1}],
     hints:['The constant slope is Y_max / X_max.']},
    {id:'q2.3',diff:'medium',text:'Opportunity cost on a bowed-out PPF.',
     ans:[{q:'OC of the next unit',v:3,u:'units',tp:1}],
     hints:['The cost of the n-th unit is the drop in Y between n−1 and n.']},
    {id:'q2.4',diff:'hard',text:'Unused capacity inside a PPF.',
     ans:[{q:'additional cloth',v:4,u:'units',tp:1}],
     hints:['Find frontier Y at that X, then subtract current Y.']}],
 3:[{id:'q3.1',diff:'easy',text:'Absolute advantage gap.',
     ans:[{q:"Ava's extra output",v:16,u:'units',tp:1}],
     hints:['Subtract the two weekly outputs.']},
    {id:'q3.2',diff:'medium',text:'Opportunity costs of bread.',
     ans:[{q:"Ava's OC",v:2,u:'units',tp:1},{q:"Ben's OC",v:5,u:'units',tp:1}],
     hints:['OC of one loaf is cloth-per-hour divided by loaves-per-hour.']},
    {id:'q3.3',diff:'medium',text:'Terms of trade range.',
     ans:[{q:'more than',v:2,u:'units',tp:1},{q:'fewer than',v:5,u:'units',tp:1}],
     hints:['The price must lie strictly between the two opportunity costs.']},
    {id:'q3.4',diff:'hard',text:'Gains from trade.',
     ans:[{q:"Ava's extra loaves",v:6,u:'units',tp:1},{q:"Ava's extra cloth",v:2,u:'units',tp:1}],
     hints:['Specialize by comparative advantage, trade, then compare with autarky.']}],
 4:[{id:'q4.1',diff:'easy',text:'Market equilibrium.',
     ans:[{q:'P*',v:20,u:'$/unit',tp:1},{q:'Q*',v:60,u:'units',tp:1}],
     hints:['Set Qd equal to Qs and solve for P.']},
    {id:'q4.2',diff:'medium',text:'Shortage or surplus at a posted price.',
     ans:[{q:'Qd − Qs',v:20,u:'units',tp:1}],
     hints:['Plug the posted price into both equations.']},
    {id:'q4.3',diff:'medium',text:'A demand shift.',
     ans:[{q:'new P*',v:25,u:'$/unit',tp:1},{q:'new Q*',v:70,u:'units',tp:1}],
     hints:['Set the new demand equal to the original supply.']},
    {id:'q4.4',diff:'hard',text:'Consumer and producer surplus.',
     ans:[{q:'consumer surplus',v:900,u:'$',tp:1},{q:'producer surplus',v:900,u:'$',tp:1}],
     hints:['CS = (1/2)(demand intercept − P*) Q*.','PS = (1/2)(P* − supply intercept) Q*.']}]
};
const MICRO={
  c1oc:[{v:32,u:'$',tp:1}]
};
const MICRO_MC={c2in:'inside', c3ca:'ava', c4dir:'both'};

function buildQuiz(q){
  const box=document.querySelector('.q-mount[data-q="'+q.id+'"]');
  if(!box) return;
  const c=+q.id[1];
  const R=window.GrokeQuizRand;
  if(R) R.apply(q);
  const inst=R?R.get(q.id):null;
  const canFresh=inst && !inst.fixed;
  const d=document.createElement('div'); d.className='q'; d.id='Q'+q.id.replace('.','_');
  const inpAttrs='type="text" inputmode="decimal" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
  const fig=q.diagram?'<div class="q-fig">'+q.diagram+'</div>':'';
  d.innerHTML=`<div><b>${q.id}</b><span class="tag">${q.diff}</span></div><p>${q.text}</p>${fig}${quizRoundHint(q)}
    <div class="inrow">${q.ans.map((a,i)=>fieldHTML(a,i,inpAttrs)).join('')}</div>
    <div class="q-actions">
      <button type="button" class="btn" data-act="check">Check</button>
      <button type="button" class="btn ghost" data-act="hint">Hint</button>
      <button type="button" class="btn ghost" data-act="skip">Skip</button>
      <button type="button" class="btn ghost" data-act="sol">Show solution</button>
      <button type="button" class="btn ghost" data-act="again" hidden>Try a new one</button>
    </div>
    <div class="fb"></div><div class="hints"></div>`;
  let hintN=0, tries=R?R.getTries(q.id):0;
  const chk=d.querySelector('[data-act="check"]'), hb=d.querySelector('[data-act="hint"]');
  const skip=d.querySelector('[data-act="skip"]'), sol=d.querySelector('[data-act="sol"]');
  const again=d.querySelector('[data-act="again"]');
  const fb=d.querySelector('.fb');
  if(store.score[c][q.id]!==undefined){ d.classList.add('correct'); fb.className='fb ok'; fb.textContent='✓ Solved earlier (saved on this device).'; }
  function blurQuiz(){ const a=document.activeElement; if(a && a.blur) a.blur(); }
  function solHTML(){
    const lines=q.ans.map(function(a){ return a.q+': '+formatAns(a); }).join('; ');
    return (q.sol||'')+'<div><b>Answers:</b> '+lines+'  You can keep trying, skip, or go to the next problem — you are not locked here.</div>';
  }
  hb.addEventListener('click',()=>{ if(hintN<q.hints.length){ const h=document.createElement('div'); h.className='hint'; h.innerHTML='💡 '+q.hints[hintN++]; d.querySelector('.hints').appendChild(h); renderMath(h); } else say('Those are all the hints for this problem. Tell me your first step and I will check it.'); });
  sol.addEventListener('click',()=>{
    fb.className='fb';
    fb.innerHTML=solHTML();
    renderMath(fb);
  });
  skip.addEventListener('click',()=>{
    blurQuiz();
    fb.className='fb';
    fb.textContent='Skipped. Use Back or Next to leave this problem — a correct check is not required to move on.';
    const nxt=$('#nextSlide');
    if(nxt && !nxt.disabled) nxt.click();
    else if($('#prevSlide') && !$('#prevSlide').disabled) say('This is the last slide of the concept. Tap Back, or open Concepts, whenever you want to leave.');
  });
  if(again){
    again.addEventListener('click',function(){
      if(!R || !canFresh) return;
      R.fresh(q.id);
      R.apply(q);
      buildQuiz(q);
    });
  }
  chk.addEventListener('click',()=>{
    tries=R?R.bumpTries(q.id):(tries+1); let all=true; const msgs=[];
    q.ans.forEach((a,i)=>{ const inp=d.querySelector('input[data-i="'+i+'"]'), sel=d.querySelector('select[data-i="'+i+'"]');
      if(sel) syncTypedUnit(inp, sel, a.u);
      const g=gradeAns(a, inp.value, sel?sel.value:undefined);
      if(g.syncedUnit && sel){ const cu=canonUnit(g.syncedUnit); [].forEach.call(sel.options,function(o){ if(o.value===g.syncedUnit || canonUnit(o.value)===cu) sel.value=o.value; }); }
      if(g.err){ all=false; msgs.push(a.q+': '+g.err); inp.style.borderColor='var(--bad)'; return; }
      inp.style.borderColor=g.ok?'var(--ok)':'var(--bad)'; if(!g.ok){ all=false; msgs.push(a.q+" isn't right yet."); } });
    d.classList.toggle('correct',all); d.classList.toggle('wrong',!all); fb.className='fb '+(all?'ok':'no');
    fb.innerHTML = all ? '✓ Correct'+(tries>1?' (after '+tries+' tries; first-try answers count more toward mastery)':'')+'.' : msgs.join(' ')+' Try again, take a hint, skip, show the solution'+(canFresh?', or try a new one':'')+' — you can always move on with Next or Back.';
    if(again) again.hidden=!(!all && canFresh && store.score[c][q.id]===undefined);
    if(all) blurQuiz();
    const first=all && store.score[c][q.id]===undefined;
    let mastered=false;
    if(first){ const before=mastery(c); store.score[c][q.id]=tries===1?1:(tries===2?0.75:0.5); save(); drawList();
      mastered=before<80 && mastery(c)>=80;
      if(mastered){
        say(c<5?'Nice — this concept is mastered (80% or better). The next one is unlocked. Go on when you are ready.':'You have finished Statics Unit 1 on this device. For a harder review, copy the tutor prompt into Grok.');
      }
    }
    if(!all && tries===2) say('Not quite yet. Write out your first equation, with signs and units, and I will help you find the slip. You can also skip or show the solution — Next and Back still work.');
    try{ if(window.GrokeFun){ if(all) window.GrokeFun.report('correct',{first:first,tries:tries,qid:q.id,concept:c,mastered:mastered}); else window.GrokeFun.report('wrong',{qid:q.id}); } }catch(e){}
  });
  d.querySelectorAll('input').forEach(function(inp){
    const i=inp.getAttribute('data-i');
    const a=i!=null?q.ans[+i]:null;
    if(a) attachUnitField(inp, a.u);
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.keyCode===13){ e.preventDefault(); chk.click(); } });
    inp.addEventListener('focus',function(){ revealQuizControls(inp); });
  });
  box.innerHTML=''; box.appendChild(d);
  renderMath(d);
}

function shuffleQuizSlides(){
  const R=window.GrokeQuizRand;
  if(!R) return;
  [1,2,3,4,5].forEach(function(c){
    const stage=$('#c'+c);
    if(!stage) return;
    const qs=[...stage.querySelectorAll('.slide')].filter(function(s){ return (s.dataset.id||'').startsWith('quiz-'); });
    if(qs.length<2) return;
    const ids=qs.map(function(s){ const m=s.querySelector('.q-mount'); return m&&m.dataset.q; }).filter(Boolean);
    const order=R.orderOf('s'+c, ids);
    const byId={};
    qs.forEach(function(s){ const m=s.querySelector('.q-mount'); if(m) byId[m.dataset.q]=s; });
    const last=qs[qs.length-1];
    const parent=last.parentNode;
    const after=last.nextSibling;
    order.forEach(function(id){ if(byId[id]) parent.insertBefore(byId[id], after); });
  });
}



function bindChecks(){
  $$('.check').forEach(box=>{
    const key=box.dataset.check;
    box.querySelectorAll('input:not([type="checkbox"]):not([type="range"])').forEach(function(inp,i){
      if(MICRO[key] && MICRO[key][i]) attachUnitField(inp, MICRO[key][i].u);
      else {
        inp.setAttribute('type','text');
        inp.setAttribute('inputmode','decimal');
        inp.setAttribute('enterkeyhint','go');
        inp.setAttribute('autocomplete','off');
        inp.setAttribute('autocapitalize','off');
        inp.setAttribute('autocorrect','off');
        inp.setAttribute('spellcheck','false');
      }
    });
    if(MICRO[key]){
      let btn=box.querySelector('button.btn');
      const fb=box.querySelector('.fb');
      if(!btn) return;
      btn.type='button';
      if(!box.querySelector('[data-act="sol"]')){
        const row=document.createElement('div'); row.className='q-actions';
        btn.replaceWith(row);
        row.appendChild(btn);
        btn.setAttribute('data-act','check');
        const skip=document.createElement('button'); skip.type='button'; skip.className='btn ghost'; skip.dataset.act='skip'; skip.textContent='Skip';
        const sol=document.createElement('button'); sol.type='button'; sol.className='btn ghost'; sol.dataset.act='sol'; sol.textContent='Show solution';
        row.appendChild(skip); row.appendChild(sol);
        skip.addEventListener('click',function(){
          const a=document.activeElement; if(a&&a.blur) a.blur();
          fb.className='fb'; fb.textContent='Skipped. This check is practice only — use Next or Back anytime.';
          if($('#nextSlide') && !$('#nextSlide').disabled) $('#nextSlide').click();
        });
        sol.addEventListener('click',function(){
          const lines=MICRO[key].map(function(a){ return a.q? (a.q+': '+formatAns(a)) : formatAns(a); }).join('; ');
          fb.className='fb'; fb.textContent='Solution: '+lines+'  You can still try, or move on with Next or Back.';
        });
      }
      btn.addEventListener('click',()=>{
        const ins=[...box.querySelectorAll('.unit-field input, .inrow input')];
        let all=true, msgs=[];
        MICRO[key].forEach((a,i)=>{
          const inp=ins[i];
          const sel=inp && (inp.parentElement && inp.parentElement.querySelector('select'));
          if(inp && sel) syncTypedUnit(inp, sel, a.u);
          const g=gradeAns(a, inp?inp.value:'', sel?sel.value:undefined);
          if(inp) inp.style.borderColor=(g.ok)?'var(--ok)':'var(--bad)';
          if(!g.ok){ all=false; msgs.push(g.err||'Not quite.'); }
        });
        fb.className='fb '+(all?'ok':'no');
        fb.textContent=all?'✓ Right.':'Not quite. '+msgs.join(' ')+' This check is just for practice — it does not count toward mastery. You can skip, show the solution, or move on.';
      });
      box.querySelectorAll('input').forEach(function(inp){
        inp.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.keyCode===13){ e.preventDefault(); btn.click(); } });
      });
    }
    if(MICRO_MC[key]){
      const choices=box.querySelector('.choices');
      if(choices && window.GrokeQuizRand){
        const btns=[...choices.querySelectorAll('button')];
        const ids=btns.map(function(b,i){ return String(i); });
        const order=window.GrokeQuizRand.orderOf('mc-'+key, ids);
        order.forEach(function(i){ if(btns[+i]) choices.appendChild(btns[+i]); });
      }
      const fb=box.querySelector('.fb');
      box.querySelectorAll('.choices button').forEach(b=>{
        b.addEventListener('click',()=>{
          const ok=b.dataset.v===MICRO_MC[key];
          box.querySelectorAll('.choices button').forEach(x=>x.classList.remove('right','wrong'));
          b.classList.add(ok?'right':'wrong');
          fb.className='fb '+(ok?'ok':'no');
          fb.textContent=ok?'✓ Right.':'Not quite. Try another choice. This check does not count toward mastery.';
        });
      });
    }
  });
}


onEl('#reset','click',e=>{ e.preventDefault(); if(confirm('Reset all saved progress on this device?')){ localStorage.removeItem(KEY); location.reload(); } });

function reply(t){ t=t.toLowerCase();
  if(/answer|solution|just tell|give me/.test(t)) return 'I won\'t hand over the answer, because you\'d lose the learning. Tell me your first step and I\'ll check it.';
  if(/hint|stuck|help/.test(t)) return 'Name the next-best alternative, or write the equation the slide just built. Then plug in the numbers from the problem in front of you.';
  if(/slow|fast|pace|break/.test(t)) return 'You set the pace. Progress is saved on this device, so come back any time. In the full tutor, say "slower" or "faster".';
  if(/unit/.test(t)) return 'Carry units: $ for a money total, $/unit for a price, units for a quantity of a good, % for a rate, hours for time. Missing units count as wrong.';
  if(/opportunity|trade-?off|implicit|explicit|economic profit/.test(t)) return 'Opportunity cost is explicit incremental costs plus the value of the next-best alternative. Skip anything you would pay either way. Economic profit also subtracts implicit costs.';
  if(/ppf|frontier|unattainable|inefficient/.test(t)) return 'On the frontier is efficient, inside is feasible but inefficient, outside is unattainable. Opportunity cost is what you give up to move along the frontier.';
  if(/comparative|absolute|trade|autarky/.test(t)) return 'Absolute advantage is who produces more. Comparative advantage is who has the lower opportunity cost. Trade at a price between the two costs, then compare with autarky.';
  if(/supply|demand|equilibrium|surplus|shortage/.test(t)) return 'Set quantity demanded equal to quantity supplied for P* and Q*. Below P* there is a shortage (Qd > Qs). Consumer surplus is the triangle under demand and above the price.';
  if(/grok|real tutor|ai/.test(t)) return 'Tap “Copy tutor prompt for Grok” below, paste it into Grok, and say “start”. That tutor runs this whole unit. Paste the problem you see, because the numbers are randomized.';
  return 'Good question. In this demo my replies are scripted. For a real conversation, copy the tutor prompt into Grok. Meanwhile, what have you tried so far?'; }
if($('#csend')) $('#csend').onclick=()=>{ const v=$('#cin').value.trim(); if(!v) return; say(v.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;'),'s'); $('#cin').value=''; setTimeout(()=>say(reply(v)),250); };
onEl('#cin','keydown',e=>{ if(e.key==='Enter') $('#csend').click(); });

function isTextField(el){
  if(!el || !el.tagName) return false;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)){
    if(el.tagName==='INPUT' && /^(button|submit|reset|checkbox|radio|range|file|color|hidden|image)$/i.test(el.type||'')) return false;
    return true;
  }
  return !!el.isContentEditable;
}
function focusedTextField(){
  return isTextField(document.activeElement) ? document.activeElement : null;
}
function resetPageScroll(){
  const app=$('#lessonApp');
  if(app){
    app.style.transform='';
    app.style.height='';
    app.style.maxHeight='';
    app.style.top='';
  }
  try{ if(window.scrollY || window.scrollX) window.scrollTo(0,0); }catch(e){}
  if(document.documentElement) document.documentElement.scrollTop=0;
  if(document.body) document.body.scrollTop=0;
}
function clearKeyboardInset(){
  document.documentElement.classList.remove('kb-open');
  document.documentElement.style.setProperty('--kb','0px');
  resetPageScroll();
}
function applyKeyboardInset(){
  const app=$('#lessonApp');
  if(!app) return;
  const field=focusedTextField();
  const vv=window.visualViewport;
  if(!field || !vv){ clearKeyboardInset(); return; }
  const kb=Math.max(0, window.innerHeight - vv.height - (vv.offsetTop||0));
  document.documentElement.style.setProperty('--kb', kb+'px');
  document.documentElement.style.setProperty('--vvh', vv.height+'px');
  if(kb>40) document.documentElement.classList.add('kb-open');
  else document.documentElement.classList.remove('kb-open');
  resetPageScroll();
}
function scrollFieldInSlide(el){
  const slide=el && el.closest && el.closest('.slide');
  if(slide){
    const er=el.getBoundingClientRect();
    const sr=slide.getBoundingClientRect();
    const mid=(er.top+er.bottom)/2;
    const target=(sr.top+sr.bottom)/2;
    if(Math.abs(mid-target)>8 && slide.scrollBy) slide.scrollBy(0, mid-target);
    const q=el.closest('.q, .check');
    const btn=q && q.querySelector('button.btn, [data-act="check"]');
    const vv=window.visualViewport;
    if(btn && vv){
      const br=btn.getBoundingClientRect();
      const floor=sr.top + Math.min(slide.clientHeight, vv.height) - 12;
      if(br.bottom>floor && slide.scrollBy) slide.scrollBy(0, br.bottom-floor+16);
    }
  }
  resetPageScroll();
}
function revealQuizControls(el){
  applyKeyboardInset();
  requestAnimationFrame(function(){
    scrollFieldInSlide(el);
    applyKeyboardInset();
  });
}
function bindLessonSwipe(){
  const stage=$('.stage-wrap'); if(!stage) return;
  let x0=0,y0=0,t0=0,on=false;
  const ignore=function(t){
    return !!(t && t.closest && t.closest('input,textarea,button,select,a,svg.diagram,.drawer,.trig-panel,.q-actions,.choices,.handle'));
  };
  const startAt=function(x,y,t){
    if(ignore(t)){ on=false; return; }
    x0=x; y0=y; t0=Date.now(); on=true;
  };
  const endAt=function(x,y){
    if(!on) return; on=false;
    const dx=x-x0, dy=y-y0;
    if(Math.abs(dx)<70 || Math.abs(dx)<Math.abs(dy)*1.5) return;
    if(Date.now()-t0>800) return;
    const a=document.activeElement; if(a && a.blur) a.blur();
    if(dx<0){ if($('#nextSlide')) $('#nextSlide').click(); }
    else { if($('#prevSlide')) $('#prevSlide').click(); }
  };
  stage.addEventListener('touchstart',function(e){
    if(!e.touches || e.touches.length!==1) return;
    startAt(e.touches[0].clientX, e.touches[0].clientY, e.target);
  },{passive:true});
  stage.addEventListener('touchend',function(e){
    const t=e.changedTouches && e.changedTouches[0]; if(!t){ on=false; return; }
    endAt(t.clientX, t.clientY);
  },{passive:true});
  stage.addEventListener('pointerdown',function(e){
    if(e.pointerType==='mouse' && e.button!==0) return;
    startAt(e.clientX, e.clientY, e.target);
  });
  stage.addEventListener('pointerup',function(e){ endAt(e.clientX, e.clientY); });
  stage.addEventListener('pointercancel',function(){ on=false; });
}
function wireKeyboard(){
  applyKeyboardInset();
  window.addEventListener('resize', applyKeyboardInset);
  if(window.visualViewport){
    visualViewport.addEventListener('resize', applyKeyboardInset);
    visualViewport.addEventListener('scroll', applyKeyboardInset);
  }
  window.addEventListener('scroll', function(){ resetPageScroll(); }, {passive:true});
  document.addEventListener('focusin',function(e){
    if(isTextField(e.target)) revealQuizControls(e.target);
  });
  document.addEventListener('focusout',function(){
    setTimeout(function(){ if(!focusedTextField()) clearKeyboardInset(); }, 60);
  });
  document.addEventListener('touchend', function(){
    if(!focusedTextField()) requestAnimationFrame(resetPageScroll);
  }, {passive:true});
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden && !focusedTextField()) clearKeyboardInset();
  });
  ['#prevSlide','#nextSlide','#conceptsBtn','#trigBtn','#tutorBtn'].forEach(function(sel){
    const el=$(sel); if(!el) return;
    el.addEventListener('pointerdown', function(){ const a=document.activeElement; if(a && a.blur) a.blur(); }, true);
  });
  bindLessonSwipe();
}


function prepareThumbLayout(scope){
  const rootEl=scope||document;
  const OUTPUT={treeViz:1,gdLoss:1,neu:1,attn:1};
  function isLive(el){
    if(!el) return false;
    const id=el.id||'';
    return id==='signLabel'||id==='supInfo'||id==='fbdfb'||id==='trigEx'||id==='ocInfo'||id==='ppfInfo'||id==='tradeInfo'||id==='sdInfo';
  }
  function isCopy(el){
    if(!el || !el.tagName) return false;
    if(isLive(el)) return false;
    if(el.closest('.viz,.readout,.check,.q,.q-mount,.thumb-controls,.palette,.chatin')) return false;
    return el.matches('h2,h3,p,ul,ol,b,strong') || (el.tagName==='SPAN' && el.classList.contains('tag'));
  }
  function ensureReadout(host){
    let r=host.querySelector(':scope > .readout');
    if(r) return r;
    r=document.createElement('div');
    r.className='readout';
    host.appendChild(r);
    return r;
  }
  function splitControls(readout, viz){
    if(!readout) return;
    const box=document.createElement('div');
    box.className='thumb-controls';
    const move=[];
    [...readout.children].forEach(function(child){
      const hasRange=child.matches('input[type=range]') || child.querySelector && child.querySelector('input[type=range]');
      const hasCb=child.matches('label') && child.querySelector && child.querySelector('input[type=checkbox]');
      const isPal=child.classList && child.classList.contains('palette');
      const isBtn=child.matches('button') || (child.querySelector && child.querySelector('button') && !child.matches('.row,.eqcheck'));
      if(hasRange || hasCb || isPal || isBtn) move.push(child);
    });
    // range whose label is the previous sibling
    move.forEach(function(el){
      if(el.matches && el.matches('input[type=range]')){
        const prev=el.previousElementSibling;
        if(prev && prev.matches('label') && move.indexOf(prev)<0) box.appendChild(prev);
      }
      box.appendChild(el);
    });
    if(!box.childNodes.length) return;
    viz.appendChild(box);
  }
  function structure(root){
    if(!root || root.classList.contains('thumb-ready')) return;
    let viz=root.querySelector(':scope > .viz');
    const looseSvg=root.querySelector(':scope > svg.diagram');
    const grid=root.querySelector(':scope > .support-grid');
    if(!viz && !looseSvg && !grid && root.id!=='trigPanel') return;
    if(!viz){
      viz=document.createElement('div');
      viz.className='viz';
      if(looseSvg){
        looseSvg.parentNode.insertBefore(viz, looseSvg);
        viz.appendChild(looseSvg);
      } else if(grid){
        grid.parentNode.insertBefore(viz, grid);
        viz.appendChild(grid);
        grid.classList.add('thumb-diagram');
      }
    }
    const layout=document.createElement('div');
    layout.className='thumb-layout';
    const copy=document.createElement('div');
    copy.className='slide-copy';
    const kids=[...root.children];
    kids.forEach(function(el){
      if(isCopy(el)) copy.appendChild(el);
    });
    let readout=viz.querySelector(':scope > .readout');
    // Promote live labels that sit next to a bare diagram
    ['#signLabel','#fbdfb','#supInfo','#trigEx','#ocInfo','#ppfInfo','#tradeInfo','#sdInfo'].forEach(function(sel){
      const el=root.querySelector(sel);
      if(!el) return;
      if(el.closest('.readout,.slide-copy,.thumb-controls')) return;
      if(!readout) readout=ensureReadout(viz);
      readout.appendChild(el);
    });
    const pal=root.querySelector(':scope > .palette, :scope > #palette');
    const checkBtn=root.querySelector(':scope > #checkfbd');
    if(pal && pal.parentNode===root) viz.appendChild(pal);
    if(checkBtn && checkBtn.parentNode===root){
      const controls=viz.querySelector(':scope > .thumb-controls')||(function(){const d=document.createElement('div'); d.className='thumb-controls'; viz.appendChild(d); return d;})();
      controls.appendChild(checkBtn);
    }
    if(!readout) readout=viz.querySelector(':scope > .readout');
    splitControls(readout, viz);
    // Output-only plots stay in the layout so CSS can park them with the numbers
    viz.querySelectorAll('svg.diagram').forEach(function(svg){
      if(OUTPUT[svg.id]) svg.classList.add('is-output');
    });
    // Rebuild: copy, viz (diagrams + controls), readout
    if(copy.childNodes.length) layout.appendChild(copy);
    layout.appendChild(viz);
    if(readout){
      readout.style.removeProperty('grid-column');
      readout.style.removeProperty('grid-row');
      readout.style.removeProperty('grid-area');
      layout.appendChild(readout);
    }
    [...root.children].forEach(function(el){
      if(el===layout) return;
      if(el.classList && el.classList.contains('thumb-layout')) return;
      if(isCopy(el) || (el.matches && el.matches('b,strong,span,h1,h2,h3,p'))){
        if(copy.parentNode!==layout) layout.insertBefore(copy, viz);
        copy.appendChild(el);
      } else {
        layout.appendChild(el);
      }
    });
    root.appendChild(layout);
    root.classList.add('thumb-ready');
  }
  const thumbSel='.slide, .card, #trigPanel, .home-demo';
  const roots=[];
  if(rootEl.matches && rootEl.matches(thumbSel)) roots.push(rootEl);
  if(rootEl.querySelectorAll) roots.push(...rootEl.querySelectorAll(thumbSel));
  [...new Set(roots)].forEach(structure);

  // trig panel is a special root itself
  if(rootEl.id==='trigPanel' || (rootEl.querySelector && rootEl.querySelector('#trigPanel'))){
    const pan=rootEl.id==='trigPanel'?rootEl:rootEl.querySelector('#trigPanel');
    if(pan && !pan.classList.contains('thumb-ready')){
      // wrap range + live rows
      const viz=pan.querySelector('.viz')||(function(){
        const v=document.createElement('div'); v.className='viz';
        const svg=pan.querySelector('svg.diagram');
        if(svg){ svg.parentNode.insertBefore(v, svg); v.appendChild(svg); }
        return v;
      })();
      structure(pan);
    }
  }
}


function boot(){
  if(!document.querySelector('html.lesson-page, #lessonApp')) return;
  if(window.GrokeQuizRand) window.GrokeQuizRand.attachStore(store, save, 'e');
  prepareThumbLayout();
  wireKeyboard();
  bindChecks();
  Object.values(Q).forEach(list=>list.forEach(buildQuiz));
  shuffleQuizSlides();
  if(isOverviewRoute()) showOverview();
  else { hideOverview(); const r=readRoute(); go(r.c, r.i); }
  renderMath(document.body);
  const any=Object.values(store.score).some(o=>Object.keys(o||{}).length);
  if($('#chat') && !$('#chat').children.length) say(any
    ? 'Welcome back! Your progress is restored. Pick up the slide you left, or jump with the dots.'
    : 'Hi! This unit is a set of interactive slides. Drag the pictures, check yourself as you go, then try the problems. I give hints, not answers — show your work and include units.');
}
if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);

function nearly(a,v){
  if(a.ta!==undefined && Math.abs(v-a.v)<=a.ta+1e-9) return true;
  if(a.ta===undefined && (Math.abs(v-a.v)<=((a.tp||1)/100)*Math.abs(a.v||1) || Math.abs(v-a.v)<1e-6)) return true;
  if(usesIntRound(a) && closeInt(v, intTargets(a.v))) return true;
  return false;
}
try{ window.GrokiversityQuiz={prepareThumbLayout:prepareThumbLayout,shuffleQuizSlides:shuffleQuizSlides,buildQuiz:buildQuiz,applyKeyboardInset:applyKeyboardInset,clearKeyboardInset:clearKeyboardInset,resetPageScroll:resetPageScroll,parseQty:parseQty,gradeAns:gradeAns,Q:Q,MICRO:MICRO,formatAns:formatAns,formatExact:formatExact,tidyText:tidyText,usesIntRound:usesIntRound,intTargets:intTargets,nearly:nearly,unitMenu:unitMenu,selectDefault:selectDefault,convertToWanted:convertToWanted,UNITS:UNITS,drawOC:drawOC,drawPPF:drawPPF,drawTrade:drawTrade,drawSD:drawSD}; }catch(e){}
})();
