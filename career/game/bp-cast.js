'use strict';
// 0.87 BP 轉播：BP 右側放主播講解＋直播聊天室（取代中間欄底下的紀錄列表）。
// 只讀 CAREER.data.pending.draft 與畫面文字，不改任何狀態，也不用 Math.random（自己的亂數），不影響 BP 結果。
// 面板放在 #draft 外面，bp.js 重畫時不會被洗掉。
(()=>{
let seed=(Date.now()%2147483647)||7;const R=()=>((seed=Math.imul(seed^seed>>>13,1597334677)+1013904223>>>0)/4294967296);
const pick=a=>a[Math.floor(R()*a.length)];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE=['上路','打野','中路','射手','輔助'];
const CASTER=['主播 林恩','球評 老K'];
const NAMES=['霧河觀眾','夜貓不睡覺','中路小學生','打野都在睡','補刀機器人','鹹魚翻身','路過的鑽晶','翠曜卡關中','巔峰夢想家','網咖常客','輔助才是本體','射手要錢','開團就對了','視野在哪','後期無敵','BP 研究生','吃瓜群眾','版本答案','禁用專家'];
const nick=()=>pick(NAMES)+(R()<.5?Math.floor(R()*99):'');
const CHAT={
 ourBan:['好禁','這隻版本超強 禁得好','禁得有道理','{x} 不禁說不過去','教練有做功課'],
 theirBan:['{x} 被禁了 可惜','對面怕 {x}','{x} 又被禁','這手禁用有東西'],
 banMine:['針對 {p}！','{p} 的本命被禁了','對面有研究過 {p} 欸','壓力給到 {p}','沒關係 {p} 英雄池很深吧'],
 ourPick:['{x} 讚','這隻好用','穩','{t} 這陣容有點東西'],
 myPick:['{p} 拿 {x}！','{x} 是 {p} 的本命嗎','有自信','看 {p} 秀','{p} 的 {x} 我要看'],
 theirPick:['{x} 好強','對面選 {x} 有點怕','{x} 這版本無解','這手有點東西'],
 lane:['這就是 {p} 的對線對手','{p} 對 {x} 打得過嗎','{r}對決來了','線上要打架了'],
 idle:['BP 好緊張','這版本誰最強','教練在想什麼','主播今天好帥','剛來 現在第幾手','我先猜 {t} 贏','{p} 加油','有人跟我一樣看 BP 比看比賽緊張嗎','LUL','???','先禁再說','BP 決定一半勝負'],
 done:['陣容出來了！','開打開打','{t} 這陣容我喜歡','好期待','衝啊 {t}']
};
let panel=null,stage=null,seen=0,lastStep=-1,lastNeed='',lastDraft=null,queue=[],lastFlush=0,idleAt=0,casters=[],viewers=0;
function names(d){const c=CAREER.data,m=d.mine,o=m==='B'?'R':'B';return {p:c?.name||'你',t:d.sides[m].name,o:d.sides[o].name};}
const fill=(s,n)=>s.replace(/\{(\w)\}/g,(_,k)=>n[k]??'');
function chat(kind,n,count=1){const pool=CHAT[kind];if(!pool)return;for(let i=0;i<count;i++)queue.push({u:nick(),t:fill(pick(pool),n)});}
function cast(text,tip){casters.push({who:pick(CASTER),t:text,tip:!!tip});casters=casters.slice(-4);paintCaster();}
function ensure(){
 const draft=document.querySelector('#draft');if(!draft)return null;
 if(!stage||!stage.isConnected){stage=document.createElement('div');stage.className='bp-stage';draft.before(stage);stage.append(draft);}
 if(!panel||!panel.isConnected){panel=document.createElement('aside');panel.id='bpCast';panel.className='live-chat bp-cast';
  panel.innerHTML='<div class="bp-cast-head"><span class="lc-live">LIVE</span> BP 轉播 <small id="bcViewers"></small></div><div class="bp-cast-caster" id="bcCaster"></div><ul class="lc-list" id="bcList" aria-live="off"></ul>';panel.onclick=ev=>{if(innerWidth<1000&&!ev.target.closest('.lc-list'))panel.classList.toggle('open');};stage.append(panel);}
 return panel;}
function paintCaster(){const el=panel?.querySelector('#bcCaster');if(!el)return;el.innerHTML=casters.map((x,i)=>`<p class="${i===casters.length-1?'now':''} ${x.tip?'tip':''}"><b>${e(x.who)}</b>${e(x.t)}</p>`).join('');}
function flush(){const now=performance.now();if(now-lastFlush<420||!queue.length)return;lastFlush=now;queue=queue.slice(-10);const m=queue.shift(),list=panel.querySelector('#bcList');
 const li=document.createElement('li');li.innerHTML=`<b style="color:hsl(${(m.u.length*47)%360} 55% 62%)">${e(m.u)}</b> ${e(m.t)}`;list.append(li);while(list.children.length>40)list.firstChild.remove();list.scrollTop=list.scrollHeight;}
const PHASE_TALK={0:'BP 開始！第一輪禁用，雙方輪流各禁 3 隻英雄。',6:'第一輪禁用結束，進入第一輪選角：藍方先選 1 隻，接著紅方 2 隻、藍方 2 隻、紅方 1 隻。',12:'第二輪禁用，雙方各再禁 2 隻，這時候會針對對面還沒補上的位置。',16:'最後一輪選角！剩下的位置在這裡補齊，後手方會拿到最後一手。'};
function onEntry(x,d,n){
 if(x.note){const m=/本命 (.+)$/.exec(x.note);if(/^對手研究過/.test(x.note)&&m)cast(`場邊消息：${n.o} 賽前研究過 ${n.p} 的比賽，可能會鎖定 ${n.p} 的本命 ${m[1]}。`);return;}
 const mine=x.side===d.mine,h=x.hero>=0?ROSTER[x.hero]:null,c=CAREER.data;
 if(!h){cast(`${mine?n.t:n.o} 這手放棄禁用。`);return;}
 const nn={...n,x:h.name,r:ROLE[c.role]};
 if(x.type==='ban'){
  if(mine){cast(`${n.t} 禁用 ${h.name}。`);if(R()<.7)chat('ourBan',nn);}
  else{const top=window.GROWTH?.pool?GROWTH.pool(c.role):[];const hit=Array.isArray(top)&&top.slice(0,2).includes(x.hero);cast(`${n.o} 禁掉 ${h.name}${hit?'，這是衝著 '+n.p+' 來的！':'。'}`);chat(hit?'banMine':'theirBan',nn,hit?2:(R()<.6?1:0));}
 }else{
  if(mine&&h.role===c.role){cast(`${n.p} 親自拿下 ${h.name}！${ROLE[h.role]}確定了。`);chat('myPick',nn,3);}
  else if(mine){cast(`${n.t} 選 ${h.name}，補上${ROLE[h.role]}。`);if(R()<.6)chat('ourPick',nn);}
  else{cast(`${n.o} 選擇 ${h.name}（${ROLE[h.role]}）。`);if(h.role===c.role){chat('lane',nn,2);}else if(R()<.6)chat('theirPick',nn);}
 }}
function turnTip(d,n){
 const need=document.querySelector('#bpLock')?(document.querySelector('[data-pick]')?'pick':'ban'):document.querySelector('#lockDraft')?'done':'';
 const key=d.step+need;if(key===lastNeed)return;lastNeed=key;
 const side=DRAFT.ORDER[d.step]?.[0],sideName=side?`${side==='B'?'藍方':'紅方'} ${d.sides[side].name}`:'';
 if(need==='ban')cast(`${sideName} 的禁用回合，第 ${d.step+1} 手。`);
 else if(need==='pick')cast(`${sideName} 輪到${ROLE[CAREER.data.role]}選角，就看 ${n.p} 拿出什麼英雄。`);
 else if(need==='done'){const ev=(document.querySelector('.pro-center p')?.textContent||'').replace(/你的對線/g,n.p+' 的對線').replace(/我方/g,n.t).replace(/對手/g,n.o);cast(`雙方陣容出爐！${ev}`);chat('done',n,3);}
}
function tick(){
 const c=window.CAREER?.data,d=c?.stage==='bp'?c.pending?.draft:null,draftEl=document.querySelector('#draft');
 const on=!!(d&&draftEl&&!draftEl.hidden);document.body.classList.toggle('bp-cast-on',on);
 if(!on)return;
 if(!ensure())return;
 if(d!==lastDraft){lastDraft=d;seen=0;lastStep=-1;lastNeed='';casters=[];queue=[];panel.querySelector('#bcList').innerHTML='';viewers=200+(c.fans||0)*2;paintCaster();}
 const n=names(d);
 if(lastStep<0&&d.step===0)cast(PHASE_TALK[0]);
 for(;seen<d.log.length;seen++){const x=d.log[seen];const idx=d.log.slice(0,seen).filter(l=>!l.note).length;if(!x.note&&PHASE_TALK[idx]&&idx>0&&lastStep>=0)cast(PHASE_TALK[idx]);onEntry(x,d,n);}
 if(lastStep<0&&d.step>0)cast(`歡迎回來，BP 進行到第 ${d.step+1} 手。`);
 lastStep=d.step;turnTip(d,n);
 const now=performance.now();if(now-idleAt>3500+R()*4000&&queue.length<2){idleAt=now;chat('idle',n);}
 viewers=Math.max(80,Math.round(viewers*(1+(R()-.45)*.02)));const v=panel.querySelector('#bcViewers');if(v)v.textContent=`${viewers.toLocaleString()} 人觀看`;
 const dk=document.querySelector('.action-dock'),root=document.documentElement.style;root.setProperty('--dock-h',(dk&&!dk.hidden?dk.offsetHeight:0)+'px');root.setProperty('--cast-h',(panel.offsetHeight+24)+'px');
 flush();}
setInterval(()=>{try{tick();}catch(err){console.warn(err);}},250);
addEventListener('bp-drawn',()=>{try{tick();}catch(err){}});
window.BP_CAST={tick};
})();
