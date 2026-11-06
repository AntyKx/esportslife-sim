'use strict';
// 0.60 天賦種子＋特殊能力（參考足球人生的種子、實況野球的特殊能力）
// 種子 → 天賦等級 → 潛力、成長曲線、強弱屬性、天生手感英雄、天生特殊能力。
// 特殊能力不加到 8 項屬性與綜合評分，只在比賽中觸發；位置能力只看位置，不看屬性。
// 比賽效果只作用在玩家本人、只在生涯比賽（青訓／天梯／職業），而且會反映到 AI 的開戰判斷（a.edge → macro heroPower）。
(()=>{
const ROLE=['上路','打野','中路','射手','輔助'];
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>{let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};};
const ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newSeed=()=>{let s='';for(let i=0;i<6;i++)s+=ABC[Math.floor(Math.random()*ABC.length)];return 'NX-'+s.slice(0,4)+'-'+s.slice(4);};
const cleanSeed=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,16);

// ── 能力定義：c=顏色 gold/blue/green/red，role=位置專屬，up=由哪個藍色升級 ──
const A={
 reflex:{n:'神之反應',c:'gold',up:'dodge',d:'有 16% 機率完全閃過英雄的傷害'},
 cs2:{n:'補刀機器',c:'gold',up:'cs',d:'對小兵傷害 +35%，補兵幾乎不漏'},
 heart:{n:'大心臟',c:'gold',up:'clutch',d:'季後賽、淘汰賽、決勝局傷害 +12%、承傷 −8%'},
 comeback:{n:'逆境王',c:'gold',up:'grit',d:'經濟落後越多傷害越高（最多 +20%）'},
 reaper:{n:'收割者',c:'gold',up:'finisher',d:'對 35% 血以下的英雄傷害 +25%'},
 phoenix:{n:'不死鳥',c:'gold',up:'survive',d:'每場一次，致命傷害改為保留 1 血'},
 commander:{n:'指揮官',c:'gold',up:'comm',d:'身邊隊友對英雄傷害 +8%'},
 varied:{n:'百變英雄池',c:'gold',up:'fast',d:'所有英雄熟練度練習效果 ×2'},
 dodge:{n:'反應敏捷',c:'blue',d:'有 8% 機率閃過英雄的傷害'},
 cs:{n:'補刀精準',c:'blue',d:'對小兵傷害 +15%'},
 finisher:{n:'終結者',c:'blue',d:'對 30% 血以下的英雄傷害 +12%'},
 survive:{n:'極限求生',c:'blue',d:'自己血量低於 25% 時承傷 −15%'},
 position:{n:'團戰站位',c:'blue',d:'身邊 3 名以上敵人時承傷 −10%'},
 grit:{n:'逆風不倒',c:'blue',d:'經濟落後時傷害 +6%'},
 snowball:{n:'順風滾雪球',c:'blue',d:'經濟領先時傷害 +6%'},
 clutch:{n:'抗壓',c:'blue',d:'重要比賽傷害 +5%'},
 early:{n:'速攻型',c:'blue',d:'前 15 分鐘傷害 +7%'},
 latebloom:{n:'慢慢加溫',c:'blue',d:'25 分鐘後傷害 +8%'},
 vision:{n:'視野控制',c:'blue',d:'視野範圍 +30'},
 comm:{n:'團隊溝通',c:'blue',d:'身邊隊友對英雄傷害 +4%'},
 duel:{n:'單挑王',c:'blue',role:0,d:'附近沒有其他英雄的 1 對 1 傷害 +12%'},
 tank:{n:'坦克之心',c:'blue',role:0,d:'承受英雄傷害 −8%'},
 rhythm:{n:'打野節奏',c:'blue',role:1,d:'打野怪 +20%，前 15 分鐘對英雄 +6%'},
 smite:{n:'搶龍手',c:'blue',role:1,d:'對小龍、巴龍、預示者傷害 +30%'},
 combo:{n:'法術連招',c:'blue',role:2,d:'招牌技能冷卻 −15%'},
 assassin:{n:'刺客本能',c:'blue',role:2,d:'對血量上限比自己低的英雄傷害 +10%'},
 siege:{n:'拆塔手',c:'blue',role:3,d:'對防禦塔、水晶傷害 +25%'},
 carry:{n:'後期核心',c:'blue',role:3,d:'30 分鐘後傷害 +12%'},
 angel:{n:'守護天使',c:'blue',role:4,d:'身邊隊友承傷 −6%'},
 guard:{n:'犧牲精神',c:'blue',role:4,d:'身邊殘血（<30%）隊友承傷 −15%'},
 fast:{n:'學習快',c:'green',d:'屬性訓練效果 +20%'},
 grinder:{n:'苦練型',c:'green',d:'能力可以練到潛力 +8（一般只能到潛力 +3）'},
 spark:{n:'大賽開竅',c:'green',d:'拿下頭銜、擊敗宿敵時，突破潛力的機率 ×2'},
 discipline:{n:'自律',c:'green',d:'訓練體力消耗 −20%'},
 research:{n:'英雄研究家',c:'green',d:'英雄熟練度練習效果 +30%'},
 veteran:{n:'老將智慧',c:'green',d:'年紀增長的能力衰退減半'},
 tilt:{n:'上頭',c:'red',d:'復活後 30 秒內傷害 −10%'},
 glass:{n:'玻璃心',c:'red',d:'擊殺數落後 4 以上時傷害 −10%'},
 slow:{n:'慢熱',c:'red',d:'前 10 分鐘傷害 −10%'},
 choke:{n:'大賽恐懼',c:'red',d:'重要比賽傷害 −8%'},
 lazy:{n:'懶散',c:'red',d:'屬性訓練效果 −20%'},
 wrist:{n:'手腕舊傷',c:'red',d:'訓練體力消耗 +25%'},
 feeder:{n:'送頭體質',c:'red',d:'身邊沒有隊友時承傷 +10%'},
 // 0.61 第二批
 visionking:{n:'視野之王',c:'gold',up:'vision',d:'視野範圍 +60，被多人包夾時承傷 −12%'},
 tyrant:{n:'魔王節奏',c:'gold',role:1,up:'rhythm',d:'打野怪 +40%、巨型野怪 +20%、前 15 分鐘對英雄 +10%'},
 steady:{n:'穩定輸出',c:'blue',d:'所有負面狀態的懲罰減半'},
 initiate:{n:'先手開團',c:'blue',d:'身邊有 2 名以上隊友時對英雄傷害 +6%'},
 mapsense:{n:'地圖意識',c:'blue',d:'落單被 2 名以上敵人包夾時承傷 −12%'},
 invade:{n:'反野',c:'blue',role:1,d:'打敵方野區的野怪 +25%'},
 kite:{n:'走A大師',c:'blue',role:3,d:'承受英雄傷害 −7%'},
 hook:{n:'鉤子精準',c:'blue',role:4,d:'身邊有隊友時對英雄傷害 +10%'},
 popular:{n:'人氣主播體質',c:'green',d:'粉絲增加 +50%'},
 coachpet:{n:'教練寵兒',c:'green',d:'教練信任提升 +30%'},
 negotiator:{n:'談判高手',c:'green',d:'收到的合約年薪 +15%'},
 dual:{n:'雙修',c:'green',d:'非主位置的熟練度成長 +50%'},
 lonewolf:{n:'獨行俠',c:'red',d:'身邊隊友對英雄傷害 −4%'},
 haters:{n:'酸民磁鐵',c:'red',d:'教練信任提升 −30%'},
};
// 紅色能力的克服方式：哪個訓練會累積克服進度
const OVERCOME={glass:'mental',tilt:'mental',choke:'mental',haters:'mental',slow:'laning',feeder:'awareness',lonewolf:'teamwork',lazy:'*',wrist:'stamina'};
// 互斥：同組不會同時出現
const CLASH=[['grinder','lazy'],['early','slow'],['clutch','choke'],['heart','choke'],['discipline','lazy'],['discipline','wrist'],['fast','lazy'],['varied','lazy'],['grit','glass'],['comeback','glass'],['survive','feeder'],['phoenix','feeder'],['comm','lonewolf'],['commander','lonewolf'],['initiate','lonewolf'],['coachpet','haters'],['popular','haters'],['steady','tilt']];
const TIERS=[
 {k:'普通',g:'C',p:.60,pot:[65,75],gold:0,blue:[0,1],pos:.30,green:[0,1],red:[0,2]},
 {k:'有潛力',g:'B',p:.28,pot:[72,82],gold:0,blue:[1,2],pos:.50,green:[0,1],red:[0,1]},
 {k:'天才',g:'A',p:.10,pot:[80,90],gold:.20,blue:[1,2],pos:1,green:[1,1],red:[0,1]},
 {k:'怪物',g:'S',p:.02,pot:[88,96],gold:1,blue:[1,2],pos:1,green:[1,2],red:[0,1]},
];
const COLOR_ORDER={gold:0,blue:1,green:2,red:3};

// ── 由種子產生天賦（純函式，同種子同結果） ──
function roll(seed,role,force){const R=rng(hash('talent:'+seed)),ri=(a,b)=>a+Math.floor(R()*(b-a+1));
 let x=R(),ti=0;for(;ti<TIERS.length-1;ti++){if(x<TIERS[ti].p)break;x-=TIERS[ti].p;}if(force!=null)ti=force;const T=TIERS[ti];
 const got=[],ok=id=>!got.includes(id)&&!got.some(g=>A[g].up===id||A[id].up===g)&&!CLASH.some(p=>p.includes(id)&&p.some(o=>o!==id&&got.includes(o)));
 const pick=list=>{const c=list.filter(ok);if(!c.length)return;got.push(c[Math.floor(R()*c.length)]);};
 const ids=Object.keys(A),of=(c,f=()=>true)=>ids.filter(i=>A[i].c===c&&f(A[i]));
 if(R()<T.gold)pick(of('gold',a=>a.role==null||a.role===role));
 const nb=ri(...T.blue);for(let i=0;i<nb;i++)pick(of('blue',a=>a.role==null));
 if(R()<T.pos)pick(of('blue',a=>a.role===role));
 const ng=ri(...T.green);for(let i=0;i<ng;i++)pick(of('green'));
 // 天才、怪物比較容易帶「大賽恐懼」「上頭」這類心理缺陷
 const nr=ri(...T.red),reds=ti>=2?['choke','tilt','choke','tilt','glass','slow','lazy','wrist','feeder']:of('red');for(let i=0;i<nr;i++)pick(reds);
 const pos=got.filter(i=>A[i].c!=='red').slice(0,5),neg=got.filter(i=>A[i].c==='red').slice(0,2);
 const keys=GROWTH.KEYS.slice().sort(()=>R()-.5);
 return {seed,tier:ti,pot:ri(...T.pot),growth:['early','normal','normal','late'][Math.floor(R()*4)],strong:keys.slice(0,2),weak:keys[2],
  abilities:[...pos,...neg].sort((a,b)=>COLOR_ORDER[A[a].c]-COLOR_ORDER[A[b].c]),heroPick:R(),
  // 隱藏：金色一定隱藏，其餘正面 40%、紅色 50%；要在比賽或訓練中觸發才揭曉
  hidden:[...pos,...neg].filter(i=>A[i].c==='gold'||R()<(A[i].c==='red'?.5:.4))};}

// 套用到新角色（只在建立時做一次）
function apply(c,seed,fresh){const t=roll(seed,c.role);
 c.talent={seed,tier:t.tier,abilities:t.abilities,hidden:fresh?t.hidden:[],role:c.role,strong:t.strong,weak:t.weak,affinity:[],over:{},sp:null};
 if(fresh){c.pot=t.pot;c.growth=t.growth;
  for(const k of t.strong)c.stats[k]=Math.min(100,Math.round(c.stats[k]+7));c.stats[t.weak]=Math.max(20,Math.round(c.stats[t.weak]-5));
  const pool=heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===c.role),n=t.tier>=2?2:1;
  for(let i=0;i<n&&pool.length;i++){const j=Math.floor(((t.heroPick*(i+3)*7919)%1)*pool.length);c.talent.affinity.push(pool.splice(j,1)[0]);}}
 else{c.talent.legacy=true;c.talent.strong=[];c.talent.weak=null;}
 return c.talent;}

const has=(c,id)=>!!c?.talent?.abilities?.includes(id)&&(A[id].role==null||A[id].role===c.role);

// ── 比賽效果（0.62 起雙方都有天賦：玩家用生涯天賦，其他 9 人依身分產生） ──
const fired=new WeakMap();
function active(){const s=state,c=window.CAREER?.data;return c&&s&&(s.careerMatchId||s.proGame)&&c.talent?c:null;}
// AI 選手的天賦等級：職業選手依評分決定（越強越容易有天賦），其他比賽用一般機率
function tierByRating(r,x){const T=r>=88?[.10,.38,.40,.12]:r>=80?[.30,.44,.22,.04]:r>=70?[.55,.36,.08,.01]:[.72,.25,.03,0];let i=0;for(;i<3;i++){if(x<T[i])break;x-=T[i];}return i;}
const proTalent=(pro,role)=>roll('pro:'+pro.id,role,tierByRating(pro.rating||70,(hash('tier:'+pro.id)%10000)/10000));
const npcKey=(id,team,role,c)=>`npc:${id||'m'}:${team}:${role}:${c.clock||0}`;
const profs=new WeakMap();
function profiles(){const s=state;let m=profs.get(s);if(m)return m;m=new Map();profs.set(s,m);const c=active();if(!c)return m;
 let R0=null,R1=null;try{if(s.proGame){const W=WORLD,me=W.data.players.find(p=>p.user);R0=W.roster(me.team);R1=W.roster(s.proGame.opp);}}catch{}
 for(const a of s.actors){if(!isHero(a))continue;if(a.player){m.set(a,c);continue;}
  const pro=(a.team?R1:R0)?.[a.role];let t;
  t=pro?proTalent(pro,a.role):roll(npcKey(s.careerMatchId,a.team,a.role,c),a.role);
  m.set(a,{talent:{abilities:t.abilities},role:a.role,tier:t.tier,name:pro?.name||a.heroName,ai:true});}
 try{const me=s.actors.find(x=>x.player),stars=[...m].filter(([a,p])=>p.ai&&a.team!==me?.team&&p.tier>=2);if(stars.length)log(`球探情報：對手 ${stars.map(([a,p])=>`${p.name}（天賦 ${TIERS[p.tier].g}）`).join('、')}`);}catch{}
 return m;}
const prof=a=>a?profiles().get(a):null;
function fire(id,a){if(!a||a.player){reveal(id);const s=state;if(!s||!active())return;let f=fired.get(s);if(!f){f=new Set();fired.set(s,f);}if(f.has(id))return;f.add(id);try{log(`✦ 天賦發動【${A[id].n}】`);}catch{}return;}
 // AI：只播報金色能力，每人每種一次
 if(A[id].c!=='gold')return;const s=state;let f=fired.get(s);if(!f){f=new Set();fired.set(s,f);}const k=id+':'+s.actors.indexOf(a);if(f.has(k))return;f.add(k);
 const p=prof(a),me=s.actors.find(x=>x.player);try{log(`${a.team===me?.team?'隊友':'對手'} ${p?.name||a.heroName} 天賦發動【${A[id].n}】`);}catch{}}
let bigCache={s:null,v:false};
function bigGame(){const s=state;if(bigCache.s===s)return bigCache.v;let v=false;try{if(s.proGame){const u=WORLD.userSeries?.();if(u){const k=u.comp.kind;v=k==='elim'||k==='de'||(u.comp.bo||1)>=5;}const sc=String(s.proGame.series||'').split(':').map(Number);if(sc.length===2&&sc[0]===sc[1]&&sc[0]>=1)v=true;}else{const c=CAREER.data;v=!!(c&&c.results&&c.results.length>=6);}}catch{}bigCache={s,v};return v;}
const near=(a,team,r)=>state.actors.filter(u=>u!==a&&u.team===team&&u.kind!=='minion'&&!(u.dead>0)&&Math.hypot(u.x-a.x,u.y-a.y)<r);
const goldDiff=team=>{const g=state.gold||[0,0];return (g[team]-g[1-team])/Math.max(1,g[1-team]);};
const isHero=u=>!!u&&(u.kind==='hero'||u.heroIndex!=null&&u.role!=null);
const roll01=(a,b)=>(hash(`${Math.floor(state.time*20)}:${a}:${b}`)%1000)/1000;

// 輸出倍率（任何有天賦的英雄）
function outMul(c,p,to,quiet){const s=state,t=s.time;let m=1;const T=k=>{if(!quiet)fire(k,p);},bad=x=>has(c,'steady')?1-(1-x)/2:x;
 if(isHero(to)){const hpR=to.hp/Math.max(1,to.maxHp),gd=goldDiff(p.team),allies=near(p,p.team,260).length;
  if(has(c,'reaper')&&hpR<.35){m*=1.25;T('reaper');}else if(has(c,'finisher')&&hpR<.3){m*=1.12;T('finisher');}
  if(gd<-.03){if(has(c,'comeback')){m*=1+Math.min(.2,-gd*1.5);T('comeback');}else if(has(c,'grit')){m*=1.06;T('grit');}}
  if(gd>.05&&has(c,'snowball')){m*=1.06;T('snowball');}
  if(t<900&&has(c,'early')){m*=1.07;T('early');}
  if(t<600&&has(c,'slow')){m*=bad(.9);T('slow');}
  if(t>1500&&has(c,'latebloom')){m*=1.08;T('latebloom');}
  if(t>1800&&has(c,'carry')){m*=1.12;T('carry');}
  if(t<900){if(has(c,'tyrant')){m*=1.1;T('tyrant');}else if(has(c,'rhythm')){m*=1.06;T('rhythm');}}
  if(has(c,'duel')&&allies===0&&near(p,1-p.team,260).length<=1){m*=1.12;T('duel');}
  if(has(c,'assassin')&&to.maxHp<p.maxHp){m*=1.1;T('assassin');}
  if(has(c,'initiate')&&allies>=2){m*=1.06;T('initiate');}
  if(has(c,'hook')&&allies>=1){m*=1.1;T('hook');}
  if(p.respawnAt!=null&&t-p.respawnAt<30&&has(c,'tilt')){m*=bad(.9);T('tilt');}
  if(has(c,'glass')&&s.kills&&s.kills[1-p.team]-s.kills[p.team]>=4){m*=bad(.9);T('glass');}
  if(bigGame()){if(has(c,'heart')){m*=1.12;T('heart');}else if(has(c,'clutch')){m*=1.05;T('clutch');}if(has(c,'choke')){m*=bad(.92);T('choke');}}}
 else if(to?.kind==='minion'){if(has(c,'cs2')){m*=1.35;T('cs2');}else if(has(c,'cs')){m*=1.15;T('cs');}}
 else if(to?.kind==='camp'){if(has(c,'tyrant')){m*=1.4;T('tyrant');}else if(has(c,'rhythm')){m*=1.2;T('rhythm');}if(has(c,'invade')&&to.home===1-p.team){m*=1.25;T('invade');}}
 else if(to?.kind==='objective'||to?.kind==='epic'||to?.kind==='herald'){if(has(c,'smite')){m*=1.3;T('smite');}if(has(c,'tyrant'))m*=1.2;else if(has(c,'rhythm'))m*=1.1;}
 else if(to?.kind==='tower'||to?.kind==='inhibitor'||to?.kind==='core'){if(has(c,'siege')){m*=1.25;T('siege');}}
 return m;}
// 承傷倍率（含閃避）
function inMul(c,p,from){let m=1;const hpR=p.hp/Math.max(1,p.maxHp),foes=near(p,1-p.team,240).length,allies=near(p,p.team,260).length;
 if(isHero(from)){const r=roll01('dodge:'+state.actors.indexOf(p),from.heroIndex);if(has(c,'reflex')&&r<.16){fire('reflex',p);return 0;}if(has(c,'dodge')&&r<.08){fire('dodge',p);return 0;}
  if(has(c,'tank')){m*=.92;fire('tank',p);}if(has(c,'kite')){m*=.93;fire('kite',p);}}
 if(has(c,'survive')&&hpR<.25){m*=.85;fire('survive',p);}
 if(has(c,'position')&&foes>=3){m*=.9;fire('position',p);}
 if(foes>=2&&allies===0){if(has(c,'visionking')){m*=.88;fire('visionking',p);}else if(has(c,'mapsense')){m*=.88;fire('mapsense',p);}}
 if(has(c,'feeder')&&allies===0&&isHero(from)){m*=has(c,'steady')?1.05:1.1;fire('feeder',p);}
 if(bigGame()&&has(c,'heart'))m*=.92;
 return m;}

const prevDamage=bDamage;
bDamage=function(from,to,amount){if(!amount||!active())return prevDamage.call(this,from,to,amount);
 const P=profiles(),fc=from&&P.get(from),tc=to&&P.get(to);
 if(fc)amount*=outMul(fc,from,to);
 // 光環類：身邊有天賦的隊友（指揮官、團隊溝通、獨行俠、守護天使、犧牲精神）
 if(isHero(from)&&isHero(to))for(const [u,uc] of P){if(u===from||u.team!==from.team||u.dead>0)continue;if(Math.hypot(from.x-u.x,from.y-u.y)<260){if(has(uc,'commander')){amount*=1.08;fire('commander',u);}else if(has(uc,'comm'))amount*=1.04;if(has(uc,'lonewolf')){amount*=has(uc,'steady')?.98:.96;fire('lonewolf',u);}}}
 if(tc){amount*=inMul(tc,to,from);
  if(has(tc,'phoenix')&&amount>=to.hp&&to.hp>0&&!(to.shield>0)&&!to._phx){to._phx=1;fire('phoenix',to);amount=Math.max(0,to.hp-1);}}
 if(isHero(to))for(const [u,uc] of P){if(u===to||u.team!==to.team||u.dead>0)continue;if(Math.hypot(to.x-u.x,to.y-u.y)<200){if(has(uc,'angel')){amount*=.94;fire('angel',u);}if(has(uc,'guard')&&to.hp/Math.max(1,to.maxHp)<.3){amount*=.85;fire('guard',u);}}}
 return prevDamage.call(this,from,to,amount);};

// 每個 tick：視野、技能冷卻、記錄復活時間、算出 AI 判斷用的 edge（雙方都算，隊伍 AI 估團戰時會算進去）
const prevHero=bHero;
bHero=function(a,dt){const c=active()?profiles().get(a):null;
 if(c){const wasDead=a.dead>0;const cd=a.skillCD;const r=prevHero.apply(this,arguments);
  if(wasDead&&!(a.dead>0))a.respawnAt=state.time;
  if(has(c,'combo')&&a.skillCD>cd+.5){a.skillCD*=.85;fire('combo',a);}
  if(!a._tv&&(has(c,'vision')||has(c,'visionking'))){a._tv=1;const k=has(c,'visionking')?'visionking':'vision';a.visionRange=(a.visionRange||165)+(k==='visionking'?60:30);fire(k,a);}
  const dummy={kind:'hero',hp:a.maxHp*.5,maxHp:a.maxHp*.9};let e=outMul(c,a,dummy,true);
  if(has(c,'reflex'))e*=1.1;else if(has(c,'dodge'))e*=1.05;if(has(c,'tank'))e*=1.04;if(has(c,'position'))e*=1.03;
  a.edge=Math.max(.8,Math.min(1.35,e));return r;}
 return prevHero.apply(this,arguments);};

// ── 生涯效果：訓練效率、體力、英雄熟練度、老化 ──
function scaleTrain(name,statFn){const prev=GROWTH[name];GROWTH[name]=function(c,key){const s0=JSON.stringify(c.stats),e0=c.energy,h=name==='heroTrain'?heroes[key]:null,m0=h?.mastery;const r=prev.apply(this,arguments);if(!r||!c.talent)return r;
 let em=1;if(has(c,'discipline')){em*=.8;fire('discipline');}if(has(c,'wrist')){em*=1.25;fire('wrist');}if(em!==1&&e0>c.energy)c.energy=Math.max(0,Math.round((e0-(e0-c.energy)*em)*10)/10);
 if(h){let mm=1;if(has(c,'varied')){mm*=2;fire('varied');}if(has(c,'research')){mm*=1.3;fire('research');}if(c.talent.affinity?.includes(key))mm*=1.5;if(mm!==1&&h.mastery>m0)h.mastery=Math.min(Math.max(m0,GROWTH.M_CAP),Math.round((m0+(h.mastery-m0)*mm)*10)/10);}
 else statFn&&statFn(c,JSON.parse(s0));return r;};}
scaleTrain('train',(c,before)=>{let m=1;if(has(c,'fast')){m*=1.2;fire('fast');}if(has(c,'lazy')){m*=.8;fire('lazy');}if(m===1)return;for(const k of GROWTH.KEYS){const d=c.stats[k]-before[k];if(d>0)c.stats[k]=Math.min(100,Math.round((before[k]+d*m)*10)/10);}});
scaleTrain('heroTrain');
const prevAge=GROWTH.age;GROWTH.age=function(c){const before={...c.stats};const r=prevAge.apply(this,arguments);if(has(c,'veteran')){fire('veteran');}if(has(c,'veteran'))for(const k of GROWTH.KEYS){const d=before[k]-c.stats[k];if(d>0)c.stats[k]=Math.round((c.stats[k]+d/2)*10)/10;}return r;};

// ── 建立角色畫面：種子欄位＋球探報告 ──
// 0.92 開局不再預覽天賦等級（原本可無限重抽到 S 才開始）：預設隨機、建立生涯後才揭曉；想挑戰朋友的種子可以自己填。
let cur=newSeed(),custom='';
function report(seed){const rl=typeof role==='number'?role:0;const t=roll(seed,rl),T=TIERS[t.tier];
 const golds=t.abilities.filter(i=>A[i].c==='gold').length,pos=t.abilities.filter(i=>A[i].c!=='red').length,neg=t.abilities.length-pos;
 return `<div class="tl-report"><b class="tier-${T.g}">天賦 ${T.g}</b><span>球探評語：${T.g==='S'?'百年一見的怪物，具備頂級天賦':T.g==='A'?'天才型選手，有機會成為明星':T.g==='B'?'有職業水準的潛力':'資質普通，要靠努力'}。${GROWTH.NAME[t.strong[0]]}、${GROWTH.NAME[t.strong[1]]}突出，${GROWTH.NAME[t.weak]}偏弱。</span><small>天生特殊能力 ${pos} 個${golds?'（含金色！）':''}${neg?` · 隱憂 ${neg} 個`:''}，部分要在比賽中觸發才會揭曉</small></div>`;}
function seedField(){const old=document.querySelector('#talentField');if(window.CAREER?.data){old?.remove();return;}
 const host=document.querySelector('.mode-pick')||document.querySelector('#startCountry')?.closest('.namefield')||document.querySelector('.namefield');if(!host)return;
 let box=old;if(!box){box=document.createElement('div');box.id='talentField';box.className='namefield talent-field';host.after(box);
  box.addEventListener('click',ev=>{if(ev.target.closest('#seedClear')){custom='';cur=newSeed();draw2();}});
  box.addEventListener('change',ev=>{if(ev.target.id==='seedInput'){const v=cleanSeed(ev.target.value);custom=v;cur=v||newSeed();draw2();}});}
 function draw2(){box.innerHTML=`<details class="seed-opt"${custom?' open':''}><summary>天賦：建立生涯後由球探揭曉${custom?'（使用指定種子）':''}</summary><div class="seed-row"><input id="seedInput" value="${custom}" maxlength="16" placeholder="選填：朋友分享的種子，例如 NX-AB12-CD" aria-label="指定天賦種子">${custom?'<button type="button" id="seedClear" class="quiet">改回隨機</button>':''}</div><small class="seed-hint">不填就隨機。同一組種子＝同樣的天賦，生涯中可以在選手卡看到自己的種子，分享給朋友挑戰。</small></details>`;}
 draw2();}
function save(){try{localStorage.removeItem('esports-seed-draft');}catch{}}
let lastRole=null;
let pendingNew=false;
document.querySelector('#start')?.addEventListener('click',()=>{if(!window.CAREER?.data)pendingNew=true;},true);

const prevRender=renderSetup;
renderSetup=function(){const r=prevRender.apply(this,arguments);const c=window.CAREER?.data;
 if(c&&!c.talent){apply(c,pendingNew?cur:'LEGACY-'+(c.id||'x'),pendingNew);if(pendingNew){custom='';cur=newSeed();save();}pendingNew=false;try{CAREER.save();}catch{}try{window.PLAYER_BOARD?.update();}catch{}}
 const cc=window.CAREER?.data;if(cc?.talent&&!cc.talent.revealed&&!String(cc.talent.seed).startsWith('LEGACY')){const hub=document.querySelector('#careerHub');if(hub&&!hub.querySelector('.tl-reveal')){const d=document.createElement('div');d.className='tl-reveal panel';d.innerHTML=`<p class="eyebrow">球探報告 · 種子 ${cc.talent.seed}</p>${report(cc.talent.seed)}<button type="button" class="quiet">知道了</button>`;d.querySelector('button').onclick=()=>{cc.talent.revealed=true;try{CAREER.save();}catch{}d.remove();};hub.prepend(d);}}
 if(cc?.talent){cc.talent.over=cc.talent.over||{};cc.talent.hidden=cc.talent.hidden||[];try{careerDeltas(cc);weekly(cc);mountSp(cc);}catch(err){console.warn(err);}}
 if(typeof role==="number"&&role!==lastRole){lastRole=role;document.querySelector("#talentField")?.remove();}seedField();return r;};

// ── 0.61 第二步：揭曉、特訓、克服、每週事件、生涯型能力 ──
function toast(msg){let t=document.getElementById('talentToast');if(!t){t=document.createElement('div');t.id='talentToast';t.className='talent-toast';document.body.append(t);}
 const p=document.createElement('p');p.innerHTML=msg;t.append(p);setTimeout(()=>p.remove(),5200);}
function reveal(id){const c=window.CAREER?.data,t=c?.talent;if(!t?.hidden?.includes(id))return;t.hidden=t.hidden.filter(x=>x!==id);
 const a=A[id],msg=a.c==='red'?`你發現自己有個弱點：<b class="ab ab-red">${a.n}</b>`:`發現隱藏天賦！<b class="ab ab-${a.c}">${a.n}</b>`;
 toast(msg);try{if(state&&!state.done)log(`🔓 ${a.c==='red'?'發現弱點':'隱藏天賦揭曉'}【${a.n}】`);}catch{}try{CAREER.save();}catch{}}
const own=c=>c.talent.abilities;
const posCount=c=>own(c).filter(i=>A[i].c!=='red').length,goldCount=c=>own(c).filter(i=>A[i].c==='gold').length;
const clash=(c,id)=>CLASH.some(p=>p.includes(id)&&p.some(o=>o!==id&&own(c).includes(o)));
function spOptions(c){const out=[];
 for(const [id,a] of Object.entries(A)){if(own(c).includes(id)||clash(c,id))continue;if(a.role!=null&&a.role!==c.role)continue;
  if(a.c==='blue'&&posCount(c)<8&&!own(c).some(g=>A[g].up===id))out.push({id,need:100,kind:'learn'});
  if(a.c==='gold'&&a.up&&own(c).includes(a.up)&&goldCount(c)<2)out.push({id,need:200,kind:'up'});}
 return out;}
function gainSp(c,pts){const sp=c.talent.sp;if(!sp)return;sp.pts=Math.min(sp.need,sp.pts+pts);if(sp.pts<sp.need)return;
 const a=A[sp.id];if(a.up)c.talent.abilities=own(c).filter(x=>x!==a.up);c.talent.abilities.push(sp.id);c.talent.abilities.sort((x,y)=>COLOR_ORDER[A[x].c]-COLOR_ORDER[A[y].c]);
 toast(a.up?`特訓成功！<b class="ab ab-blue">${A[a.up].n}</b> 升級為 <b class="ab ab-gold">${a.n}</b>`:`特訓成功！學會 <b class="ab ab-${a.c}">${a.n}</b>`);c.talent.sp=null;}
function gainOver(c,id,pts){if(!own(c).includes(id))return;c.talent.over[id]=Math.min(100,(c.talent.over[id]||0)+pts);if(c.talent.over[id]<100)return;
 c.talent.abilities=own(c).filter(x=>x!==id);c.talent.hidden=(c.talent.hidden||[]).filter(x=>x!==id);delete c.talent.over[id];toast(`你克服了 <b class="ab ab-red">${A[id].n}</b>！`);}
// 訓練累積克服進度
const prevTrain2=GROWTH.train;GROWTH.train=function(c,key){const r=prevTrain2.apply(this,arguments);if(r&&c?.talent){c.talent.over=c.talent.over||{};for(const id of own(c))if(A[id].c==='red'&&(OVERCOME[id]===key||OVERCOME[id]==='*'))gainOver(c,id,OVERCOME[id]==='*'?6:15);}return r;};
function spCost(c){return Math.round(GROWTH.cost(c)*1.5);}
function spTrain(c){if(!c.talent.sp||!(training>0)||c.energy<spCost(c))return;c.energy=Math.round((c.energy-spCost(c))*10)/10;training--;
 let pts=16+Math.round((c.stats.mental||40)/10);if(has(c,'fast')){pts+=4;fire('fast');}if(has(c,'lazy')){pts-=4;fire('lazy');}gainSp(c,pts);CAREER.save();renderSetup();}
function spBox(c){const sp=c.talent.sp;
 if(sp){const a=A[sp.id];return `<div class="sp-box"><h4>天賦特訓 <small>每次消耗 1 次訓練、體力 ${spCost(c)}</small></h4><div class="sp-target"><b class="ab ab-${a.c}">${a.n}</b><small>${a.up?`由 ${A[a.up].n} 升級 · `:''}${a.d}</small></div>
  <div class="sp-bar"><i style="width:${sp.pts/sp.need*100}%"></i><span>${sp.pts} / ${sp.need}</span></div>
  <div class="sp-acts"><button type="button" data-sp="go" ${!(training>0)||c.energy<spCost(c)?'disabled':''}>特訓 →</button><button type="button" class="quiet" data-sp="drop">放棄目標</button></div></div>`;}
 const o=spOptions(c);return `<details class="sp-box"><summary>天賦特訓：選一個目標 <small>（學新能力 100 點、升級金色 200 點）</small></summary><div class="sp-opts">${o.map(x=>`<button type="button" data-sp-pick="${x.id}" title="${A[x.id].d}"><b class="ab ab-${A[x.id].c}">${A[x.id].n}</b><small>${x.kind==='up'?'升級 · 200':'學習 · 100'}</small></button>`).join('')||'<small>目前沒有可以特訓的能力</small>'}</div></details>`;}
function mountSp(c){const box=document.querySelector('.growth-courses');if(!box||!c.talent){document.querySelector('#spWrap')?.remove();return;}
 let w=document.querySelector('#spWrap');if(w&&w.previousElementSibling!==box){w.remove();w=null;}
 if(!w){w=document.createElement('div');w.id='spWrap';box.after(w);
  w.addEventListener('click',ev=>{const c=CAREER.data;if(!c)return;const pick=ev.target.closest('[data-sp-pick]');
   if(pick){const o=spOptions(c).find(x=>x.id===pick.dataset.spPick);if(o){c.talent.sp={id:o.id,pts:0,need:o.need};CAREER.save();renderSetup();}return;}
   const b=ev.target.closest('[data-sp]');if(!b)return;if(b.dataset.sp==='go')spTrain(c);else{c.talent.sp=null;CAREER.save();renderSetup();}});}
 const h=spBox(c);if(w.dataset.h!==h){w.dataset.h=h;const open=w.querySelector('details')?.open;w.innerHTML=h;if(open&&w.querySelector('details'))w.querySelector('details').open=true;}}
// 每週事件：有紅色能力時可能遇到克服的機會；有特訓目標時可能有靈感
const EVENTS={
 glass:['聊天室刷了一整排嘲諷你的留言。',['關掉聊天室，專心練習',25,0],['找心理師聊聊（體力 −10）',45,10]],
 tilt:['你連續兩場在死後亂衝送頭，教練把你叫去看重播。',['冷靜地檢討每一次死亡',30,0],['和隊友打一整晚練習賽（體力 −15）',50,15]],
 choke:['重要比賽前一晚你失眠了。',['照常作息，告訴自己這只是一場比賽',25,0],['請前輩分享大賽經驗（體力 −10）',45,10]],
 haters:['網路上有人剪輯你的失誤影片，點閱破十萬。',['不回應，用成績說話',25,0],['開直播大方自嘲（體力 −10）',45,10]],
 slow:['教練說你前期太被動了。',['每天加練對線開局',30,0],['找高分對線玩家單挑特訓（體力 −15）',50,15]],
 feeder:['你這週又被抓死了五次。',['每波推線後先看小地圖',30,0],['重看自己所有死亡回放（體力 −10）',45,10]],
 lonewolf:['隊友抱怨你都不跟團。',['團練時主動喊話',30,0],['請全隊吃宵夜好好聊（體力 −10）',45,10]],
 lazy:['你發現自己最近常常一開遊戲就在滑手機。',['把手機放到另一個房間',25,0],['跟教練約好每天打卡（體力 −10）',45,10]],
 wrist:['手腕又開始痠痛了。',['乖乖做復健',30,0],['看專業物理治療（體力 −15）',50,15]],
};
const dlg=document.createElement('dialog');dlg.className='life-dialog talent-event';document.body.append(dlg);
function weekly(c){const t=c.talent;if(c.stage==='ended')return;if(t.week===c.clock)return;const first=t.week==null;t.week=c.clock;if(first)return;
 const R=rng(hash(t.seed+':w'+c.clock));const reds=own(c).filter(i=>EVENTS[i]&&!t.hidden?.includes(i));
 if(reds.length&&R()<.3){const id=reds[Math.floor(R()*reds.length)],[text,...ch]=EVENTS[id];
  dlg.innerHTML=`<div class="life-dialog-head"><h2>本週事件 · 克服 <span class="ab ab-red">${A[id].n}</span></h2></div><p>${text}</p><p class="pb-note">克服進度 ${t.over[id]||0} / 100</p>${ch.map((x,i)=>`<button class="storychoice" data-ev="${i}">${x[0]}<small>克服 +${x[1]}</small></button>`).join('')}`;
  dlg.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{const x=ch[+b.dataset.ev];c.energy=Math.max(0,c.energy-x[2]);gainOver(c,id,x[1]);dlg.close();CAREER.save();renderSetup();});
  try{if(!dlg.open)dlg.showModal();}catch{}}
 else if(t.sp&&R()<.15){const n=A[t.sp.id].n;gainSp(c,25);toast(`看比賽時突然有了靈感：特訓 <b>${n}</b> +25`);}}
// 生涯型能力：用前後差值調整（粉絲、信任、位置熟悉、合約）
function careerDeltas(c){const t=c.talent,L=t.last;
 if(L){const df=(c.fans||0)-L.fans;if(df>0&&has(c,'popular')){c.fans=Math.round(c.fans+df*.5);fire('popular');}
  const dt=(c.trust??50)-L.trust;if(dt>0){let m=0;if(has(c,'coachpet')){m+=.3;fire('coachpet');}if(has(c,'haters')){m-=.3;fire('haters');}if(m)c.trust=Math.max(0,Math.min(100,Math.round((c.trust+dt*m)*10)/10));}
  if(has(c,'dual')&&L.fam.length)c.roleFam?.forEach((v,i)=>{if(i!==c.role&&v>L.fam[i]){c.roleFam[i]=Math.min(100,Math.round((v+(v-L.fam[i])*.5)*10)/10);fire('dual');}});}
 if(has(c,'negotiator')&&c.pro){for(const o of c.pro.offers||[])if(!o._neg){o._neg=1;o.salary=Math.round(o.salary*1.15);fire('negotiator');}
  const k=c.pro.contract;if(k&&!k._neg){k._neg=1;k.salary=Math.round(k.salary*1.15);}}
 t.last={fans:c.fans||0,trust:c.trust??50,fam:[...(c.roleFam||[])]};}

// ── 0.63 BP 畫面顯示對手天賦（與比賽中實際使用的天賦相同） ──
function foeList(){const c=window.CAREER?.data;if(!c?.talent)return null;
 const pd=document.querySelector('#proDraft'),ad=document.querySelector('#draft');
 if(pd&&!pd.hidden){try{const W=WORLD,me=W.data.players.find(p=>p.user),u=W.userSeries?.();if(!u)return null;const opp=u.sr.a===me.team?u.sr.b:u.sr.a;
  return {host:pd,team:W.team?.(opp)?.name||opp,rows:W.roster(opp).map((p,r)=>p&&{role:r,name:p.name,rating:p.rating,...pick(proTalent(p,r))}).filter(Boolean)};}catch{return null;}}
 if(ad&&!ad.hidden&&c.pending?.id){const op=c.pending.opponent,club=typeof op==='number'?(['逐光','赤潮','遠星','白鯨'][op]||'')+'青訓':String(op||'對手');return {host:ad,team:club,rows:[0,1,2,3,4].map(r=>({role:r,name:'',...pick(roll(npcKey(c.pending.id,1,r,c),r))}))};}
 return null;}
const pick=t=>({tier:t.tier,abilities:t.abilities});
function foeHTML(f){const chip=id=>`<span class="ab ab-${A[id].c}" title="${A[id].d}">${A[id].n}</span>`;
 const top=f.rows.filter(r=>r.tier>=2).length,golds=f.rows.reduce((n,r)=>n+r.abilities.filter(i=>A[i].c==='gold').length,0);
 return `<details class="foe-talent" ${foeOpen?'open':''}><summary>對手天賦 · ${typeof f.team==='string'?f.team:'對手'} <small>${top?`天才 ${top} 人`:'沒有天才型選手'}${golds?` · 金色能力 ${golds} 個`:''}</small></summary>
 <div class="foe-rows">${f.rows.map(r=>`<div class="foe-row"><span class="foe-role">${ROLE[r.role]}</span><b class="foe-name">${r.name||'—'}${r.rating?` <small>${r.rating}</small>`:''}</b><b class="tier-${TIERS[r.tier].g} foe-tier">${TIERS[r.tier].g}</b><div class="ab-list">${r.abilities.map(chip).join('')||'<small>無特殊能力</small>'}</div></div>`).join('')}</div></details>`;}
let foeOpen=false;try{foeOpen=localStorage.getItem('esports-foe-open')==='1';}catch{}
function mountFoe(){const f=foeList();const old=document.querySelector('#foeTalent');
 if(!f){old?.remove();return;}
 const h=foeHTML(f);let box=old;if(box&&box.parentElement!==f.host){box.remove();box=null;}
 if(!box){box=document.createElement('div');box.id='foeTalent';f.host.prepend(box);box.addEventListener('toggle',ev=>{foeOpen=ev.target.open;try{localStorage.setItem('esports-foe-open',foeOpen?'1':'0');}catch{}},true);}
 else if(f.host.firstElementChild!==box)f.host.prepend(box);
 if(box.dataset.h!==h){box.dataset.h=h;box.innerHTML=h;}}

// 0.87 我方天賦：和對手天賦同一款、可收合；你自己的隱藏能力仍顯示 ？？？
function allyList(){const c=window.CAREER?.data;if(!c)return null;
 const pd=document.querySelector('#proDraft'),ad=document.querySelector('#draft');
 const me=r=>({role:r,name:c.name+'（你）',me:true,tier:c.talent?.tier??0,abilities:c.talent?.abilities||[],hidden:c.talent?.hidden||[]});
 if(pd&&!pd.hidden){try{const W=WORLD,u=W.data.players.find(p=>p.user);return {host:pd,team:W.team?.(u.team)?.name||'我方',rows:W.roster(u.team).map((p,r)=>p&&(p.user?me(r):{role:r,name:p.name,rating:p.rating,...pick(proTalent(p,r))})).filter(Boolean)};}catch{return null;}}
 if(ad&&!ad.hidden&&c.pending?.id&&c.talent)return {host:ad,team:'逐光青訓',rows:[0,1,2,3,4].map(r=>r===c.role?me(r):({role:r,name:'',...pick(roll(npcKey(c.pending.id,0,r,c),r))}))};
 return null;}
let allyOpen=false;try{allyOpen=localStorage.getItem('esports-ally-open')==='1';}catch{}
function allyHTML(f){const chip=(id,hid)=>hid?'<span class="ab ab-hidden" title="隱藏能力：觸發後揭曉">？？？</span>':`<span class="ab ab-${A[id].c}" title="${A[id].d}">${A[id].n}</span>`;
 const top=f.rows.filter(r=>r.tier>=2).length;
 return `<details class="foe-talent ally-talent" ${allyOpen?'open':''}><summary>我方天賦 · ${f.team} <small>${top?`天才 ${top} 人`:'沒有天才型選手'}</small></summary>
 <div class="foe-rows">${f.rows.map(r=>`<div class="foe-row${r.me?' me':''}"><span class="foe-role">${ROLE[r.role]}</span><b class="foe-name">${r.name||'—'}${r.rating?` <small>${r.rating}</small>`:''}</b><b class="tier-${TIERS[r.tier].g} foe-tier">${TIERS[r.tier].g}</b><div class="ab-list">${r.abilities.map(id=>chip(id,r.hidden?.includes(id))).join('')||'<small>無特殊能力</small>'}</div></div>`).join('')}</div></details>`;}
function mountAlly(){const f=allyList();const old=document.querySelector('#allyTalent');
 if(!f){old?.remove();return;}
 const h=allyHTML(f);let box=old;if(box&&box.parentElement!==f.host){box.remove();box=null;}
 if(!box){box=document.createElement('div');box.id='allyTalent';box.addEventListener('toggle',ev=>{allyOpen=ev.target.open;try{localStorage.setItem('esports-ally-open',allyOpen?'1':'0');}catch{}},true);}
 const foe=document.querySelector('#foeTalent');if(foe&&foe.parentElement===f.host){if(foe.nextElementSibling!==box)foe.after(box);}else if(f.host.firstElementChild!==box)f.host.prepend(box);
 if(box.dataset.h!==h){box.dataset.h=h;box.innerHTML=h;}}
setInterval(()=>{try{mountFoe();mountAlly();}catch{}},400);

// ── 看板用 HTML ──
function boardHTML(c){const t=c.talent;if(!t)return '';const T=TIERS[t.tier],hid=t.hidden||[];
 const chip=id=>{const a=A[id],off=a.role!=null&&a.role!==c.role;if(hid.includes(id))return `<span class="ab ab-hidden" title="隱藏能力：在比賽或訓練中觸發後揭曉">？？？</span>`;
  const ov=a.c==='red'&&t.over?.[id]?` <small>${t.over[id]}%</small>`:'';return `<span class="ab ab-${a.c}${off?' off':''}" title="${a.d}${off?'（換位置後休眠）':''}${a.c==='red'?'（可透過訓練與事件克服）':''}">${a.n}${ov}</span>`;};
 const sp=t.sp?`<p class="pb-note">特訓中：${A[t.sp.id].n} ${t.sp.pts}/${t.sp.need}</p>`:'';
 return `<div class="pb-sub pb-talent"><h4>天賦 <b class="tier-${T.g}">${T.g}</b> <small>${T.k}${t.legacy?'':' · 種子 '+t.seed}</small></h4>
 <div class="ab-list">${t.abilities.length?t.abilities.map(chip).join(''):'<small>沒有特殊能力</small>'}</div>${sp}
 ${t.affinity?.length?`<p class="pb-note">天生手感：${t.affinity.map(i=>heroes[i]?.name).join('、')}（熟練度練習 ×1.5）</p>`:''}</div>`;}

// ── 0.71 選手判斷力（macro.js 開戰門檻用）：職業賽依職業選手評分 0.85–1.0；天梯依你的程度（新手局很亂、高分局較穩）；青訓中等。
const clamp01=v=>Math.max(0,Math.min(1,v));
function matchIQ(a){const s=state,c=window.CAREER?.data;if(!s||!c||!(s.careerMatchId||s.proGame))return .5;
 const noise=((hash('iq:'+(s.careerMatchId||'p')+':'+s.actors.indexOf(a))%1000)/1000-.5)*.1;
 const mine=clamp01(((c.stats?.awareness??45)+(c.stats?.macro??45))/2/100);
 if(s.proGame){try{const W=WORLD,me=W.data.players.find(p=>p.user),R=a.team?W.roster(s.proGame.opp):W.roster(me.team),pro=R?.[a.role];
   if(a.player)return clamp01(.7+.3*mine);if(pro)return clamp01(.85+.15*clamp01(((pro.rating||70)-60)/35));}catch{}return .9;}
 if(c.stage==='ladder'){const lv=window.GROWTH?GROWTH.rating(c):50;return clamp01(.1+.6*clamp01((lv-40)/50)+noise);}
 return clamp01((a.player?.5+.4*mine:.7)+noise);}
window.MATCH_IQ=matchIQ;
// ── 0.74 隊伍戰術風格（macro.js styleOf 用）：職業隊依戰隊風格標籤＋明星選手決定；青訓普通；天梯混亂 ──
const STY={前期:{inv:.55,cj:.6,early:true},團戰:{inv:.2,cj:.3,early:false,focus:'bot'},運營:{inv:.2,cj:.45,early:false},分推:{inv:.25,cj:.35,early:false,focus:'top'},後期:{inv:.1,cj:.2,early:false}};
const ROLE_LANE=['top','mid','mid','bot','bot'],LANE_TXT={top:'上路',mid:'中路',bot:'下路'};
function teamStyle(t){const s=state,c=window.CAREER?.data;if(!s||!c||!(s.careerMatchId||s.proGame))return null;
 const key=String(s.careerMatchId||JSON.stringify(s.proGame?.series||''))+':'+t,r=k=>(hash(key+k)%1000)/1000;
 if(s.proGame){try{const W=WORLD,me=W.data.players.find(p=>p.user),tag=t?s.proGame.opp:me.team,team=W.team(tag),R=W.roster(tag).filter(Boolean),star=R.slice().sort((a,b)=>(b.rating||0)-(a.rating||0))[0];
   const base=STY[team?.style]||STY.運營,focus=base.focus||ROLE_LANE[star?.role??2],roleName=ROLE[star?.role??2];
   const lvl1=r('l')<base.inv?'invade':r('d')<.8?'defend':'lane';
   const label=`${team?.style||'運營'}型・以${LANE_TXT[focus]}為核心${star?`，依賴 ${star.name}（${roleName}）的個人能力`:''}`;
   return {lvl1,start:r('s')<.5?'red':'blue',invadeAt:r('i')<.5?'red':'blue',focus,early:base.early,cj:base.cj,label,team:team?.name||tag,star:star?.name};}catch{}}
 if(c.stage==='ladder')return {lvl1:r('l')<.25?'invade':r('d')<.5?'defend':'lane',start:r('s')<.5?'red':'blue',invadeAt:r('i')<.5?'red':'blue',focus:['top','mid','bot'][Math.floor(r('f')*3)],early:r('e')<.5,cj:.15,label:'路人局・各打各的'};
 const f=['top','mid','bot'][Math.floor(r('f')*3)];
 return {lvl1:r('l')<.2?'invade':r('d')<.85?'defend':'lane',start:r('s')<.5?'red':'blue',invadeAt:r('i')<.5?'red':'blue',focus:f,early:r('e')<.5,cj:.25,label:`青訓隊・重心在${LANE_TXT[f]}`};}
window.TEAM_STYLE=teamStyle;
window.TALENT={A,TIERS,roll,profiles,foeList,apply,has,boardHTML,newSeed,spOptions,gainSp,gainOver,reveal,weekly,get seed(){return cur;},set seed(v){cur=cleanSeed(v)||cur;}};
seedField();
})();
