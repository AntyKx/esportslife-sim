'use strict';
// 0.53 青訓比賽也用完整的雙方 BP（和職業賽同一套 DRAFT 引擎，20 手，不含 Fearless）。
// 真實比賽流程：第一輪禁用（雙方各 3）→ 第一輪選角（藍1 紅2 藍2 紅1）→ 第二輪禁用（雙方各 2）→ 第二輪選角（紅1 藍2 紅1）。
// 玩家是選手不是教練：禁用階段可以向教練建議（採納機率看教練信任），輪到自己位置時親自選角，其他由教練與隊友決定。
(()=>{
const SCROLLED=new WeakSet(); // BP 只在剛進入時捲到頂端，之後重畫不再捲動
const ROLE=['上路','打野','中路','射手','輔助'];
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PHASE=i=>i<6?'第一輪禁用':i<12?'第一輪選角':i<16?'第二輪禁用':i<20?'第二輪選角':'完成';
// 20 手進度條（青訓與職業 BP 共用）
function track(d){return `<ol class="bp-track" aria-label="BP 進度">${DRAFT.ORDER.map(([s,t],i)=>{const done=i<d.step,cur=i===d.step,x=d.log.filter(l=>!l.note)[i];
 return `<li class="${s==='B'?'b':'r'} ${t} ${done?'done':''} ${cur?'cur':''}" title="第 ${i+1} 手 · ${s==='B'?'藍方':'紅方'}${t==='ban'?'禁用':'選角'}${x&&x.hero>=0?' · '+e(ROSTER[x.hero].name):''}"><span>${t==='ban'?'禁':'選'}</span></li>`;}).join('')}</ol>
 <p class="bp-phase">${PHASE(d.step)}${d.step<20?` · 第 ${d.step+1} / 20 手 · ${DRAFT.ORDER[d.step][0]==='B'?'藍方':'紅方'}${DRAFT.ORDER[d.step][1]==='ban'?'禁用':'選角'}`:''}</p>`;}

function sideOf(name,user,c){const R=Math.random;return {name,players:[0,1,2,3,4].map(r=>{
 if(user&&r===c.role)return {role:r,pool:GROWTH.pool(r),rating:GROWTH.rating(c),name:c.name};
 const pool=heroes.map((h,i)=>i).filter(i=>heroes[i].role===r).sort((a,b)=>(heroes[b].power+R()*.1)-(heroes[a].power+R()*.1)).slice(0,3);
 return {role:r,pool,rating:62+Math.round(R()*10),name:window.WORLD?.anyName?.()||''};})};}

let shown=0,tab=null,sel=null; // sel：已點選、還沒確認的英雄
function ensure(c,p){if(p.draft)return p.draft;const blueUs=c.results.length%2===0,us=sideOf('逐光青訓',true,c),them=sideOf(`${clubs[p.opponent]}青訓`,false,c);
 const d=blueUs?DRAFT.create(us,them):DRAFT.create(them,us);d.mine=blueUs?'B':'R';
 // 對手研究過你：第一手禁用一定是你熟練度最高的英雄（cPrepare 的 enemyBan）
 if(p.enemyBan!=null&&p.enemyBan>=0){d.force={[blueUs?'R':'B']:[p.enemyBan]};d.log.push({note:`對手研究過你的比賽，準備針對你的本命 ${ROSTER[p.enemyBan].name}`});}
 p.draft=d;shown=0;return d;}
function finish(c,p,d){const other=d.mine==='B'?'R':'B';p.allyPicks=[...d.picks[d.mine]];p.enemyPicks=[...d.picks[other]];p.playerHero=d.picks[d.mine][c.role];
 p.ourBan=d.bans[d.mine].find(i=>i>=0)??-1;if(!(p.enemyBan>=0))p.enemyBan=d.bans[other].find(i=>i>=0)??-1;}

function slots(d,s,label){const mine=s===d.mine;return `<div class="pro-side ${s==='B'?'blue':'red'} ${mine?'mine':''}"><h4>${e(label)}${mine?'（我方）':''}</h4>${DRAFT.banRow(d,s)}${[0,1,2,3,4].map(r=>`<div class="pro-slot ${mine&&r===CAREER.data.role?'you':''}"><small>${ROLE[r]}</small>${(()=>{const pl=d.sides?.[s]?.players?.[r];if(!pl)return '';const you=mine&&r===CAREER.data?.role;return `<span class="slot-pl${you?' you':''}">${e(you?(CAREER.data?.name||'你'):pl.name||'')}${you?'（你）':''}${pl.rating?` · ${Math.round(pl.rating)}`:''}</span>`;})()}${DRAFT.face(d.picks[s][r],'pick')}<b>${d.picks[s][r]!=null?e(ROSTER[d.picks[s][r]].name):'…'}</b></div>`).join('')}<div class="pro-notes">${DRAFT.compNotes(d.picks[s]).map(([k,t])=>`<span class="${k}">${t}</span>`).join('')}</div></div>`;}
function heroBtn(i,d,attr){const h=ROSTER[i],tags=DRAFT.TAGS[i].tags.map(t=>DRAFT.TAG_NAME[t]).join('・'),theirs=d.picks[d.mine==='B'?'R':'B'],lane=theirs[h.role];let hint='';
 if(lane!=null){const m=DRAFT.matchup(i,lane);hint=m>0?`<em class="good">克制 ${e(ROSTER[lane].name)}</em>`:m<0?`<em class="bad">被 ${e(ROSTER[lane].name)} 克制</em>`:'';}
 const st=window.META?META.strength(heroes[i]):heroes[i].power;
 return `<button class="pro-hero ${i===sel?'picked':''}" ${attr}="${i}" aria-pressed="${i===sel}"><strong title="${e(h.name)}">${e(h.name)}</strong><small class="ph-stat">熟練 ${Math.round(heroes[i].mastery)} · 強度 ${Math.round(st*100)}%</small><small class="ph-tags">${tags}</small>${hint}${DRAFT.foeNote(d,d.mine,i)}</button>`;}

const lockBar=kind=>`<div class="bp-lock">${sel==null?`<span>先點一隻英雄${kind==='pick'?'':'（建議禁用）'}</span>`:`<span>已選：<b>${e(ROSTER[sel].name)}</b></span>`}<button class="primary" id="bpLock" ${sel==null?'disabled':''}>${kind==='pick'?'鎖定英雄':'確認建議禁用'}</button></div>`;
function draw(){const c=CAREER.data,p=c?.pending;if(!p)return;const d=ensure(c,p),need=d.step<20?DRAFT.run(d,{side:d.mine,role:c.role,trust:c.trust??50}):null;if(d.step>=20)finish(c,p,d);CAREER.save();
 const box=document.querySelector('#draft'),keepGrid=box.querySelector('.pro-grid')?.scrollTop||0,keepKey=box.dataset.gridKey,keepY=scrollY;document.querySelector('#setup').hidden=true;document.querySelector('#match').hidden=true;box.hidden=false;
 const other=d.mine==='B'?'R':'B',bn=d.sides.B.name,rn=d.sides.R.name;let center='';
 if(need?.need==='suggest'){const r=tab??c.role,pool=DRAFT.available(d,r);
  center=`<h3>我方第 ${DRAFT.ORDER.slice(0,d.step+1).filter(([s,t])=>s===d.mine&&t==='ban').length} / 5 手禁用：向教練建議</h3><p class="muted">由教練決定禁用。你可以提出建議，採納機率看教練信任（目前 ${c.trust??50}）。對手的熱門英雄、或克制你的英雄都是好目標。</p>
  <div class="pro-roles">${ROLE.map((n,i)=>`<button class="quiet ${i===r?'selected':''}" data-bprole="${i}">${n}</button>`).join('')}</div>
  <div class="pro-grid"><div class="pro-grid-in">${pool.sort((a,b)=>(META?.strength?.(heroes[b])||1)-(META?.strength?.(heroes[a])||1)).map(i=>heroBtn(i,d,'data-ban')).join('')}</div></div>${lockBar('ban')}<button class="quiet" id="bpSkip">這一手交給教練</button><button class="quiet" id="bpSkipAll">本場都交給教練</button>`;}
 else if(need?.need==='pick'){center=`<h3>輪到你選 ${ROLE[c.role]}</h3><p class="muted">綠色＝克制對面同位置，紅色＝被克制，橘色＝對面選手的招牌或熟練英雄。熟練度越高、版本越強越好發揮。</p><div class="pro-grid"><div class="pro-grid-in">${DRAFT.available(d,c.role).sort((a,b)=>heroes[b].mastery-heroes[a].mastery).map(i=>heroBtn(i,d,'data-pick')).join('')}</div></div>${lockBar('pick')}`;}
 else{const ev=DRAFT.evaluate(d.picks[d.mine],d.picks[other]);center=`<h3>BP 完成</h3><p>陣容評估：${ev.team>.15?`<b class="good">我方占優（+${Math.round(ev.team*10)}%）</b>`:ev.team<-.15?`<b class="bad">對手占優（${Math.round(ev.team*10)}%）</b>`:'雙方接近'} · 你的對線：${ev.lanes[c.role]>0?'<b class="good">有利</b>':ev.lanes[c.role]<0?'<b class="bad">不利</b>':'均勢'}</p><button id="lockDraft" class="primary">鎖定陣容，進入比賽 →</button>`;}
 const log=d.log.slice(),fresh=log.length-shown;shown=log.length;
 box.innerHTML=`<p class="eyebrow">${c.results.length===6?'決賽':'青訓聯賽'} / 逐光 vs ${e(clubs[p.opponent])} · ${d.mine==='B'?'我方藍方（先選）':'我方紅方（後選，最後一手）'}</p><h1>BP <span>雙方輪流禁用與選角，共 20 手</span></h1>
 ${c.resumeNotice?`<p class="note">${e(c.resumeNotice)}</p>`:''}${track(d)}
 <div class="pro-board">${slots(d,'B',`藍方 ${bn}`)}<div class="pro-center">${center}<ul class="pro-log">${log.slice(-8).reverse().map((x,k)=>`<li class="${k<fresh?'fresh':''}" style="${k<fresh?`animation-delay:${(fresh-1-k)*.18}s`:''}">${x.note?e(x.note):`${x.side==='B'?'藍':'紅'}方${x.type==='ban'?'禁用':'選擇'} ${x.hero>=0?e(ROSTER[x.hero].name):'—'}`}</li>`).join('')}</ul></div>${slots(d,'R',`紅方 ${rn}`)}</div>
 <button id="draftBack" class="quiet">返回基地（保留 BP 進度）</button>`;
 box.querySelectorAll('[data-bprole]').forEach(b=>b.onclick=()=>{tab=+b.dataset.bprole;draw();});
 box.querySelectorAll('[data-ban],[data-pick]').forEach(b=>b.onclick=()=>{sel=+(b.dataset.ban??b.dataset.pick);box.querySelectorAll('.pro-hero.picked').forEach(x=>{x.classList.remove('picked');x.setAttribute('aria-pressed','false');});b.classList.add('picked');b.setAttribute('aria-pressed','true');const lk=box.querySelector('.bp-lock');if(lk){const t=lk.querySelector('span');if(t)t.innerHTML=`已選：<b>${e(ROSTER[sel].name)}</b>`;const bl=lk.querySelector('#bpLock');if(bl)bl.disabled=false;}});
 box.querySelector('#bpLock')?.addEventListener('click',()=>{const i=sel;if(i==null)return;sel=null;if(need?.need==='pick'){DRAFT.apply(d,i);draw();return;}d.suggest[DRAFT.suggestKey(d.step)]=i;d.log.push({note:`你建議禁用 ${ROSTER[i].name}`});tab=null;draw();});
 box.querySelector('#bpSkip')?.addEventListener('click',()=>{sel=null;d.suggest[DRAFT.suggestKey(d.step)]=-1;tab=null;draw();});
 box.querySelector('#bpSkipAll')?.addEventListener('click',()=>{sel=null;d.suggestOff=true;tab=null;draw();});
 box.querySelector('#lockDraft')?.addEventListener('click',()=>cLaunch());
 box.querySelector('#draftBack').onclick=()=>{box.hidden=true;c.stage='camp';CAREER.save();document.querySelector('#setup').hidden=false;renderSetup();const st=document.querySelector('#start');if(st){st.disabled=false;st.textContent='返回本場 BP →';st.onclick=()=>{c.stage='bp';CAREER.save();draw();};}};
 const gk=d.step+'|'+(tab??'')+'|'+(need?.need||'');box.dataset.gridKey=gk;const g=box.querySelector('.pro-grid');if(g&&keepKey===gk)g.scrollTop=keepGrid;if(!SCROLLED.has(d)){SCROLLED.add(d);window.scrollTo(0,0);}else if(Math.abs(scrollY-keepY)>2)window.scrollTo(0,keepY);window.dispatchEvent(new CustomEvent('bp-drawn'));}
// 測試與快速模擬用：建議全部跳過、自己選熟練最高的英雄
function autoplay(){const c=CAREER.data,p=c?.pending;if(!p)return;const d=ensure(c,p);for(let k=0;k<40&&d.step<20;k++){const n=DRAFT.run(d,{side:d.mine,role:c.role,trust:c.trust??50});if(!n)break;if(n.need==='suggest')d.suggest[DRAFT.suggestKey(d.step)]=-1;else DRAFT.apply(d,DRAFT.available(d,c.role).sort((a,b)=>heroes[b].mastery-heroes[a].mastery)[0]);}draw();}
cDraft=draw;
if(CAREER.data?.stage==='bp'&&CAREER.data.pending&&!document.querySelector('#draft').hidden)draw();
window.ACADEMY_BP={draw,autoplay,track};
})();
