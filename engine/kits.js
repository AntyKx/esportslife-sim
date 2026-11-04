'use strict';
// 0.37 英雄技能組：被動＋招牌技＋大招。資料在 roster.js（ROSTER[i].kit），這裡負責實際戰鬥效果與 AI 施放時機。
// 載入順序：… macro.js → kits.js → career.js …；equipment / visuals 之後再包一層，不受影響。
(()=>{
const live=u=>!!u&&u.hp>0&&!u.dead;
const STRUCT=['tower','inhibitor','core'];
const BASIC_CD=[1.1,1.6,1.5,2.5];
let CAST=null;const ULT_DMG=1,BURN_HIT=1; // 平衡用：大招傷害倍率、被動普攻燃燒倍率
const kitOf=a=>a&&a.kind==='hero'?ROSTER[a.heroIndex]?.kit:null;
function pv(a,type){const k=kitOf(a);return k&&k.p[1]===type?k.p[2]:0;}
const has=(ops,op)=>ops.find(o=>o[0]===op);

function init(a){if(a._kitFor===a.heroIndex)return;a._kitFor=a.heroIndex;const b=pv(a,'bulk');if(b&&!a._bulk){a._bulk=1+b;a.maxHp*=a._bulk;a.hp*=a._bulk;}if(a.ultCD===undefined)a.ultCD=0;a.basicN=0;}
function enemiesNear(a,c,r){const s=state;return [...s.actors,...s.minions].filter(u=>u.team!==a.team&&live(u)&&Math.hypot(u.x-c.x,u.y-c.y)<r);}
function alliesNear(a,r){return state.actors.filter(u=>u.team===a.team&&live(u)&&dist(a,u)<r);}
function hurtAlly(a,r=135){return alliesNear(a,r).filter(u=>u.hp<u.maxHp*.72).sort((u,v)=>u.hp/u.maxHp-v.hp/v.maxHp)[0];}
function control(e,until,stun){const s=state;if(e.kind==='hero'){const ss=pv(e,'spellShield');if(ss&&!(e._ssUntil>s.time)){e._ssUntil=s.time+ss;s.effects.push({x:e.x,y:e.y,ttl:1.2,color:'#d6ecff',label:'抵擋'});return;}}e.rootUntil=Math.max(e.rootUntil||0,until);if(stun)e.stunUntil=Math.max(e.stunUntil||0,until);}
function walkRaw(u,p,n){if(n>0&&p)baseWalk(u,p,n);}

// 施放一個技能規格（招牌或大招）。回傳是否成功施放。
function cast(a,spec,foe,ult,mul=1){
 const s=state,ops=spec.ops,power=(a.power||1)*(1+pv(a,'skillDmg'))*(ult?ULT_DMG:1)*mul;
 CAST=a;a._cast={ops:ops.map(o=>o[0]),t:spec.t,r:spec.r||0,key:a._castKey||(ult?'r':'q')};a._castKey=null;
 try{
  for(const [op,v] of ops){if(!foe)break;if(op==='dash')walkRaw(a,foe,Math.min(v,Math.max(0,dist(a,foe)-14)));if(op==='blink')walkRaw(a,foe,Math.max(0,dist(a,foe)-12));}
  const enemyT=['foe','area','around'].includes(spec.t);
  let foes=[],friends=[a];
  if(spec.t==='foe')foes=foe?[foe]:[];
  else if(spec.t==='area'){foes=foe?enemiesNear(a,foe,spec.r):[];if(foe&&!foes.includes(foe))foes.push(foe);}
  else if(spec.t==='around')foes=enemiesNear(a,a,spec.r);
  else if(spec.t==='ally'){const h=hurtAlly(a,140)||a;friends=[h];}
  else if(spec.t==='allies')friends=alliesNear(a,spec.r||140);
  const exec=has(ops,'exec');let dealt=0;
  for(const [op,v,b] of ops){
   const alive=foes.filter(live);
   switch(op){
    case 'dmg':for(const e of alive){let d=v*power;if(exec&&e.hp<e.maxHp*.35)d*=exec[1];const hp=e.hp;bDamage(a,e,d);dealt+=Math.max(0,hp-(live(e)?e.hp:0));bShot(a,e,ult?'#ffd66e':'#efc475');}break;
    case 'stun':case 'up':for(const e of alive)control(e,s.time+v,true);break;
    case 'root':for(const e of alive)control(e,s.time+v,false);break;
    case 'slow':for(const e of alive){e.slowPct=Math.max(e.slowUntil>s.time?e.slowPct||0:0,v);e.slowUntil=s.time+b;}break;
    case 'burn':if(s.burns)for(const e of alive)s.burns.push({from:a,to:e,until:s.time+b,dps:v*power});break;
    case 'vuln':for(const e of alive){e.vulnUntil=s.time+b;e.vulnPct=v;}break;
    case 'pull':for(const e of alive)if(e!==a)walkRaw(e,a,Math.min(v,Math.max(0,dist(a,e)-18)));break;
    case 'push':for(const e of alive){const d=Math.max(1,dist(a,e));walkRaw(e,{x:e.x+(e.x-a.x)/d*v,y:e.y+(e.y-a.y)/d*v},v);}break;
    case 'heal':case 'sheal':{const amt=v*(a.power||1)*mul*(1+pv(a,'healPower'));for(const f of op==='sheal'?[a]:friends){const before=f.hp;f.hp=Math.min(f.maxHp,f.hp+amt);if(a.player)s.personal.healing+=f.hp-before;if(f!==a)bShot(a,f,'#b7ef86');}break;}
    case 'shield':case 'sshield':for(const f of op==='sshield'?[a]:friends)f.shield=(f.shield||0)+v*(a.power||1)*mul;break;
    case 'haste':for(const f of friends)f.hasteUntil=Math.max(f.hasteUntil||0,s.time+v);break;
    case 'speed':for(const f of friends){f.speedUntil=s.time+b;f.speedPct=v;}break;
    case 'dr':for(const f of friends){f.drUntil=s.time+b;f.drPct=v;}break;
    case 'untarget':for(const f of friends)f.untargetUntil=s.time+v;break;
   }
  }
  const drain=has(ops,'drain');if(drain&&dealt>0)a.hp=Math.min(a.maxHp,a.hp+dealt*drain[1]);
  if(!ult&&foe?.kind==='camp'&&has(ops,'dmg'))bDamage(a,foe,22*a.power);
  if(!ult){const cs=pv(a,'castShield');if(cs)for(const f of alliesNear(a,130))if(f!==a)f.shield=(f.shield||0)+cs*(a.power||1);}
 }finally{CAST=null;}
 return true;
}

// ── 0.69 四招：Q（原招牌）W E（新增）R（原大招）＋被動；技能等級（Q/W/E 最高 5、R 最高 3） ──
const MAXR={q:5,w:5,e:5,r:3};
const FOUR=()=>globalThis.FOUR_SKILLS!==false; // 模擬比較用：設成 false 就回到舊的「招牌＋大招」
const BAL={q:[.95,.01],we:[.33,.035],r:[1,.1],cd:.02,rcd:.1};
function rank(a,x){if(!FOUR())return x==='q'?1:x==='r'?((a.level||1)>=6?1:0):0;return a.sk?.[x]||0;}
function rmul(a,x){if(!FOUR())return 1;const r=rank(a,x),b=x==='r'?BAL.r:x==='q'?BAL.q:BAL.we;return x==='r'?b[0]+b[1]*(r-1):b[0]+b[1]*r;}
function rcd(a,x){if(!FOUR())return 1;const r=rank(a,x);return x==='r'?1-BAL.rcd*(r-1):1-BAL.cd*(r-1);}
// AI 點技能：6/11/16 點大招；1–3 級先把 Q W E 都點出來；之後主修 Q、再依職業點副修，不超過「等級的一半（無條件進位）」
function ranks(a){const k=kitOf(a);if(!k)return;if(!a.sk)a.sk={q:0,w:0,e:0,r:0};const lv=Math.min(18,a.level||1);if(a._skLv===lv)return;a._skLv=lv;
 const order=k.order||['q','e','w'];let spent=a.sk.q+a.sk.w+a.sk.e+a.sk.r;
 while(spent<lv){const L=spent+1;let pick=null;
  if((L===6||L===11||L===16)&&a.sk.r<MAXR.r)pick='r';
  else if(L<=3)pick=order.find(x=>!a.sk[x])||order[0];
  else{const cap=Math.ceil(L/2);pick=order.find(x=>a.sk[x]<MAXR[x]&&a.sk[x]<cap)||order.find(x=>a.sk[x]<MAXR[x])||'r';}
  if(pick==='r'&&a.sk.r>=MAXR.r)pick=order.find(x=>a.sk[x]<MAXR[x]);if(!pick)break;a.sk[pick]++;spent++;}}
function tryWE(a,foe,x){const s=state,k=kitOf(a),sp=k[x];if(!sp||!rank(a,x)||a[x+'CD']>0||blocked(a))return false;
 const enemyT=['foe','area','around'].includes(sp.t);
 if(enemyT){if(!foe||!live(foe))return false;if(sp.t!=='around'&&foe.kind!=='hero'&&!has(sp.ops,'dmg'))return false;
  const reach=sp.t==='around'?(sp.r||90):a.range+35+(has(sp.ops,'dash')?.[1]||0)+(has(sp.ops,'blink')?60:0);if(dist(a,foe)>reach)return false;
  // 位移／控制技優先留給英雄
  if((has(sp.ops,'dash')||has(sp.ops,'blink')||has(sp.ops,'stun')||has(sp.ops,'root'))&&foe.kind!=='hero')return false;}
 else if(sp.t==='ally'||sp.t==='allies'){const heal=has(sp.ops,'heal');if(heal&&!hurtAlly(a,sp.r||140))return false;
  if(!heal){const fight=s.actors.some(e=>e.team!==a.team&&live(e)&&e.kind==='hero'&&dist(e,a)<260);if(!fight)return false;}}
 else{// self：打架中或危險時才開
  const near=s.actors.some(e=>e.team!==a.team&&live(e)&&e.kind==='hero'&&dist(e,a)<a.range+90);if(!near)return false;}
 a._castKey=x;cast(a,sp,foe,false,rmul(a,x));a[x+'CD']=sp.cd*(heroes[a.heroIndex]?.cdMul||1)*rcd(a,x);
 a.lastSkill=sp.name;s.skillUses++;if(a.player)s.personal.skills++;
 s.effects.push({x:a.x,y:a.y,ttl:1.6,color:a.team?'#f1a7a1':'#9fd8f0',label:sp.name});return true;}
function blocked(a){const s=state;return !live(a)||a.recalling||a.rootUntil>s.time;}
function trySignature(a,foe){
 const s=state,k=kitOf(a),sp=k.s;if(a.skillCD>0||blocked(a)||!rank(a,'q'))return false;
 const healer=has(sp.ops,'heal')&&(sp.t==='ally'||sp.t==='allies');
 if(healer){if(!hurtAlly(a))return false;}
 else{if(!foe||!live(foe))return false;const reach=a.range+35+(has(sp.ops,'dash')?.[1]||0)+(has(sp.ops,'blink')?60:0);if(dist(a,foe)>reach)return false;}
 a._castKey='q';cast(a,sp,foe,false,rmul(a,'q'));a.skillCD=sp.cd*(heroes[a.heroIndex]?.cdMul||1)*rcd(a,'q');
 const name=skillNames[a.heroIndex];a.lastSkill=name;s.skillUses++;if(a.player)s.personal.skills++;
 s.effects.push({x:a.x,y:a.y,ttl:2,color:a.team?'#f1a7a1':'#b7ef86',label:name});return true;
}
function tryUlt(a,foe){
 const s=state,k=kitOf(a),u=k.u;if(!rank(a,'r')||a.ultCD>0||blocked(a))return false;
 const enemyT=['foe','area','around'].includes(u.t);
 if(enemyT){
  if(!foe||foe.kind!=='hero'||!live(foe))return false;
  const reach=(u.range||a.range+60)+(has(u.ops,'dash')?.[1]||0)+(has(u.ops,'blink')?80:0);if(dist(a,foe)>reach)return false;
  const center=u.t==='around'?a:foe,heroes=state.actors.filter(e=>e.team!==a.team&&live(e)&&Math.hypot(e.x-center.x,e.y-center.y)<Math.max(u.r,70)).length;
  if(!(heroes>=2||foe.hp<foe.maxHp*.55||a.hp<a.maxHp*.4))return false;
 }else{
  const pool=u.t==='self'?[a]:alliesNear(a,u.r||140);
  const danger=pool.some(f=>f.hp<f.maxHp*(u.t==='self'?.5:.45)&&s.actors.some(e=>e.team!==a.team&&live(e)&&dist(e,f)<220));
  if(!danger)return false;
 }
 a._castKey='r';cast(a,u,foe,true,rmul(a,'r'));a.ultCD=u.cd*(heroes[a.heroIndex]?.cdMul||1)*rcd(a,'r');
 a.lastSkill=u.name;s.skillUses++;if(a.player){s.personal.skills++;log(`你施放大招「${u.name}」！`);}
 s.effects.push({x:a.x,y:a.y-6,ttl:2.4,color:'#ffd66e',label:`${u.name}！`});return true;
}

const prevSkill=bSkill;
bSkill=function(a,foe){if(!kitOf(a))return prevSkill(a,foe);if(!state||state.done)return;init(a);ranks(a);if(tryUlt(a,foe))return;if(tryWE(a,foe,'e'))return;if(trySignature(a,foe))return;tryWE(a,foe,'w');};

const prevDamage=bDamage;
bDamage=function(from,to,amount){
 const s=state;if(!s||s.done||!to||!live(to))return prevDamage(from,to,amount);
 const fromHero=from?.kind==='hero';
 if(to.kind==='hero'){if(fromHero&&to.untargetUntil>s.time)return;if(to.drUntil>s.time)amount*=1-to.drPct;const ld=pv(to,'lowhpDR');if(ld&&to.hp<to.maxHp*.35)amount*=1-ld;to._hitAt=s.time;}
 if(to.vulnUntil>s.time)amount*=1+(to.vulnPct||0);
 let basic=false;
 if(fromHero&&!CAST&&BASIC_CD.includes(from.cd)){const key=s.time+':'+from.cd;if(from._bk!==key){from._bk=key;basic=true;}}
 if(basic){
  if(from.stunUntil>s.time)return;
  const en=pv(from,'everyN');if(en){from.basicN=(from.basicN||0)+1;if(from.basicN%en[0]===0)amount*=en[1];}
  amount+=pv(from,'onhit')*(from.power||1);
  const st=pv(from,'structure');if(st&&STRUCT.includes(to.kind))amount*=1+st;
 }
 if(fromHero){
  const ex=pv(from,'execute');if(ex&&to.hp<to.maxHp*.35)amount*=1+ex;
  const mo=pv(from,'monster');if(mo&&(to.kind==='camp'||to.kind==='objective'||to.epic))amount*=1+mo;
  const sb=pv(from,'stunBonus');if(sb&&(to.rootUntil>s.time||to.slowUntil>s.time))amount*=1+sb;
 }
 const hp=to.hp;prevDamage(from,to,amount);const dealt=Math.max(0,hp-(live(to)?to.hp:0));
 if(!fromHero||dealt<=0)return;
 const ls=pv(from,'lifesteal');if(ls&&live(from))from.hp=Math.min(from.maxHp,from.hp+dealt*ls);
 if(basic&&live(to)){
  const bh=pv(from,'burnhit');if(bh&&s.burns&&!(to._kb>s.time)){to._kb=s.time+bh[1];s.burns.push({from,to,until:s.time+bh[1],dps:bh[0]*BURN_HIT*(from.power||1)});}
  const sh=pv(from,'shred');if(sh){to.vulnUntil=s.time+3;to.vulnPct=Math.max(to.vulnPct||0,sh);}
  const sl=pv(from,'slowHit');if(sl&&to.kind==='hero'){to.slowUntil=s.time+sl[1];to.slowPct=Math.max(to.slowPct||0,sl[0]);}
  const th=pv(to,'thorns');if(th&&live(from))prevDamage(to,from,dealt*th);
 }
 if(basic){const sp=pv(from,'splash');if(sp){CAST=from;try{for(const e of enemiesNear(from,to,45))if(e!==to)bDamage(from,e,amount*sp);}finally{CAST=null;}}}
 if(to.kind==='hero'&&!live(to)&&pv(from,'takedownCD'))from.skillCD=0;
};

const baseWalk=bWalk;
bWalk=function(a,b,n){
 if(a&&a.kind==='hero'&&!CAST){const s=state;if(a.stunUntil>s.time)return;let m=1+pv(a,'speed');if(a.slowUntil>s.time)m*=1-(a.slowPct||0);if(a.speedUntil>s.time)m*=1+(a.speedPct||0);n*=m;}
 return baseWalk(a,b,n);
};

const prevHero=bHero;
bHero=function(a,dt){
 if(kitOf(a)){init(a);ranks(a);a.ultCD=Math.max(0,(a.ultCD||0)-dt);a.wCD=Math.max(0,(a.wCD||0)-dt);a.eCD=Math.max(0,(a.eCD||0)-dt);const s=state;if(a.slowUntil<=s.time)a.slowPct=0;if(a.vulnUntil<=s.time)a.vulnPct=0;
  const rg=pv(a,'regen');if(rg&&live(a)&&!(a._hitAt>s.time-5))a.hp=Math.min(a.maxHp,a.hp+a.maxHp*rg*dt);}
 return prevHero(a,dt);
};

window.KITS={ult:a=>{const k=kitOf(a);if(!k)return '';return !rank(a,'r')?`${k.u.name} · 6 級解鎖`:a.ultCD>0?`${k.u.name} · ${Math.ceil(a.ultCD)} 秒`:`${k.u.name} · 就緒`;},
 ranks:a=>{ranks(a);return {...a.sk};},
 bar:a=>{const k=kitOf(a);if(!k)return '';ranks(a);const cd={q:a.skillCD,w:a.wCD,e:a.eCD,r:a.ultCD};return ['q','w','e','r'].map(x=>`${x.toUpperCase()}${a.sk[x]?`<sup>${a.sk[x]}</sup>`:''} ${!a.sk[x]?'—':cd[x]>0?Math.ceil(cd[x])+'s':'✓'}`).join(' · ');},
 cast,tryWE,BAL};
Object.assign(window.ESPORTS,{bSkill,bDamage,bHero});
})();
