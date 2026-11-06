// 0.87 流程整理（參考足球人生：一次只做一件事，主按鈕只有底部行動列一顆）
// 青訓週安排：① 本週事件 → ② 訓練（可跳過）→ ③ 出發比賽；位置／英雄池／英雄榜／出裝收進 ③ 的「調整」。
// BP：對手天賦預設收合，進 BP 時捲到中間的「現在第幾手」。
// 只重排畫面，不改任何遊戲狀態。
(()=>{
const $=s=>document.querySelector(s),esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let prepOpen=false,lastStage=null,foeDone=false;
const head=(n,title,st,note)=>`<div class="flow-step ${st}"><b>${st==='done'?'✓':n}</b><h3>${title}</h3><small>${note}</small></div>`;
function camp(){
 const c=CAREER.data,hub=$('#careerHub'),art=hub?.querySelector('.careergrid>article.panel');
 const on=!!(c&&c.stage==='camp'&&art);document.body.classList.toggle('flow-camp',on);document.body.classList.toggle('flow-prep-open',on&&prepOpen);
 if(!on)return;
 art.querySelectorAll('.flow-step,.flow-go').forEach(x=>x.remove());
 const storyDone=c.storyChoice!==null,left=typeof training==='number'?training:0;
 const title=[...art.children].find(x=>x.tagName==='H3');
 if(title)title.insertAdjacentHTML('beforebegin',head('①','本週事件',storyDone?'done':'now',storyDone?'已完成':'先做選擇'));
 const tabs=art.querySelector('#trainTabs')||art.querySelector('.courses');
 if(tabs){tabs.insertAdjacentHTML('beforebegin',head('②',`訓練 · 還能練 ${left} 次`,!storyDone?'wait':left>0?'now':'done',!storyDone?'等上一步完成':left>0?`沒練的自動休息 +30`:'本週練完了'));
  const s=tabs.previousElementSibling;s.classList.add('flow-train');}
 const h=typeof heroes!=="undefined"&&typeof selected!=="undefined"?heroes[selected]:null,plan=$('.equipment-planner .build-plans .selected')?.textContent||'位置推薦';
 const ready=storyDone&&left<=0;
 art.insertAdjacentHTML('beforeend',`${head('③','出發比賽',!storyDone?'wait':left>0?'opt':'now',!storyDone?'等上一步完成':left>0?'練完或跳過訓練後出發':'按下方「進入 BP」')}<div class="flow-go"><p>本命 <b>${esc(h?.name||'—')}</b> · 出裝 <b>${esc(plan)}</b><br><small>不調整也可以，教練會照這個設定。</small><br><small class="flow-promo">升一軍條件：打進決賽，或青訓平均評價 ${window.ENDING?.PROMO_AVG??7.5} 以上${(c.results||[]).length?`（目前 ${((c.results.reduce((x,y)=>x+(y.rating||0),0))/c.results.length).toFixed(1)}）`:''}</small></p><button type="button" class="quiet flow-prep">${prepOpen?'收起英雄池與出裝 ▴':'調整英雄池與出裝 ▾'}</button></div>`);
 art.querySelector('.flow-prep').onclick=()=>{prepOpen=!prepOpen;camp();if(prepOpen)$('#weeklyTraining')?.scrollIntoView({block:'start',behavior:'smooth'});};
 art.classList.toggle('flow-ready',ready);
}
function bp(){
 const st=CAREER.data?.stage;document.body.classList.toggle('flow-bp',st==='bp');
 if(st==='bp'&&lastStage!=='bp'){foeDone=false;setTimeout(()=>($('.pro-center')||$('#draft'))?.scrollIntoView({block:'start',behavior:'smooth'}),120);}
 if(st==='bp'&&!foeDone){const f=$('#foeTalent');if(f){foeDone=true;if(localStorage.getItem('esports-foe-open')!=='1')f.open=false;}}
 lastStage=st;
}
const prev=renderSetup;renderSetup=function(){const r=prev.apply(this,arguments);try{camp();}catch(e){console.warn(e);}return r;};
setInterval(()=>{try{bp();if(CAREER.data?.stage==='camp'&&!$('#careerHub .flow-step'))camp();}catch(e){}},300);
try{camp();}catch(e){}
window.FLOW={camp};
})();
