'use strict';
// 0.43 選手成長：八項能力、潛力與成長類型、位置熟悉度、風格專長、體力、遞減成長、英雄熟練度四級與衰退。
(()=>{
const ATTRS=[['laning','對線'],['mechanics','操作'],['teamfight','團戰'],['awareness','意識'],['macro','運營'],['teamwork','溝通'],['mental','心態'],['stamina','體能']];
const KEYS=ATTRS.map(a=>a[0]),NAME=Object.fromEntries(ATTRS);
// 各位置的能力權重（對線、操作、團戰、意識、運營、溝通、心態、體能）
const WEIGHT=[[.2,.15,.15,.1,.15,.1,.1,.05],[.05,.15,.15,.2,.2,.1,.1,.05],[.2,.2,.15,.15,.1,.05,.1,.05],[.2,.2,.2,.1,.05,.05,.15,.05],[.1,.05,.15,.25,.15,.2,.05,.05]];
const TYPES={early:'早熟型',normal:'平均型',late:'晚熟型'};
const COURSES=[['laning','對線特訓',{laning:3,mechanics:1}],['mechanics','操作練習',{mechanics:3}],['teamfight','團戰演練',{teamfight:3,teamwork:1}],['awareness','重播分析',{awareness:3,macro:1}],['macro','戰術會議',{macro:3,awareness:1}],['teamwork','團隊訓練',{teamwork:3}],['mental','心理輔導',{mental:3}],['stamina','體能訓練',{stamina:3}],['rest','休息',null]];
const TIER=m=>m>=85?'招牌':m>=60?'精通':m>=30?'熟悉':'生疏';
const r1=v=>Math.round(v*10)/10;
// 0.80 熟練度越高越難練：50 以上收益遞減；訓練、事件與低段位最多練到 80，再往上只能靠實戰（天梯翠曜以上、聯賽與職業比賽）。
const M_CAP=80,M_REAL_TIER=5;
function mFactor(m){return m<50?.5*(1-m/110):m<M_CAP?.1*(1-(m-50)/40)+.015:.1;}
function addMastery(i,base,real){const h=heroes[i];if(!h||base<=0)return 0;const cap=real?100:M_CAP;if(h.mastery>=cap)return 0;const g=Math.min(base*mFactor(h.mastery),cap-h.mastery);h.mastery=r1(h.mastery+g);return g;}
const realPlay=c=>!!c&&(c.stage!=='ladder'||(window.LADDER?.data?.tier??0)>=M_REAL_TIER);
function hash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function ensure(c,young){if(!c)return c;const R=rng(hash(c.id+'g'));
 for(const k of KEYS)if(c.stats[k]==null)c.stats[k]=young?Math.round(35+R()*10):Math.round(40+R()*10);
 if(c.pot==null)c.pot=Math.round(72+R()*22);
 if(!c.growth)c.growth=['early','normal','normal','late'][Math.floor(R()*4)];
 if(!c.roleFam){c.roleFam=[0,1,2,3,4].map(r=>r===c.role?(young?65:80):Math.round(15+R()*20));}
 if(!c.styles){const tags=Object.keys(DRAFT.TAG_NAME).sort(()=>R()-.5);c.styles={like:tags.slice(0,2),dislike:tags[2]};}
 if(c.energy==null)c.energy=80;if(c.clock==null)c.clock=0;if(!c.heroUse)c.heroUse={};if(c.fans==null)c.fans=0;return c;}
function ageMul(c){const a=c.age,t=c.growth;if(t==='early')return a<=20?1.3:a<=23?1:.6;if(t==='late')return a<=20?.8:a<=25?1.15:.9;return a<=22?1.1:a<=25?1:.8;}
function gain(c,k,base){const v=c.stats[k],pot=c.pot,f=v>=pot?.05:Math.max(.08,(pot-v)/(pot-20)),g=base*ageMul(c)*f;c.stats[k]=Math.min(100,r1(v+g));return g;}
const cost=c=>Math.max(5,r1(12-c.stats.stamina/12));
function train(c,key){ensure(c);if(key==='rest'){c.energy=Math.min(100,c.energy+30);return true;}const co=COURSES.find(x=>x[0]===key);if(!co||c.energy<cost(c))return false;c.energy=r1(c.energy-cost(c));for(const [k,b] of Object.entries(co[2]))gain(c,k,b);return true;}
function heroTrain(c,i){ensure(c);if(c.energy<cost(c)||!heroes[i]||heroes[i].mastery>=M_CAP)return false;c.energy=r1(c.energy-cost(c));addMastery(i,6,false);c.heroUse[i]=c.clock;return true;}
function matchXP(c,mult,hero,win){ensure(c);const m=mult||1;for(const [k,b] of [['laning',.6],['mechanics',.5],['teamfight',.6],['awareness',.4],['macro',.4],['mental',.3]])gain(c,k,b*m);
 c.roleFam[c.role]=Math.min(100,c.roleFam[c.role]+1);c.energy=Math.max(0,r1(c.energy-8+c.stats.stamina/20));
 if(hero!=null&&heroes[hero]){addMastery(hero,3+(win?2:0),realPlay(c));c.heroUse[hero]=c.clock;}}
function tick(c){ensure(c);c.clock++;if(window.META)META.weekly(c);const spare=typeof training==='number'?Math.max(0,Math.min(3,training)):0;c.energy=Math.min(100,r1(c.energy+12+c.stats.stamina/10+spare*30));const lost=[];
 if(c.clock%4===0)heroes.forEach((h,i)=>{if(h.mastery>30&&(c.heroUse[i]??-99)<c.clock-8){h.mastery=r1(h.mastery-1);if(h.role===c.role)lost.push(i);}});return lost;}
function age(c){ensure(c);const a=c.age,start=c.growth==='early'?24:c.growth==='late'?27:25;if(a>=start){const d=Math.min(4,1+Math.floor((a-start)/1.5));c.stats.mechanics=Math.max(20,r1(c.stats.mechanics-d));c.stats.laning=Math.max(20,r1(c.stats.laning-d*.6));c.stats.stamina=Math.max(20,r1(c.stats.stamina-d*.5));}
 if(a<=29){c.stats.awareness=Math.min(100,r1(c.stats.awareness+1));c.stats.macro=Math.min(100,r1(c.stats.macro+1));}}
function overall(c){ensure(c);const w=WEIGHT[c.role];return KEYS.reduce((x,k,i)=>x+w[i]*c.stats[k],0);}
function rating(c){if(!c)return 70;const fam=.9+.1*(c.roleFam?.[c.role]??80)/100,en=(c.energy??80)<30?.95:1;return Math.round((40+overall(c)*.6)*fam*en);}
function pool(role){return heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===role).sort((a,b)=>heroes[b].mastery-heroes[a].mastery).slice(0,4);}
function styleMul(c,hero){if(!c?.styles||hero==null)return 1;const tags=DRAFT.TAGS[hero].tags;let m=1;for(const t of c.styles.like)if(tags.includes(t))m+=.04;if(tags.includes(c.styles.dislike))m-=.04;return m;}

// ---------- 畫面 ----------
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function stars(p){const n=Math.max(1,Math.min(5,Math.round((p-65)/6)));return '★'.repeat(n)+'☆'.repeat(5-n);}
function card(c){ensure(c);const ROLE=['上路','打野','中路','射手','輔助'];
 return `<article class="panel growth-card"><h3>選手卡 <small>綜合 ${rating(c)} · 潛力 ${stars(c.pot)} · ${TYPES[c.growth]}</small></h3>
 <div class="growth-attrs">${ATTRS.map(([k,n])=>`<div><span>${n}</span><i style="--v:${c.stats[k]}%"></i><b>${Math.round(c.stats[k])}</b></div>`).join('')}</div>
 <p class="muted">體力 ${Math.round(c.energy)} / 100 · 每次訓練消耗 ${cost(c)}${c.energy<30?' · <b class="bad">體力不足，比賽表現下降</b>':''}</p>
 <p class="muted">位置熟悉：${ROLE.map((r,i)=>`${r} ${Math.round(c.roleFam[i])}`).join('・')}</p>
 <p class="muted">擅長：${c.styles.like.map(t=>DRAFT.TAG_NAME[t]).join('、')}型英雄 · 不擅長：${DRAFT.TAG_NAME[c.styles.dislike]}型</p></article>`;}
function coursesHTML(c,enabled){ensure(c);return COURSES.filter(([k])=>k!=='rest').map(([k,n,g])=>{const off=!enabled||!training||(k!=='rest'&&c.energy<cost(c));return `<button data-course="${k}" ${off?'disabled':''}>${n}<small>${g?Object.keys(g).map(x=>NAME[x]+' ↑').join(' '):'體力 +30'}</small></button>`;}).join('');}
// 把畫面中的 .courses 換成完整訓練項目，並附上選手卡
function decorate(root,c,enabled,refresh){if(!root||!c)return;ensure(c);const box=root.querySelector('.courses');if(box){box.classList.add('growth-courses');box.innerHTML=coursesHTML(c,enabled);
  box.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{if(!enabled||!training)return;if(GROWTH.train(c,b.dataset.course)){training--;CAREER.save();refresh();}});}
 if(!root.querySelector('.growth-card')){const grid=root.querySelector('.careergrid');if(grid)grid.insertAdjacentHTML('afterend',card(c));}}
function heroBadges(){const c=CAREER.data;document.querySelectorAll('#heroes [data-hero]').forEach(b=>{const i=+b.dataset.hero,m=heroes[i].mastery;let s=b.querySelector('.tier');if(!s){s=document.createElement('em');s.className='tier';b.querySelector('strong')?.append(s);}s.textContent=` ${TIER(m)}${c&&styleMul(c,i)>1?' · 擅長':c&&styleMul(c,i)<1?' · 不擅長':''}`;s.dataset.tier=TIER(m);});}

// ---------- 掛勾 ----------
// 建立生涯：在 #start 上記下「是從畫面建立的」，天梯開局只在這種情況啟用（程式直接呼叫 CAREER.create 仍是青訓開局）
$('#start').addEventListener('click',()=>{if(!CAREER.data)window.__CREATE_FROM_UI=true;},true);
const prevRender=renderSetup;
renderSetup=function(){const c=CAREER.data;if(c)ensure(c,c.stage==='ladder');prevRender();heroBadges();
 const hub=document.querySelector('#careerHub');if(c&&hub&&!c.pro&&c.stage!=='ladder')decorate(hub,c,c.stage==='camp',()=>renderSetup());};
// 英雄專項訓練（取代原本 +8）
const prevTrain=$('#train').onclick;
$('#train').onclick=ev=>{const c=CAREER.data;if(!c){prevTrain?.(ev);return;}const ok=c.stage==='camp'||c.stage==='ladder'||(c.pro&&!c.pro.live&&!c.pro.ended);if(!ok||!training)return;if(GROWTH.heroTrain(c,selected)){training--;CAREER.save();renderSetup();}};
// 比賽中的能力效果（只在生涯比賽生效）
const prevDamage=bDamage;
bDamage=function(from,to,amount){const s=state,c=CAREER.data;if(c&&s&&(s.careerMatchId||s.proGame)&&from?.player&&to?.kind==='hero'){ensure(c);const v=s.time<840?c.stats.laning:c.stats.teamfight;let m=(.94+v/800)*styleMul(c,from.heroIndex);if(c.energy<30)m*=.94;if(s.gold&&s.gold[0]<s.gold[1]*.9)m*=.94+c.stats.mental/800;amount*=m;}return prevDamage(from,to,amount);};
// 生涯比賽結束：比賽經驗、英雄熟練、一週過去
const prevFinish=finish;
finish=function(){const s=state,c=CAREER.data,was=!!(s&&!s.done&&c&&(s.careerMatchId||s.proGame)),big=s?.proGame?1.4:1,hero=s?.actors?.find(a=>a.player)?.heroIndex;prevFinish();
 if(was&&state.done){matchXP(c,big,hero,state.winner===0);if(!c.pro)tick(c);CAREER.save();}};
Object.assign(window.ESPORTS,{bDamage});
window.GROWTH={ATTRS,KEYS,NAME,WEIGHT,TYPES,COURSES,TIER,ensure,gain,train,heroTrain,matchXP,tick,age,overall,rating,pool,styleMul,card,coursesHTML,decorate,cost,addMastery,mFactor,M_CAP,realPlay};
renderSetup();
})();
