'use strict';
// 0.73 訓練整合成分頁：能力訓練／英雄練習／天賦特訓（共用每週訓練次數）。
// 英雄練習改成「點卡片就練」，只列自己位置的英雄，本命與備用排最前面，不用再捲到最下面找按鈕。
(()=>{
const KEY='esports-train-tab';
let tab='stat';try{tab=localStorage.getItem(KEY)||'stat';}catch{}
const canTrain=c=>c&&(c.stage==='camp'||c.stage==='ladder'||(c.pro&&!c.pro.live&&!c.pro.ended));
const tierOf=m=>window.GROWTH?.TIER?GROWTH.TIER(m):'';
function heroGrid(c){const role=c.role,list=heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===role);
 const second=c.second??window.SECOND_HERO,rank=i=>i===selected?0:i===second?1:2;
 list.sort((a,b)=>rank(a)-rank(b)||heroes[b].mastery-heroes[a].mastery);
 const cost=GROWTH.cost(c),off=!canTrain(c)||!(training>0)||c.energy<cost;
 return `<p class="tp-hint">點英雄就練一次（熟練度上升，消耗 1 次訓練、體力 ${cost}）。熟練度越高越難練，練習最多到 ${GROWTH.M_CAP}，再往上要靠實戰（天梯翠曜以上或正式比賽）。${off?'<b>本週訓練次數或體力不足</b>':''}</p>
 <div class="tp-heroes">${list.map(i=>{const m=heroes[i].mastery,tag=i===selected?'本命':i===second?'備用':'';
  return `<button type="button" class="tp-hero${tag?' pinned':''}" data-tp-hero="${i}" ${off||m>=GROWTH.M_CAP?'disabled':''} ${m>=GROWTH.M_CAP?'title="練習已到上限，靠實戰繼續成長"':''}><canvas class="tp-ava" width="48" height="64" data-tp-ava="${i}"></canvas>
  <span><strong>${heroes[i].name}</strong>${tag?`<em>${tag}</em>`:''}<small>${tierOf(m)} · ${Math.round(m)}</small><i style="--m:${Math.min(100,m)}%"></i></span></button>`;}).join('')}</div>`;}
function mount(){const c=window.CAREER?.data,courses=document.querySelector('.growth-courses');if(!c||!courses){document.querySelector('#trainTabs')?.remove();document.querySelector('#tpHeroes')?.remove();return;}
 let bar=document.querySelector('#trainTabs');
 if(!bar||bar.nextElementSibling!==courses){bar?.remove();bar=document.createElement('div');bar.id='trainTabs';bar.className='train-tabs';courses.before(bar);
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-tt]');if(!b)return;tab=b.dataset.tt;try{localStorage.setItem(KEY,tab);}catch{}mount();});}
 const left=typeof training==='number'?training:0;
 bar.innerHTML=[['stat','能力訓練'],['hero','英雄練習'],['talent','天賦特訓']].map(([k,n])=>`<button type="button" data-tt="${k}" class="${tab===k?'on':''}" aria-pressed="${tab===k}">${n}</button>`).join('')+`<span class="tt-left">本週剩 <b>${left}</b> 次</span>`;
 let hp=document.querySelector('#tpHeroes');if(!hp){hp=document.createElement('div');hp.id='tpHeroes';hp.addEventListener('click',e=>{const b=e.target.closest('[data-tp-hero]');if(!b||b.disabled)return;const c=CAREER.data;if(!canTrain(c)||!(training>0))return;
  if(GROWTH.heroTrain(c,+b.dataset.tpHero)){training--;CAREER.save();renderSetup();}});}
 const anchor=document.querySelector('#spWrap')||courses;if(hp.previousElementSibling!==anchor)anchor.after(hp);
 const h=heroGrid(c);if(hp.dataset.h!==h){hp.dataset.h=h;hp.innerHTML=h;hp.querySelectorAll('[data-tp-ava]').forEach(cv=>window.HERO_PIXEL?.paint(cv,+cv.dataset.tpAva,2));}
 courses.hidden=tab!=='stat';hp.hidden=tab!=='hero';const sp=document.querySelector('#spWrap');if(sp)sp.hidden=tab!=='talent';
 // 舊的「英雄專項練習」按鈕改由分頁取代（保留在頁面上給既有流程與測試使用）
 document.querySelector('#train')?.classList.add('tp-legacy');}
const prev=renderSetup;renderSetup=function(){const r=prev.apply(this,arguments);try{mount();}catch(err){console.warn(err);}return r;};
mount();
window.TRAIN_UI={mount};
})();
