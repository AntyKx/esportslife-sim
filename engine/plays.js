'use strict';
// 1.05 各位置自己的思考：讓每一場的戰況都不一樣
// ・每位英雄每場會抽一組個性（愛游走、重視野、愛蹲草、愛傳送），同一個人每場打法不同。
// ・中路推完兵 → 看哪一路正在對拼或隊友打野正在 gank，跑過去支援；隊友打野在野區被打 → 中路／輔助進野區幫忙。
// ・上路（或帶傳送的人）傳送還在 → 別處爆發 2v2 以上的戰鬥，就傳送到附近的眼、塔或小兵旁加入。
// ・輔助／打野在物件出現前去河道、野區做視野；對手可能正蹲在草裡 → 「做視野被抓」。
// ・打野／輔助／中路會蹲在敵人常經過的草叢，敵人走進來（又沒有視野）就埋伏 → 「探草被抓」。
// ・打野選路 gank：隊友控場多、對手沒有位移或閃現、對手殘血 → 加分，並在戰報說明「為什麼抓這一路」。
// 事件寫進 state.story（主播、聊天室、精華、結果模式戰報都會用到）。
(()=>{
const M=()=>window.MACRO,R=Math.random;
const live=a=>a&&a.kind==='hero'&&a.hp>0&&!(a.dead>0);
const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const LN=['上路','中路','下路'];
// 1.06 固定個性：同一個選手每場都一樣（從身分、天賦、位置、英雄技能推出來），只有 ±8% 的臨場手感浮動
function hash(t){let h=2166136261;for(const ch of String(t)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const ROLE_BASE=[{roam:.25,vision:.3,lurk:.2,tp:.75},{roam:.5,vision:.55,lurk:.6,tp:.2},{roam:.6,vision:.3,lurk:.3,tp:.3},{roam:.2,vision:.25,lurk:.15,tp:.2},{roam:.55,vision:.75,lurk:.5,tp:.2}];
const ABIL={initiate:{roam:.15,lurk:.05,tp:.1},mapsense:{roam:.12,vision:.15},visionking:{vision:.3},hook:{lurk:.2},tyrant:{lurk:.15,roam:.1},invade:{lurk:.15},lonewolf:{roam:-.2,tp:-.25},feeder:{lurk:-.1},kite:{roam:-.1}};
function identity(a){const s=state,c=window.CAREER?.data;if(a.player&&c)return {key:'me:'+(c.talent?.seed||c.name||'p'),abil:c.talent?.abilities||[]};
 let pr=null;try{pr=window.TALENT?.profiles?.()?.get(a);}catch{}
 if(pr&&pr.ai&&pr.name&&pr.name!==a.heroName)return {key:'pro:'+pr.name,abil:pr.talent?.abilities||[]};
 return {key:'npc:'+a.heroName+':'+a.role,abil:pr?.talent?.abilities||[]};}
function traits(a){const id=identity(a),b=ROLE_BASE[a.role]||ROLE_BASE[2],h=hash(id.key),t={};let i=0;
 for(const k of ['roam','vision','lurk','tp']){const r=((h>>>(i*8))&255)/255;t[k]=b[k]+(r-.5)*.5;i++;}
 for(const ab of id.abil)for(const [k,v] of Object.entries(ABIL[ab]||{}))t[k]+=v;
 if(hasMob(a))t.roam+=.08;if(hasCC(a))t.lurk+=.08;
 for(const k in t)t[k]=Math.max(.08,Math.min(.95,t[k]));return {t,key:id.key};}
function pers(a){if(a.pers)return a.pers;const {t,key}=traits(a),f=()=>1+(R()-.5)*.16;a.pers={roam:t.roam*f(),vision:t.vision*f(),lurk:t.lurk*f(),tp:t.tp*f(),base:t,key};return a.pers;}
function ops(a){const k=(typeof ROSTER!=='undefined'?ROSTER:window.ROSTER)?.[a.heroIndex]?.kit;if(!k)return [];return ['s','w','e'].flatMap(x=>k[x]?.ops||[]);}
const hasCC=a=>ops(a).some(o=>['stun','root','up'].includes(o[0]));
const hasMob=a=>ops(a).some(o=>o[0]==='dash'||o[0]==='blink');
const team=(s,t)=>s.actors.filter(b=>b.kind==='hero'&&b.team===t&&live(b));
function say(type,a,v={}){const s=state;M().story(type,a.team,{who:a.heroName,ai:s.actors.indexOf(a),...v});}
function region(p){if(D(p,{x:130,y:590})<170||D(p,{x:670,y:50})<170)return '高地';if(p.x<190||p.y<110)return '上路';if(p.y>530||p.x>610)return '下路';if(Math.abs(p.y-p.x+80)<50)return '河道';if(Math.abs(p.x+p.y-720)<70)return '中路';return '野區';}
const busy=(s,t,k)=>team(s,t).some(b=>b.play?.kind===k);
function endPlay(a){a.play=null;a.playNext=state.time+6+R()*6;}
// ---------- 各位置的選擇 ----------
function roam(s,a,p,iq){if(a.task?.kind!=='lane'||s.time<210||s.time>1150)return null;if(a.role!==2&&!(a.role===4&&s.time>540))return null;
 const e=1-a.team,m=M();const ln=a.role===2?1:2;if(D(a,bBase(a.team))<300||m.distToLane(a,ln)>150)return null;
 // 兵線推進對面塔下（我方小兵在敵塔附近），或身邊敵兵只剩 1 隻，才算「推完線」
 const et=s.structures.filter(t=>t.team===e&&t.kind==='tower'&&t.hp>0&&t.lane===ln).sort((x,y)=>D(x,a)-D(y,a))[0],shoved=et&&s.minions.filter(x=>x.team===a.team&&x.hp>0&&D(x,et)<170).length>=3;
 if(!shoved&&s.minions.filter(x=>x.team===e&&x.hp>0&&D(x,a)<210).length>1)return null;
 const foe=s.actors.find(b=>b.team===e&&b.role===a.role&&live(b));if(foe&&D(foe,a)<300&&!foe.recalling&&!shoved)return null;// 兵推進塔下，對手得留下來清兵，正是游走時機
 let best=null,bs=0;
 for(const l of [0,2]){if(a.role===4&&l===2)continue;const al=team(s,a.team).filter(b=>b!==a&&m.laneRoles(l).includes(b.role)&&b.task?.kind==='lane'),en=team(s,e).filter(b=>al.some(x=>D(x,b)<300));
  if(!al.length||!en.length)continue;const d=D(a,al[0]);if(d>950)continue;
  const low=en.filter(b=>b.hp<b.maxHp*.65).length,gk=s.ganking?.[a.team]&&s.ganking[a.team].until>s.time&&en.includes(s.ganking[a.team].victim)?1.5:0;
  const v=low*.8+gk+(al.length>=en.length?.5:0)+(al.some(hasCC)?.3:0)-d/1400;if(v>bs){bs=v;best={l,ally:al[0],victim:en.sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0]};}}
 if(!best||bs<.7||R()>p.roam*.6+iq*.3)return null;
 a.play={kind:'roam',until:s.time+24,target:best.victim,ally:best.ally,lane:best.l,from:s.time};say('roam',a,{lane:LN[best.l],victim:best.victim.heroName,label:a.role===2?'推完中路兵線':'離開下路'});return a.play;}
function assist(s,a,p,iq){if(![2,4,0].includes(a.role)||s.time<150||(a.assistCD||0)>s.time||(s['as'+a.team]||0)>s.time)return null;const jg=team(s,a.team).find(b=>b.role===1&&b!==a);if(!jg||D(a,jg)>650)return null;
 const fight=team(s,1-a.team).filter(b=>D(b,jg)<200);if(!fight.length||jg.hp<jg.maxHp*.25||s.time-(jg.lastHurt??-99)>2&&!fight.some(b=>s.time-(b.lastHurt??-99)<2))return null;
 const zone=region(jg);if(zone!=='野區'&&zone!=='河道')return null;if(R()>.35+p.roam*.3+iq*.2)return null;
 a.assistCD=s.time+100;s['as'+a.team]=s.time+75;a.play={kind:'assist',until:s.time+16,target:fight[0],ally:jg,from:s.time};say('assistJg',a,{victim:fight[0].heroName,label:zone});return a.play;}
function tp(s,a,p,iq){const m=M();if(s.time<300||!m.spell(a,'tp')||['defend','lvl1'].includes(a.task?.kind))return null;
 let best=null;for(const b of team(s,a.team)){if(b===a||D(a,b)<450)continue;const en=team(s,1-a.team).filter(x=>D(x,b)<300),al=team(s,a.team).filter(x=>D(x,b)<300);
  if(en.length>=1&&en.length+al.length>=3&&[...en,...al].some(x=>s.time-(x.lastHurt??-99)<3)&&(!best||en.length+al.length>best.n))best={b,n:en.length+al.length};}
 if(!best||R()>p.tp*.55+iq*.3)return null;const b=best.b;
 const anchors=[...s.wards.filter(w=>w.team===a.team&&w.until>s.time),...s.structures.filter(t=>t.team===a.team&&t.hp>0&&t.kind==='tower'),...s.minions.filter(x=>x.team===a.team&&x.hp>0)].filter(x=>D(x,b)<320).sort((x,y)=>D(x,b)-D(y,b));
 const an=anchors[0];if(!an)return null;
 m.use(a,'tp');a.tpAt=s.time+m.TP_CHANNEL;a.tpTo={x:an.x+(a.team?8:-8),y:an.y+6};a.nav=null;
 a.play={kind:'tpJoin',until:s.time+m.TP_CHANNEL+14,target:team(s,1-a.team).filter(x=>D(x,b)<260)[0],ally:b,from:s.time};say('tpPlay',a,{label:region(b),lane:region(b)});return a.play;}
function nextEpic(s){return [s.dragon,s.baron].filter(o=>o).map(o=>({o,in:o.alive?0:o.respawn-s.time})).filter(x=>x.in<70).sort((x,y)=>x.in-y.in)[0]?.o||null;}
function ward(s,a,p,iq){if(s.time<200||(a.wardCharges||0)<1||!M().spots)return null;if(a.role!==4&&a.role!==1&&!(s.time>900&&R()<.3))return null;if(a.role===1&&a.task?.kind!=='jungle')return null;if(a.role===4&&a.task?.kind!=='lane'&&s.time<840)return null;
 if(R()>p.vision*(a.role===4?.5:.25))return null;const ep=nextEpic(s),deepOk=p.vision>.6;
 const spots=M().spots.map(q=>({x:q[0],y:q[1]})).filter(q=>!s.wards.some(w=>w.team===a.team&&w.until>s.time&&D(w,q)<120)&&D(q,a)<520&&(ep?D(q,ep)<260:true)&&(deepOk||(a.team?q.y<q.x-40:q.y>q.x-120)));
 const q=spots.sort((x,y)=>D(x,a)-D(y,a))[0];if(!q)return null;
 a.play={kind:'ward',pt:q,until:s.time+22,from:s.time,deep:(a.team?q.y>q.x-80:q.y<q.x-80)};return a.play;}
function lurk(s,a,p,iq){if(s.time<200||![1,4,2].includes(a.role)||busy(s,a.team,'lurk')||!M().spots)return null;if(a.role===2&&a.task?.kind!=='lane')return null;if(a.role===1&&a.task?.kind!=='jungle')return null;
 if(R()>p.lurk*(a.role===1?.5:.3))return null;const e=1-a.team,ep=nextEpic(s);
 const cand=M().spots.map(q=>({x:q[0],y:q[1]})).filter(q=>D(q,a)<480&&!s.wards.some(w=>w.team===e&&w.until>s.time&&D(w,q)<125)&&!team(s,e).some(b=>D(b,q)<240));
 // 敵人會經過的草：物件附近、敵方輔助正要去做視野、敵方深推的線
 const score=q=>(ep&&D(q,ep)<240?1:0)+(team(s,e).some(b=>b.play?.kind==='ward'&&D(b.play.pt,q)<200)?2:0)+(team(s,e).some(b=>b.task?.kind==='lane'&&D(b,q)<380)?.8:0)+(team(s,e).some(b=>b.task?.kind==='jungle'&&D(b,q)<300)?.6:0)-D(q,a)/700;
 const q=cand.sort((x,y)=>score(y)-score(x))[0];if(!q||score(q)<.2)return null;
 a.play={kind:'lurk',pt:q,until:s.time+20,from:s.time};return a.play;}
// ---------- 執行 ----------
function fightOr(a,dt,foes,r=280){const m=M();return foes.length&&m.skirmish(a,dt,r,true);}
function run(a,dt,foesNear){const s=state,m=M(),pl=a.play,e=1-a.team;
 if(pl.kind==='roam'||pl.kind==='assist'||pl.kind==='tpJoin'||pl.kind==='catch'){
  const tg=live(pl.target)?pl.target:team(s,e).filter(b=>pl.ally&&D(b,pl.ally)<300).sort((x,y)=>D(x,a)-D(y,a))[0];
  const close=s.actors.filter(b=>b.team===e&&live(b)&&D(b,a)<260);
  if(close.length){pl.met=true;pl.quiet=s.time;if(fightOr(a,dt,close,300))return true;}
  if(pl.met&&s.time-(pl.quiet||0)>4){endPlay(a);return false;}
  const to=tg||(live(pl.ally)?pl.ally:null);if(!to){endPlay(a);return false;}
  m.moveTo(a,to,dt,a.range*.8);return true;}
 if(pl.kind==='ward'){if(foesNear.length){endPlay(a);return false;}if(D(a,pl.pt)>26){m.moveTo(a,pl.pt,dt,4);return true;}m.sweep(a);m.placeWard(a,pl.pt);endPlay(a);return false;}
 if(pl.kind==='lurk'){if(s.wards.some(w=>w.team===e&&w.until>s.time&&D(w,a)<120)){endPlay(a);return false;}
  if(D(a,pl.pt)>14){if(foesNear.length){endPlay(a);return false;}m.moveTo(a,pl.pt,dt,2);return true;}
  const v=team(s,e).filter(b=>D(b,a)<200).sort((x,y)=>D(x,a)-D(y,a))[0];
  if(v){const mine=team(s,a.team).filter(b=>D(b,a)<320).length,theirs=team(s,e).filter(b=>D(b,v)<320).length;
   if(mine>=theirs||v.hp<v.maxHp*.55){const why=v.play?.kind==='ward'?'ward':v.task?.kind==='jungle'?'jungle':'face';
    v.caughtUntil=s.time+1.4;v.slowUntil=s.time+1.6;v.slowPct=Math.max(v.slowPct||0,.3);
    say('ambush',a,{victim:v.heroName,vi:s.actors.indexOf(v),label:why,lane:region(a)});
    for(const b of team(s,a.team))if(b!==a&&!b.player&&D(b,a)<420&&!b.play)b.play={kind:'catch',target:v,until:s.time+8,from:s.time};
    a.play={kind:'catch',target:v,until:s.time+9,from:s.time};return run(a,dt,foesNear);}
   endPlay(a);return false;}
  return true;}// 靜靜蹲著
 endPlay(a);return false;}
function hero(a,dt,task,foesNear){const s=state;if(!s||s.time<60||!M()?.moveTo)return false;
 if(a.play&&(s.time>a.play.until||a.recalling)){endPlay(a);}
 if(a.play)return run(a,dt,foesNear);
 // 傳送每秒判斷一次（戰鬥很短，錯過就沒了）；其他打法 2.5～5 秒想一次
 if(s.time>(a.tpNext||0)&&!a.recalling&&a.hp>a.maxHp*.5){a.tpNext=s.time+1;const p=pers(a),pl=tp(s,a,p,M().iqOf(a));if(pl)return true;}
 if((a.playNext||0)>s.time)return false;a.playNext=s.time+2.5+R()*2.5;
 if(a.hp<a.maxHp*.55||a.recalling)return false;
 const p=pers(a),iq=M().iqOf(a);
 // 對線時對手就在旁邊很正常：傳送仍可判斷；其他打法要身邊沒敵人
 const pl=!foesNear.length&&(assist(s,a,p,iq)||roam(s,a,p,iq)||lurk(s,a,p,iq)||ward(s,a,p,iq));
 return pl&&a.tpAt==null?run(a,dt,foesNear):!!pl;}
// ---------- 打野挑哪一路 ----------
function gankBonus(a,v,l){const s=state,m=M(),al=team(s,a.team).filter(b=>m.laneRoles(l).includes(b.role)),cc=al.filter(hasCC).length;
 return cc*.35+(hasMob(v)?-.45:.25)+(v.spells?.some(x=>x.id==='flash'&&x.cd<=0)?0:.2);}
function onGank(a,v,l){const s=state,m=M(),al=team(s,a.team).filter(b=>m.laneRoles(l).includes(b.role)),cc=al.filter(hasCC).length,why=[];
 if(cc)why.push(`隊友有 ${cc} 個控場`);if(!hasMob(v))why.push(`${v.heroName} 沒有位移技`);if(!v.spells?.some(x=>x.id==='flash'&&x.cd<=0))why.push(`${v.heroName} 沒閃現`);if(v.hp<v.maxHp*.6)why.push(`${v.heroName} 血量偏低`);
 const k='gp'+a.team;if(!why.length||(s[k]||-99)>s.time-50)return;s[k]=s.time;say('gankPlan',a,{victim:v.heroName,lane:LN[l],label:why.slice(0,2).join('、')});}
window.PLAYS={hero,gankBonus,onGank,hasCC,hasMob,pers,traits};
})();
