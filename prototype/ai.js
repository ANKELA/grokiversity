/* Grokeversity prototype: AI 101 Unit 1, concepts 1-4. No backend; progress in localStorage. */
(function(){
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const KEY = 'grokeversity.ai101.v1';
const store = (()=>{ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } })();
store.score = store.score || {1:{},2:{},3:{},4:{}}; store.current = store.current || 1;
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} };
function renderMath(el){ if(window.renderMathInElement) renderMathInElement(el||document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false}); }
function say(html, who='t'){ const m=document.createElement('div'); m.className='msg '+who; m.innerHTML=html; $('#chat').appendChild(m); $('#chat').scrollTop=1e9; renderMath(m); }
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2400); }
const svgEl = (tag, attrs, text) => {
  const e=document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,v));
  if(text!=null) e.textContent=text;
  return e;
};

/* ---------- copy tutor prompt ---------- */
async function copyPrompt(){
  let txt = ($('#tutorPromptText').textContent||'').replace(/<!--TUTOR_PROMPT_(START|END)-->/g,'').trim();
  if(!txt){ try{ txt = await (await fetch('tutor-prompt-ai.md')).text(); }catch(e){} }
  if(!txt){ toast('Could not load the prompt. Open tutor-prompt-ai.md instead.'); return; }
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Tutor prompt copied. Paste it into Grok and say “start”.');
  say('Prompt copied ✅. Open Grok, paste it as your first message, then type <b>start</b>. That tutor grades strictly and won\'t give away answers.');
}
$('#copyPrompt').addEventListener('click',copyPrompt);

/* ---------- concept list ---------- */
const CONCEPTS = [[1,'What AI is'],[2,'Linear models & MSE'],[3,'Gradient descent'],[4,'Neurons & attention']];
const unlocked = c => c===1 || mastery(c-1)>=80;
function mastery(c){ const q=Q[c]; if(!q) return 0; const v=Object.values(store.score[c]||{}); return Math.round(100*v.reduce((a,b)=>a+b,0)/q.length); }
function drawList(){
  $('#clist').innerHTML = CONCEPTS.map(([n,t])=>{ const st = mastery(n)>=80?'✓':(unlocked(n)?'●':'🔒');
    return `<button class="cbtn ${n===store.current?'active':''} ${!unlocked(n)?'locked':''}" data-c="${n}"><span>${n} · ${t}</span><span>${st}</span></button>`; }).join('');
  $$('#clist .cbtn').forEach(b=>b.addEventListener('click',()=>go(+b.dataset.c)));
  const m = mastery(store.current); $('#mpct').textContent = m+'%'; $('#mbar').style.width=m+'%';
}
function go(c){
  if(!unlocked(c)){ say(`Concept ${c} unlocks when you reach 80% mastery on concept ${c-1}. Want a hint on a question you're stuck on?`); return; }
  store.current=c; save(); $$('.concept').forEach(d=>d.hidden = d.id!=='c'+c); drawList();
  if(c===1) drawTree(); if(c===2) drawReg(); if(c===3) drawGD(); if(c===4){ drawNeu(); drawAttn(); }
}

/* ---------- C1: search-tree size ---------- */
function drawTree(){
  const b=+$('#bRange').value, d=+$('#dRange').value;
  $('#bVal').textContent=b; $('#dVal').textContent=d;
  const per = [...Array(d+1)].map((_,k)=>b**k);
  const tot = per.reduce((a,c)=>a+c,0);
  $('#tLeaf').textContent = per[d].toLocaleString();
  $('#tTot').textContent = tot.toLocaleString();
  if(window.katex) katex.render(`N=\\sum_{k=0}^{${d}}${b}^{k}=\\frac{${b}^{${d}+1}-1}{${b}-1}=${tot}`, $('#tMath'), {displayMode:true,throwOnError:false});
  const svg=$('#treeViz'); svg.innerHTML='';
  const W=520, H=260, pad=28, max=Math.max(...per,1);
  const bw=(W-2*pad)/per.length - 8;
  per.forEach((n,i)=>{
    const h=Math.max(4, (H-56)*n/max), x=pad+i*(bw+8), y=H-28-h;
    svg.appendChild(svgEl('rect',{x,y,width:bw,height:h,rx:4,fill:i===d?'#7c9cff':'#2b356e'}));
    svg.appendChild(svgEl('text',{x:x+bw/2,y:H-10,'text-anchor':'middle',fill:'#9aa3c7','font-size':11}, 'd='+i));
    svg.appendChild(svgEl('text',{x:x+bw/2,y:y-6,'text-anchor':'middle',fill:'#e8eaf6','font-size':11}, n>=1000?n.toExponential(1):String(n)));
  });
}
$('#bRange').addEventListener('input',drawTree);
$('#dRange').addEventListener('input',drawTree);

/* ---------- C2: draggable line + live MSE ---------- */
const DATA=[{x:1,y:2},{x:2,y:2},{x:3,y:5},{x:4,y:5}];
const reg={w:0.4,b:2.2};
const RX0=50, RY0=268, RSX=80, RSY=36;
const rX=x=>RX0+x*RSX, rY=y=>RY0-y*RSY, rInvY=Y=>(RY0-Y)/RSY;
function mseOf(w,b){ return DATA.reduce((s,p)=>s+(p.y-(w*p.x+b))**2,0)/DATA.length; }
function drawReg(){
  const {w,b}=reg, mse=mseOf(w,b);
  const svg=$('#reg'); svg.innerHTML='';
  // axes
  svg.appendChild(svgEl('line',{x1:rX(0),y1:rY(0),x2:rX(5.1),y2:rY(0),stroke:'#3d4680','stroke-width':1.5}));
  svg.appendChild(svgEl('line',{x1:rX(0),y1:rY(0),x2:rX(0),y2:rY(7.2),stroke:'#3d4680','stroke-width':1.5}));
  for(let x=0;x<=5;x++) svg.appendChild(svgEl('text',{x:rX(x),y:rY(0)+16,'text-anchor':'middle',fill:'#5c6390','font-size':11}, String(x)));
  for(let y=0;y<=7;y++) svg.appendChild(svgEl('text',{x:rX(0)-10,y:rY(y)+4,'text-anchor':'end',fill:'#5c6390','font-size':11}, String(y)));
  svg.appendChild(svgEl('text',{x:rX(5.1),y:rY(0)-8,fill:'#5c6390','font-size':12},'x'));
  svg.appendChild(svgEl('text',{x:rX(0)+8,y:rY(7.2),fill:'#5c6390','font-size':12},'y'));
  const yL=w*0+b, yR=w*5+b;
  DATA.forEach(p=>{
    const yh=w*p.x+b;
    svg.appendChild(svgEl('line',{x1:rX(p.x),y1:rY(p.y),x2:rX(p.x),y2:rY(yh),stroke:'#ffd54f','stroke-width':1.5,'stroke-dasharray':'4 4',opacity:.85}));
  });
  svg.appendChild(svgEl('line',{id:'rline',x1:rX(0),y1:rY(yL),x2:rX(5),y2:rY(yR),stroke:'#7c9cff','stroke-width':3}));
  DATA.forEach(p=> svg.appendChild(svgEl('circle',{cx:rX(p.x),cy:rY(p.y),r:6,fill:'#ff8a65',stroke:'#0c0f1d','stroke-width':2})));
  svg.appendChild(svgEl('circle',{id:'hB',class:'handle',cx:rX(0),cy:rY(b),r:12,fill:'#4dd0e1','fill-opacity':.35,stroke:'#4dd0e1','stroke-width':2}));
  svg.appendChild(svgEl('circle',{id:'hW',class:'handle',cx:rX(4),cy:rY(4*w+b),r:12,fill:'#7c9cff','fill-opacity':.35,stroke:'#7c9cff','stroke-width':2}));
  $('#rw').textContent=w.toFixed(2);
  $('#rb').textContent=b.toFixed(2);
  $('#rmse').textContent=mse.toFixed(3);
  if(window.katex) katex.render(`\\hat y=${w.toFixed(2)}x+${b.toFixed(2)},\\quad \\mathrm{MSE}=${mse.toFixed(3)}`, $('#rMath'), {displayMode:true,throwOnError:false});
}
(function(){
  const svg=$('#reg'); let cur=null;
  const pt=e=>{ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  svg.addEventListener('pointerdown',e=>{
    const t=e.target; if(t.id==='hB'||t.id==='hW'){ cur=t.id; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  svg.addEventListener('pointermove',e=>{
    if(!cur) return;
    const y=Math.max(0, Math.min(7.2, rInvY(pt(e).y)));
    if(cur==='hB') reg.b=y;
    else reg.w=(y-reg.b)/4;
    drawReg();
  });
  svg.addEventListener('pointerup',()=>cur=null);
  svg.addEventListener('pointercancel',()=>cur=null);
  $('#olsBtn').addEventListener('click',()=>{ reg.w=1.2; reg.b=0.5; drawReg(); });
})();

/* ---------- C3: gradient descent visualiser ---------- */
const gd={w:0, eta:0.2, hist:[0]};
const J=w=>(w-3)**2, dJ=w=>2*(w-3);
function classifyEta(eta){ if(eta<=0) return 'invalid'; if(eta<1) return 'converging'; if(Math.abs(eta-1)<1e-9) return 'oscillating'; return 'diverging'; }
function drawGD(){
  gd.eta=+$('#eta').value;
  $('#etaVal').textContent=gd.eta.toFixed(2);
  $('#gdw').textContent=gd.w.toFixed(3);
  $('#gdj').textContent=J(gd.w).toFixed(3);
  const st=classifyEta(gd.eta);
  const last=gd.hist[gd.hist.length-1], prev=gd.hist.length>1?gd.hist[gd.hist.length-2]:null;
  let note=st;
  if(st==='converging' && Math.abs(gd.w-3)<1e-3) note='converged near w=3';
  if(st==='diverging' && Math.abs(gd.w)>20) note='diverging (|w| ran off the plot)';
  if(st==='oscillating' && prev!=null && Math.abs(last-(6-prev))<1e-6) note='oscillating (w ↔ 6−w)';
  $('#gdst').textContent=note;

  const surf=$('#gdSurf'); surf.innerHTML='';
  // w in [-1,7], J in [0,16]
  const X0=40, Y0=210, SX=40, SY=12; // x=w map, y=J down
  const X=w=>X0+(w+1)*SX, Y=j=>Y0-j*SY;
  // axes
  surf.appendChild(svgEl('line',{x1:X(-1),y1:Y(0),x2:X(7),y2:Y(0),stroke:'#3d4680'}));
  surf.appendChild(svgEl('line',{x1:X(-1),y1:Y(0),x2:X(-1),y2:Y(16),stroke:'#3d4680'}));
  surf.appendChild(svgEl('text',{x:X(7),y:Y(0)+16,fill:'#5c6390','font-size':12},'w'));
  surf.appendChild(svgEl('text',{x:X(-1)+8,y:Y(16),fill:'#5c6390','font-size':12},'J'));
  for(let w=0;w<=6;w+=2) surf.appendChild(svgEl('text',{x:X(w),y:Y(0)+14,'text-anchor':'middle',fill:'#5c6390','font-size':11}, String(w)));
  // parabola
  let d=''; for(let w=-1;w<=7;w+=0.05){ const x=X(w), y=Y(Math.min(J(w),16.5)); d+=(d?'L':'M')+x+' '+y; }
  surf.appendChild(svgEl('path',{d,fill:'none',stroke:'#7c9cff','stroke-width':2.5}));
  surf.appendChild(svgEl('circle',{cx:X(3),cy:Y(0),r:4,fill:'#66bb6a'}));
  // trail
  gd.hist.forEach((w,i)=>{
    const ww=Math.max(-1,Math.min(7,w));
    surf.appendChild(svgEl('circle',{cx:X(ww),cy:Y(Math.min(J(w),16)),r:i===gd.hist.length-1?8:4,fill:i===gd.hist.length-1?'#ff8a65':'#ff8a65',opacity:i===gd.hist.length-1?1:0.35}));
  });

  const loss=$('#gdLoss'); loss.innerHTML='';
  loss.appendChild(svgEl('line',{x1:40,y1:210,x2:380,y2:210,stroke:'#3d4680'}));
  loss.appendChild(svgEl('line',{x1:40,y1:210,x2:40,y2:20,stroke:'#3d4680'}));
  loss.appendChild(svgEl('text',{x:380,y:226,fill:'#5c6390','font-size':12},'iteration'));
  loss.appendChild(svgEl('text',{x:48,y:18,fill:'#5c6390','font-size':12},'J'));
  const Js=gd.hist.map(J);
  const jMax=Math.max(16, ...Js.map(v=>Math.min(v,64)));
  const n=Math.max(gd.hist.length-1,1);
  let ld='';
  Js.forEach((jv,i)=>{
    const x=40+(i/n)*340, y=210-(Math.min(jv,jMax)/jMax)*180;
    ld+=(ld?'L':'M')+x+' '+y;
    loss.appendChild(svgEl('circle',{cx:x,cy:y,r:3,fill:'#ffd54f'}));
  });
  if(Js.length>1) loss.appendChild(svgEl('path',{d:ld,fill:'none',stroke:'#ffd54f','stroke-width':2}));
}
function gdStep(){ gd.w = gd.w - gd.eta*dJ(gd.w); if(!isFinite(gd.w)||Math.abs(gd.w)>1e6) gd.w = Math.sign(gd.w)*1e6; gd.hist.push(gd.w); if(gd.hist.length>40) gd.hist=gd.hist.slice(-40); drawGD(); }
$('#eta').addEventListener('input',drawGD);
$('#gdStep').addEventListener('click',gdStep);
$('#gdRun').addEventListener('click',()=>{ for(let i=0;i<20;i++) gdStep(); });
$('#gdReset').addEventListener('click',()=>{ gd.w=0; gd.hist=[0]; drawGD(); });

/* ---------- C4: neuron + attention ---------- */
function sig(z){ return 1/(1+Math.exp(-Math.max(-30,Math.min(30,z)))); }
function drawNeu(){
  const x1=+$('#x1').value, x2=+$('#x2').value, w1=+$('#w1').value, w2=+$('#w2').value, b=+$('#bias').value;
  $('#x1v').textContent=x1.toFixed(2); $('#x2v').textContent=x2.toFixed(2);
  $('#w1v').textContent=w1.toFixed(2); $('#w2v').textContent=w2.toFixed(2); $('#bv').textContent=b.toFixed(2);
  const z=w1*x1+w2*x2+b, a=sig(z);
  $('#nz').textContent=z.toFixed(3); $('#na').textContent=a.toFixed(4);
  const svg=$('#neu'); svg.innerHTML='';
  // inputs -> node -> output
  const node={cx:210,cy:110};
  const ins=[{x:50,y:50,lab:'x₁',val:x1,col:'#ff8a65'},{x:50,y:170,lab:'x₂',val:x2,col:'#4dd0e1'}];
  ins.forEach((p,i)=>{
    const w=i===0?w1:w2;
    svg.appendChild(svgEl('line',{x1:p.x+18,y1:p.y,x2:node.cx-28,y2:node.cy,stroke:p.col,'stroke-width':Math.max(1.5,Math.abs(w)*2)}));
    svg.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:18,fill:'#1e2340',stroke:p.col,'stroke-width':2}));
    svg.appendChild(svgEl('text',{x:p.x,y:p.y+4,'text-anchor':'middle',fill:'#e8eaf6','font-size':13}, p.lab));
    svg.appendChild(svgEl('text',{x:(p.x+node.cx)/2,y:(p.y+node.cy)/2-8,fill:p.col,'font-size':12}, 'w='+w.toFixed(1)));
  });
  svg.appendChild(svgEl('circle',{cx:node.cx,cy:node.cy,r:28,fill:'#1e2340',stroke:'#7c9cff','stroke-width':3}));
  svg.appendChild(svgEl('text',{x:node.cx,y:node.cy-2,'text-anchor':'middle',fill:'#e8eaf6','font-size':12}, 'σ'));
  svg.appendChild(svgEl('text',{x:node.cx,y:node.cy+14,'text-anchor':'middle',fill:'#9aa3c7','font-size':10}, 'b='+b.toFixed(1)));
  svg.appendChild(svgEl('line',{x1:node.cx+28,y1:node.cy,x2:340,y2:node.cy,stroke:'#ffd54f','stroke-width':3}));
  svg.appendChild(svgEl('circle',{cx:358,cy:node.cy,r:22,fill:'#1e2340',stroke:'#ffd54f','stroke-width':2}));
  svg.appendChild(svgEl('text',{x:358,y:node.cy+4,'text-anchor':'middle',fill:'#ffd54f','font-size':12}, a.toFixed(2)));
  // mini sigmoid
  let d=''; for(let t=-4;t<=4;t+=0.1){ const x=300+t*10, y=200-sig(t)*40; d+=(d?'L':'M')+x+' '+y; }
  svg.appendChild(svgEl('path',{d,fill:'none',stroke:'#5c6390','stroke-width':1.5}));
  svg.appendChild(svgEl('circle',{cx:300+Math.max(-4,Math.min(4,z))*10,cy:200-a*40,r:4,fill:'#ffd54f'}));
}
['x1','x2','w1','w2','bias'].forEach(id=>$('#'+id).addEventListener('input',drawNeu));

function softmax(s){ const m=Math.max(...s), e=s.map(v=>Math.exp(v-m)), z=e.reduce((a,b)=>a+b,0); return e.map(v=>v/z); }
function drawAttn(){
  const s=[+$('#s1').value,+$('#s2').value,+$('#s3').value];
  const v=[+$('#v1').value,+$('#v2').value,+$('#v3').value];
  ['s1','s2','s3','v1','v2','v3'].forEach(id=>$('#'+id+'v').textContent=(+$('#'+id).value).toFixed(1));
  const a=softmax(s), out=a[0]*v[0]+a[1]*v[1]+a[2]*v[2];
  $('#aout').textContent=out.toFixed(3);
  if(window.katex) katex.render(`\\alpha=(${a.map(x=>x.toFixed(3)).join(',\\,')}),\\quad \\sum\\alpha_i v_i=${out.toFixed(3)}`, $('#aMath'), {displayMode:true,throwOnError:false});
  const svg=$('#attn'); svg.innerHTML='';
  const cols=['#ff8a65','#4dd0e1','#ffd54f'];
  a.forEach((ai,i)=>{
    const x=40+i*110, h=ai*160, y=200-h;
    svg.appendChild(svgEl('rect',{x,y,width:70,height:h,rx:6,fill:cols[i]}));
    svg.appendChild(svgEl('text',{x:x+35,y:218,'text-anchor':'middle',fill:'#9aa3c7','font-size':12}, 'α'+(i+1)));
    svg.appendChild(svgEl('text',{x:x+35,y:y-8,'text-anchor':'middle',fill:'#e8eaf6','font-size':12}, ai.toFixed(3)));
    svg.appendChild(svgEl('text',{x:x+35,y:234,'text-anchor':'middle',fill:cols[i],'font-size':11}, 'v='+v[i].toFixed(1)));
  });
  // output bar relative to value range
  const vmin=Math.min(0,...v), vmax=Math.max(0,...v,1), span=Math.max(vmax-vmin,1);
  const ox=400, oh=Math.abs(out)/span*160, oy=out>=0?200-oh:200;
  svg.appendChild(svgEl('rect',{x:ox,y:oy,width:70,height:Math.max(oh,2),rx:6,fill:'#7c9cff'}));
  svg.appendChild(svgEl('text',{x:ox+35,y:218,'text-anchor':'middle',fill:'#9aa3c7','font-size':12}, 'out'));
  svg.appendChild(svgEl('text',{x:ox+35,y:oy-8,'text-anchor':'middle',fill:'#e8eaf6','font-size':12}, out.toFixed(2)));
}
['s1','s2','s3','v1','v2','v3'].forEach(id=>$('#'+id).addEventListener('input',drawAttn));

/* ---------- quiz engine ---------- */
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
function canonUnit(u){
  const n=tidyText(u).replace(/\s+/g,'').toLowerCase();
  if(!n) return '';
  if(n==='%'||n==='percent'||n==='pct') return '%';
  if(n==='1'||n==='unit1') return '1';
  return n;
}
function unitHint(unit){
  if(unit==='%') return '%';
  if(unit==='1') return 'a bare number (unit 1 is optional)';
  if(unit==='count') return 'a whole number, no unit';
  return unit;
}
function formatAns(a){
  if(a.u==='count' || a.u==='1') return String(a.v);
  if(a.u==='%') return a.v+' %';
  return a.v+' '+a.u;
}
function parseQty(str,unit){
  const raw=tidyText(str);
  if(!raw) return {err:'Enter a number'+(unit==='%'?' and include the % unit.':'.')};
  let s=raw;
  if(/^[+-]?\d+,\d+/.test(s) && s.indexOf('.')===-1) s=s.replace(',','.');
  const m=s.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if(!m) return {err:'Enter a number'+(unit==='%'?' followed by %':'')+'.'};
  const v=parseFloat(m[1]);
  if(!isFinite(v)) return {err:'Enter a number'+(unit==='%'?' followed by %':'')+'.'};
  let u=tidyText(m[2]||'').replace(/[.,;:]+$/,'');
  if(unit==='count'){
    if(u && !/^(count|qty|nodes)?$/i.test(u)) return {err:'This is a count — no unit needed.'};
    return {v};
  }
  if(unit==='1'){
    if(!u || canonUnit(u)==='1') return {v};
    if(canonUnit(u)==='%') return {v:v/100};
    return {err:'This quantity is a bare number (no unit, or unit 1).'};
  }
  if(unit==='%'){
    const cu=canonUnit(u);
    if(!u) return {v:v, missingUnit:true};
    if(cu==='%') return {v};
    if(cu==='1') return {v:v*100};
    return {err:'Use % (for example 60 %).'};
  }
  if(!u) return {v:v, missingUnit:true};
  return {err:'Unknown unit “'+u+'”. Expected '+unitHint(unit)+'.'};
}
function nearly(a,v){
  if(a.ta!==undefined) return Math.abs(v-a.v)<=a.ta+1e-9;
  return Math.abs(v-a.v)<=((a.tp||1)/100)*Math.abs(a.v||1) || Math.abs(v-a.v)<1e-6;
}
function gradeAns(a, raw){
  const p=parseQty(raw,a.u);
  if(p.missingUnit){
    if(nearly(a,p.v)) return {ok:false, err:'The number is right, but this course requires units. Add “'+unitHint(a.u)+'” (for example '+formatAns(a)+').'};
    return {ok:false, err:'Please include the unit ('+unitHint(a.u)+').'};
  }
  if(p.err) return {ok:false, err:p.err};
  if(!nearly(a,p.v)) return {ok:false, err:"isn't right yet."};
  return {ok:true};
}

const Q={
 1:[{id:'q1.1',diff:'easy',text:'A rational agent chooses among three actions. A: utility 10 with probability 0.7 and utility 0 with probability 0.3. B: utility 20 with probability 0.4 and utility \\(-2\\) with probability 0.6. C: utility 6.5 with certainty. Compute the expected utility of A, of B, and of C.',
     ans:[{q:'EU(A)',v:7.0,u:'1',tp:1},{q:'EU(B)',v:6.8,u:'1',tp:1},{q:'EU(C)',v:6.5,u:'1',tp:1}],
     hints:['\\(\\mathrm{EU}(a)=\\sum P(\\text{outcome})\\times U(\\text{outcome})\\). For C the probability is 1.','For B, the second term is \\(0.6\\times(-2)\\), which is negative.']},
    {id:'q1.2',diff:'medium',text:'A complete tree has branching factor \\(b=4\\). The start node is at depth 0. Breadth-first search tests the goal when a node is generated. The unique goal is the last node generated at depth 5. How many nodes does BFS generate?',
     ans:[{q:'nodes generated',v:1365,u:'count',ta:0}],
     hints:['Depth \\(k\\) contains \\(b^k\\) nodes. You generate every node at depths 0 through 5.','The sum is \\((b^{d+1}-1)/(b-1)\\) with \\(d=5\\), \\(b=4\\).']},
    {id:'q1.3',diff:'hard',text:'A disease has prevalence \\(P(D)=0.01\\). A test has \\(P(+\\mid D)=0.95\\) and false-positive rate \\(P(+\\mid \\neg D)=0.10\\). Compute \\(P(+)\\) and the posterior \\(P(D\\mid +)\\) as probabilities (unit 1), not percents.',
     ans:[{q:'P(+)',v:0.1085,u:'1',tp:1},{q:'P(D|+)',v:0.08756,u:'1',tp:1}],
     hints:['Law of total probability: \\(P(+)=P(+\\mid D)P(D)+P(+\\mid\\neg D)P(\\neg D)\\). What is \\(P(\\neg D)\\)?','Then Bayes: \\(P(D\\mid +)=P(+\\mid D)P(D)/P(+)\\). The posterior should be much closer to 0.09 than to 0.95.']},
    {id:'q1.4',diff:'medium',text:'A data set has 120 examples of class A and 80 of class B (\\(n=200\\)). What is the accuracy, as a percent, of the majority-class baseline? A model predicts 150 of the 200 labels correctly. What is its accuracy, as a percent?',
     ans:[{q:'majority baseline',v:60,u:'%',ta:0.05},{q:'model accuracy',v:75,u:'%',ta:0.05}],
     hints:['The majority class is A, with 120/200 of the data.','Accuracy is (number correct)/\\(n\\), then convert to a percent. Include the % unit.']}],
 2:[{id:'q2.1',diff:'easy',text:'Data: \\((x,y)=(1,2),\\,(2,2),\\,(3,5),\\,(4,5)\\). For the line \\(\\hat y=x+0.5\\) (that is, \\(w=1\\), \\(b=0.5\\)), compute \\(\\mathrm{MSE}=(1/n)\\sum(y_i-\\hat y_i)^2\\).',
     ans:[{q:'MSE',v:0.75,u:'1',tp:1}],
     hints:['There are \\(n=4\\) points. First write each \\(\\hat y_i\\), then each residual, then the average of the squared residuals.','\\(\\hat y\\) takes the values 1.5, 2.5, 3.5, 4.5.']},
    {id:'q2.2',diff:'medium',text:'For the same four points, find the ordinary-least-squares slope \\(w\\), intercept \\(b\\), and the MSE of that fit.',
     ans:[{q:'w',v:1.2,u:'1',tp:1},{q:'b',v:0.5,u:'1',tp:1},{q:'MSE',v:0.45,u:'1',tp:1}],
     hints:['First compute the means \\(\\bar x\\) and \\(\\bar y\\). Then \\(\\hat w=\\sum(x-\\bar x)(y-\\bar y)/\\sum(x-\\bar x)^2\\).','\\(\\bar x=2.5\\) and \\(\\bar y=3.5\\). The denominator should come out to 5.']},
    {id:'q2.3',diff:'medium',text:'Again on those four points, fit the no-intercept model \\(\\hat y=wx\\) (the line is forced through the origin). Find \\(w\\) and the MSE.',
     ans:[{q:'w',v:1.3667,u:'1',tp:1},{q:'MSE',v:0.49167,u:'1',tp:1}],
     hints:['The critical point is \\(\\hat w=(\\sum x_i y_i)/(\\sum x_i^2)\\).','\\(\\sum xy=1\\cdot2+2\\cdot2+3\\cdot5+4\\cdot5\\) and \\(\\sum x^2=1+4+9+16\\).']},
    {id:'q2.4',diff:'hard',text:'Using \\(\\mathrm{MSE}=(1/n)\\sum(y_i-w x_i-b)^2\\) on the same four points, compute \\(\\partial\\mathrm{MSE}/\\partial w\\) and \\(\\partial\\mathrm{MSE}/\\partial b\\) at \\((w,b)=(1,1)\\).',
     ans:[{q:'∂MSE/∂w',v:-0.5,u:'1',ta:0.005},{q:'∂MSE/∂b',v:0,u:'1',ta:0.005}],
     hints:['Residuals at this point are \\(e=y-(x+1)\\). Then \\(\\partial\\mathrm{MSE}/\\partial w=-(2/n)\\sum x_i e_i\\).','If you dropped the 2, or used \\(1/(2n)\\) as the loss, your partials will be half as large.']}],
 3:[{id:'q3.1',diff:'easy',text:'Let \\(J(w)=(w-3)^2\\). Start at \\(w=0\\) and take gradient-descent steps with \\(\\eta=0.2\\). Report \\(w\\) after one step and after two steps.',
     ans:[{q:'w after 1 step',v:1.2,u:'1',tp:1},{q:'w after 2 steps',v:1.92,u:'1',tp:1}],
     hints:['\\(J\'(w)=2(w-3)\\). The update is \\(w\\leftarrow w-\\eta J\'(w)\\).','After the first step you should be at 1.2. Now compute \\(J\'(1.2)\\) and step again.']},
    {id:'q3.2',diff:'medium',text:'On the four-point data of Concept 2, start at \\((w,b)=(0,0)\\) and take one gradient-descent step on MSE with \\(\\eta=0.01\\). Report \\(\\partial\\mathrm{MSE}/\\partial w\\), \\(\\partial\\mathrm{MSE}/\\partial b\\) at the start, then the updated \\(w\\) and \\(b\\).',
     ans:[{q:'∂MSE/∂w',v:-20.5,u:'1',tp:1},{q:'∂MSE/∂b',v:-7,u:'1',tp:1},{q:'w',v:0.205,u:'1',tp:1},{q:'b',v:0.07,u:'1',tp:1}],
     hints:['At \\((0,0)\\) every residual is just \\(y_i\\). Use \\(\\partial\\mathrm{MSE}/\\partial w=-(2/n)\\sum x_i y_i\\).','\\(\\sum xy=41\\) and \\(\\sum y=14\\), with \\(n=4\\).']},
    {id:'q3.3',diff:'hard',text:'Still for \\(J(w)=(w-3)^2\\) and the update \\(w\\leftarrow w-\\eta J\'(w)\\): (a) find the critical learning rate \\(\\eta_c\\) such that the iteration diverges for every \\(\\eta>\\eta_c\\); (b) start at \\(w=5\\) with \\(\\eta=1\\) and report \\(w\\) after one step and after two steps.',
     ans:[{q:'η_c',v:1,u:'1',ta:0.005},{q:'w after 1 step',v:1,u:'1',ta:0.005},{q:'w after 2 steps',v:5,u:'1',ta:0.005}],
     hints:['Rewrite the update as \\(w\\leftarrow(1-2\\eta)w+6\\eta\\). This converges iff \\(|1-2\\eta|<1\\).','At \\(\\eta=1\\) the map is \\(w\\leftarrow 6-w\\). What does that do to 5?']},
    {id:'q3.4',diff:'hard',text:'On the four-point data, start at \\((w,b)=(1,1)\\) — the point from q2.4 — and take one MSE gradient step with \\(\\eta=0.2\\). Report the new \\(w\\), the new \\(b\\), and the MSE at the new point.',
     ans:[{q:'w',v:1.1,u:'1',tp:1},{q:'b',v:1,u:'1',ta:0.005},{q:'MSE',v:0.525,u:'1',tp:1}],
     hints:['You already have the gradient: \\((-0.5,\\,0)\\). Apply \\(w\\leftarrow w-\\eta\\partial J/\\partial w\\).','Then recompute all four residuals at the new parameters and average their squares. Don\'t assume the loss went down.']}],
 4:[{id:'q4.1',diff:'easy',text:'A neuron has weights \\(w=(1,\\,-2)\\), bias \\(b=0.5\\), and input \\(x=(1,\\,1)\\). Compute the pre-activation \\(z=w\\cdot x+b\\) and the sigmoid output \\(\\sigma(z)=1/(1+e^{-z})\\).',
     ans:[{q:'z',v:-0.5,u:'1',ta:0.005},{q:'σ(z)',v:0.37754,u:'1',tp:1}],
     hints:['\\(z=1\\cdot 1+(-2)\\cdot 1+0.5\\). Watch the sign.','\\(\\sigma(-0.5)=1/(1+e^{0.5})\\). You can also use \\(\\sigma(-z)=1-\\sigma(z)\\).']},
    {id:'q4.2',diff:'medium',text:'Scores \\(s=(2,\\,1,\\,0)\\) and values \\(v=(1,\\,3,\\,5)\\). Compute the three softmax weights \\(\\alpha_i\\) and the attention output \\(\\sum\\alpha_i v_i\\).',
     ans:[{q:'α₁',v:0.66524,u:'1',tp:1},{q:'α₂',v:0.24473,u:'1',tp:1},{q:'α₃',v:0.09003,u:'1',tp:1},{q:'output',v:1.8496,u:'1',tp:1}],
     hints:['\\(\\alpha_i=e^{s_i}/(e^2+e^1+e^0)\\). \\(e^0=1\\).','The output is a convex combination of 1, 3 and 5, so it must lie between 1 and 5.']},
    {id:'q4.3',diff:'hard',text:'Scaled dot-product attention in \\(d=2\\). Query \\(q=(1,\\,0)\\). Keys \\(k_1=(1,\\,0)\\), \\(k_2=(0,\\,1)\\), \\(k_3=(1,\\,1)\\). Values \\(v=(1,\\,2,\\,4)\\). Compute the three scores \\(s_i=(q\\cdot k_i)/\\sqrt{d}\\), the three softmax weights, and the attention output.',
     ans:[{q:'s₁',v:0.70711,u:'1',tp:1},{q:'s₂',v:0,u:'1',ta:0.005},{q:'s₃',v:0.70711,u:'1',tp:1},{q:'α₁',v:0.40111,u:'1',tp:1},{q:'α₂',v:0.19778,u:'1',tp:1},{q:'α₃',v:0.40111,u:'1',tp:1},{q:'output',v:2.4011,u:'1',tp:1}],
     hints:['\\(\\sqrt{d}=\\sqrt{2}\\approx 1.41421\\). The unscaled dots are 1, 0, 1.','By symmetry \\(\\alpha_1=\\alpha_3\\), which is a useful check on the softmax.']}]
};
function buildQuiz(c){
  const box=$('#quiz'+c); box.innerHTML='';
  Q[c].forEach(q=>{
    const d=document.createElement('div'); d.className='q'; d.id='Q'+q.id.replace('.','_');
    const inpAttrs='type="text" inputmode="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
    d.innerHTML=`<div><b>${q.id}</b><span class="tag">${q.diff}</span></div><p>${q.text}</p>
      <div class="inrow">${q.ans.map((a,i)=>`<label>${a.q}<br><input data-i="${i}" ${inpAttrs} placeholder="${a.u==='count'?'number':(a.u==='1'?'number (unit 1 optional)':'value '+a.u)}"></label>`).join('')}</div>
      <div class="q-actions">
        <button type="button" class="btn" data-act="check">Check</button>
        <button type="button" class="btn ghost" data-act="hint">Hint</button>
        <button type="button" class="btn ghost" data-act="skip">Skip</button>
        <button type="button" class="btn ghost" data-act="sol">Show solution</button>
      </div>
      <div class="fb"></div><div class="hints"></div>`;
    let hintN=0, tries=0;
    const chk=d.querySelector('[data-act="check"]'), hb=d.querySelector('[data-act="hint"]');
    const skip=d.querySelector('[data-act="skip"]'), sol=d.querySelector('[data-act="sol"]');
    const fb=d.querySelector('.fb');
    if(store.score[c][q.id]!==undefined){ d.classList.add('correct'); fb.className='fb ok'; fb.textContent='✓ Solved earlier (saved on this device).'; }
    function blurQuiz(){ const a=document.activeElement; if(a && a.blur) a.blur(); }
    hb.addEventListener('click',()=>{ if(hintN<q.hints.length){ const h=document.createElement('div'); h.className='hint'; h.innerHTML='💡 '+q.hints[hintN++]; d.querySelector('.hints').appendChild(h); renderMath(h); } else say('No more hints for this problem. Tell me your first step and I\'ll check it.'); });
    sol.addEventListener('click',()=>{
      const lines=q.ans.map(function(a){ return a.q+': '+formatAns(a); }).join('; ');
      fb.className='fb';
      fb.textContent='Solution: '+lines+'  You can keep trying or skip — you are not locked here.';
    });
    skip.addEventListener('click',()=>{
      blurQuiz();
      fb.className='fb';
      fb.textContent='Skipped. Scroll on, or open another concept — a correct check is not required to move on.';
      const next=d.nextElementSibling;
      if(next && next.scrollIntoView) next.scrollIntoView({block:'start', behavior:'smooth'});
    });
    chk.addEventListener('click',()=>{
      tries++; let all=true; const msgs=[];
      q.ans.forEach((a,i)=>{ const inp=d.querySelector('input[data-i="'+i+'"]'), g=gradeAns(a,inp.value);
        if(g.err){ all=false; msgs.push(a.q+': '+g.err); inp.style.borderColor='var(--bad)'; return; }
        inp.style.borderColor=g.ok?'var(--ok)':'var(--bad)'; if(!g.ok){ all=false; msgs.push(a.q+" isn't right yet."); } });
      d.classList.toggle('correct',all); d.classList.toggle('wrong',!all); fb.className='fb '+(all?'ok':'no');
      fb.innerHTML = all ? '✓ Correct'+(tries>1?' (after '+tries+' tries; first-try answers count more toward mastery)':'')+'.' : msgs.join(' ')+' Try again, take a hint, skip, or show the solution — you can always move on.';
      if(all) blurQuiz();
      if(all && store.score[c][q.id]===undefined){ const before=mastery(c); store.score[c][q.id]=tries===1?1:(tries===2?0.75:0.5); save(); drawList();
        say(tries===1?'Nice work on the first try. Can you explain why the reasoning holds?':'Good recovery. We will revisit this idea in spaced review.');
        if(before<80 && mastery(c)>=80) say(c<4?'Concept '+c+' mastered (80% or better). Concept '+(c+1)+' is unlocked. Go on when you are ready.':'You have finished the playable part of Unit 1. Keep going with the tutor prompt in Grok, or start Unit 2 when it lands.'); }
      if(!all && tries===2) say('On this problem: write out your first step (the formula, with numbers plugged in) and I\'ll help you find the slip. You can also skip or show the solution.');
    });
    d.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.keyCode===13){ e.preventDefault(); chk.click(); } });
      inp.addEventListener('focus',function(){
        requestAnimationFrame(function(){ try{ inp.scrollIntoView({block:'center', behavior:'smooth'}); }catch(err){ inp.scrollIntoView(true);} });
      });
    });
    box.appendChild(d);
  });
  renderMath(box);
}

$('#reset').addEventListener('click',e=>{ e.preventDefault(); if(confirm('Reset saved AI 101 progress on this device?')){ localStorage.removeItem(KEY); location.reload(); } });

/* ---------- scripted tutor ---------- */
function reply(t){ t=t.toLowerCase();
  if(/answer|solution|just tell|give me/.test(t)) return 'I won\'t hand over the answer, because you\'d lose the learning. Tell me your first step (the formula, with the numbers plugged in) and I\'ll check it.';
  if(/hint|stuck|help/.test(t)) return 'Start from the definition. For expected utility, write \\(\\mathrm{EU}=\\sum P\\,U\\). For MSE, write each residual. For a gradient step, write \\(\\theta\\leftarrow\\theta-\\eta\\nabla J\\). Which problem are you on?';
  if(/slow|fast|pace|break/.test(t)) return 'You set the pace. Progress is saved on this device, so come back any time. In the full tutor, say "slower" or "faster".';
  if(/unit|percent|%/.test(t)) return 'Dimensionless quantities (utilities, probabilities, losses, weights) can be a bare number or unit 1. Percents need the % sign. Counts can be a bare integer. Missing required units count as wrong.';
  if(/grok|real tutor|ai tutor/.test(t)) return 'Tap “Copy tutor prompt for Grok” below, paste it into Grok, and say “start”. That tutor runs this whole unit.';
  if(/learning rate|diverg|oscillat/.test(t)) return 'For \\(J(w)=(w-3)^2\\), the update is a linear map with multiplier \\((1-2\\eta)\\). When is the absolute value of that multiplier strictly less than 1?';
  if(/softmax|attention/.test(t)) return 'Write \\(\\alpha_i=e^{s_i}/\\sum_j e^{s_j}\\) first, and check that the \\(\\alpha_i\\) sum to 1. Then the output is just the weighted sum of the values.';
  return 'Good question. In this demo my replies are scripted. For a real conversation, copy the tutor prompt into Grok. Meanwhile, what have you tried so far?'; }
$('#csend').onclick=()=>{ const v=$('#cin').value.trim(); if(!v) return; say(v.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;'),'s'); $('#cin').value=''; setTimeout(()=>say(reply(v)),250); };
$('#cin').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#csend').click(); });

/* ---------- boot ---------- */
function boot(){
  [1,2,3,4].forEach(buildQuiz);
  go(unlocked(store.current)?store.current:1);
  renderMath(document.body);
  drawTree(); drawReg(); drawGD(); drawNeu(); drawAttn();
  if(!$('#chat').children.length) say(Object.keys(store.score[1]).length ? 'Welcome back! Your AI 101 progress is restored. Pick up where you left off.' : 'Hi! Unit 1 starts with <b>what AI is</b> — agents, expected utility, a first look at search and Bayes — then the math that later units rest on. Try the sliders, then the quiz. I give hints, not answers.');
}
if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);

try{ window.GrokeversityQuiz={parseQty:parseQty,gradeAns:gradeAns,Q:Q,formatAns:formatAns,tidyText:tidyText}; }catch(e){}
})();
