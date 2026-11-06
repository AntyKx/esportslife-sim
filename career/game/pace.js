'use strict';
// 0.81 比賽節奏：預設 4× 播放；「跳到關鍵時刻」用最高速快轉，遇到關鍵決定、團戰、小龍／巴龍爭奪或你殘血就停下；
// 一般播放時，團戰與巨型野怪爭奪會自動慢放到 1×，打完再回到原本速度（可關閉）。
(()=>{
const KEY='esports-pace',DEFAULT_SPEED=4,SKIP_SPEED=32,SLOW_HOLD=14;
let pref={speed:DEFAULT_SPEED,slow:true};try{Object.assign(pref,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{}
const savePref=()=>{try{localStorage.setItem(KEY,JSON.stringify(pref));}catch{}};
const $=s=>document.querySelector(s),live=a=>a&&a.kind==='hero'&&a.hp>0&&!(a.dead>0),d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function label(){const b=$('#speed');if(b&&state)b.textContent=state.speed===1?'1× 即時':state.speed+'×';const k=$('#skipBtn');if(k&&state){k.classList.toggle('on',!!state.skip);k.textContent=state.skip?'快轉中…（點一下停止）':'⏩ 跳到關鍵時刻';}
 const sl=$('#slowBtn');if(sl){sl.classList.toggle('on',pref.slow);sl.textContent=pref.slow?'慢放 開':'慢放 關';}}
// 回傳目前的關鍵狀況（沒有則回傳空字串）
// 團戰＝某處兩隊各至少 3 人聚在一起，而且這群人最近 2 秒真的在掉血（對線期各路面對面站著不算）
function hurt(s,a){const h=s.paceHp||(s.paceHp=new Map()),r=h.get(a);if(!r||s.time-r.t>=2){h.set(a,{t:s.time,hp:a.hp,prev:r?Math.max(0,r.hp-a.hp):0});return r?Math.max(0,r.hp-a.hp):0;}return Math.max(r.prev,r.hp-a.hp);}
function hot(s,H,dmg){for(const a of H){const near=H.filter(b=>d(a,b)<260),blue=near.filter(b=>b.team===0).length,red=near.length-blue;
  if(blue>=3&&red>=3){const lost=near.reduce((x,b)=>x+dmg.get(b),0),pool=near.reduce((x,b)=>x+b.maxHp,0);if(lost>pool*.08)return true;}}return false;}
function moment(s){const H=s.actors.filter(live),dmg=new Map(H.map(a=>[a,hurt(s,a)])),f=s.paceFight||(s.paceFight={on:false,last:-99,n:0});
 if(hot(s,H,dmg)){f.last=s.time;if(!f.on){f.on=true;f.n++;}}else if(f.on&&s.time-f.last>7)f.on=false;
 if(f.on)return '團戰爆發';
 for(const o of [s.dragon,s.baron])if(o?.alive&&o.hp<o.maxHp&&H.filter(a=>d(a,o)<220).length>=3)return `${o.name||(o===s.baron?'巴龍':'小龍')}爭奪`;
 return '';}
function playerDanger(s){const p=s.actors.find(a=>a.player);return live(p)&&p.hp<p.maxHp*.35&&s.actors.some(b=>b.team!==p.team&&live(b)&&d(b,p)<200)?'你陷入危險':'';}
function stopSkip(s,why){const back=s.skip?.back??pref.speed;s.skip=null;s.speed=back;if(why)log?.(`快轉停止：${why}。`);label();}
const prevStart=start;
start=function(){const r=prevStart.apply(this,arguments);if(state)init(state);return r;};
const prevSD=showDecision;showDecision=function(){const r=prevSD.apply(this,arguments);if(state?.skip&&state.decision)stopSkip(state,'關鍵時刻');return r;};
const prevTick=tick;let seen=null; // 有些入口（生涯、職業）在本檔載入前就保存了 start，所以在第一個 tick 套用預設速度
function init(s){if(s===seen)return;seen=s;if(s.time<2){s.speed=pref.speed;s.skip=null;s.slow=null;}mount();label();}
tick=function(dt){if(state&&state!==seen)init(state);prevTick(dt);const s=state;if(s&&s.speed>1&&!s.skip)mount();if(!s||s.done){if(s?.skip)stopSkip(s,'');return;}
 if(s.skip){if(s.time-s.skip.from<4)return;const m=moment(s),dg=playerDanger(s);if(s.skip.ignore){if(!m&&!dg)s.skip.ignore=false;return;}const why=s.decision?'關鍵時刻':m||dg;if(why)stopSkip(s,why);return;}
 if(!pref.slow)return;const m=moment(s);
 if(m&&s.speed>1&&!(s.slow&&s.slow.until>s.time)&&!(s.slowCool>s.time)){s.slow={until:s.time+SLOW_HOLD,back:s.speed};s.speed=1;label();}
 else if(s.slow){if(m)s.slow.until=Math.max(s.slow.until,s.time+4);else if(s.time>=s.slow.until){s.speed=s.slow.back;s.slow=null;s.slowCool=s.time+25;label();}}};
function mount(){const sp=$('#speed');if(!sp)return;if($('#skipBtn')){if(sp.nextElementSibling!==$('#skipBtn'))sp.after($('#skipBtn'),$('#slowBtn'));return;}
 const k=document.createElement('button');k.id='skipBtn';k.type='button';k.className='quiet';k.title='用最高速快轉，遇到關鍵決定、團戰、小龍／巴龍爭奪或你殘血時自動停下';
 k.onclick=()=>{const s=state;if(!s||s.done||s.decision)return;if(s.skip){stopSkip(s,'');return;}s.slow=null;s.skip={back:s.speed>1?s.speed:pref.speed,from:s.time,ignore:!!(moment(s)||playerDanger(s))};s.speed=SKIP_SPEED;s.paused=false;label();};
 const sl=document.createElement('button');sl.id='slowBtn';sl.type='button';sl.className='quiet';sl.title='團戰與巨型野怪爭奪時自動慢放到 1×';
 sl.onclick=()=>{pref.slow=!pref.slow;savePref();if(!pref.slow&&state?.slow){state.speed=state.slow.back;state.slow=null;}label();};
 sp.after(k,sl);
 // 手動切速度時記住偏好（快轉、慢放中不記）
 sp.addEventListener('click',()=>{const s=state;if(!s)return;if(s.skip)s.skip=null;if(s.slow)s.slow=null;pref.speed=s.speed;savePref();label();});}
mount();
window.PACE={moment,get pref(){return pref;}};
})();
