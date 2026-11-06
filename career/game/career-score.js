'use strict';
// 0.89 生涯分（參考足球人生）：整段人生一個分數，決定最後的評價等級。
// 生涯分 = 天梯最高段位 + 青訓表現 + Σ 職業各季（評分 − 5.8）× 出賽局數 × 0.6 × 賽區權重 + 榮譽 × 3 + 人氣
// 等級：傳奇／名人堂／明星選手／職業選手／職業過客；沒打上職業的是「平凡人生」。
// 門檻是依公式推估的暫定值，之後用雲端模擬校準（像足球的 p98／p90／p65／p25）。只讀資料，不改遊戲狀態。
(()=>{
const LADDER_PTS=[0,2,4,7,10,14,18,24,30,40];
const REG_W={SCL:1.25,DRL:1.2,EUL:1,NSL:.95,PRL:.9,SXL:.8};
const BASE=5.8,K=.6,HONOR_X=3;
const TIERS=[
 {n:'傳奇',min:1500,col:'#ffd36b',desc:(r,rg)=>`${rg}歷史上最偉大的${r}`},
 {n:'名人堂',min:900,col:'#f0b85a',desc:(r,rg)=>`${rg}名人堂${r}`},
 {n:'明星選手',min:500,col:'#8fd3ff',desc:(r,rg)=>`${rg}的明星${r}`},
 {n:'職業選手',min:200,col:'#9fe0b8',desc:r=>`穩定的職業${r}`},
 {n:'職業過客',min:0,col:'#c9c2d8',desc:()=>'職業舞台上的過客'}];
const ORDINARY={n:'平凡人生',min:0,col:'#b9c8ff',desc:()=>'沒有站上職業舞台的玩家'};
const ROLE=['上路','打野','中路','射手','輔助'];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const W=()=>window.WORLD;
function regionOf(tag){try{return W()?.team(tag)?.region||null;}catch{return null;}}
// 職業比賽評分紀錄：pro.js 每打完一場（或快轉一個系列賽）呼叫
function rec(p,perf,games){if(!p||!(games>0))return;const s=(p.seasons||={}),r=(s[p.year]||={g:0,s:0,team:p.team});r.g+=games;r.s+=perf*games;r.team=p.team;}
function calc(c){c=c||CAREER.data;const out={ladder:0,academy:0,pro:0,honor:0,fans:0};if(!c)return {sc:0,parts:out};
 const l=c.ladder||window.LADDER?.data||{},peak=Math.max(l.tier??0,l.peak??0);out.ladder=LADDER_PTS[Math.min(LADDER_PTS.length-1,Math.max(0,peak))]||0;
 const rs=(c.results||[]).map(x=>x.rating).filter(x=>x!=null);out.academy=Math.max(0,rs.reduce((a,r)=>a+Math.max(-1.5,r-6)*4,0))+(c.champion?30:c.finalist?15:0);
 const p=c.pro;let seasons=[];
 if(p){let g=0;for(const [y,r] of Object.entries(p.seasons||{})){if(!r.g)continue;const avg=r.s/r.g,w=REG_W[regionOf(r.team)]??1,pts=Math.max(0,r.g*(avg-BASE)*K*w);g+=r.g;out.pro+=pts;seasons.push({year:+y,g:r.g,avg,pts,team:r.team});}
  const miss=Math.max(0,(p.games||0)-g);out.pro+=miss*.42; // 舊存檔沒有逐季評分：用平均表現估
  out.honor=(p.achievements||[]).reduce((a,x)=>a+(x.pts||0),0)*HONOR_X;}
 out.fans=Math.min(150,(c.fans||0)/40);
 for(const k in out)out[k]=Math.round(out[k]);
 const sc=Object.values(out).reduce((a,b)=>a+b,0);return {sc,parts:out,seasons,pro:!!p};}
function tierInfo(c,sc){c=c||CAREER.data;sc=sc??calc(c).sc;if(!c?.pro)return {...ORDINARY,i:TIERS.length,next:TIERS[TIERS.length-1],gap:0,ordinary:true};
 const i=TIERS.findIndex(t=>sc>=t.min),t=TIERS[i<0?TIERS.length-1:i],ii=i<0?TIERS.length-1:i,nx=ii>0?TIERS[ii-1]:null;
 return {...t,i:ii,next:nx,gap:nx?nx.min-sc:0,pct:nx?Math.max(0,Math.min(1,(sc-t.min)/(nx.min-t.min))):1};}
const tierName=v=>(TIERS.find(t=>v>=t.min)||TIERS.at(-1)).n;
// 職業退役：分享卡與結局頁用的資料
function mainRegion(c){const p=c.pro;if(!p)return null;const m={};for(const r of Object.values(p.seasons||{})){const rg=regionOf(r.team);if(rg)m[rg]=(m[rg]||0)+r.g;}const k=Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||regionOf(p.team);return k;}
const AFTER={'轉任教練':n=>`退役後，${n} 把多年的比賽經驗帶進教練席，開始培養下一代選手。`,'成為賽評':n=>`後來 ${n} 坐上賽評席，用最懂選手的角度解說每一波團戰。`,'全職實況主':n=>`退役後 ${n} 開始全職直播，當年一路支持的粉絲，現在每天都來聊天室報到。`,'離開職業舞台':n=>`那年夏天沒有隊伍提出合約，${n} 的職業生涯在這裡畫下句點。`,'回歸生活':n=>`${n} 離開了舞台，帶著這段回憶開始新的人生。`};
function proEnding(c){c=c||CAREER.data;const p=c?.pro,en=p?.ended;if(!en)return null;const {sc}=calc(c),t=tierInfo(c,sc),r=ROLE[c.role]||'',rg=mainRegion(c),rgn=W()?.REGION?.[rg]?.name||'',n=c.name||'你';
 const ach=p.achievements||[],cups=ach.filter(a=>/冠軍$/.test(a.title)),worlds=cups.filter(a=>/世界大賽/.test(a.title)).length,years=Math.max(1,p.year-2026),teams=(p.teamsPlayed||[p.team]).length;
 const hon=worlds?`拿下 ${worlds} 座霧河世界大賽冠軍${cups.length>worlds?`、生涯 ${cups.length} 座冠軍`:''}`:cups.length?`生涯 ${cups.length} 座冠軍`:'沒有拿過冠軍，但每一場都算數';
 const text=`${en.age} 歲，${n} 宣布退役。${years} 個賽季、${p.games||0} 局職業比賽，${hon}。${AFTER[en.path]?AFTER[en.path](n):(en.text||'').replace(/你/g,n)}`;
 const tn=tag=>W()?.team(tag)?.name||tag;
 return {kind:'pro',path:en.path,title:t.n,sub:t.desc(r,rgn),text,age:en.age,score:sc,tier:t.n,
  stats:[['生涯分',sc],['職業出賽',`${p.games||0} 局`],[worlds?'世界冠軍':'冠軍',worlds||cups.length],[teams>1?'效力隊伍':'效力',teams>1?`${teams} 隊`:tn(p.team)]]};}
// ---------- 評價揭曉：生涯分往上跑、等級梯一格一格亮起、最後蓋章 ----------
const played=new Set();
function revealHTML(c){const {sc,parts}=calc(c),t=tierInfo(c,sc),rows=t.ordinary?[...TIERS,ORDINARY]:TIERS,lo=rows.map(x=>x.min);
 const PN={ladder:'天梯',academy:'青訓',pro:'職業出賽',honor:'榮譽',fans:'人氣'};
 return `<div class="cs-reveal" data-sc="${sc}" data-ti="${t.i}" data-ord="${t.ordinary?1:0}"><div class="cs-l">生涯分</div><div class="cs-n">0</div>
 <div class="cs-lad">${rows.map((x,i)=>`<div class="cs-r${x===ORDINARY?' ord':''}" data-i="${i}"><b>${x.n}</b><i><em></em></i><span>${x===ORDINARY?'—':x.min||'—'}</span></div>`).join('')}</div>
 <div class="cs-res"></div><div class="cs-parts">${Object.entries(parts).filter(([,v])=>v).map(([k,v])=>`<span>${PN[k]}<b>${v}</b></span>`).join('')}</div></div>`;}
function play(el,c){if(!el||el.dataset.done)return;el.dataset.done=1;const sc=+el.dataset.sc,t=tierInfo(c,sc),rows=[...el.querySelectorAll('.cs-r')],num=el.querySelector('.cs-n'),res=el.querySelector('.cs-res');
 const mins=TIERS.map(x=>x.min);
 const paint=v=>{num.textContent=v;rows.forEach((r,i)=>{if(r.classList.contains('ord'))return;const lo=mins[i],hi=i?mins[i-1]:Infinity,f=hi===Infinity?(v>=lo?1:0):Math.max(0,Math.min(1,(v-lo)/(hi-lo)));r.querySelector('em').style.width=f*100+'%';r.classList.toggle('lit',!t.ordinary&&v>=lo);});};
 const fin=()=>{paint(sc);rows[t.i]?.classList.add('me','lit');
  res.innerHTML=`<div class="cs-stamp" style="--c:${t.col}">${e(t.n)}</div>`+(t.ordinary?`<div class="cs-gap">沒有站上職業舞台。打上職業，生涯分才會開始累積比賽與榮譽。</div>`:t.next?`<div class="cs-gap">距離 <b>${e(t.next.n)}</b> ${t.pct>=.85?'只差':'還差'} <b>${t.gap} 分</b><div class="cs-bar"><i style="width:${Math.round(t.pct*100)}%"></i></div></div>`:'<div class="cs-gap">這是生涯評價的最高一級。</div>');};
 const key=(c?.id||'')+':'+sc;if(played.has(key)||matchMedia('(prefers-reduced-motion: reduce)').matches){fin();return;}played.add(key);
 const t0=performance.now(),dur=Math.min(3200,900+sc*1.6);const f=now=>{if(!el.isConnected)return;const q=Math.min(1,(now-t0)/dur);paint(Math.round(sc*(1-Math.pow(1-q,2.6))));if(q<1)requestAnimationFrame(f);else setTimeout(fin,300);};requestAnimationFrame(f);
 el.onclick=()=>{played.add(key);fin();};}
// 放進結局卡（平凡人生 .ending-card、職業退役 .pro-ending）
setInterval(()=>{const c=CAREER?.data;if(!c)return;const card=document.querySelector('.ending-card');if(!card)return;let el=card.querySelector('.cs-reveal');
 if(!el){const anchor=card.querySelector('.ending-stats,.pro-ending-stats');if(!anchor)return;anchor.insertAdjacentHTML('afterend',revealHTML(c));el=card.querySelector('.cs-reveal');}
 play(el,c);},250);
window.SCORE={calc,tierInfo,tierName,rec,proEnding,revealHTML,TIERS,ORDINARY};
})();
