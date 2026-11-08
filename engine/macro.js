'use strict';
// Match macro layer: levels/XP, laning trades, a per-team "brain" (lane → objective setup → group / split → siege),
// tactical spells, wards, tower rules (fortification, plates, aggro, regen, Nexus-tower respawn), super minions, surrender.
// Loaded after rift.js + rift-nav.js; replaces bHero / bTowers / bWave / events and wraps bDamage / start / tick.
const MACRO=(()=>{
// 召喚師技能：9 種，玩家任選 2 個（打野必帶懲擊）。
const SPELLS={flash:{name:'閃現',cd:300,desc:'朝目標方向瞬間移動一小段，可越過牆'},tp:{name:'傳送',cd:360,desc:'引導後傳送到己方建築或小兵旁'},smite:{name:'懲擊',cd:90,desc:'對野怪與大型物件造成高額傷害'},ignite:{name:'點燃',cd:180,desc:'讓敵方英雄持續燃燒 5 秒'},heal:{name:'治療',cd:240,desc:'為自己和身邊一名隊友回血'},barrier:{name:'屏障',cd:180,desc:'立即獲得大量護盾'},exhaust:{name:'虛弱',cd:210,desc:'讓敵方英雄 3 秒內傷害降低並緩速'},ghost:{name:'疾跑',cd:210,desc:'8 秒內移動速度大幅提升'},cleanse:{name:'淨化',cd:210,desc:'解除暈眩、定身與緩速'}};
const SPELL_ORDER=['flash','tp','smite','ignite','heal','barrier','exhaust','ghost','cleanse'];
const DEFAULT_SPELLS=[['flash','tp'],['flash','smite'],['flash','ignite'],['flash','heal'],['flash','ignite']];
function validSpells(pick,r){if(!Array.isArray(pick)||pick.length!==2||pick[0]===pick[1]||!pick.every(id=>SPELLS[id]))return false;return r!==1||pick.includes('smite');}
const POLICY_DEFAULT={lane:'safe',jungle:'balanced',objective:'priority',macro:'group',fight:'balanced',style:'auto'};
const FORTIFY=840,RECALL=8,TP_CHANNEL=4;
const FOCUS=new WeakMap(),GANK=new WeakMap(),CAMP_AGGRO=new WeakMap();
const opp=t=>1-t,live=a=>bLive(a),T=()=>state;
const xpNeed=l=>80+85*l;
const levelMul=a=>1+.075*((a.level||1)-1);
// 0.83 近戰補兵的踏步距離：近戰英雄補小兵時可以多踏 30 距離出手（只限小兵）。雲端 40 場：上路 10 分鐘補兵 37→50、首塔 11.5→13.8 分
const meleeStep=(a,t)=>t?.kind==='minion'&&a.range<100?30:0;
const lastHitDmg=a=>20+2.2*((a.level||1)-1),STRUCT_LATE=.62;
const tough=a=>1+.085*((a.level||1)-1);
const deathTime=(lvl,t)=>[6,7,8,9,11,13,16,19,22,25,28,30,32,34,36,38,40,42][Math.max(0,Math.min(17,(lvl||1)-1))]*(1+Math.max(0,t-900)/2400);
const laneOf=a=>[0,1,2].map(l=>[l,distToLane(a,l)]).sort((x,y)=>x[1]-y[1])[0][0];
function distToLane(p,l){const pts=battleLanes[l];let d=1e9;for(let i=0;i<pts.length-1;i++){const [ax,ay]=pts[i],[bx,by]=pts[i+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)));d=Math.min(d,Math.hypot(ax+dx*t-p.x,ay+dy*t-p.y));}return d;}
const policy=()=>T().policy||POLICY_DEFAULT;
const fightBar=t=>{if(t)return 1;return {safe:1.2,balanced:1,aggressive:.85}[policy().fight]||1;};
// ---------- power ----------
function heroPower(a){if(!live(a))return 0;const hp=Math.max(.05,a.hp/a.maxHp);return (a.power||1)*levelMul(a)*tough(a)*(a.attack/12)*(a.maxHp/125)*Math.pow(hp,.7)*(a.skillCD<=0?1.12:1)*(T().heroBuff?.[a.team]>T().time?1.15:1)*(a.edge||1);}
function powerNear(team,p,r,onlySeenBy){return T().actors.filter(a=>a.team===team&&live(a)&&dist(a,p)<r&&(onlySeenBy===undefined||sees(onlySeenBy,a))).reduce((s,a)=>s+heroPower(a),0);}
// ---------- vision ----------
let seenCache={t:-1,sets:[new Set(),new Set()]},frontCache={t:-1,m:new Map()};
function refreshSight(){const s=T();seenCache={t:s.time,sets:[new Set(),new Set()],checked:[new Set(),new Set()]};}
function sees(team,u){if(!u)return false;if(u.team===team)return true;const s=T();if(seenCache.t!==s.time)refreshSight();const set=seenCache.sets[team],chk=seenCache.checked[team];if(set.has(u))return true;if(chk.has(u))return false;chk.add(u);
 const ok=s.actors.some(a=>a.team===team&&live(a)&&dist(a,u)<(a.visionRange||210))||s.minions.some(m=>m.team===team&&live(m)&&dist(m,u)<135)||s.structures.some(t=>t.team===team&&t.hp>0&&dist(t,u)<170)||(s.wards||[]).some(w=>w.team===team&&w.until>s.time&&dist(w,u)<115);if(ok)set.add(u);return ok;}
function wardSpots(){const N=window.RIFT_NAV,out=[];if(!N)return out;const rs=N.RS;for(const f of[.18,.36,.64,.82]){const p=rs[Math.floor(rs.length*f)];out.push([p[0],p[1]]);}
 for(const k of[0,1]){const p=k?N.DRAGON:N.BARON,a=N.ALC[k];out.push([p[0]-a.n[0]*70,p[1]-a.n[1]*70]);}
 for(const seg of N.NET){const e=seg[seg.length-1];out.push([e[0],e[1]]);}
 return out.filter(([x,y])=>N.walk(x,y));}
let SPOTS=null;
// ---------- start ----------
const baseStart=start;
start=function(){baseStart();const s=state;SPOTS=SPOTS||wardSpots();s.speed=s.speed||1;s.wards=[];s.plan=[{mode:'lane',tasks:[]},{mode:'lane',tasks:[]}];s.planAt=0;s.policy={...POLICY_DEFAULT,...(loadPolicy()||{})};s.teamOrder=null;s.surrender=null;s.surrenderAsked=0;s.macroEvents={};s.waveAt=65;for(const i of s.inhibitors||[])i.hp=i.maxHp=380;for(const c of s.cores||[])c.hp=c.maxHp=1000;s.burns=[];
 for(const t of s.structures){if(t.kind==='tower'){const hp=t.tier===3?480:t.tier===2?600:t.tier===1?520:400;t.hp=t.maxHp=hp;t.plates=0;t.heat=0;t.calm=0;}if(t.kind==='inhibitor'){t.hp=t.maxHp=300;}}
 for(const a of s.actors){a.level=1;a.xp=0;const pick=a.player&&s.playerSpells?s.playerSpells:DEFAULT_SPELLS[a.role];a.spells=pick.map(id=>({id,cd:id==='smite'?0:0}));a.wardCharges=a.role===4?2:1;a.wardRegen=0;a.task=null;a.recallAt=null;a.tpAt=null;a.lastHurt=-99;}
 if(s.playerSpells==null)s.playerSpells=null;log('比賽開始：14 分鐘前外塔有防護，護甲片可換取金錢。');};
// ---------- damage hooks: level scaling, tower aggro, plates, XP, death timers, Nexus-tower respawn ----------
const baseDamage=bDamage;
bDamage=function(from,to,amount){const s=state;if(!s||s.done||!to||!bLive(to)){return baseDamage(from,to,amount);}
 if(from?.kind==='hero'){amount*=levelMul(from);if(from.exhaustUntil>s.time)amount*=.6;if(to.kind==='hero')amount*=.62;if(to.kind==='minion')amount=Math.max(amount,lastHitDmg(from));}
 if(['tower','inhibitor','core'].includes(to.kind)&&from?.kind==='minion')amount*=.5;
 if(to.kind==='minion'&&from?.kind==='minion')amount*=.6; // 0.79：小兵互打變慢，留時間給英雄補刀
 if(['tower','inhibitor','core'].includes(to.kind)&&from?.kind!=='herald'){const deep=to.kind!=='tower'||to.tier>=2;if(s.time>=FORTIFY)amount*=STRUCT_LATE*(deep&&s.time<1500?.8:1);else if(deep)amount*=.4;}
 if(to.kind==='hero'){amount/=tough(to);to.lastHurt=s.time;if(to.recallAt!=null){to.recallAt=null;}if(to.tpAt!=null&&from?.kind==='hero'){to.tpAt=null;}}
 if(to.kind==='tower'&&s.time<FORTIFY&&from?.kind!=='herald'){amount*=to.tier===0?.45:to.tier===1?.7:1;}
 if(from?.kind==='hero'&&to.kind==='hero'){const guard=s.structures.find(t=>t.kind==='tower'&&t.team===to.team&&t.hp>0&&dist(t,from)<(t.tier===3?95:110));if(guard){if(guard.focus!==from)guard.heat=0;guard.focus=from;}}
 if(to.kind==='camp'&&from?.kind==='hero')CAMP_AGGRO.set(to,from);
 const hp=to.hp;baseDamage(from,to,amount);if(!s||to.hp>=hp)return;
 if(to.hp<=0&&to.kind==='camp'&&from?.kind==='hero'){CAMP_AGGRO.delete(to);gain(from,to.type==='red'||to.type==='blue'?120:to.type==='scuttle'?90:70);}
 if(to.kind==='tower'&&to.tier===0&&s.time<FORTIFY&&from&&from.team<2){const plates=Math.min(5,Math.floor((1-to.hp/to.maxHp)*5+1e-6));if(plates>to.plates){s.gold[from.team]+=125*(plates-to.plates);to.plates=plates;}}
 if(to.hp>0)return;
 if(to.kind==='minion')share(to,opp(to.team),to.siege?110:to.super?120:to.caster?32:40,170);
 else if(to.kind==='hero'){to.dead=deathTime(to.level,s.time);to.recallAt=null;to.tpAt=null;to.task=null;if(from?.kind==='hero'){gain(from,150+to.level*28);share(to,from.team,70+to.level*12,240,from);}}
 else if(to.kind==='camp'&&from?.kind==='hero'&&false){gain(from,to.type==='red'||to.type==='blue'?120:to.type==='scuttle'?90:70);}
 else if(to.kind==='tower'&&to.tier===3){to.respawnAt=s.time+180;log(`${to.team?'赤潮':'逐光'}的${to.label}被摧毀，3 分鐘後重建。`);}
};
function gain(a,n){if(!a||a.kind!=='hero')return;a.xp=(a.xp||0)+n;while(a.level<18&&a.xp>=xpNeed(a.level)){a.xp-=xpNeed(a.level);a.level++;if(live(a))a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.06);if(a.player)log(`你升到 ${a.level} 級。`);}}
function share(at,team,xp,r,skip){const near=T().actors.filter(a=>a.team===team&&live(a)&&dist(a,at)<r&&a!==skip);if(!near.length)return;const each=xp*(near.length>1?1.25:1)/near.length;near.forEach(a=>gain(a,each));}
// ---------- towers ----------
bTowers=function(dt){const s=state;for(const t of s.structures){if(t.kind!=='tower')continue;
 if(t.hp<=0){if(t.tier===3&&t.respawnAt&&s.time>=t.respawnAt){t.hp=t.maxHp;t.respawnAt=null;t.focus=null;s.towers[t.team]++;log(`${t.team?'赤潮':'逐光'}的${t.label}重建完成。`);}continue;}
 const range=t.tier===3?95:110;
 if(t.tier>=2){t.calmCheck=(t.calmCheck||0)-dt;if(t.calmCheck<=0){t.calmCheck=1;t.hot=s.actors.some(u=>u.team!==t.team&&live(u)&&dist(t,u)<range+40)||s.minions.some(u=>u.team!==t.team&&live(u)&&dist(t,u)<range+40);}t.calm=t.hot?0:(t.calm||0)+dt;if(t.calm>8)t.hp=Math.min(t.maxHp,t.hp+t.maxHp*.01*dt);}
 t.cd-=dt;if(t.cd>0)continue;
 const ok=u=>u&&u.team!==t.team&&u.team<2&&live(u)&&dist(t,u)<range;
 let target=ok(t.focus)?t.focus:null;
 if(!target)target=bNearest(t,s.minions.filter(ok),range)||bNearest(t,s.actors.filter(ok),range);
 if(target!==t.focus)t.heat=0;t.focus=target;if(!target){t.cd=.25;continue;}
 t.cd=2.2;bShot(t,target,t.team?'#f58780':'#7ce0ee');
 if(target.kind==='minion'){bDamage(t,target,target.super?target.maxHp*.08:target.siege?target.maxHp*.14:target.maxHp*.45);}
 else{const dmg=(28+s.time*.012)*(1+.25*Math.min(3,t.heat||0));t.heat=(t.heat||0)+1;bDamage(t,target,dmg);}}};
// ---------- minions: same rules as battle.js, bucketed per lane (was O(n²) over every unit) ----------
bMinions=function(dt){const s=state,byLane=[[],[],[]];for(const m of s.minions)if(m.hp>0)byLane[m.lane].push(m);const heroes=s.actors.filter(live);
 for(const m of s.minions){if(m.hp<=0)continue;m.cd-=dt;const range=m.siege?100:m.caster?80:38;let close=null,cd=range;for(const n of byLane[m.lane]){if(n.team===m.team||n.hp<=0)continue;const d=dist(m,n);if(d<=cd){cd=d;close=n;}}
  let target=close;if(!target){let hd=range;for(const h of heroes){if(h.team===m.team)continue;const d=dist(m,h);if(d<=hd){hd=d;target=h;}}}
  if(!target){const st=bStructuresTarget(m);if(st&&dist(m,st)<(m.siege?110:52)&&bCanHit(m,st))target=st;}
  if(target){if(m.cd<=0){m.cd=2.5;bDamage(m,target,m.attack*(s.heroBuff[m.team]>s.time?1.45:1));}}
  else{if(m.lag>0){m.lag=Math.max(0,m.lag-dt*.012);}else m.progress=Math.max(0,Math.min(1,m.progress+(m.team?-1:1)*dt*.012));const p=bPoint(m.lane,m.progress);m.x=p.x;m.y=p.y+(m.offset-9)*.35;}}
 s.minions=s.minions.filter(m=>m.hp>0);};
// ---------- waves: cannons by game time, super minions per destroyed inhibitor ----------
bWave=function(){const s=state;s.wave++;const cannon=s.time<900?s.wave%3===0:s.time<1500?s.wave%2===0:true,ratio=t=>Math.pow(Math.max(1,s.gold[t])/Math.max(1,s.gold[1-t]),.4);
 for(let team=0;team<2;team++){const down=(s.inhibitors||[]).filter(i=>i.team!==team&&i.hp<=0&&i.respawn-s.time>60),all=down.length===3;
  for(let lane=0;lane<3;lane++){const p0=bPoint(lane,team?.98:.02),push=(m)=>s.minions.push({...p0,kind:'minion',team,lane,cd:0,progress:team?1:0,...m});
   for(let n=0;n<6;n++){const caster=n>=3,hp=caster?30+s.time*.018:42+s.time*.025;push({hp,maxHp:hp,siege:false,caster,offset:(n%3)*9,cd:n*.3,attack:(caster?1.8+s.time*.003:2.2+s.time*.0035)*ratio(team),lag:caster?.012:0});}
   if(cannon){const hp=200+s.time*.08;push({hp,maxHp:hp,siege:true,offset:27,attack:(16+s.time*.012)*ratio(team)});}
   const supers=all?2:down.some(i=>i.lane===lane)?1:0;for(let k=0;k<supers;k++){const hp=300+s.time*.08;push({hp,maxHp:hp,super:true,siege:false,offset:k*9,attack:28+s.time*.01});}}}};
// ---------- epic monsters: fight back, follow the aggro holder a little, leash home and regenerate when aggro drops ----------
const EPIC_HIT={grubs:[4,.003],herald:[9,.006],dragon:[7,.005],elder:[20,.01],baron:[14,.008]},LEASH=45,RESET_AFTER=4;
const baseObjective=bObjective;
bObjective=function(o,dt,name){const s=state;if(o.homeX==null){o.homeX=o.x;o.homeY=o.y;}const home={x:o.homeX,y:o.homeY},before=o.hp,wasAlive=o.alive;
 // stronger (higher level / better geared) teams burn objectives faster than the flat base rate
 if(o.alive)for(let t=0;t<2;t++){const grp=s.actors.filter(a=>a.team===t&&live(a)&&!a.recalling&&dist(a,o)<95);if(grp.length<2)continue;const extra=dt*grp.reduce((x,a)=>x+Math.max(0,levelMul(a)*a.attack*(a.power||1)/12-1)*3.2,0);o.hp=Math.max(Math.min(o.hp,1),o.hp-extra);}
 baseObjective(o,dt,name);
 if(!o.alive){o.x=home.x;o.y=home.y;o.resetting=false;o.target=null;return;}
 if(!wasAlive){o.lastHit=-99;return;}
 if(o.hp<before-1e-9)o.lastHit=s.time;
 const near=s.actors.filter(a=>live(a)&&dist(a,o)<110&&dist(a,home)<170);
 const engaged=near.length>0&&s.time-(o.lastHit??-99)<RESET_AFTER;
 if(engaged){o.resetting=false;let tgt=o.target&&live(o.target)&&near.includes(o.target)?o.target:near.sort((x,y)=>dist(o,x)-dist(o,y))[0];o.target=tgt;
  const d=dist(o,tgt);if(d>34){const step=Math.min(d-30,dt*7);let nx=o.x+(tgt.x-o.x)/d*step,ny=o.y+(tgt.y-o.y)/d*step;const hd=Math.hypot(nx-home.x,ny-home.y);if(hd>LEASH){nx=home.x+(nx-home.x)/hd*LEASH;ny=home.y+(ny-home.y)/hd*LEASH;}o.x=nx;o.y=ny;}
  o.cd=(o.cd||0)-dt;if(o.cd<=0&&dist(o,tgt)<75){o.cd=2;const [base,grow]=EPIC_HIT[o.epic]||[12,.008];bShot(o,tgt,o.epic==='baron'?'#c8a6f0':'#f3c27a');bDamage({kind:'epic',team:2,x:o.x,y:o.y},tgt,base+s.time*grow);}}
 else if(o.hp<o.maxHp||dist(o,home)>.5){if(!o.resetting){o.resetting=true;o.target=null;}const d=dist(o,home);if(d>.5){const step=Math.min(d,dt*16);o.x+=(home.x-o.x)/d*step;o.y+=(home.y-o.y)/d*step;}o.hp=Math.min(o.maxHp,o.hp+o.maxHp*.12*dt);if(o.hp>=o.maxHp&&d<=.5){o.resetting=false;o.x=home.x;o.y=home.y;}}};
// ---------- team brain ----------
const PITS=()=>[T().baron,T().dragon];
function nextObjective(t){const s=state,list=[];for(const o of PITS()){if(o.spent&&!o.alive)continue;const inT=o.alive?0:o.respawn-s.time;if(!Number.isFinite(inT)||inT>(s.time<FORTIFY?40:90))continue;if(o.epic==='baron'&&s.time<1200)continue;list.push({o,inT});}return list.sort((a,b)=>a.inT-b.inT)[0]||null;}
function front(team,lane){const s=T();if(frontCache.t!==s.time)frontCache={t:s.time,m:new Map()};const key=team*3+lane;if(frontCache.m.has(key))return frontCache.m.get(key);const r=frontRaw(team,lane);frontCache.m.set(key,r);return r;}
function frontRaw(team,lane){const own=T().minions.filter(m=>m.team===team&&m.lane===lane&&live(m));if(!own.length)return null;return own.sort((a,b)=>team?a.progress-b.progress:b.progress-a.progress)[0];}
function ownTower(team,lane){return T().structures.filter(t=>t.kind==='tower'&&t.team===team&&t.lane===lane&&t.hp>0).sort((a,b)=>a.tier-b.tier)[0]||T().structures.find(t=>t.kind==='inhibitor'&&t.team===team&&t.lane===lane&&t.hp>0)||bBase(team);}
function weakestLane(t){const e=opp(t),s=state;let best=1,score=-1;for(let l=0;l<3;l++){const lost=s.structures.filter(u=>u.team===e&&u.lane===l&&u.hp<=0).length,f=front(t,l),prog=f?(t?1-f.progress:f.progress):0;const v=lost*2+prog*3;if(v>score){score=v;best=l;}}return best;}
function laneRoles(l){return l===0?[0]:l===1?[2]:[3,4];}
function enemyThreatAt(t,p,r){return T().actors.filter(a=>a.team!==t&&live(a)&&dist(a,p)<r&&sees(t,a)).length;}
function plan(t){const s=state,e=opp(t),us=s.actors.filter(a=>a.team===t&&live(a)),them=s.actors.filter(a=>a.team===e&&live(a)),diff=us.length-them.length;
 const P=us.reduce((x,a)=>x+heroPower(a),0)/Math.max(.1,them.reduce((x,a)=>x+heroPower(a),0));
 const outerDown=s.structures.filter(u=>u.kind==='tower'&&u.tier===0&&u.hp<=0).length,innerDown=s.structures.some(u=>u.kind==='tower'&&u.tier>=1&&u.hp<=0);
 const phase=s.time<FORTIFY&&outerDown<3?'lane':s.time<1500&&!innerDown?'mid':'late';
 const pol=POLICY_DEFAULT,order=!t&&s.teamOrder&&s.teamOrder.until>s.time?s.teamOrder:null;
 let mode=phase==='lane'?'lane':'group',point=null,obj=null,lane=1;
 // threatened base?
 const threatened=s.structures.filter(u=>u.team===t&&u.hp>0&&(u.kind==='inhibitor'||u.kind==='tower'&&u.tier>=2)).find(u=>enemyThreatAt(t,u,230)>=2);
 const no=nextObjective(t);
 // 1.01 家裡有對方兵線：兵營破了或兵已經打進高地 → 清兵守家；對方英雄也在就全隊回防
 const homeB=bBase(t),wave=s.minions.filter(m=>m.team===e&&live(m)&&dist(m,homeB)<340),raid=them.filter(a=>dist(a,homeB)<340&&sees(t,a)).length,coreHit=s.cores[t].hp>0&&s.cores[t].hp<s.cores[t].maxHp&&enemyThreatAt(t,s.cores[t],240)>=1;
 const ownInhibDown=s.structures.some(u=>u.team===t&&u.kind==='inhibitor'&&u.hp<=0),enemyInhibDown=s.structures.some(u=>u.team===e&&u.kind==='inhibitor'&&u.hp<=0);
 const baseCall=coreHit||raid>=2||wave.length>=5||(wave.length>=2&&ownInhibDown);
 const wavePoint=wave.length?{x:wave.reduce((x,m)=>x+m.x,0)/wave.length,y:wave.reduce((x,m)=>x+m.y,0)/wave.length}:null;
 if(baseCall&&!(order&&order.mode==='defend')&&(raid>=1||coreHit||!order)){mode='defend';point=raid||coreHit?(threatened||s.cores[t]):wavePoint;}
 else if(!order&&s.time>900&&us.length>=3&&(them.length<=1||diff>=3)){const big=[s.baron,s.dragon].find(o=>o.alive&&(o.epic==='baron'||o.epic==='elder')),wait=Math.max(0,...s.actors.filter(a=>a.team===e&&a.dead>0).map(a=>a.dead));
  if(big&&wait>22){mode='objective';obj=big;}else{mode='siege';lane=weakestLane(t);}if(!s._acePush?.[t]||s.time-s._acePush[t]>150){(s._acePush||(s._acePush=[-99,-99]))[t]=s.time;try{story('call',t,{label:big&&wait>22?`趁人數優勢拿${big.name}`:'趁人數優勢反推'});}catch{}}}
 else if(order){mode=order.mode;point=order.point||null;obj=order.obj||null;lane=order.lane??lane;}
 else if(threatened){mode='defend';point=threatened;}
 else if((s.heroBuff[t]>s.time||diff>=2)&&s.time>840&&us.length>=3){mode='siege';lane=weakestLane(t);}
 else if(enemyInhibDown&&s.time>840&&us.length>=4&&diff>=0&&P>=.9&&!no){mode='siege';lane=weakestLane(t);}
 else if(no){const o=no.o,big=o.epic==='baron'||o.epic==='elder',want=pol.objective==='priority'?.85:1;const contest=P*(us.length/Math.max(1,them.length));
  if(o.epic==='baron'){const theyStart=o.alive&&s.actors.some(a=>a.team===e&&live(a)&&dist(a,o)<150&&sees(t,a));if(us.length>=4&&(diff>=2||diff>=1&&P>1.1||P>1.3||theyStart&&contest>=.85)){mode='objective';obj=o;}}
  else if(contest>=want*(big?1.05:1)){mode='objective';obj=o;}
  else if(no.inT<30){mode=phase==='lane'?'lane':'trade';lane=o===s.dragon?0:2;}}
 if(mode==='group'&&(pol.macro!=='group'&&!t||s.time>1500&&P<.95)){mode=pol.macro==='131'?'131':'41';} // 後期落後時兩隊都會考慮分推
 const st=styleOf(t);if(!order&&s.time<LVL1_END&&st.lvl1!=='lane')mode='lvl1';
 const tasks=[];for(const a of s.actors.filter(a=>a.team===t)){let k=mode;
  if(mode==='lane')k=a.role===1?'jungle':'lane';
  if(mode==='lvl1')k=a.role===1&&st.lvl1!=='invade'?'jungle':'lvl1';
  if(mode==='objective'){const top=obj===s.baron&&s.time<1200,early=phase==='lane',midFree=!s.actors.some(b=>b.team===e&&b.role===2&&live(b)&&laneOf(b)===1&&dist(b,ownTower(t,1)||b)<260);const group=obj.epic==='baron'||obj.epic==='elder'?[0,1,2,3,4]:top?(early?[0,1]:[0,1,2]):early?(midFree?[1,2,3,4]:[1,3,4]):[1,2,3,4];k=group.includes(a.role)?'objective':(phase==='lane'?'lane':'split');}
  if(mode==='41')k=a.role===0?'split':'group';
  if(mode==='131')k=a.role===0?'split':a.role===2?'split2':'group';
  if(mode==='trade')k=a.role===1?'jungle':'push';
  tasks.push({role:a.role,kind:k,obj,point,lane});}
 if(t===0){const so=s.stealOrder,ho=s.huntOrder;
  if(so&&so.until>s.time&&so.obj.alive)for(const k of tasks)if(so.roles.includes(k.role)){k.kind='objective';k.obj=so.obj;}
  if(ho&&ho.until>s.time&&live(ho.target))for(const k of tasks)if(ho.roles.includes(k.role)){k.kind='hunt';k.target=ho.target;}}
 if(mode!=='defend'&&wave.length>=2&&ownInhibDown){const near2=s.actors.filter(a=>a.team===t&&live(a)).sort((x,y)=>dist(x,homeB)-dist(y,homeB)).slice(0,2).map(a=>a.role);for(const k of tasks)if(near2.includes(k.role)){k.kind='defend';k.point=wavePoint;}}
 s.plan[t]={mode,phase,P,diff,obj,lane,point,tasks,at:s.time};
 if(t===1)surrenderCheck(1,P);else surrenderCheck(0,P);}
function surrenderCheck(t,P){const s=state;if(s.time<900||s.done)return;const e=opp(t),lost=s.structures.filter(u=>u.team===t&&u.hp<=0).length-s.structures.filter(u=>u.team===e&&u.hp<=0).length,gap=s.gold[e]-s.gold[t];if(gap<9000||lost<5||P>.7)return;
 if(t===1){if(s.time-(s.surrenderAsked||0)>180){s.surrenderAsked=s.time;if(Math.random()<.6){s.surrender=1;s.winner=0;log('赤潮發起投降投票並通過。');finish();}}}
 else if(!s.decision&&s.time-(s.surrenderAsked||0)>180){s.surrenderAsked=s.time;s.macroEvents.surrender=true;}}
// ---------- hero behaviour ----------
function stand(a,lane,back){const f=front(a.team,lane);if(!f){const t=ownTower(a.team,lane);return{x:t.x+(a.team?-1:1)*0,y:t.y};}const len=lane===1?763:1080,d=back/len;return bPoint(lane,Math.max(0,Math.min(1,f.progress+(a.team?d:-d))));}
function spell(a,id){return a.spells?.find(x=>x.id===id&&x.cd<=0);}
function use(a,id){const sp=a.spells?.find(x=>x.id===id);if(sp)sp.cd=SPELLS[id].cd;if(a.player)log(`你使用了${SPELLS[id].name}。`);}
function blink(a,to,dist0){const dx=to.x-a.x,dy=to.y-a.y,d=Math.hypot(dx,dy)||1;for(const r of[dist0,dist0*.8,dist0*.6]){const x=a.x+dx/d*r,y=a.y+dy/d*r;if(!window.RIFT_NAV||RIFT_NAV.walk(x,y)){a.x=x;a.y=y;a.nav=null;T().effects.push({x,y,ttl:1,color:'#ffe9a8',label:SPELLS.flash.name});return true;}}return false;}
function underEnemyTower(a,p){return T().structures.some(t=>t.kind==='tower'&&t.team!==a.team&&t.hp>0&&dist(t,p)<(t.tier===3?95:110));}
// 0.71 選手判斷力（0＝新手、1＝世界級）：越高越要有明顯優勢才開打、越不輕易越塔；越低越容易硬打、互換人頭。
// 生涯比賽由 talent.js 的 MATCH_IQ 依選手能力決定；練習賽一律 0.5（＝原本的門檻）。
function iqOf(a){if(a.iq==null){let v=.5;try{const f=window.MATCH_IQ;if(f){const x=f(a);if(Number.isFinite(x))v=x;}}catch{}a.iq=Math.max(0,Math.min(1,v));}return a.iq;}
const caution=a=>{const q=iqOf(a);return .7+.9*q*q;};
// ---------- 0.74 戰術層：隊伍風格、開局一級團、打野路線、事件紀錄（給主播與聊天室） ----------
const LVL1_END=78,LANE_NAME=['上路','中路','下路'],FOCUS_LANE={top:0,mid:1,bot:2};
// 1.26 Gank 沒殺到也有後續：反蹲打起來、對手被打殘回城、逼出閃現、或打野白跑一趟被吃野
function gankAfter(a,v){const s=state;if(!s||!live(v)||v._gaAt&&s.time-v._gaAt<30)return;v._gaAt=s.time;const T=a.team,hpR=v.hp/Math.max(1,v.maxHp);
 const ej=s.actors.find(b=>b.team!==T&&b.role===1&&live(b)&&dist(b,v)<560);let label;
 if(ej){label=`${ej.heroName} 來反蹲，兩邊打起來了！`;for(const b of s.actors)if(live(b)&&b.kind!=='minion'&&(b===a||b===v||b===ej||dist(b,v)<360))b.engageCall=s.time+8;}
 else if(hpR<.4){label=`沒殺到，但 ${v.heroName} 被打殘回城`;v.recalling=true;}
 else if(spell(v,'flash')&&Math.random()<.6){label=`沒殺到，但逼出 ${v.heroName} 的閃現`;const f=spell(v,'flash');f.cd=300;}
 else{label=`${a.heroName} 白跑一趟，對面趁機吃野`;if(s.gold)s.gold[1-T]+=120;}
 story('call',T,{label,gank:1});}
function story(type,team,v={}){const s=state;if(!s)return;(s.story||(s.story=[])).push({at:s.time,type,team,...v});if(s.story.length>600)s.story.splice(0,s.story.length-600);}
// 隊伍風格：生涯比賽由 TEAM_STYLE（talent.js）依戰隊陣容決定；練習賽隨機
function styleOf(t){const s=state;if(!s.style)s.style={};if(!s.style[t]){let st=null;try{st=window.TEAM_STYLE?.(t)||null;}catch{}
 if(!st){const R=Math.random;st={lvl1:R()<.25?'invade':R()<.75?'defend':'lane',start:R()<.5?'red':'blue',focus:['top','mid','bot'][Math.floor(R()*3)],early:R()<.5,cj:.35,label:''};}
 s.style[t]=st;story('style',t,{label:st.label,focus:st.focus,lvl1:st.lvl1});}return s.style[t];}
const ownCamp=(t,type)=>state.camps.find(c=>c.home===t&&c.type===type);
function lvl1Point(a){const s=state,t=a.team,st=styleOf(t),k=(a.role%3)-1,j=(a.role>>1)-1;
 if(st.lvl1==='invade'){const c=ownCamp(opp(t),st.invadeAt||'blue')||ownCamp(opp(t),'blue'),home=bBase(t),d=dist(c,home)||1;return {x:c.x+(home.x-c.x)/d*34+k*12,y:c.y+(home.y-c.y)/d*34+j*10};}
 // 守野區：上中守上半邊入口，下路雙人守下半邊入口
 // 用地圖位置判斷上／下半邊（兩隊野怪是旋轉對稱，同種野怪對兩隊在不同半邊）
 const topSide=c=>c.y<640-.8*c.x,own=['red','blue'].map(k=>ownCamp(t,k)).filter(Boolean),want=a.role===0||a.role===2;
 const c=own.find(x=>topSide(x)===want)||own[0];
 return {x:c.x+(400-c.x)*.2+k*10,y:c.y+(320-c.y)*.2+j*8};}
// ---------- 0.75 對線：依職業相剋、熟練度（電腦用判斷力）、版本強度＋少量隨機決定每路優勢；比賽中再依等級、血量變動 ----------
// 0.75 相剋表：依雲端校正（600 場、3770 次同路擊殺，關掉相剋時的實際勝率）換算，(勝率-50%)×1.2，上限 ±0.3；樣本 25 次以上才採用
const CLASS_ADV={法師:{刺客:.14,鬥士:.1,射手:.01,坦克:.3,輔助:.26},射手:{刺客:.3,鬥士:.24,坦克:.3},鬥士:{坦克:.13,刺客:.07,輔助:.1,戰士:.07},戰士:{坦克:.13,刺客:.07,輔助:.1},輔助:{刺客:.08},坦克:{刺客:.3},刺客:{},支援:{}};
const clsOf=a=>(ROSTER[a.heroIndex]?.style||'鬥士').split('・')[0];
const CALIB=()=>globalThis.LANE_CALIB===true; // 校正模式：關掉相剋，只記錄引擎原本的對線勝負
function adv(a,b){if(CALIB())return 0;const x=clsOf(a),y=clsOf(b);return (CLASS_ADV[x]?.[y]??-(CLASS_ADV[y]?.[x]??0));}
// 熟練度與版本強度已經反映在引擎的英雄戰力（power），這裡只看判斷力，避免重複計算
function skillOf(a){return iqOf(a);}
const laners=(t,l)=>state.actors.filter(a=>a.team===t&&laneRoles(l).includes(a.role));
function laneEdges(){const s=state;if(s.laneEdge)return s.laneEdge;const e=[[0,0,0],[0,0,0]];if(CALIB()){s.laneEdge=e;return e;}
 for(let l=0;l<3;l++){const A=laners(0,l),B=laners(1,l);if(!A.length||!B.length)continue;let v=0;
  for(const a of A)for(const b of B)v+=adv(a,b)/(A.length*B.length);
  const avg=(L,f)=>L.reduce((x,u)=>x+f(u),0)/L.length;
  v+=(avg(A,skillOf)-avg(B,skillOf))*.8+(Math.random()-.5)*.35;
  v=Math.max(-1,Math.min(1,v));e[0][l]=v;e[1][l]=-v;}
 s.laneEdge=e;let best=0;for(let l=1;l<3;l++)if(Math.abs(e[0][l])>Math.abs(e[0][best]))best=l;
 if(Math.abs(e[0][best])>.15){const t=e[0][best]>0?0:1,w=laners(t,best)[0],v=laners(1-t,best)[0];story('matchup',t,{lane:LANE_NAME[best],who:w?.heroName,victim:v?.heroName});}
 return e;}
// 即時領先程度（-1～1）：開局優勢＋等級差＋血量差
function laneLead(a,lane){const s=state,e=laneEdges()[a.team][lane]||0,me=laners(a.team,lane).filter(live),them=laners(opp(a.team),lane).filter(live);
 if(!them.length)return Math.min(1,e*.5+.5);if(!me.length)return -1;
 const avg=(L,f)=>L.reduce((x,u)=>x+f(u),0)/L.length;
 const v=e*.55+(avg(me,u=>u.level||1)-avg(them,u=>u.level||1))*.15+(avg(me,u=>u.hp/u.maxHp)-avg(them,u=>u.hp/u.maxHp))*.45;
 return Math.max(-1,Math.min(1,v));}
function fightValue(a,r=230){const s=state,our=powerNear(a.team,a,r),their=powerNear(opp(a.team),a,r,a.team);return their>0?our/their:9;}
function chooseTarget(a,foes){return foes.sort((x,y)=>(x.hp/tough(x))-(y.hp/tough(y))+(dist(a,x)-dist(a,y))/300)[0];}
function useSpells(a,target,fighting){const s=state;
 if(a.hp<a.maxHp*.3&&fighting){if(spell(a,'heal')){use(a,'heal');a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.22);const ally=s.actors.filter(b=>b.team===a.team&&b!==a&&live(b)&&dist(a,b)<140).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0];if(ally)ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*.15);}else if(spell(a,'barrier')){use(a,'barrier');a.shield=(a.shield||0)+a.maxHp*.3;}}
 if(!target)return;
 if(fighting&&target.hp<target.maxHp*.4&&dist(a,target)<a.range+40&&spell(a,'ignite')&&!(target.burnUntil>s.time)){use(a,'ignite');s.burns.push({from:a,to:target,until:s.time+5,dps:6+a.level*2.2});target.burnUntil=s.time+5;}
 if(fighting&&spell(a,'exhaust')&&dist(a,target)<120&&target.hp>target.maxHp*.4){use(a,'exhaust');target.exhaustUntil=s.time+3;target.slowUntil=s.time+3;target.slowPct=Math.max(target.slowPct||0,.3);}
 if(spell(a,'cleanse')&&(a.rootUntil>s.time||a.stunUntil>s.time||a.slowUntil>s.time&&(a.slowPct||0)>=.3)&&s.actors.some(e=>e.team!==a.team&&live(e)&&dist(a,e)<160)){use(a,'cleanse');a.rootUntil=0;a.stunUntil=0;a.slowUntil=0;a.slowPct=0;a.exhaustUntil=0;s.effects.push({x:a.x,y:a.y,ttl:1,color:'#e6f6ff',label:SPELLS.cleanse.name});}
 if(fighting&&target&&spell(a,'ghost')&&target.kind==='hero'&&target.hp<target.maxHp*.4&&dist(a,target)>a.range&&dist(a,target)<240){use(a,'ghost');a.speedUntil=s.time+8;a.speedPct=.45;}
 if(fighting&&spell(a,'flash')&&target.hp<target.maxHp*.22&&dist(a,target)>a.range&&dist(a,target)<a.range+75&&!underEnemyTower(a,target)){if(blink(a,target,Math.min(75,dist(a,target)-a.range*.7)))use(a,'flash');}}
function escape(a,foes){const s=state;if(spell(a,'ghost')&&a.hp<a.maxHp*.35&&foes.some(f=>dist(a,f)<160)){use(a,'ghost');a.speedUntil=s.time+8;a.speedPct=.45;}if(spell(a,'flash')&&a.hp<a.maxHp*.22&&foes.some(f=>dist(a,f)<110)){const home=bBase(a.team);if(blink(a,home,75))use(a,'flash');}}
// 0.56 回城：真實 MOBA 是原地詠唱 8 秒傳回主堡，不是走回去。只有附近有敵人時才先撤退，拉開距離就開始詠唱。
function goHome(a,dt){const s=state,home=bBase(a.team),foes=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<180&&sees(a.team,b));
 if(dist(a,home)<50){a.recallAt=null;a.lastBack=T().time;return true;}
 if(!foes.length&&a.recallAt==null&&s.time-(a.lastHurt??-99)>1.5)a.recallAt=s.time;
 if(a.recallAt!=null){if(foes.length){a.recallAt=null;}else if(s.time-a.recallAt>=RECALL){Object.assign(a,home);a.nav=null;a.recallAt=null;s.recallCount=(s.recallCount||0)+1;return true;}else return false;}
 if(a.rootUntil<=s.time)bWalk(a,home,dt*speed(a));return false;}
function speed(a){return (a.role===1?15:14)*(a.hasteUntil>T().time?1.15:1);}
function attack(a,target){const s=state;if(!target||a.cd>0||dist(a,target)>a.range+meleeStep(a,target))return;if(['tower','inhibitor','core'].includes(target.kind)&&!bCanHit(a,target))return;a.cd=a.hasteUntil>s.time?1.1:1.6;const amount=a.attack*a.power*Math.pow(Math.max(1,s.gold[a.team])/Math.max(1,s.gold[1-a.team]),.2)*(s.heroBuff[a.team]>s.time?1.12:1);if(a.player&&target.kind==='tower')s.personal.towerDamage+=Math.min(target.hp,amount);bDamage(a,target,amount);bShot(a,target);}
function towerBlocked(a,p){const s=T();for(const t of s.structures){if(t.kind!=='tower'||t.team===a.team||t.hp<=0)continue;const r=(t.tier===3?95:110)+8;if(dist(t,p)>=r)continue;const tanked=s.minions.some(m=>m.team===a.team&&live(m)&&dist(m,t)<r-4)&&!(t.focus===a);if(!tanked)return t;}return null;}
function moveTo(a,p,dt,keep=0,force=false){const s=T();if(!p||a.rootUntil>s.time)return;const ox=a.x,oy=a.y;
 if(!force){const here=towerBlocked(a,a);if(here){const d=dist(a,here)||1;bWalk(a,{x:a.x+(a.x-here.x)/d*40,y:a.y+(a.y-here.y)/d*40},dt*speed(a));return;}}
 if(dist(a,p)>keep+2)bWalk(a,p,dt*speed(a));
 if(!force&&towerBlocked(a,a)){a.x=ox;a.y=oy;}}
function placeWard(a,near){const s=state;if(!SPOTS||a.wardCharges<1)return;const spot=SPOTS.map(p=>({x:p[0],y:p[1]})).filter(p=>dist(p,near)<220&&dist(p,a)<60&&!s.wards.some(w=>w.team===a.team&&w.until>s.time&&dist(w,p)<100)).sort((x,y)=>dist(x,a)-dist(y,a))[0];if(!spot)return;a.wardCharges--;s.wards.push({x:spot.x,y:spot.y,team:a.team,until:s.time+120,owner:a.role});}
function sweep(a){const s=state;s.wards=s.wards.filter(w=>!(w.team!==a.team&&dist(w,a)<100));}
function wardTarget(a,near){if(!SPOTS||a.wardCharges<1)return null;const s=state;return SPOTS.map(p=>({x:p[0],y:p[1]})).filter(p=>dist(p,near)<200&&!s.wards.some(w=>w.team===a.team&&w.until>s.time&&dist(w,p)<100)).sort((x,y)=>dist(x,a)-dist(y,a))[0]||null;}
function jungle(a,dt){const s=state,pol=a.player?policy():POLICY_DEFAULT;
 // gank check
 const old=GANK.get(a);if(old&&s.time>old.until){if(old.arrived&&live(old.victim)){gankAfter(a,old.victim);}if(old.arrived&&live(old.victim))story('gankFail',a.team,{who:a.heroName,victim:old.victim.heroName,lane:old.lane,why:'timeout',seen:!!old.seen,vhp:Math.round(old.victim.hp/old.victim.maxHp*100)});GANK.delete(a);a.gankCD=s.time+45-20*iqOf(a);}
 if(!GANK.get(a)){const st=styleOf(a.team),gate=150+45*iqOf(a);if(a.hp>a.maxHp*.6&&s.time>gate&&(!(a.gankCD>s.time)||!a.team&&s.callJg&&s.callJg.until>s.time)){let best=null,bestL=0,score=1.4-(pol.jungle==='gank'?.6:pol.jungle==='farm'?-.6:0);for(let l=0;l<3;l++){const victim=s.actors.find(b=>b.team!==a.team&&live(b)&&laneRoles(l).includes(b.role)&&b.task?.kind==='lane');if(!victim)continue;const ally=s.actors.find(b=>b.team===a.team&&live(b)&&laneRoles(l).includes(b.role)&&dist(b,victim)<240);const vt=ownTower(victim.team,l),off=vt?dist(victim,vt):300,minOff=l===1?55:85;if(off<minOff)continue;let v=Math.min(1.2,(off-minOff)/200)+(l===1?.4:0)+Math.max(0,laneLead(victim,l))*.2+(victim.hp<victim.maxHp*.6?1:0)+(ally?1:0)+((a.team?victim.y<victim.x-80:victim.y>victim.x-80)?.5:0)-(s.wards.some(w=>w.team===victim.team&&w.until>s.time&&dist(w,victim)<170)?1:0)+(l===2?.7:0)+(spell(victim,'flash')?0:.7)-dist(a,victim)/600;if(FOCUS_LANE[st.focus]===l)v+=.5;v+=window.PLAYS?.gankBonus?.(a,victim,l)||0;if(!a.team&&s.callJg&&s.callJg.until>s.time&&s.callJg.lane===l)v+=1.4;if(v>score){score=v;best=victim;bestL=l;}}if(best){GANK.set(a,{victim:best,until:s.time+35,lane:LANE_NAME[bestL]});try{window.PLAYS?.onGank?.(a,best,bestL);}catch{}}}}
 const gk=GANK.get(a);a.gankTarget=gk&&gk.arrived?gk.victim:null;if(gk){const v=gk.victim;if(!gk.boost&&dist(a,v)<420){gk.boost=1;a.speedUntil=s.time+5;a.speedPct=Math.max(a.speedPct||0,.3);}if(!gk.arrived&&(dist(a,v)<130||s.wards.some(w=>w.team===v.team&&w.until>s.time&&dist(w,a)<120&&dist(w,v)<320)))gk.seen=1;
  if(!gk.arrived&&live(v)&&dist(a,v)<160){gk.arrived=1;gk.at=s.time;a.speedUntil=s.time+3;a.speedPct=Math.max(a.speedPct||0,.3);if(!gk.seen){v.caughtUntil=s.time+Math.max(1.1,2.2-1.2*iqOf(v));v.slowUntil=v.caughtUntil;v.slowPct=Math.max(v.slowPct||0,.3);}story('gank',a.team,{who:a.heroName,victim:v.heroName,lane:gk.lane});}if(gk.arrived)(s.ganking||(s.ganking={}))[a.team]={victim:v,until:s.time+6};
  const commit=live(v)&&v.hp<v.maxHp*.4&&fightValue(a)>=1.25&&!s.structures.some(t=>t.kind==='tower'&&t.team===v.team&&t.hp>0&&t.tier>0&&dist(t,v)<110);
  if(!live(v)||underEnemyTower(a,v)&&fightValue(a)<1.6&&!commit){if(gk.arrived&&live(v))gankAfter(a,v);if(gk.arrived)story(live(v)?'gankFail':'gankKill',a.team,{who:a.heroName,victim:v.heroName,lane:gk.lane,why:live(v)?'tower':'kill',seen:!!gk.seen,vhp:Math.round(v.hp/v.maxHp*100),dur:Math.round(s.time-(gk.at||s.time))});GANK.delete(a);a.gankCD=s.time+45-20*iqOf(a);}else{const foes=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<a.range+60);if(foes.length&&dist(a,v)<a.range+60){const tgt=chooseTarget(a,foes);useSpells(a,tgt,true);bSkill(a,tgt);attack(a,tgt);moveTo(a,tgt,dt,a.range*.8);return;}moveTo(a,v,dt);return;}}
 if(!a.team&&s.jgGuard&&s.jgGuard.until>s.time){const p=s.actors.find(b=>b.player&&live(b));if(p){const foes=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(b,a)<a.range+90);if(foes.length&&skirmish(a,dt,a.range+90))return;const t=ownTower(a.team,bLane(p.role)),d=dist(p,t)||1;moveTo(a,{x:p.x+(t.x-p.x)/d*45,y:p.y+(t.y-p.y)/d*45},dt,10);return;}}
 const st=styleOf(a.team);let camp=s.camps[a.campTarget];
 // 反野：對方打野在遠處現身、附近的敵方野怪還活著、局勢不吃虧
 const ejg=s.actors.find(b=>b.team!==a.team&&b.role===1&&live(b)&&sees(a.team,b));
 const steal=st.lvl1==='invade'&&s.time<150&&!st._stole?ownCamp(opp(a.team),st.invadeAt||'blue'):null;
 if(steal?.alive&&dist(a,steal)<380&&!(ejg&&dist(ejg,steal)<120&&fightValue(a,200)<1)){camp=steal;if(!st._stoleTold){st._stoleTold=1;story('buffSteal',a.team,{who:a.heroName,camp:steal.type});}}
 else if(camp?.alive&&camp.home!==a.team&&camp.home!==-1&&!(ejg&&dist(ejg,camp)<300)){/* 繼續吃 */}
 else if(!camp?.alive||camp.home!==a.team&&camp.home!==-1){camp=bNearest(a,s.camps.filter(c=>c.alive&&(c.home===a.team||c.home===-1&&(a.team?c.y<c.x+0:c.y>c.x-80))));
  const want=Math.random()<st.cj*(.5+iqOf(a));
  if(want&&ejg&&s.time>200&&fightValue(a,260)>=1){const ec=bNearest(a,s.camps.filter(c=>c.alive&&c.home===opp(a.team)&&dist(c,ejg)>330&&dist(c,a)<320));if(ec&&!(ec._cj>s.time)){ec._cj=s.time+90;camp=ec;story('counterjungle',a.team,{who:a.heroName,camp:ec.type});}}}
 if(!camp){// 野怪還沒出生或清完：在出生點／最快重生的野怪旁等，不亂晃到中路
  const own=s.camps.filter(c=>c.home===a.team);const wait=s.time<95?ownCamp(a.team,st.start||'blue'):own.slice().sort((x,y)=>(x.respawn||0)-(y.respawn||0))[0];
  if(wait&&(s.time<95||(wait.respawn||0)-s.time<25)){moveTo(a,{x:wait.x+(a.team?-14:14),y:wait.y+(a.team?-10:10)},dt,6);return;}
  const w=wardTarget(a,a);moveTo(a,w||(wait?{x:wait.x,y:wait.y}:bPoint(1,a.team?.6:.4)),dt);if(w&&dist(a,w)<30)placeWard(a,w);return;}
 a.campTarget=camp.index;if(dist(a,camp)>55){moveTo(a,camp,dt);return;}bSkill(a,camp);if(a.cd<=0){a.cd=1.6;bDamage(a,camp,a.attack*a.power*1.7);bShot(a,camp);}}
function laneBehaviour(a,lane,dt,stance){const s=state,foesHero=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<a.range+70&&sees(a.team,b)),foeMinions=s.minions.filter(m=>m.team!==a.team&&m.lane===lane&&live(m)&&dist(a,m)<a.range+10),reachMinions=s.minions.filter(m=>m.team!==a.team&&m.lane===lane&&live(m)&&dist(a,m)<a.range+120);
 if(a.player&&a.engageUntil>s.time&&live(a.engageTarget)&&!foesHero.includes(a.engageTarget)&&dist(a,a.engageTarget)<340&&s.actors.some(b=>b.team===a.team&&b.role===1&&live(b)&&dist(b,a.engageTarget)<230))foesHero.push(a.engageTarget); // 0.86：打野到了就一起追
 const fv=fightValue(a,200),pressing=foesHero.find(f=>FOCUS.get(f)===a&&dist(f,a)<f.range+8);let fight=false;
 const lead=s.time>65?laneLead(a,lane):0;
 if(foesHero.length){const low=foesHero.some(f=>f.hp<f.maxHp*.3)&&a.hp>a.maxHp*.4;const cu=caution(a)*(1-(lead>0?0:.3)*lead),gv=s.ganking?.[a.team],help=gv&&gv.until>s.time&&foesHero.includes(gv.victim)&&live(gv.victim)&&a.hp>a.maxHp*.35;a.gankTarget=help?gv.victim:null;fight=(help&&fv>.85)||(stance==='trade'&&fv>1.3*cu&&a.hp>a.maxHp*.6)||(fv>1.6*cu&&a.hp>a.maxHp*.5)||(low&&fv>1.05*cu)||(pressing&&fv>.95);
  const dive=a.player&&a.diveUntil>s.time,eng=a.player&&a.engageUntil>s.time&&a.engageTarget&&foesHero.includes(a.engageTarget)&&live(a.engageTarget);
  if(dive&&fv>.95)fight=true;if(eng&&fv>.8)fight=true;if(a.player&&a.orderBackUntil>s.time&&!pressing&&!eng)fight=false;
  if(fight){const tgt=eng?a.engageTarget:help?gv.victim:chooseTarget(a,foesHero);if(underEnemyTower(a,tgt)&&fv<1.7*cu&&!dive)fight=false;else{FOCUS.set(a,tgt);useSpells(a,tgt,true);bSkill(a,tgt);attack(a,tgt);moveTo(a,tgt,dt,a.range*.85,fv>=1.7);return;}}}
 const caught=a.caughtUntil>s.time;FOCUS.delete(a);if(!caught)escape(a,foesHero);
 const back=(caught?10:stance==='trade'?6:fv<.8?48:22)-(lead>0?0:lead*32)+(a.player&&a.orderBackUntil>s.time?55:0),spot=stand(a,lane,(a.range<100&&back<=22?back*.4:back)+(a.role===4?14:0));
 const tower=bStructuresTarget(a);const ownNearTower=s.minions.some(m=>m.team===a.team&&live(m)&&dist(m,tower)<110&&s.structures.includes(tower)&&tower.focus===m||m.team===a.team&&live(m)&&dist(m,tower)<100);
 if(!foeMinions.length&&reachMinions.length&&a.role!==4){const hit0=Math.max(a.attack*a.power*levelMul(a),lastHitDmg(a))*1.02,m=reachMinions.filter(m=>m.hp<=hit0*(a.range<100?2.6:1.8)).sort((x,y)=>x.hp-y.hp)[0];
  const sp=m&&(()=>{const d=dist(a,m)||1,k=Math.min(1,a.range*.9/d);return{x:m.x+(a.x-m.x)*k,y:m.y+(a.y-m.y)*k};})();
  if(m&&!(underEnemyTower(a,sp)&&!ownNearTowerOf(a,lane))&&!(fv<.55*caution(a)&&a.hp<a.maxHp*.7&&s.actors.some(b=>b.team!==a.team&&live(b)&&b.kind==='hero'&&b.hp>b.maxHp*.5&&dist(b,m)<b.range+10))){moveTo(a,m,dt,a.range*.9);if(m.hp<=hit0&&dist(a,m)<=a.range+meleeStep(a,m))attack(a,m);return;}}
 if(foeMinions.length){const hit=Math.max(a.attack*a.power*levelMul(a),lastHitDmg(a))*1.02,sorted=foeMinions.sort((x,y)=>x.hp-y.hp),kill=sorted.find(m=>m.hp<=hit),laning=s.time<FORTIFY,push=stance==='trade'||!foesHero.length||!laning;
  if(kill&&a.role!==4){if(dist(a,kill)>a.range+meleeStep(a,kill)){if(!underEnemyTower(a,kill)||ownNearTowerOf(a,lane)){moveTo(a,kill,dt,a.range*.9);return;}}else if(a.cd<=0&&Math.random()>.12+.38*(1-iqOf(a)))attack(a,kill);else if(a.cd<=0)a.cd=.6;}
  else if(push&&(a.role!==4||sorted[0].hp<a.attack*2)){if(foeMinions.length>=3)bSkill(a,foeMinions[0]);attack(a,sorted[0]);}
  else if(a.role===4&&kill&&!s.actors.some(u=>u.team===a.team&&u!==a&&u.role===3&&live(u)&&dist(u,a)<200))attack(a,kill);}
 else if(tower&&dist(a,tower)<a.range+5&&bCanHit(a,tower)&&ownNearTower&&!foesHero.length)attack(a,tower);
 else if(tower&&ownNearTower&&!foesHero.length&&dist(a,tower)<a.range+80){moveTo(a,tower,dt,a.range*.85,true);return;}
 if(underEnemyTower(a,spot)&&!ownNearTower){const t=ownTower(a.team,lane);moveTo(a,{x:(spot.x+t.x)/2,y:(spot.y+t.y)/2},dt);return;}
 if(a.role===4&&a.wardCharges>0&&s.time>90){const w=wardTarget(a,spot);if(w&&dist(w,spot)<160){moveTo(a,w,dt);if(dist(a,w)<30)placeWard(a,w);return;}}
 moveTo(a,spot,dt,6);}
function ownNearTowerOf(a,lane){const s=state,tw=s.structures.find(t=>t.kind==='tower'&&t.team!==a.team&&t.lane===lane&&t.hp>0&&dist(t,a)<220);return !tw||s.minions.some(m=>m.team===a.team&&live(m)&&dist(m,tw)<100);}
function groupPoint(t,lane){const f=front(t,lane);if(f)return stand({team:t},lane,40);const tw=ownTower(t,lane);return{x:tw.x,y:tw.y};}
function skirmish(a,dt,r=240,force=false){if(state.time<40)return false;const s=state,foes=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<r&&sees(a.team,b));if(!foes.length)return false;const fv=fightValue(a,r);const bar=effectiveBar(a.team,a)*(T().plan[a.team].mode==='objective'?.92:1);
 const engaged=foes.some(f=>FOCUS.get(f)===a&&dist(f,a)<f.range+10),contest=T().plan[a.team].mode==='objective'||T().plan[a.team].mode==='defend'||T().plan[a.team].mode==='siege';
 const cu=caution(a);if(force&&fv>=.7||fv>=bar*(contest?1:1.2)*cu||engaged&&fv>=.9||foes.some(f=>f.hp<f.maxHp*.25)&&fv>cu){const tgt=chooseTarget(a,foes.filter(f=>dist(a,f)<r));if(tgt.recalling&&dist(a,tgt)>a.range+25&&!contest&&!force)return false;FOCUS.set(a,tgt);if(underEnemyTower(a,tgt)&&fv<1.5*cu&&!(T().plan[a.team].mode==='siege'))return false;useSpells(a,tgt,true);bSkill(a,tgt);attack(a,tgt);moveTo(a,tgt,dt,a.range*.85,fv>=1.7);return true;}
 escape(a,foes);const safe=ownTower(a.team,laneOf(a));moveTo(a,safe,dt);return true;}
bHero=function(a,dt){const s=state;syncSpells(a);
 if(a.dead>0){a.dead=Math.max(0,a.dead-dt);if(a.dead===0){Object.assign(a,bBase(a.team));a.hp=a.maxHp;a.shield=0;a.nav=null;a.recallAt=null;a.tpAt=null;}return;}
 a.cd-=dt;a.skillCD=Math.max(0,a.skillCD-dt);a.smiteCD=Math.max(0,(a.smiteCD||0)-dt);for(const sp of a.spells||[])sp.cd=Math.max(0,sp.cd-dt);
 a.wardRegen=(a.wardRegen||0)+dt;if(a.wardRegen>(a.role===4?60:120)){a.wardRegen=0;a.wardCharges=Math.min(a.role===4?3:2,(a.wardCharges||0)+1);}
 const home=bBase(a.team);if(dist(a,home)<50){a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.12*dt);a.recalling=a.hp<a.maxHp*.95;if(a.recalling)return;}
 // teleport channel
 if(a.tpAt!=null){if(s.time>=a.tpAt){Object.assign(a,a.tpTo);a.nav=null;a.tpAt=null;s.effects.push({x:a.x,y:a.y,ttl:2,color:'#b7ef86',label:'傳送抵達'});}return;}
 const task=s.plan[a.team]?.tasks?.find(x=>x.role===a.role)||{kind:'lane'};a.task=task;
 const aggro=s.structures.find(t=>t.kind==='tower'&&t.team!==a.team&&t.hp>0&&t.focus===a);
 if(aggro&&!(task.kind==='siege'&&fightValue(a,260)>=1.7)){const d=dist(a,aggro)||1;escape(a,s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<120));bWalk(a,{x:a.x+(a.x-aggro.x)/d*60,y:a.y+(a.y-aggro.y)/d*60},dt*speed(a));return;}
 // low health: disengage and go home
 const foesNear=s.actors.filter(b=>b.team!==a.team&&live(b)&&dist(a,b)<200&&sees(a.team,b));
 if(s.time<FORTIFY&&task.kind==='lane'&&!foesNear.length&&s.time-(a.lastHurt??-99)>5&&a.hp<a.maxHp)a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.006*dt);
 if(!a.recalling&&task.kind==='lane'&&s.time>200&&s.time-(a.lastBack??0)>150&&a.hp<a.maxHp*.5&&!foesNear.length&&!s.minions.some(m=>m.team!==a.team&&live(m)&&dist(m,a)<160)){a.recalling=true;}
 // 1.01 開場一級團打完、兵還沒上線：血量不夠就先回家補滿再出門（不會錯過兵線）
 if(!a.recalling&&s.time>=LVL1_END-10&&s.time<190&&s.time-(a.lastBack??-99)>45&&a.hp<a.maxHp*.72&&!foesNear.length&&!s.minions.some(m=>m.team!==a.team&&live(m)&&dist(m,a)<200)&&dist(a,home)>120){a.recalling=true;}
 if(a.hp<a.maxHp*(s.time<FORTIFY?.24:.32)||a.recalling){a.recalling=true;escape(a,foesNear);useSpells(a,null,foesNear.length>0);if(goHome(a,dt)){a.recalling=a.hp<a.maxHp*.95;}return;}
 // 0.86 玩家決策的指令：開團＝全隊衝向最近的敵人；支援＝玩家本人離線趕過去（原本只畫虛線，沒人照做）
 if(!a.team&&(s.engageAll>s.time||a.engageCall>s.time)){const tg=s.actors.filter(b=>b.team===1&&live(b)&&sees(0,b)).sort((x,y)=>dist(x,a)-dist(y,a))[0];if(tg&&dist(a,tg)<650){if(dist(a,tg)<a.range+120&&skirmish(a,dt,a.range+120,true))return;moveTo(a,tg,dt,a.range*.8);return;}}
 if(a.player&&a.retreatUntil>s.time){escape(a,foesNear);moveTo(a,ownTower(a.team,laneOf(a))||home,dt);return;}
 if(a.player&&a.splitUntil>s.time){if(foesNear.length&&skirmish(a,dt,a.range+60))return;laneBehaviour(a,a.splitLane??0,dt,'trade');return;}
 if(!a.team&&a.player&&s.order&&s.order.until>s.time&&s.order.kind==='push'&&a.task?.kind==='lane'){if(foesNear.length&&skirmish(a,dt,a.range+60))return;laneBehaviour(a,bLane(a.role),dt,'trade');return;}
 const od=!a.team&&a.player&&s.order&&s.order.until>s.time&&s.order.kind==='support'?s.order:null;
 if(od){if(od.track){if(live(od.track))od.point={x:od.track.x,y:od.track.y};else od.track=null;}const pt=od.point,near=dist(a,pt)<230;
  if(foesNear.length&&skirmish(a,dt,near?260:a.range+60,near))return;if(dist(a,pt)>45){moveTo(a,pt,dt,30);return;}}
 // 1.05 各位置自己的判斷（plays.js）：游走、傳送支援、做視野、蹲草
 if(window.PLAYS&&!(a.player&&(s.order?.until>s.time||s.momentTrack&&s.momentTrack.until>s.time))&&!(!a.team&&s.teamOrder&&s.teamOrder.until>s.time)){try{if(window.PLAYS.hero(a,dt,task,foesNear))return;}catch(e){console.warn(e);}}
 // after a reset, teleport back if the job is far away
 const dest=taskPoint(a,task);if(dest&&dist(a,home)<70&&dist(a,dest)>330&&spell(a,'tp')&&!(s.time>300&&(window.PLAYS?.pers?.(a)?.tp||0)>.4)){const anchor=tpAnchor(a,dest);if(anchor){use(a,'tp');a.tpAt=s.time+TP_CHANNEL;a.tpTo=anchor;return;}}
 a.lane=task.kind==='lane'?bLane(a.role):task.kind==='split'?0:task.kind==='split2'?2:laneOf(a);
 if(task.kind==='lvl1'){if(foesNear.length&&skirmish(a,dt,a.range+90))return;const p=lvl1Point(a);moveTo(a,p,dt,8);
  const st=styleOf(a.team);if(st.lvl1==='invade'&&!st._inv&&s.actors.filter(b=>b.team===a.team&&live(b)&&dist(b,p)<90).length>=3){st._inv=1;story('invade',a.team,{}); }return;}
 if(task.kind==='jungle'){if(foesNear.length&&skirmish(a,dt,a.range+80))return;jungle(a,dt);return;}
 if(task.kind==='lane'){laneBehaviour(a,bLane(a.role),dt,(a.player?policy().lane:'safe')==='trade'?'trade':'safe');return;}
 if(task.kind==='objective'){const o=task.obj;if(foesNear.length&&skirmish(a,dt))return;if(a.role===1||a.role===4){sweep(a);const w=wardTarget(a,o);if(w&&dist(a,w)<120&&!o.alive){moveTo(a,w,dt);if(dist(a,w)<30)placeWard(a,w);return;}}
  const p=o.alive?o:pitFront(a.team,o);moveTo(a,{x:p.x+((a.role%3)-1)*14,y:p.y+((a.role>>1)-1)*12},dt,o.alive?40:8);return;}
 if(task.kind==='hunt'){const v=task.target;if(foesNear.length&&skirmish(a,dt,300,true))return;if(v&&live(v)){moveTo(a,v,dt,a.range*.8);return;}}
 if(task.kind==='defend'){if(foesNear.length&&skirmish(a,dt,260))return;const p=task.point||home;
  const mw=s.minions.filter(m=>m.team!==a.team&&live(m)&&dist(m,home)<380&&dist(m,a)<320).sort((x,y)=>dist(x,a)-dist(y,a))[0];
  if(mw){if(dist(a,mw)>a.range)moveTo(a,mw,dt,a.range*.8);attack(a,mw);return;}
  moveTo(a,{x:(p.x+home.x)/2,y:(p.y+home.y)/2},dt,10);return;}
 if(task.kind==='split'||task.kind==='split2'||task.kind==='push'){const lane=task.kind==='split'?0:task.kind==='split2'?2:(task.lane??weakestLane(a.team));
  const missing=s.actors.filter(b=>b.team!==a.team&&live(b)&&!sees(a.team,b)).length,deep=a.team?a.y>a.x-80:a.y<a.x-80;
  if(missing>=3&&deep&&!(s.heroBuff[a.team]>s.time)){moveTo(a,ownTower(a.team,lane),dt);return;}
  laneBehaviour(a,lane,dt,'trade');return;}
 if(task.kind==='siege'){const lane=task.lane??1;if(foesNear.length&&skirmish(a,dt,260))return;laneBehaviour(a,lane,dt,'trade');return;}
 // group (mid by default)
 if(foesNear.length&&skirmish(a,dt))return;const gl=s.plan[a.team].lane??1;const gp=groupPoint(a.team,gl);
 const minions=s.minions.filter(m=>m.team!==a.team&&live(m)&&dist(m,a)<a.range);if(minions.length){attack(a,minions.sort((x,y)=>x.hp-y.hp)[0]);}
 moveTo(a,{x:gp.x+((a.role%3)-1)*16,y:gp.y+((a.role>>1)-1)*14},dt,8);};
function pitFront(t,o){const home=bBase(t),d=dist(o,home)||1;return{x:o.x+(home.x-o.x)/d*70,y:o.y+(home.y-o.y)/d*70};}
function taskPoint(a,task){if(task.kind==='lane')return stand(a,bLane(a.role),20);if(task.kind==='objective')return task.obj;if(task.kind==='split')return stand(a,0,20);if(task.kind==='split2')return stand(a,2,20);if(task.kind==='group')return groupPoint(a.team,T().plan[a.team].lane??1);return null;}
function tpAnchor(a,dest){const s=state,c=[...s.structures.filter(t=>t.team===a.team&&t.hp>0&&t.kind==='tower'),...s.minions.filter(m=>m.team===a.team&&live(m))].sort((x,y)=>dist(x,dest)-dist(y,dest))[0];return c&&dist(c,dest)<dist(a,dest)-200?{x:c.x+(a.team?14:-14),y:c.y}:null;}
// ---------- tick wrapper: plan, burns, wards, player decisions ----------
const baseTick=tick;
tick=function(dt){const s=state;if(!s||s.done||s.paused||s.decision)return baseTick(dt);
 if(!s.plan)return baseTick(dt);
 if(s.time>=s.planAt){s.planAt=s.time+2;plan(0);plan(1);}
 baseTick(dt);if(s.done)return;
 for(const b of s.burns)if(b.until>s.time&&live(b.to))bDamage(b.from,b.to,b.dps*dt);s.burns=s.burns.filter(b=>b.until>s.time);
 if(s.wards.length>40||s.time%10<dt)s.wards=s.wards.filter(w=>w.until>s.time);
 for(const t of[0,1]){const core=s.cores[t];if(core.hp>0&&core.hp<core.maxHp&&!s.actors.some(a=>a.team!==t&&live(a)&&dist(a,core)<200))core.hp=Math.min(core.maxHp,core.hp+core.maxHp*.004*dt);}};
// ---------- player decisions ----------
const tacticsDamage=bDamage;
bDamage=function(from,to,amount){const was=to&&to.kind==='hero'&&live(to);
 if(was&&from?.kind==='hero'&&state.time<840&&state.time>LVL1_END&&from.team!==to.team){const l=bLane(from.role);if(from.role!==1&&to.role!==1&&bLane(to.role)===l){const e=CALIB()?0:laneEdges()[from.team][l]||0;amount*=1+.6*e;}}const r=tacticsDamage.call(this,from,to,amount);
 if(was&&!live(to)&&from&&from.kind==='hero'){const s=state;if(s.time<840&&s.time>LVL1_END&&from.role!==1&&to.role!==1&&bLane(from.role)===bLane(to.role))(s.pairKills||(s.pairKills=[])).push([clsOf(from),clsOf(to)]);if(s.time<840&&s.time>LVL1_END+12)(s.earlyKills||(s.earlyKills=[])).push({edge:laneEdges()[from.team][laneOf(to)]||0});if(s.time<LVL1_END+12)story('lvl1kill',from.team,{who:from.heroName,victim:to.heroName});
  else if(s.time<840&&s.time>LVL1_END+12&&!s.actors.some(u=>u!==from&&u.team===from.team&&live(u)&&dist(u,to)<260)){story('solokill',from.team,{who:from.heroName,victim:to.heroName,lane:LANE_NAME[laneOf(to)]});(s.laneKills||(s.laneKills=[])).push({edge:laneEdges()[from.team][laneOf(to)]||0,solo:1});}
  else if(s.time<900&&!(s._dive?.[from.team]>s.time)&&s.structures.some(t=>t.kind==='tower'&&t.team!==from.team&&t.hp>0&&t.tier<2&&dist(t,to)<110)){(s._dive||(s._dive={}))[from.team]=s.time+60;story('dive',from.team,{who:from.heroName,victim:to.heroName});}}
 return r;};
function decisionsEnabled(){return typeof showDecision==='function';}
// ---------- 0.76 關鍵時刻：依即時戰況觸發，選項真的改變行為，結果由模擬決定並回報 ----------
const ROLE_ZH=['上路','打野','中路','射手','輔助'];
function laneFoe(p){const l=bLane(p.role);return state.actors.filter(b=>b.team!==p.team&&laneRoles(l).includes(b.role)&&live(b)).sort((x,y)=>dist(x,p)-dist(y,p))[0]||null;}
function kitHint(p){const k=ROSTER[p.heroIndex]?.kit;if(!k)return '';const mob=['e','q','w'].map(x=>[x,x==='q'?k.s:k[x]]).find(([x,sp])=>sp&&sp.ops.some(o=>o[0]==='dash'||o[0]==='blink'));
 const cc=['e','q','w'].map(x=>[x,x==='q'?k.s:k[x]]).find(([x,sp])=>sp&&sp.ops.some(o=>['stun','root','up'].includes(o[0])));
 return {mob:mob?`${mob[0].toUpperCase()}「${mob[0]==='q'?ROSTER[p.heroIndex].skill:mob[1].name}」`:'',cc:cc?`${cc[0].toUpperCase()}「${cc[0]==='q'?ROSTER[p.heroIndex].skill:cc[1].name}」`:''};}
function talentHas(id){try{const c=window.CAREER?.data;return !!(c&&window.TALENT?.has(c,id));}catch{return false;}}
function track(type,choice,secs=18){const s=state,pe=s.personal;s.momentTrack={type,choice,until:s.time+secs,k:pe.kills,d:pe.deaths,a:pe.assists||0,tw:s.structures.filter(t=>t.team===1&&t.hp<=0).length,gk:s.kills[0],gd:s.kills[1]};}
const MOMENT_TXT={midMissing:'對方中路消失',wardHunt:'抓做視野的人',gankWarn:'面對對方打野',jgOffer:'配合我方打野',laneWin:'對線優勢',laneLose:'對線劣勢',invaded:'野區被入侵'};
function resolveMoment(){const s=state,m=s.momentTrack;if(!m||s.time<m.until)return;s.momentTrack=null;const pe=s.personal;
 const dk=pe.kills-m.k,dd=pe.deaths-m.d,da=(pe.assists||0)-m.a,dt=s.structures.filter(t=>t.team===1&&t.hp<=0).length-m.tw,tk=s.kills[0]-m.gk,td=s.kills[1]-m.gd;
 const score=dk+da*.6+dt*.8-dd*1.2+(tk-td)*.3,result=score>.25?'win':score<-.25?'lose':'even';
 (s.momentLog||(s.momentLog=[])).push({type:m.type,choice:m.choice,result,dk,dd,dt});
 const sum=`${MOMENT_TXT[m.type]||'決策'}（${m.choice}）：${dk?`擊殺 +${dk} `:''}${da?`助攻 +${da} `:''}${dt?`推掉 ${dt} 座塔 `:''}${dd?`陣亡 ${dd} 次 `:''}${!dk&&!da&&!dt&&!dd?'雙方沒有交換':''}`;
 try{log(`決策結果　${sum}`);}catch{}story('moment',0,{result,choice:m.choice,label:MOMENT_TXT[m.type]||''});}
// 測試用：看對線類關鍵時刻的條件（雲端校正實驗用，不影響遊戲）
function laneProbe(p){const s=state,lane=bLane(p.role),foe=laneFoe(p),ejg=s.actors.find(b=>b.team!==p.team&&b.role===1&&live(b)),eg=ejg&&GANK.get(ejg);return {inLane:(p.task?.kind||'lane')==='lane'&&!p.recalling&&distToLane(p,lane)<80&&dist(p,bBase(p.team))>200,foeHere:!!(foe&&dist(foe,p)<300&&distToLane(foe,lane)<90),lead:laneLead(p,lane),foeHp:foe?foe.hp/foe.maxHp:1,hp:p.hp/p.maxHp,gank:!!(eg&&eg.victim===p),arrived:!!eg?.arrived,dj:ejg?dist(ejg,p):9999};}
function keyMoment(s,p){if(s.time<150||s.time>1500||(s.eventCount||0)>=10||s.time<840&&(s.eventCount||0)>=5||s.lastMomentAt>s.time-45)return false;const lane=bLane(p.role),cnt=s.momentCount||(s.momentCount={}),cd=k=>s.macroEvents[k]>s.time||(cnt[k]||0)>=2,mark=(k,t)=>{s.macroEvents[k]=s.time+t;if(k!=='lane')cnt[k]=(cnt[k]||0)+1;};
 const OD=(...x)=>window.ODDS?.OD?.(...x)||null;
 const foe=laneFoe(p),hint=kitHint(p),inLane=(p.task?.kind||'lane')==='lane'&&!p.recalling&&distToLane(p,lane)<80&&dist(p,bBase(0))>200,foeHere=foe&&dist(foe,p)<300&&distToLane(foe,lane)<90,mast=Math.round(heroes[p.heroIndex]?.mastery||0),ward=s.wards.some(w=>!w.team&&w.until>s.time&&dist(w,p)<320);
 // ① 對方打野來抓你
 const ejg=s.actors.find(b=>b.team===1&&b.role===1&&live(b)),eg=ejg&&GANK.get(ejg);
 const jg0=s.actors.find(b=>b.team===0&&b.role===1&&live(b)&&!b.player);
 if(inLane&&eg&&eg.victim===p&&!eg.arrived&&dist(ejg,p)<520&&!cd('gw')&&s.actors.filter(b=>b.team===1&&live(b)&&dist(b,p)<400).length<=2){mark('gw',150);const seen=sees(0,ejg),deep=dist(p,ownTower(0,lane))>140;
  showDecision('gankWarn',seen?`對方打野 ${ejg.heroName} 正往你這裡移動！`:`對方打野 ${ejg.heroName} 已經從視野消失`,`${seen?'隊友看到他從河道靠近。':'他最後出現的位置離你不遠。'}${deep?'你的兵線壓得很深，離塔有段距離。':'你離自家塔不遠。'}${ward?'附近有我方的眼。':'附近沒有我方視野。'}${talentHas('survive')?'你有天賦【極限求生】。':''}${hint.mob?`你有位移技 ${hint.mob}，被抓時比較好逃。`:''}`,[
   {name:'立刻退回塔下',desc:'放掉這波兵，安全第一。',odds:OD('gwBack',ownTower(0,lane),'skirm',{bring:[p,ejg]},'safe','被抓時我方不吃虧'),run:()=>{p.orderBackUntil=s.time+14;track('gankWarn','退回塔下',16);story('call',0,{label:`${p.heroName} 察覺危險，退回塔下`});}},
   {name:'叫我方打野來反蹲',desc:'我方打野趕到你身邊，對方真的來就打 2 對 2。',odds:jg0?OD('gwJg',p,'skirm',{bring:[p,ejg,jg0]},'std','2 對 2 我方贏'):{note:'我方打野不在'},run:()=>{s.jgGuard={until:s.time+22};if(jg0){GANK.delete(jg0);}track('gankWarn','打野反蹲',22);story('call',0,{label:`${p.heroName} 呼叫打野反蹲`});}},
   {name:'繼續壓線，賭他不來',desc:'多吃這波兵和經驗；被抓到就很危險。',odds:OD('gwStay',p,'skirm',{bring:[p,ejg]},'risky','被抓時還能反打'),run:()=>{track('gankWarn','賭他不來',16);}}]);return true;}
 // ② 我方打野要來 gank 你的對手
 const jg=s.actors.find(b=>b.team===0&&b.role===1&&live(b)),og=jg&&GANK.get(jg);
 if(inLane&&foeHere&&og&&og.victim===foe&&!og.arrived&&dist(jg,foe)<520&&!cd('jo')&&p.hp>p.maxHp*.45&&s.actors.filter(b=>b.team===1&&live(b)&&dist(b,p)<400).length<=2){mark('jo',150);
  showDecision('jgOffer',`打野 ${jg.heroName} 要來抓 ${foe.heroName}`,`對手血量 ${Math.round(foe.hp/foe.maxHp*100)}%、你 ${Math.round(p.hp/p.maxHp*100)}%。${hint.cc?`你的 ${hint.cc} 可以先手控場。`:'你沒有控場技，要靠打野先手。'}英雄熟練度 ${mast}。`,[
   {name:'配合開戰',desc:'打野一到就一起上，集火對手。',odds:OD('joGo',foe,'skirm',{bring:[p,jg]},'std','2 打 1 拿下對手'),run:()=>{p.engageUntil=s.time+20;p.engageTarget=foe;track('jgOffer','配合開戰',16);}},
   {name:'叫他去別路',desc:'你這波不方便，讓打野去幫其他隊友。',odds:{note:'這波不打'},run:()=>{GANK.delete(jg);jg.gankCD=s.time+8;track('jgOffer','叫他去別路',20);}}]);return true;}
 // ③ 對線大優勢
 const lead=laneLead(p,lane);
 if(inLane&&foeHere&&lead>.3&&foe.hp<foe.maxHp*.45&&p.hp>p.maxHp*.6&&!foe.recalling&&s.time<900&&!cd('lw')&&!cd('lane')){mark('lw',300);mark('lane',150);const et=s.structures.find(t=>t.kind==='tower'&&t.team===1&&t.lane===lane&&t.hp>0&&t.tier===0);
  showDecision('laneWin',`你在${ROLE_ZH[p.role]}壓制住 ${foe.heroName}`,`對手只剩 ${Math.round(foe.hp/foe.maxHp*100)}% 血量，你 ${Math.round(p.hp/p.maxHp*100)}%。${hint.mob?`你的 ${hint.mob} 是突進技，越塔追殺比較有把握。`:'你沒有突進技，越塔要冒被塔打的風險。'}${talentHas('duel')?'你有天賦【單挑王】。':''}`,[
   {name:'越塔強殺',desc:'頂著防禦塔追進去，殺了就賺，失敗就送。',odds:OD('lwDive',foe,'skirm',{bring:[p]},'risky','越塔拿下對手',{secs:12}),run:()=>{p.diveUntil=s.time+10;track('laneWin','越塔強殺',14);}},
   {name:'推線拿塔皮',desc:'不追人，把兵推進塔下，換防禦塔傷害。',odds:{note:'穩拿塔皮經濟'},run:()=>{if(et)order('push',{x:et.x,y:et.y},30);log('你把兵線推進塔下，準備拿塔皮。');track('laneWin','推線拿塔',30);}},
   {name:'去支援其他路',desc:'對手回城的空檔去幫隊友，擴大全隊優勢。',odds:(()=>{const al=s.actors.filter(b=>b.team===0&&!b.player&&live(b)&&b.role!==1).sort((x,y)=>laneLead(x,bLane(x.role))-laneLead(y,bLane(y.role)))[0];return al?OD('lwHelp',al,'skirm',{bring:[p]},'std','支援那一路打贏',{secs:30}):{note:'沒有隊友需要幫忙'};})(),run:()=>{const ally=s.actors.filter(b=>b.team===0&&!b.player&&live(b)&&b.role!==1).sort((x,y)=>laneLead(x,bLane(x.role))-laneLead(y,bLane(y.role)))[0];if(ally){order('support',{x:ally.x,y:ally.y},35);s.order.track=ally;log(`你離開兵線，去支援 ${ally.heroName}。`);}track('laneWin','去支援',35);}}]);return true;}
 // ④ 對線被壓制
 if(inLane&&foeHere&&lead<-.35&&p.hp<p.maxHp*.7&&s.time>200&&s.time<900&&!cd('ll')&&!cd('lane')){mark('ll',360);mark('lane',150);
  showDecision('laneLose',`你在${ROLE_ZH[p.role]}被 ${foe.heroName} 壓著打`,`對位上你比較吃虧（熟練度 ${mast}）。${talentHas('slow')?'你有【慢熱】，前期本來就比較辛苦。':''}要怎麼撐過去？`,[
   {name:'請打野來幫忙',desc:'接下來 45 秒，打野優先來你這路。',odds:jg?OD('llJg',p,'skirm',{bring:[p,jg]},'std','打野來時我方贏',{secs:45}):{note:'我方打野不在'},run:()=>{s.callJg={lane,until:s.time+45};track('laneLose','請打野幫忙',40);story('call',0,{label:`${p.heroName} 請打野支援${LANE_NAME[lane]}`});}},
   {name:'退塔下穩補',desc:'不換血，在塔下慢慢補兵，等後期。',odds:OD('llBack',ownTower(0,lane),'skirm',{bring:[p,foe]},'safe','塔下交手不吃虧',{secs:40}),run:()=>{p.orderBackUntil=s.time+40;track('laneLose','塔下穩補',40);}},
   {name:'離開這條線去支援',desc:'這條線打不過，去別的地方找機會。',odds:{note:'換個地方找機會'},run:()=>{const o=s.dragon.alive?s.dragon:{x:400,y:320};order('support',{x:o.x,y:o.y},40);log('你離開兵線，往河道找機會。');track('laneLose','去支援',40);}}]);return true;}
 // ⑤ 自家野區被入侵
 const inv=s.actors.filter(b=>b.team===1&&live(b)&&sees(0,b)&&(b.y>b.x-80)&&dist(b,bBase(1))>300).filter(b=>s.camps.some(c=>c.home===0&&dist(c,b)<170));
 if((inv.length>=2||inv.some(b=>b.role===1))&&inv.length<=3&&s.actors.filter(b=>b.team===1&&live(b)&&dist(b,inv[0])<450).length<=3&&p.hp>p.maxHp*.45&&s.time<1500&&jg&&dist(jg,inv[0])<300&&dist(p,inv[0])<480&&!cd('iv')){mark('iv',300);
  showDecision('invaded',`${inv.map(b=>b.heroName).join('、')} 闖進我方野區`,`我方打野 ${jg.heroName} 就在附近，可能要開打。你離那裡大約 ${Math.round(dist(p,inv[0]))} 碼。`,[
   {name:'過去支援打野',desc:'放下兵線，去野區幫忙。',odds:OD('ivGo',inv[0],'skirm',{bring:[p,jg]},'std','野區這波我方贏',{secs:25}),run:()=>{order('support',{x:jg.x,y:jg.y},25);s.order.track=jg;log(`你放下兵線，趕去野區支援 ${jg.heroName}。`);track('invaded','支援打野',25);}},
   {name:'留在線上',desc:'相信打野自己處理，你繼續發育。',odds:OD('ivStay',inv[0],'skirm',{bring:[jg],away:[p]},'safe','打野自己撐住',{secs:25}),run:()=>{track('invaded','留在線上',25);}}]);return true;}
 // ⑥ 1.07 對方中路消失了（推完兵正往你這路游走）
 const emid=s.actors.find(b=>b.team===1&&b.role===2&&live(b));
 if(inLane&&lane!==1&&emid&&emid.play?.kind==='roam'&&emid.play.lane===lane&&dist(emid,p)>240&&dist(emid,p)<720&&(!sees(0,emid)||distToLane(emid,1)>110)&&p.hp>p.maxHp*.4&&!cd('mm')){mark('mm',240);
  const mid={x:(p.x+emid.x)/2,y:(p.y+emid.y)/2},spot=wardTarget(p,mid),grp=[p,emid,foeHere?foe:null].filter(Boolean);
  showDecision('midMissing',`對方中路 ${emid.heroName} 從中路消失了！`,`${emid.heroName} 推完兵就不見了，很可能往${ROLE_ZH[p.role]}來。${foeHere?`你的對手 ${foe.heroName} 也在旁邊。`:''}${ward?'附近有我方的眼。':'這附近沒有視野。'}`,[
   {name:'先退到塔下',desc:'寧可少吃一波兵，也不給對方 2 打 1 的機會。',odds:OD('mmBack',ownTower(0,lane),'skirm',{bring:grp},'safe','被包夾時我方不吃虧',{secs:18}),run:()=>{p.orderBackUntil=s.time+16;track('midMissing','退到塔下',16);story('call',0,{label:`${p.heroName}：對面中路不見了，先退`});}},
   {name:'插眼看他從哪來',desc:'往河道丟一顆眼，看到人再決定。',odds:OD('mmWard',p,'skirm',{bring:grp},'std','看到他之後打得過',{secs:18}),run:()=>{if(spot&&(p.wardCharges||0)>0){p.wardCharges--;s.wards.push({x:spot.x,y:spot.y,team:0,until:s.time+90,owner:p.role});log('你往河道丟了一顆眼。');}track('midMissing','插眼看',18);}},
   {name:'叫打野一起反蹲',desc:'打野過來埋伏，對方真的來就打 2 對 2。',odds:jg0?OD('mmJg',p,'skirm',{bring:[...grp,jg0]},'risky','反蹲成功',{secs:22}):{note:'我方打野不在'},run:()=>{s.jgGuard={until:s.time+22};if(jg0)GANK.delete(jg0);track('midMissing','打野反蹲',22);story('call',0,{label:`${p.heroName} 叫打野來反蹲對面中路`});}}]);return true;}
 // ⑦ 1.07 對方輔助／打野正在做視野（你看得到他）
 const wv=s.actors.find(b=>b.team===1&&live(b)&&b.play?.kind==='ward'&&b.play.pt&&dist(b.play.pt,p)<650&&sees(0,b));
 if(wv&&[1,2,4].includes(p.role)&&p.hp>p.maxHp*.6&&!s.actors.some(b=>b.team===1&&b!==wv&&live(b)&&dist(b,wv)<350)&&s.time>240&&!cd('wh')){mark('wh',300);
  const pt=wv.play.pt,d=dist(pt,p)||1,hide={x:pt.x+(p.x-pt.x)/d*55,y:pt.y+(p.y-pt.y)/d*55};
  showDecision('wardHunt',`${wv.heroName} 一個人在做視野`,`對方的${ROLE_ZH[wv.role]} ${wv.heroName} 正往河道插眼，身邊沒有隊友。你離那裡約 ${Math.round(dist(pt,p))} 碼。`,[
   {name:'先躲進草叢埋伏他',desc:'繞到他要插眼的位置旁邊蹲著，等他走進來。',odds:OD('whLurk',pt,'skirm',{bring:[p,wv]},'std','抓到他',{secs:20}),run:()=>{p.play={kind:'lurk',pt:hide,until:s.time+18,from:s.time};story('call',0,{label:`${p.heroName} 去草叢蹲 ${wv.heroName}`});}},
   {name:'跟過去把眼清掉',desc:'不打架，跟在後面把他的眼排掉。',odds:{note:'拿回這一帶的視野'},run:()=>{order('support',{x:pt.x,y:pt.y},14);s.wards=s.wards.filter(w=>!(w.team===1&&dist(w,pt)<140));}},
   {name:'不理他，做自己的事',desc:'視野讓給他，你照原本的節奏。',odds:{note:'照原本的節奏'},run:()=>{}}]);return true;}
 return false;}
events=function(){const s=state,p=s.actors.find(a=>a.player);if(!p||s.decision||s.done)return;resolveMoment();if(s.lastMomentAt>s.time-45&&s.time>60)return;
 if(!s.macroEvents.lvl1&&s.time>1.5&&s.time<40){s.macroEvents.lvl1=true;const st=styleOf(0),es=styleOf(1);
  showDecision('lvl1','開局：一級團怎麼打？',`${st.label?'我方風格：'+st.label+'。':''}${es.label?'對手：'+es.label+'。':''}野怪 1:30 出生，兵線 1:05 出發。入侵可能換到擊殺或搶到對方的 Buff，但也可能被埋伏。`,[
   {name:'全隊入侵敵方野區',desc:'五人進入對方野區埋伏，搶 Buff、找擊殺；風險是撞上對方守野陣型。',run:()=>{st.lvl1='invade';}},
   {name:'守住自家野區入口',desc:'上中、下路雙人分守兩側入口，保護打野開野。最穩的開局。',run:()=>{st.lvl1='defend';}},
   {name:'直接上線，早點拿線權',desc:'不參與一級團，提早到線上卡兵；打野自己開野。',run:()=>{st.lvl1='lane';}}]);return;}
 if(s.time<s.next)return;
 if(live(p)&&!s.momentTrack&&keyMoment(s,p))return;
 if(s.macroEvents.surrender){s.macroEvents.surrender=false;showDecision('surrender','隊伍發起投降投票',`經濟落後 ${((s.gold[1]-s.gold[0])/1000).toFixed(1)}k，防禦建築也明顯落後。可以結束這場，或繼續尋找翻盤機會。`,[{name:'同意投降',desc:'本場判負，直接結束比賽。',run:()=>{s.surrender=0;s.winner=1;finish();}},{name:'拒絕，繼續守',desc:'守住高地，等對手失誤再打一波。',run:()=>{s.teamOrder={mode:'defend',point:s.cores[0],until:s.time+90};}},{name:'拒絕，四一分推拖時間',desc:'上路帶線牽制，其他人守中路。',run:()=>{s.teamOrder={mode:'41',until:s.time+120};}}]);return;}
 const no=nextObjective(0);
 if(no&&no.inT>20&&no.inT<=75&&!s.macroEvents['obj'+Math.round(no.o.respawn)]){s.macroEvents['obj'+Math.round(no.o.respawn)]=true;const o=no.o,name=o.name||'大型物件';
  const O=window.ODDS,f=O?O.follow():.6,pl=s.actors.find(a=>a.player),pct=v=>v==null?'—':Math.round(v*100)+'%',wt=Math.ceil(no.inT)+45,ln=bLane(pl.role);
  const pGo0=O?.p('obj',o,0,{me:'here'}),pAll=O?.p('obj',o,0,{me:'here',allies:'all'}),pGo=O?.adj('objGo',pGo0),pAway=O?.adj('objStay',O?.p('obj',o,0,{me:'away'})),pCall=O?.adj('objCall',O?.mix(f,pAll,O?.p('obj',o,0,{me:'away'}))),W=(ch,pp)=>O?.watch({kind:'obj',obj:o,choice:ch,p:pp,what:`拿到${name}`,until:s.time+no.inT+75});
  showDecision('objective',`${name} ${Math.ceil(no.inT)} 秒後出現`,`你要怎麼做？我方存活 ${s.actors.filter(a=>!a.team&&live(a)).length} 人對 ${s.actors.filter(a=>a.team&&live(a)).length} 人。隊友聽你喊話的機率約 ${pct(f)}。`,[
   {name:`我去搶${name}`,desc:'放掉這波兵，趕到河道跟隊友會合。',odds:{p:pGo,tag:'std',what:`我方拿到${name}`},run:()=>{order('support',{x:o.x,y:o.y},wt);log(`你決定前往${name}。`);W(`我去搶${name}`,pGo);}},
   {name:'我喊全隊集結',desc:`喊大家一起打；沒人跟就放棄，回線上吃兵。`,odds:{p:pCall,tag:'risky',what:`我方拿到${name}`,note:`隊友跟的機率 ${pct(f)}`},run:()=>{if(Math.random()<f){s.teamOrder={mode:'objective',obj:o,until:s.time+no.inT+60};s.policyFightBoost=s.time+no.inT+60;story('call',0,{label:`${pl.heroName}：全隊集合打${name}！隊友跟上了`});order('support',{x:o.x,y:o.y},wt);}else{story('call',0,{label:`隊友沒跟上，${pl.heroName} 放棄${name}，回${LANE_NAME[ln]}吃線`});pl.splitUntil=s.time+wt;pl.splitLane=ln;log(`隊友沒跟上，你放棄${name}，回線上。`);}W('我喊全隊集結',pCall);}},
   {name:'我留線推塔，換資源',desc:`不去${name}，在${LANE_NAME[ln]}推線拿塔皮；隊友自己決定要不要打。`,odds:{p:pAway,tag:'safe',what:`隊友少你一人拿到${name}`},run:()=>{pl.splitUntil=s.time+wt;pl.splitLane=ln;log(`你留在${LANE_NAME[ln]}推線。`);W('我留線推塔，換資源',pAway);}}]);return;}
 const plan0=s.plan[0],us=s.actors.filter(a=>!a.team&&live(a)),them=s.actors.filter(a=>a.team&&live(a)&&sees(0,a));
 const pl=s.actors.find(a=>a.player);if(s.time>840&&us.length>=3&&them.length>=3&&pl&&live(pl)&&pl.hp>pl.maxHp*.4&&!s.macroEvents['fight'+Math.floor(s.time/240)]){const c={x:us.reduce((x,a)=>x+a.x,0)/us.length,y:us.reduce((x,a)=>x+a.y,0)/us.length},close=them.filter(a=>dist(a,c)<300).length;
  if(close>=3&&dist(pl,c)<380){s.macroEvents['fight'+Math.floor(s.time/240)]=true;const O=window.ODDS,f=O?O.follow():.6,pct=v=>v==null?'—':Math.round(v*100)+'%';
  const pJoin=O?.adj('join',O?.p('fight',c,0,{me:'here'})),pCall=O?.adj('engage',O?.mix(f,O?.p('fight',c,0,{me:'here',allies:'all'}),O?.p('fight',c,0,{me:'away'}))),pAway=O?.adj('retreat',O?.p('fight',c,0,{me:'away'})),W=(ch,pp)=>O?.watch({kind:'fight',c:{x:c.x,y:c.y},secs:22,choice:ch,p:pp,what:'這波交戰'});
  showDecision('teamfight','雙方主力正在對峙',`附近有 ${close} 名對手。你要怎麼做？隊友聽你喊話的機率約 ${pct(f)}。`,[
   {name:'我先手開團',desc:'喊開團，隊友跟上你就衝；沒人跟就收手。',odds:{p:pCall,tag:'risky',what:'這波我方贏',note:`隊友跟的機率 ${pct(f)}`},run:()=>{let n=0;for(const b of us)if(!b.player&&dist(b,c)<700&&Math.random()<f){b.engageCall=s.time+14;n++;}if(n)pl.engageCall=s.time+14;else pl.retreatUntil=s.time+12;log(n?`你開團，${n} 名隊友跟上！`:'隊友沒跟上，你收手退後。');story('call',0,{label:n>=2?`${pl.heroName} 開團，${n} 名隊友跟上！`:n?`${pl.heroName} 開團，只有 1 名隊友跟上`:`隊友沒跟上，${pl.heroName} 收手退後`});W('我先手開團',pCall);}},
   {name:'我跟著隊友打',desc:'站在隊友身邊，等前排先手再輸出。',odds:{p:pJoin,tag:'std',what:'這波我方贏'},run:()=>{order('support',{x:c.x,y:c.y},22);W('我跟著隊友打',pJoin);}},
   {name:'我不接，退到塔下',desc:'你先撤，隊友自己決定要不要打。',odds:{p:pAway,tag:'safe',what:'隊友少你一人也贏'},run:()=>{pl.retreatUntil=s.time+18;log('你先退到塔下。');W('我不接，退到塔下',pAway);}}]);return;}}
 const innerN=s.structures.filter(t=>t.team===1&&t.kind==='tower'&&t.tier>=1&&t.hp<=0).length;if(innerN>(s._innerN||0)){s._innerN=innerN;s._innerAt=s.time;}
 const buffLeft=s.heroBuff[0]-s.time,freshTower=s.time-(s._innerAt??-99)<40,aliveUs=s.actors.filter(a=>!a.team&&live(a)).length;
 if((buffLeft>60||freshTower)&&aliveUs>=3&&live(s.actors.find(a=>a.player))&&!s.macroEvents['push'+Math.floor(s.time/300)]){s.macroEvents['push'+Math.floor(s.time/300)]=true;const O=window.ODDS,f=O?O.follow():.6,pct=v=>v==null?'—':Math.round(v*100)+'%',pl=s.actors.find(a=>a.player),l=weakestLane(0),sp=bPoint(l,.72);
  const hg=s.structures.filter(t=>t.team===1&&t.hp>0&&(t.kind==='inhibitor'||t.kind==='tower'&&t.tier>=1)).sort((a,b)=>dist(a,pl)-dist(b,pl))[0]||bBase(1);
  const pCall=O?.adj('siege',O?.mix(f,O?.p('fight',hg,0,{me:'here',allies:'all'}),O?.p('fight',hg,0,{me:'away'}))),pSide=O?.adj('side',O?.p('skirm',sp,0,{me:'here'}));
  showDecision('siege','取得優勢，下一步？',`${buffLeft>60?`我方拿到深淵領主的增益，還剩 ${Math.round(buffLeft)} 秒。`:'我方剛推掉對方一座內塔。'}我方存活 ${aliveUs} 人，對方 ${s.actors.filter(a=>a.team&&live(a)).length} 人。隊友聽你喊話的機率約 ${pct(f)}。`,[
   {name:'我喊強攻高地',desc:'喊大家一起上高地；沒人跟就改去帶線。',odds:{p:pCall,tag:'risky',what:'高地交戰我方贏',note:`隊友跟的機率 ${pct(f)}`},run:()=>{if(Math.random()<f){s.teamOrder={mode:'siege',lane:l,until:s.time+60};story('call',0,{label:`${pl.heroName} 喊強攻高地，全隊跟上！`});order('support',{x:hg.x,y:hg.y},40);}else{story('call',0,{label:`隊友想先整理，${pl.heroName} 改去${LANE_NAME[l]}帶線`});pl.splitUntil=s.time+60;pl.splitLane=l;}O?.watch({kind:'fight',c:{x:hg.x,y:hg.y},secs:30,choice:'我喊強攻高地',p:pCall,what:'高地交戰'});}},
   {name:`我去${LANE_NAME[l]}帶線`,desc:'你一個人去這一路推進，吸引對手分兵。',odds:{p:pSide,tag:'std',what:'帶線交手不吃虧'},run:()=>{pl.splitUntil=s.time+60;pl.splitLane=l;O?.watch({kind:'fight',c:sp,secs:30,choice:`我去${LANE_NAME[l]}帶線`,p:pSide,what:'側路交手'});}},
   {name:'我先回家補裝',desc:'回城把錢花掉，下一波再上；隊友自己決定。',odds:{note:'不參戰・補滿裝備'},run:()=>{pl.recalling=true;log('你先回城補裝。');}}]);return;}
 s.next=s.time+15;};
// ---------- surrender-aware finish text ----------
const baseFinish=finish;finish=function(){const s=state;baseFinish();if(s&&s.surrender!=null){const r=document.querySelector('#result');if(r&&r.innerHTML)r.innerHTML=r.innerHTML.replace(/<h2>[^<]*<\/h2><p>[^<]*<\/p>/,`<h2>${s.winner===0?'VICTORY · 對手投降':'DEFEAT · 投降'}</h2><p>${s.surrender?'赤潮':'逐光'}在落後明顯時發起投降。</p>`);}};
// ---------- policy (player's tactical stance) ----------
function loadPolicy(){try{return JSON.parse(localStorage.getItem('esports-policy')||'null');}catch(e){return null;}}
function savePolicy(p){try{localStorage.setItem('esports-policy',JSON.stringify(p));}catch(e){}}
const POLICY_UI=[['lane','對線',[['safe','穩健控線'],['trade','積極換血']]],['jungle','打野',[['farm','穩定刷野'],['balanced','均衡'],['gank','積極抓人']]],['objective','物件',[['priority','物件優先'],['flex','隨機應變']]],['macro','中後期',[['group','抱團推進'],['41','四一分推'],['131','一三一']]],['fight','團戰',[['safe','保守'],['balanced','均衡'],['aggressive','激進']]]];
const STYLE_UI={0:[['auto','照本性'],['tp','留傳送支援'],['split','單帶分推']],1:[['auto','照本性'],['lurk','愛蹲草抓人'],['vision','重視野']],2:[['auto','照本性'],['lane','守線發育'],['roam','推完找機會游走']],3:[['auto','照本性'],['safe','穩穩發育'],['roam','跟輔助游走']],4:[['auto','照本性'],['follow','跟著射手'],['vision','積極做視野'],['lurk','去蹲草抓人']]};
function policyRows(role){const rows=[['style','本場打法',STYLE_UI[role]||STYLE_UI[2]]];if(role===1)rows.push(['jungle','打野節奏',[['farm','穩定刷野'],['balanced','均衡'],['gank','積極抓人']]]);else rows.push(['lane','對線',[['safe','穩健控線'],['trade','積極換血']]]);rows.push(['fight','團戰站位',[['safe','保守'],['balanced','均衡'],['aggressive','激進']]]);return rows;}
function buildPolicyPanel(){if(!document.body)return;const log=document.querySelector('#log');if(!log?.parentNode)return;let box=document.querySelector('#tactics');
 if(!box){box=document.createElement('details');box.id='tactics';box.className='tactics';box.open=true;const bar=document.querySelector('#match .overview-bar')||document.querySelector('#match .mapfoot');if(bar)bar.after(box);else log.parentNode.insertBefore(box,log);
  box.addEventListener('click',e=>{const b=e.target.closest('[data-policy]');if(!b||!state)return;state.policy={...policy(),[b.dataset.policy]:b.dataset.value};savePolicy(state.policy);refreshPolicy();});}
 const role=T()?.actors?.find(a=>a.player)?.role??2;box.dataset.role=role;
 box.innerHTML='<summary>我的打法 <small>只影響你自己；隊友照自己的個性與教練方針</small></summary>'+policyRows(role).map(([k,label,opts])=>`<div class="tactic-row"><span>${label}</span><div>${opts.map(([v,t])=>`<button type="button" class="quiet" data-policy="${k}" data-value="${v}">${t}</button>`).join('')}</div></div>`).join('')+'<p class="tactic-fit"></p>';}
function refreshPolicy(){const p=policy(),role=+(document.querySelector('#tactics')?.dataset.role??2),ok=(STYLE_UI[role]||[]).some(([v])=>v===p.style);
 document.querySelectorAll?.('[data-policy]').forEach(b=>b.classList.toggle('selected',b.dataset.policy==='style'?(ok?p.style:'auto')===b.dataset.value:p[b.dataset.policy]===b.dataset.value));
 const f=document.querySelector('#tactics .tactic-fit');if(f){try{f.innerHTML=window.PLAYS?.fitText?.()||'';}catch{f.textContent='';}}}
// fight bar adjusted by the player's one-off decisions
const fb=fightBar;
function effectiveBar(t,a){const s=state;if(t)return 1;let v=a&&!a.player?1:fb(0);if(s.policyFightBoost>s.time)v=.82;if(s.policyFightSafe>s.time)v=1.3;return v;}
// ---------- 召喚師技能：依英雄技能推薦，比賽前（BP 畫面）才選，不選就用推薦 ----------
// 推薦規則看英雄的職業與特性（DRAFT.TAGS）；兩個都照推薦 +2% 強度、一個 +1%。
function recSpells(i){const T=window.DRAFT?.TAGS?.[i],r=ROSTER[i].role,cls=T?.cls||'',t=T?.tags||[],h=x=>t.includes(x);
 if(r===1)return cls==='fighter'&&h('sustain')?['ghost','smite','持續作戰、追擊']:['flash','smite','打野必帶懲擊'];
 if(r===0)return cls==='tank'||h('engage')?['flash','tp','前排開戰，靠傳送支援']:h('split')?['flash','tp','分推帶線']:cls==='assassin'||h('dive')||h('early')?['flash','ignite','前期擊殺壓制']:h('sustain')?['ghost','tp','持續作戰']:['flash','tp','穩定對線'];
 if(r===2)return cls==='assassin'||h('assassin')?['flash','ignite','爆發擊殺']:h('poke')?['flash','tp','消耗與支援']:h('cc')?['flash','barrier','控場自保']:['flash','tp','穩定對線'];
 if(r===3)return h('scaling')?['flash','cleanse','後期怕被控']:h('poke')?['flash','barrier','站樁輸出']:['flash','heal','射手續戰'];
 return h('enchanter')?['flash','exhaust','保護後排']:cls==='tank'||h('engage')?['flash','ignite','開戰擊殺']:h('poke')?['flash','ignite','消耗壓制']:['flash','heal','保護隊友'];}
const CHOICE_KEY='esports-spells-hero';
function loadChoice(){try{return JSON.parse(localStorage.getItem(CHOICE_KEY)||'{}')||{};}catch{return {};}}
function choiceFor(i){const c=loadChoice()[i];return validSpells(c,ROSTER[i].role)?c:null;}
function setChoice(i,pick){const c=loadChoice();if(pick)c[i]=pick;else delete c[i];try{localStorage.setItem(CHOICE_KEY,JSON.stringify(c));}catch{}}
function spellsFor(a){const rec=recSpells(a.heroIndex).slice(0,2);return a.player?(choiceFor(a.heroIndex)||rec):rec;}
// 英雄可能在開賽後才換成 BP 選的英雄，所以每次英雄更新時檢查一次
function syncSpells(a){if(a.kind!=='hero'||a._spellFor===a.heroIndex)return;a._spellFor=a.heroIndex;const pick=spellsFor(a),rec=recSpells(a.heroIndex);a.spells=pick.map(id=>({id,cd:0}));
 const bonus=1+.01*pick.filter(x=>rec.slice(0,2).includes(x)).length;a.power*=bonus/(a._spellBonus||1);a._spellBonus=bonus;if(a.player&&state)state.playerSpells=pick;}
function spellBox(i){const r=ROSTER[i].role,rec=recSpells(i),cur=choiceFor(i)||rec.slice(0,2),same=cur.every(x=>rec.includes(x));
 return `<details class="spell-pick" id="bpSpells" data-for="${i}"><summary>召喚師技能：<b>${cur.map(id=>SPELLS[id].name).join('＋')}</b>${same?'<em>推薦</em>':''}<small>點開更換（可不選，預設用推薦）</small></summary>
 <p class="muted">${e2(ROSTER[i].name)} 推薦 ${rec.slice(0,2).map(id=>SPELLS[id].name).join('＋')}：${rec[2]}。照推薦帶兩個 +2% 強度，帶一個 +1%。${r===1?'打野必帶懲擊。':''}</p>
 <div class="spell-options">${SPELL_ORDER.map(id=>`<button type="button" class="${cur.includes(id)?'selected':''} ${rec.slice(0,2).includes(id)?'rec':''}" data-bspell="${id}" title="${SPELLS[id].desc}">${SPELLS[id].name}<small>${Math.round(SPELLS[id].cd/60*10)/10} 分 · ${SPELLS[id].desc}</small></button>`).join('')}</div>
 ${same?'':'<button type="button" class="quiet" data-bspell-reset>恢復推薦</button>'}</details>`;}
const e2=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function bpHero(){const c=window.CAREER?.data;if(!c)return null;if(document.querySelector('#lockDraft')&&c.pending)return c.pending.playerHero;
 if(document.querySelector('#proPlay')){const L=window.WORLD?.data?.live,d=L?.draft;return d?d.picks[d.mine]?.[c.role]??null:null;}return null;}
function mountSpells(){const i=bpHero(),old=document.querySelector('#bpSpells');if(i==null){old?.remove();return;}if(old&&+old.dataset.for===i)return;
 const anchor=document.querySelector('#lockDraft')||document.querySelector('#proPlay')?.closest('.pro-actions');if(!anchor)return;const open=old?.open;old?.remove();anchor.insertAdjacentHTML('beforebegin',spellBox(i));const box=document.querySelector('#bpSpells');if(open)box.open=true;
 box.addEventListener('click',ev=>{const b=ev.target.closest('[data-bspell]'),reset=ev.target.closest('[data-bspell-reset]');if(!b&&!reset)return;const r=ROSTER[i].role,rec=recSpells(i).slice(0,2);let cur=choiceFor(i)||rec;
  if(reset)cur=null;else{const id=b.dataset.bspell;if(cur.includes(id))return;cur=r===1&&cur[1]==='smite'&&id!=='smite'?[id,'smite']:[cur[1],id];if(r===1&&!cur.includes('smite'))cur=[cur[1],'smite'];}
  setChoice(i,cur&&!cur.every(x=>rec.includes(x))?cur:null);box.remove();mountSpells();document.querySelector('#bpSpells').open=true;});}
if(typeof MutationObserver!=='undefined'&&typeof document!=='undefined'&&document.body){new MutationObserver(()=>mountSpells()).observe(document.body,{childList:true,subtree:true});}
if(typeof renderSetup==='function'){const rs=renderSetup;renderSetup=function(){rs();const sp=document.querySelector('#spellPick');if(sp?.remove)sp.remove();};}
const st=start;start=function(){st();buildPolicyPanel();refreshPolicy();};
// ---------- drawing (wards) ----------
function paintRecall(c){const s=state;for(const a of s.actors){if(a.recallAt==null||!live(a)||(a.team&&!bVisible(a)))continue;const p=Math.min(1,(s.time-a.recallAt)/RECALL);c.save();c.globalAlpha=.85;c.strokeStyle='#7fd3ff';c.lineWidth=2.2;c.beginPath();c.arc(a.x,a.y,15,-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.stroke();c.globalAlpha=.18+.12*Math.sin(s.time*8);c.fillStyle='#7fd3ff';c.beginPath();c.arc(a.x,a.y,15,0,Math.PI*2);c.fill();c.globalAlpha=1;c.font='bold 8px sans-serif';c.textAlign='center';c.fillStyle='#e8f7ff';c.fillText('回城 '+Math.max(0,RECALL-(s.time-a.recallAt)).toFixed(1),a.x,a.y-20);c.restore();}}
function paintWorld(c){const s=state;if(s?.actors)paintRecall(c);if(!s?.wards)return;for(const w of s.wards){if(w.until<=s.time||(w.team&&!bVisible(w)))continue;c.save();c.globalAlpha=Math.min(1,(w.until-s.time)/10);c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(w.x,w.y+3,4,1.6,0,0,Math.PI*2);c.fill();c.fillStyle=w.team?'#e98b7f':'#7fd3e2';c.strokeStyle='#1c2130';c.lineWidth=.8;c.beginPath();c.moveTo(w.x,w.y-9);c.lineTo(w.x+3,w.y+2);c.lineTo(w.x-3,w.y+2);c.closePath();c.fill();c.stroke();c.beginPath();c.arc(w.x,w.y-10,2.2,0,Math.PI*2);c.fillStyle='#fff6c8';c.fill();if(!w.team){c.globalAlpha=.12;c.beginPath();c.arc(w.x,w.y,115,0,Math.PI*2);c.fillStyle='#bfefff';c.fill();}c.restore();}}
// player's team sees through its wards
const baseVisible=bVisible;bVisible=function(u){if(baseVisible(u))return true;const s=state;return !!s?.wards?.some(w=>w.team===0&&w.until>s.time&&dist(w,u)<115);};
return{laneProbe,story,moveTo,skirmish,spell,use,sees,laneRoles,ownTower,laneLead,fightValue,iqOf,placeWard,sweep,TP_CHANNEL,distToLane,laneOf,underEnemyTower,escape,goHome,recSpells,choiceFor,setChoice,spellsFor,campAggro:c=>CAMP_AGGRO.get(c),SPELLS,DEFAULT_SPELLS,heroPower,plan,sees,paintWorld,levelMul,tough,xpNeed,get spots(){return SPOTS;},effectiveBar,policy};
})();
// team-fight threshold honours one-off player decisions
if(typeof window!=='undefined')window.MACRO=MACRO;
if(typeof window!=='undefined'&&window.ESPORTS)Object.assign(window.ESPORTS,{start,tick,bDamage,bWave,bHero,bTowers,bMinions,bObjective,finish});
