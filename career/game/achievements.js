'use strict';
// 0.82 成就與稱號：參照足球人生的「跨生涯成就收藏櫃」（分類、銅銀金分級、稀有度、隱藏成就、解鎖提示），
// 加上 MOBA 職業賽常見的高光時刻（一血、多殺、超神、搶龍、逆轉）。成就不影響數值；解鎖後可以把它設為稱號，顯示在選手名字旁。
(()=>{
const KEY='esports-ach-v1',TIER=['銅','銀','金'],RAR={c:'常見',r:'稀有',e:'史詩',l:'傳說'};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let store={got:{},title:null};try{Object.assign(store,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{}
const saveStore=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}};
const C=()=>window.CAREER?.data||null,P=()=>C()?.pro||null,LD=()=>{try{return window.LADDER?.data||null;}catch{return null;}};
const cnt=k=>C()?.achC?.[k]||0;
function bump(k,n=1){const c=C();if(!c)return;c.achC||={};c.achC[k]=(c.achC[k]||0)+n;}
const titles=()=>(P()?.achievements||[]).map(a=>a.title);
const has=re=>titles().some(t=>re.test(t));
const count=re=>titles().filter(t=>re.test(t)).length;
function legend(){const p=P(),c=C();if(!p||!c)return 0;if(window.SCORE)return SCORE.calc(c).sc;return Math.round((p.achievements||[]).reduce((x,a)=>x+a.pts,0)+(p.games||0)*.1+(c.fans||0)/400);}
const regions=()=>{const p=P();if(!p||!window.WORLD)return 0;const tags=new Set([...(p.teamsPlayed||[]),p.team]);return new Set([...tags].map(t=>WORLD.team(t)?.region).filter(Boolean)).size;};
const peakTier=()=>{const c=C(),l=LD();return Math.max(c?.ladderDone?.peak??-1,c?.ladderDone?.tier??-1,l?Math.max(l.tier??0,l.peak??0):-1);};
const ageAt=y=>{const c=C(),p=P();return c&&p?c.age-(p.year-y):99;};

// lv：分級門檻（值 ≥ 門檻即達該級）；tn：各級稱號；hid：隱藏成就
const ACH=[
 // ---- 對戰高光 ----
 {id:'fb',cat:'對戰',n:'第一滴血',d:'拿下一血 1／10／30 次',lv:[1,10,30],tn:['第一滴血','見血封喉','開局殺手'],r:'c',v:()=>cnt('fb')},
 {id:'triple',cat:'對戰',n:'三殺',d:'單場拿下三殺 1／5／15 次',lv:[1,5,15],tn:['三殺','三殺常客','收割機'],r:'r',v:()=>cnt('triple')},
 {id:'quadra',cat:'對戰',n:'四殺',d:'單場拿下四殺',r:'e',v:()=>cnt('quadra')},
 {id:'penta',cat:'對戰',n:'五殺',d:'單場一個人殺光對面五人',lv:[1,3,5],tn:['五殺','五殺狂魔','團滅製造機'],r:'l',v:()=>cnt('penta')},
 {id:'legendary',cat:'對戰',n:'超神',d:'不死連續擊殺 8 人',r:'e',v:()=>cnt('legendary')},
 {id:'perfect',cat:'對戰',n:'完美比賽',d:'贏球、零死亡、參與 5 次以上擊殺 1／5／15 場',lv:[1,5,15],tn:['完美比賽','零失誤','不死鳥'],r:'r',v:()=>cnt('perfect')},
 {id:'steal',cat:'對戰',n:'虎口奪食',d:'在對手面前用重擊搶下小龍',r:'r',v:()=>cnt('stealDragon')},
 {id:'baronsteal',cat:'對戰',n:'深淵竊賊',d:'在對手面前用重擊搶下深淵領主',r:'l',hid:true,v:()=>cnt('stealBaron')},
 {id:'comeback',cat:'對戰',n:'逆風翻盤',d:'經濟落後 5000 以上逆轉獲勝',r:'e',v:()=>cnt('comeback')},
 {id:'stomp',cat:'對戰',n:'速戰速決',d:'20 分鐘內贏下比賽 1／5／15 場',lv:[1,5,15],tn:['速戰速決','閃電戰','二十分鐘投降'],r:'r',v:()=>cnt('stomp')},
 {id:'lvl1',cat:'對戰',n:'一級團得手',d:'開場 90 秒內拿下擊殺',r:'c',v:()=>cnt('lvl1kill')},
 {id:'farmer',cat:'對戰',n:'補刀機器',d:'單場補刀 150／200／250',lv:[150,200,250],tn:['補刀機器','經濟大師','農場主'],r:'r',v:()=>cnt('bestCS')},
 // ---- 天梯 ----
 {id:'climber',cat:'天梯',n:'天梯攀登者',d:'天梯最高段位達到 耀金／鑽晶／巔峰王者',lv:[3,6,9],tn:['耀金玩家','鑽晶玩家','巔峰王者'],r:'r',v:()=>Math.max(0,peakTier())},
 {id:'promo',cat:'天梯',n:'晉級賽親自上',d:'親自上場打贏晉級賽 1／5 場',lv:[1,5],tn:['晉級成功','大賽型選手'],r:'c',v:()=>cnt('promoWin')},
 {id:'cup',cat:'天梯',n:'網咖盃冠軍',d:'拿下網咖盃冠軍',r:'r',v:()=>C()?.ladderDone?.cup||LD()?.cupWins||0},
 {id:'scholar',cat:'天梯',n:'文武雙全',d:'課業 80 以上時通過試訓',r:'r',v:()=>(C()?.ladderDone?.school??0)>=80?1:0},
 {id:'lastbus',cat:'天梯',n:'最後一班車',d:'靠季末的最後機會試訓成功',r:'c',v:()=>C()?.ladderDone?.last?1:0},
 {id:'abroad',cat:'天梯',n:'出國深造',d:'通過海外隊伍的試訓',r:'e',v:()=>C()?.ladderDone?.foreign?1:0},
 {id:'switch',cat:'天梯',n:'換路重生',d:'天梯期間換過主路線，最後仍被球探看上',r:'c',v:()=>(C()?.ladderDone?.roleChanges||0)>0?1:0},
 // ---- 榮譽 ----
 {id:'academy',cat:'榮譽',n:'青訓冠軍',d:'拿下青訓聯賽冠軍',r:'r',v:()=>C()?.champion?1:0},
 {id:'domestic',cat:'榮譽',n:'聯賽霸主',d:'國內賽事冠軍 1／3／6 座',lv:[1,3,6],tn:['聯賽冠軍','王朝建立者','聯賽霸主'],r:'r',v:()=>count(/冠軍$/)-count(/^\d*\s*(霧河世界大賽|季中邀請賽|開季先鋒賽) 冠軍$/)},
 {id:'fs',cat:'榮譽',n:'開季先鋒',d:'拿下開季先鋒賽冠軍',r:'r',v:()=>count(/開季先鋒賽 冠軍$/)},
 {id:'msi',cat:'榮譽',n:'季中之王',d:'拿下季中邀請賽冠軍',r:'e',v:()=>count(/季中邀請賽 冠軍$/)},
 {id:'worlds',cat:'榮譽',n:'霧河之巔',d:'世界大賽冠軍 1／2／3 座',lv:[1,2,3],tn:['世界冠軍','二冠王','三冠王朝'],r:'e',v:()=>count(/霧河世界大賽 冠軍$/)},
 {id:'slam',cat:'榮譽',n:'大滿貫',d:'同一年拿下季中邀請賽與世界大賽冠軍',r:'l',v:()=>{const a=P()?.achievements||[];return a.some(x=>/季中邀請賽 冠軍$/.test(x.title)&&a.some(y=>y.year===x.year&&/霧河世界大賽 冠軍$/.test(y.title)))?1:0;}},
 {id:'best',cat:'榮譽',n:'年度最佳',d:'拿下年度最佳位置 1／3／5 次',lv:[1,3,5],tn:['年度最佳','聯賽門面','位置代名詞'],r:'r',v:()=>count(/^年度最佳/)},
 {id:'hof',cat:'榮譽',n:'名人堂',d:'生涯分達到 400／600／900',lv:[400,600,900],tn:['明星選手','名人堂','傳奇'],r:'e',v:legend},
 // ---- 軌跡 ----
 {id:'zero2hero',cat:'軌跡',n:'從網咖到世界',d:'從天梯玩家出身，最後拿下世界大賽冠軍',r:'l',hid:true,v:()=>C()?.ladderDone&&count(/霧河世界大賽 冠軍$/)?1:0},
 {id:'prodigy',cat:'軌跡',n:'神童',d:'19 歲以前拿下世界大賽冠軍',r:'e',hid:true,v:()=>(P()?.achievements||[]).some(a=>/霧河世界大賽 冠軍$/.test(a.title)&&ageAt(a.year)<=18)?1:0},
 {id:'loyal',cat:'軌跡',n:'一人一隊',d:'職業生涯 6 年以上只效力一支隊伍',r:'r',v:()=>{const p=P();return p&&(p.year-2027)>=6&&(p.teamsPlayed||[p.team]).length<=1?1:0;}},
 {id:'globe',cat:'軌跡',n:'環遊世界',d:'在 3 個不同賽區打過職業賽',r:'e',v:()=>regions()>=3?1:0},
 {id:'nemesis',cat:'軌跡',n:'宿敵終結者',d:'與宿敵交手 5 勝以上、一場沒輸',r:'r',v:()=>{const r=P()?.rival;return r&&r.w>=5&&r.l===0?1:0;}},
 {id:'veteran',cat:'軌跡',n:'老而彌堅',d:'28 歲仍是職業隊先發',r:'r',v:()=>{const c=C(),p=P();return c&&p&&c.age>=28&&!p.ended&&p.players?.find(x=>x.user)?.starter?1:0;}},
 {id:'master',cat:'軌跡',n:'招牌英雄',d:'一隻英雄熟練度練到 100',r:'r',v:()=>window.heroes?.some(h=>h.mastery>=100)?1:0},
 {id:'pool',cat:'軌跡',n:'英雄池深不見底',d:'自己位置有 3／5／8 隻英雄熟練度 80 以上',lv:[3,5,8],tn:['英雄池深','萬金油','什麼都會'],r:'e',v:()=>{const c=C();return c&&window.heroes?heroes.filter(h=>h.role===c.role&&h.mastery>=80).length:0;}},
 {id:'scrims',cat:'軌跡',n:'練習賽狂人',d:'打了 20／60／120 場練習賽',lv:[20,60,120],tn:['練習生','訓練室常駐','練習賽狂人'],r:'c',v:()=>P()?.scrims||0},
 {id:'afterlife',cat:'軌跡',n:'人生下半場',d:'退役後轉任教練、成為賽評或全職實況主',r:'c',v:()=>['轉任教練','成為賽評','全職實況主'].includes(P()?.ended?.path)?1:0},
 // ---- 趣味 ----
 {id:'bench',cat:'趣味',n:'板凳哲學家',d:'坐板凳看隊友打了 10 個系列賽',r:'c',v:()=>(P()?.benched||0)>=10?1:0},
 {id:'fans',cat:'趣味',n:'人氣王',d:'粉絲達到 1000／5000／20000',lv:[1000,5000,20000],tn:['小有名氣','人氣選手','國民偶像'],r:'r',v:()=>C()?.fans||0},
 {id:'ordinary',cat:'軌跡',n:'平凡也是一種人生',d:'走完一段沒有站上職業舞台的人生',r:'c',hid:true,v:()=>C()?.ending?1:0},
 {id:'lastchance',cat:'軌跡',n:'最後一班車',d:'在天梯最後一季通過試訓',r:'r',hid:true,v:()=>C()?.ladderDone&&(C()?.ladder?.season||0)>=3?1:0},
 {id:'feeder',cat:'趣味',n:'送頭專家',d:'單場死亡 10 次以上',r:'c',hid:true,v:()=>cnt('feed10')},
 {id:'rich',cat:'趣味',n:'千萬身價',d:'職業存款達到 1000 萬',r:'r',v:()=>(P()?.money||0)>=1000?1:0},
];
const levelOf=(a,v)=>a.lv?a.lv.filter(x=>v>=x).length:(v>0?1:0);
const nameOf=(a,l)=>a.tn?a.tn[Math.max(0,l-1)]:a.n;
const tierLabel=(a,l)=>a.lv&&a.lv.length>1?`${TIER[Math.min(2,l-1+(3-a.lv.length))]}・`:'';

// ---------- 判定與提示 ----------
let queue=[],showing=false;
function toast(text,sub){queue.push([text,sub]);if(!showing)next();}
function next(){const it=queue.shift();if(!it){showing=false;return;}showing=true;const t=document.createElement('div');t.className='ach-toast';t.setAttribute('role','status');t.innerHTML=`<small>${esc(it[1])}</small><b>${esc(it[0])}</b>`;document.body.append(t);
 requestAnimationFrame(()=>t.classList.add('on'));setTimeout(()=>{t.classList.remove('on');setTimeout(()=>{t.remove();next();},350);},2600);}
function check(quiet){const c=C();if(!c)return [];c.achGot||={};const newly=[];
 for(const a of ACH){let v=0;try{v=a.v()||0;}catch{}const l=levelOf(a,v);if(l<=(c.achGot[a.id]||0))continue;c.achGot[a.id]=l;
  const prev=store.got[a.id]?.l||0;if(l>prev){store.got[a.id]={l,at:Date.now()};newly.push([a,l]);}}
 if(newly.length){saveStore();if(!quiet)for(const [a,l] of newly)toast(nameOf(a,l),`成就解鎖・${RAR[a.r]}${a.lv?'・'+(l>1?'升級':'達成'):''}`);paintTitle();}
 return newly;}

// ---------- 比賽中的高光 ----------
const liveHero=a=>a&&a.kind==='hero'&&a.hp>0&&!(a.dead>0);
function M(){const s=state;if(!s)return null;return s.achM||(s.achM={chain:0,last:-99,streak:0,maxStreak:0,maxChain:0,minDiff:0,fb:false,hist:(s.history||[]).length,smites:s.personal?.smites||0});}
const prevDamage=bDamage;
bDamage=function(from,to){const was=liveHero(to),total=state?state.kills[0]+state.kills[1]:0;const r=prevDamage.apply(this,arguments);
 if(was&&state&&!liveHero(to)&&C()){const m=M(),t=state.time;
  if(from?.player){if(total===0)m.fb=true;if(t<90)m.lvl1=true;m.chain=t-m.last<=10?m.chain+1:1;m.last=t;m.maxChain=Math.max(m.maxChain,m.chain);m.streak++;m.maxStreak=Math.max(m.maxStreak,m.streak);}
  if(to.player){m.streak=0;m.chain=0;}}
 return r;};
const prevTick=tick;
tick=function(dt){prevTick(dt);const s=state;if(!s||s.done||!C())return;const m=M();m.minDiff=Math.min(m.minDiff,s.gold[0]-s.gold[1]);
 const h=s.history||[];if(h.length>m.hist){const sm=s.personal?.smites||0;for(const e of h.slice(m.hist))if(e.kind==='objective'&&e.team===0&&sm>m.smites){const o=/深淵領主/.test(e.name)?s.baron:s.dragon;if(o&&s.actors.some(b=>b.team===1&&liveHero(b)&&Math.hypot(b.x-o.x,b.y-o.y)<260))bump(/深淵領主/.test(e.name)?'stealBaron':'stealDragon');}m.hist=h.length;}
 m.smites=s.personal?.smites||0;};
const prevFinish=finish;
finish=function(){const s=state,was=s?.done,promo=!!s?.ladderPromo;prevFinish.apply(this,arguments);if(was||!state?.done||!C())return;
 const m=M(),p=s.personal||{},win=s.winner===0||(s.winner==null&&s.kills[0]>s.kills[1]);
 if(m.fb)bump('fb');if(m.lvl1)bump('lvl1kill');if(m.maxChain>=5)bump('penta');else if(m.maxChain===4)bump('quadra');else if(m.maxChain===3)bump('triple');
 if(m.maxStreak>=8)bump('legendary');if(win&&!p.deaths&&(p.kills||0)+(p.assists||0)>=5)bump('perfect');if(win&&m.minDiff<=-5000)bump('comeback');if(win&&s.time<1200)bump('stomp');
 if((p.deaths||0)>=10)bump('feed10');const c=C();c.achC||={};c.achC.bestCS=Math.max(c.achC.bestCS||0,p.cs||0);if(promo&&win)bump('promoWin');
 CAREER.save?.();check();};

// ---------- 收藏櫃與稱號 ----------
const CATS=['對戰','天梯','榮譽','軌跡','趣味'];
function cabinet(){let d=document.querySelector('#achDialog');if(!d){d=document.createElement('dialog');d.id='achDialog';d.className='life-dialog ach-dialog';document.body.append(d);
  d.addEventListener('click',e=>{if(e.target===d)d.close();const b=e.target.closest('[data-title]');if(b){store.title=store.title===b.dataset.title?null:b.dataset.title;saveStore();paintTitle();render(d);}if(e.target.closest('#achClose'))d.close();});}
 render(d);d.showModal?d.showModal():d.setAttribute('open','');}
function render(d){const got=store.got,n=ACH.filter(a=>got[a.id]).length;
 d.innerHTML=`<div class="life-dialog-head"><h2>🏆 成就收藏櫃 <small>${n} / ${ACH.length}</small></h2><button class="quiet" id="achClose">關閉 ✕</button></div>
 <p class="muted">成就跨生涯保存在這台裝置，不影響能力數值。已解鎖的成就可以設為稱號，顯示在選手名字旁邊。${store.title?`目前稱號：<b>${esc(curTitle())}</b>`:''}</p>
 ${CATS.map(cat=>`<h3 class="ach-cat">${cat}</h3><div class="ach-grid">${ACH.filter(a=>a.cat===cat).map(a=>{const l=got[a.id]?.l||0,hid=a.hid&&!l;
  return `<div class="ach-row r-${a.r}${l?'':' locked'}"><div><b>${hid?'？？？':esc(l?tierLabel(a,l)+nameOf(a,l):a.n)}</b><small>${hid?'隱藏成就：達成後才會顯示名稱和條件':esc(a.d)}</small><em>${RAR[a.r]}${a.lv&&l?` · 等級 ${l}/${a.lv.length}`:''}</em></div>${l?`<button type="button" class="quiet" data-title="${a.id}" aria-pressed="${store.title===a.id}">${store.title===a.id?'使用中':'設為稱號'}</button>`:''}</div>`;}).join('')}</div>`).join('')}`;}
function curTitle(){const a=ACH.find(x=>x.id===store.title),l=a&&store.got[a.id]?.l;return a&&l?nameOf(a,l):'';}
function paintTitle(){const name=document.querySelector('#lifeName');if(!name)return;let t=document.querySelector('#lifeTitle');const txt=curTitle();
 if(!txt){t?.remove();return;}if(!t){t=document.createElement('em');t.id='lifeTitle';t.className='life-title';name.after(t);}if(t.textContent!==txt)t.textContent=txt;}
function mountBtn(){const nav=document.querySelector('.life-nav');if(!nav||nav.querySelector('#lifeAch'))return;const b=document.createElement('button');b.id='lifeAch';b.type='button';b.innerHTML='<span class="ach-ico" aria-hidden="true">🏆</span><span class="ach-lbl">成就</span>';b.setAttribute('aria-label','成就收藏櫃');b.title='成就收藏櫃與稱號';b.onclick=cabinet;nav.append(b);}
// 生涯結局頁：列出這段生涯解鎖的成就
function endingCard(){const btn=document.querySelector('#proNewCareer');if(!btn||document.querySelector('.ach-ending'))return;const g=C()?.achGot||{},list=ACH.filter(a=>g[a.id]);const box=document.createElement('div');box.className='ach-ending';
 box.innerHTML=`<p class="eyebrow">這段生涯的成就（${list.length}）</p>${list.length?`<div class="ach-grid">${list.map(a=>`<div class="ach-row r-${a.r}"><div><b>${esc(tierLabel(a,g[a.id])+nameOf(a,g[a.id]))}</b><small>${esc(a.d)}</small><em>${RAR[a.r]}</em></div></div>`).join('')}</div>`:'<p class="muted">這段生涯沒有解鎖成就。收藏櫃裡還有很多空位。</p>'}`;btn.before(box);}
const prevRender=renderSetup;renderSetup=function(){const r=prevRender.apply(this,arguments);try{mountBtn();paintTitle();check();endingCard();}catch(e){console.warn(e);}return r;};
mountBtn();paintTitle();
// 0.82 頁首是 sticky，高度會隨手機排版改變：捲動定位的預留空間跟著頁首實際高度走，避免內容被蓋住
try{const hdr=document.querySelector('header.life-header');if(hdr&&window.ResizeObserver)new ResizeObserver(()=>{document.documentElement.style.scrollPaddingTop=Math.round(hdr.getBoundingClientRect().height+8)+'px';}).observe(hdr);}catch{}
window.ACHIEVE={ACH,check,cabinet,get store(){return store;},bump,levelOf};
})();
