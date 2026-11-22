/* Grokiversity: shared progress — localStorage resume, furthest vs current, home Continue. */
(function(global){
'use strict';

function parse(raw){
  try{ const s=JSON.parse(raw); return (s && typeof s==='object') ? s : null; }catch(e){ return null; }
}
function isEmptyProgress(s){
  if(!s || typeof s!=='object') return true;
  const scores=s.score && Object.keys(s.score).some(function(k){
    const o=s.score[k]; return o && typeof o==='object' && Object.keys(o).length;
  });
  const pos=(s.current && +s.current>1) ||
    Object.keys(s.slide||{}).some(function(k){ return +s.slide[k]>0; }) ||
    (s.furthest && +s.furthest.c>0 && ((s.furthest.i||0)>0 || s.furthest.id)) ||
    (s.slideId && Object.keys(s.slideId).length);
  const xp=(+s.xp>0) || (s.dayStreak && +s.dayStreak.days>0) || (+s.correct>0);
  return !scores && !pos && !xp;
}
function hasProgress(s){ return !isEmptyProgress(s); }

function readStore(key){
  try{
    const neu=parse(localStorage.getItem(key));
    const oldKey=String(key).replace(/^grokiversity/,'grokeversity');
    let old=null;
    if(oldKey!==key) old=parse(localStorage.getItem(oldKey));
    if(old && isEmptyProgress(neu) && !isEmptyProgress(old)){
      try{ localStorage.setItem(key, JSON.stringify(old)); }catch(e){}
      return old;
    }
    return neu || {};
  }catch(e){ return {}; }
}
function writeStore(key, obj){
  try{ localStorage.setItem(key, JSON.stringify(obj)); return true; }catch(e){ return false; }
}

function rankOf(order, c, id, i){
  const arr=order && order[c];
  let j=-1;
  if(arr && id) j=arr.indexOf(id);
  if(j<0 && i!=null && i>=0) j=+i;
  if(j<0) j=0;
  return (+c||0)*1000+j;
}
function ahead(order, a, b){
  if(!a) return false;
  if(!b) return true;
  return rankOf(order, a.c, a.id, a.i) > rankOf(order, b.c, b.id, b.i);
}

function quizKeyFromId(id){
  const m=String(id||'').match(/^quiz-(q\d+)-(\d+)$/);
  return m ? m[1]+'.'+m[2] : null;
}

function inferFurthest(store, order, maxC){
  maxC=maxC||(order?Math.max.apply(null, Object.keys(order).map(Number)):5);
  let best=null;
  for(let c=1;c<=maxC;c++){
    const ids=(order && order[c])||[];
    const scores=(store.score && (store.score[c]||store.score[String(c)]))||{};
    const hasScores=scores && Object.keys(scores).length>0;
    const hasId=!!(store.slideId && store.slideId[c]);
    const hasSlide=!!(store.slide && (store.slide[c]!=null || store.slide[String(c)]!=null));
    if(!hasId && !hasSlide && !hasScores) continue;
    let id=store.slideId && store.slideId[c];
    let i=id?ids.indexOf(id):-1;
    if(i<0 && hasSlide){
      i=+(store.slide[c]!=null?store.slide[c]:store.slide[String(c)])||0;
      id=ids[i]||id;
    }
    let maxScoreI=-1, maxScoreId=null;
    ids.forEach(function(sid, idx){
      const qk=quizKeyFromId(sid);
      if(qk && scores[qk]!=null){ maxScoreI=idx; maxScoreId=sid; }
    });
    if(maxScoreI>i){ i=maxScoreI; id=maxScoreId; }
    if(i<0 && !id && !hasScores) continue;
    if(i<0) i=0;
    const cand={c:c,id:id||ids[i]||'',i:Math.max(0,i)};
    if(!best || ahead(order, cand, best)) best=cand;
  }
  if(store.furthest && store.furthest.c){
    if(!best || ahead(order, store.furthest, best)) best={c:+store.furthest.c,id:store.furthest.id,i:store.furthest.i||0};
  }
  return best;
}

function ensureFurthest(store, order, maxC){
  const inferred=inferFurthest(store, order, maxC);
  if(inferred && (!store.furthest || ahead(order||{}, inferred, store.furthest))) store.furthest=inferred;
  return store.furthest;
}
function migrateSlides(store, legacyIds, order, maxC){
  store=store||{};
  if(+store.slideVer>=3){
    ensureFurthest(store, order, maxC);
    return store;
  }
  store.slideId=store.slideId||{};
  const ver=+store.slideVer||0;
  Object.keys(store.slide||{}).forEach(function(k){
    const c=+k;
    const i=+store.slide[k]||0;
    if(store.slideId[c]) return;
    if(ver<2){
      const legacy=legacyIds && legacyIds[c];
      if(legacy && i>=0 && i<legacy.length){ store.slideId[c]=legacy[i]; return; }
    }
    if(order && order[c] && order[c][i]) store.slideId[c]=order[c][i];
  });
  if(!store.furthest || !store.furthest.c) store.furthest=inferFurthest(store, order, maxC);
  store.reached=store.reached||{};
  if(store.furthest && store.furthest.c){
    for(let c=1;c<=store.furthest.c;c++){
      if(store.reached[c]!=null) continue;
      if(c<store.furthest.c && order && order[c] && order[c].length) store.reached[c]=order[c][order[c].length-1];
      else if(c===store.furthest.c) store.reached[c]=store.furthest.id||store.slideId[c]||0;
    }
  }
  Object.keys(store.score||{}).forEach(function(k){
    const o=store.score[k];
    if(o && Object.keys(o).length && store.reached[+k]==null) store.reached[+k]=store.slideId[+k]||true;
  });
  store.slideVer=3;
  return store;
}

function resumePoint(store, order, indexOfSlideId, maxC){
  const f=store.furthest && store.furthest.c ? store.furthest : inferFurthest(store, order, maxC);
  if(!f || !f.c) return {c:store.current||1, i:0};
  let i=-1;
  if(f.id && typeof indexOfSlideId==='function') i=indexOfSlideId(f.c, f.id);
  if(i<0 && order && order[f.c] && f.id) i=order[f.c].indexOf(f.id);
  if(i<0) i=+(f.i!=null?f.i:(store.slide && store.slide[f.c]))||0;
  return {c:+f.c, i:Math.max(0,i)};
}

function currentPoint(store, c, indexOfSlideId){
  c=c||store.current||1;
  const id=store.slideId && store.slideId[c];
  let i=-1;
  if(id && typeof indexOfSlideId==='function') i=indexOfSlideId(c, id);
  if(i<0) i=+(store.slide && store.slide[c])||0;
  return {c:+c, i:Math.max(0,i)};
}

function refreshSummary(store, order, maxC){
  maxC=maxC||(order?Object.keys(order).length:0);
  let seen=0, total=0, doneC=0;
  store.seen=store.seen||{};
  for(let c=1;c<=maxC;c++){
    const ids=(order && order[c])||[];
    total+=ids.length;
    const reachedId=store.reached && store.reached[c];
    const reachedI=reachedId && ids.length ? ids.indexOf(reachedId) : (reachedId===true?ids.length-1:-1);
    ids.forEach(function(id, idx){
      const qk=quizKeyFromId(id);
      const scored=qk && store.score && store.score[c] && store.score[c][qk]!=null;
      if(store.seen[c+':'+id] || scored || (reachedI>=0 && idx<=reachedI)) seen++;
    });
    const scores=store.score && (store.score[c]||{});
    if(scores && Object.keys(scores).length){
      const n=ids.filter(function(id){ return /^quiz-/.test(id); }).length || Object.keys(scores).length;
      const sum=Object.values(scores).reduce(function(a,b){ return a+(+b||0); },0);
      if(n && (sum/n)>=0.8) doneC++;
    }
  }
  store.summary={seen:seen, total:total, conceptsDone:doneC, concepts:maxC};
  return store.summary;
}


function scoreSum(s){
  let n=0;
  Object.values((s&&s.score)||{}).forEach(function(o){
    if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ n+=1+(+o[k]||0); });
  });
  n+=Object.keys((s&&s.seen)||{}).length;
  if(s&&s.furthest) n+=(+s.furthest.c||0)*20+(+s.furthest.i||0);
  n+=(+((s&&s.xp)||0))/100;
  return n;
}
function mergeScores(a,b){
  const out={};
  [a||{},b||{}].forEach(function(src){
    Object.keys(src).forEach(function(c){
      out[c]=out[c]||{};
      const o=src[c]||{};
      Object.keys(o).forEach(function(q){
        const v=+o[q];
        if(out[c][q]==null || v>out[c][q]) out[c][q]=o[q];
      });
    });
  });
  return out;
}
function mergeStores(disk, mem, order){
  if(!disk || typeof disk!=='object' || !Object.keys(disk).length) return mem||{};
  if(!mem || typeof mem!=='object' || !Object.keys(mem).length) return disk;
  const out={};
  Object.keys(disk).forEach(function(k){ out[k]=disk[k]; });
  Object.keys(mem).forEach(function(k){ if(k!=='score' && k!=='seen' && k!=='reached' && k!=='slideId' && k!=='slide' && k!=='furthest' && k!=='summary') out[k]=mem[k]; });
  out.score=mergeScores(disk.score, mem.score);
  out.seen=Object.assign({}, disk.seen||{}, mem.seen||{});
  out.slide=Object.assign({}, disk.slide||{}, mem.slide||{});
  out.slideId=Object.assign({}, disk.slideId||{}, mem.slideId||{});
  out.reached=Object.assign({}, disk.reached||{}, mem.reached||{});
  const fDisk=disk.furthest, fMem=mem.furthest;
  if(fMem && fDisk) out.furthest=ahead(order||{}, fMem, fDisk)?fMem:fDisk;
  else out.furthest=fMem||fDisk;
  if(+disk.slideVer>0 || +mem.slideVer>0) out.slideVer=Math.max(+disk.slideVer||0, +mem.slideVer||0);
  if(mem.current!=null) out.current=mem.current;
  if(mem.summary && (!disk.summary || (mem.summary.seen||0)>=(disk.summary.seen||0))) out.summary=mem.summary;
  else if(disk.summary) out.summary=disk.summary;
  return out;
}

function bindFlush(fn){
  const run=function(){ try{ fn(); }catch(e){} };
  document.addEventListener('pagehide', run);
  window.addEventListener('pagehide', run);
  window.addEventListener('beforeunload', run);
  document.addEventListener('freeze', run);
  document.addEventListener('visibilitychange', function(){ if(document.hidden) run(); });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"]/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]); });
}

function routeFor(href, c, i, id){
  const m=String(href||'').match(/^(.*?)(\?[^#]*)?(#.*)?$/);
  const path=m[1]||href||'';
  const qs=new URLSearchParams((m[2]||'').replace(/^\?/,''));
  if(c) qs.set('c', String(c));
  const q=qs.toString();
  const hash=id ? ('#s'+((+i||0)+1)+'/'+id) : (i!=null ? '#s'+((+i||0)+1) : '');
  return path+(q?'?'+q:'')+hash;
}

const HOME_COURSES=[
  {key:'s', storeKey:'grokiversity.v1', card:'#card-me', hrefFallback:'statics/unit-1.html',
   start:'Start Statics', cont:'Continue Statics', totalFallback:59, concepts:5},
  {key:'e', storeKey:'grokiversity.econ101.v1', card:'#card-econ', hrefFallback:'econ/unit-1.html',
   start:'Start Economics', cont:'Continue Economics', totalFallback:28, concepts:4}
];

function paintHome(){
  const onHome=document.documentElement.classList.contains('home') || (document.body && document.body.classList.contains('home'));
  if(!onHome) return;
  HOME_COURSES.forEach(function(meta){
    const card=document.querySelector(meta.card);
    if(!card) return;
    const store=readStore(meta.storeKey);
    const started=hasProgress(store);
    const href0=card.getAttribute('href')||meta.hrefFallback;
    const base=href0.split('#')[0];
    if(started){
      const order=null;
      const r=resumePoint(store, order, null, meta.concepts);
      const id=(store.furthest && store.furthest.id) || (store.slideId && store.slideId[r.c]);
      card.setAttribute('href', routeFor(base, r.c, r.i, id));
      const badge=card.querySelector('.badge');
      if(badge) badge.textContent='Continue';
      const sum=store.summary||{};
      const total=+sum.total||meta.totalFallback;
      let seen=Math.min(total, +sum.seen||0);
      if(!seen){
        if(store.furthest && (store.furthest.i!=null || store.furthest.id)){
          seen=Math.max(1, (+store.furthest.i||0)+1);
        } else if(store.slide){
          const vals=Object.keys(store.slide).map(function(k){ return +store.slide[k]||0; });
          seen=vals.length?Math.max.apply(null, vals)+1:1;
        } else seen=1;
        seen=Math.min(total, seen);
      }
      const doneC=+sum.conceptsDone||0;
      const p=card.querySelector('p');
      if(p){
        const bits=[];
        if(total) bits.push((seen||0)+' of '+total+' slides');
        if(meta.concepts) bits.push(doneC+' of '+meta.concepts+' concepts');
        p.textContent=bits.join(' · ') || p.textContent;
        p.classList.add('course-progress-label');
      }
      let bar=card.querySelector('.course-progress');
      if(!bar){
        bar=document.createElement('div');
        bar.className='course-progress';
        bar.innerHTML='<i></i>';
        card.appendChild(bar);
      }
      bar.setAttribute('role','img');
      bar.setAttribute('aria-label', (seen||0)+' of '+total+' slides');
      const i=bar.querySelector('i');
      if(i) i.style.width=Math.max(4, Math.min(100, total?Math.round(100*(seen||0)/total):0))+'%';
    }
    if(meta.key==='s'){
      document.querySelectorAll('.home-cta .btn, header.top a.btn').forEach(function(a){
        if(!/statics\/unit-1\.html/.test(a.getAttribute('href')||'')) return;
        if(started){
          a.setAttribute('href', card.getAttribute('href'));
          if(/Start Statics/i.test(a.textContent)) a.textContent='Continue Statics';
        }
      });
    }
  });
}

function slideHeading(el){
  if(!el) return '';
  const h=el.querySelector('h2');
  let t=(h && (h.textContent||'').trim()) || (el.dataset.id||'');
  t=t.replace(/\s+/g,' ');
  if((el.dataset.id||'').indexOf('quiz-')===0 && t && t.indexOf('Quiz')!==0) t='Quiz · '+t;
  return t;
}

global.GrokeProgress={
  readStore:readStore, writeStore:writeStore,
  isEmptyProgress:isEmptyProgress, hasProgress:hasProgress,
  ahead:ahead, rankOf:rankOf, quizKeyFromId:quizKeyFromId,
  inferFurthest:inferFurthest, ensureFurthest:ensureFurthest, migrateSlides:migrateSlides,
  resumePoint:resumePoint, currentPoint:currentPoint,
  refreshSummary:refreshSummary, mergeStores:mergeStores, scoreSum:scoreSum, bindFlush:bindFlush,
  paintHome:paintHome, routeFor:routeFor, slideHeading:slideHeading,
  escapeHtml:escapeHtml
};
})(typeof window!=='undefined'?window:this);
