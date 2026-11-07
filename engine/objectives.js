'use strict';
// 1.01 地圖資源真的有感：
// 元素翼龍：每層全隊傷害 +4%；四層「翼龍之魂」再 +8% 傷害、受到傷害 −6%。
// 深淵領主（180 秒）：英雄傷害再 +12%（技能也算，普攻合計約 +25%）、受到傷害 −12%；原本的普攻 +12%、小兵 +45% 保留。
// 太古翼龍：原本的低血斬殺之外，受到傷害 −10%。
// 額外金錢（每人）：元素翼龍 75、太古翼龍 150、岩角巨獸 150、深淵領主 300、裂隙蟲群 24（原本統一 100）。
// 記分板隊名下方顯示目前的增益與剩餘時間。
(()=>{
const live=a=>a&&a.hp>0&&!(a.dead>0);
function outMul(s,t){let m=1;const d=s.drakes?.[t]||0;m*=1+.04*Math.min(4,d);if(d>=4)m*=1.08;if(s.heroBuff?.[t]>s.time)m*=1.12;return m;}
function inMul(s,t){let m=1;if((s.drakes?.[t]||0)>=4)m*=.94;if(s.heroBuff?.[t]>s.time)m*=.88;if(s.elderUntil?.[t]>s.time)m*=.9;return m;}
const prevDamage=bDamage;bDamage=function(from,to,amount,...rest){const s=state;
 if(s&&!s.done&&amount>0&&from&&to){if(from.kind==='hero'&&from.team<2)amount*=outMul(s,from.team);if(to.kind==='hero'&&to.team<2)amount*=inMul(s,to.team);}
 const was=to?.kind==='hero'&&live(to);const r=prevDamage.call(this,from,to,amount,...rest);
 if(was&&!live(to)&&s&&!s.done)try{bounty(s,from,to);}catch{}
 return r;};
// 1.01 終結賞金：擊殺 3 連殺以上的對手才有（150 起跳、每多一殺 +100），對方隊伍經濟領先時再加（最多 +700）
function bounty(s,from,to){const v=to.cbStreak||0;to.cbStreak=0;if(from?.kind!=='hero'||from.team===to.team)return;from.cbStreak=(from.cbStreak||0)+1;
 const lead=s.gold[to.team]-s.gold[from.team];if(v<3)return;let g=Math.min(500,150+(v-3)*100);if(lead>=2000)g+=Math.min(200,Math.round(lead*.04/10)*10);g=Math.min(700,g);
 from.gold=(from.gold||0)+g;s.gold[from.team]+=g;s.lastShutdown={victim:to,killer:from,gold:g,streak:v,time:s.time};
 try{log(`終結！${from.heroName}終結了${to.heroName}${v>=2?`的 ${v} 連殺`:''}，額外獲得 ${g} 賞金。`);}catch{}}
// 物件獎金：equipment.js 已經每人給 100（蟲群 24），這裡補到新數字
const GOLD={'元素翼龍':75,'太古翼龍':150,'岩角巨獸':150,'深淵領主':300,'裂隙蟲群':24};
const BUFF={'元素翼龍':t=>{const d=state.drakes[t];return d>=4?'翼龍之魂：全隊傷害 +25%、受傷 −6%':`翼龍 ${d} 層：全隊傷害 +${d*4}%`;},'深淵領主':()=>'領主之力 3 分鐘：普攻 +25%、技能 +12%、受傷 −12%、小兵強化','太古翼龍':()=>'太古之力 2.5 分鐘：低血斬殺、受傷 −10%','岩角巨獸':()=>'獲得巨獸衝鋒：下一波兵線撞塔','裂隙蟲群':()=>'拆塔傷害 +12%'};
const prevObj=bObjective;bObjective=function(o,dt,...rest){const s=state,n=s?.history?.length||0;const r=prevObj.call(this,o,dt,...rest);
 if(s?.history)for(const e of s.history.slice(n)){if(e.kind!=='objective')continue;const extra=(GOLD[e.name]??100)-(e.name==='裂隙蟲群'?24:100);if(extra)for(const a of s.actors.filter(a=>a.team===e.team&&a.kind==='hero'))a.gold=(a.gold||0)+extra;
  const b=BUFF[e.name];if(b)try{log(`${e.team?'赤潮':'逐光'}・${b(e.team)}`);}catch{}
  const behind=s.gold[1-e.team]-s.gold[e.team];if(behind>=2500&&e.name!=='裂隙蟲群'){for(const a of s.actors.filter(a=>a.team===e.team&&a.kind==='hero'))a.gold=(a.gold||0)+150;s.gold[e.team]+=500;try{log(`追分獎金：${e.team?'赤潮':'逐光'}落後時拿下${e.name}，全隊額外 +150。`);}catch{}}}
 return r;};
// ---------- 記分板上的增益標籤 ----------
const mm=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
function tags(s,t){const out=[],d=s.drakes?.[t]||0;
 if(s.heroBuff?.[t]>s.time)out.push(`<b class="ob-baron">領主 ${mm(s.heroBuff[t]-s.time)}</b>`);
 if(s.elderUntil?.[t]>s.time)out.push(`<b class="ob-elder">太古 ${mm(s.elderUntil[t]-s.time)}</b>`);
 if(d)out.push(`<b class="ob-drake">${d>=4?'龍魂 ':'龍'}+${d>=4?25:d*4}%</b>`);
 if(s.grubTeam===t)out.push('<b class="ob-grub">蟲</b>');
 if(s.heraldCharge&&s.heraldTeam===t)out.push('<b class="ob-herald">巨獸</b>');
 return out.join('');}
let last=0;const prevDraw=draw;
draw=function(){const r=prevDraw.apply(this,arguments);const s=state,now=performance.now();if(!s||now-last<300)return r;last=now;
 for(const [t,sel] of [[0,'.cast-team.blue'],[1,'.cast-team.redteam']]){const box=document.querySelector(sel);if(!box)continue;const meta=box.querySelector(t?'#castRedMeta':'#castBlueMeta');let e=box.querySelector('.ob-tags');if(!e){e=document.createElement('span');e.className='ob-tags';}if(meta&&e.previousElementSibling!==meta)meta.after(e);const h=tags(s,t);if(e.dataset.h!==h){e.dataset.h=h;e.innerHTML=h;}}
 return r;};
// ---------- 家裡有危險時，不出「出門」類的關鍵時刻 ----------
// 1.03：至少有一路內塔被拆、對手才算打到「家門口」；範圍以我方高地塔為界，不再用固定 360
function baseDanger(s,t){const home=bBase(t),e=1-t,st=s.structures||[],inhib=st.some(u=>u.team===t&&u.kind==='inhibitor'&&u.hp<=0);
 const open=inhib||st.some(u=>u.team===t&&u.kind==='tower'&&u.lane>=0&&u.tier>=1&&u.hp<=0);if(!open)return false;
 const hg=st.filter(u=>u.team===t&&u.kind==='tower'&&u.tier===2),R=hg.length?Math.max(...hg.map(u=>Math.hypot(u.x-home.x,u.y-home.y)))+50:300;
 const wave=(s.minions||[]).filter(m=>m.team===e&&live(m)&&Math.hypot(m.x-home.x,m.y-home.y)<R).length,raid=s.actors.filter(a=>a.team===e&&a.kind==='hero'&&live(a)&&Math.hypot(a.x-home.x,a.y-home.y)<R).length;
 return raid>=2||wave>=5||inhib&&wave>=2||s.cores?.[t]&&s.cores[t].hp<s.cores[t].maxHp*.98&&raid>=1;}
const prevSD=showDecision;showDecision=function(type,...rest){const s=state;if(s&&type!=='surrender'&&type!=='lvl1'&&type!=='basedef'&&baseDanger(s,0)){s.next=Math.max(s.next||0,s.time+20);return;}return prevSD.call(this,type,...rest);};
// ---------- 1.01 守城的關鍵時刻：選項都是「在家被打時」合理的做法 ----------
function trackOrder(s,choice,secs){const pe=s.personal;s.momentTrack={type:'basedef',choice,until:s.time+secs,k:pe.kills,d:pe.deaths,a:pe.assists||0,tw:s.structures.filter(t=>t.team===1&&t.hp<=0).length,gk:s.kills[0],gd:s.kills[1]};}
function baseDefense(s){const home=bBase(0),us=s.actors.filter(a=>a.team===0&&a.kind==='hero'&&live(a)),them=s.actors.filter(a=>a.team===1&&a.kind==='hero'&&live(a));
 const raid=them.filter(a=>Math.hypot(a.x-home.x,a.y-home.y)<420),core=s.cores[0],D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const opts=[{name:'死守高地',desc:'全隊縮在高地塔與主堡附近，只在塔下接戰，等對手失誤或超級兵被清掉。',run:()=>{s.teamOrder={mode:'defend',point:core,until:s.time+30};s.policyFightSafe=s.time+30;trackOrder(s,'死守高地',25);}},
  {name:'正面迎戰',desc:'趁對手還在推塔，全隊一起衝上去打團；贏了就有機會反推。',run:()=>{s.teamOrder={mode:'defend',point:raid[0]||core,until:s.time+25};s.policyFightBoost=s.time+25;s.engageAll=s.time+12;trackOrder(s,'正面迎戰',22);}}];
 const big=[s.baron,s.dragon].find(o=>o?.alive&&!them.some(a=>D(a,o)<420));
 if(big&&raid.length>=2&&us.length>=3)opts.push({name:`派人偷${big.name}`,desc:`對手 ${raid.length} 人在我方高地，打野和中路繞去拿${big.name}，其他人拖住。成功就能反打，失敗家可能先破。`,run:()=>{s.stealOrder={obj:big,roles:[1,2],until:s.time+40};s.teamOrder={mode:'defend',point:core,until:s.time+40};s.policyFightSafe=s.time+40;trackOrder(s,`偷${big.name}`,35);}});
 const lone=them.filter(a=>D(a,home)>380&&them.every(b=>b===a||D(a,b)>450)).sort((a,b)=>D(a,home)-D(b,home))[0];
 if(lone&&us.length>=3){const roles=us.slice().sort((a,b)=>D(a,lone)-D(b,lone)).slice(0,3).map(a=>a.role);opts.push({name:`抓落單的${lone.heroName}`,desc:`${lone.heroName}一個人在外面分推，派三人去包夾，其他人守家。抓到就能少打一。`,run:()=>{s.huntOrder={target:lone,roles,until:s.time+25};s.teamOrder={mode:'defend',point:core,until:s.time+25};trackOrder(s,`抓${lone.heroName}`,22);}});}
 const down=s.structures.filter(u=>u.team===0&&u.kind==='inhibitor'&&u.hp<=0).length;
 if(s.eventCount>=10)s.eventCount=9;
 showDecision('basedef','基地告急！',`${down?`我方 ${down} 路兵營被破，`:''}對手 ${raid.length} 人在高地附近，我方存活 ${us.length} 人。經濟 ${((s.gold[0]-s.gold[1])/1000).toFixed(1)}k。`,[opts[0],...opts.slice(2),opts[1]].slice(0,3));}
const prevTick=tick;tick=function(dt){prevTick(dt);const s=state;if(!s||s.done||s.decision||s.paused||!s.structures)return;
 if(s.time>600&&s.time-(s.lastBaseDef??-999)>240&&(s.baseDefN||0)<3&&baseDanger(s,0)&&s.actors.filter(a=>a.team===0&&a.kind==='hero'&&live(a)).length>=2){s.lastBaseDef=s.time;s.baseDefN=(s.baseDefN||0)+1;try{baseDefense(s);}catch(e){console.warn(e);}}};
window.OBJ_BUFF={outMul,inMul,tags,baseDanger};
})();
