'use strict';
// 0.40 職業賽季畫面：出發國家、升一軍、賽季主畫面（賽程／積分／樹狀圖）、2026 職業 BP 盤、比賽結果回寫。
(()=>{
const SCROLLED=new WeakSet(); // BP 只在剛進入時捲到頂端，之後重畫不再捲動
const W=WORLD,$q=s=>document.querySelector(s),e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE=['上路','打野','中路','射手','輔助'];
let draftSel=null; // 0.56 BP 先點選、再確認鎖定
let view=null,draftNeed=null,confirmReset=false;
const draftEl=document.createElement('section');draftEl.id='proDraft';draftEl.hidden=true;$q('#match').before(draftEl);
const P=()=>W.data;
const tn=tag=>{const t=W.team(tag);return t?t.name:tag;};
const us=()=>P().team;
function trust(){return CAREER.data?.trust??50;}
function save(){CAREER.save();}

// ---------- 建立生涯前：出發國家 ----------
const _st=(cx,cy,r,f)=>{let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.4:r;d+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(2)+' '+(cy+Math.sin(a)*rr).toFixed(2);}return `<path d="${d}Z" fill="${f}"/>`;};
// 國旗：自繪 30×20 SVG（Windows 不顯示國旗表情符號）。歐洲／北美是賽區，用歐盟旗與北美星條旗代表。
const FLAG={
 TW:`<rect width="30" height="20" fill="#d7141a"/><rect width="15" height="10" fill="#1f3a93"/><circle cx="7.5" cy="5" r="2.8" fill="#fff"/><circle cx="7.5" cy="5" r="1.9" fill="#1f3a93"/><circle cx="7.5" cy="5" r="1.5" fill="#fff"/>`,
 KR:`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#0047a0"/><path d="M10 10a5 5 0 0 1 10 0a2.5 2.5 0 0 1-5 0a2.5 2.5 0 0 0-5 0Z" fill="#cd2e3a"/><g stroke="#000" stroke-width=".9"><path d="M5 4.5l2.5 2.5M4 5.5l2.5 2.5M25 4.5l-2.5 2.5M26 5.5l-2.5 2.5M5 15.5l2.5-2.5M4 14.5l2.5-2.5M25 15.5l-2.5-2.5M26 14.5l-2.5-2.5"/></g>`,
 CN:`<rect width="30" height="20" fill="#de2910"/>${_st(5,5,3,'#ffde00')}${_st(10,2,1,'#ffde00')}${_st(12,4,1,'#ffde00')}${_st(12,7,1,'#ffde00')}${_st(10,9,1,'#ffde00')}`,
 EU:`<rect width="30" height="20" fill="#003399"/>${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return _st(15+Math.cos(a)*6,10+Math.sin(a)*6,1.1,'#ffcc00');}).join('')}`,
 NA:`<rect width="30" height="20" fill="#fff"/>${[0,1,2,3,4,5,6].map(i=>`<rect y="${(i*20/6.5).toFixed(2)}" width="30" height="1.54" fill="#b22234"/>`).join('')}<rect width="13" height="10.8" fill="#3c3b6e"/><g fill="#fff">${[[2,2],[5,2],[8,2],[11,2],[3.5,4.5],[6.5,4.5],[9.5,4.5],[2,7],[5,7],[8,7],[11,7],[3.5,9.3],[6.5,9.3],[9.5,9.3]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".6"/>`).join('')}</g>`,
 BR:`<rect width="30" height="20" fill="#009c3b"/><path d="M15 2.5L27 10L15 17.5L3 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.2q4.4-1.4 8.8 1.6" stroke="#fff" stroke-width=".8" fill="none"/>`,
 VN:`<rect width="30" height="20" fill="#da251d"/>${_st(15,10.5,6,'#ffff00')}`,
 JP:`<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>`,
 HK:`<rect width="30" height="20" fill="#de2910"/><g fill="#fff">${[0,1,2,3,4].map(i=>`<ellipse cx="15" cy="6.6" rx="1.5" ry="3.4" transform="rotate(${i*72+36} 15 10)"/>`).join('')}</g><g fill="#de2910">${[0,1,2,3,4].map(i=>_st(15,6.6,.55,'#de2910').replace('<path',`<path transform="rotate(${i*72+36} 15 10)"`)).join('')}</g>`};
const flagSVG=k=>`<svg class="flag" viewBox="0 0 30 20" width="30" height="20" aria-hidden="true">${FLAG[k]||''}<rect width="30" height="20" fill="none" stroke="#0002"/></svg>`;
// 聯賽強度：該聯賽前 8 隊基礎強度平均（各聯賽隊數不同，取前段班比較公平）。
const leaguePower=r=>{const t=W.REGION[r].teams.map(x=>x[2]).sort((a,b)=>b-a).slice(0,8);return Math.round(t.reduce((a,b)=>a+b,0)/t.length);};
// 依真實職業賽區近年國際賽表現評級（數字來自 world.js 隊伍強度，評語不寫真實名稱）。
const REAL={SCL:['世界頂尖','近年世界賽冠軍大多出自這裡，國際賽最強'],DRL:['世界頂尖','隊伍最多、整體最深，國際賽常客四強'],EUL:['強','西方最強賽區，偶爾能擊敗東亞強隊'],
 NSL:['第二梯隊','資源充足，但國際賽常止步小組或八強前'],PRL:['第二梯隊','多國合併賽區，台灣隊是主力，偶有爆冷'],SXL:['發展中','國際賽較難突破，適合從基層打起']};
const COUNTRY_NOTE={TW:'環太平洋主力，近年國際賽代表常出自台灣',VN:'人才多、風格激進，國內戰力緊追台灣',JP:'賽區中較弱的一支，國內隊伍偏弱',HK:'沒有本地隊伍，靠球探邀約加入賽區各隊'};
function countryField(){if($q('#startCountry'))return;const name=$q('.namefield');if(!name)return;const box=document.createElement('div');box.className='namefield country-pick';
 const cur=window.START_COUNTRY||'TW';
 box.innerHTML=`<span>出發國家</span><select id="startCountry" hidden>${Object.entries(W.COUNTRIES).map(([k,[n]])=>`<option value="${k}" ${k===cur?'selected':''}>${n}</option>`).join('')}</select><div class="country-grid" role="radiogroup" aria-label="出發國家">${Object.entries(W.COUNTRIES).map(([k,[n,r,t]])=>{const v=leaguePower(r);
  return `<button type="button" role="radio" data-c="${k}" class="${k===cur?'sel':''}" aria-checked="${k===cur}">${flagSVG(k)}<b>${n}</b><span class="cp-league">${e(W.REGION[r].name)}</span><span class="cp-power"><i style="width:${Math.max(8,Math.min(100,(v-60)*2.8))}%"></i></span><small>聯賽強度 ${v}・<strong class="cp-tier">${REAL[r][0]}</strong></small><small class="cp-note">${e(COUNTRY_NOTE[k]||REAL[r][1])}</small></button>`;}).join('')}</div>`;
 name.after(box);const sel=box.querySelector('select');
 const pick=k=>{window.START_COUNTRY=k;sel.value=k;box.querySelectorAll('[data-c]').forEach(b=>{const on=b.dataset.c===k;b.classList.toggle('sel',on);b.setAttribute('aria-checked',on);});};
 sel.onchange=ev=>pick(ev.target.value);box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>pick(b.dataset.c));}
const tn0=(r,t)=>W.REGION[r].teams.find(x=>x[1]===t)[0];

// ---------- 青訓結束：升一軍 ----------
function promoCard(hub){const c=CAREER.data,[cn,,t0]=W.COUNTRIES[c.country||'TW'],t=c.proTeam||t0,r=W.REGIONS.find(x=>x.teams.some(y=>y[1]===t)).id;if(hub.querySelector('#proPromo'))return;const a=document.createElement('article');a.className='panel';a.id='proPromo';
 a.innerHTML=`<p class="eyebrow">下一步 / 職業一軍</p><h3>${e(tn0(r,t))} 決定把你升上一軍</h3><p>青訓賽段結束了。你將以 ${ROLE[c.role]} 先發身分加入 ${W.REGION[r].name}（${cn}），迎接 2027 職業賽季：三個國內賽段、開季先鋒賽、季中邀請賽，以及霧河世界大賽。</p><div class="pro-actions"><button class="primary" data-full="0">開始職業賽季（精簡賽程，推薦）</button><button class="quiet" data-full="1">完整賽程（例行賽雙循環）</button></div>`;
 hub.append(a);a.querySelectorAll('[data-full]').forEach(b=>b.onclick=()=>{W.create(c.country||'TW',b.dataset.full==='1');training=3;save();renderSetup();window.scrollTo(0,0);});}

// ---------- 賽季主畫面 ----------
function seriesLine(sr,c){const a=sr.a===us()||sr.b===us();return `<li class="${a?'mine':''}">${sr.mid?`<small class="pro-mid">${W.DE_LABEL(sr.mid)}</small>`:''}<span>${e(tn(sr.a))}</span><b>${sr.w?sr.s.join(' : '):'vs'}</b><span>${e(tn(sr.b))}</span>${sr.bo>1?`<small>Bo${sr.bo}</small>`:''}</li>`;}
function compView(c){
 if(c.kind==='rr'||c.kind==='swiss'){const rows=(c.kind==='swiss'?[...c.teams].sort((x,y)=>(c.table[y].w-c.table[y].l)-(c.table[x].w-c.table[x].l)):W.stand(c));
  return `<h4>${e(c.name)}${c.done?' · 已結束':` · 第 ${Math.min(c.ri+1,c.rounds.length)} 輪`}</h4><table class="pro-table"><tr><th>#</th><th>隊伍</th><th>勝-敗</th><th>小局</th></tr>${rows.map((t,i)=>`<tr class="${t===us()?'mine':''}"><td>${i+1}</td><td>${e(tn(t))}<small> ${t}</small></td><td>${c.table[t].w}-${c.table[t].l}</td><td>${c.table[t].gw-c.table[t].gl>=0?'+':''}${c.table[t].gw-c.table[t].gl}</td></tr>`).join('')}</table>`;}
 return `<h4>${e(c.name)}${c.done?' · 已結束':''}</h4>${c.rounds.map((r,i)=>`<p class="muted">第 ${i+1} 輪${c.kind!=='de'&&i===c.rounds.length-1&&r.length===1?'（決賽）':''}</p><ul class="pro-series">${r.map(sr=>seriesLine(sr,c)).join('')}</ul>`).join('')}`;}
function standingsPanel(){const p=P(),key=W.PHASES[p.phase][0],intl=['fs','msi','worlds'].includes(key);const cur=view||(intl?'INTL':W.team(us()).region);
 const comps=p.comps.filter(c=>c.region===cur&&c.id.startsWith(p.year+'-')).reverse();
 return `<div class="pro-tabs">${[...W.REGIONS.map(r=>[r.id,r.name]),['INTL','國際賽']].map(([id,n])=>`<button class="quiet ${id===cur?'selected':''}" data-view="${id}">${n}</button>`).join('')}</div>${comps.length?comps.slice(0,3).map(compView).join(''):'<p class="muted">這個階段還沒有賽事資料。</p>'}`;}
function rosterPanel(){const p=P(),t=W.team(us()),list=p.players.filter(x=>x.team===us()).sort((a,b)=>(b.starter-a.starter)||a.role-b.role);
 return `<h3>${e(t.name)} <small>${t.tag} · 隊伍強度 ${W.strength(us()).toFixed(1)}</small></h3><table class="pro-table"><tr><th>位置</th><th>選手</th><th>能力</th><th>年齡</th></tr>${list.map(x=>`<tr class="${x.user?'mine':''}"><td>${x.starter?ROLE[x.role]:'替補・'+ROLE[x.role]}</td><td>${e(x.name)}${x.user?'（你）':''}</td><td>${x.rating}</td><td>${x.age}</td></tr>`).join('')}</table>`;}
function historyPanel(){const h=P().history.slice().reverse().slice(0,12);return `<h3>賽事冠軍</h3>${h.length?`<ul class="pro-history">${h.map(x=>`<li class="${x.champ===us()?'mine':''}"><span>${x.year} ${e(x.event)}</span><b>${e(tn(x.champ))}</b></li>`).join('')}</ul>`:'<p class="muted">還沒有賽事結束。</p>'}`;}
function nextPanel(){const p=P(),L=p.live,u=W.userSeries(),key=W.PHASES[p.phase][0];
 if(L&&u){const opp=u.sr.a===us()?u.sr.b:u.sr.a;return `<p class="eyebrow">系列賽進行中 / ${e(u.comp.name)}</p><h3>${e(tn(us()))} ${L.score[0]} : ${L.score[1]} ${e(tn(opp))}</h3><p class="muted">Bo${L.bo} · 第 ${L.score[0]+L.score[1]+1} 局 · ${L.blueUs?'我方藍方（先選）':'我方紅方'} · Fearless 已鎖 ${L.fear.length} 隻英雄</p><div class="pro-actions"><button class="primary" id="proDraftGo">第 ${L.score[0]+L.score[1]+1} 局 BP →</button><button class="quiet" id="proSimRest">模擬剩下的系列賽</button></div>`;}
 if(u&&benched(u)){const opp=u.sr.a===us()?u.sr.b:u.sr.a,sub=subOf();return `<p class="eyebrow">本週比賽 / ${e(u.comp.name)}</p><h3>${e(tn(us()))} vs ${e(tn(opp))}</h3><p class="note">${trust()<BENCH_AT?`教練信任只剩 ${trust()}，`:'先發評估輸給替補，'}這個系列賽由替補 ${e(sub?.name||'')}（能力 ${sub?.rating||'—'}）先發。多做訓練、打出好表現，就能拿回先發位置（信任 ${BENCH_AT} 以上、評估超過替補）。</p><div class="pro-actions"><button class="primary" id="proBenchSim">在場邊觀看結果 →</button></div>`;}
 if(u){const opp=u.sr.a===us()?u.sr.b:u.sr.a,why=keyReason(u);if(!why)return `<p class="eyebrow">本週比賽 / ${e(u.comp.name)} · 常規賽</p><h3>${e(tn(us()))} vs ${e(tn(opp))}</h3><p class="muted">Bo${u.sr.bo} · 對手強度 ${W.strength(opp).toFixed(1)}（我方 ${W.strength(us()).toFixed(1)}）· 常規賽預設自動模擬，會依你的能力與近況算出個人評分。</p>${rivalNote(opp)}<div class="pro-actions"><button class="primary" id="proSimSeries">模擬這個系列賽 →</button><button class="quiet" id="proStartSeries">我想親自上場</button></div>${planPicker()}<div class="pro-actions"><button class="quiet" id="proFF">快轉到下一場關鍵比賽</button></div>`;return `<p class="eyebrow">本週比賽 / ${e(u.comp.name)} · <b class="key-tag">關鍵：${e(why)}</b></p><h3>${e(tn(us()))} vs ${e(tn(opp))}</h3><p class="muted">Bo${u.sr.bo} · 對手強度 ${W.strength(opp).toFixed(1)}（我方 ${W.strength(us()).toFixed(1)}）· ${W.strength(us())>=W.strength(opp)?'我方有先選權':'對手有先選權'}</p>${rivalNote(opp)}<div class="pro-actions"><button class="primary" id="proStartSeries">進入 BP，親自上場 →</button><button class="quiet" id="proSimSeries">直接模擬這個系列賽</button></div>`;}
 if(key==='off')return offPanel();
 if(false){const champs=p.history.filter(h=>h.year===p.year);return `<p class="eyebrow">休賽期</p><h3>${p.year} 賽季結束</h3><p>${champs.some(h=>h.champ===us())?'今年拿到了冠軍！':'今年沒有拿到冠軍，明年再來。'}世界大賽冠軍：${e(tn(champs.find(h=>h.world)?.champ||''))}</p><div class="pro-actions"><button class="primary" id="proWeek">進入 ${p.year+1} 賽季 →</button></div>`;}
 const mine=W.phaseComps().some(c=>!c.done&&c.teams.includes(us()));
 return `<p class="eyebrow">第 ${p.week+1} 週</p><h3>${mine?'這週沒有我方比賽':'我方沒有參加這項賽事'}</h3><p class="muted">${mine?'其他隊伍的比賽會照賽程進行。':'可以專心訓練，或快轉到我方下一場比賽。'}</p>${planPicker()}<div class="pro-actions"><button class="primary" id="proFF">快轉到下一場關鍵比賽 →</button><button class="quiet" id="proWeek">只推進一週</button><button class="quiet" id="proFast">快轉到我的下一場</button></div><p class="muted">快轉時每週依訓練計畫自動訓練，常規賽自動模擬；遇到事件、關鍵系列賽或休賽期會停下。</p>`;}
// ---------- 替補輪換 ----------
const BENCH_AT=35;
function subOf(){const me=P().players.find(x=>x.user);return P().players.filter(x=>x.team===us()&&!x.starter&&!x.user).sort((a,b)=>(b.role===me.role)-(a.role===me.role)||b.rating-a.rating)[0];}
// ---------- 0.80 先發競爭與練習賽 ----------
// 同位置替補每週成長；系列賽前教練比較「能力＋近況＋信任」決定先發。練習賽每週一次，可演練英雄、針對對手或磨合團隊。
const wkey=()=>{const p=P();return p.year*1000+p.phase*100+p.week;};
function sq(){const p=P();if(!p.squad){p.squad={form:[],prep:null,scrimWeek:null,call:null,lastScrim:null,starter:'me',team:p.team};}const s=p.squad;if(s.team!==p.team){s.team=p.team;s.starter='me';s.call=null;s.form=[];}
 if(s.mateId!==mate()?.id){const m=mate();s.mateId=m?.id;if(m){const ot=CAREER.data.offerTerms,edge=ot&&ot.tag===p.team?ot.edge:1;m.rating=Math.min(m.rating,W.userRating()+edge);m.form=0;}}return s;}
const INCUMBENT=3;
function mate(){const me=P().players.find(x=>x.user);return P().players.filter(x=>x.team===us()&&!x.starter&&!x.user&&x.role===me.role).sort((a,b)=>b.rating-a.rating)[0]||null;}
const formAvg=()=>{const f=sq().form;return f.length?f.reduce((x,v)=>x+v,0)/f.length:6.5;};
function pushForm(v){const f=sq().form;f.push(Math.round(v*10)/10);while(f.length>5)f.shift();}
function myScore(){return W.userRating()+(formAvg()-6.5)*3+(trust()-50)/8+(sq().starter==='me'?INCUMBENT:0);}
function mateScore(m){return m.rating+(m.form||0)+(P().squad?.starter==='mate'?INCUMBENT:0);}
function squadWeek(){const m=mate();if(!m)return;const team=W.team(us()),capR=Math.max(team.rating+6,m.rating);m.rating=Math.min(99,capR,Math.round((m.rating+(m.age<=23?.35:.15))*100)/100);m.form=Math.max(-3,Math.min(3,Math.round(((m.form||0)*.6+(Math.random()-.45)*2)*10)/10));}
function benched(u){const s=sq(),k=`${u.comp.name}|${u.sr.a}|${u.sr.b}|${wkey()}`;if(trust()<BENCH_AT){s.call={k,bench:true};s.starter='mate';return true;}if(s.call?.k===k)return s.call.bench;const m=mate();
 const bench=trust()<BENCH_AT||!!m&&mateScore(m)>myScore();s.call={k,bench};s.starter=bench?'mate':'me';if(bench&&trust()>=BENCH_AT)P().log.push(`教練決定本週由 ${m.name} 先發（評估 ${mateScore(m).toFixed(1)} 對 ${myScore().toFixed(1)}）`);return bench;}
function squadCard(){const m=mate();if(!m||P().live)return '';const a=myScore(),b=mateScore(m),gap=a-b,f=sq().form;
 const msg=trust()<BENCH_AT?'教練信任太低，會先讓替補上場。':gap>=4?'你穩穩握有先發位置。':gap>=1.5?'你領先，但替補一直在進步。':gap>-1.5?'差距很小，教練在觀察這週的練習。':'替補的評估比你高，下一場可能坐板凳。';
 const w=v=>Math.max(6,Math.min(100,(v-55)*2.4));
 return `<div class="pro-squad"><p class="eyebrow">先發競爭 · ${ROLE[P().players.find(x=>x.user).role]}</p>
 <div class="sq-row"><span>你</span><i style="--w:${w(a)}%"></i><b>${a.toFixed(1)}</b></div>
 <div class="sq-row sub"><span>${e(m.name)}</span><i style="--w:${w(b)}%"></i><b>${b.toFixed(1)}</b></div>
 <small>${msg} 近況：${f.length?f.map(v=>v.toFixed(1)).join('・'):'尚無比賽'}（評估＝能力＋近況＋教練信任，現任先發另加 ${INCUMBENT}）</small></div>`;}
function nextOpp(){const u=W.userSeries();return u?(u.sr.a===us()?u.sr.b:u.sr.a):null;}
function scrimCard(){const p=P(),s=sq();if(p.live||W.PHASES[p.phase][0]==='off'||p.ended)return '';
 if(s.scrimWeek===wkey())return s.lastScrim?`<div class="pro-scrim done"><p class="eyebrow">本週練習賽</p><small>${e(s.lastScrim)}</small></div>`:'';
 const c=CAREER.data,cost=GROWTH.cost(c),off=!(training>0)||c.energy<cost,opp=nextOpp(),h=heroes[selected];
 const opt=(k,n,d,dis)=>`<button class="storychoice" data-scrim="${k}" ${off||dis?'disabled':''}>${n}<small>${d}</small></button>`;
 return `<div class="pro-scrim"><p class="eyebrow">練習賽 · 每週一次（消耗 1 次訓練、體力 ${cost}）</p>
 ${opt('hero',`演練 ${e(h?.name||'本命英雄')}`,'熟練度以實戰計算；下個系列賽用這隻英雄時表現 +5%')}
 ${opt('opp',opp?`針對 ${e(tn(opp))}`:'針對下個對手','模擬對手的打法；下個系列賽全隊表現 +3%',!opp)}
 ${opt('team','磨合團隊','隊伍默契 +4、隊伍狀態上升')}
 ${off?'<small class="muted">本週訓練次數或體力不足。</small>':''}</div>`;}
function scrim(k){const p=P(),s=sq(),c=CAREER.data,cost=GROWTH.cost(c);if(s.scrimWeek===wkey()||!(training>0)||c.energy<cost||p.live)return;p.scrims=(p.scrims||0)+1;
 training--;c.energy=Math.max(0,Math.round((c.energy-cost)*10)/10);s.scrimWeek=wkey();
 const others=p.teams.filter(t=>t.tag!==us()&&W.team(t.tag).region===W.team(us()).region),o=k==='opp'&&nextOpp()?{tag:nextOpp()}:others[Math.floor(Math.random()*others.length)];
 const pr=1/(1+Math.exp(-(W.strength(us())-W.strength(o.tag))/6)),win=Math.random()<pr,m=mate(),perf=6.3+(win?.6:-.4)+(W.userRating()-(m?.rating??W.userRating()))/8+(Math.random()-.5)*1.6;
 pushForm(perf);c.trust=Math.max(0,Math.min(100,c.trust+(win?1:0)+(perf>=7?1:perf<5.5?-1:0)));let note='';
 if(k==='hero'){GROWTH.addMastery(selected,3,true);s.prep={...(s.prep||{}),hero:selected};note=`演練 ${heroes[selected].name}`;}
 else if(k==='opp'){s.prep={...(s.prep||{}),opp:o.tag};note=`研究 ${tn(o.tag)} 的打法`;}
 else{p.chem=Math.min(100,(p.chem??50)+4);const t=W.team(us());t.form=Math.round(((t.form||0)+.3)*10)/10;note='磨合團隊';}
 s.lastScrim=`對 ${tn(o.tag)} ${win?'勝':'敗'}・個人評分 ${perf.toFixed(1)}・${note}`;p.log.push(`練習賽：${s.lastScrim}`);save();renderSetup();}
// ---------- 0.81 關鍵系列賽與訓練計畫 ----------
// 常規賽（循環賽）預設自動模擬，只有季後賽、國際賽、宿敵、先發競爭吃緊與 Bo5 才請你親自上場；
// 沒有比賽的週數依「訓練計畫」自動訓練，一次快轉到下一場關鍵比賽。
function keyReason(u){if(!u)return '';const c=u.comp,ph=W.PHASES[P().phase][0],opp=u.sr.a===us()?u.sr.b:u.sr.a,r=rival(),m=mate();
 if(['fs','msi','worlds'].includes(ph))return '國際賽';if(c.kind==='de'||c.kind==='elim')return '季後賽';if(c.kind==='swiss')return '國際賽';
 if(u.sr.bo>=5)return 'Bo5 系列賽';if(r&&r.team===opp)return `宿敵 ${r.name} 的隊伍`;if(m&&trust()>=BENCH_AT&&Math.abs(myScore()-mateScore(m))<1.5)return '先發競爭吃緊';return '';}
const PLANS=[['balance','均衡','兩次能力訓練＋一次本命英雄'],['stat','能力','三次都練能力（挑你位置最重要、成長空間最大的）'],['hero','英雄','優先練本命英雄，到上限後改練能力'],['rest','保養','只做一次能力訓練，其餘休息']];
function bestCourse(c){const w=GROWTH.WEIGHT[c.role];let best=null,bv=-1;GROWTH.KEYS.forEach((k,i)=>{const v=w[i]*(100-c.stats[k])*(0.8+Math.random()*.4);if(v>bv){bv=v;best=k;}});return best;}
function autoTrain(c){const plan=P().plan||'balance';let n=training;const seq=plan==='stat'?['s','s','s']:plan==='hero'?['h','h','h']:plan==='rest'?['s','r','r']:['s','s','h'];
 for(let i=0;i<n;i++){const t=seq[i%3];if(c.energy<35||t==='r'){GROWTH.train(c,'rest');continue;}if(t==='h'&&GROWTH.heroTrain(c,selected))continue;GROWTH.train(c,bestCourse(c));}training=0;}
function simSeriesQuick(u){const p=P(),c=CAREER.data,opp=u.sr.a===us()?u.sr.b:u.sr.a;W.simUser();const sr=u.sr,win=sr.w===us(),m=mate(),games=sr.s[0]+sr.s[1];
 const perf=Math.max(3,Math.min(9.5,6.3+(win?.6:-.4)+(W.userRating()-(m?.rating??W.userRating()))/8+(Math.random()-.5)*1.6));pushForm(perf);window.SCORE?.rec(p,perf,games);
 c.trust=Math.max(0,Math.min(100,c.trust+Math.round((perf-6.3)*1.5)));c.fans+=win?12:4;GROWTH.addMastery(selected,1.5*games,true);rivalResult(opp,win);p.games=(p.games||0)+games;
 sq().prep=null;sq().call=null;const line=`${tn(us())} ${sr.a===us()?sr.s.join(':'):[...sr.s].reverse().join(':')} ${tn(opp)}（模擬・個人評分 ${perf.toFixed(1)}）`;p.log.push(line);return {win,line};}
function fastForward(){const p=P(),c=CAREER.data,out={w:0,l:0,lines:[],weeks:0,stop:''};
 for(let i=0;i<160;i++){if(p.event){out.stop='本週事件';break;}if(p.ended||W.PHASES[p.phase][0]==='off'){out.stop='休賽期';break;}
  const u=W.userSeries();
  if(u&&p.wait){const why=keyReason(u);if(why){out.stop=`關鍵系列賽：${why}`;break;}
   if(benched(u)){const sub=subOf(),me=p.players.find(x=>x.user);P().benched=(P().benched||0)+1;if(sub){me.starter=false;sub.starter=true;}W.simUser();if(sub){me.starter=true;sub.starter=false;}const won=u.sr.w===us();c.trust=Math.min(100,c.trust+(won?1:5));sq().call=null;out.lines.push(`替補先發：${won?'勝':'敗'}`);won?out.w++:out.l++;continue;}
   const r=simSeriesQuick(u);r.win?out.w++:out.l++;out.lines.push(r.line);continue;}
  if(training>0)autoTrain(c);W.week();GROWTH.tick(c);squadWeek();training=3;out.weeks++;if(Math.random()<.4)rollEvent();}
 p.ffSummary=out;view=null;save();renderSetup();}
function ffCard(){const f=P().ffSummary;if(!f)return '';return `<div class="pro-ff"><p class="eyebrow">快轉結果 · ${f.weeks} 週</p><b>常規賽 ${f.w} 勝 ${f.l} 敗</b>${f.stop?`<small>停在：${e(f.stop)}</small>`:''}${f.lines.length?`<details><summary>逐場賽果</summary><ul>${f.lines.map(x=>`<li>${e(x)}</li>`).join('')}</ul></details>`:''}<button class="quiet" id="proFfClose">知道了</button></div>`;}
function planPicker(){const cur=P().plan||'balance';return `<div class="pro-plan"><span>訓練計畫</span>${PLANS.map(([k,n,dsc])=>`<button type="button" class="${k===cur?'on':''}" data-plan="${k}" title="${dsc}" aria-pressed="${k===cur}">${n}</button>`).join('')}</div>`;}
// ---------- 每週事件（約 35% 機率，必須先回應才能推進下一週） ----------
const EVENTS=[
 {t:'直播邀約',x:'贊助商希望你本週開一場個人直播，聊聊職業生活。',o:[['開直播',[['fans',40],['stat','awareness',-1]],'直播很熱鬧，粉絲變多了，但少了一點研究時間。'],['婉拒，專心練習',[['stat','mechanics',2]],'你把時間留給了訓練室。']]},
 {t:'隊友爭執',x:'練習賽輸了之後，兩名隊友在檢討時吵了起來。',o:[['主動調解',[['stat','teamwork',2],['trust',2],['chem',8]],'你把話題拉回下一場要怎麼打，氣氛緩和下來。'],['保持距離，做好自己',[['stat','mechanics',1],['chem',-5]],'你沒有介入，專心處理自己的問題。']]},
 {t:'版本更新',x:'新版本公布，幾位英雄的強度有明顯變化。',o:[['研究版本筆記',[['stat','awareness',2]],'你整理了新版本的重點。'],['加練拿手英雄',[['mastery',6]],'你把拿手英雄練得更熟了。']]},
 {t:'手腕痠痛',x:'連續高強度練習後，你的手腕開始痠痛。',o:[['休息幾天',[['training',-2],['trust',1]],'你聽從防護員的建議休息，教練很滿意你的判斷。'],['硬撐繼續練',[['stat','mechanics',2],['form',-1.5]],'你多練了幾小時，但隊伍狀態因為你的疲勞略受影響。']]},
 {t:'教練一對一',x:'教練找你單獨聊下一階段的目標。',o:[['請教運營思路',[['stat','awareness',2],['trust',1]],'你帶著新的觀點回到訓練室。'],['請教對線細節',[['stat','mechanics',2],['trust',1]],'你記下了幾個對線時要注意的地方。']]},
 {t:'粉絲見面會',x:'俱樂部辦了一場粉絲見面會，邀請你出席。',o:[['參加',[['fans',30],['trust',1]],'很多人特地來看你，你第一次感覺到自己被期待。'],['留在基地練團',[['stat','teamwork',1]],'你和隊友多打了幾場練習賽。']]},
 {t:'媒體批評',x:'一篇評論文章點名你上週的失誤。',o:[['公開回應',[['fans',15],['trust',-2]],'你的回應引起討論，但教練希望你別太在意外界的聲音。'],['用比賽回應',[['trust',1],['stat','awareness',1]],'你把文章關掉，重新看了一遍那場比賽。']]},
 {t:'深夜排位',x:'隊友邀你一起打深夜排位，練習下路配合。',o:[['一起打',[['stat','teamwork',2],['chem',5]],'你們的默契變好了。'],['早點睡',[['form',1]],'你睡得很好，隊伍狀態也跟著穩定下來。']]},
 {t:'對手研究',x:'分析師整理了下一個對手的習慣。',o:[['看完所有重播',[['stat','awareness',2]],'你記住了對手常走的野區路線。'],['練克制英雄',[['mastery',4],['stat','mechanics',1]],'你準備了一隻克制對手的英雄。']]},
 {t:'家人來電',x:'家人打電話問你過得好不好。',o:[['請一天假回家',[['training',-1],['trust',1],['form',1]],'回家吃了一頓飯，回來時整個人輕鬆許多。'],['聊幾句就回去練習',[['stat','mechanics',1]],'你答應下次放假一定回家。']]}
];
function rollEvent(){const p=P();if(!p.event&&W.PHASES[p.phase][0]!=='off'&&Math.random()<.35)p.event={i:Math.floor(Math.random()*EVENTS.length)};}
function applyEffects(list){const c=CAREER.data;for(const [k,a,b] of list){if(k==='stat')c.stats[a]=Math.max(0,Math.min(100,c.stats[a]+b));else if(k==='trust')c.trust=Math.max(0,Math.min(100,c.trust+a));else if(k==='fans')c.fans=Math.max(0,c.fans+a);else if(k==='training')training=Math.max(0,training+a);else if(k==='form'){const t=W.team(us());t.form=Math.round(((t.form||0)+a)*10)/10;}else if(k==='chem'){P().chem=Math.max(0,Math.min(100,(P().chem??50)+a));}else if(k==='mastery'){const pool=P().players.find(x=>x.user).pool,i=pool[0]??selected;GROWTH.addMastery(i,a,false);}}}
const EFFECT_TEXT=([k,a,b])=>k==='chem'?`隊伍默契 ${a>0?'+':''}${a}`:k==='stat'?`${{mechanics:'操作',awareness:'判斷',teamwork:'配合'}[a]} ${b>0?'+':''}${b}`:k==='trust'?`信任 ${a>0?'+':''}${a}`:k==='fans'?`粉絲 +${a}`:k==='training'?`本週訓練 ${a}`:k==='form'?`隊伍狀態 ${a>0?'+':''}${a}`:`拿手英雄熟練 +${a}`;
function eventCard(){const p=P();if(!p.event)return '';const ev=EVENTS[p.event.i];return `<div class="pro-event"><p class="eyebrow">本週事件</p><h3>${ev.t}</h3><p>${ev.x}</p>${ev.o.map((o,i)=>`<button class="storychoice" data-event="${i}">${o[0]}<small>${o[1].map(EFFECT_TEXT).join('・')}</small></button>`).join('')}<p class="muted">先回應事件，才能推進到下一週。</p></div>`;}
// ---------- 0.42 合約、轉會、宿敵、傳奇評分、默契、退役結局 ----------
const TIERS=[[150,'名人堂傳奇'],[90,'名人堂'],[45,'明星選手'],[0,'職業選手']];
const TITLE_PTS={'開季先鋒賽':15,'季中邀請賽':20,'霧河世界大賽':40};
function legend(){if(window.SCORE)return SCORE.calc(CAREER.data).sc;const p=P();return Math.round((p.achievements||[]).reduce((x,a)=>x+a.pts,0)+(p.games||0)*.1+CAREER.data.fans/400);}
const tierOf=v=>window.SCORE?SCORE.tierName(v):TIERS.find(t=>v>=t[0])[1];
function salaryFor(tag){const t=W.team(tag);return Math.max(20,Math.round(((W.userRating()-60)*9+40+CAREER.data.fans/40)*(t.rating/80)));}
function pickRival(){const p=P(),me=p.players.find(x=>x.user),reg=W.team(p.team).region,score=x=>x.rating-3*Math.abs(x.age-me.age);const c=p.players.filter(x=>!x.user&&x.starter&&x.role===me.role&&x.team!==p.team&&W.team(x.team).region===reg).sort((a,b)=>score(b)-score(a))[0];if(c)p.rival={id:c.id,w:0,l:0,since:p.year};}
function rival(){const p=P();return p.rival?p.players.find(x=>x.id===p.rival.id):null;}
function ensureLife(){const p=P();p.achievements||=[];p.games||=0;p.money||=0;if(p.chem==null)p.chem=50;if(!p.contract){const ot=CAREER.data.offerTerms;p.contract=ot&&ot.tag===p.team?{team:p.team,years:ot.years,salary:ot.salary}:{team:p.team,years:2,salary:salaryFor(p.team)};};if(!rival()){const had=!!p.rival;pickRival();if(had&&p.rival)p.log.push('你的宿敵已經離開賽場，新的對手出現了。');}}
function rivalResult(opp,win){const r=rival();if(!r||r.team!==opp)return;const rv=P().rival;if(win){rv.w++;CAREER.data.fans+=10;}else rv.l++;}
function rivalNote(opp){const r=rival();return r&&r.team===opp?`<p class="note">對手陣中有你的宿敵 ${e(r.name)}（能力 ${r.rating}）。目前交手 ${P().rival.w} 勝 ${P().rival.l} 敗。</p>`:'';}
function lifeLine(){const p=P(),v=legend();return `<p class="muted">生涯分 <b>${v}</b>（${tierOf(v)}）· 合約剩 ${p.contract.years} 年 · 年薪 ${p.contract.salary} 萬 · 存款 ${p.money} 萬 · 隊伍默契 ${p.chem}</p>`;}
function rivalCard(){const r=rival();if(!r)return '';const rv=P().rival,titles=P().history.filter(h=>h.champ===r.team&&h.year>=rv.since).length;return `<div class="pro-rival"><p class="eyebrow">宿敵</p><b>${e(r.name)}</b><small>${e(tn(r.team))} · ${ROLE[r.role]} · 能力 ${r.rating} · ${r.age} 歲</small><small>交手 ${rv.w} 勝 ${rv.l} 敗 · 結為宿敵後對方隊伍奪冠 ${titles} 次</small></div>`;}
function newsCard(){const p=P();if(!p.moves?.length||p.phase!==0||p.week>2)return '';const k=p.moves.reduce((o,m)=>(o[m.kind]=(o[m.kind]||0)+1,o),{}),notable=p.moves.filter(m=>m.kind==='transfer').slice(0,3);return `<div class="pro-news"><p class="eyebrow">休賽期新聞</p><p>${k.retire||0} 名選手退役、${k.rookie||0} 名新秀登上一軍、${k.transfer||0} 筆轉會。</p>${notable.map(m=>`<small>${e(m.name)}：${e(tn(m.from))} → ${e(tn(m.to))}</small>`).join('')}</div>`;}
function genOffers(){const p=P(),me=p.players.find(x=>x.user),ur=W.userRating(),list=[];
 for(const t of p.teams){if(t.tag===p.team)continue;const st=W.roster(t.tag)[me.role],need=ur-st.rating,ch=need>=3?.9:need>=-2?.35:need>=-6?.08:0;if(Math.random()<ch)list.push({team:t.tag,years:1+Math.floor(Math.random()*3),salary:salaryFor(t.tag),start:need>=-2});}
 list.sort((a,b)=>b.salary-a.salary);const out=list.slice(0,5);if(p.contract.years<=0&&CAREER.data.trust>=40)out.unshift({team:p.team,years:2,salary:Math.round(salaryFor(p.team)*1.05),renew:true,start:true});return out;}
function yearEnd(){const p=P(),me=p.players.find(x=>x.user);if(p.offYear===p.year)return;p.offYear=p.year;
 for(const h of p.history.filter(h=>h.year===p.year&&h.champ===p.team))p.achievements.push({year:p.year,title:h.event+' 冠軍',pts:TITLE_PTS[h.event]||10});
 const wf=p.comps.find(x=>x.name==='霧河世界大賽・淘汰賽'&&x.done);if(wf){const pl=W.placement(wf);if(pl[1]===p.team)p.achievements.push({year:p.year,title:'霧河世界大賽 亞軍',pts:15});else if(pl.slice(2,4).includes(p.team))p.achievements.push({year:p.year,title:'霧河世界大賽 四強',pts:8});}
 const reg=W.team(p.team).region,peers=p.players.filter(x=>x.starter&&x.role===me.role&&W.team(x.team).region===reg);if(peers.every(x=>x.rating<=me.rating))p.achievements.push({year:p.year,title:`年度最佳${ROLE[me.role]}（${W.REGION[reg].name}）`,pts:8});
 p.money+=p.contract.salary;p.contract.years--;p.requested=false;p.offers=genOffers();}
function offPanel(){const p=P(),c=CAREER.data;yearEnd();const got=p.achievements.filter(a=>a.year===p.year),expired=p.contract.years<=0,signed=p.signedYear===p.year,canGo=!expired||signed,showOffers=(expired||p.requested)&&!signed;
 return `<p class="eyebrow">休賽期 / ${p.year} 賽季結算</p><h3>${got.length?got.map(a=>e(a.title)).join('、'):'今年沒有拿到頭銜'}</h3><p class="muted">本季加分 ${got.reduce((x,a)=>x+a.pts,0)} · 生涯分 ${legend()}（${tierOf(legend())}）· 年薪入帳 ${p.contract.salary} 萬</p>
 <h4>${signed?`已簽約：${e(tn(p.contract.team))}，${p.contract.years} 年`:expired?'合約到期，選擇下一份合約':`合約還剩 ${p.contract.years} 年`}</h4>
 ${showOffers?(p.offers.length?`<ul class="pro-offers">${p.offers.map((o,i)=>`<li><span><b>${e(tn(o.team))}</b>${o.renew?'（續約）':''}<small>${W.REGION[W.team(o.team).region].name} · 隊伍強度 ${W.strength(o.team).toFixed(1)} · ${o.start?'保證先發':'需要競爭先發'}</small></span><span>${o.years} 年 · 年薪 ${o.salary} 萬</span><button class="quiet" data-offer="${i}">簽約</button></li>`).join('')}</ul>`:'<p class="note">沒有隊伍提出合約。</p>'):''}
 <div class="pro-actions">${canGo?`<button class="primary" id="proNextYear">進入 ${p.year+1} 賽季 →</button>`:''}${!expired&&!p.requested&&!signed?'<button class="quiet" id="proRequest">申請轉隊（教練信任 -10）</button>':''}${c.age>=23||(expired&&!p.offers.length)?'<button class="quiet" id="proRetire">宣布退役</button>':''}</div>`;}
function sign(o){const p=P(),c=CAREER.data;p.teamsPlayed||=[p.team];if(!p.teamsPlayed.includes(o.team))p.teamsPlayed.push(o.team);if(o.team!==p.team){W.moveUser(o.team);c.trust=50;p.chem=45;pickRival();p.log.push(`轉隊加盟 ${tn(o.team)}（${o.years} 年，年薪 ${o.salary} 萬）`);}else p.log.push(`與 ${tn(o.team)} 續約 ${o.years} 年`);p.contract={team:o.team,years:o.years,salary:o.salary};p.signedYear=p.year;}
function ageStats(){GROWTH.age(CAREER.data);}
function pathFor(forced){const c=CAREER.data,st=c.stats;if(st.awareness>=70&&st.teamwork>=70&&c.trust>=55)return ['轉任教練','你把多年的比賽經驗帶進教練席，開始培養下一代選手。'];if(c.fans>=1500&&st.awareness>=60)return ['成為賽評','你坐上賽評席，用最懂選手的角度解說每一波團戰。'];if(c.fans>=800)return ['全職實況主','你開始全職直播，一路支持你的粉絲每天都來看你。'];return forced?['離開職業舞台','沒有隊伍提出合約，你的職業生涯在這裡畫下句點。']:['回歸生活','你離開了舞台，帶著這段回憶開始新的人生。'];}
function retire(forced){const p=P(),c=CAREER.data,v=legend(),[path,text]=pathFor(forced);p.ended={year:p.year,age:c.age,score:v,tier:tierOf(v),path,text};p.log.push(`${c.age} 歲宣布退役`);}
function renderEnding(hub){const p=P(),c=CAREER.data,en=p.ended,rv=p.rival;
 hub.innerHTML=`<div class="careerhead"><div><p class="eyebrow">生涯結局 / ${en.year} 年・${en.age} 歲退役</p><h2>${e(en.tier)}・${e(c.name)}</h2></div></div><div class="careergrid"><article class="panel ending-card pro-ending"><h3>${e(en.path)}</h3><p>${e(en.text)}</p><p class="pro-ending-stats">出賽 <b>${p.games}</b> 局・粉絲 <b>${c.fans}</b>・存款 <b>${p.money}</b> 萬</p>${rv?`<p class="muted">宿敵交手紀錄：${rv.w} 勝 ${rv.l} 敗</p>`:''}<button class="primary" id="proNewCareer">開始新的生涯 →</button></article><article class="panel"><h3>生涯成就</h3>${p.achievements.length?`<ul class="pro-history">${p.achievements.map(a=>`<li><span>${a.year} ${e(a.title)}</span><b>+${a.pts}</b></li>`).join('')}</ul>`:'<p class="muted">沒有頭銜，但每一場比賽都算數。</p>'}</article></div>`;
 hub.querySelector('#proNewCareer').onclick=()=>CAREER.create();}
function renderHub(){const hub=$q('#careerHub');if(!hub)return;if(P().ended){renderEnding(hub);return;}ensureLife();const c=CAREER.data,p=P(),t=W.team(us()),R=W.REGION[t.region],ph=W.PHASES[p.phase][1];
 hub.innerHTML=`<div class="careerhead"><div><p class="eyebrow">${e(c.name)} / ${e(t.name)}（${R.name}） / ${c.age} 歲 · ${ROLE[c.role]}</p><h2>${p.year} 賽季・${ph}</h2></div><button id="proReset" class="quiet">${confirmReset?'再按一次，確定重新開始':'重新開始生涯'}</button></div>
 <div class="careergrid"><article class="panel"><div class="playerstats">${[['mechanics','操作'],['awareness','判斷'],['teamwork','配合']].map(([k,n])=>`<span>${n}<b>${c.stats[k]}</b></span>`).join('')}<span>選手能力<b>${W.userRating()}</b></span><span>教練信任<b>${c.trust}</b></span></div>
 <p class="muted">每週剩餘訓練 ${training} 次 · 粉絲 ${c.fans}</p>${lifeLine()}${newsCard()}${rivalCard()}${squadCard()}${scrimCard()}<div class="courses"></div>
 ${eventCard()}${ffCard()}<div class="pro-next">${nextPanel()}</div>${p.log.length?`<p class="eyebrow">最近戰果</p><ul class="pro-history">${p.log.slice(-5).reverse().map(x=>`<li><span>${e(x)}</span></li>`).join('')}</ul>`:''}</article>
 <article class="panel">${standingsPanel()}</article></div><div class="careergrid"><article class="panel">${rosterPanel()}</article><article class="panel">${historyPanel()}</article></div>`;
 if(window.GROWTH)GROWTH.decorate(hub,c,!p.live,()=>renderHub());
 hub.querySelector('#proReset').onclick=()=>{if(!confirmReset){confirmReset=true;renderHub();return;}confirmReset=false;try{localStorage.removeItem('nexus-life-career-v1');}catch{}location.reload();};
 hub.querySelectorAll('[data-pcourse]').forEach(b=>b.onclick=()=>{if(!training||p.live)return;c.stats[b.dataset.pcourse]=Math.min(100,c.stats[b.dataset.pcourse]+2);training--;save();renderHub();});
 hub.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;renderHub();});
 const on=(id,f)=>{const n=hub.querySelector('#'+id);if(n)n.onclick=f;};
 hub.querySelectorAll('[data-scrim]').forEach(b=>b.onclick=()=>scrim(b.dataset.scrim));
 on('proWeek',()=>{if(p.event)return;W.week();GROWTH.tick(c);squadWeek();training=3;view=null;rollEvent();save();renderSetup();});
 on('proFast',()=>{if(p.event)return;for(let i=0;i<120;i++){if(training>0)autoTrain(c);const r=W.week();GROWTH.tick(c);squadWeek();if(r!=='ok'||W.PHASES[P().phase][0]==='off')break;}training=3;view=null;rollEvent();save();renderSetup();});
 hub.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{const ev=EVENTS[p.event.i],o=ev.o[+b.dataset.event];applyEffects(o[1]);p.log.push(`${ev.t}：${o[2]}`);p.event=null;save();renderSetup();});
 on('proBenchSim',()=>{const me=P().players.find(x=>x.user),sub=subOf(),u=W.userSeries(),opp=u.sr.a===us()?u.sr.b:u.sr.a;P().benched=(P().benched||0)+1;if(sub){me.starter=false;sub.starter=true;}W.simUser();if(sub){me.starter=true;sub.starter=false;}const sr=u.sr;
  const won=sr.w===us();CAREER.data.trust=Math.min(100,CAREER.data.trust+(won?1:5));if(sub)sub.form=Math.min(3,(sub.form||0)+(won?1:-1));sq().prep=null;sq().call=null;p.log.push(`${tn(us())} ${sr.a===us()?sr.s.join(':'):[...sr.s].reverse().join(':')} ${tn(opp)}（替補 ${sub?.name||''} 先發）`);save();renderSetup();});
 on('proSimSeries',()=>{const u=W.userSeries();if(!u)return;simSeriesQuick(u);save();renderSetup();});
 on('proFF',fastForward);on('proFfClose',()=>{p.ffSummary=null;save();renderSetup();});
 hub.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{p.plan=b.dataset.plan;save();renderSetup();});
 on('proStartSeries',()=>{const u=W.userSeries();P().live={bo:u.sr.bo,score:[0,0],fear:[],games:[],blueUs:W.strength(us())>=W.strength(u.sr.a===us()?u.sr.b:u.sr.a),draft:null};save();openDraft();});
 on('proDraftGo',openDraft);
 hub.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>{sign(p.offers[+b.dataset.offer]);save();renderSetup();});
 on('proRequest',()=>{p.requested=true;c.trust=Math.max(0,c.trust-10);if(!p.offers?.length)p.offers=genOffers();save();renderSetup();});
 on('proRetire',()=>{retire(p.contract.years<=0&&!p.offers.length);save();renderSetup();window.scrollTo(0,0);});
 on('proNextYear',()=>{W.week();ageStats();training=3;view=null;ensureLife();save();renderSetup();window.scrollTo(0,0);});
 on('proSimRest',()=>{const L=P().live,u=W.userSeries(),opp=u.sr.a===us()?u.sr.b:u.sr.a,need=Math.ceil(L.bo/2);while(L.score[0]<need&&L.score[1]<need){const g=W.simGame(us(),opp,L.fear,L.blueUs);L.fear.push(...g.picks);if(g.aWin){L.score[0]++;L.blueUs=false;}else{L.score[1]++;L.blueUs=true;}}endSeries(opp);});
}
function endSeries(opp){const p=P(),L=p.live;rivalResult(opp,L.score[0]>L.score[1]);p.games=(p.games||0)+L.score[0]+L.score[1];p.log.push(`${tn(us())} ${L.score[0]}:${L.score[1]} ${tn(opp)}`);W.resolveUser(L.score);p.live=null;sq().prep=null;sq().call=null;save();draftEl.hidden=true;$q('#setup').hidden=false;renderSetup();}

// ---------- BP 盤 ----------
function heroBtn(i,d,mineSide){const h=ROSTER[i],tags=DRAFT.TAGS[i].tags.map(t=>DRAFT.TAG_NAME[t]).join('・');const theirs=d.picks[mineSide==='B'?'R':'B'],lane=theirs[h.role];let hint='';
 if(lane!=null){const m=DRAFT.matchup(i,lane);hint=m>0?`<em class="good">克制 ${e(ROSTER[lane].name)}</em>`:m<0?`<em class="bad">被 ${e(ROSTER[lane].name)} 克制</em>`:'';}
 return `<button class="pro-hero ${i===draftSel?'picked':''}" data-dhero="${i}" aria-pressed="${i===draftSel}"><strong>${e(h.name)}</strong><small>${ROLE[h.role]} · 熟練 ${Math.round(heroes[i].mastery)} · ${tags}${sq().prep?.hero===i?" · 練習賽演練過 +5%":""}</small>${hint}${DRAFT.foeNote(d,mineSide,i)}</button>`;}
function slots(d,s,label,mineSide){const side=s===mineSide;return `<div class="pro-side ${s==='B'?'blue':'red'} ${side?'mine':''}"><h4>${label}${side?'（我方）':''}</h4>${DRAFT.banRow(d,s)}${[0,1,2,3,4].map(r=>`<div class="pro-slot"><small>${ROLE[r]}</small>${(()=>{const pl=d.sides?.[s]?.players?.[r];if(!pl)return '';const you=side&&r===CAREER.data?.role;return `<span class="slot-pl${you?' you':''}">${e(you?(CAREER.data?.name||'你'):pl.name||'')}${you?'（你）':''}${pl.rating?` · ${Math.round(pl.rating)}`:''}</span>`;})()}${DRAFT.face(d.picks[s][r],'pick')}<b>${d.picks[s][r]!=null?e(ROSTER[d.picks[s][r]].name):'…'}</b></div>`).join('')}<div class="pro-notes">${DRAFT.compNotes(d.picks[s]).map(([k,t])=>`<span class="${k}">${t}</span>`).join('')}</div></div>`;}
function openDraft(){const p=P(),L=p.live,u=W.userSeries();if(!L||!u)return;const me0=p.players.find(x=>x.user);if(me0&&window.GROWTH)me0.pool=GROWTH.pool(CAREER.data.role);const opp=u.sr.a===us()?u.sr.b:u.sr.a,mine=L.blueUs?'B':'R';
 if(!L.draft){const S=W.side(us()),O=W.side(opp);L.draft=L.blueUs?DRAFT.create(S,O,L.fear):DRAFT.create(O,S,L.fear);L.draft.mine=mine;}
 draftNeed=DRAFT.run(L.draft,{side:mine,role:CAREER.data.role,trust:trust()});save();renderDraft(opp);}
const lockBar=kind=>`<div class="bp-lock">${draftSel==null?`<span>先點一隻英雄${kind==='pick'?'':'（建議禁用）'}</span>`:`<span>已選：<b>${e(ROSTER[draftSel].name)}</b></span>`}<button class="primary" id="proLock" ${draftSel==null?'disabled':''}>${kind==='pick'?'鎖定英雄':'確認建議禁用'}</button></div>`;
function renderDraft(opp){const p=P(),L=p.live,d=L.draft,mine=d.mine,c=CAREER.data;$q('#setup').hidden=true;$q('#match').hidden=true;draftEl.hidden=false;
 const bn=mine==='B'?tn(us()):tn(opp),rn=mine==='R'?tn(us()):tn(opp),step=DRAFT.ORDER[d.step];
 let center='';
 if(draftNeed?.need==='suggest'){center=`<h3>我方第 ${DRAFT.ORDER.slice(0,d.step+1).filter(([s,t])=>s===mine&&t==='ban').length} / 5 手禁用：向教練建議</h3><p class="muted">採納機率取決於教練信任（目前 ${c.trust}）。也可以跳過，讓教練自己決定。</p><div class="pro-roles">${ROLE.map((r,i)=>`<button class="quiet" data-drole="${i}">${r}</button>`).join('')}</div><div class="pro-grid">${DRAFT.available(d,draftRole??c.role).map(i=>heroBtn(i,d,mine)).join('')}</div>${lockBar('suggest')}<button class="quiet" id="proSkip">這一手交給教練</button><button class="quiet" id="proSkipAll">本場都交給教練</button>`;}
 else if(draftNeed?.need==='pick'){center=`<h3>輪到你選 ${ROLE[c.role]}</h3><p class="muted">綠色＝克制對面同位置，紅色＝被克制，橘色＝對面選手的招牌或熟練英雄。Fearless：這個系列賽已用過的英雄不能再選。</p><div class="pro-grid">${DRAFT.available(d,c.role).sort((a,b)=>heroes[b].mastery-heroes[a].mastery).map(i=>heroBtn(i,d,mine)).join('')}</div>${lockBar('pick')}`;}
 else{const ev=DRAFT.evaluate(d.picks[mine],d.picks[mine==='B'?'R':'B']);center=`<h3>BP 完成</h3><p>陣容評估：${ev.team>.15?`<b class="good">我方占優（+${Math.round(ev.team*10)}%）</b>`:ev.team<-.15?`<b class="bad">對手占優（${Math.round(ev.team*10)}%）</b>`:'雙方接近'} · 你的對線：${ev.lanes[c.role]>0?'<b class="good">有利</b>':ev.lanes[c.role]<0?'<b class="bad">不利</b>':'均勢'}</p><div class="pro-actions"><button class="primary" id="proPlay">上場比賽 →</button><button class="quiet" id="proSimGame">直接模擬這局</button></div>`;}
 draftEl.innerHTML=`<p class="eyebrow">${e(W.userSeries().comp.name)} / Bo${L.bo} · 第 ${L.score[0]+L.score[1]+1} 局 · 系列賽 ${L.score[0]}:${L.score[1]}</p><h1>BP <span>${step?`${step[0]==='B'?'藍方':'紅方'}${step[1]==='ban'?'禁用':'選角'}中（第 ${d.step+1} / 20 手）`:'完成'}</span></h1>
 ${window.ACADEMY_BP?ACADEMY_BP.track(d):''}
 <div class="pro-board">${slots(d,'B',`藍方 ${e(bn)}`,mine)}<div class="pro-center">${center}<ol class="pro-log">${d.log.slice(-6).reverse().map(x=>`<li>${x.note?e(x.note):`${x.side==='B'?'藍':'紅'}方${x.type==='ban'?'禁用':'選擇'} ${x.hero>=0?e(ROSTER[x.hero].name):'—'}`}</li>`).join('')}</ol></div>${slots(d,'R',`紅方 ${e(rn)}`,mine)}</div>
 ${L.fear.length?`<p class="muted">Fearless 已鎖：${L.fear.map(i=>e(ROSTER[i].name)).join('、')}</p>`:''}<button class="quiet" id="proBack">返回賽季主畫面（保留進度）</button>`;
 draftEl.querySelectorAll('[data-drole]').forEach(b=>b.onclick=()=>{draftRole=+b.dataset.drole;renderDraft(opp);});
 draftEl.querySelectorAll('[data-dhero]').forEach(b=>b.onclick=()=>{draftSel=+b.dataset.dhero;renderDraft(opp);});
 const on=(id,f)=>{const n=draftEl.querySelector('#'+id);if(n)n.onclick=f;};
 on('proLock',()=>{const i=draftSel;if(i==null)return;draftSel=null;if(draftNeed?.need==='suggest'){d.suggest[DRAFT.suggestKey(d.step)]=i;d.log.push({note:`你建議禁用 ${ROSTER[i].name}`});}else if(draftNeed?.need==='pick'){DRAFT.apply(d,i);}draftRole=null;openDraft();});
 on('proSkip',()=>{draftSel=null;d.suggest[DRAFT.suggestKey(d.step)]=-1;openDraft();});
 on('proSkipAll',()=>{draftSel=null;d.suggestOff=true;openDraft();});
 on('proBack',()=>{draftEl.hidden=true;$q('#setup').hidden=false;renderSetup();});
 on('proPlay',()=>launch(opp));
 on('proSimGame',()=>{const ev=DRAFT.evaluate(d.picks[mine],d.picks[mine==='B'?'R':'B']),lanes=ev.lanes.reduce((x,v)=>x+v,0)/5,pr=1/(1+Math.exp(-((W.strength(us())-W.strength(opp))/7+ev.team*.9+lanes*.4+(sq().prep?.opp===opp?.15:0)+(sq().prep?.hero===d.picks[mine][CAREER.data.role]?.1:0))));gameDone(opp,Math.random()<pr,null);});
 if(!SCROLLED.has(d)){SCROLLED.add(d);window.scrollTo(0,0);}}
let draftRole=null;

// ---------- 上場：把 BP 結果帶進戰場 ----------
function launch(opp){const p=P(),L=p.live,d=L.draft,mine=d.mine,mp=d.picks[mine],tp=d.picks[mine==='B'?'R':'B'],c=CAREER.data;
 role=c.role;selected=mp[c.role];draftEl.hidden=true;CAREER.battleStart();
 const ev=DRAFT.evaluate(mp,tp),R0=W.roster(us()),R1=W.roster(opp);state.proGame={opp,series:L.score.join(':')};
 state.actors.forEach(a=>{const i=a.team?tp[a.role]:mp[a.role],h=heroes[i];a.power*=h.power/heroes[a.heroIndex].power;a.heroIndex=i;a.heroName=h.name;
  const pl=(a.team?R1:R0)[a.role],sign=a.team?-1:1;a.power*=Math.pow(pl.rating/85,1.6)*(1+sign*ev.team*.10)*(1+sign*ev.lanes[a.role]*.08);
  const pv=sq().prep;if(!a.team&&pv){if(pv.opp===opp)a.power*=1.03;if(a.player&&pv.hero===i)a.power*=1.05;}});
 const sm=document.querySelectorAll('.scorebar small');if(sm[0])sm[0].textContent=`${mine==='B'?'BLUE':'RED'} / ${tn(us())}`;if(sm[2])sm[2].textContent=`${mine==='B'?'RED':'BLUE'} / ${tn(opp)}`;}
function gameDone(opp,win,s){const p=P(),L=p.live,d=L.draft,c=CAREER.data;L.fear.push(...d.picks.B,...d.picks.R);L.games.push({win,picks:[...d.picks.B,...d.picks.R]});
 if(win)L.score[0]++;else L.score[1]++;L.blueUs=!win;L.draft=null;draftNeed=null;
 if(s){const rating=CAREER.rating(s);c.trust=Math.max(0,Math.min(100,c.trust+Math.round((rating-6)*2)));c.fans+=win?20:rating>=7?8:3;GROWTH.addMastery(selected,win?4:2,true);pushForm(rating);window.SCORE?.rec(p,rating,1);}
 const need=Math.ceil(L.bo/2);if(L.score[0]>=need||L.score[1]>=need){endSeries(opp);return;}save();draftEl.hidden=true;$q('#setup').hidden=false;renderSetup();}
const proFinish=finish;
finish=function(){const was=state?.done;proFinish();if(was||!state?.done||!state.proGame||!P()?.live)return;const s=state,win=s.winner===0||(s.winner==null&&s.kills[0]>s.kills[1]);const opp=s.proGame.opp;state.proGame=null;
 const L=P().live,score=[L.score[0]+(win?1:0),L.score[1]+(win?0:1)],r=$q('#result');if(r){const n=document.createElement('p');n.className='note';n.textContent=`職業賽 · 系列賽 ${score[0]}:${score[1]}。回到賽季主畫面繼續。`;r.prepend(n);}
 gameDone(opp,win,s);$q('#setup').hidden=true;$q('#match').hidden=false;};

// ---------- 掛到現有畫面 ----------
const prevTrain=$q('#train').onclick;$q('#train').onclick=ev=>{const c=CAREER.data;if(c?.pro){if(training&&!P().live&&GROWTH.addMastery(selected,8,false)){training--;save();renderSetup();}return;}prevTrain?.(ev);};
const prevRender=renderSetup;
renderSetup=function(){prevRender();const c=CAREER.data;if(!c){countryField();return;}
 if(!c.country){c.country=window.START_COUNTRY||'TW';save();}
 if(c.pro&&W.data!==c.pro)W.attach(c.pro);if(!c.pro&&W.data)W.attach(null);
 const hub=$q('#careerHub');if(!hub)return;
 if(c.pro){renderHub();proHeader();const st=$q('#start');if(st)st.hidden=true;const tr=$q('#train');if(tr){tr.disabled=!training||!!P().live;tr.textContent=`訓練所選英雄 · 剩餘 ${training} 次`;}return;}
 const st=$q('#start');if(st)st.hidden=false;
 const [cn,,t0]=W.COUNTRIES[c.country],t=c.proTeam||t0,r=W.REGIONS.find(x=>x.teams.some(y=>y[1]===t)).id;if(!hub.querySelector('.pro-origin')){const o=document.createElement('p');o.className='muted pro-origin';o.textContent=`出發地：${cn} → ${W.REGION[r].name}・${tn0(r,t)} 二軍`;hub.querySelector('.careerhead')?.after(o);}
 if(c.stage==='complete')promoCard(hub);};
// life-ui 每 250ms 重畫頂部列；職業模式在它之後覆寫
function proHeader(){const c=CAREER.data;if(!c?.pro||!P())return;const t=W.team(us()),put=(id,v)=>{const n=document.getElementById(id);if(n&&n.textContent!==v)n.textContent=v;};put('lifeMeta',`${t.name} · ${ROLE[c.role]} · ${c.age} 歲`);put('lifeSeason',`${P().year} 賽季 · ${W.PHASES[P().phase][1]}`);put('lifePhase',P().live?'系列賽進行中':W.userSeries()?'本週有比賽':'職業一軍');}
const prevDraw=draw;draw=function(){prevDraw();proHeader();};
renderSetup();
window.PRO={legend,retire,sign,genOffers,yearEnd,renderHub,openDraft,launch,get need(){return draftNeed;}};
})();
