/* Grokeversity prototype: Statics Unit 1, concepts 1-5 as interactive slides. No backend; progress in localStorage. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
function onEl(sel, ev, fn, opts){ const el=typeof sel==='string'?$(sel):sel; if(el) el.addEventListener(ev, fn, opts); return el; }
const deg = r => r*180/Math.PI, rad = d => d*Math.PI/180;
const KEY = 'grokeversity.v1';
const store = (()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } })();
store.score = store.score || {};
[1,2,3,4,5].forEach(k=>{ store.score[k] = store.score[k] || {}; });
store.current = store.current || 1;
store.slide = store.slide || {};
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
function renderMath(el){ if(window.renderMathInElement) renderMathInElement(el||document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false}); }
function say(html, who='t'){ const m=document.createElement('div'); m.className='msg '+who; m.innerHTML=html; $('#chat').appendChild(m); $('#chat').scrollTop=1e9; renderMath(m); }
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2400); }
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
  if(id==='hook') drawRope();
  if(id==='force') drawOne();
  if(id==='split') drawSplit();
  if(id==='triangle') drawTri();
  if(id==='two') drawVec();
  if(id==='sign') drawSign();
  if(id==='isolate') drawIso();
  if(id==='fbd') drawFBD();
  if(id==='hang') drawHang();
  if(id==='ring') drawEq();
  if(id==='seesaw') drawSee();
  if(id==='wrench') drawWr();
  if(id==='angled') drawAng();
  if(id==='plank') drawPlank();
  if(id==='beam') drawBeam();
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
window.addEventListener('orientationchange', function(){ setTimeout(refreshAndRedraw, 200); });
window.addEventListener('pageshow', refreshAndRedraw);
document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshAndRedraw(); });

const ROOT = document.documentElement.dataset.root || '';
const ASSET_V=(function(){
  const scripts=document.getElementsByTagName('script');
  for(let i=0;i<scripts.length;i++){
    const src=scripts[i].src||'';
    const m=src.match(/app\.js\?v=([^&]+)/);
    if(m) return m[1];
  }
  return '';
})();
function asset(p){ return ROOT + p; }
function lessonUrl(q){
  const base=asset('statics/unit-1.html');
  const bits=[];
  if(ASSET_V) bits.push('v='+ASSET_V);
  if(q) bits.push(q.replace(/^\?/,''));
  return bits.length? base+'?'+bits.join('&') : base;
}


/* ---------- ME / AI track maps (landing only) ---------- */
const TRACK = {
  'Year 1': ['Calculus I','Calculus II','Physics I: Mechanics','Physics II: E&M','Chemistry','Intro Design & CAD','Programming for Engineers'],
  'Year 2': ['Calculus III','Differential Equations','Linear Algebra','Statics','Dynamics','Mechanics of Materials','Circuits & Electronics','Materials Science'],
  'Year 3': ['Thermodynamics','Fluid Mechanics','Heat Transfer','Machine Design','Manufacturing','Numerical Methods','Probability & Statistics','Measurement & Instrumentation Lab'],
  'Year 4': ['System Dynamics & Controls','Thermal-Fluid Systems Design','Mechatronics','Capstone Design I','Capstone Design II','Technical Electives ×3','Ethics & Technical Communication']
};
if($('#trackGrid')){
  $('#trackGrid').innerHTML = Object.entries(TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> c==='Statics'
    ? `<a class="course live" href="${lessonUrl()}"><span>ME 201 Statics</span><span class="badge">Play now</span></a>`
    : `<div class="course"><span>${c}</span><span class="badge">Coming soon</span></div>`).join('')}</div>`).join('');
}
const AI_TRACK = {
  'Foundations': ['What AI Is (Unit 1)','Search & Problem Solving','Probability & Bayes','Math for ML'],
  'Learning': ['Supervised Learning I','Supervised Learning II','Neural Nets & Backprop'],
  'Modern AI': ['Deep Learning','Transformers & LLMs','Reinforcement Learning'],
  'Responsibility': ['Ethics, Safety & Limits','Capstone Project']
};
if($('#aiGrid')){
  $('#aiGrid').innerHTML = Object.entries(AI_TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> `<div class="course"><span>${c.includes('Unit 1')?'AI 101 · '+c:c}</span><span class="badge">Coming soon</span></div>`).join('')}</div>`).join('');
}
function econLessonUrl(){
  const base=asset('econ/unit-1.html');
  return ASSET_V ? base+'?v='+ASSET_V : base;
}
const ECON_TRACK = {
  'Foundations': ['Scarcity, Choice, and Exchange (Unit 1)','Supply and Demand','Elasticity','Government Intervention'],
  'Microeconomics': ['Consumer Choice','Costs and Production','Market Structures','Externalities and Public Goods'],
  'Macroeconomics': ['GDP and Measurement','Inflation and Unemployment','Money, Monetary Policy, and Fiscal Policy']
};
if($('#econGrid')){
  $('#econGrid').innerHTML = Object.entries(ECON_TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> c.includes('Unit 1')
    ? `<a class="course live" href="${econLessonUrl()}"><span>ECON 101 · ${c}</span><span class="badge">Play now</span></a>`
    : `<div class="course"><span>${c}</span><span class="badge">Coming soon</span></div>`).join('')}</div>`).join('');
}

/* ---------- copy tutor prompt ---------- */
async function copyPrompt(){
  let txt = ($('#tutorPromptText').textContent||'').replace(/<!--TUTOR_PROMPT_(START|END)-->/g,'').trim();
  if(!txt){ try{ txt = await (await fetch(asset('tutor-prompt.md'))).text(); }catch(e){} }
  if(!txt){ toast('Could not load the prompt. Open tutor-prompt.md instead.'); return; }
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Tutor prompt copied. Paste it into Grok and say “start”.');
  say('Prompt copied ✅. Open Grok, paste it as your first message, then type <b>start</b>. That tutor grades strictly and won\'t give away answers.');
}
if($('#copyPrompt')) onEl('#copyPrompt','click',copyPrompt);
if($('#copyHero')) onEl('#copyHero','click',copyPrompt);

/* ---------- optional intro theme: click only, never autoplay ---------- */
(function(){
  const btn=$('#introAudio'); if(!btn) return;
  let aud=null;
  btn.addEventListener('click',()=>{
    if(!aud){
      aud=new Audio(asset('assets/audio/intro.mp3'));
      aud.addEventListener('error',()=>{ toast('The intro theme is not uploaded yet.'); btn.textContent='♪ Intro'; });
      aud.addEventListener('ended',()=>{ btn.textContent='♪ Intro'; });
    }
    if(aud.paused){
      const p=aud.play();
      if(p&&p.then) p.then(()=>{ btn.textContent='■ Stop'; }).catch(()=>toast('The intro theme is not uploaded yet.'));
    } else { aud.pause(); aud.currentTime=0; btn.textContent='♪ Intro'; }
  });
})();

/* Landing-only: old #learn bookmarks go to the lesson page. */
if(!$('#lessonApp')){
  const jump=()=>{
    const h=(location.hash||'').replace(/^#/,'').toLowerCase();
    if(h==='learn' || h.startsWith('learn') || /^c[1-5]/.test(h)){
      const c=(h.match(/c([1-5])/)||[])[1]||'1';
      location.replace(lessonUrl('c='+c));
    }
  };
  jump();
  window.addEventListener('hashchange', jump);
}

/* ---------- concept list + slides ---------- */
const CONCEPTS = [[1,'Forces as vectors'],[2,'Free-body diagrams'],[3,'Particle equilibrium'],[4,'Moments'],[5,'Rigid-body equilibrium']];
const unlocked = c => c===1 || (c<=5 && mastery(c-1)>=80);
function mastery(c){ const q=Q[c]; if(!q) return 0; const v=Object.values(store.score[c]||{}); return Math.round(100*v.reduce((a,b)=>a+b,0)/q.length); }
function slides(c){ return $$('#c'+c+' .slide'); }
function lastUnlocked(){ let n=1; while(n<5 && unlocked(n+1)) n++; return n; }
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
  el.textContent=`ME 201 Statics › Unit 1 › Concept ${store.current}`;
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
  $('#prevSlide').disabled = i===0;
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
onEl('#prevSlide','click',()=>{ const c=store.current; showSlide(c, (store.slide[c]||0)-1, 'back'); });
onEl('#nextSlide','click',()=>{ const c=store.current; showSlide(c, (store.slide[c]||0)+1, 'fwd'); });
document.addEventListener('keydown',e=>{
  if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(e.key==='Escape') closeDrawers();
  if(e.key==='ArrowRight') $('#nextSlide').click();
  if(e.key==='ArrowLeft') $('#prevSlide').click();
});
if($('#conceptsBtn')){
  onEl('#conceptsBtn','click',()=>{ const on=!$('#conceptsDrawer').classList.contains('on'); closeDrawers(); setDrawer('concepts',on); });
  onEl('#conceptsBack','click',()=>setDrawer('concepts',false));
}
if($('#tutorBtn')){
  onEl('#tutorBtn','click',()=>{ const on=!$('#tutorDrawer').classList.contains('on'); closeDrawers(); setDrawer('tutor',on); });
  onEl('#tutorBack','click',()=>setDrawer('tutor',false));
}
window.addEventListener('hashchange',()=>{
  const r=readRoute();
  if(r.c!==store.current) go(r.c, r.i);
  else if(r.i!==(store.slide[store.current]||0)) showSlide(r.c, r.i, 'jump');
});

/* ---------- trig refresher ---------- */
const trig={th:30};
function openTrig(on){
  ['trigBack','trigPanel'].forEach(id=>{ const el=$('#'+id); if(!el) return; el.hidden=!on; el.classList.toggle('on',on); });
  if(on) drawTrig();
}
onEl('#trigBtn','click',()=>openTrig(true));
onEl('#trigClose','click',()=>openTrig(false));
onEl('#trigBack','click',()=>openTrig(false));
function drawTrig(){
  trig.th=+$('#trigSl').value;
  $('#trigA').textContent=trig.th;
  const th=rad(trig.th), hyp=160, adj=hyp*Math.cos(th), opp=hyp*Math.sin(th);
  const ox=50, oy=190;
  const svg=$('#trigSvg');
  svg.innerHTML=`<polygon points="${ox},${oy} ${ox+adj},${oy} ${ox+adj},${oy-opp}" fill="#1d2550" stroke="#7c9cff" stroke-width="3"/>
    <text x="${ox+adj/2}" y="${oy+16}" fill="#9aa3c7" font-size="13" text-anchor="middle">adjacent</text>
    <text x="${ox+adj+8}" y="${oy-opp/2}" fill="#4dd0e1" font-size="13">opposite</text>
    <text x="${ox+22}" y="${oy-8}" fill="#ffd54f" font-size="14">θ</text>
    <circle class="handle" cx="${ox+adj}" cy="${oy-opp}" r="10" fill="#ffd54f" fill-opacity=".35" stroke="#ffd54f"/>`;
  $('#trigS').textContent=Math.sin(th).toFixed(3);
  $('#trigC').textContent=Math.cos(th).toFixed(3);
  const F=100;
  $('#trigEx').innerHTML=`Example: a ${F} N force at ${trig.th}° has an x-part of ${(F*Math.cos(th)).toFixed(1)} N and a y-part of ${(F*Math.sin(th)).toFixed(1)} N.`;
}
onEl('#trigSl','input',drawTrig);
(function(){
  const svg=$('#trigSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ drag=true; svg.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
  svg.addEventListener('pointermove',e=>{ if(drag) move(e); });
  svg.addEventListener('pointerup',()=>drag=false);
  function move(e){ const q=svgPt(svg,e), ox=50, oy=190, a=deg(Math.atan2(oy-q.y, q.x-ox)); $('#trigSl').value=Math.max(5,Math.min(85,Math.round(a))); drawTrig(); }
})();

/* ---------- C1: rope hook ---------- */
const rope=(function(){
  const boxX=200, hx=boxX+110, hy=190, th=Math.PI/180*35, L=170;
  return {boxX, tipX:hx+L*Math.cos(th), tipY:hy-L*Math.sin(th), th:35};
})();
function ropeHitch(){ return {x:rope.boxX+110, y:190}; }
function ropeAngle(hx,hy,tx,ty){ return deg(Math.atan2(hy-ty, tx-hx)); }
function clampRopeBoxX(x, tipX, tipY){
  const minX=16, maxX=Math.min(360, tipX-110-28);
  x=Math.max(minX, Math.min(maxX, x));
  const th=ropeAngle(x+110, 190, tipX, tipY);
  if(th<8 || th>75){
    const t=Math.max(8, Math.min(75, th));
    const hx=tipX-(190-tipY)/Math.tan(rad(t));
    x=Math.max(minX, Math.min(maxX, hx-110));
  }
  return x;
}
function clampRopeTip(tx,ty,boxX){
  const hx=boxX+110, hy=190;
  tx=Math.max(hx+24, Math.min(510, tx));
  ty=Math.max(10, Math.min(hy-12, ty));
  let th=ropeAngle(hx,hy,tx,ty);
  if(th<8 || th>75){
    th=Math.max(8, Math.min(75, th));
    const L=Math.max(80, Math.hypot(tx-hx, hy-ty));
    tx=hx+L*Math.cos(rad(th));
    ty=hy-L*Math.sin(rad(th));
  }
  return {tx, ty};
}
function drawRope(){
  const box={x:rope.boxX,y:170,w:110,h:70}, hx=box.x+box.w, hy=box.y+20;
  const tx=rope.tipX, ty=rope.tipY;
  const th=Math.max(8, Math.min(75, ropeAngle(hx,hy,tx,ty)));
  rope.th=th;
  const F=100, fx=F*Math.cos(rad(th)), fy=F*Math.sin(rad(th));
  const svg=$('#ropeSvg');
  const cx=box.x+box.w/2;
  svg.innerHTML=`<defs><marker id="ropeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker></defs>
    <line x1="20" y1="240" x2="500" y2="240" stroke="#3d4680" stroke-width="6" data-tap="floor"/>
    <rect id="ropeBoxHit" class="handle" x="${box.x-18}" y="${box.y-22}" width="${box.w+36}" height="${box.h+36}" rx="12" fill="transparent"/>
    <rect id="ropeBox" class="handle" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="#3a4170" stroke="#7c86c9" stroke-width="2" data-tap="box"/>
    <line x1="${hx}" y1="${hy}" x2="${tx}" y2="${ty}" stroke="#ff8a65" stroke-width="5" stroke-linecap="round" marker-end="url(#ropeArrow)" data-tap="rope"/>
    ${hitHandle("ropeH",tx,ty,"#ff8a65")}
    <rect class="rope-nudge-glow" x="${box.x-6}" y="${box.y-6}" width="${box.w+12}" height="${box.h+12}" rx="10" fill="none" stroke="#ffccbc" stroke-width="3" pointer-events="none"/>
    <g class="rope-drag-hint" pointer-events="none">
      <rect x="${cx-86}" y="${box.y-40}" width="172" height="30" rx="9" fill="#121528" fill-opacity=".9"/>
      <text x="${cx}" y="${box.y-19}" text-anchor="middle" fill="#f3f4ff" font-size="22" font-weight="700" font-family="system-ui,-apple-system,sans-serif">Drag the box</text>
    </g>
    <g class="rope-nudge" pointer-events="none" transform="translate(${cx+10},${box.y+22}) rotate(18)">
      <path fill="#f3f4ff" stroke="#1a1f38" stroke-width="1.1" stroke-linejoin="round" d="M7.2 2.4c.9 0 1.5.7 1.5 1.6V12c.3-.4.8-.9 1.6-.9.9 0 1.5.7 1.5 1.5v2.2c.3-.3.8-.7 1.5-.7.9 0 1.5.7 1.5 1.6v1.6c.3-.2.8-.5 1.5-.5.9 0 1.5.8 1.5 1.7v4.4c0 3.2-2.3 5.8-6.4 5.8h-1.2c-3.3 0-5.7-2.1-7.1-4.9L1.6 14.7c-.5-.9.2-1.9 1.2-1.9.4 0 .8.2 1 .6L6.2 17V4c0-.9.6-1.6 1-1.6z"/>
    </g>
    <text x="30" y="232" fill="#5c6390" font-size="13">floor</text>`;
  const setTxt=(sel,val)=>{ const el=$(sel); if(el) el.textContent=val; };
  setTxt('#ropeFloor', fx.toFixed(0)+' of 100');
  setTxt('#ropeLift', fy.toFixed(0)+' of 100');
  const share=Math.abs(fx)+Math.abs(fy)||1;
  const fb=$('#ropeFloorBar'), lb=$('#ropeLiftBar');
  if(fb) fb.style.width=(Math.abs(fx)/share*100)+'%';
  if(lb) lb.style.width=(Math.abs(fy)/share*100)+'%';
  setTxt('#ropeHint', th<25 ? 'A flatter rope pulls more along the floor.' : 'A steeper rope lifts more, and pulls the box along the floor less.');
  svg.querySelectorAll('[data-tap]').forEach(el=>el.addEventListener('click',()=>{
    const n={box:'The box is what you are trying to move.',rope:'The rope can only pull — it is in tension. Because it is angled, only part of that pull goes along the floor.',floor:'The floor is our reference. Angles here are measured up from the floor.'};
    setTxt('#ropeHint', n[el.getAttribute('data-tap')]);
  }));
}
(function(){
  const svg=$('#ropeSvg'); if(!svg) return;
  let mode=null, grabDX=0;
  function isBoxTarget(t){
    if(!t || !t.id) return false;
    return t.id==='ropeBox' || t.id==='ropeBoxHit';
  }
  svg.addEventListener('pointerdown',e=>{
    const t=e.target;
    if(t && t.id==='ropeH'){ mode='handle'; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    else if(isBoxTarget(t)){
      mode='box';
      const q=svgPt(svg,e);
      grabDX=q.x-rope.boxX;
      svg.setPointerCapture(e.pointerId); e.preventDefault();
    }
  });
  svg.addEventListener('pointermove',e=>{
    if(!mode) return;
    const q=svgPt(svg,e);
    if(mode==='handle'){
      const p=clampRopeTip(q.x, q.y, rope.boxX);
      rope.tipX=p.tx; rope.tipY=p.ty;
    } else {
      rope.boxX=clampRopeBoxX(q.x-grabDX, rope.tipX, rope.tipY);
    }
    svg.classList.add('hint-seen');
    drawRope();
  });
  const clear=()=>{ mode=null; };
  svg.addEventListener('pointerup',clear); svg.addEventListener('pointercancel',clear);
})();

/* ---------- C1: one arrow + split ---------- */
const one={x:160,y:90};
const oOx=40, oOy=200;
function drawOne(){
  const F=Math.hypot(one.x,one.y), a=deg(Math.atan2(one.y,one.x));
  const svg=$('#oneSvg');
  svg.setAttribute('viewBox','-20 -20 420 280');
  svg.innerHTML=`<defs><marker id="oh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker></defs>
    <line x1="${oOx-20}" y1="${oOy}" x2="380" y2="${oOy}" stroke="#3d4680" stroke-width="3"/>
    <rect x="${oOx-30}" y="${oOy}" width="70" height="36" rx="4" fill="#3a4170" stroke="#7c86c9"/>
    <line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#ff8a65" stroke-width="4" marker-end="url(#oh)"/>
    ${hitHandle("oneH",oOx+one.x,oOy-one.y,"#ff8a65")}`;
  $('#oneF').textContent=F.toFixed(0)+' N';
  $('#oneA').textContent=a.toFixed(0)+'°';
}
function drawSplit(){
  const showX=$('#showFloor').checked, showY=$('#showLift').checked;
  const svg=$('#splitSvg');
  svg.setAttribute('viewBox','-20 -20 420 280');
  svg.innerHTML=`<defs>
      <marker id="sh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
      <marker id="sx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
      <marker id="sy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#4dd0e1"/></marker>
    </defs>
    <line x1="${oOx-20}" y1="${oOy}" x2="380" y2="${oOy}" stroke="#3d4680" stroke-width="3"/>
    <line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#ff8a65" stroke-width="4" marker-end="url(#sh)" opacity=".9"/>
    ${showX?`<line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy}" stroke="#ff8a65" stroke-width="3" marker-end="url(#sx)"/>`:''}
    ${showY?`<line x1="${oOx+one.x}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#4dd0e1" stroke-width="3" marker-end="url(#sy)"/>`:''}
    ${hitHandle("splitH",oOx+one.x,oOy-one.y,"#ff8a65")}`;
  $('#splitX').textContent=Math.abs(one.x).toFixed(0)+' N';
  $('#splitY').textContent=Math.abs(one.y).toFixed(0)+' N';
}
function bindOne(svg, handleId, after){
  if(!svg) return;
  let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id===handleId){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e);
    one.x=Math.max(20,Math.min(320,q.x-oOx));
    one.y=Math.max(10,Math.min(200,oOy-q.y));
    after();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
}
bindOne($('#oneSvg'),'oneH',drawOne);
bindOne($('#splitSvg'),'splitH',drawSplit);
onEl('#showFloor','change',drawSplit);
onEl('#showLift','change',drawSplit);

/* ---------- C1: triangle + formula build ---------- */
const tri={th:30, step:0};
const TRI_HELP=[
  'The long side is the original 100 N pull — the hypotenuse.',
  'Cosine is adjacent over hypotenuse. The adjacent side is the along-the-floor part.',
  'A concrete number: 100 N at 30° gives 100 × cos 30° = 86.6 N along the floor.',
  'Now the general rule. F_x is a name for the along-x part: F_x = F cos θ.'
];
function drawTri(){
  const th=rad(tri.th), F=100, sc=2.2, adj=F*Math.cos(th)*sc, opp=F*Math.sin(th)*sc;
  const ox=40, oy=210;
  const svg=$('#triSvg');
  svg.setAttribute('viewBox','-20 -40 440 300');
  const hl=k=> tri.step>=k ? 'hl-on' : '';
  svg.innerHTML=`<defs>
      <marker id="th" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
    </defs>
    <line x1="${ox-10}" y1="${oy}" x2="400" y2="${oy}" stroke="#3d4680" stroke-width="3"/>
    <polygon points="${ox},${oy} ${ox+adj},${oy} ${ox+adj},${oy-opp}" fill="#1d2550" stroke="#3d4680"/>
    <line class="${tri.step>=1?hl(1):''}" x1="${ox}" y1="${oy}" x2="${ox+adj}" y2="${oy-opp}" stroke="#ff8a65" stroke-width="4" marker-end="url(#th)"/>
    <line class="${tri.step>=2?hl(2):''}" x1="${ox}" y1="${oy}" x2="${ox+adj}" y2="${oy}" stroke="#ffd54f" stroke-width="3"/>
    <line class="${tri.step>=2?hl(2):''}" x1="${ox+adj}" y1="${oy}" x2="${ox+adj}" y2="${oy-opp}" stroke="#4dd0e1" stroke-width="3"/>
    <text x="${ox+adj/2}" y="${oy+16}" fill="#ffd54f" font-size="13" text-anchor="middle">${tri.step>=2?'adjacent':''}</text>
    <text x="${ox+adj+8}" y="${oy-opp/2}" fill="#4dd0e1" font-size="13">${tri.step>=2?'opposite':''}</text>
    <text x="${ox+20}" y="${oy-8}" fill="#ff8a65" font-size="14">θ = ${tri.th}°</text>
    ${hitHandle("triH",ox+adj,oy-opp,"#ff8a65")}`;
  const fx=(100*Math.cos(rad(tri.th)));
  const bits=[
    `\\text{hypotenuse}=100\\,\\text{N}`,
    `\\cos\\theta=\\dfrac{\\text{adjacent}}{\\text{hypotenuse}}`,
    `100\\cos ${tri.th}^\\circ=${fx.toFixed(1)}\\,\\text{N}`,
    `F_x=F\\cos\\theta`
  ];
  const shown=bits.slice(0, tri.step).map(()=>`<div class="term in"></div>`);
  $('#triMath').innerHTML=shown.join('')||'<p class="sub">Press “Next piece” to build the formula.</p>';
  if(tri.step){
    const nodes=$$('#triMath .term');
    nodes.forEach((n,i)=>{ n.classList.toggle('hot', i===tri.step-1); if(window.katex) katex.render(bits[i], n, {displayMode:true,throwOnError:false}); });
  }
  $('#triHelp').textContent=TRI_HELP[Math.max(0,tri.step-1)] || 'We will start with a concrete number: a 100 N pull. Drag the tip to change the angle first if you like.';
  $('#triNext').disabled=tri.step>=4;
  $('#triNext').textContent=tri.step>=4?'All pieces shown':'Next piece';
}
onEl('#triNext','click',()=>{ if(tri.step<4){ tri.step++; drawTri(); } });
(function(){
  const svg=$('#triSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='triH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e), a=deg(Math.atan2(210-q.y, q.x-40));
    tri.th=Math.max(8,Math.min(80,Math.round(a))); drawTri();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

/* ---------- C1: two-force resultant ---------- */
const K=2; const st={ f1:{x:150*Math.cos(rad(30)),y:150*Math.sin(rad(30))}, f2:{x:-100,y:120} };
(function(){ let h=''; for(let x=-300;x<=300;x+=50) h+=`<line x1="${x}" y1="-230" x2="${x}" y2="230" stroke="${x===0?'#3d4680':'#1b2040'}"/>`;
  for(let y=-200;y<=200;y+=50) h+=`<line x1="-300" y1="${y}" x2="300" y2="${y}" stroke="${y===0?'#3d4680':'#1b2040'}"/>`;
  const grid=$('#grid'); if(grid) grid.innerHTML = h+'<text x="285" y="-6" fill="#5c6390" font-size="12">x</text><text x="6" y="-215" fill="#5c6390" font-size="12">y</text>'; })();
const setL=(id,x1,y1,x2,y2)=>{ const l=$(id); l.setAttribute('x1',x1); l.setAttribute('y1',-y1); l.setAttribute('x2',x2); l.setAttribute('y2',-y2); };
const fmtF=v=>`${(K*Math.hypot(v.x,v.y)).toFixed(1)} N ∠ ${deg(Math.atan2(v.y,v.x)).toFixed(1)}°`;
function drawVec(){
  const {f1,f2}=st, R={x:f1.x+f2.x,y:f1.y+f2.y};
  setL('#l1',0,0,f1.x,f1.y); setL('#l2',0,0,f2.x,f2.y); setL('#lr',0,0,R.x,R.y); setL('#par1',f1.x,f1.y,R.x,R.y); setL('#par2',f2.x,f2.y,R.x,R.y);
  [['#d1',f1],['#d2',f2]].forEach(([d,v])=>{ $(d).setAttribute('cx',v.x); $(d).setAttribute('cy',-v.y); });
  [['#t1',f1],['#t2',f2],['#tr',R]].forEach(([t,v])=>{ $(t).setAttribute('x',v.x+12); $(t).setAttribute('y',-v.y-12); });
  $('#comps').innerHTML = $('#showc').checked ? [[f1,'#ff8a65'],[f2,'#4dd0e1']].map(([v,c])=>`<line x1="0" y1="0" x2="${v.x}" y2="0" stroke="${c}" stroke-width="2" stroke-dasharray="4 4" opacity=".8"/><line x1="${v.x}" y1="0" x2="${v.x}" y2="${-v.y}" stroke="${c}" stroke-width="2" stroke-dasharray="4 4" opacity=".8"/>`).join('') : '';
  $('#r1').textContent=fmtF(f1); $('#r2').textContent=fmtF(f2); $('#rr').textContent=fmtF(R);
  if(window.katex) katex.render(`\\begin{aligned}R_x&=${(K*f1.x).toFixed(1)}+(${(K*f2.x).toFixed(1)})=${(K*R.x).toFixed(1)}\\,\\text{N}\\\\ R_y&=${(K*f1.y).toFixed(1)}+(${(K*f2.y).toFixed(1)})=${(K*R.y).toFixed(1)}\\,\\text{N}\\end{aligned}`,$('#rmath'),{displayMode:true,throwOnError:false});
}
(function(){ const svg=$('#vec'); if(!svg) return; let cur=null;
  const grab=k=>e=>{ cur=k; svg.setPointerCapture(e.pointerId); e.preventDefault(); };
  onEl('#d1','pointerdown',grab('f1')); onEl('#d2','pointerdown',grab('f2'));
  svg.addEventListener('pointermove',e=>{ if(!cur) return; const q=svgPt(svg,e); st[cur]={x:Math.max(-290,Math.min(290,Math.round(q.x/5)*5)),y:Math.max(-220,Math.min(220,Math.round(-q.y/5)*5))}; drawVec(); });
  svg.addEventListener('pointerup',()=>cur=null); svg.addEventListener('pointercancel',()=>cur=null);
  onEl('#showc','change',drawVec);
  onEl('#preset','click',()=>{ st.f1={x:125*Math.cos(rad(40)),y:125*Math.sin(rad(40))}; st.f2={x:200*Math.cos(rad(150)),y:200*Math.sin(rad(150))}; drawVec();
    say('Example loaded: 250 N at 40° and 400 N at 150°. Before you look at the readout, predict which quadrant R lands in. Then check yourself.'); });
})();

/* ---------- C2: hanging sign + isolate + supports ---------- */
function drawSign(){
  const svg=$('#signSvg');
  svg.innerHTML=`<rect data-tap="wall" x="20" y="20" width="36" height="210" fill="#2a3058"/>
    <line data-tap="rod" x1="56" y1="150" x2="260" y2="150" stroke="#7c9cff" stroke-width="8" stroke-linecap="round"/>
    <line data-tap="cable" x1="56" y1="50" x2="260" y2="150" stroke="#ff8a65" stroke-width="4"/>
    <rect data-tap="sign" x="230" y="148" width="130" height="70" rx="4" fill="#3a4170" stroke="#7c86c9" stroke-width="2"/>
    <text x="295" y="190" fill="#e8eaf6" font-size="16" text-anchor="middle" pointer-events="none">OPEN</text>
    <text x="28" y="16" fill="#5c6390" font-size="12">wall</text>`;
  svg.querySelectorAll('[data-tap]').forEach(el=>{
    el.style.cursor='pointer';
    el.addEventListener('click',()=>{
      const n={wall:'The wall holds the rod and the cable. Later we will replace the wall with the forces it applies.',
        rod:'The rod can push or pull along its length. It is a two-force member — a bar with a pin at each end and no load in between.',
        cable:'The cable can only pull. It cannot push.',
        sign:'The sign is the body we will isolate. Its weight pulls straight down through its center.'};
      $('#signLabel').textContent=n[el.getAttribute('data-tap')];
    });
  });
}
const isoOn=new Set(['W']);
function drawIso(){
  const parts={
    W:{label:'Weight of the sign',draw:'<line x1="260" y1="150" x2="260" y2="210" stroke="#ffd54f" stroke-width="3" marker-end="url(#ip)"/><text x="268" y="200" fill="#ffd54f" font-size="13">W</text>'},
    T:{label:'Cable pull',draw:'<line x1="260" y1="120" x2="160" y2="40" stroke="#ff8a65" stroke-width="3" marker-end="url(#ic)"/><text x="168" y="50" fill="#ff8a65" font-size="13">T</text>'},
    R:{label:'Rod force',draw:'<line x1="260" y1="120" x2="120" y2="120" stroke="#7c9cff" stroke-width="3" marker-end="url(#ir)"/><text x="140" y="110" fill="#7c9cff" font-size="13">F_rod</text>'},
    Wall:{label:'Draw the wall itself',draw:'<rect x="40" y="30" width="24" height="180" fill="#ef535055" stroke="#ef5350"/>'}
  };
  const svg=$('#isoSvg');
  let h=`<defs>${[['ip','#ffd54f'],['ic','#ff8a65'],['ir','#7c9cff']].map(([i,c])=>`<marker id="${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>
    <rect x="210" y="100" width="100" height="50" rx="4" fill="#3a4170" stroke="#7c86c9"/>
    <text x="260" y="130" fill="#e8eaf6" font-size="14" text-anchor="middle">sign</text>`;
  Object.entries(parts).forEach(([k,o])=>{ if(isoOn.has(k)) h+=o.draw; });
  svg.innerHTML=h;
  if(!$('#isoPal').dataset.ready){
    Object.entries(parts).forEach(([k,o])=>{
      const b=document.createElement('button'); b.type='button'; b.className='chip'+(isoOn.has(k)?' on':''); b.textContent=o.label; b.dataset.k=k;
      b.onclick=()=>{ isoOn.has(k)?isoOn.delete(k):isoOn.add(k); b.classList.toggle('on'); drawIso();
        const need=['W','T','R'], extra=isoOn.has('Wall');
        const miss=need.filter(x=>!isoOn.has(x));
        $('#isoHint').textContent = extra? 'Do not draw the wall. Draw only the force the wall (through the rod or cable) applies to the sign.' : !miss.length? 'That is a complete free-body diagram of the sign: weight, cable tension, and the rod force.' : 'Something is still missing.';
      };
      $('#isoPal').appendChild(b);
    });
    $('#isoPal').dataset.ready='1';
  }
}
const SUPS=[
  {k:'roller',t:'Roller',icon:'○',d:'Stops one motion: sinking into the surface. It can only push, not pull. 1 unknown force, at a right angle to the surface.'},
  {k:'pin',t:'Pin',icon:'◉',d:'Stops two motions: left-right and up-down. It cannot stop a spin. 2 unknown force parts.'},
  {k:'fixed',t:'Fixed',icon:'▣',d:'Stops two motions and a spin. 3 unknowns: two force parts and a couple moment.'},
  {k:'cable',t:'Cable',icon:'╱',d:'Can only pull, along the cable. 1 unknown tension. A slack cable carries no force.'}
];
if($('#supGrid') && !$('#supGrid').dataset.ready){
  SUPS.forEach(s=>{
    const b=document.createElement('button'); b.type='button'; b.className='support-card'; b.dataset.k=s.k;
    b.innerHTML=`<span style="font-size:22px">${s.icon}</span><b>${s.t}</b>`;
    b.onclick=()=>{ $$('#supGrid .support-card').forEach(x=>x.classList.toggle('on',x===b)); $('#supInfo').textContent=s.d; };
    $('#supGrid').appendChild(b);
  });
  $('#supGrid').dataset.ready='1';
}

/* ---------- C2: FBD builder (pin-and-roller beam) ---------- */
const FBD=[
 {k:'Ax',label:'Aₓ (horizontal at A)',ok:true,draw:'<line x1="40" y1="150" x2="95" y2="150" stroke="#7c9cff" stroke-width="3" marker-end="url(#fa)"/><text x="40" y="142" fill="#7c9cff" font-size="13">Aₓ</text>'},
 {k:'Ay',label:'A_y (vertical at A)',ok:true,draw:'<line x1="100" y1="215" x2="100" y2="158" stroke="#7c9cff" stroke-width="3" marker-end="url(#fa)"/><text x="106" y="210" fill="#7c9cff" font-size="13">A_y</text>'},
 {k:'By',label:'B_y (vertical at B)',ok:true,draw:'<line x1="500" y1="215" x2="500" y2="158" stroke="#7c9cff" stroke-width="3" marker-end="url(#fa)"/><text x="506" y="210" fill="#7c9cff" font-size="13">B_y</text>'},
 {k:'Bx',label:'Bₓ (horizontal at B)',ok:false,draw:'<line x1="560" y1="150" x2="505" y2="150" stroke="#ef5350" stroke-width="3" marker-end="url(#fb)"/><text x="535" y="142" fill="#ef5350" font-size="13">Bₓ</text>'},
 {k:'MA',label:'M_A (couple at A)',ok:false,draw:'<path d="M80,120 A26,26 0 1 1 120,120" fill="none" stroke="#ef5350" stroke-width="3" marker-end="url(#fb)"/><text x="88" y="95" fill="#ef5350" font-size="13">M_A</text>'}
];
const fbdOn=new Set();
function drawFBD(){
  let h=`<defs>${[['fa','#7c9cff'],['fb','#ef5350'],['fp','#ffd54f']].map(([i,c])=>`<marker id="${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker>`).join('')}</defs>
  <rect x="100" y="140" width="400" height="18" rx="3" fill="#3a4170" stroke="#7c86c9"/>
  <text x="55" y="234" fill="#9aa3c7" font-size="13">A (pin)</text><text x="470" y="234" fill="#9aa3c7" font-size="13">B (roller)</text>
  <circle cx="100" cy="149" r="5" fill="#e8eaf6"/><circle cx="500" cy="149" r="5" fill="#e8eaf6"/>
  <line x1="100" y1="120" x2="500" y2="120" stroke="#3d4680"/><line x1="233" y1="114" x2="233" y2="126" stroke="#3d4680"/>
  <text x="155" y="114" fill="#7a83b5" font-size="12">2 m</text><text x="355" y="114" fill="#7a83b5" font-size="12">4 m</text>
  <line x1="233" y1="40" x2="233" y2="136" stroke="#ffd54f" stroke-width="3" marker-end="url(#fp)"/><text x="240" y="55" fill="#ffd54f" font-size="13">10 kN</text>`;
  FBD.forEach(o=>{ if(fbdOn.has(o.k)) h+=o.draw; });
  $('#fbd').innerHTML=h;
  if(!$('#palette').dataset.ready){
    FBD.forEach(o=>{
      const b=document.createElement('button'); b.type='button'; b.className='chip'; b.dataset.k=o.k; b.textContent=o.label;
      b.onclick=()=>{ fbdOn.has(o.k)?fbdOn.delete(o.k):fbdOn.add(o.k); b.classList.toggle('on'); drawFBD(); };
      $('#palette').appendChild(b);
    });
    $('#checkfbd').onclick=()=>{
      const need=FBD.filter(o=>o.ok).map(o=>o.k), wrong=[...fbdOn].filter(k=>!need.includes(k)), miss=need.filter(k=>!fbdOn.has(k)), fb=$('#fbdfb');
      if(!wrong.length&&!miss.length){ fb.className='fb ok'; fb.textContent='✓ Correct: Aₓ, A_y, B_y plus the load. 3 unknowns, 3 equations, so it is statically determinate.'; say('Great FBD. Which single moment equation gives B_y directly?'); }
      else{ fb.className='fb no'; fb.textContent=(wrong.length?`Remove ${wrong.length} force${wrong.length>1?'s':''}. `:'')+(miss.length?'Something is missing. ':'')+'Ask what motion each support prevents.';
        if(wrong.includes('Bx')) say('A roller can roll sideways. Can it push horizontally?');
        else if(wrong.includes('MA')) say('Can a pin resist rotation? What kind of support would?');
        else if(miss.length) say('Count what each support prevents: a pin prevents two translations.'); }
    };
    $('#palette').dataset.ready='1';
  }
}

/* ---------- C3: hanging lamp + two-cable ring ---------- */
const hang={x:260,y:200};
function drawHang(){
  const svg=$('#hangSvg');
  const top=30, mid=hang.x, lampY=hang.y, lx=80, rx=440;
  const leftLen=Math.hypot(mid-lx, lampY-20-top), rightLen=Math.hypot(rx-mid, lampY-20-top);
  svg.innerHTML=`<circle cx="${lx}" cy="${top}" r="6" fill="#9aa3c7"/><circle cx="${rx}" cy="${top}" r="6" fill="#9aa3c7"/>
    <line x1="${lx}" y1="${top}" x2="${mid}" y2="${lampY-20}" stroke="#ff8a65" stroke-width="4"/>
    <line x1="${rx}" y1="${top}" x2="${mid}" y2="${lampY-20}" stroke="#7c9cff" stroke-width="4"/>
    <circle cx="${mid}" cy="${lampY-20}" r="6" fill="#e8eaf6"/>
    <rect id="hangH" class="handle" x="${mid-28}" y="${lampY-8}" width="56" height="56" rx="8" fill="#3a4170" fill-opacity=".15" stroke="#ffd54f"/><rect x="${mid-20}" y="${lampY}" width="40" height="40" rx="6" fill="#3a4170" stroke="#ffd54f" pointer-events="none"/>
    <text x="${(lx+mid)/2-10}" y="110" fill="#ff8a65" font-size="13">left</text>
    <text x="${(rx+mid)/2}" y="90" fill="#7c9cff" font-size="13">right</text>`;
  if($('#hangNote')){
    const tighter = leftLen<rightLen ? 'left' : (rightLen<leftLen ? 'right' : 'both');
    $('#hangNote').textContent = tighter==='both'
      ? 'The strings are equally tight when the lamp hangs in the middle.'
      : 'The '+tighter+' string is tighter (it is flatter / carrying more of the weight).';
  }
}
(function(){ const svg=$('#hangSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='hangH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e);
    hang.x=Math.max(120,Math.min(400,q.x));
    hang.y=Math.max(90,Math.min(250,q.y));
    drawHang();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();
const EQ={L:{x:-220,y:0},R:{x:220,y:0},ring:{x:-40,y:170}};
let eqDrag=false;
function drawEq(){
  const svg=$('#eq'), m=+$('#mass').value, W=m*9.81, {L,R,ring}=EQ;
  const t1=Math.atan2(ring.y-L.y, ring.x-L.x), t2=Math.atan2(ring.y-R.y, R.x-ring.x);
  const s=Math.sin(t1+t2), T1=W*Math.cos(t2)/s, T2=W*Math.cos(t1)/s;
  const w1=Math.min(12,1.5+T1/W*3), w2=Math.min(12,1.5+T2/W*3);
  const sc=95/Math.max(W,T1,T2), ox=215, oy=330;
  const a={x:ox,y:oy-70}, b={x:a.x, y:a.y+W*sc}, c={x:b.x - T1*Math.cos(t1)*sc, y:b.y - T1*Math.sin(t1)*sc};
  svg.innerHTML=`<defs><marker id="ea" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ffd54f"/></marker>
   <marker id="e1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
   <marker id="e2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#4dd0e1"/></marker></defs>
   <rect x="-290" y="-30" width="580" height="30" fill="#262b4d"/>${Array.from({length:30},(_,i)=>`<line x1="${-290+i*20}" y1="0" x2="${-280+i*20}" y2="-12" stroke="#3d4680"/>`).join('')}
   <line x1="${L.x}" y1="${L.y}" x2="${ring.x}" y2="${ring.y}" stroke="#ff8a65" stroke-width="${w1}" stroke-linecap="round"/>
   <line x1="${R.x}" y1="${R.y}" x2="${ring.x}" y2="${ring.y}" stroke="#4dd0e1" stroke-width="${w2}" stroke-linecap="round"/>
   <line x1="${ring.x}" y1="${ring.y}" x2="${ring.x}" y2="${ring.y+70}" stroke="#9aa3c7" stroke-width="2"/>
   <rect x="${ring.x-26}" y="${ring.y+70}" width="52" height="40" rx="4" fill="#3a4170" stroke="#7c86c9"/><text x="${ring.x}" y="${ring.y+95}" fill="#e8eaf6" font-size="18" text-anchor="middle">${m} kg</text>
   <path d="M ${L.x+50} ${L.y} A 50 50 0 0 1 ${L.x+50*Math.cos(t1)} ${L.y+50*Math.sin(t1)}" fill="none" stroke="#ff8a65"/>
   <text x="${L.x+56}" y="${L.y+22}" fill="#ff8a65" font-size="20">θ₁</text>
   <path d="M ${R.x-50} ${R.y} A 50 50 0 0 0 ${R.x-50*Math.cos(t2)} ${R.y+50*Math.sin(t2)}" fill="none" stroke="#4dd0e1"/>
   <text x="${R.x-74}" y="${R.y+22}" fill="#4dd0e1" font-size="20">θ₂</text>
   ${hitHandle("ringH",ring.x,ring.y,"#ffd54f")}
   <g opacity=".95"><text x="${ox-75}" y="${oy-80}" fill="#9aa3c7" font-size="16">force triangle</text>
   <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffd54f" stroke-width="2.5" marker-end="url(#ea)"/>
   <line x1="${b.x}" y1="${b.y}" x2="${c.x}" y2="${c.y}" stroke="#ff8a65" stroke-width="2.5" marker-end="url(#e1)"/>
   <line x1="${c.x}" y1="${c.y}" x2="${a.x}" y2="${a.y}" stroke="#4dd0e1" stroke-width="2.5" marker-end="url(#e2)"/></g>`;
  const hide=$('#predict').checked;
  $('#mval').textContent=m; $('#eW').textContent=W.toFixed(1)+' N';
  $('#eT1a').textContent=deg(t1).toFixed(1)+'°'; $('#eT2a').textContent=deg(t2).toFixed(1)+'°';
  $('#eT1').textContent=hide?'? (predict)':T1.toFixed(1)+' N'; $('#eT2').textContent=hide?'? (predict)':T2.toFixed(1)+' N';
  const h=$('#ringH'); if(h) h.addEventListener('pointerdown',e=>{ eqDrag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
}
(function(){ const svg=$('#eq'); if(!svg) return;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='ringH'){ eqDrag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{ if(!eqDrag) return; const q=svgPt(svg,e); EQ.ring={x:Math.max(-200,Math.min(200,Math.round(q.x))), y:Math.max(15,Math.min(250,Math.round(q.y)))}; drawEq(); });
  svg.addEventListener('pointerup',()=>eqDrag=false); svg.addEventListener('pointercancel',()=>eqDrag=false);
  onEl('#mass','input',drawEq); onEl('#predict','change',drawEq);
})();

/* ---------- C4: seesaw, wrench, angled moment ---------- */
const see={x:80};
function drawSee(){
  const ox=260, oy=140, L=200, d=see.x, F=10;
  const M=F*(d/100), tilt=Math.max(-12,Math.min(12,M*2));
  const svg=$('#seeSvg');
  const ca=Math.cos(rad(tilt)), sa=Math.sin(rad(tilt));
  const p=(x,y)=>[ox+x*ca-y*sa, oy+x*sa+y*ca];
  const [lx,ly]=p(-L,0), [rx,ry]=p(L,0), [wx,wy]=p(d,-8);
  svg.innerHTML=`<line x1="${lx}" y1="${ly}" x2="${rx}" y2="${ry}" stroke="#7c9cff" stroke-width="8" stroke-linecap="round"/>
    <polygon points="${ox},${oy+8} ${ox-16},${oy+36} ${ox+16},${oy+36}" fill="#3d4680"/>
    <circle cx="${ox}" cy="${oy}" r="6" fill="#e8eaf6"/>
    ${hitHandle("seeH",wx,wy,"#ff8a65")}
    <text x="${wx}" y="${wy-22}" fill="#ffd54f" font-size="13" text-anchor="middle">10 N</text>`;
  if($('#seeD')) $('#seeD').textContent=Math.abs(d/100).toFixed(2)+' m '+(d>=0?'to the right':'to the left');
  if($('#seeM')) $('#seeM').textContent=Math.abs(M).toFixed(2)+' N·m';
}
(function(){ const svg=$('#seeSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='seeH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{ if(!drag) return; const q=svgPt(svg,e); see.x=Math.max(-180,Math.min(180,q.x-260)); drawSee(); });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

function drawWr(){
  const F=+$('#wrFsl').value, d=+$('#wrDsl').value;
  $('#wrF').textContent=F.toFixed(0);
  $('#wrD').textContent=d.toFixed(2);
  $('#wrM').textContent=(F*d).toFixed(1)+' N·m';
  const ox=80, oy=120, L=d*280, fy=F*6;
  const svg=$('#wrSvg');
  svg.innerHTML=`<defs><marker id="warr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker></defs>
    <circle cx="${ox}" cy="${oy}" r="22" fill="none" stroke="#7c86c9" stroke-width="8"/>
    <line x1="${ox}" y1="${oy}" x2="${ox+L}" y2="${oy}" stroke="#7c9cff" stroke-width="10" stroke-linecap="round"/>
    ${hitHandle("wrDh",ox+L,oy,"#7c9cff")}
    <line id="wrFarr" x1="${ox+L}" y1="${oy}" x2="${ox+L}" y2="${oy+fy}" stroke="#ff8a65" stroke-width="4" marker-end="url(#warr)"/>
    ${hitHandle("wrFh",ox+L,oy+fy,"#ff8a65")}
    <text x="${ox+L+8}" y="${oy+fy/2}" fill="#ff8a65" font-size="13">${F.toFixed(0)} N</text>
    <text x="${ox+L/2}" y="${oy-14}" fill="#9aa3c7" font-size="13" text-anchor="middle">${d.toFixed(2)} m</text>`;
}
onEl('#wrFsl','input',drawWr);
onEl('#wrDsl','input',drawWr);
(function(){ const svg=$('#wrSvg'); if(!svg) return; let mode=null;
  svg.addEventListener('pointerdown',e=>{
    if(e.target.id==='wrFh'||e.target.id==='wrDh'){ mode=e.target.id; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  svg.addEventListener('pointermove',e=>{
    if(!mode) return;
    const q=svgPt(svg,e);
    if(mode==='wrDh'){ $('#wrDsl').value=Math.max(0.10,Math.min(0.60,((q.x-80)/280))).toFixed(2); }
    if(mode==='wrFh'){ $('#wrFsl').value=Math.max(5,Math.min(80,Math.round((q.y-120)/6))); }
    drawWr();
  });
  svg.addEventListener('pointerup',()=>mode=null); svg.addEventListener('pointercancel',()=>mode=null);
})();

function drawAng(){
  const th=+$('#angSl').value, F=10, d=0.50, M=F*d*Math.sin(rad(th));
  $('#angT').textContent=th;
  $('#angM').textContent=M.toFixed(2)+' N·m';
  $('#angP').textContent=(F*Math.sin(rad(th))).toFixed(2)+' N';
  const ox=80, oy=100, L=140;
  // θ is the angle from the handle: 0° along the handle, 90° straight down (a downward push).
  const endx=ox+L+90*Math.cos(rad(th)), endy=oy+90*Math.sin(rad(th));
  const svg=$('#angSvg');
  svg.innerHTML=`<defs><marker id="aarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker></defs>
    <circle cx="${ox}" cy="${oy}" r="22" fill="none" stroke="#7c86c9" stroke-width="8"/>
    <line x1="${ox}" y1="${oy}" x2="${ox+L}" y2="${oy}" stroke="#7c9cff" stroke-width="10" stroke-linecap="round"/>
    <line id="angFarr" x1="${ox+L}" y1="${oy}" x2="${endx}" y2="${endy}" stroke="#ff8a65" stroke-width="4" marker-end="url(#aarr)"/>
    <path d="M ${ox+L+40} ${oy} A 40 40 0 0 1 ${ox+L+40*Math.cos(rad(th))} ${oy+40*Math.sin(rad(th))}" fill="none" stroke="#ffd54f" stroke-width="2"/>
    <text x="${ox+L+48}" y="${oy+18}" fill="#ffd54f" font-size="13">θ</text>
    ${hitHandle("angH",endx,endy,"#ff8a65")}`;
}
onEl('#angSl','input',drawAng);
(function(){ const svg=$('#angSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='angH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e), hx=220, hy=100;
    let angDeg=deg(Math.atan2(q.y-hy, q.x-hx)); // y down: 90° is a downward push
    let theta=Math.abs(angDeg); if(theta>180) theta=360-theta;
    $('#angSl').value=Math.max(0,Math.min(180,Math.round(theta)));
    drawAng();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

/* ---------- C5: plank hook + beam reactions ---------- */
const plank={x:2.5, L:6, W:8};
function drawPlank(){
  const {x,L,W}=plank, By=W*x/L, Ay=W-By;
  const ox=50, oy=150, Lpx=420, xpx=ox+(x/L)*Lpx;
  const svg=$('#plankSvg');
  svg.innerHTML=`<circle cx="${ox}" cy="${oy}" r="10" fill="#7c9cff"/><text x="${ox}" y="${oy+28}" fill="#9aa3c7" font-size="13" text-anchor="middle">left</text>
    <circle cx="${ox+Lpx}" cy="${oy}" r="10" fill="#4dd0e1"/><text x="${ox+Lpx}" y="${oy+28}" fill="#9aa3c7" font-size="13" text-anchor="middle">right</text>
    <line x1="${ox}" y1="${oy}" x2="${ox+Lpx}" y2="${oy}" stroke="#7c86c9" stroke-width="10" stroke-linecap="round"/>
    <rect id="plBox" class="handle" x="${xpx-28}" y="${oy-54}" width="56" height="48" rx="6" fill="#ff8a65" fill-opacity=".85" stroke="#ff8a65"/>
    <text x="${xpx}" y="${oy-52}" fill="#ffd54f" font-size="13" text-anchor="middle">${W.toFixed(0)} kN</text>`;
  if($('#plL')) $('#plL').textContent=Ay.toFixed(2)+' kN';
  if($('#plR')) $('#plR').textContent=By.toFixed(2)+' kN';
}
(function(){ const svg=$('#plankSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='plBox'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e);
    plank.x=Math.max(0.3,Math.min(plank.L-0.3, Math.round(((q.x-50)/420*plank.L)*20)/20));
    drawPlank();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

const beam={L:6, P:8, x:2};
function drawBeam(){
  beam.P=+$('#bmPsl').value;
  $('#bmP').textContent=beam.P.toFixed(1);
  const By=beam.P*beam.x/beam.L, Ay=beam.P-By;
  $('#bmAy').textContent=Ay.toFixed(2)+' kN';
  $('#bmBy').textContent=By.toFixed(2)+' kN';
  const ox=50, oy=120, Lpx=420, xpx=ox+(beam.x/beam.L)*Lpx;
  const loadLen=18+beam.P*6;
  const ayLen=Math.min(100, 52+Ay*6), byLen=Math.min(100, 52+By*6);
  const tip=oy+10;
  const svg=$('#beamSvg');
  svg.innerHTML=`<defs>
      <marker id="barr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
      <marker id="baA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#7c9cff"/></marker>
      <marker id="baB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#4dd0e1"/></marker>
    </defs>
    <line x1="${ox}" y1="${oy}" x2="${ox+Lpx}" y2="${oy}" stroke="#7c86c9" stroke-width="10" stroke-linecap="round"/>
    <polygon points="${ox},${oy+6} ${ox-12},${oy+22} ${ox+12},${oy+22}" fill="#7c9cff"/>
    <circle cx="${ox+Lpx}" cy="${oy+14}" r="9" fill="none" stroke="#4dd0e1" stroke-width="3"/>
    <line id="bmLoad" x1="${xpx}" y1="${oy-loadLen}" x2="${xpx}" y2="${oy}" stroke="#ff8a65" stroke-width="4" marker-end="url(#barr)"/>
    ${hitHandle("bmH",xpx,oy-loadLen,"#ff8a65")}
    <line id="bmAyArr" x1="${ox}" y1="${tip+ayLen}" x2="${ox}" y2="${tip}" stroke="#7c9cff" stroke-width="3" marker-end="url(#baA)"/>
    <line id="bmByArr" x1="${ox+Lpx}" y1="${tip+byLen}" x2="${ox+Lpx}" y2="${tip}" stroke="#4dd0e1" stroke-width="3" marker-end="url(#baB)"/>
    <text x="${ox}" y="${tip+ayLen+16}" fill="#7c9cff" font-size="13" text-anchor="middle">A_y</text>
    <text x="${ox+Lpx}" y="${tip+byLen+16}" fill="#4dd0e1" font-size="13" text-anchor="middle">B_y</text>
    <text x="${xpx+8}" y="${oy-loadLen}" fill="#ff8a65" font-size="13">${beam.P.toFixed(1)} kN</text>`;
  $('#bmX').textContent=beam.x.toFixed(2)+' m from A';
  const sum=$('#bmSum');
  const fy=`ΣF_y: A_y + B_y − P = ${Ay.toFixed(2)} + ${By.toFixed(2)} − ${beam.P.toFixed(2)} = 0`;
  const ma=`ΣM_A: B_y·L − P·x = ${By.toFixed(2)}×${beam.L} − ${beam.P.toFixed(2)}×${beam.x.toFixed(2)} = 0`;
  if(sum){
    if(sum.children.length>=2){ sum.children[0].textContent=fy; sum.children[1].textContent=ma; }
    else sum.innerHTML=`<div>${fy}</div><div>${ma}</div>`;
  }
}
onEl('#bmPsl','input',drawBeam);
(function(){ const svg=$('#beamSvg'); if(!svg) return; let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='bmH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e);
    const t=Math.max(0.3,Math.min(beam.L-0.3,(q.x-50)/420*beam.L));
    beam.x=Math.round(t*20)/20;
    drawBeam();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

/* ---------- quiz + micro-check engine ---------- */
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
  '%':1
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
  '%':'%', percent:'%', pct:'%'
};
const UNIT_MENUS={
  F:['N','kN','lbf'],
  M:['N·m','kN·m','lbf·ft'],
  L:['mm','cm','m','in','ft'],
  A:['°','rad'],
  P:['%']
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
  return unit;
}
function formatExact(a){
  if(a.u==='count' || a.u==='1') return String(a.v);
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
  const unit=(a.u==='deg')?'°':(a.u==='1'?'':(a.u==='%'?' %':(' '+a.u)));
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
  const unitBit=anyMenu?' Pick a unit from the menu if you want a different one (for example kN instead of N).':'';
  if(any) return '<p class="sub q-round-hint">Round to the nearest whole number in the unit shown.'+unitBit+' More precise answers within 1% still count (angles ±0.5°).</p>';
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
 1:[{id:'q1.1',diff:'easy',text:'Two forces act on a bolt: \\(F_1=300\\) N at 30° and \\(F_2=500\\) N at 135° (CCW from \\(+x\\)). Find the magnitude and direction of the resultant.',
     ans:[{q:'|R|',v:512.2,u:'N',tp:1},{q:'θ_R',v:100.5,u:'deg',ta:0.5}],
     hints:['Resolve each force into x and y components first, then add like components.','\\(\\cos 135^\\circ\\) is negative. Check the sign of \\(F_{2x}\\).','Once you have \\(R_x\\) and \\(R_y\\), use atan2. Which quadrant is R in?']},
    {id:'q1.4',diff:'medium',text:'\\(\\vec F=(-244.9,\\,244.9,\\,489.9)\\) N. Find its component along the line from O to C(3, 0, 4) m, and the angle between \\(\\vec F\\) and OC.',
     ans:[{q:'F_OC',v:244.9,u:'N',tp:1},{q:'θ',v:65.9,u:'deg',ta:0.5}],
     hints:['First find the unit vector \\(\\hat u_{OC}\\). How long is OC?','\\(F_{OC}=\\vec F\\cdot\\hat u_{OC}\\) and \\(\\cos\\theta=F_{OC}/|\\vec F|\\).']},
    {id:'q1.3',diff:'hard',text:'Tug 1 pulls a barge with \\(F_1=500\\) N at +20°. What force \\(F_2\\) (magnitude and angle) makes the resultant exactly 800 N along \\(+x\\)?',
     ans:[{q:'|F₂|',v:371.8,u:'N',tp:1},{q:'θ₂',v:-27.4,u:'deg',ta:0.5}],
     hints:['Vector subtraction: \\(\\vec F_2=\\vec R-\\vec F_1\\).','What must \\(F_{2y}\\) be so that \\(R_y=0\\)?']}],
 2:[{id:'q2.1',diff:'easy',text:'How many unknown reaction components does each 2D support provide?',
     ans:[{q:'roller',v:1,u:'count',ta:0},{q:'pin',v:2,u:'count',ta:0},{q:'fixed',v:3,u:'count',ta:0},{q:'cable',v:1,u:'count',ta:0}],
     hints:['Ask which motions the support prevents: one reaction per prevented motion.','A fixed support also prevents rotation, which needs a couple moment.']},
    {id:'q2.3',diff:'medium',text:'A 2D beam is held by a pin at A and a second pin at B. Give the number of unknowns, independent equations, and the degree of indeterminacy.',
     ans:[{q:'unknowns',v:4,u:'count',ta:0},{q:'equations',v:3,u:'count',ta:0},{q:'degree',v:1,u:'count',ta:0}],
     hints:['Each pin supplies two force components.','A planar rigid body gives \\(\\sum F_x,\\ \\sum F_y,\\ \\sum M\\).']},
    {id:'q2.5',diff:'medium',text:'In 3D, how many reaction components does a ball-and-socket joint provide? A fixed support?',
     ans:[{q:'ball-and-socket',v:3,u:'count',ta:0},{q:'fixed (3D)',v:6,u:'count',ta:0}],
     hints:['A ball-and-socket allows every rotation.','A rigid body in 3D can move in 6 independent ways.']},
    {id:'q2.4',diff:'hard',text:'A straight link CD is pinned at both ends and carries no load between its pins (its weight is neglected). A beam is pinned at A and supported by link CD. Explain what you know about the force in CD before writing any equations, and how many unknowns the beam\'s FBD has.',
     ans:[{q:'unknowns on beam FBD',v:3,u:'count',ta:0}],
     hints:['Take moments about one pin of the link: what must be true of the force at the other pin?','CD is a two-force member, so its force is along the line of the pins. The beam then has A_x, A_y, and that one link force.']}],
 3:[{id:'q3.1',diff:'easy',text:'A 50 kg crate hangs from ring A. Cable AB runs up-left at 30° above horizontal; cable AC runs up-right at 45°. Find \\(T_{AB}\\) and \\(T_{AC}\\).',
     ans:[{q:'T_AB',v:359.1,u:'N',tp:1},{q:'T_AC',v:439.8,u:'N',tp:1}],
     hints:['W = mg. Draw the FBD of the ring: three forces.','Write \\(\\sum F_x=0\\) and \\(\\sum F_y=0\\), giving two equations in two unknowns.']},
    {id:'q3.2',diff:'medium',text:'An 8 kg lamp hangs at A. A horizontal spring AB (\\(k=800\\) N/m) pulls left; cable AC pulls up-right at 30° above horizontal. Find \\(T_{AC}\\), the spring force, and the spring stretch.',
     ans:[{q:'T_AC',v:156.96,u:'N',tp:1},{q:'F_spring',v:135.9,u:'N',tp:1},{q:'stretch',v:169.9,u:'mm',tp:1}],
     hints:['Only the cable has a vertical component. Start with \\(\\sum F_y\\).','Spring: \\(F=ks\\), so \\(s=F/k\\).']},
    {id:'q3.3',diff:'hard',text:'A 1200 N load hangs from point A at the origin, held by cables to B(−2, −3, 6) m, C(3, −2, 6) m and D(0, 4, 6) m. Find the tension in each cable.',
     ans:[{q:'T_AB',v:509.1,u:'N',tp:1},{q:'T_AC',v:339.4,u:'N',tp:1},{q:'T_AD',v:568.1,u:'N',tp:1}],
     hints:['Write each cable force as \\(T\\hat u\\). Find the lengths |AB|, |AC|, |AD| first.','Three equations: \\(\\sum F_x=\\sum F_y=\\sum F_z=0\\), with the load \\((0,0,-1200)\\) N.','Solve the 3×3 system. All tensions must come out positive.']}],
 4:[{id:'q4.1',diff:'easy',text:'A 200 N force is applied at the end of a 0.40 m wrench, at 60° to the handle. What moment does it produce about the bolt?',
     ans:[{q:'M',v:69.28,u:'N·m',tp:1}],
     hints:['Only the component perpendicular to the handle creates moment.','\\(M=Fd\\sin\\theta\\).']},
    {id:'q4.2',diff:'medium',text:'A 500 N force at 30° above +x acts at point (2.0, 1.5) m. Find the moment about the origin (CCW positive) and state its sense.',
     ans:[{q:'M_O',v:-149.5,u:'N·m',tp:1}],
     hints:['Fx = 433.0 N, Fy = 250 N.','\\(M_O = x F_y − y F_x\\).']},
    {id:'q4.5',diff:'medium',text:'A 400 N downward force acts at x = 3.0 m on a horizontal beam. Replace it with an equivalent force-couple system at the origin O.',
     ans:[{q:'F_y at O',v:-400,u:'N',tp:0.5},{q:'M_O',v:-1200,u:'N·m',tp:0.5}],
     hints:['The force is unchanged; the couple equals the moment of the original force about O.']},
    {id:'q4.3',diff:'medium',text:'The force \\(F = (-244.9,\\,244.9,\\,489.9)\\) N from q1.2 acts at A(2, 0, 0) m. Find \\(\\vec M_O=\\vec r\\times\\vec F\\) and its magnitude.',
     ans:[{q:'M_x',v:0,u:'N·m',ta:1},{q:'M_y',v:-979.8,u:'N·m',tp:1},{q:'M_z',v:489.9,u:'N·m',tp:1},{q:'|M_O|',v:1095.4,u:'N·m',tp:1}],
     hints:['\\(\\vec r = (2, 0, 0)\\). Expand the 3×3 determinant |i j k; 2 0 0; Fx Fy Fz|.']},
    {id:'q4.4',diff:'hard',text:'Find the moment of that same force about the axis through O and C(3, 0, 4) m.',
     ans:[{q:'M_OC',v:391.9,u:'N·m',tp:1}],
     hints:['\\(M_{OC} = \\hat u_{OC}\\cdot\\vec M_O\\) with \\(\\hat u_{OC}=(0.6,\\,0,\\,0.8)\\).']}],
 5:[{id:'q5.1',diff:'easy',text:'A 6.0 m simply supported beam has a pin at A (x = 0) and a roller at B (x = 6.0 m). A 10 kN downward load acts at x = 2.0 m. Find \\(A_y\\) and \\(B_y\\).',
     ans:[{q:'A_y',v:6666.7,u:'N',tp:1},{q:'B_y',v:3333.3,u:'N',tp:1}],
     hints:['\\(\\sum M_A=0\\) gives \\(B_y\\) directly.']},
    {id:'q5.2',diff:'medium',text:'A beam has a pin at A (x = 0) and a roller at B (x = 4 m). It carries a uniform load of 4 kN/m from x = 0 to x = 3 m and a 6 kN point load at the free end x = 5 m. Find \\(A_y\\) and \\(B_y\\).',
     ans:[{q:'A_y',v:6.0,u:'kN',tp:1},{q:'B_y',v:12.0,u:'kN',tp:1}],
     hints:['Distributed load resultant: 12 kN at x = 1.5 m.']},
    {id:'q5.3',diff:'medium',text:'Beam AB (5 m) has a pin at A and a roller at B resting on a surface inclined 30° (so the roller reaction is 30° from vertical, leaning toward A). An 8 kN downward load acts 3 m from A. Find \\(N_B\\), \\(A_x\\) and \\(A_y\\).',
     ans:[{q:'N_B',v:5543,u:'N',tp:1},{q:'A_x',v:2771,u:'N',tp:1},{q:'A_y',v:3200,u:'N',tp:1}],
     hints:['\\(N_B=N_B(-\\sin 30^\\circ,\\,\\cos 30^\\circ)\\).','Only \\(N_B\\cos 30^\\circ\\) creates moment about A.']},
    {id:'q5.4',diff:'hard',text:'A boom lies along the x-axis from a ball-and-socket at A(0,0,0) to B(6,0,0) m. A 2 kN load acts downward (−z) at B. Cables run from B to C(0, 2, 3) m and from B to D(0, −4, 3) m. Find \\(T_{BC}\\), \\(T_{BD}\\) and the reaction at A.',
     ans:[{q:'T_BC',v:3111,u:'N',tp:1},{q:'T_BD',v:1736,u:'N',tp:1},{q:'A_x',v:4000,u:'N',tp:1},{q:'A_y',v:0,u:'N',ta:10},{q:'A_z',v:0,u:'N',ta:10}],
     hints:['|BC| = 7 m, |BD| = √61 = 7.810 m.','\\(\\sum M_A=\\vec r_{AB}\\times(T_{BC}\\hat u_{BC}+T_{BD}\\hat u_{BD}+\\vec L)=0\\) gives two useful equations.']},
    {id:'q5.5',diff:'exam',text:'EXAM-STYLE (20 min). A horizontal beam AB (4.0 m) is pinned to a wall at A. A straight strut CD connects point C on the beam (3.0 m from A) to point D on the wall, 2.25 m directly below A. A load \\(P=10\\) kN acts downward at B. Neglect weights. Find the strut force \\(F_{CD}\\), the pin reaction at A (\\(A_x\\), \\(A_y\\), and magnitude), and the maximum load \\(P\\) if the strut buckles at 25 kN compression.',
     ans:[{q:'F_CD',v:22.22,u:'kN',tp:1},{q:'A_x',v:-17.78,u:'kN',tp:1},{q:'A_y',v:-3333,u:'N',tp:1},{q:'|A|',v:18.09,u:'kN',tp:1},{q:'P_max',v:11.25,u:'kN',tp:1}],
     hints:['CD has length 3.75 m — a 3-4-5 triangle.','Moments about A eliminate A_x and A_y.']}]
};

function nearly(a,v){
  if(a.ta!==undefined && Math.abs(v-a.v)<=a.ta+1e-9) return true;
  if(a.ta===undefined && (Math.abs(v-a.v)<=((a.tp||1)/100)*Math.abs(a.v||1) || Math.abs(v-a.v)<1e-6)) return true;
  if(usesIntRound(a) && closeInt(v, intTargets(a.v))) return true;
  return false;
}
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


const MICRO={
  c1fx:[{v:86.6025,u:'N',tp:1}],
  c1fy:[{v:50,u:'N',tp:1}],
  c1r:[{v:5,u:'N',tp:1}],
  c2roll:[{v:1,u:'count',ta:0}],
  c2unk:[{v:3,u:'count',ta:0}],
  c3w:[{v:49.05,u:'N',tp:1}],
  c4m:[{v:6,u:'N·m',tp:1}],
  c5ab:[{v:9,u:'kN',tp:1},{v:3,u:'kN',tp:1}]
};
const MICRO_MC={c2pull:'push', c3tight:'right'};
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

/* ---------- scripted tutor ---------- */
function reply(t){ t=t.toLowerCase();
  if(/answer|solution|just tell|give me/.test(t)) return 'I won\'t hand over the answer, because you\'d lose the learning. Tell me your first step and I\'ll check it.';
  if(/hint|stuck|help/.test(t)) return 'Start from a picture. What is the body, and what pushes or pulls on it? Then write one equation.';
  if(/slow|fast|pace|break/.test(t)) return 'You set the pace. Progress is saved on this device, so come back any time. In the full tutor, say "slower" or "faster".';
  if(/unit/.test(t)) return 'Always carry units: N for force, m for length, N·m for moment, deg for angles. Missing units count as wrong, just like on a real exam.';
  if(/moment|torque|wrench|seesaw/.test(t)) return 'A moment is a twist: force times the perpendicular distance from the point. If the force is at an angle, only the part straight across the handle counts: \\(M=Fd\\sin\\theta\\).';
  if(/reaction|support|roller|pin/.test(t)) return 'Ask which motions the support prevents. A roller stops one, a pin stops two, a fixed support stops two plus a spin.';
  if(/grok|real tutor|ai/.test(t)) return 'Tap “Copy tutor prompt for Grok” below, paste it into Grok, and say “start”. That tutor runs this whole unit.';
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
    return id==='signLabel'||id==='supInfo'||id==='fbdfb'||id==='trigEx';
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
    ['#signLabel','#fbdfb','#supInfo','#trigEx'].forEach(function(sel){
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
/* ---------- boot ---------- */
function bootHome(){
  const root=document.getElementById('homeDemo');
  if(!root) return;
  prepareThumbLayout(root);
  drawRope();
  const pin=function(){ resetPageScroll(); };
  root.addEventListener('pointerdown', pin);
  root.addEventListener('pointermove', pin);
  root.addEventListener('pointerup', pin);
  root.addEventListener('pointercancel', pin);
  document.addEventListener('touchend', function(e){
    if(e.target && root.contains(e.target)) requestAnimationFrame(resetPageScroll);
  }, {passive:true});
}
function boot(){
  if(document.getElementById('homeDemo') || document.documentElement.classList.contains('home')){
    bootHome();
    return;
  }
  if(!document.querySelector('html.lesson-page, #lessonApp')) return;
  if(window.GrokeQuizRand) window.GrokeQuizRand.attachStore(store, save, 's');
  prepareThumbLayout();
  wireKeyboard();

  bindChecks();
  Object.values(Q).forEach(list=>list.forEach(buildQuiz));
  shuffleQuizSlides();
  const r=readRoute();
  go(r.c, r.i);
  renderMath(document.body);
  const any=Object.values(store.score).some(o=>Object.keys(o||{}).length);
  if(!$('#chat').children.length) say(any
    ? 'Welcome back! Your progress is restored. Pick up the slide you left, or jump with the dots.'
    : 'Hi! This unit is a set of interactive slides. Drag the pictures, check yourself as you go, then try the problems. I give hints, not answers — show your work and include units.');
}
if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);

try{ window.GrokeversityQuiz={prepareThumbLayout:prepareThumbLayout,shuffleQuizSlides:shuffleQuizSlides,buildQuiz:buildQuiz,bootHome:bootHome,drawRope:drawRope,applyKeyboardInset:applyKeyboardInset,clearKeyboardInset:clearKeyboardInset,resetPageScroll:resetPageScroll,parseQty:parseQty,gradeAns:gradeAns,Q:Q,MICRO:MICRO,formatAns:formatAns,formatExact:formatExact,tidyText:tidyText,usesIntRound:usesIntRound,intTargets:intTargets,nearly:nearly,unitMenu:unitMenu,selectDefault:selectDefault,convertToWanted:convertToWanted,UNITS:UNITS}; }catch(e){}
})();
