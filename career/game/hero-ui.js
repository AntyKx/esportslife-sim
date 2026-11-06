'use strict';
// 0.64 把像素立繪套進介面：選角卡、英雄榜、青訓／職業 BP、轉播頭像、裝備面板、選手看板。
// 戰場不變。只讀取資料、不改模擬，也不用 Math.random。
(()=>{
const P=window.HERO_PIXEL;if(!P)return;
// 半身（頭＋上半身）裁切，給小頭像用
const BUST={x:2,y:0,w:20,h:24};
function drawInto(cv,i,{bust=false}={}){if(!cv||i==null||!heroes[i])return;const ctx=cv.getContext('2d'),src=P.canvas(i,{scale:4});
 const r=bust?BUST:{x:0,y:0,w:P.W,h:P.H},s=Math.min(cv.width/r.w,cv.height/r.h),w=r.w*s,h=r.h*s;
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(src,r.x*4,r.y*4,r.w*4,r.h*4,(cv.width-w)/2,cv.height-h,w,h);cv.dataset.hpDone=i+(bust?'b':'');}
function avatar(i,cls='hp-ava'){const c=document.createElement('canvas');c.className=cls;c.width=48;c.height=64;c.setAttribute('aria-hidden','true');P.paint(c,i,2);c.dataset.hpi=i;return c;}

// 1) 有英雄編號的按鈕或列：放一個像素小人
const SEL='[data-hero],[data-pick],[data-ban],[data-dhero],tr[data-tlh]';
function idxOf(el){const v=el.dataset.hero??el.dataset.pick??el.dataset.ban??el.dataset.dhero??el.dataset.tlh;const i=+v;return Number.isInteger(i)&&heroes[i]?i:null;}
function decorate(el){const i=idxOf(el);if(i==null)return;
 const host=el.matches('tr')?el.querySelector('.tl-name')||el.cells?.[1]:el;if(!host)return;
 const old=host.querySelector(':scope > .hp-ava, :scope > .avatar > .hp-ava');if(old&&+old.dataset.hpi===i)return;old?.remove();
 const av=host.querySelector(':scope > .avatar');if(av){av.textContent='';av.classList.add('hp-slot');av.append(avatar(i));}
 else host.prepend(avatar(i,el.matches('tr')?'hp-ava hp-sm':'hp-ava'));}
// 2) 轉播與裝備面板的頭像（原本畫戰場角色，改畫半身像素圖）
function portraits(){const s=typeof state!=="undefined"?state:null;if(!s?.actors)return;
 document.querySelectorAll('.cast-champion[data-actor] canvas').forEach(cv=>{const a=s.actors[+cv.closest('[data-actor]').dataset.actor];if(a&&cv.dataset.hpDone!==a.heroIndex+'b')drawInto(cv,a.heroIndex,{bust:true});});
 const me=s.actors.find(a=>a.player),cp=document.querySelector('#castPortrait');if(me&&cp&&cp.dataset.hpDone!==me.heroIndex+'b')drawInto(cp,me.heroIndex,{bust:true});
 document.querySelectorAll('canvas[data-gear-portrait]').forEach(cv=>{const a=s.actors[+cv.dataset.gearPortrait];if(a&&cv.dataset.hpDone!==a.heroIndex+'b')drawInto(cv,a.heroIndex,{bust:true});});}
// 3) 選手看板：本命英雄
function board(){const b=document.querySelector('#playerBoard .pb-head');if(!b||typeof selected!=='number')return;const old=b.querySelector('.hp-main');if(old&&+old.dataset.hpi===selected)return;old?.remove();const c=avatar(selected,'hp-ava hp-main');c.title=`本命：${heroes[selected].name}`;b.prepend(c);}

function run(){document.querySelectorAll(SEL).forEach(decorate);portraits();board();}
let queued=false;const kick=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;try{run();}catch(err){console.warn(err);}});};
new MutationObserver(muts=>{for(const m of muts)if(m.addedNodes.length&&[...m.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('hp-ava'))){kick();return;}}).observe(document.body,{childList:true,subtree:true});
// 轉播頭像會被原本的程式重畫，定時補畫（只動已標記的小畫布）
setInterval(()=>{if(typeof state!=="undefined"&&state?.actors){document.querySelectorAll('canvas[data-hp-done]').forEach(cv=>{delete cv.dataset.hpDone;});portraits();}},1500);
run();
window.HERO_UI={run,drawInto};
})();
