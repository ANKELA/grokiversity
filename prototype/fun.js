/* Grokeversity: lightweight quiz rewards (XP, streaks, confetti). No CDN, no sound by default. */
(function(){
'use strict';
const KEY='grokeversity.fun.v1';
const $=function(s,r){ return (r||document).querySelector(s); };
function load(){
  try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; }
}
function save(st){
  try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){}
}
function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function ymdAdd(iso, days){
  const p=iso.split('-').map(Number);
  const d=new Date(p[0], p[1]-1, p[2]+days);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function defaultState(){
  return {xp:0, streak:0, bestStreak:0, daily:{date:'', days:0}, badges:[], cards:[], fx:null, sound:false, correct:0, crits:0};
}
let st=Object.assign(defaultState(), load());
st.badges=st.badges||[]; st.cards=st.cards||[]; st.daily=st.daily||{date:'',days:0};

function reduced(){
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; }
}
function fxOn(){
  if(st.fx===true) return true;
  if(st.fx===false) return false;
  return !reduced();
}

const BADGES={
  first:'First correct',
  streak3:'Warm-up · 3 streak',
  streak5:'On a roll · 5 streak',
  streak10:'Unstoppable · 10 streak',
  daily3:'Three-day habit',
  daily7:'Week of practice',
  crit:'Critical hit',
  lvl5:'Level 5',
  lvl10:'Level 10',
  mastered:'Concept mastered',
  collector:'Card collector'
};
const CARDS=[
  {id:'varignon', rare:false, title:'Varignon’s theorem', body:'The moment of a force equals the sum of the moments of its components. That is why breaking a force into x and y often makes the moment arithmetic easier.'},
  {id:'twoforce', rare:false, title:'Two-force members', body:'If a straight body is pinned at both ends and has no load between the pins, its force must run along the line of the pins. Moments about one pin force that conclusion.'},
  {id:'newton3', rare:false, title:'Action and reaction', body:'A pin pushes on a beam; the beam pushes back on the pin with an equal and opposite force. Free-body diagrams keep only the forces on the body you isolated.'},
  {id:'signdeg', rare:false, title:'Angles and quadrants', body:'atan2(y, x) keeps the sign of both components, so the angle lands in the right quadrant. A plain arctan of y/x does not.'},
  {id:'kn', rare:false, title:'Newtons and kilonewtons', body:'1 kN = 1000 N. A 10 kN beam load is about the weight of a small car. You can enter either unit; the grader converts.'},
  {id:'momentarm', rare:false, title:'The perpendicular arm', body:'M = F d only if d is perpendicular to the line of action. Otherwise use M = F d sinθ, or take components first.'},
  {id:'support', rare:false, title:'What a support prevents', body:'Each motion a support prevents costs one unknown reaction. A 2-D roller prevents one translation; a pin prevents two; a fixed support also prevents rotation.'},
  {id:'eu', rare:false, title:'Expected utility', body:'A rational agent ranks actions by EU = Σ P(s|a) U(s). The safe-looking sure thing can lose to a risky action with a higher average.'},
  {id:'bayes', rare:false, title:'Base rates matter', body:'A sensitive test for a rare disease still produces many false positives. Always compute P(+) first; the posterior is rarely the sensitivity itself.'},
  {id:'mse', rare:false, title:'Mean squared error', body:'This course uses MSE = (1/n) Σ (y − ŷ)², not 1/(2n). The 1/2 is a calculus convenience that would change the numerical answer.'},
  {id:'softmax', rare:false, title:'Softmax is a contrast', body:'Softmax weights depend on differences between scores, not on adding the same constant to every score. That is why it is invariant to a uniform shift.'},
  {id:'scale', rare:false, title:'Scaled dots', body:'Dividing by √d keeps dot-product scores from growing with dimension, which would otherwise sharpen softmax into a one-hot spike.'},
  {id:'gcrit', rare:true, title:'Critical learning rate', body:'For J(w)=(w−3)² the gradient is 2(w−3). The update overshoots and diverges once η > 1. That threshold is a property of the curvature, not a guess.'},
  {id:'zero-force', rare:true, title:'Zero-force members', body:'At a joint with two collinear members and a third going off at an angle, with no external load, the third member is often a zero-force member. Spotting it shrinks the algebra.'},
  {id:'transmissibility', rare:true, title:'Transmissibility', body:'You may slide a force along its line of action without changing the external equilibrium of a rigid body. The internal stresses do change — so this is an external-effect trick only.'}
];

function levelOf(xp){ return 1+Math.floor((xp||0)/80); }
function levelXp(lv){ return (lv-1)*80; }

function awardBadge(id){
  if(st.badges.indexOf(id)>=0) return null;
  st.badges.push(id);
  return {id:id, title:BADGES[id]||id};
}
function pickCard(){
  const have={};
  st.cards.forEach(function(c){ have[c.id]=true; });
  const rare=Math.random()<0.25;
  let pool=CARDS.filter(function(c){ return !have[c.id] && !!c.rare===rare; });
  if(!pool.length) pool=CARDS.filter(function(c){ return !have[c.id]; });
  if(!pool.length) return null;
  const card=pool[Math.floor(Math.random()*pool.length)];
  st.cards.push({id:card.id, at:Date.now()});
  if(st.cards.length>=8) awardBadge('collector');
  return card;
}
function tickDaily(){
  const t=today();
  if(st.daily.date===t) return {inc:false, days:st.daily.days||0};
  if(st.daily.date && ymdAdd(st.daily.date,1)===t) st.daily.days=(st.daily.days||0)+1;
  else st.daily.days=1;
  st.daily.date=t;
  let badge=null;
  if(st.daily.days===3) badge=awardBadge('daily3');
  if(st.daily.days===7) badge=awardBadge('daily7');
  return {inc:true, days:st.daily.days, badge:badge};
}

function toast(html, ms){
  let el=$('#funToast');
  if(!el){
    el=document.createElement('div');
    el.id='funToast';
    el.className='fun-toast';
    el.setAttribute('role','status');
    document.body.appendChild(el);
  }
  el.innerHTML=html;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(function(){ el.classList.remove('show'); }, ms||2600);
}

function chirp(){
  if(!st.sound) return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type='sine'; o.frequency.value=660;
    g.gain.value=0.04;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.12);
    o.stop(ctx.currentTime+0.13);
    setTimeout(function(){ ctx.close(); }, 200);
  }catch(e){}
}

function burst(big){
  if(!fxOn()) return;
  const prev=$('.fun-confetti');
  if(prev) prev.remove();
  const cv=document.createElement('canvas');
  cv.className='fun-confetti';
  cv.setAttribute('aria-hidden','true');
  document.body.appendChild(cv);
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  function size(){
    cv.width=Math.floor(window.innerWidth*dpr);
    cv.height=Math.floor(window.innerHeight*dpr);
    cv.style.width='100%'; cv.style.height='100%';
  }
  size();
  const ctx=cv.getContext('2d');
  const colors=['#ff8a65','#4dd0e1','#ffd54f','#7c9cff','#81c784','#f48fb1','#e8eaf6'];
  const n=big?130:56;
  const parts=[];
  const cx=window.innerWidth/2, cy=window.innerHeight*0.38;
  for(let i=0;i<n;i++){
    const ang=-Math.PI/2+(Math.random()-0.5)*Math.PI, sp=3+Math.random()*(big?11:7);
    parts.push({
      x:cx+(Math.random()-0.5)*80, y:cy+(Math.random()-0.5)*30,
      vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-2,
      w:5+Math.random()*6, h:7+Math.random()*8,
      rot:Math.random()*6, vr:(Math.random()-0.5)*0.2,
      color:colors[i%colors.length], shape:Math.random()<0.45?'c':'r',
      life:1
    });
  }
  const t0=performance.now();
  const dur=big?1700:1300;
  function frame(now){
    const t=now-t0;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    const fade=t>dur-400?Math.max(0,1-(t-(dur-400))/400):1;
    for(let i=0;i<parts.length;i++){
      const p=parts[i];
      p.vy+=0.14; p.vx*=0.995;
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      ctx.globalAlpha=0.9*fade;
      ctx.fillStyle=p.color;
      ctx.save();
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      if(p.shape==='c'){ ctx.beginPath(); ctx.arc(0,0,p.w*0.45,0,Math.PI*2); ctx.fill(); }
      else { ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); }
      ctx.restore();
    }
    ctx.globalAlpha=1;
    if(t<dur) requestAnimationFrame(frame);
    else cv.remove();
  }
  requestAnimationFrame(frame);
}

function renderBar(){
  const bar=$('#funBar'); if(!bar) return;
  const lv=levelOf(st.xp);
  const into=st.xp-levelXp(lv), span=80;
  const pct=Math.max(0,Math.min(100, 100*into/span));
  const days=st.daily.days||0;
  bar.innerHTML=
    '<div class="fun-level" title="Level">Lv '+lv+'</div>'+
    '<div class="fun-meter" title="'+st.xp+' XP"><i style="width:'+pct+'%"></i></div>'+
    '<div class="fun-xp">'+st.xp+' XP</div>'+
    '<div class="fun-streak" title="Answer streak">🔥 '+st.streak+'</div>'+
    (days?'<div class="fun-daily" title="Daily streak">📅 '+days+'d</div>':'')+
    '<button type="button" class="fun-gear" id="funGear" aria-expanded="false" title="Rewards and effects">✦</button>'+
    '<div class="fun-pop" id="funPop" hidden></div>';
  const gear=$('#funGear'), pop=$('#funPop');
  gear.addEventListener('click', function(e){
    e.stopPropagation();
    const on=pop.hasAttribute('hidden');
    if(on){ fillPop(pop); pop.removeAttribute('hidden'); gear.setAttribute('aria-expanded','true'); }
    else { pop.setAttribute('hidden',''); gear.setAttribute('aria-expanded','false'); }
  });
}
function fillPop(pop){
  const fx=fxOn();
  const badges=st.badges.map(function(id){ return '<li>'+escapeHtml(BADGES[id]||id)+'</li>'; }).join('')||'<li class="mute">None yet — answer a problem.</li>';
  const cards=st.cards.map(function(c){
    const src=CARDS.filter(function(x){ return x.id===c.id; })[0];
    if(!src) return '';
    return '<article class="fun-card'+(src.rare?' rare':'')+'"><h5>'+escapeHtml(src.title)+'</h5><p>'+escapeHtml(src.body)+'</p></article>';
  }).join('')||'<p class="mute">Correct answers sometimes drop a trivia card.</p>';
  pop.innerHTML=
    '<label class="fun-tog"><input type="checkbox" id="funFx"'+(fx?' checked':'')+'> Motion effects</label>'+
    '<label class="fun-tog"><input type="checkbox" id="funSound"'+(st.sound?' checked':'')+'> Sound <span class="mute">(off unless you turn it on)</span></label>'+
    '<p class="mute">Effects stay off when your device asks for reduced motion, unless you turn them on here. Nothing flashes or blocks the quiz.</p>'+
    '<h4>Badges</h4><ul class="fun-badges">'+badges+'</ul>'+
    '<h4>Trivia cards</h4><div class="fun-cards">'+cards+'</div>';
  $('#funFx',pop).addEventListener('change', function(){ st.fx=this.checked; save(st); });
  $('#funSound',pop).addEventListener('change', function(){ st.sound=this.checked; save(st); });
}
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]); });
}

function inject(){
  if($('#funBar')) return;
  const bar=document.createElement('div');
  bar.id='funBar'; bar.className='fun-bar';
  bar.setAttribute('aria-label','XP and streaks');
  const host=$('.lesson-top')||$('header.top')||$('.player')||document.body;
  if(host && host.classList && host.classList.contains('lesson-top')){
    host.insertAdjacentElement('afterend', bar);
  } else if($('.player')){
    $('.player').insertAdjacentElement('beforebegin', bar);
    bar.classList.add('fun-bar-page');
  } else {
    host.appendChild(bar);
  }
  document.addEventListener('click', function(e){
    const pop=$('#funPop'); if(!pop||pop.hasAttribute('hidden')) return;
    if(e.target && (e.target.closest('#funPop')||e.target.closest('#funGear'))) return;
    pop.setAttribute('hidden','');
    const g=$('#funGear'); if(g) g.setAttribute('aria-expanded','false');
  });
  renderBar();
}

function report(kind, info){
  info=info||{};
  const notes=[];
  let gained=0, big=false, card=null, badge=null, mult=1;
  if(kind==='wrong'){
    st.streak=0;
    save(st); renderBar();
    return;
  }
  if(kind==='correct' || kind==='mastery'){
    const daily=tickDaily();
    if(daily.inc && daily.days>1) notes.push('Daily streak: '+daily.days+' days');
    if(daily.badge) notes.push('Badge: '+daily.badge.title);
    if(info.first){
      st.correct=(st.correct||0)+1;
      if(st.correct===1) badge=awardBadge('first')||badge;
      st.streak=(st.streak||0)+1;
      if(st.streak>st.bestStreak) st.bestStreak=st.streak;
      let xp=info.tries===1?20:10;
      if(st.streak===3){ xp+=10; badge=awardBadge('streak3')||badge; notes.push('3-answer streak!'); }
      else if(st.streak===5){ xp+=15; badge=awardBadge('streak5')||badge; notes.push('5-answer streak!'); }
      else if(st.streak===10){ xp+=25; badge=awardBadge('streak10')||badge; notes.push('10-answer streak!'); }
      else if(st.streak>0 && st.streak%5===0){ xp+=15; notes.push(st.streak+'-answer streak!'); }
      const roll=Math.random();
      let mult=1, rollMsg=null;
      if(roll<0.03){ mult=3; rollMsg='Critical hit! ×3 XP'; st.crits=(st.crits||0)+1; badge=awardBadge('crit')||badge; }
      else if(roll<0.13){ mult=2; rollMsg='Lucky break — double XP'; }
      gained=xp*mult;
      if(rollMsg) notes.unshift(rollMsg);
      if(Math.random()<(mult>=3?0.8:0.18)){ card=pickCard(); }
    } else {
      st.streak=(st.streak||0); // re-solving does not break or extend
    }
    if(info.mastered){
      gained+=50;
      big=true;
      badge=awardBadge('mastered')||badge;
      notes.push('Concept mastered · +50 XP');
    }
    const prevLv=levelOf(st.xp);
    st.xp=(st.xp||0)+gained;
    const lv=levelOf(st.xp);
    if(lv>=5) awardBadge('lvl5');
    if(lv>=10) awardBadge('lvl10');
    if(lv>prevLv) notes.push('Level up! You reached level '+lv);
    save(st); renderBar();
    if(info.first || info.mastered){
      burst(big||mult>=3);
      chirp();
      const bits=[];
      if(gained) bits.push('+'+gained+' XP');
      if(st.streak>1 && info.first) bits.push('streak '+st.streak);
      notes.forEach(function(n){ bits.push(n); });
      if(card) bits.push('New card: '+card.title);
      if(badge) bits.push('Badge: '+badge.title);
      if(bits.length) toast(bits.map(escapeHtml).join(' · '), card?4200:2800);
    } else if(kind==='correct'){
      burst(false);
    }
  }
}

function boot(){
  if(!document.getElementById('lessonApp') && !document.getElementById('quiz1')) return;
  tickDaily(); save(st);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
}
boot();
try{
  window.GrokeFun={report:report, burst:burst, state:function(){ return st; }, save:function(){ save(st); }, render:renderBar, fxOn:fxOn};
}catch(e){}
})();
