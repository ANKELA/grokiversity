/* Grokeversity prototype: Statics Unit 1, concepts 1-3. No backend; progress in localStorage. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const deg = r => r*180/Math.PI, rad = d => d*Math.PI/180;
const KEY = 'grokeversity.v1';
const store = (()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } })();
store.score = store.score || {1:{},2:{},3:{}}; store.current = store.current || 1;
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
function renderMath(el){ if(window.renderMathInElement) renderMathInElement(el||document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false}); }
function say(html, who='t'){ const m=document.createElement('div'); m.className='msg '+who; m.innerHTML=html; $('#chat').appendChild(m); $('#chat').scrollTop=1e9; renderMath(m); }
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2400); }

/* ---------- ME track map ---------- */
const TRACK = {
  'Year 1': ['Calculus I','Calculus II','Physics I: Mechanics','Physics II: E&M','Chemistry','Intro Design & CAD','Programming for Engineers'],
  'Year 2': ['Calculus III','Differential Equations','Linear Algebra','Statics','Dynamics','Mechanics of Materials','Circuits & Electronics','Materials Science'],
  'Year 3': ['Thermodynamics','Fluid Mechanics','Heat Transfer','Machine Design','Manufacturing','Numerical Methods','Probability & Statistics','Measurement & Instrumentation Lab'],
  'Year 4': ['System Dynamics & Controls','Thermal-Fluid Systems Design','Mechatronics','Capstone Design I','Capstone Design II','Technical Electives ×3','Ethics & Technical Communication']
};
$('#trackGrid').innerHTML = Object.entries(TRACK).map(([y,cs])=>`<div class="year"><h4>${y}</h4>${cs.map(c=> c==='Statics'
  ? `<div class="course live" data-go="learn" role="link" tabindex="0"><span>ME 201 Statics</span><span class="badge">Play now</span></div>`
  : `<div class="course"><span>${c}</span><span class="badge">Coming soon</span></div>`).join('')}</div>`).join('');
$$('[data-go="learn"]').forEach(el=>el.addEventListener('click',()=>$('#learn').scrollIntoView()));

/* ---------- copy tutor prompt ---------- */
async function copyPrompt(){
  let txt = ($('#tutorPromptText').textContent||'').replace(/<!--TUTOR_PROMPT_(START|END)-->/g,'').trim();
  if(!txt){ try{ txt = await (await fetch('tutor-prompt.md')).text(); }catch(e){} }
  if(!txt){ toast('Could not load the prompt. Open tutor-prompt.md instead.'); return; }
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Tutor prompt copied. Paste it into Grok and say “start”.');
  say('Prompt copied ✅. Open Grok, paste it as your first message, then type <b>start</b>. That tutor grades strictly and won\'t give away answers.');
}
$('#copyPrompt').addEventListener('click',copyPrompt); $('#copyHero').addEventListener('click',copyPrompt);

/* ---------- concept list ---------- */
const CONCEPTS = [[1,'Forces as vectors'],[2,'Free-body diagrams'],[3,'Particle equilibrium'],[4,'Moments'],[5,'Rigid-body equilibrium']];
const unlocked = c => c===1 || (c<=3 && mastery(c-1)>=80);
function mastery(c){ const q=Q[c]; if(!q) return 0; const v=Object.values(store.score[c]||{}); return Math.round(100*v.reduce((a,b)=>a+b,0)/q.length); }
function drawList(){
  $('#clist').innerHTML = CONCEPTS.map(([n,t])=>{ const st = n>3?'soon':(mastery(n)>=80?'✓':(unlocked(n)?'●':'🔒'));
    return `<button class="cbtn ${n===store.current?'active':''} ${(!unlocked(n)&&n<=3)||n>3?'locked':''}" data-c="${n}"><span>${n} · ${t}</span><span>${st}</span></button>`; }).join('');
  $$('#clist .cbtn').forEach(b=>b.addEventListener('click',()=>go(+b.dataset.c)));
  const m = mastery(store.current); $('#mpct').textContent = (store.current>3?'—':m+'%'); $('#mbar').style.width=(store.current>3?0:m)+'%';
}
function go(c){
  if(c<=3 && !unlocked(c)){ say(`Concept ${c} unlocks when you reach 80% mastery on concept ${c-1}. Want a hint on a question you're stuck on?`); return; }
  store.current=c; save(); $$('.concept').forEach(d=>d.hidden = d.id!=='c'+c); drawList();
  if(c===3) drawEq();
}

/* ---------- concept 1: draggable vectors ---------- */
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
function svgPt(svg,e){ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
(function(){ const svg=$('#vec'); let cur=null;
  const grab=k=>e=>{ cur=k; svg.setPointerCapture(e.pointerId); e.preventDefault(); };
  $('#d1').addEventListener('pointerdown',grab('f1')); $('#d2').addEventListener('pointerdown',grab('f2'));
  svg.addEventListener('pointermove',e=>{ if(!cur) return; const q=svgPt(svg,e); st[cur]={x:Math.max(-290,Math.min(290,Math.round(q.x/5)*5)),y:Math.max(-220,Math.min(220,Math.round(-q.y/5)*5))}; drawVec(); });
  svg.addEventListener('pointerup',()=>cur=null); svg.addEventListener('pointercancel',()=>cur=null);
  $('#showc').addEventListener('change',drawVec);
  $('#preset').addEventListener('click',()=>{ st.f1={x:125*Math.cos(rad(40)),y:125*Math.sin(rad(40))}; st.f2={x:200*Math.cos(rad(150)),y:200*Math.sin(rad(150))}; drawVec();
    say('Example loaded: 250 N ∠40° and 400 N ∠150°. Before you look at the readout, predict which quadrant R lands in. Then check yourself.'); });
})();
let stepI=0; $('#next1').addEventListener('click',()=>{ const s=$$('#steps1 .step'); if(stepI<s.length) s[stepI++].classList.add('show'); if(stepI>=s.length){ $('#next1').disabled=true; $('#next1').textContent='All steps shown'; } });

/* ---------- concept 2: FBD builder ---------- */
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
  FBD.forEach(o=>{ if(fbdOn.has(o.k)) h+=o.draw; }); $('#fbd').innerHTML=h;
}
FBD.forEach(o=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=o.label; b.dataset.k=o.k; b.onclick=()=>{ fbdOn.has(o.k)?fbdOn.delete(o.k):fbdOn.add(o.k); b.classList.toggle('on'); drawFBD(); }; $('#palette').appendChild(b); });
$('#checkfbd').onclick=()=>{ const need=FBD.filter(o=>o.ok).map(o=>o.k), wrong=[...fbdOn].filter(k=>!need.includes(k)), miss=need.filter(k=>!fbdOn.has(k)), fb=$('#fbdfb');
  if(!wrong.length&&!miss.length){ fb.className='fb ok'; fb.textContent='✓ Correct: Aₓ, A_y, B_y plus the load. 3 unknowns, 3 equations, so it is statically determinate.'; say('Great FBD. Which single moment equation gives B_y directly?'); }
  else{ fb.className='fb no'; fb.textContent=(wrong.length?`Remove ${wrong.length} force${wrong.length>1?'s':''}. `:'')+(miss.length?'Something is missing. ':'')+'Ask what motion each support prevents.';
    if(wrong.includes('Bx')) say('A roller can roll sideways. Can it push horizontally?'); else if(wrong.includes('MA')) say('Can a pin resist rotation? What kind of support would?'); else if(miss.length) say('Count what each support prevents: a pin prevents two translations.'); } };

/* ---------- concept 3: particle equilibrium ---------- */
const EQ={L:{x:-220,y:0},R:{x:220,y:0},ring:{x:-40,y:170}}; let eqInit=false;
function drawEq(){
  const svg=$('#eq'), m=+$('#mass').value, W=m*9.81, {L,R,ring}=EQ;
  const t1=Math.atan2(ring.y-L.y, ring.x-L.x), t2=Math.atan2(ring.y-R.y, R.x-ring.x);   // angles below anchors = above horizontal at ring
  const s=Math.sin(t1+t2), T1=W*Math.cos(t2)/s, T2=W*Math.cos(t1)/s;
  const w1=Math.min(12,1.5+T1/W*3), w2=Math.min(12,1.5+T2/W*3);
  // force triangle inset (scaled)
  const sc=95/Math.max(W,T1,T2), ox=215, oy=330;
  // W downward from O, then T1 (up-left), then T2 (up-right) closes to O
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
  $('#ringH').addEventListener('pointerdown',e=>{ eqDrag=true; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
}
let eqDrag=false;
(function(){ const svg=$('#eq');
  svg.addEventListener('pointermove',e=>{ if(!eqDrag) return; const q=svgPt(svg,e); EQ.ring={x:Math.max(-200,Math.min(200,Math.round(q.x))), y:Math.max(15,Math.min(250,Math.round(q.y)))}; drawEq(); });
  svg.addEventListener('pointerup',()=>eqDrag=false); svg.addEventListener('pointercancel',()=>eqDrag=false);
  $('#mass').addEventListener('input',drawEq); $('#predict').addEventListener('change',drawEq);
})();

/* ---------- quiz engine ---------- */
const UNITS={N:1,kN:1000,m:1,mm:0.001,cm:0.01};
function parseQty(str,unit){
  const m=String(str).trim().replace(',','.').match(/^([-+−]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([a-zA-Z°]*)$/);
  if(!m) return {err:'Enter a number, optionally followed by a unit.'};
  const v=parseFloat(m[1].replace('−','-')), u=m[2]||'';
  if(unit==='count') return {v};
  if(!u) return {err:`include units (${unit}).`};
  if(unit==='deg') return /^(deg|°|degrees?)$/i.test(u) ? {v} : {err:'angle units should be degrees (deg).'};
  if(!(u in UNITS)) return {err:`unknown unit “${u}”.`};
  if((unit==='m') !== (u==='m'||u==='mm'||u==='cm')) return {err:`wrong kind of unit: expected ${unit}.`};
  return {v:v*UNITS[u]/UNITS[unit]};
}
const Q={
 1:[{id:'q1.1',diff:'easy',text:'Two forces act on a bolt: \\(F_1=300\\) N at 30° and \\(F_2=500\\) N at 135° (CCW from \\(+x\\)). Find the magnitude and direction of the resultant.',
     ans:[{q:'|R|',v:512.2,u:'N',tp:1},{q:'θ_R',v:100.5,u:'deg',ta:0.5}],
     hints:['Resolve each force into x and y components first, then add like components.','\\(\\cos 135^\\circ\\) is negative. Check the sign of \\(F_{2x}\\).','Once you have \\(R_x\\) and \\(R_y\\), use atan2. Which quadrant is R in?']},
    {id:'q1.3',diff:'hard',text:'Tug 1 pulls a barge with \\(F_1=500\\) N at +20°. What force \\(F_2\\) (magnitude and angle) makes the resultant exactly 800 N along \\(+x\\)?',
     ans:[{q:'|F₂|',v:371.8,u:'N',tp:1},{q:'θ₂',v:-27.4,u:'deg',ta:0.5}],
     hints:['Vector subtraction: \\(\\vec F_2=\\vec R-\\vec F_1\\).','What must \\(F_{2y}\\) be so that \\(R_y=0\\)?']},
    {id:'q1.4',diff:'medium',text:'\\(\\vec F=(-244.9,\\,244.9,\\,489.9)\\) N. Find its component along the line from O to C(3, 0, 4) m, and the angle between \\(\\vec F\\) and OC.',
     ans:[{q:'F_OC',v:244.9,u:'N',tp:1},{q:'θ',v:65.9,u:'deg',ta:0.5}],
     hints:['First find the unit vector \\(\\hat u_{OC}\\). How long is OC?','\\(F_{OC}=\\vec F\\cdot\\hat u_{OC}\\) and \\(\\cos\\theta=F_{OC}/|\\vec F|\\).']}],
 2:[{id:'q2.1',diff:'easy',text:'How many unknown reaction components does each 2D support provide?',
     ans:[{q:'roller',v:1,u:'count',ta:0},{q:'pin',v:2,u:'count',ta:0},{q:'fixed',v:3,u:'count',ta:0},{q:'cable',v:1,u:'count',ta:0}],
     hints:['Ask which motions the support prevents: one reaction per prevented motion.','A fixed support also prevents rotation, which needs a couple moment.']},
    {id:'q2.3',diff:'medium',text:'A 2D beam is held by a pin at A and a second pin at B. Give the number of unknowns, independent equations, and the degree of indeterminacy.',
     ans:[{q:'unknowns',v:4,u:'count',ta:0},{q:'equations',v:3,u:'count',ta:0},{q:'degree',v:1,u:'count',ta:0}],
     hints:['Each pin supplies two force components.','A planar rigid body gives \\(\\sum F_x,\\ \\sum F_y,\\ \\sum M\\).']},
    {id:'q2.5',diff:'medium',text:'In 3D, how many reaction components does a ball-and-socket joint provide? A fixed support?',
     ans:[{q:'ball-and-socket',v:3,u:'count',ta:0},{q:'fixed (3D)',v:6,u:'count',ta:0}],
     hints:['A ball-and-socket allows every rotation.','A rigid body in 3D can move in 6 independent ways.']}],
 3:[{id:'q3.1',diff:'easy',text:'A 50 kg crate hangs from ring A. Cable AB runs up-left at 30° above horizontal; cable AC runs up-right at 45°. Find \\(T_{AB}\\) and \\(T_{AC}\\).',
     ans:[{q:'T_AB',v:359.1,u:'N',tp:1},{q:'T_AC',v:439.8,u:'N',tp:1}],
     hints:['W = mg. Draw the FBD of the ring: three forces.','Write \\(\\sum F_x=0\\) and \\(\\sum F_y=0\\), giving two equations in two unknowns.']},
    {id:'q3.2',diff:'medium',text:'An 8 kg lamp hangs at A. A horizontal spring AB (\\(k=800\\) N/m) pulls left; cable AC pulls up-right at 30° above horizontal. Find \\(T_{AC}\\), the spring force, and the spring stretch.',
     ans:[{q:'T_AC',v:156.96,u:'N',tp:1},{q:'F_spring',v:135.9,u:'N',tp:1},{q:'stretch',v:0.1699,u:'m',tp:1}],
     hints:['Only the cable has a vertical component. Start with \\(\\sum F_y\\).','Spring: \\(F=ks\\), so \\(s=F/k\\).']},
    {id:'q3.3',diff:'hard',text:'A 1200 N load hangs from point A at the origin, held by cables to B(−2, −3, 6) m, C(3, −2, 6) m and D(0, 4, 6) m. Find the tension in each cable.',
     ans:[{q:'T_AB',v:509.1,u:'N',tp:1},{q:'T_AC',v:339.4,u:'N',tp:1},{q:'T_AD',v:568.1,u:'N',tp:1}],
     hints:['Write each cable force as \\(T\\hat u\\). Find the lengths |AB|, |AC|, |AD| first.','Three equations: \\(\\sum F_x=\\sum F_y=\\sum F_z=0\\), with the load \\((0,0,-1200)\\) N.','Solve the 3×3 system. All tensions must come out positive.']}]
};
function buildQuiz(c){
  const box=$('#quiz'+c); box.innerHTML='';
  Q[c].forEach(q=>{
    const d=document.createElement('div'); d.className='q'; d.id='Q'+q.id.replace('.','_');
    d.innerHTML=`<div><b>${q.id}</b><span class="tag">${q.diff}</span></div><p>${q.text}</p>
      <div class="inrow">${q.ans.map((a,i)=>`<label>${a.q}<br><input data-i="${i}" inputmode="text" autocomplete="off" placeholder="${a.u==='count'?'number':'value '+a.u}"></label>`).join('')}</div>
      <button class="btn">Check</button> <button class="btn ghost">Hint</button><div class="fb"></div><div class="hints"></div>`;
    let hintN=0, tries=0; const [chk,hb]=d.querySelectorAll('button'), fb=d.querySelector('.fb');
    if(store.score[c][q.id]!==undefined){ d.classList.add('correct'); fb.className='fb ok'; fb.textContent='✓ Solved earlier (saved on this device).'; }
    hb.onclick=()=>{ if(hintN<q.hints.length){ const h=document.createElement('div'); h.className='hint'; h.innerHTML='💡 '+q.hints[hintN++]; d.querySelector('.hints').appendChild(h); renderMath(h); } else say(`No more hints for ${q.id}. Tell me your first step and I'll check it.`); };
    chk.onclick=()=>{
      tries++; let all=true; const msgs=[];
      q.ans.forEach((a,i)=>{ const inp=d.querySelector(`input[data-i="${i}"]`), p=parseQty(inp.value,a.u);
        if(p.err){ all=false; msgs.push(`${a.q}: ${p.err}`); inp.style.borderColor='var(--bad)'; return; }
        const ok=a.ta!==undefined?Math.abs(p.v-a.v)<=a.ta+1e-9:Math.abs(p.v-a.v)<=a.tp/100*Math.abs(a.v);
        inp.style.borderColor=ok?'var(--ok)':'var(--bad)'; if(!ok){ all=false; msgs.push(`${a.q} isn't right yet.`); } });
      d.classList.toggle('correct',all); d.classList.toggle('wrong',!all); fb.className='fb '+(all?'ok':'no');
      fb.innerHTML = all ? `✓ Correct${tries>1?` (after ${tries} tries; first-try answers count more toward mastery)`:''}.` : msgs.join(' ')+' Try again or take a hint.';
      if(all && store.score[c][q.id]===undefined){ const before=mastery(c); store.score[c][q.id]=tries===1?1:(tries===2?0.75:0.5); save(); drawList();
        say(tries===1?`Nice: ${q.id} on the first try. Can you explain <i>why</i> your signs make sense?`:`Good recovery on ${q.id}. We'll revisit this idea in spaced review.`);
        if(before<80 && mastery(c)>=80) say(c<3?`🎉 Concept ${c} mastered (≥80%). Concept ${c+1} is unlocked. Go on when <b>you</b> are ready.`:'🎉 Concept 3 mastered! Concepts 4–5 are coming soon. Keep going with the tutor prompt in Grok.'); }
      if(!all && tries===2) say(`On ${q.id}: what are your components, with signs? Type out your working and I'll help you find the slip.`);
    };
    box.appendChild(d);
  });
  renderMath(box);
}
$('#reset').addEventListener('click',e=>{ e.preventDefault(); if(confirm('Reset all saved progress on this device?')){ localStorage.removeItem(KEY); location.reload(); } });

/* ---------- scripted tutor ---------- */
function reply(t){ t=t.toLowerCase();
  if(/answer|solution|just tell|give me/.test(t)) return 'I won\'t hand over the answer, because you\'d lose the learning. Tell me your first step (for example, your F₁ components) and I\'ll check it.';
  if(/hint|stuck|help/.test(t)) return 'Start by writing each force as \\((F\\cos\\theta,\\,F\\sin\\theta)\\). What do you get for each x-component, with its sign?';
  if(/slow|fast|pace|break/.test(t)) return 'You set the pace. Progress is saved on this device, so come back any time. In the full tutor, say "slower" or "faster".';
  if(/unit/.test(t)) return 'Always carry units: N for force, m for length, N·m for moment, deg for angles. Missing units count as wrong, just like on a real exam.';
  if(/grok|real tutor|ai/.test(t)) return 'Tap “Copy tutor prompt for Grok” below, paste it into Grok, and say “start”. That tutor runs this whole unit.';
  return 'Good question. In this demo my replies are scripted. For a real conversation, copy the tutor prompt into Grok. Meanwhile, what have you tried so far?'; }
$('#csend').onclick=()=>{ const v=$('#cin').value.trim(); if(!v) return; say(v.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;'),'s'); $('#cin').value=''; setTimeout(()=>say(reply(v)),250); };
$('#cin').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#csend').click(); });

/* ---------- boot ---------- */
function boot(){ drawVec(); drawFBD(); [1,2,3].forEach(buildQuiz); go(unlocked(store.current)||store.current>3?store.current:1); renderMath(document.body); drawVec();
  if(!$('#chat').children.length) say(Object.keys(store.score[1]).length ? 'Welcome back! Your progress is restored. Pick up where you left off.' : 'Hi! We start with <b>Forces as vectors</b>. Drag the arrows, then try the quiz. I give hints, not answers, so show your work and units.'); }
if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);
})();
