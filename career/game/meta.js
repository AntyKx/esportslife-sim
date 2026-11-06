'use strict';
// 0.48 版本循環與英雄榜
// 規則：
//  ・改動不預告。只顯示「已上線」的版本，下一次何時更新、改什麼都不公開。
//  ・建立生涯前：版本跟著真實日期走（所有玩家同一天看到同一版），每 3～6 天換一版。
//  ・生涯中：版本跟著遊戲週數走，每 3～6 週一次常規更新。
//  ・一般更新 4～7 位英雄；15% 機率是大型改版（8～12 位英雄＋一種風格整體調整）。
//  ・強的容易被削、弱的容易被加強（越偏離平衡越容易被改），單次 3～8%，總強度限制在 0.85～1.15。
//  ・熱修：更新後下一週，若有英雄強度 ≥ 1.12，有 60% 機率緊急削弱。
//  ・英雄榜（勝率／選用率／禁用率／階級）由目前強度推算，加上每日（生涯中為每週）浮動，所以每天看到的都不一樣。
(()=>{
const ROLE=['上路','打野','中路','射手','輔助'];
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
function rng(seed){let a=seed;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const EPOCH=Date.UTC(2026,10,1);
const today=()=>{const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-EPOCH)/864e5);};
const dayLabel=n=>{const d=new Date(EPOCH+n*864e5);return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;};
// 改動類型都會真的反映在比賽裡：0 傷害＝heroes[].power（技能、普攻、治療、護盾倍率）；1 冷卻＝heroes[].cdMul（kits.js 施放後的冷卻）；2 坦度＝heroes[].hpMul（受到傷害除以此值）
const BUFF=['技能與普攻傷害提高','技能冷卻縮短','生命與坦度提高'];
const NERF=['技能與普攻傷害降低','技能冷卻延長','生命與坦度降低'];
const clamp=v=>Math.max(.85,Math.min(1.15,v));
heroes.forEach(h=>{if(h.hpMul==null)h.hpMul=1;if(h.cdMul==null)h.cdMul=1;});
// 綜合強度：英雄榜、BP、改版方向都看這個
const strength=h=>h.power*Math.sqrt(h.hpMul||1)/Math.sqrt(h.cdMul||1);
function tweak(h,type,up,mag){const before=strength(h);if(type===1)h.cdMul=clamp((h.cdMul||1)*(up?1-mag:1+mag));else if(type===2)h.hpMul=clamp((h.hpMul||1)*(up?1+mag:1-mag));else h.power=clamp(h.power+(up?mag:-mag));return strength(h)-before;}

// ---------- 產生一次更新（只改 heroes[].power，回傳改動內容） ----------
function gen(R,kind){const n=kind==='major'?8+Math.floor(R()*5):4+Math.floor(R()*4);
 const w=heroes.map((h,i)=>({i,w:Math.abs(strength(h)-1)*8+.3+R()})).sort((a,b)=>b.w-a.w).slice(0,n);
 // 筆記格式 [英雄, 帶正負號的幅度(正＝加強), 類型]
 const notes=w.map(({i})=>{const h=heroes[i],st=strength(h),up=st>1.04?R()<.2:st<.96?R()<.8:R()<.5,mag=.03+Math.round(R()*5)/100,type=Math.floor(R()*3),moved=tweak(h,type,up,mag);return [i,Math.abs(moved)<1e-4?0:(up?mag:-mag),type];}).filter(n=>n[1]);
 let style=null;if(kind==='major'){const tags=Object.keys(DRAFT.TAG_NAME),tag=tags[Math.floor(R()*tags.length)],d=R()<.5?.03:-.03;style=[tag,d];DRAFT.TAGS.forEach((t,i)=>{if(t.tags.includes(tag))heroes[i].power=clamp(heroes[i].power+d);});}
 return {kind,notes,style};}
function hotfix(R){const top=heroes.map((h,i)=>[i,strength(h)]).filter(x=>x[1]>=1.12).sort((a,b)=>b[1]-a[1]).slice(0,2);if(!top.length)return null;
 return {kind:'hotfix',notes:top.map(([i])=>{const mag=.04+Math.round(R())/100;tweak(heroes[i],0,false,mag);return [i,-mag,0];}),style:null};}
function setNotes(p){patchNotes=p.notes.map(([i,d])=>({h:heroes[i],delta:d}));}

// ---------- 建立生涯前：依真實日期重播版本 ----------
let world=null;
function worldPatch(){const day=today(),R=rng(hash('esports-world'));heroes.forEach(h=>{h.power=1;h.hpMul=1;h.cdMul=1;});let v=1,at=0,last={...gen(R,'major'),kind:'major',at:0,v:1},next=3+Math.floor(R()*4),hot=false;
 // 第 0 天＝賽季開始的大型改版，之後依序重播
 for(let d=1;d<=day;d++){
  if(hot&&d===at+1){hot=false;if(heroes.some(h=>strength(h)>=1.12)&&R()<.6){const p=hotfix(R);if(p){v++;last={...p,at:d,v};}}}
  if(d>=next){const p=gen(R,R()<.15?'major':'normal');v++;at=d;last={...p,at:d,v};hot=true;next=d+3+Math.floor(R()*4);}}
 version=v;setNotes(last);world={last,day};}

// ---------- 生涯中：每週檢查 ----------
function ensure(c){if(!c)return null;if(!c.meta){const R=rng(hash(c.id+'m'));c.meta={next:(c.clock||0)+3+Math.floor(R()*4),hist:[world?{v:version,kind:world.last.kind,notes:world.last.notes,style:world.last.style,week:null,day:world.last.at}:{v:version,kind:'normal',notes:patchNotes.map(n=>[heroes.indexOf(n.h),n.delta,0]),style:null,week:null}],seen:version};}return c.meta;}
function release(c,kind){const m=ensure(c),R=rng(hash(c.id+':'+version+':'+c.clock));const p=kind==='hotfix'?hotfix(R):gen(R,kind||(R()<.15?'major':'normal'));if(!p)return null;
 version++;const rec={v:version,kind:p.kind,notes:p.notes,style:p.style,week:c.clock};m.hist.push(rec);if(m.hist.length>6)m.hist.shift();setNotes(p);
 const msg=`版本 1.${version}${p.kind==='major'?' 大型改版':p.kind==='hotfix'?' 緊急修正':''} 上線：${p.notes.length} 位英雄調整。`;c.ladder?.log?.push(msg);c.metaNews=version;return rec;}
function weekly(c){const m=ensure(c);if(!m)return;const last=m.hist.at(-1);
 if(last&&last.week!=null&&c.clock===last.week+1&&last.kind!=='hotfix'&&heroes.some(h=>strength(h)>=1.12)){const R=rng(hash(c.id+'hf'+c.clock));if(R()<.6){release(c,'hotfix');return;}}
 if(c.clock>=m.next){release(c);const R=rng(hash(c.id+'n'+c.clock));m.next=c.clock+3+Math.floor(R()*4);}}
// 舊的 patch()（例如青訓賽季中段更新）改走同一套規則
patch=function(){const c=CAREER.data;if(c)release(c);else{const R=rng(Date.now());const p=gen(R,'normal');version++;setNotes(p);}renderSetup();};

// ---------- 英雄榜 ----------
function seedKey(){const c=CAREER.data;return c?`${c.id}:${c.clock||0}`:`d${today()}`;}
function prevKey(){const c=CAREER.data;return c?`${c.id}:${(c.clock||0)-1}`:`d${today()-1}`;}
function stats(key){const out=[];heroes.forEach((h,i)=>{const pop=rng(hash('pop'+i))()*7,R=rng(hash(key+':'+i+':'+version)),
  wr=Math.max(44,Math.min(57,50+(strength(h)-1)*60+(pop-3.5)*.08+(R()-.5)*.7)),
  pick=Math.max(.4,1.5+pop+(wr-50)*1.3+(R()-.5)*1.2),ban=Math.max(0,Math.min(65,(wr-50.5)*5+pick*.9+(R()-.5)*2));
  out.push({i,role:h.role,wr,pick,ban,score:(wr-50)*2+pick*.18+ban*.06});});
 for(let r=0;r<5;r++){const L=out.filter(x=>x.role===r).sort((a,b)=>b.score-a.score);L.forEach((x,k)=>{x.rank=k+1;const q=k/L.length;x.tier=q<.07?'OP':q<.25?'1':q<.5?'2':q<.75?'3':q<.92?'4':'5';});}
 return out;}
let tab=null;
function tierHTML(){const cur=tab??role,now=stats(seedKey()),before=stats(prevKey()),c=CAREER.data;
 const rows=now.filter(x=>x.role===cur).sort((a,b)=>a.rank-b.rank),changed=new Map((lastPatch()?.notes||[]).map(n=>[n[0],n]));
 const mv=x=>{const b=before.find(y=>y.i===x.i);const d=b?b.rank-x.rank:0;return d>0?`<span class="tl-up">▲${d}</span>`:d<0?`<span class="tl-down">▼${-d}</span>`:'<span class="tl-same">—</span>';};
 const when=c?`遊戲第 ${(c.clock||0)+1} 週`:`${dayLabel(today())} 更新`;
 const news=c&&c.metaNews===version;
 return `<div class="row tl-head"><h2>英雄榜 <span class="tl-sub">版本 1.${version} · ${when}</span></h2><button type="button" id="patchOpen" class="quiet ${news?'new':''}">版本更新內容${news?' · 新':''}</button></div>
 <p class="muted">依全服排位統計，${c?'每週':'每天'}更新。點英雄可直接選用。</p>
 <div class="tl-tabs" role="tablist">${ROLE.map((n,r)=>`<button type="button" role="tab" data-tl="${r}" class="${r===cur?'sel':''}" aria-selected="${r===cur}">${n}</button>`).join('')}</div>
 <table class="tl-table"><thead><tr><th>#</th><th>英雄</th><th>階級</th><th>勝率</th><th>選用</th><th>禁用</th><th>變化</th></tr></thead><tbody>
 ${rows.map(x=>`<tr data-tlh="${x.i}" class="${x.i===selected?'mine':''}"><td>${x.rank}</td><td class="tl-name">${e(heroes[x.i].name)}${changed.has(x.i)?`<i class="tl-patch ${changed.get(x.i)[1]>0?'up':'down'}" title="本版本${changed.get(x.i)[1]>0?'加強':'削弱'}">${changed.get(x.i)[1]>0?'↑':'↓'}</i>`:''}<small>${e(heroes[x.i].style)} · 強度 ${Math.round(strength(heroes[x.i])*100)}%</small></td><td><b class="tl-tier t${x.tier}">${x.tier==='OP'?'OP':x.tier}</b></td><td>${x.wr.toFixed(1)}%</td><td>${x.pick.toFixed(1)}%</td><td>${x.ban.toFixed(1)}%</td><td>${mv(x)}</td></tr>`).join('')}
 </tbody></table>`;}
function lastPatch(){const c=CAREER.data,m=c?ensure(c):null;return m?m.hist.at(-1):world?{kind:world.last.kind,style:world.last.style,notes:world.last.notes,day:world.last.at}:null;}
function patchHTML(){const last=lastPatch();
 const kindName=k=>k==='major'?'大型改版':k==='hotfix'?'緊急修正':'常規更新';
 const when=last?(last.week!=null?`遊戲第 ${last.week+1} 週上線`:last.day!=null?`${dayLabel(last.day)} 上線`:''):'';
 const line=([i,d,why])=>`<div class="patchline"><span class="${d>=0?'up':'down'}">${d>=0?'↑':'↓'} ${e(heroes[i].name)}</span> · ${ROLE[heroes[i].role]}<br><span class="muted">${(d>=0?BUFF:NERF)[why]||(d>=0?BUFF:NERF)[0]} ${Math.round(Math.abs(d)*100)}% · 目前綜合強度 ${Math.round(strength(heroes[i])*100)}%</span></div>`;
 const all=(last?.notes||[]),notes=all.map(line).join('');
 const style=last?.style?`<div class="patchline"><span class="${last.style[1]>=0?'up':'down'}">${last.style[1]>=0?'↑':'↓'} 全體${e(DRAFT.TAG_NAME[last.style[0]])}型英雄</span><br><span class="muted">${last.style[1]>=0?'整體強度提高':'整體強度降低'} 3%</span></div>`:'';
 return `<p class="muted">${kindName(last?.kind)}${when?' · '+when:''}。下一次更新的時間與內容不會預告。</p>${style}${notes||'<p class="muted">這個版本沒有英雄改動。</p>'}`;}

// 版面：右欄最上面是英雄榜；版本更新收進按鈕，點開是對話框。
function patchDialog(){let d=document.querySelector('#patchDialog');if(!d){d=document.createElement('dialog');d.id='patchDialog';d.className='life-dialog';document.body.append(d);d.addEventListener('click',ev=>{if(ev.target===d||ev.target.closest('[data-close]'))d.close();});}
 d.innerHTML=`<div class="life-dialog-head"><h2>版本 1.${version} 更新內容</h2><button class="quiet" data-close>關閉</button></div>${patchHTML()}`;return d;}
function decorate(){const pb=document.querySelector('#patch');if(pb)pb.hidden=true;
 const box=document.querySelector('#patches'),panel=box?.closest('.panel');if(!panel)return;
 panel.classList.add('meta-panel');const head=panel.querySelector('.row');if(head)head.hidden=true;box.hidden=true;const desc=head?.nextElementSibling;if(desc?.matches('p.muted'))desc.hidden=true;
 let tl=document.querySelector('#tierList');if(!tl){tl=document.createElement('div');tl.id='tierList';panel.prepend(tl);}
 tl.innerHTML=tierHTML();bind(tl);
 // 英雄卡：強弱標籤改看綜合強度，並標出推薦召喚師技能
 document.querySelectorAll('#heroes [data-hero]').forEach(card=>{const i=+card.dataset.hero,h=heroes[i],st=strength(h),rate=card.querySelector('.rate');if(rate)rate.textContent=st>1.02?`↑ 強勢 ${Math.round(st*100)}%`:st<.98?`↓ 弱勢 ${Math.round(st*100)}%`:'穩定';
  if(window.MACRO?.recSpells){let r=card.querySelector('.rec-spells');if(!r){r=document.createElement('small');r.className='rec-spells';(card.querySelector('span:not(.avatar)')||card).append(r);}const [x,y,why]=MACRO.recSpells(i);r.textContent=`推薦技能：${MACRO.SPELLS[x].name}＋${MACRO.SPELLS[y].name}（${why}）`;}});}
function bind(tl){tl.querySelectorAll('[data-tl]').forEach(b=>b.onclick=()=>{tab=+b.dataset.tl;tl.innerHTML=tierHTML();bind(tl);});
 tl.querySelector('#patchOpen')?.addEventListener('click',()=>{const d=patchDialog();d.showModal?d.showModal():d.setAttribute('open','');const c=CAREER.data;if(c){c.metaNews=null;CAREER.save();}tl.querySelector('#patchOpen')?.classList.remove('new');});
 tl.querySelectorAll('[data-tlh]').forEach(r=>r.onclick=()=>{const i=+r.dataset.tlh,c=CAREER.data;if(c&&heroes[i].role!==c.role)return;if(!c){role=heroes[i].role;}selected=i;tab=null;renderSetup();});}

// 坦度改動：英雄受到的傷害除以 hpMul（不動 maxHp，避免和裝備、被動的生命計算互相覆蓋）
if(typeof bDamage==='function'){const bd=bDamage;bDamage=function(from,to,amount,...rest){if(to&&to.kind==='hero'&&heroes[to.heroIndex]?.hpMul)amount/=heroes[to.heroIndex].hpMul;return bd.call(this,from,to,amount,...rest);};}
if(!CAREER.data)worldPatch();
const prev=renderSetup;renderSetup=function(){const c=CAREER.data;if(c)ensure(c);const r=prev.apply(this,arguments);decorate();return r;};
window.META={strength,lastPatch,patchDialog,weekly,release,stats,worldPatch,ensure,today,get world(){return world;}};
renderSetup();
})();
