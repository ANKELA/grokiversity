/* Grokeversity prototype: Statics Unit 1, concepts 1-5 as interactive slides. No backend; progress in localStorage. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
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
function svgPt(svg,e){
  const p=svg.createSVGPoint();
  p.x=e.clientX; p.y=e.clientY;
  const ctm=svg.getScreenCTM();
  if(!ctm) return {x:0,y:0};
  return p.matrixTransform(ctm.inverse());
}
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
window.addEventListener('resize', refreshVisibleDiagrams);
if(window.visualViewport) visualViewport.addEventListener('resize', refreshVisibleDiagrams);

const ROOT = document.documentElement.dataset.root || '';
function asset(p){ return ROOT + p; }

/* ---------- ME / AI track maps (landing only) ---------- */
const TRACK = {
  'Year 1': ['Calculus I','Calculus II','Physics I: Mechanics','Physics II: E&M','Chemistry','Intro Design & CAD','Programming for Engineers'],
  'Year 2': ['Calculus III','Differential Equations','Linear Algebra','Statics','Dynamics','Mechanics of Materials','Circuits & Electronics','Materials Science'],
  'Year 3': ['Thermodynamics','Fluid Mechanics','Heat Transfer','Machine Design','Manufacturing','Numerical Methods','Probability & Statistics','Measurement & Instrumentation Lab'],
  'Year 4': ['System Dynamics & Controls','Thermal-Fluid Systems Design','Mechatronics','Capstone Design I','Capstone Design II','Technical Electives ×3','Ethics & Technical Communication']
};
if($('#trackGrid')){
  $('#trackGrid').innerHTML = Object.entries(TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> c==='Statics'
    ? `<a class="course live" href="${asset('statics/unit-1.html')}"><span>ME 201 Statics</span><span class="badge">Play now</span></a>`
    : `<div class="course"><span>${c}</span><span class="badge">Coming soon</span></div>`).join('')}</div>`).join('');
}
const AI_TRACK = {
  'Foundations': ['What AI Is (Unit 1)','Search & Problem Solving','Probability & Bayes','Math for ML'],
  'Learning': ['Supervised Learning I','Supervised Learning II','Neural Nets & Backprop'],
  'Modern AI': ['Deep Learning','Transformers & LLMs','Reinforcement Learning'],
  'Responsibility': ['Ethics, Safety & Limits','Capstone Project']
};
if($('#aiGrid')){
  $('#aiGrid').innerHTML = Object.entries(AI_TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> c.includes('Unit 1')
    ? `<a class="course live" href="intro-ai.html"><span>AI 101 · ${c}</span><span class="badge">Play now</span></a>`
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
if($('#copyPrompt')) $('#copyPrompt').addEventListener('click',copyPrompt);
if($('#copyHero')) $('#copyHero').addEventListener('click',copyPrompt);

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
      location.replace(asset('statics/unit-1.html')+'?c='+c);
    }
  };
  jump();
  window.addEventListener('hashchange', jump);
  return;
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
  requestAnimationFrame(()=>{ run(); requestAnimationFrame(run); });
  observeDiagrams(s);
}
$('#prevSlide').addEventListener('click',()=>{ const c=store.current; showSlide(c, (store.slide[c]||0)-1, 'back'); });
$('#nextSlide').addEventListener('click',()=>{ const c=store.current; showSlide(c, (store.slide[c]||0)+1, 'fwd'); });
document.addEventListener('keydown',e=>{
  if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if(e.key==='Escape') closeDrawers();
  if(e.key==='ArrowRight') $('#nextSlide').click();
  if(e.key==='ArrowLeft') $('#prevSlide').click();
});
if($('#conceptsBtn')){
  $('#conceptsBtn').addEventListener('click',()=>{ const on=!$('#conceptsDrawer').classList.contains('on'); closeDrawers(); setDrawer('concepts',on); });
  $('#conceptsBack').addEventListener('click',()=>setDrawer('concepts',false));
}
if($('#tutorBtn')){
  $('#tutorBtn').addEventListener('click',()=>{ const on=!$('#tutorDrawer').classList.contains('on'); closeDrawers(); setDrawer('tutor',on); });
  $('#tutorBack').addEventListener('click',()=>setDrawer('tutor',false));
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
$('#trigBtn').addEventListener('click',()=>openTrig(true));
$('#trigClose').addEventListener('click',()=>openTrig(false));
$('#trigBack').addEventListener('click',()=>openTrig(false));
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
$('#trigSl').addEventListener('input',drawTrig);
(function(){
  const svg=$('#trigSvg'); let drag=false;
  svg.addEventListener('pointerdown',e=>{ drag=true; svg.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
  svg.addEventListener('pointermove',e=>{ if(drag) move(e); });
  svg.addEventListener('pointerup',()=>drag=false);
  function move(e){ const q=svgPt(svg,e), ox=50, oy=190, a=deg(Math.atan2(oy-q.y, q.x-ox)); $('#trigSl').value=Math.max(5,Math.min(85,Math.round(a))); drawTrig(); }
})();

/* ---------- C1: rope hook ---------- */
const rope={th:35};
function drawRope(){
  const th=rad(rope.th), F=100, fx=F*Math.cos(th), fy=F*Math.sin(th);
  const box={x:200,y:170,w:110,h:70}, hx=box.x+box.w, hy=box.y+20;
  const L=170, tx=hx+L*Math.cos(th), ty=hy-L*Math.sin(th);
  const svg=$('#ropeSvg');
  svg.innerHTML=`<line x1="20" y1="240" x2="500" y2="240" stroke="#3d4680" stroke-width="6" data-tap="floor"/>
    <rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="6" fill="#3a4170" stroke="#7c86c9" stroke-width="2" data-tap="box"/>
    <line x1="${hx}" y1="${hy}" x2="${tx}" y2="${ty}" stroke="#ff8a65" stroke-width="5" stroke-linecap="round" data-tap="rope"/>
    <circle id="ropeH" class="handle" cx="${tx}" cy="${ty}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65" stroke-width="2"/>
    <text x="30" y="232" fill="#5c6390" font-size="13">floor</text>`;
  $('#ropeFloor').textContent=fx.toFixed(0)+' of 100';
  $('#ropeLift').textContent=fy.toFixed(0)+' of 100';
  const share=Math.abs(fx)+Math.abs(fy)||1;
  $('#ropeFloorBar').style.width=(Math.abs(fx)/share*100)+'%';
  $('#ropeLiftBar').style.width=(Math.abs(fy)/share*100)+'%';
  $('#ropeHint').textContent = rope.th<25 ? 'A flatter rope pulls more along the floor.' : 'A steeper rope lifts more, and pulls the box along the floor less.';
  svg.querySelectorAll('[data-tap]').forEach(el=>el.addEventListener('click',()=>{
    const n={box:'The box is what you are trying to move.',rope:'The rope carries your push. Because it is angled, only part of that push goes along the floor.',floor:'The floor is our reference. Angles here are measured up from the floor.'};
    $('#ropeHint').textContent=n[el.getAttribute('data-tap')];
  }));
}
(function(){
  const svg=$('#ropeSvg'); let drag=false;
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='ropeH'){ drag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{
    if(!drag) return;
    const q=svgPt(svg,e), hx=310, hy=190;
    let a=deg(Math.atan2(hy-q.y, q.x-hx));
    rope.th=Math.max(8,Math.min(75,a)); drawRope();
  });
  svg.addEventListener('pointerup',()=>drag=false); svg.addEventListener('pointercancel',()=>drag=false);
})();

/* ---------- C1: one arrow + split ---------- */
const one={x:160,y:90};
const oOx=40, oOy=200;
function drawOne(){
  const F=Math.hypot(one.x,one.y), a=deg(Math.atan2(one.y,one.x));
  const svg=$('#oneSvg');
  svg.innerHTML=`<defs><marker id="oh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker></defs>
    <line x1="${oOx-20}" y1="${oOy}" x2="380" y2="${oOy}" stroke="#3d4680" stroke-width="3"/>
    <rect x="${oOx-30}" y="${oOy}" width="70" height="36" rx="4" fill="#3a4170" stroke="#7c86c9"/>
    <line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#ff8a65" stroke-width="4" marker-end="url(#oh)"/>
    <circle id="oneH" class="handle" cx="${oOx+one.x}" cy="${oOy-one.y}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>`;
  $('#oneF').textContent=F.toFixed(0)+' N';
  $('#oneA').textContent=a.toFixed(0)+'°';
}
function drawSplit(){
  const showX=$('#showFloor').checked, showY=$('#showLift').checked;
  const svg=$('#splitSvg');
  svg.innerHTML=`<defs>
      <marker id="sh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
      <marker id="sx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff8a65"/></marker>
      <marker id="sy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#4dd0e1"/></marker>
    </defs>
    <line x1="${oOx-20}" y1="${oOy}" x2="380" y2="${oOy}" stroke="#3d4680" stroke-width="3"/>
    <line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#ff8a65" stroke-width="4" marker-end="url(#sh)" opacity=".9"/>
    ${showX?`<line x1="${oOx}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy}" stroke="#ff8a65" stroke-width="3" marker-end="url(#sx)"/>`:''}
    ${showY?`<line x1="${oOx+one.x}" y1="${oOy}" x2="${oOx+one.x}" y2="${oOy-one.y}" stroke="#4dd0e1" stroke-width="3" marker-end="url(#sy)"/>`:''}
    <circle id="splitH" class="handle" cx="${oOx+one.x}" cy="${oOy-one.y}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>`;
  $('#splitX').textContent=Math.abs(one.x).toFixed(0)+' N';
  $('#splitY').textContent=Math.abs(one.y).toFixed(0)+' N';
}
function bindOne(svg, handleId, after){
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
$('#showFloor').addEventListener('change',drawSplit);
$('#showLift').addEventListener('change',drawSplit);

/* ---------- C1: triangle + formula build ---------- */
const tri={th:30, step:0};
const TRI_HELP=[
  'The long side is the original 100 N push — the hypotenuse.',
  'Cosine is adjacent over hypotenuse. The adjacent side is the along-the-floor part.',
  'A concrete number: 100 N at 30° gives 100 × cos 30° = 86.6 N along the floor.',
  'Now the general rule. F_x is a name for the along-x part: F_x = F cos θ.'
];
function drawTri(){
  const th=rad(tri.th), F=100, sc=2.2, adj=F*Math.cos(th)*sc, opp=F*Math.sin(th)*sc;
  const ox=40, oy=210;
  const svg=$('#triSvg');
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
    <circle id="triH" class="handle" cx="${ox+adj}" cy="${oy-opp}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>`;
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
  $('#triHelp').textContent=TRI_HELP[Math.max(0,tri.step-1)] || 'We will start with a concrete number: a 100 N push. Drag the tip to change the angle first if you like.';
  $('#triNext').disabled=tri.step>=4;
  $('#triNext').textContent=tri.step>=4?'All pieces shown':'Next piece';
}
$('#triNext').addEventListener('click',()=>{ if(tri.step<4){ tri.step++; drawTri(); } });
(function(){
  const svg=$('#triSvg'); let drag=false;
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
  $('#grid').innerHTML = h+'<text x="285" y="-6" fill="#5c6390" font-size="12">x</text><text x="6" y="-215" fill="#5c6390" font-size="12">y</text>'; })();
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
(function(){ const svg=$('#vec'); let cur=null;
  const grab=k=>e=>{ cur=k; svg.setPointerCapture(e.pointerId); e.preventDefault(); };
  $('#d1').addEventListener('pointerdown',grab('f1')); $('#d2').addEventListener('pointerdown',grab('f2'));
  svg.addEventListener('pointermove',e=>{ if(!cur) return; const q=svgPt(svg,e); st[cur]={x:Math.max(-290,Math.min(290,Math.round(q.x/5)*5)),y:Math.max(-220,Math.min(220,Math.round(-q.y/5)*5))}; drawVec(); });
  svg.addEventListener('pointerup',()=>cur=null); svg.addEventListener('pointercancel',()=>cur=null);
  $('#showc').addEventListener('change',drawVec);
  $('#preset').addEventListener('click',()=>{ st.f1={x:125*Math.cos(rad(40)),y:125*Math.sin(rad(40))}; st.f2={x:200*Math.cos(rad(150)),y:200*Math.sin(rad(150))}; drawVec();
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
    <rect id="hangH" class="handle" x="${mid-20}" y="${lampY}" width="40" height="40" rx="6" fill="#3a4170" stroke="#ffd54f"/>
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
   <circle id="ringH" class="handle" cx="${ring.x}" cy="${ring.y}" r="15" fill="#ffd54f" fill-opacity=".3" stroke="#ffd54f" stroke-width="2"/>
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
(function(){ const svg=$('#eq');
  svg.addEventListener('pointerdown',e=>{ if(e.target.id==='ringH'){ eqDrag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); }});
  svg.addEventListener('pointermove',e=>{ if(!eqDrag) return; const q=svgPt(svg,e); EQ.ring={x:Math.max(-200,Math.min(200,Math.round(q.x))), y:Math.max(15,Math.min(250,Math.round(q.y)))}; drawEq(); });
  svg.addEventListener('pointerup',()=>eqDrag=false); svg.addEventListener('pointercancel',()=>eqDrag=false);
  $('#mass').addEventListener('input',drawEq); $('#predict').addEventListener('change',drawEq);
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
    <circle id="seeH" class="handle" cx="${wx}" cy="${wy}" r="16" fill="#ff8a65" fill-opacity=".4" stroke="#ff8a65"/>
    <text x="${wx}" y="${wy-22}" fill="#ffd54f" font-size="13" text-anchor="middle">10 N</text>`;
  if($('#seeD')) $('#seeD').textContent=Math.abs(d/100).toFixed(2)+' m '+(d>=0?'to the right':'to the left');
  if($('#seeM')) $('#seeM').textContent=Math.abs(M).toFixed(2)+' N·m';
}
(function(){ const svg=$('#seeSvg'); let drag=false;
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
    <circle id="wrDh" class="handle" cx="${ox+L}" cy="${oy}" r="12" fill="#7c9cff" fill-opacity=".35" stroke="#7c9cff"/>
    <line id="wrFarr" x1="${ox+L}" y1="${oy}" x2="${ox+L}" y2="${oy+fy}" stroke="#ff8a65" stroke-width="4" marker-end="url(#warr)"/>
    <circle id="wrFh" class="handle" cx="${ox+L}" cy="${oy+fy}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>
    <text x="${ox+L+8}" y="${oy+fy/2}" fill="#ff8a65" font-size="13">${F.toFixed(0)} N</text>
    <text x="${ox+L/2}" y="${oy-14}" fill="#9aa3c7" font-size="13" text-anchor="middle">${d.toFixed(2)} m</text>`;
}
$('#wrFsl').addEventListener('input',drawWr);
$('#wrDsl').addEventListener('input',drawWr);
(function(){ const svg=$('#wrSvg'); let mode=null;
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
    <circle id="angH" class="handle" cx="${endx}" cy="${endy}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>`;
}
$('#angSl').addEventListener('input',drawAng);
(function(){ const svg=$('#angSvg'); let drag=false;
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
    <rect id="plBox" x="${xpx-18}" y="${oy-44}" width="36" height="28" rx="4" fill="#ff8a65" fill-opacity=".85" stroke="#ff8a65"/>
    <text x="${xpx}" y="${oy-52}" fill="#ffd54f" font-size="13" text-anchor="middle">${W.toFixed(0)} kN</text>`;
  if($('#plL')) $('#plL').textContent=Ay.toFixed(2)+' kN';
  if($('#plR')) $('#plR').textContent=By.toFixed(2)+' kN';
}
(function(){ const svg=$('#plankSvg'); let drag=false;
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
    <circle id="bmH" class="handle" cx="${xpx}" cy="${oy-loadLen}" r="14" fill="#ff8a65" fill-opacity=".35" stroke="#ff8a65"/>
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
$('#bmPsl').addEventListener('input',drawBeam);
(function(){ const svg=$('#beamSvg'); let drag=false;
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
function normU(u){
  return String(u||'').trim().replace(/\s+/g,'').replace(/⋅|•/g,'·').replace(/-/g,'·');
}
const UNITS={N:1,kN:1000,m:1,mm:0.001,cm:0.01,'N·m':1,'N.m':1,Nm:1,'kN·m':1000,'kN.m':1000,kNm:1000};
function unitKind(u){
  u=normU(u);
  if(/^(deg|°|degree|degrees)$/i.test(u)) return 'A';
  if(u==='N'||u==='kN') return 'F';
  if(u==='m'||u==='mm'||u==='cm') return 'L';
  if(u in {'N·m':1,'N.m':1,Nm:1,'kN·m':1,'kN.m':1,kNm:1}) return 'M';
  return '';
}
function parseQty(str,unit){
  const m=String(str).trim().replace(',','.').match(/^([-+−]?\d*\.?\d+(?:e[-+]?\d+)?)\s*(.*)$/);
  if(!m) return {err:'Enter a number, optionally followed by a unit.'};
  const v=parseFloat(m[1].replace('−','-')), u=(m[2]||'').trim();
  if(unit==='count'){
    if(u && !/^(count|qty)?$/i.test(u)) return {err:'this is a count — no unit needed.'};
    return {v};
  }
  if(!u) return {err:`include units (${unit}).`};
  if(unit==='deg') return /^(deg|°|degrees?)$/i.test(u) ? {v} : {err:'angle units should be degrees (deg).'};
  const nu=normU(u), want=normU(unit);
  if(!(nu in UNITS) || !(want in UNITS)) return {err:`unknown unit “${u||unit}”.`};
  if(unitKind(nu)!==unitKind(want)) return {err:`wrong kind of unit: expected ${unit}.`};
  return {v:v*UNITS[nu]/UNITS[want]};
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
     ans:[{q:'T_AC',v:156.96,u:'N',tp:1},{q:'F_spring',v:135.9,u:'N',tp:1},{q:'stretch',v:0.1699,u:'m',tp:1}],
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
     ans:[{q:'A_y',v:6.667,u:'kN',tp:1},{q:'B_y',v:3.333,u:'kN',tp:1}],
     hints:['\\(\\sum M_A=0\\) gives \\(B_y\\) directly.']},
    {id:'q5.2',diff:'medium',text:'A beam has a pin at A (x = 0) and a roller at B (x = 4 m). It carries a uniform load of 4 kN/m from x = 0 to x = 3 m and a 6 kN point load at the free end x = 5 m. Find \\(A_y\\) and \\(B_y\\).',
     ans:[{q:'A_y',v:6.0,u:'kN',tp:1},{q:'B_y',v:12.0,u:'kN',tp:1}],
     hints:['Distributed load resultant: 12 kN at x = 1.5 m.']},
    {id:'q5.3',diff:'medium',text:'Beam AB (5 m) has a pin at A and a roller at B resting on a surface inclined 30° (so the roller reaction is 30° from vertical, leaning toward A). An 8 kN downward load acts 3 m from A. Find \\(N_B\\), \\(A_x\\) and \\(A_y\\).',
     ans:[{q:'N_B',v:5.543,u:'kN',tp:1},{q:'A_x',v:2.771,u:'kN',tp:1},{q:'A_y',v:3.2,u:'kN',tp:1}],
     hints:['\\(N_B=N_B(-\\sin 30^\\circ,\\,\\cos 30^\\circ)\\).','Only \\(N_B\\cos 30^\\circ\\) creates moment about A.']},
    {id:'q5.4',diff:'hard',text:'A boom lies along the x-axis from a ball-and-socket at A(0,0,0) to B(6,0,0) m. A 2 kN load acts downward (−z) at B. Cables run from B to C(0, 2, 3) m and from B to D(0, −4, 3) m. Find \\(T_{BC}\\), \\(T_{BD}\\) and the reaction at A.',
     ans:[{q:'T_BC',v:3.111,u:'kN',tp:1},{q:'T_BD',v:1.736,u:'kN',tp:1},{q:'A_x',v:4.0,u:'kN',tp:1},{q:'A_y',v:0.0,u:'kN',ta:0.01},{q:'A_z',v:0.0,u:'kN',ta:0.01}],
     hints:['|BC| = 7 m, |BD| = √61 = 7.810 m.','\\(\\sum M_A=\\vec r_{AB}\\times(T_{BC}\\hat u_{BC}+T_{BD}\\hat u_{BD}+\\vec L)=0\\) gives two useful equations.']},
    {id:'q5.5',diff:'exam',text:'EXAM-STYLE (20 min). A horizontal beam AB (4.0 m) is pinned to a wall at A. A straight strut CD connects point C on the beam (3.0 m from A) to point D on the wall, 2.25 m directly below A. A load \\(P=10\\) kN acts downward at B. Neglect weights. Find the strut force \\(F_{CD}\\), the pin reaction at A (\\(A_x\\), \\(A_y\\), and magnitude), and the maximum load \\(P\\) if the strut buckles at 25 kN compression.',
     ans:[{q:'F_CD',v:22.22,u:'kN',tp:1},{q:'A_x',v:-17.78,u:'kN',tp:1},{q:'A_y',v:-3.333,u:'kN',tp:1},{q:'|A|',v:18.09,u:'kN',tp:1},{q:'P_max',v:11.25,u:'kN',tp:1}],
     hints:['CD has length 3.75 m — a 3-4-5 triangle.','Moments about A eliminate A_x and A_y.']}]
};

function gradeAns(a, raw){
  const p=parseQty(raw,a.u);
  if(p.err) return {ok:false, err:p.err};
  const ok=a.ta!==undefined?Math.abs(p.v-a.v)<=a.ta+1e-9:Math.abs(p.v-a.v)<=a.tp/100*Math.abs(a.v||1);
  return {ok, err:null};
}

function buildQuiz(q){
  const box=document.querySelector('.q-mount[data-q="'+q.id+'"]');
  if(!box) return;
  const c=+q.id[1];
  const d=document.createElement('div'); d.className='q'; d.id='Q'+q.id.replace('.','_');
  d.innerHTML=`<div><b>${q.id}</b><span class="tag">${q.diff}</span></div><p>${q.text}</p>
    <div class="inrow">${q.ans.map((a,i)=>`<label>${a.q}<br><input data-i="${i}" inputmode="text" autocomplete="off" placeholder="${a.u==='count'?'number':'value '+a.u}"></label>`).join('')}</div>
    <button type="button" class="btn">Check</button> <button type="button" class="btn ghost">Hint</button><div class="fb"></div><div class="hints"></div>`;
  let hintN=0, tries=0; const [chk,hb]=d.querySelectorAll('button'), fb=d.querySelector('.fb');
  if(store.score[c][q.id]!==undefined){ d.classList.add('correct'); fb.className='fb ok'; fb.textContent='✓ Solved earlier (saved on this device).'; }
  hb.onclick=()=>{ if(hintN<q.hints.length){ const h=document.createElement('div'); h.className='hint'; h.innerHTML='💡 '+q.hints[hintN++]; d.querySelector('.hints').appendChild(h); renderMath(h); } else say('Those are all the hints for this problem. Tell me your first step and I’ll check it.'); };
  chk.onclick=()=>{
    tries++; let all=true; const msgs=[];
    q.ans.forEach((a,i)=>{ const inp=d.querySelector(`input[data-i="${i}"]`), g=gradeAns(a,inp.value);
      if(g.err){ all=false; msgs.push(`${a.q}: ${g.err}`); inp.style.borderColor='var(--bad)'; return; }
      inp.style.borderColor=g.ok?'var(--ok)':'var(--bad)'; if(!g.ok){ all=false; msgs.push(`${a.q} isn't right yet.`); } });
    d.classList.toggle('correct',all); d.classList.toggle('wrong',!all); fb.className='fb '+(all?'ok':'no');
    fb.innerHTML = all ? `✓ Correct${tries>1?` (after ${tries} tries; first-try answers count more toward mastery)`:''}.` : msgs.join(' ')+' Try again or take a hint.';
    if(all && store.score[c][q.id]===undefined){ const before=mastery(c); store.score[c][q.id]=tries===1?1:(tries===2?0.75:0.5); save(); drawList();
      if(before<80 && mastery(c)>=80){
        say(c<5?`Nice — this concept is mastered (80% or better). The next one is unlocked. Go on when you are ready.`:'You’ve finished Statics Unit 1 on this device. For a harder review, copy the tutor prompt into Grok.');
      }
    }
    if(!all && tries===2) say('Not quite yet. Write out your first equation, with signs and units, and I’ll help you find the slip.');
  };
  box.innerHTML=''; box.appendChild(d);
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
    if(MICRO[key]){
      const btn=box.querySelector('button.btn'), fb=box.querySelector('.fb');
      if(!btn) return;
      btn.addEventListener('click',()=>{
        const ins=[...box.querySelectorAll('input')];
        let all=true, msgs=[];
        MICRO[key].forEach((a,i)=>{
          const g=gradeAns(a, ins[i]?ins[i].value:'');
          if(ins[i]) ins[i].style.borderColor=(g.ok)?'var(--ok)':'var(--bad)';
          if(!g.ok){ all=false; msgs.push(g.err||'Not quite.'); }
        });
        fb.className='fb '+(all?'ok':'no');
        fb.textContent=all?'✓ Right.':'Not quite. '+msgs.join(' ')+' This check is just for practice — it does not count toward mastery.';
      });
    }
    if(MICRO_MC[key]){
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

$('#reset').addEventListener('click',e=>{ e.preventDefault(); if(confirm('Reset all saved progress on this device?')){ localStorage.removeItem(KEY); location.reload(); } });

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
$('#csend').onclick=()=>{ const v=$('#cin').value.trim(); if(!v) return; say(v.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;'),'s'); $('#cin').value=''; setTimeout(()=>say(reply(v)),250); };
$('#cin').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#csend').click(); });

/* ---------- boot ---------- */
function boot(){
  bindChecks();
  Object.values(Q).forEach(list=>list.forEach(buildQuiz));
  const r=readRoute();
  go(r.c, r.i);
  renderMath(document.body);
  const any=Object.values(store.score).some(o=>Object.keys(o||{}).length);
  if(!$('#chat').children.length) say(any
    ? 'Welcome back! Your progress is restored. Pick up the slide you left, or jump with the dots.'
    : 'Hi! This unit is a set of interactive slides. Drag the pictures, check yourself as you go, then try the problems. I give hints, not answers — show your work and include units.');
}
if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);
})();
