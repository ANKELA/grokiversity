/* Grokiversity: local rewards — XP, daily streak, collection, daily challenge, speed round.
   No backend, no accounts, no push notifications. Motion follows the effects toggle and prefers-reduced-motion. */
(function(){
'use strict';
const KEY='grokiversity.fun.v1';
const SITE='https://ankela.github.io/grokiversity/';
const $=function(s,r){ return (r||document).querySelector(s); };
const $$=function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

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
function load(){
  try{ const s=readStore(KEY); return (s && typeof s==='object') ? s : {}; }catch(e){ return {}; }
}
function save(st_){
  try{ localStorage.setItem(KEY, JSON.stringify(st_)); }catch(e){}
}
function today(){
  if(window.GrokeFun && typeof window.GrokeFun._today==='string' && window.GrokeFun._today) return window.GrokeFun._today;
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function ymdAdd(iso, days){
  const p=String(iso||'').split('-').map(Number);
  const d=new Date(p[0], p[1]-1, p[2]+days);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function daysBetween(a,b){
  const pa=String(a).split('-').map(Number), pb=String(b).split('-').map(Number);
  const da=new Date(pa[0],pa[1]-1,pa[2]), db=new Date(pb[0],pb[1]-1,pb[2]);
  return Math.round((db-da)/86400000);
}
function fnv(s){
  let h=2166136261;
  s=String(s);
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function defaultState(){
  return {
    xp:0, streak:0, bestStreak:0,
    daily:{date:'', days:0},
    dailyGoal:5,
    dailyCorrect:{date:'', count:0},
    dayStreak:{last:'', days:0, freezes:0, best:0, earnedAt:0},
    badges:[], cards:[], fx:null, sound:false, correct:0, crits:0,
    dailyChal:{date:'', key:'', ok:null, tries:0},
    speedBest:0, speedBestAt:''
  };
}
function migrateState(raw){
  const st=Object.assign(defaultState(), raw||{});
  st.badges=st.badges||[]; st.cards=st.cards||[];
  st.daily=st.daily||{date:'',days:0};
  st.dailyCorrect=st.dailyCorrect||{date:'',count:0};
  st.dayStreak=st.dayStreak||{last:'',days:0,freezes:0,best:0,earnedAt:0};
  st.dailyChal=st.dailyChal||{date:'',key:'',ok:null,tries:0};
  if(!st.dailyGoal || [3,5,10].indexOf(+st.dailyGoal)<0) st.dailyGoal=5;
  // Carry a recent visit-based streak forward once, then daily streak is correct-only.
  if(!st.dayStreak.last && st.daily && st.daily.date && st.daily.days>0){
    const t=today();
    if(st.daily.date===t || st.daily.date===ymdAdd(t,-1)){
      st.dayStreak.last=st.daily.date;
      st.dayStreak.days=st.daily.days;
      st.dayStreak.best=Math.max(st.dayStreak.best||0, st.daily.days);
      st.dayStreak.earnedAt=Math.floor(st.daily.days/7);
    }
  }
  return st;
}
let st=migrateState(load());

function reduced(){
  try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; }
}
function fxOn(){
  if(st.fx===true) return true;
  if(st.fx===false) return false;
  return !reduced();
}
function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]); });
}

function courseKind(){
  const p=location.pathname||'';
  if(/\/econ\//.test(p)) return 'e';
  if(/intro-ai/.test(p)) return 'a';
  if(/\/statics\//.test(p)) return 's';
  if(document.documentElement.classList.contains('home') || document.body.classList.contains('home')) return 'g';
  if(document.querySelector('html.lesson-page')) return 's';
  return 'g';
}
function ranksFor(kind){
  if(kind==='e') return [
    {name:'Student', min:1}, {name:'Analyst', min:5},
    {name:'Economist', min:11}, {name:'Chief Economist', min:17}
  ];
  if(kind==='s') return [
    {name:'Apprentice', min:1}, {name:'Technician', min:4}, {name:'Engineer', min:8},
    {name:'Senior Engineer', min:13}, {name:'Chief Engineer', min:19}
  ];
  return [
    {name:'Learner', min:1}, {name:'Practitioner', min:4}, {name:'Specialist', min:8},
    {name:'Scholar', min:13}, {name:'Master', min:19}
  ];
}
function levelOf(xp){ return 1+Math.floor((xp||0)/80); }
function levelXp(lv){ return (lv-1)*80; }
function rankOf(xp, kind){
  const lv=levelOf(xp);
  const ranks=ranksFor(kind||courseKind());
  let r=ranks[0];
  for(let i=0;i<ranks.length;i++) if(lv>=ranks[i].min) r=ranks[i];
  return {level:lv, name:r.name, min:r.min};
}

function storeKeyFor(course){
  if(course==='e') return 'grokiversity.econ101.v1';
  if(course==='a') return 'grokiversity.ai101.v1';
  return 'grokiversity.v1';
}
function courseStore(course){ return readStore(storeKeyFor(course))||{}; }
function quizCount(course, c){
  const api=window.GrokeQuizRand;
  let n=0;
  if(api && api.gens){
    Object.keys(api.gens).forEach(function(k){ if(k.indexOf(course+':q'+c+'.')===0) n++; });
  }
  if(api && api.fixed){
    Object.keys(api.fixed).forEach(function(k){ if(k.indexOf(course+':q'+c+'.')===0) n++; });
  }
  return n||4;
}
function masteryOf(store, course, c){
  const v=Object.values((store.score||{})[String(c)]||{});
  if(!v.length) return 0;
  const n=quizCount(course, c);
  return Math.round(100*v.reduce(function(a,b){ return a+b; },0)/n);
}
function maxConcept(course){ return course==='s'?5:4; }
function unlockedList(){
  const out=[];
  ['s','e','a'].forEach(function(course){
    const store=courseStore(course);
    const has=store && store.score && Object.keys(store.score).length;
    const onThis=(courseKind()===course);
    if(!has && !onThis) return;
    const maxC=maxConcept(course);
    for(let c=1;c<=maxC;c++){
      const prev=c===1?100:masteryOf(store, course, c-1);
      if(c>1 && prev<80) break;
      out.push({course:course, concept:c, mastered:masteryOf(store, course, c)>=80});
    }
    if(!out.filter(function(x){ return x.course===course; }).length && onThis){
      out.push({course:course, concept:1, mastered:false});
    }
  });
  if(!out.length) out.push({course:'s', concept:1, mastered:false});
  return out;
}
function numericItems(filter){
  const api=window.GrokeQuizRand;
  if(!api || !api.gens) return [];
  const fixed=api.fixed||{};
  const want=filter||{};
  const items=[];
  unlockedList().forEach(function(u){
    if(want.masteredOnly && !u.mastered) return;
    if(want.course && want.course!==u.course) return;
    if(want.concept && want.concept!==u.concept) return;
    Object.keys(api.gens).forEach(function(k){
      if(fixed[k]) return;
      if(k.indexOf(u.course+':q'+u.concept+'.')!==0) return;
      items.push({key:k, course:u.course, concept:u.concept, qid:k.split(':')[1]});
    });
  });
  return items;
}

function reconcileStreak(){
  const t=today();
  const ds=st.dayStreak;
  if(!ds.last) return {used:0, reset:false};
  if(ds.last===t || ds.last===ymdAdd(t,-1)) return {used:0, reset:false};
  let gap=daysBetween(ds.last, t)-1; // missed calendar days between last qualifying day and today
  if(gap<=0) return {used:0, reset:false};
  let used=0;
  while(gap>0 && (ds.freezes||0)>0){
    ds.freezes--;
    used++;
    gap--;
    ds.last=ymdAdd(ds.last, 1);
  }
  if(gap>0){
    ds.days=0;
    ds.last='';
    return {used:used, reset:true};
  }
  return {used:used, reset:false};
}
function todayCount(){
  const t=today();
  if(!st.dailyCorrect || st.dailyCorrect.date!==t) return 0;
  return st.dailyCorrect.count||0;
}
function noteCorrectToday(){
  reconcileStreak();
  const t=today();
  if(!st.dailyCorrect || st.dailyCorrect.date!==t) st.dailyCorrect={date:t, count:0};
  st.dailyCorrect.count=(st.dailyCorrect.count||0)+1;
  const ds=st.dayStreak;
  if(ds.last!==t){
    if(!ds.last) ds.days=1;
    else if(ds.last===ymdAdd(t,-1)) ds.days=(ds.days||0)+1;
    else ds.days=1;
    ds.last=t;
    if(ds.days>(ds.best||0)) ds.best=ds.days;
    const milestones=Math.floor(ds.days/7);
    if(milestones>(ds.earnedAt||0)){
      ds.freezes=(ds.freezes||0)+(milestones-ds.earnedAt);
      ds.earnedAt=milestones;
    }
  }
  // Keep the legacy field in sync so older UI/tests can still read it.
  st.daily={date:ds.last, days:ds.days};
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
  collector:'Card collector',
  goal:'Daily goal',
  challenge:'Daily challenge',
  speed:'Speed round'
};
const CARDS=[
  {id:'varignon', rarity:'common', title:"Varignon’s theorem", body:'The moment of a force equals the sum of the moments of its components. Breaking a force into x and y often makes the moment arithmetic easier.'},
  {id:'twoforce', rarity:'common', title:'Two-force members', body:'If a straight body is pinned at both ends and has no load between the pins, its force must run along the line of the pins.'},
  {id:'newton3', rarity:'common', title:'Action and reaction', body:'A pin pushes on a beam; the beam pushes back on the pin with an equal and opposite force. Keep only the forces on the body you isolated.'},
  {id:'signdeg', rarity:'common', title:'Angles and quadrants', body:'atan2(y, x) keeps the sign of both components, so the angle lands in the right quadrant. A plain arctan of y/x does not.'},
  {id:'kn', rarity:'common', title:'Newtons and kilonewtons', body:'1 kN = 1000 N. A 10 kN beam load is about the weight of a small car. You can enter either unit; the grader converts.'},
  {id:'momentarm', rarity:'common', title:'The perpendicular arm', body:'M = F d only if d is perpendicular to the line of action. Otherwise use M = F d sinθ, or take components first.'},
  {id:'support', rarity:'common', title:'What a support prevents', body:'Each motion a support prevents costs one unknown reaction. A 2-D roller prevents one translation; a pin prevents two.'},
  {id:'eu', rarity:'common', title:'Expected utility', body:'A rational agent ranks actions by EU = Σ P(s|a) U(s). The safe-looking sure thing can lose to a risky action with a higher average.'},
  {id:'bayes', rarity:'common', title:'Base rates matter', body:'A sensitive test for a rare disease still produces many false positives. Always compute P(+) first.'},
  {id:'mse', rarity:'common', title:'Mean squared error', body:'This course uses MSE = (1/n) Σ (y − ŷ)², not 1/(2n). The 1/2 is a calculus convenience that would change the numerical answer.'},
  {id:'softmax', rarity:'common', title:'Softmax is a contrast', body:'Softmax weights depend on differences between scores, not on adding the same constant to every score.'},
  {id:'scale', rarity:'common', title:'Scaled dots', body:'Dividing by √d keeps dot-product scores from growing with dimension, which would otherwise sharpen softmax into a one-hot spike.'},
  {id:'oc', rarity:'common', title:'Opportunity cost', body:'The opportunity cost of a choice is the value of the best alternative you give up, including implicit costs like your time.'},
  {id:'ppf', rarity:'common', title:'On the frontier', body:'A point inside the PPF is inefficient, a point on it is efficient, and a point outside is unattainable with current resources.'},
  {id:'compadv', rarity:'common', title:'Comparative advantage', body:'A producer has comparative advantage in the good with the lower opportunity cost. That, not who is faster at both, decides the gains from trade.'},
  {id:'sd', rarity:'common', title:'Shortage and surplus', body:'If the price is below equilibrium, quantity demanded exceeds quantity supplied — a shortage. Above it, you get a surplus.'},
  {id:'units', rarity:'common', title:'Units travel with the number', body:'A force of 500 is unfinished. 500 N and 0.5 kN are the same quantity; the grader accepts both when the unit is right.'},
  {id:'fbd', rarity:'common', title:'Draw the body first', body:'A free-body diagram starts with the isolated body, then every force that touches it. Missing a support reaction is the usual error.'},
  {id:'sumf', rarity:'common', title:'Equilibrium is a vector statement', body:'ΣF = 0 and ΣM = 0 are component equations. In 2-D you get three scalars; in 3-D you get six.'},
  {id:'agent', rarity:'common', title:'Agents, not magic', body:'In this course an agent receives percepts and takes actions to do well on a performance measure. That is a different question from imitating a human.'},
  {id:'ols', rarity:'common', title:'Ordinary least squares', body:'The OLS line minimizes mean squared error. For a simple line, a closed-form slope and intercept exist — you do not have to guess.'},
  {id:'gdstep', rarity:'common', title:'A gradient-descent step', body:'w ← w − η ∇J. If the step is too large the loss can rise. If it is tiny, you crawl. The sign of the change in J tells you which happened.'},
  {id:'neuron', rarity:'common', title:'A first neuron', body:'A neuron takes a weighted sum, adds a bias, and applies an activation. The numbers you compute by hand are the same ones a network uses.'},
  {id:'attn', rarity:'common', title:'Attention is a weighted sum', body:'Softmax attention turns scores into weights that sum to 1, then returns a weighted sum of value vectors. Nothing in that step is a mystery.'},
  {id:'gcrit', rarity:'rare', title:'Critical learning rate', body:'For J(w)=(w−3)² the gradient is 2(w−3). The update overshoots and diverges once η > 1. That threshold is a property of the curvature.'},
  {id:'zero-force', rarity:'rare', title:'Zero-force members', body:'At a joint with two collinear members and a third going off at an angle, with no external load, the third member is often a zero-force member.'},
  {id:'transmissibility', rarity:'rare', title:'Transmissibility', body:'You may slide a force along its line of action without changing the external equilibrium of a rigid body. Internal stresses do change.'},
  {id:'varignon2', rarity:'rare', title:'Moments add', body:'Once you believe Varignon, a messy angled force is just two easy moments. The algebra shrinks; the answer does not change.'},
  {id:'trade', rarity:'rare', title:'Both can gain', body:'Two people can both be better off after trade even when one is better at everything. Comparative advantage is the reason.'},
  {id:'implicit', rarity:'rare', title:'Implicit costs count', body:'Leaving a paid job to run a shop has a cost even if no bill arrives. Opportunity cost includes what you no longer earn.'},
  {id:'ceq', rarity:'rare', title:'An unused equation is a check', body:'After you solve a beam with ΣF_y and ΣM_A, ΣM_B should come out to about zero. If it does not, an earlier number is wrong.'},
  {id:'bayes2', rarity:'rare', title:'Write the denominator', body:'P(A|B) = P(B|A)P(A) / P(B). Skipping P(B) is how a 99% test becomes a misleading headline.'},
  {id:'mse2', rarity:'rare', title:'Outliers pull hard', body:'Because errors are squared, one far-off point can dominate MSE and tilt a fitted line. That is a feature of the loss, not a bug in the data entry.'},
  {id:'couple', rarity:'rare', title:'A couple is free to slide', body:'A pair of equal, opposite, non-collinear forces is a couple. Its moment is the same about every point in the plane.'},
  {id:'legend-varignon', rarity:'legendary', title:'The moment of a system', body:'Any planar force system reduces to a single resultant force and a couple about a chosen point. That is why one ΣF and one ΣM can close a 2-D problem.'},
  {id:'legend-trade', rarity:'legendary', title:'The slope is the cost', body:'The slope of a straight PPF is the opportunity cost of the good on the x-axis. Rotation of that slope, not a shift of the intercepts, is a change in cost.'},
  {id:'legend-gd', rarity:'legendary', title:'Curvature sets the step', body:'For a quadratic bowl, the best constant learning rate is tied to the second derivative. Too large and you climb the other wall; that is geometry, not bad luck.'},
  {id:'legend-attn', rarity:'legendary', title:'Attention is just a basis', body:'Once scores become softmax weights, the output is a point in the convex hull of the value vectors. You cannot invent a direction the values do not already contain.'},
  {id:'legend-3d', rarity:'legendary', title:'Six equations, six unknowns', body:'A rigid body in 3-D has three force and three moment equations. A ball-and-socket uses three of them; a built-in support can use all six. Count before you write.'},
  {id:'legend-eu', rarity:'legendary', title:'Utility is not money', body:'Expected utility is an average of utilities, not of dollar payoffs. A risk-averse utility function can prefer a sure smaller prize, and that ranking is consistent.'}
];
function cardById(id){
  for(let i=0;i<CARDS.length;i++) if(CARDS[i].id===id) return CARDS[i];
  return null;
}
function cardRarity(c){ return (c && c.rarity) || (c && c.rare ? 'rare' : 'common'); }

function awardBadge(id){
  if(st.badges.indexOf(id)>=0) return null;
  st.badges.push(id);
  return {id:id, title:BADGES[id]||id};
}
function pickCard(){
  const have={};
  st.cards.forEach(function(c){ have[c.id]=true; });
  const roll=Math.random();
  const want=roll<0.05?'legendary':roll<0.25?'rare':'common';
  let pool=CARDS.filter(function(c){ return !have[c.id] && cardRarity(c)===want; });
  if(!pool.length) pool=CARDS.filter(function(c){ return !have[c.id]; });
  if(!pool.length) return null;
  const card=pool[Math.floor(Math.random()*pool.length)];
  st.cards.push({id:card.id, at:Date.now()});
  if(st.cards.length>=8) awardBadge('collector');
  return card;
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
      color:colors[i%colors.length], shape:Math.random()<0.45?'c':'r'
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

function ringSVG(pct, label, title){
  const r=15, circ=2*Math.PI*r;
  const dash=(Math.max(0,Math.min(1,pct))*circ).toFixed(2);
  return '<div class="fun-ring" title="'+escapeHtml(title)+'">'+
    '<svg viewBox="0 0 36 36" aria-hidden="true">'+
    '<circle class="fun-ring-track" cx="18" cy="18" r="15" fill="none" stroke-width="4"/>'+
    '<circle class="fun-ring-val" cx="18" cy="18" r="15" fill="none" stroke-width="4" stroke-linecap="round" transform="rotate(-90 18 18)" stroke-dasharray="'+dash+' '+circ.toFixed(2)+'"/>'+
    '</svg><span>'+escapeHtml(String(label))+'</span></div>';
}

function renderBar(){
  reconcileStreak();
  const bar=$('#funBar');
  if(!bar){ renderHome(); return; }
  const lv=levelOf(st.xp);
  const into=st.xp-levelXp(lv), span=80;
  const pct=Math.max(0,Math.min(1, into/span));
  const rank=rankOf(st.xp);
  const goal=+st.dailyGoal||5;
  const got=todayCount();
  const days=st.dayStreak.days||0;
  bar.innerHTML=
    ringSVG(pct, String(lv), 'Level '+lv+' · '+rank.name+' · '+st.xp+' XP')+
    '<div class="fun-rank" title="'+escapeHtml(rank.name)+'">'+escapeHtml(rank.name)+'</div>'+
    ringSVG(got/goal, got+'/'+goal, 'Today '+got+' of '+goal+' correct')+
    '<div class="fun-streak" title="Daily streak">🔥 '+(days||0)+((st.dayStreak.freezes||0)?' · ❄'+st.dayStreak.freezes:'')+'</div>'+
    '<button type="button" class="fun-gear" id="funGear" aria-expanded="false" title="Rewards and collection">✦</button>'+
    '<div class="fun-pop" id="funPop" hidden></div>';
  const gear=$('#funGear'), pop=$('#funPop');
  gear.addEventListener('click', function(e){
    e.stopPropagation();
    closeOverlays(true);
    const on=pop.hasAttribute('hidden');
    if(on){ fillPop(pop); pop.removeAttribute('hidden'); gear.setAttribute('aria-expanded','true'); }
    else { pop.setAttribute('hidden',''); gear.setAttribute('aria-expanded','false'); }
  });
  renderHome();
}
function fillPop(pop){
  const fx=fxOn();
  const goal=+st.dailyGoal||5;
  pop.innerHTML=
    '<label class="fun-tog"><input type="checkbox" id="funFx"'+(fx?' checked':'')+'> Motion effects</label>'+
    '<label class="fun-tog"><input type="checkbox" id="funSound"'+(st.sound?' checked':'')+'> Sound <span class="mute">(off unless you turn it on)</span></label>'+
    '<p class="mute">Effects stay off when your device asks for reduced motion, unless you turn them on here. Nothing flashes or blocks the quiz.</p>'+
    '<h4>Daily goal</h4>'+
    '<div class="fun-goals" role="group" aria-label="Daily goal">'+
      [3,5,10].map(function(n){
        return '<label><input type="radio" name="funGoal" value="'+n+'"'+(goal===n?' checked':'')+'> '+n+' correct</label>';
      }).join('')+
    '</div>'+
    '<p class="mute">Daily streak: '+(st.dayStreak.days||0)+' day'+(st.dayStreak.days===1?'':'s')+
      ((st.dayStreak.freezes||0)?' · '+st.dayStreak.freezes+' freeze'+(st.dayStreak.freezes===1?'':'s')+' saved':'')+
      '. A freeze is earned every 7 days and is used automatically if a day is missed.</p>'+
    '<div class="fun-pop-links">'+
      '<button type="button" class="btn sm" id="funOpenCol">Collection</button>'+
      '<button type="button" class="btn sm ghost" id="funOpenDaily">Today’s challenge</button>'+
      '<button type="button" class="btn sm ghost" id="funOpenSpeed">Speed round</button>'+
    '</div>';
  $('#funFx',pop).addEventListener('change', function(){ st.fx=this.checked; save(st); });
  $('#funSound',pop).addEventListener('change', function(){ st.sound=this.checked; save(st); });
  $$('input[name="funGoal"]',pop).forEach(function(inp){
    inp.addEventListener('change', function(){
      st.dailyGoal=+this.value; save(st); renderBar();
    });
  });
  $('#funOpenCol',pop).addEventListener('click', function(){ closePop(); openCollection(); });
  $('#funOpenDaily',pop).addEventListener('click', function(){ closePop(); openDaily(); });
  $('#funOpenSpeed',pop).addEventListener('click', function(){ closePop(); openSpeed(); });
}
function closePop(){
  const pop=$('#funPop'); if(pop) pop.setAttribute('hidden','');
  const g=$('#funGear'); if(g) g.setAttribute('aria-expanded','false');
}

function renderHome(){
  const host=$('#funHome'); if(!host) return;
  reconcileStreak();
  const lv=levelOf(st.xp);
  const into=st.xp-levelXp(lv);
  const rank=rankOf(st.xp,'g');
  const goal=+st.dailyGoal||5;
  const got=todayCount();
  const days=st.dayStreak.days||0;
  const chal=st.dailyChal && st.dailyChal.date===today() ? st.dailyChal : null;
  const chalLabel=chal && chal.ok ? 'Challenge done' : (chal && chal.ok===false ? 'Challenge — try again' : 'Today’s challenge');
  host.innerHTML=
    '<div class="fun-home-rings">'+
      ringSVG(into/80, String(lv), 'Level '+lv+' · '+rank.name)+
      '<div class="fun-home-copy"><strong>'+escapeHtml(rank.name)+'</strong><span>'+st.xp+' XP · 🔥 '+(days||0)+'</span></div>'+
      ringSVG(got/goal, got+'/'+goal, 'Today '+got+' of '+goal)+
    '</div>'+
    '<button type="button" class="btn sm fun-home-chal" id="funHomeChal">'+escapeHtml(chalLabel)+'</button>'+
    '<button type="button" class="fun-gear" id="funHomeGear" title="Rewards and collection">✦</button>';
  const chalBtn=$('#funHomeChal',host);
  if(chalBtn) chalBtn.addEventListener('click', function(){ openDaily(); });
  const gear=$('#funHomeGear',host);
  if(gear) gear.addEventListener('click', function(){ openCollection(); });
}

function inject(){
  if(!$('#funBar') && (document.getElementById('lessonApp') || document.getElementById('quiz1'))){
    const bar=document.createElement('div');
    bar.id='funBar'; bar.className='fun-bar';
    bar.setAttribute('aria-label','XP, level, and daily goal');
    const host=$('.lesson-top')||$('header.top')||$('.player')||document.body;
    if(host && host.classList && host.classList.contains('lesson-top')){
      host.insertAdjacentElement('afterend', bar);
    } else if($('.player')){
      $('.player').insertAdjacentElement('beforebegin', bar);
      bar.classList.add('fun-bar-page');
    } else {
      host.appendChild(bar);
    }
  }
  if(!$('#funHome') && (document.documentElement.classList.contains('home') || document.body.classList.contains('home'))){
    const strip=document.createElement('div');
    strip.id='funHome'; strip.className='fun-home';
    strip.setAttribute('aria-label','Daily streak and today’s challenge');
    const header=$('body.home header.top')||$('header.top');
    if(header) header.insertAdjacentElement('afterend', strip);
    else document.body.insertBefore(strip, document.body.firstChild);
  }
  if(!inject._docClick){
    inject._docClick=true;
    document.addEventListener('click', function(e){
      const pop=$('#funPop'); if(!pop||pop.hasAttribute('hidden')) return;
      if(e.target && (e.target.closest('#funPop')||e.target.closest('#funGear'))) return;
      closePop();
    });
  }
  renderBar();
}

/* ---------- overlays ---------- */
let _timer=null;
function clearTimer(){ if(_timer){ clearInterval(_timer); _timer=null; } }
function closeOverlays(keepPop){
  clearTimer();
  $$('.fun-overlay').forEach(function(el){ el.setAttribute('hidden',''); });
  if(!keepPop) closePop();
}
function overlay(id){
  let el=$('#'+id);
  if(!el){
    el=document.createElement('div');
    el.id=id; el.className='fun-overlay'; el.setAttribute('hidden','');
    el.innerHTML='<div class="fun-card-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(e){ if(e.target===el) closeOverlays(); });
  }
  return el;
}
function typeset(el){
  if(!el || !window.renderMathInElement) return;
  try{ window.renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false}); }catch(e){}
}
function showOverlay(id, html, bind){
  const el=overlay(id);
  const box=$('.fun-card-box', el);
  box.innerHTML=html;
  el.removeAttribute('hidden');
  typeset(box);
  const closer=$('[data-fun-close]', box);
  if(closer) closer.addEventListener('click', function(){ closeOverlays(); });
  if(bind) bind(box, el);
  return box;
}

function nextConceptTeaser(c){
  const n=(c||0)+1;
  const btn=$('#clist [data-c="'+n+'"]') || $('#overviewConcepts [data-c="'+n+'"]');
  if(btn){
    const t=(btn.querySelector('.t')||btn.querySelector('span')||btn).textContent||'';
    return {n:n, title:t.replace(/^\s*\d+\s*[·.]\s*/,'').trim()||('Concept '+n)};
  }
  return {n:n, title:n?'Concept '+n:''};
}
function goConcept(n){
  closeOverlays();
  const btn=$('#clist [data-c="'+n+'"]');
  if(btn){ btn.click(); return; }
  const p=location.pathname||'';
  if(/intro-ai/.test(p)){
    location.hash='#c'+n;
    return;
  }
  const url=new URL(location.href);
  url.searchParams.set('c', String(n));
  url.hash='s1';
  location.assign(url.toString());
}

function fieldHTML(ans, i){
  const api=window.GrokiversityQuiz;
  const q=escapeHtml(ans.q||('Answer '+(i+1)));
  const unit=ans.u;
  let sel='';
  if(api && api.unitMenu){
    const menu=api.unitMenu(unit);
    if(menu && menu.length){
      const def=api.selectDefault?api.selectDefault(unit):menu[0];
      sel='<select class="unit-select" data-i="'+i+'" data-want="'+escapeHtml(unit)+'" aria-label="Unit">'+
        menu.map(function(u){ return '<option value="'+escapeHtml(u)+'"'+(u===def?' selected':'')+'>'+escapeHtml(u)+'</option>'; }).join('')+
        '</select>';
    }
  }
  const inp='<input data-i="'+i+'" type="text" inputmode="decimal" enterkeyhint="go" autocomplete="off" spellcheck="false">';
  if(sel) return '<label>'+q+'<br><span class="unit-field">'+inp+sel+'</span></label>';
  return '<label>'+q+'<br>'+inp+'</label>';
}
function gradeFields(root, inst){
  const api=window.GrokiversityQuiz;
  if(!api || !inst || !inst.ans) return {ok:false};
  const ans=inst.ans;
  let all=true;
  for(let i=0;i<ans.length;i++){
    const inp=root.querySelector('input[data-i="'+i+'"]');
    const sel=root.querySelector('select[data-i="'+i+'"]');
    const raw=inp?inp.value:'';
    const from=sel?sel.value:undefined;
    const g=api.gradeAns(ans[i], raw, from);
    if(!g || !g.ok) all=false;
  }
  return {ok:all};
}
function problemHTML(inst, extra){
  const text=inst && inst.text ? inst.text : 'This problem is conceptual — skip it and continue.';
  const fields=(inst && inst.ans && inst.ans.length)? inst.ans.map(fieldHTML).join('') : '';
  const diag=(inst && inst.diagram)? inst.diagram : '';
  return '<div class="fun-prob">'+
    (diag?'<div class="fun-diag">'+diag+'</div>':'')+
    '<div class="fun-qtext">'+text+'</div>'+
    (fields?'<form class="fun-qform" action="javascript:void(0)">'+fields+
      '<button type="submit" class="btn" data-fun-check>Check</button></form>':'')+
    '<p class="fun-qfb mute" data-fun-fb></p>'+
    (extra||'')+
  '</div>';
}
function instantiateItem(item, seed){
  const api=window.GrokeQuizRand;
  if(!api || !item) return null;
  try{
    const inst=api.instantiate(item.qid, seed>>>0, item.course);
    try{ window.GrokeFun._currentInst=inst; window.GrokeFun._currentItem=item; }catch(e){}
    return inst;
  }catch(e){ return null; }
}

function openMore(info){
  info=info||{};
  const teaser=nextConceptTeaser(info.concept);
  const items=numericItems({course:courseKind()==='g'?'s':courseKind(), concept:info.concept});
  const item=items.length?items[Math.floor(Math.random()*items.length)]:null;
  const seed=((Date.now()^fnv('bonus:'+(item&&item.key||'')))>>>0);
  const inst=item?instantiateItem(item, seed):null;
  let remain=60;
  const html=
    '<p class="fun-kicker">Concept complete</p>'+
    '<h2>Nice work.</h2>'+
    (teaser.title?'<p class="fun-teaser">Up next: <strong>'+escapeHtml(teaser.title)+'</strong></p>':'')+
    '<p>Optional 60-second bonus — a fresh problem. Continue whenever you like.</p>'+
    '<p class="fun-timer" data-fun-timer>0:60</p>'+
    (inst?problemHTML(inst):'<p class="mute">No bonus problem on this concept yet.</p>')+
    '<button type="button" class="btn overview-start" data-fun-cont>Continue</button>';
  showOverlay('funMore', html, function(box){
    const timerEl=$('[data-fun-timer]', box);
    function tick(){
      remain--;
      if(timerEl) timerEl.textContent='0:'+String(Math.max(0,remain)).padStart(2,'0');
      if(remain<=0){
        clearTimer();
        const fb=$('[data-fun-fb]', box);
        if(fb && !fb.dataset.done) fb.textContent='Time’s up — you can still continue.';
      }
    }
    clearTimer();
    _timer=setInterval(tick, 1000);
    const form=$('.fun-qform', box);
    if(form) form.addEventListener('submit', function(e){
      e.preventDefault();
      if(remain<=0) return;
      const g=gradeFields(box, inst);
      const fb=$('[data-fun-fb]', box);
      if(g.ok){
        fb.dataset.done='1';
        fb.textContent='Bonus +15 XP';
        st.xp=(st.xp||0)+15;
        noteCorrectToday();
        save(st); renderBar();
        if(fxOn()) burst(false);
        chirp();
        clearTimer();
      } else {
        fb.textContent='Not yet — have another go, or continue.';
      }
    });
    $('[data-fun-cont]', box).addEventListener('click', function(){
      if(teaser.n) goConcept(teaser.n);
      else closeOverlays();
    });
  });
}

function openLevelUp(prevLv, lv){
  const rank=rankOf(st.xp);
  const prev=rankOf(levelXp(prevLv)+1);
  const named=rank.name!==prev.name;
  showOverlay('funLevel', 
    '<p class="fun-kicker">Level up</p>'+
    '<h2>Level '+lv+'</h2>'+
    '<p>'+(named?('You are now a <strong>'+escapeHtml(rank.name)+'</strong>.'):escapeHtml(rank.name)+'.')+' '+st.xp+' XP.</p>'+
    '<button type="button" class="btn" data-fun-close>Nice</button>',
    function(){ if(fxOn()) burst(true); chirp(); }
  );
}

function openCollection(){
  const have={};
  st.cards.forEach(function(c){ have[c.id]=true; });
  const counts={common:0,rare:0,legendary:0};
  CARDS.forEach(function(c){ counts[cardRarity(c)]++; });
  const got=st.cards.length, total=CARDS.length;
  const cards=CARDS.map(function(c){
    const own=!!have[c.id];
    const r=cardRarity(c);
    if(!own) return '<article class="fun-card locked '+r+'"><h5>???</h5><p class="mute">'+r+' · still packed</p></article>';
    return '<article class="fun-card '+r+'"><h5>'+escapeHtml(c.title)+' <span class="fun-rare">'+r+'</span></h5><p>'+escapeHtml(c.body)+'</p></article>';
  }).join('');
  const badges=st.badges.map(function(id){ return '<li>'+escapeHtml(BADGES[id]||id)+'</li>'; }).join('')||'<li class="mute">None yet — answer a problem.</li>';
  showOverlay('funCollection',
    '<p class="fun-kicker">Collection</p>'+
    '<h2>Cards '+got+'/'+total+'</h2>'+
    '<p class="mute">Common · Rare · Legendary — dropped on correct answers. Badges '+st.badges.length+'/'+Object.keys(BADGES).length+'.</p>'+
    '<h3>Badges</h3><ul class="fun-badges">'+badges+'</ul>'+
    '<h3>Trivia cards</h3><div class="fun-cards">'+cards+'</div>'+
    '<div class="fun-pop-links">'+
      '<button type="button" class="btn sm ghost" data-fun-daily>Today’s challenge</button>'+
      '<button type="button" class="btn sm ghost" data-fun-speed>Speed round</button>'+
      '<button type="button" class="btn sm" data-fun-close>Close</button>'+
    '</div>',
    function(box){
      $('[data-fun-daily]',box).addEventListener('click', function(){ openDaily(); });
      $('[data-fun-speed]',box).addEventListener('click', function(){ openSpeed(); });
    }
  );
}

function pickDaily(iso){
  iso=iso||today();
  const api=window.GrokeQuizRand;
  if(!api) return null;
  let pool=numericItems();
  if(!pool.length) pool=numericItems({course:'s', concept:1});
  if(!pool.length){
    // Even with no unlocked progress, offer Statics q1.1 if the generator exists.
    const k='s:q1.1';
    if(api.gens && api.gens[k]) pool=[{key:k, course:'s', concept:1, qid:'q1.1'}];
  }
  if(!pool.length) return null;
  const h=typeof api.hash==='function'?api.hash('daily:'+iso):fnv('daily:'+iso);
  const item=pool[h%pool.length];
  const seed=typeof api.hash==='function'?api.hash('daily:'+iso+':'+item.key):fnv('daily:'+iso+':'+item.key);
  const inst=instantiateItem(item, seed);
  if(!inst) return null;
  return {date:iso, item:item, inst:inst, seed:seed};
}
function courseLabel(c){
  return c==='e'?'Economics':c==='a'?'Intro to AI':'Statics';
}
function shareDailyText(result){
  const ev=result && result.ok ? (result.tries>1?'🟨':'🟩') : '⬛';
  const days=st.dayStreak.days||0;
  const when=(result && result.date)||today();
  const bits=['Grokiversity Daily · '+when, ev];
  if(result && result.course) bits.push(courseLabel(result.course));
  if(days) bits.push(days+'-day streak');
  bits.push(SITE);
  return bits.join('\n');
}
function shareDailyURL(result){
  return 'https://twitter.com/intent/tweet?text='+encodeURIComponent(shareDailyText(result));
}
function dailyResultCard(pick, result){
  const ev=result.ok ? (result.tries>1?'🟨':'🟩') : '⬛';
  const text=shareDailyText(result);
  return '<p class="fun-kicker">Today’s challenge</p>'+
    '<h2>'+(result.ok?'Solved.':'Not this time.')+'</h2>'+
    '<p class="fun-grid" aria-hidden="true">'+ev+'</p>'+
    '<p class="mute">'+escapeHtml(courseLabel(pick.item.course))+(st.dayStreak.days?(' · '+st.dayStreak.days+'-day streak'):'')+'</p>'+
    '<a class="btn" id="funShare" target="_blank" rel="noopener noreferrer" href="'+shareDailyURL(result)+'">Share on X</a>'+
    '<button type="button" class="btn ghost" data-fun-close>Close</button>'+
    '<pre class="fun-share-preview mute" hidden>'+escapeHtml(text)+'</pre>';
}
function dailyHref(){
  const kind=(unlockedList()[0])||{course:'s'};
  const onLesson=/\/statics\//.test(location.pathname)||/\/econ\//.test(location.pathname)||/intro-ai/.test(location.pathname);
  if(onLesson) return '?daily=1';
  const path=kind.course==='e'?'econ/unit-1.html':kind.course==='a'?'intro-ai.html':'statics/unit-1.html';
  return path+'?daily=1';
}
function openDaily(){
  const onLesson=!!(document.getElementById('lessonApp')||document.getElementById('quiz1'));
  if(!onLesson || !window.GrokeQuizRand){
    location.href=dailyHref();
    return;
  }
  const pick=pickDaily();
  if(!pick){
    showOverlay('funDaily', '<h2>Today’s challenge</h2><p>No numeric problem is ready yet. Play a lesson first.</p><button type="button" class="btn" data-fun-close>Close</button>');
    return;
  }
  const saved=st.dailyChal && st.dailyChal.date===pick.date ? st.dailyChal : null;
  if(saved && saved.ok){
    showOverlay('funDaily', dailyResultCard(pick, saved));
    return;
  }
  showOverlay('funDaily',
    '<p class="fun-kicker">Today’s challenge</p>'+
    '<h2>One problem for '+escapeHtml(pick.date)+'</h2>'+
    '<p class="mute">'+escapeHtml(courseLabel(pick.item.course))+' · same problem all day. Share the result, not the answer.</p>'+
    problemHTML(pick.inst)+
    '<button type="button" class="btn ghost" data-fun-close>Close</button>',
    function(box){
      const form=$('.fun-qform', box);
      if(!form) return;
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const tries=(st.dailyChal && st.dailyChal.date===pick.date ? (st.dailyChal.tries||0) : 0)+1;
        const g=gradeFields(box, pick.inst);
        const result={date:pick.date, key:pick.item.key, course:pick.item.course, ok:!!g.ok, tries:tries};
        st.dailyChal=result;
        if(g.ok){
          awardBadge('challenge');
          noteCorrectToday();
          const prev=levelOf(st.xp);
          st.xp=(st.xp||0)+25;
          save(st); renderBar();
          if(fxOn()) burst(true);
          chirp();
          box.innerHTML=dailyResultCard(pick, result);
          if(levelOf(st.xp)>prev){ /* keep the result card; toast the level */ toast('Level up! Level '+levelOf(st.xp)); }
        } else {
          save(st);
          const fb=$('[data-fun-fb]', box);
          if(fb) fb.textContent='Not yet — the numbers stay the same all day.';
        }
      });
    }
  );
}

function openSpeed(){
  if(!window.GrokeQuizRand){
    toast('Open a lesson to play the speed round.');
    return;
  }
  const pool=numericItems({masteredOnly:true});
  if(!pool.length){
    showOverlay('funSpeed',
      '<p class="fun-kicker">Speed round</p>'+
      '<h2>Not unlocked yet</h2>'+
      '<p>Speed round uses quick problems from concepts you have already mastered (80%).</p>'+
      '<button type="button" class="btn" data-fun-close>Close</button>'
    );
    return;
  }
  let remain=60, score=0, current=null, running=true;
  function nextItem(){
    const item=pool[Math.floor(Math.random()*pool.length)];
    const seed=(Math.floor(Math.random()*0xffffffff)^fnv('speed:'+Date.now()+':'+item.key))>>>0;
    return {item:item, inst:instantiateItem(item, seed)};
  }
  function frame(){
    current=nextItem();
    if(!current.inst){ current=nextItem(); }
    return '<p class="fun-kicker">Speed round</p>'+
      '<div class="fun-speed-meta"><span class="fun-timer" data-fun-timer>0:'+String(remain).padStart(2,'0')+'</span>'+
      '<span>Score '+score+(st.speedBest?(' · best '+st.speedBest):'')+'</span></div>'+
      (current.inst?problemHTML(current.inst):'<p>Could not draw a problem.</p>');
  }
  const box=showOverlay('funSpeed', frame(), bind);
  function bind(box){
    const form=$('.fun-qform', box);
    if(form) form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!running) return;
      const g=gradeFields(box, current && current.inst);
      const fb=$('[data-fun-fb]', box);
      if(g.ok){
        score++;
        noteCorrectToday();
        st.xp=(st.xp||0)+8;
        save(st); renderBar();
        box.innerHTML=frame();
        typeset(box);
        bind(box);
      } else if(fb){
        fb.textContent='Skip or try once more.';
      }
    });
  }
  clearTimer();
  _timer=setInterval(function(){
    remain--;
    const t=$('#funSpeed [data-fun-timer]');
    if(t) t.textContent='0:'+String(Math.max(0,remain)).padStart(2,'0');
    if(remain<=0){
      running=false;
      clearTimer();
      const best=Math.max(st.speedBest||0, score);
      const rec=score>(st.speedBest||0);
      if(rec){ st.speedBest=score; st.speedBestAt=today(); }
      if(score>0) awardBadge('speed');
      save(st); renderBar();
      showOverlay('funSpeed',
        '<p class="fun-kicker">Speed round</p>'+
        '<h2>'+score+' in 60 seconds</h2>'+
        '<p>Personal best: '+best+(rec?' — new best.':'')+'</p>'+
        '<button type="button" class="btn" data-fun-again>Play again</button>'+
        '<button type="button" class="btn ghost" data-fun-close>Close</button>',
        function(b){
          $('[data-fun-again]',b).addEventListener('click', function(){ openSpeed(); });
        }
      );
    }
  }, 1000);
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
    const prevLv=levelOf(st.xp);
    if(info.first){
      noteCorrectToday();
      if(todayCount()>=(+st.dailyGoal||5)) badge=awardBadge('goal')||badge;
      if((st.dayStreak.days||0)===3) badge=awardBadge('daily3')||badge;
      if((st.dayStreak.days||0)===7) badge=awardBadge('daily7')||badge;
      st.correct=(st.correct||0)+1;
      if(st.correct===1) badge=awardBadge('first')||badge;
      st.streak=(st.streak||0)+1;
      if(st.streak>st.bestStreak) st.bestStreak=st.streak;
      let xp=info.xp!=null?info.xp:(info.tries===1?20:10);
      if(!info.quiet){
        if(st.streak===3){ xp+=10; badge=awardBadge('streak3')||badge; notes.push('3-answer streak!'); }
        else if(st.streak===5){ xp+=15; badge=awardBadge('streak5')||badge; notes.push('5-answer streak!'); }
        else if(st.streak===10){ xp+=25; badge=awardBadge('streak10')||badge; notes.push('10-answer streak!'); }
        else if(st.streak>0 && st.streak%5===0){ xp+=15; notes.push(st.streak+'-answer streak!'); }
        const roll=Math.random();
        if(roll<0.03){ mult=3; notes.unshift('Critical hit! ×3 XP'); st.crits=(st.crits||0)+1; badge=awardBadge('crit')||badge; }
        else if(roll<0.13){ mult=2; notes.unshift('Lucky break — double XP'); }
        if(Math.random()<(mult>=3?0.8:0.18)){ card=pickCard(); }
      }
      gained=xp*mult;
    }
    if(info.mastered){
      gained+=50;
      big=true;
      badge=awardBadge('mastered')||badge;
      notes.push('Concept mastered · +50 XP');
    }
    st.xp=(st.xp||0)+gained;
    const lv=levelOf(st.xp);
    if(lv>=5) awardBadge('lvl5');
    if(lv>=10) awardBadge('lvl10');
    const leveled=lv>prevLv;
    if(leveled) notes.push('Level up! You reached level '+lv);
    save(st); renderBar();
    if(info.quiet) return;
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
    if(leveled) openLevelUp(prevLv, lv);
    if(info.mastered) openMore(info);
  }
}

function boot(){
  const onLesson=!!(document.getElementById('lessonApp') || document.getElementById('quiz1'));
  const onHome=document.documentElement.classList.contains('home') || document.body.classList.contains('home');
  if(!onLesson && !onHome) return;
  reconcileStreak(); save(st);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  const q=new URLSearchParams(location.search);
  if(onLesson && q.get('daily')==='1'){
    const start=function(){ setTimeout(openDaily, 400); };
    if(document.readyState==='complete') start();
    else window.addEventListener('load', start);
  }
}
boot();
try{
  window.GrokeFun={
    report:report, burst:burst, state:function(){ return st; },
    save:function(){ save(st); }, render:renderBar, fxOn:fxOn,
    openCollection:openCollection, openDaily:openDaily, openSpeed:openSpeed,
    openMore:openMore, pickDaily:pickDaily, shareDailyText:shareDailyText,
    shareDailyURL:shareDailyURL, reconcileStreak:reconcileStreak,
    rankOf:rankOf, levelOf:levelOf, noteCorrectToday:noteCorrectToday,
    cards:CARDS, badges:BADGES, today:today
  };
}catch(e){}
})();
