'use strict';
// 0.88 平凡人生結局：不是每個人都能走上職業舞台。
// 天梯：第 3 季（18 歲）結束還沒通過試訓、或家人支持／課業歸零（ladder.js endRound 呼叫 ENDING.end）。
// 青訓：賽段結束時沒進決賽、教練信任也不到門檻 → 沒升上一軍（這裡在 renderSetup 前檢查）。
// 結局寫進 c.ending、c.stage='ended'；畫面只有結局卡與「重新開始人生」。
(()=>{
const PROMO_AVG=7.5; // 青訓沒進決賽時，平均位置評價要到這個值才會升一軍（依評價公式推估：正常發揮約 7～8；依實玩回饋再調）
const avgRating=c=>{const rs=(c.results||[]).map(x=>x.rating).filter(x=>x!=null);return rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:0;};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE=['上路','打野','中路','射手','輔助'];
function ladderStats(c){const l=c.ladder||window.LADDER?.data||{},T=window.LADDER?.TIERS||[],peak=Math.max(l.tier??0,l.peak??0);
 return {l,peakName:T[peak]||'—',peak,games:l.games||0,wr:l.games?Math.round(l.wins/l.games*100):0};}
function build(c,kind){const r=ROLE[c.role]||'',n=c.name||'你';
 if(kind==='family'){const {l,peakName}=ladderStats(c),school=(l.school??50)<=(l.family??50);
  return {path:'夢想暫停',title:'先把書讀完',text:school?`成績單寄到家裡的那天，${n} 的電腦被搬進了爸媽的房間。「先把書讀完，之後你想怎麼打都行。」${n} 沒有反駁。帳號停在 ${peakName}，好友名單裡的人偶爾會問：那個${r}怎麼不上線了？`:`家裡的氣氛越來越僵，終於有一天，爸媽坐下來跟 ${n} 談了一整晚。${n} 答應先把重心放回生活。帳號停在 ${peakName}，鍵盤收進了櫃子，但每年世界大賽，${n} 還是會熬夜看完每一場。`,
   stats:[['最高段位',peakName],['排位',`${ladderStats(c).games} 場`],['勝率',`${ladderStats(c).wr}%`]]};}
 if(kind==='ladder'){const {l,peakName,games,wr}=ladderStats(c),fans=c.fans||0;
  const [path,title,text]=fans>=250?['實況主之路','直播間的燈還亮著',`18 歲的夏天，${n} 沒有等到職業隊的電話。但直播間每晚都有幾百個人在等開台，聊天室刷著「${r}教學什麼時候開」。${n} 沒有站上職業舞台，卻找到了一群陪自己打遊戲的人。`]
   :(l.school??0)>=60?['回到課本','宿舍裡的高手',`${n} 把滑鼠收進抽屜，考上了大學。偶爾在宿舍跟室友打幾場排位，大家都說：「你以前是不是有在打比賽？」${n} 笑著說：「差一點。」`]
   :['網咖的傳說','櫃台後面的那個人',`${n} 在常去的那間網咖打工。常客都知道，櫃台那個店員排位打到過 ${peakName}，有人卡關就會來請教，大家都叫 ${n}「師父」。夢想沒有實現，但 ${n} 還在這個圈子裡。`];
  return {path,title,text,stats:[['最高段位',peakName],['排位',`${games} 場`],['勝率',`${wr}%`],['粉絲',fans]]};}
 // academy
 const rs=(c.results||[]).map(x=>x.rating).filter(x=>x!=null),avg=rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length):0,trust=c.trust??50;
 const [path,title,text]=avg>=6.5?['轉當陪練','名單上沒有你的名字',`青訓賽段結束，一軍名單貼出來，上面沒有 ${n}。教練說：「你很努力，只是現在的位置不多。」${n} 留在隊上當陪練，每天陪一軍的${r}對線。也許哪天，會有人看見。`]
  :['離開青訓','背包裡的隊服',`賽段結束後，教練把 ${n} 叫進辦公室，談話不到十分鐘。${n} 把隊服摺好放進背包，坐上回家的車。手機裡還留著隊伍群組，偶爾會跳出一軍的比賽通知。`];
 return {path,title,text,stats:[['青訓出賽',`${rs.length} 場`],['平均評價',avg?avg.toFixed(1):'—'],['教練信任',trust],['聯賽成績',c.champion?'冠軍':c.finalist?'決賽':'未進決賽']]};}
function end(c,kind){if(!c||c.stage==='ended')return;const b=build(c,kind);c.ending={kind,age:c.age,...b};c.stage='ended';c.pending=null;(c.storyLog||=[]).push(`${c.age} 歲：${b.path}。`);CAREER.save();try{renderSetup();}catch(err){console.warn(err);}window.scrollTo(0,0);}
function render(c){const hub=document.querySelector('#careerHub'),en=c.ending;if(!hub||!en)return;
 ['#weeklyTraining','#draft','#match','#result'].forEach(s=>{const x=document.querySelector(s);if(x)x.hidden=true;});const st=document.querySelector('#start');if(st)st.hidden=true;document.querySelector('#setup')&&(document.querySelector('#setup').hidden=false);
 const html=`<div class="careerhead"><div><p class="eyebrow">生涯結局 / ${en.age} 歲 · 平凡人生</p><h2>${e(en.title)}</h2></div></div>
 <div class="careergrid"><article class="panel ending-card"><p class="ending-path">${e(en.path)}</p><p>${e(en.text)}</p><div class="ending-stats">${en.stats.map(([k,v])=>`<span>${e(k)}<b>${e(v)}</b></span>`).join('')}</div>
 <p class="muted">不是每個人都能站上職業舞台，這也是一段人生。換個位置、換種練法，再來一次吧。</p><button class="primary" id="endingRestart">重新開始人生 →</button></article>
 <article class="panel"><h3>這段路</h3><ul class="pro-history">${(c.storyLog||[]).slice(-8).map(x=>`<li><span>${e(x)}</span></li>`).join('')}</ul></article></div>`;
 if(hub.dataset.endH!==html||!hub.querySelector('.ending-card')){hub.dataset.endH=html;hub.innerHTML=html;hub.querySelector('#endingRestart').onclick=()=>{try{localStorage.removeItem('nexus-life-career-v1');}catch{}location.reload();};}
 const put=(id,v)=>{const x=document.getElementById(id);if(x&&x.textContent!==v)x.textContent=v;};put('lifePhase','結局');put('lifeSeason',`${en.age} 歲 · ${en.path}`);}
const prev=renderSetup;renderSetup=function(){const c=CAREER.data;
 // 青訓升一軍門檻：賽段結束時檢查一次
 if(c&&c.stage==='complete'&&!c.promoChecked&&!c.pro){c.promoChecked=true;const avg=avgRating(c);if(!(c.champion||c.finalist||avg>=PROMO_AVG)){end(c,'academy');return;}c.storyLog?.push?.(c.champion||c.finalist?'青訓賽段打進決賽，教練把你寫進一軍名單。':`青訓平均評價 ${avg.toFixed(1)}，雖然沒進決賽，教練還是把你寫進一軍名單。`);CAREER.save();}
 const r=prev.apply(this,arguments);
 const d=CAREER.data;document.body.classList.toggle('life-ended',d?.stage==='ended');if(d?.stage==='ended')render(d);return r;};
setInterval(()=>{const d=CAREER.data;if(d?.stage!=='ended')return;const hub=document.querySelector('#careerHub');if(hub&&!hub.querySelector('.ending-card'))render(d);const put=(id,v)=>{const x=document.getElementById(id);if(x&&x.textContent!==v)x.textContent=v;};const en=d.ending||{};put('lifePhase','結局');put('lifeMeta',`${en.kind==='academy'?'逐光青訓':'天梯玩家'} · ${ROLE[d.role]||''} · ${en.age??d.age} 歲`);put('lifeSeason',`${en.age??d.age} 歲 · ${en.path||''}`);document.querySelectorAll('dialog.talent-event[open]').forEach(x=>x.close());},150);
window.ENDING={end,PROMO_AVG,build};
})();
