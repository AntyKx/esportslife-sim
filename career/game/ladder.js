'use strict';
// 0.43 天梯開局：15 歲普通玩家 → 衝段位、網咖盃 → 被發掘 → 試訓 → 青訓。段位與事件全部原創。
(()=>{
// 0.78 仿 LoL 段位：鏽鐵～鑽晶各分 IV～I 四小段（每段 100 點），大師以上不分段、只累積點數
const TIERS=['鏽鐵','赤銅','霜銀','耀金','晶鉑','翠曜','鑽晶','霧河大師','霧河宗師','巔峰王者'];
const APEX=7,DIV=['','I','II','III','IV'],PLACE_CAP=2;
const OLD_MAP=[0,1,2,3,5,6,7,8,9];
const MAX_ROUND=12,FINAL_SEASON=3,TUNE={tryBase:78,cupBase:68},ROLE=['上路','打野','中路','射手','輔助'];
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=()=>{const l=CAREER.data?.ladder;if(l&&!l.v2){l.v2=1;l.tier=OLD_MAP[l.tier]??0;if(l.tier<APEX){l.div=Math.max(1,4-Math.floor(l.lp/25));l.lp=Math.round(l.lp%25*4);}l.placed=1;}return l;};
const tierRating=(t,d=4,lp=0)=>t>=APEX?48+APEX*4+Math.min(8,lp/100):48+t*4+(4-d);
const CHANGE_UNTIL=8,SCOUT_MASTERY=75,SCOUT_TIER=6,LAST_TIER=4;
// 開局英雄池：本命＋備用。天梯開局較生疏（本命 28、備用 15），青訓開局等於已練過一段時間。
function second(c){const s=window.SECOND_HERO;return Number.isInteger(s)&&heroes[s]?.role===c.role&&s!==selected?s:GROWTH.pool(c.role).find(i=>i!==selected);}
function startPool(c,ladder){const b=second(c);c.second=b;heroes.forEach((h,i)=>{if(i===selected)h.mastery=ladder?28:Math.max(h.mastery,35);else if(i===b)h.mastery=ladder?15:Math.max(h.mastery,25);else if(ladder)h.mastery=Math.min(h.mastery,h.role===c.role?8:5);});}
function skill(c){const G=GROWTH;return G.rating(c)+(heroes[selected].mastery-50)/10+(c.energy<30?-4:0);}
const winP=(c,opp)=>1/(1+Math.exp(-(skill(c)-opp)/6));
const rankName=l=>`${TIERS[l.tier]}${l.tier<APEX?' '+DIV[l.div||4]:''}`;
const tname=l=>l.placed===0?`未定位（定位賽 ${l.pgames||0}/5）`:`${rankName(l)} ${l.tier<APEX?Math.min(99,l.lp):l.lp} 點`;

const EVENTS=[
 {t:'段考將近',x:'下週就是段考，書桌上的課本還沒翻開。',o:[['先把書讀完',[['school',15],['energy',-5]],'你把進度追上了，爸媽鬆了一口氣。'],['照常打排位',[['school',-10],['stat','mechanics',1]],'你多打了幾場，成績單大概不會太好看。']]},
 {t:'爸媽的擔心',x:'晚餐時，爸媽問你每天打遊戲到底想做什麼。',o:[['好好說明自己的目標',[['family',15],['stat','mental',1]],'他們沒有完全同意，但願意給你一點時間。'],['隨口帶過',[['family',-10]],'飯桌的氣氛有點僵。']]},
 {t:'網咖老闆的邀請',x:'常去的網咖老闆說今晚包場，讓你免費打到天亮。',o:[['熬夜練英雄',[['energy',-15],['mastery',4]],'你把拿手英雄練得更順了，只是隔天很累。'],['婉拒，早點回家',[['energy',5],['family',3]],'你準時到家，媽媽有點意外。']]},
 {t:'路人隊友互噴',x:'排位裡隊友一直打字罵人，局勢越來越亂。',o:[['關掉聊天，專心打',[['stat','mental',2]],'你把注意力放回小地圖。'],['回嘴',[['stat','mental',-1],['lp',-8]],'你們吵了起來，結果輸了這局。']]},
 {t:'同學找你雙排',x:'班上同學想和你一起排位，他打輔助。',o:[['一起雙排',[['stat','teamwork',2],['school',3]],'你們越打越有默契，也多了一個朋友。'],['自己單排',[['stat','mechanics',1]],'你繼續一個人衝分。']]},
 {t:'被直播主看見',x:'一位直播主在遊戲裡遇到你，問你要不要上他的台聊聊。',o:[['上台聊天',[['fans',30]],'聊天室有人開始記住你的名字。'],['婉拒',[['stat','mental',1]],'你覺得現在還不是時候。']]},
 {t:'深夜的最後一場',x:'已經凌晨兩點，你連輸了三場，還想再打一場。',o:[['去睡覺',[['energy',15]],'睡飽之後，手感回來了。'],['再打一場',[['energy',-15],['lp',10]],'你贏了，但隔天上課一直打瞌睡。']]},
 {t:'學校的電競社',x:'學校新成立電競社，社長邀請你加入。',o:[['加入電競社',[['stat','teamwork',2],['school',5]],'你在社團練習團隊溝通，學校也比較支持你。'],['專心個人練習',[['stat','laning',1]],'你把時間留給對線練習。']]}
];
const fx=(k,a,b)=>k==='stat'?`${GROWTH.NAME[a]} ${b>0?'+':''}${b}`:{school:'課業',family:'家人支持',energy:'體力',mastery:'拿手英雄熟練',lp:'段位分',fans:'粉絲'}[k]+` ${a>0?'+':''}${a}`;
function apply(c,list){const l=L();for(const [k,a,b] of list){if(k==='stat')c.stats[a]=Math.max(0,Math.min(100,c.stats[a]+b));else if(k==='school')l.school=Math.max(0,Math.min(100,l.school+a));else if(k==='family')l.family=Math.max(0,Math.min(100,l.family+a));else if(k==='energy')c.energy=Math.max(0,Math.min(100,c.energy+a));else if(k==='mastery'){GROWTH.addMastery(GROWTH.pool(c.role)[0],a,false);}else if(k==='lp')addLP(l,a);else if(k==='fans')c.fans+=a;}}
function addLP(l,d){l.lp+=d;
 if(l.promo&&l.lp<100)l.promo=false;l.peak=Math.max(l.peak??0,l.tier);
 while(l.tier<APEX&&l.lp>=100){if((l.div||4)===1&&!l.promoOK){l.lp=100;if(!l.promo){l.promo=true;l.log.push(`進入晉級賽：贏下這一場就升上 ${TIERS[l.tier+1]}`);}break;}l.promoOK=false;l.lp-=100;if((l.div||4)>1)l.div--;else{l.tier++;l.div=4;l.log.push(`晉升 ${TIERS[l.tier]}！`);if(l.tier>=APEX){l.div=0;break;}}}
 while(l.lp<0&&l.tier<APEX&&!(l.tier===0&&l.div===4)){if(l.div<4){l.div++;l.lp+=75;}else{l.tier--;l.div=1;l.lp+=75;l.log.push(`掉回 ${TIERS[l.tier]}`);}}
 if(l.lp<0)l.lp=0;
 if(l.tier>=APEX){const t=l.lp>=500?9:l.lp>=200?8:APEX;if(t>l.tier)l.log.push(`晉升 ${TIERS[t]}！`);l.tier=Math.max(l.tier,t);}l.peak=Math.max(l.peak??0,l.tier);}
// 0.81 晉級賽：每個大段位的 I 打滿 100 點後，要贏一場晉級賽才能升段；可以親自上場或直接模擬
function promoTarget(l){return tierRating(l.tier+1,4);}
function promoResult(c,win){const l=L();l.promo=false;l.games++;if(win){l.wins++;l.promoOK=true;addLP(l,0);}else{l.lp=70;l.log.push(`晉級賽落敗，留在 ${rankName(l)}。`);}}
function promoSim(c){const l=L(),win=Math.random()<winP(c,promoTarget(l));l.log.push(`晉級賽（模擬）：${win?'勝':'敗'}`);promoResult(c,win);c.energy=Math.max(0,c.energy-6);endRound(c);CAREER.save();renderSetup();}
function promoLive(c){const l=L();CAREER.battleStart();if(!state)return;const gap=skill(c)-promoTarget(l),f=Math.max(.8,Math.min(1.3,1-gap*.025));state.actors.forEach(a=>{if(a.team===1)a.power*=f;});state.ladderPromo={tier:l.tier};const iq=Math.min(.92,.45+(l.tier+1)*.05);state.actors.forEach(a=>{if(!a.player)a.iq=iq;});
 const t=document.querySelector('#playerTitle');if(t)t.textContent+=` · 晉級賽 → ${TIERS[l.tier+1]}`;}
const ladderFinish=finish;finish=function(){const was=state?.done;ladderFinish.apply(this,arguments);const s=state;if(was||!s?.done||!s.ladderPromo)return;const c=CAREER.data,l=L(),win=s.winner===0||(s.winner==null&&s.kills[0]>s.kills[1]);s.ladderPromo=null;
 l.log.push(`晉級賽（親自上場）：${win?'勝':'敗'}`);promoResult(c,win);c.energy=Math.max(0,c.energy-6);endRound(c);CAREER.save();
 const again=document.querySelector('#again');if(again){again.textContent='回到天梯 →';again.onclick=()=>{state=null;document.querySelector('#match').hidden=true;document.querySelector('#setup').hidden=false;renderSetup();window.scrollTo(0,0);};}
 const r=document.querySelector('#result');if(r){const n=document.createElement('p');n.className='note';n.textContent=win?`晉級成功！升上 ${TIERS[l.tier]}。`:'晉級賽落敗，下次再來。';r.prepend(n);}};
// 依實力（隱藏分）決定加減分：比段位強越多，贏得越多、輸得越少
function lpGain(c,l,win){const gap=skill(c)-tierRating(l.tier,l.div,l.lp);return win?Math.round(Math.max(28,Math.min(66,40+gap*4))):-Math.round(Math.max(5,Math.min(24,14-gap*2)));}
function placement(c,l){let t=0,d=4;const k=skill(c)-2;for(let i=0;i<=PLACE_CAP;i++)for(let j=4;j>=1;j--)if(tierRating(i,j)<=k){t=i;d=j;}
 l.tier=t;l.div=d;l.lp=Math.round(Math.random()*40);l.placed=1;l.log.push(`定位賽結束（${l.pwins} 勝 ${5-l.pwins} 敗），定位在 ${rankName(l)}。`);}

function start(c){c.stage='ladder';c.age=15;c.origin='ladder';GROWTH.ensure(c,true);for(const k of GROWTH.KEYS)c.stats[k]=Math.min(c.stats[k],45);c.trust=50;
 startPool(c,true);
 c.ladder={v2:1,tier:0,div:4,placed:0,pgames:0,pwins:0,lp:0,round:1,games:0,wins:0,school:60,family:60,event:null,offers:[],cupWins:0,log:['你建立了遊戲帳號，先打 5 場定位賽。']};training=3;CAREER.save();}
function endRound(c){const l=L();l.round++;GROWTH.tick(c);training=3;if(l.round%10===1&&l.round>1){c.age++;l.log.push(`你 ${c.age} 歲了。`);}
 if(!l.event&&Math.random()<.45)l.event=Math.floor(Math.random()*EVENTS.length);
 if(l.school<15&&!l.event){l.event=0;}
 // 0.88 平凡人生：家人支持或課業歸零 → 夢想暫停；第 3 季（18 歲）結束還沒進青訓 → 回歸平凡；每季到耀金以上才有一次季末最後試訓
 if((l.family<=0||l.school<=0)&&window.ENDING){ENDING.end(c,'family');return;}
 scout(c);if(l.round>MAX_ROUND&&!l.offers.length){const s=l.season||1;l.lastTried||={};if(Math.max(l.tier,l.peak??0)>=LAST_TIER&&!l.lastTried[s]){l.lastTried[s]=1;lastChance(c);}else if(s>=FINAL_SEASON&&window.ENDING){ENDING.end(c,'ladder');return;}else{l.season=(l.season||1)+1;l.round=1;const t=l.tier;l.tier=Math.max(0,l.tier-1);l.div=4;l.lp=0;l.peak=l.tier;l.log.push(`天梯季末，你停在 ${TIERS[t]}，沒有球探找上門。第 ${l.season} 季開始，段位重置為 ${TIERS[l.tier]}。`);}}}
function scout(c){const l=L(),[,reg]=WORLD.COUNTRIES[c.country||'TW'],home=WORLD.startTeam(c.country||'TW');if(l.offers.length)return;const ace=heroes[selected].mastery>=SCOUT_MASTERY,wr=l.games>=15?l.wins/l.games:0;
 const near=l.tier===SCOUT_TIER&&(ace||wr>=.56)&&Math.random()<(ace&&wr>=.56?.5:.25),hot=l.tier>=APEX||l.cupChamp||near;
 if(!hot){if(ace&&l.tier<SCOUT_TIER&&!l.aceNote){l.aceNote=1;l.log.push(`${heroes[selected].name} 已經練到精通，但段位還不夠高，球探不會注意 ${TIERS[SCOUT_TIER]} 以下的玩家。`);}return;}
 if(near)l.log.push(ace?`你的 ${heroes[selected].name} 在 ${TIERS[SCOUT_TIER]} 打出名號，有球探開始看你的對戰紀錄。`:`你在 ${TIERS[SCOUT_TIER]} 維持高勝率，有球探開始看你的對戰紀錄。`);
 const R=WORLD.REGION[reg],offers=[{tag:home,region:reg}];
 if(l.tier>=APEX+1||l.cupChamp){const strong=R.teams.slice(0,Math.ceil(R.teams.length/2)).filter(t=>t[1]!==home);const t=strong[Math.floor(Math.random()*strong.length)];if(t)offers.push({tag:t[1],region:reg});}
 if(l.tier>=APEX+2||(l.cupChamp&&l.tier>=APEX+1)){const others=WORLD.REGIONS.filter(r=>r.id!==reg),r=others[Math.floor(Math.random()*others.length)],t=r.teams[Math.floor(Math.random()*r.teams.length)];offers.push({tag:t[1],region:r.id,foreign:true});}
 l.offers=offers;l.log.push(`${offers.length} 支隊伍的球探注意到你，邀請你參加試訓。`);}
function changeRole(c,r){const l=L(),from=c.role;c.role=r;role=r;const pool=heroes.map((h,i)=>i).filter(i=>heroes[i].role===r).sort((a,b)=>heroes[b].mastery-heroes[a].mastery);selected=pool[0];
 c.roleFam[r]=Math.min(c.roleFam[r],30);c.roleChanges=(c.roleChanges||0)+1;l.log.push(`你把主路線從${ROLE[from]}改成${ROLE[r]}，${ROLE[r]}的位置熟悉度要從頭練起。`);}
function lastChance(c){const l=L(),[,reg]=WORLD.COUNTRIES[c.country||'TW'],h=WORLD.homeTeams(c.country||'TW').slice().sort((a,b)=>a[2]-b[2]),low=h.slice(0,Math.max(1,Math.ceil(h.length/2))),t=low[Math.floor(Math.random()*low.length)];l.offers=[{tag:t[1],region:reg,last:true}];l.log.push('天梯季末，有一支隊伍願意給你最後一次試訓機會。');}
const teamName=tag=>{for(const r of WORLD.REGIONS){const t=r.teams.find(x=>x[1]===tag);if(t)return t[0];}return tag;};
function play(c,n,practice){const l=L();let w=0;for(let i=0;i<n;i++){const win=Math.random()<winP(c,l.placed===0?tierRating(1):tierRating(l.tier,l.div,l.lp))*(practice?.85:1);if(win)w++;l.games++;
  if(l.placed===0){l.pgames++;if(win)l.pwins++;if(l.pgames>=5)placement(c,l);}else addLP(l,lpGain(c,l,win));}l.wins+=w;
 const hero=practice?GROWTH.pool(c.role).find(i=>i!==selected)??selected:selected;for(let i=0;i<n;i++)GROWTH.matchXP(c,.35,hero,i<w);
 l.log.push(`${practice?'練英雄':'排位'} ${n} 場：${w} 勝 ${n-w} 敗 → ${tname(l)}`);}
function cup(c){const l=L();let w=0;for(let i=0;i<3;i++){if(Math.random()<winP(c,TUNE.cupBase+i*3))w++;else break;}if(w===3){l.cupChamp=true;l.cupWins++;c.fans+=60;l.log.push('網咖盃冠軍！現場有人遞上了名片。');}else l.log.push(`網咖盃止步第 ${w+1} 輪。`);c.energy=Math.max(0,c.energy-15);}
// 0.82 球探邀約的簽約條件（參照足球人生：聯賽檔次、預估角色、年薪）：強隊年薪高、試訓難，但同位置老將強，坐板凳的機率也高
const STR_LABEL=r=>r>=86?'頂級強隊':r>=81?'強隊':r>=75?'中段班':'後段班';
function terms(c,o){if(o.terms)return o.terms;const R=WORLD.REGIONS.find(x=>x.id===o.region),t=R?.teams.find(x=>x[1]===o.tag);if(!t)return null;
 const rating=t[2],off=t[4]||{},sorted=R.teams.slice().sort((a,b)=>b[2]-a[2]),rank=sorted.findIndex(x=>x[1]===o.tag)+1;
 const salary=Math.max(12,Math.round((30+(rating-70)*6)*(o.foreign?1.2:1)*(o.last?.8:1))),years=rating>=81?1:o.last?1:2;
 o.terms={rating,label:STR_LABEL(rating),rank,of:R.teams.length,salary,years,edge:Math.round(Math.max(-2,Math.min(7,(rating-74)*.6))),starter:Math.round(rating+(off[c.role]||0)),opp:o.last?TUNE.tryBase:Math.round(TUNE.tryBase+(rating-70)*.5+(o.foreign?4:0))};return o.terms;}
function startChance(c,T){const ur=GROWTH.rating(c),mate=Math.min(T.starter,ur+T.edge);return Math.max(.05,Math.min(.95,1/(1+Math.exp(-((ur+3)-mate)/2))));}
function passChance(c,T){const p=winP(c,T.opp);return p*p*p+3*p*p*(1-p);}
function offerCard(c,l,o,i,lock){const T=terms(c,o),flagBad=o.foreign&&l.family<40;if(!T)return '';const sp=startChance(c,T),pc=passChance(c,T),lv=v=>v>=.65?'高':v>=.35?'中':'低';
 return `<div class="offer-card"><div class="oc-head"><b>${e(teamName(o.tag))}</b><span class="oc-str s${T.label==='頂級強隊'?3:T.label==='強隊'?2:T.label==='中段班'?1:0}">${T.label}</span></div>
 <small>${WORLD.REGION[o.region].name}${o.foreign?' · 海外':''}${o.last?' · 最後機會':''} · 賽區強度第 ${T.rank} / ${T.of} 名（隊伍強度 ${T.rating}）</small>
 <dl class="oc-terms"><div><dt>合約</dt><dd>${T.years} 年</dd></div><div><dt>年薪</dt><dd>${T.salary} 萬</dd></div><div><dt>先發機會</dt><dd class="lv-${lv(sp)}">${lv(sp)} ${Math.round(sp*100)}%</dd></div><div><dt>試訓通過率</dt><dd class="lv-${lv(pc)}">${lv(pc)} ${Math.round(pc*100)}%</dd></div></dl>
 <small>同位置現任先發能力約 ${T.starter}，你目前 ${GROWTH.rating(c)}。${T.edge>=4?'強隊老將實力深厚，進隊後很可能先坐板凳。':T.edge<=0?'這個位置缺人，進隊就有機會先發。':'要和現任先發競爭位置。'}</small>
 <button class="lact offer" data-offer="${i}" ${lock} ${flagBad?'disabled':''}><b>參加二軍試訓</b><small>三場測試賽拿下兩勝就能加入${flagBad?' · 家人支持不足 40，無法出國':''}</small></button></div>`;}
function tryout(c,o){const l=L(),T=terms(c,o);let w=0;for(let i=0;i<3;i++)if(Math.random()<winP(c,T?T.opp:TUNE.tryBase+(o.last?2:6)+(o.foreign?4:0)))w++;
 if(w>=2){const ck=Object.entries(WORLD.COUNTRIES).find(([k,v])=>v[1]===o.region&&(o.region!==WORLD.COUNTRIES[c.country||'TW'][1]?true:k===(c.country||'TW')))?.[0]||c.country;
  c.country=ck;c.proTeam=o.tag;if(o.terms)c.offerTerms={tag:o.tag,salary:o.terms.salary,years:o.terms.years,edge:o.terms.edge,label:o.terms.label};c.stage='camp';c.age=Math.max(c.age,16);c.ladderDone={tier:l.tier,div:l.div,games:l.games,wins:l.wins,peak:Math.max(l.peak??0,l.tier),last:!!o.last,foreign:!!o.foreign,school:l.school,cup:l.cupWins||0,roleChanges:c.roleChanges||0};c.storyLog.push(`天梯 ${rankName(l)}，通過 ${teamName(o.tag)} 試訓。`);training=3;CAREER.save();renderSetup();window.scrollTo(0,0);return;}
 l.offers=l.offers.filter(x=>x!==o);if(!l.offers.length)l.cupChamp=false;l.log.push(`${teamName(o.tag)} 試訓 ${w} 勝 ${3-w} 敗，沒有通過。`);c.energy=Math.max(0,c.energy-10);}

// 每週三個步驟：① 處理事件（有才出現）→ ② 訓練（可跳過）→ ③ 本週主要安排（按下就進入下一週）。試訓邀請算是一種主要安排。
function render(hub,c){const l=L(),ev=l.event!=null?EVENTS[l.event]:null,cupWeek=l.round%5===0,lock=ev?'disabled':'';
 const step=(n,title,state,body)=>`<section class="lstep ${state}"><div class="lstep-head"><b>${n}</b><h3>${title}</h3><small>${{now:'現在',done:'',wait:'等上一步完成',opt:'可跳過'}[state]||''}</small></div>${body}</section>`;
 const act=(id,name,desc,primary)=>`<button class="lact ${primary?'primary':''}" data-act="${id}" ${lock}><b>${name}</b><small>${desc}</small></button>`;
 const offers=l.offers.map((o,i)=>offerCard(c,l,o,i,lock)).join('');
 hub.innerHTML=`<div class="careerhead"><div><p class="eyebrow">${e(c.name)} / 天梯玩家 / ${c.age} 歲 · ${ROLE[c.role]}</p><h2>${l.placed===0||!window.RANK_ART?'':RANK_ART.img(l.tier,44)} ${tname(l)} <span>${(l.season||1)>1?`第 ${l.season} 季 · `:''}第 ${Math.min(l.round,MAX_ROUND)} / ${MAX_ROUND} 週</span></h2></div><button id="newCareer" class="quiet">重新開始生涯</button></div>
 <div class="careergrid"><article class="panel ladder-week">
 <div class="ladder-bars"><span>課業<i style="--v:${l.school}%"></i></span><span>家人支持<i style="--v:${l.family}%"></i></span><span>體力<i style="--v:${c.energy}%"></i></span></div>
 <p class="muted">排位 ${l.games} 場 · 勝率 ${l.games?Math.round(l.wins/l.games*100):0}% · 粉絲 ${c.fans}</p>
 ${(l.season||1)>=FINAL_SEASON?`<div class="ladder-alert warn">最後一季！第 ${FINAL_SEASON} 季結束前還沒通過試訓，電競夢就到此為止。</div>`:(l.season||1)===FINAL_SEASON-1?`<div class="ladder-alert warn">第 ${l.season} 季：再沒被看上，只剩下最後一季。</div>`:''}${Math.min(l.school,l.family)<25?`<div class="ladder-alert warn">${l.school<l.family?'課業':'家人支持'}只剩 ${Math.min(l.school,l.family)}，掉到 0 家人會要你暫停打電競。讀書能同時拉回課業和家人支持。</div>`:''}${l.offers.length&&!ev?`<div class="ladder-alert">有球探找你了！到下面「③ 本週主要安排」選擇參加試訓，或先繼續打排位（邀約會保留）。</div>`:''}
 ${ev?step('①','這週發生的事','now',`<p class="lstep-tip">先做選擇，才能進行訓練和本週安排。</p><div class="pro-event"><h3>${ev.t}</h3><p>${ev.x}</p>${ev.o.map((o,i)=>`<button class="storychoice" data-levent="${i}">${o[0]}<small>${o[1].map(x=>fx(...x)).join('・')}</small></button>`).join('')}</div>`):''}
 ${step(ev?'②':'①','訓練',ev?'wait':'opt',`<p class="lstep-tip">本週還能訓練 ${training} 次，每次體力 −${GROWTH.cost(c)}。沒用完的次數，週末會自動變成休息（每次體力 +30）。</p><div class="courses"></div>`)}
 ${step(ev?'③':'②','本週主要安排',ev?'wait':'now',`<p class="lstep-tip">選一項，這週就結束、進入下一週。</p><div class="lacts">
  ${offers}
  ${l.promo?act('promoLive','晉級賽：親自上場',`贏一場就升上 ${TIERS[l.tier+1]}；輸了退回 70 點 · 體力 −6`,true)+act('promoSim','晉級賽：直接模擬',`依實力計算勝率（約 ${Math.round(winP(c,promoTarget(l))*100)}%）`):''}${act('rank',l.placed===0?'打定位賽':'衝排位',l.placed===0?'新帳號要先打 5 場定位賽決定段位（每週 3 場）· 課業 −4、體力 −12':'打 3 場排位，升段的主要方式；實力比段位強越多，加分越多 · 課業 −4、體力 −12',!l.offers.length&&!l.promo)}
  ${act('practice','排位練備用英雄','用備用英雄打 2 場排位，備用英雄熟練度上升 · 勝率較低')}
  ${cupWeek?act('cup','參加網咖盃','每 5 週一次，三連勝奪冠會被球探注意 · 體力 −15'):''}
  ${act('study','讀書','課業 +12、家人支持 +5')}
  ${act('rest','整週休息','不打排位、好好休息 · 體力 +25（另加每週自然恢復）')}
 </div>`)}
 ${l.round<=CHANGE_UNTIL?`<details class="ladder-role"><summary>更換主路線 <small>第 ${CHANGE_UNTIL} 週前可以換，之後固定</small></summary><div class="ladder-role-btns">${ROLE.map((n,r)=>`<button type="button" class="quiet ${r===c.role?'selected':''}" data-lrole="${r}">${n}</button>`).join('')}</div></details>`:''}
 <p class="muted">被球探發掘的方式：打到 ${TIERS[APEX]}、拿下網咖盃冠軍，或在 ${TIERS[SCOUT_TIER]} 時本命英雄精通（${SCOUT_MASTERY}）或勝率夠高（有機率）。每季 ${MAX_ROUND} 週：本季最高段位到 ${TIERS[LAST_TIER]} 以上，季末會有一支隊伍給你最後一次試訓機會。最多打到第 ${FINAL_SEASON} 季（18 歲）：那時還沒進青訓，就得回到平凡的生活。課業或家人支持掉到 0，家人也會要你先放下電競。每個大段位升段前要先贏一場晉級賽。${l.round>=MAX_ROUND?'天梯季末到了。':''}</p></article>
 <article class="panel"><h3>近況</h3><ul class="pro-history">${l.log.slice(-10).reverse().map(x=>`<li><span>${e(x)}</span></li>`).join('')}</ul></article></div>`;
 GROWTH.decorate(hub,c,!ev,()=>renderSetup());
 hub.querySelector('#newCareer').onclick=()=>{if(hub.dataset.confirm){try{localStorage.removeItem('nexus-life-career-v1');}catch{}location.reload();return;}hub.dataset.confirm='1';hub.querySelector('#newCareer').textContent='再按一次，確定重新開始';};
 hub.querySelectorAll('[data-lrole]').forEach(b=>b.onclick=()=>{const r=+b.dataset.lrole;if(r===c.role||l.round>CHANGE_UNTIL)return;changeRole(c,r);CAREER.save();renderSetup();});
 hub.querySelectorAll('[data-levent]').forEach(b=>b.onclick=()=>{const o=EVENTS[l.event].o[+b.dataset.levent];apply(c,o[1]);l.log.push(`${EVENTS[l.event].t}：${o[2]}`);l.event=null;CAREER.save();renderSetup();});
 hub.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>{const o=l.offers[+b.dataset.offer];if(o.foreign&&l.family<40){l.log.push('家人不同意你一個人出國試訓。');CAREER.save();renderSetup();return;}tryout(c,o);if(c.stage==='ladder'){CAREER.save();renderSetup();}});
 hub.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;if(l.event!=null)return;
  if(a==='promoLive'){promoLive(c);return;}if(a==='promoSim'){promoSim(c);return;}if(a==='rank')play(c,3,false);else if(a==='practice')play(c,2,true);else if(a==='study'){l.school=Math.min(100,l.school+12);l.family=Math.min(100,l.family+5);l.log.push('你把這週留給課業，家人很欣慰。');}else if(a==='rest'){c.energy=Math.min(100,c.energy+25);l.log.push('你好好休息了一週。');}else if(a==='cup')cup(c);
  if(a==='rank'||a==='practice'){l.school=Math.max(0,l.school-4);c.energy=Math.max(0,c.energy-(a==='rank'?12:8));}
  endRound(c);CAREER.save();renderSetup();});}

// ---------- 掛勾 ----------
function modeField(){window.START_MODE='ladder';return;if(document.querySelector('#startMode'))return;const after=document.querySelector('#startCountry')?.closest('.namefield')||document.querySelector('.namefield');if(!after)return;const box=document.createElement('div');box.className='namefield mode-pick';const cur=window.START_MODE||'ladder';
 const opts=[['ladder','從天梯玩家開始','推薦','15 歲打排位、兼顧課業，等球探發掘後試訓進青訓'],['academy','直接從青訓開始','快速','跳過天梯，隨機分到出發國家的一支青訓隊']];
 box.innerHTML=`<span>開局方式</span><select id="startMode" hidden>${opts.map(([v,n])=>`<option value="${v}" ${v===cur?'selected':''}>${n}</option>`).join('')}</select><div class="mode-grid" role="radiogroup" aria-label="開局方式">${opts.map(([v,n,tag,d])=>`<button type="button" role="radio" data-m="${v}" class="${v===cur?'sel':''}" aria-checked="${v===cur}"><b>${n}<em>${tag}</em></b><small>${d}</small></button>`).join('')}</div>`;
 after.after(box);const sel=box.querySelector('select');
 const pick=v=>{window.START_MODE=v;sel.value=v;box.querySelectorAll('[data-m]').forEach(b=>{const on=b.dataset.m===v;b.classList.toggle('sel',on);b.setAttribute('aria-checked',on);});};
 sel.onchange=ev=>pick(ev.target.value);box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>pick(b.dataset.m));}
// 建立生涯前：英雄卡上選「備用」英雄（本命＝點卡片本身）
function backupChips(){const list=document.querySelector('#heroes');if(!list)return;const fake={role};let b=window.SECOND_HERO;if(!(Number.isInteger(b)&&heroes[b]?.role===role&&b!==selected)){b=GROWTH.pool(role).find(i=>i!==selected);window.SECOND_HERO=b;}
 const h2=list.parentElement.querySelector('.pool-hint')||document.createElement('p');h2.className='muted pool-hint';h2.textContent='點卡片選本命英雄，按「設為備用」選第二隻。被禁用時可以換備用上場。';if(!h2.isConnected)list.before(h2);
 list.querySelectorAll('[data-hero]').forEach(card=>{const i=+card.dataset.hero;card.classList.toggle('backup',i===b);let chip=card.querySelector('.backup-chip');if(!chip){chip=document.createElement('span');chip.className='backup-chip';chip.setAttribute('role','button');chip.tabIndex=0;card.append(chip);
   const set=ev=>{ev.stopPropagation();ev.preventDefault();if(i===selected)return;window.SECOND_HERO=i;renderSetup();};chip.addEventListener('click',set);chip.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' ')set(ev);});}
  chip.textContent=i===selected?'本命':i===b?'備用 ✓':'設為備用';chip.classList.toggle('on',i===selected||i===b);chip.classList.toggle('main',i===selected);});}
const prevRender=renderSetup;
renderSetup=function(){let c=CAREER.data;
 if(c&&window.__CREATE_FROM_UI){window.__CREATE_FROM_UI=false;if((document.querySelector('#startMode')?.value||window.START_MODE||'ladder')==='ladder'&&!c.origin&&!c.results.length){c.country=c.country||window.START_COUNTRY||'TW';start(c);}else{const fresh=!c.origin;c.origin=c.origin||'academy';c.country=c.country||window.START_COUNTRY||'TW';if(!c.proTeam)c.proTeam=WORLD.startTeam(c.country);if(fresh){startPool(c,false);CAREER.save();}}}
 prevRender();c=CAREER.data;if(!c){modeField();backupChips();return;}
 const hub=document.querySelector('#careerHub'),st=document.querySelector('#start');
 if(c.stage==='ladder'){if(st)st.hidden=true;if(hub)render(hub,c);const tr=document.querySelector('#train');if(tr){tr.disabled=!training||c.energy<GROWTH.cost(c);tr.textContent=`英雄專項練習 · 剩餘 ${training} 次`;}}
 else if(!c.pro&&st)st.hidden=false;};
// life-ui 頂部列
const prevDraw=draw;draw=function(){prevDraw();const c=CAREER.data;if(c?.stage!=='ladder'||!L())return;const put=(id,v)=>{const n=document.getElementById(id);if(n&&n.textContent!==v)n.textContent=v;};put('lifeMeta',`天梯玩家 · ${ROLE[c.role]} · ${c.age} 歲`);put('lifeSeason',`${tname(L())} · 第 ${Math.min(L().round,MAX_ROUND)} 週`);put('lifePhase','天梯');};
window.LADDER={TUNE,changeRole,startPool,CHANGE_UNTIL,SCOUT_MASTERY,TIERS,start,play,cup,tryout,endRound,skill,get data(){return L();}};
renderSetup();
})();
