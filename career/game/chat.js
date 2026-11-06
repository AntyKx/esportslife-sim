'use strict';
// 0.55 比賽轉播：主播口播＋直播聊天室。依戰況產生（擊殺、死亡、塔、龍、巴龍、經濟差、你的表現）。
// 只讀比賽狀態、不改任何東西，也不用 Math.random（用自己的亂數），所以不會影響比賽結果。
(()=>{
let seed=(Date.now()%2147483647)||1;const R=()=>((seed=Math.imul(seed^seed>>>13,1597334677)+1013904223>>>0)/4294967296);
const pick=a=>a[Math.floor(R()*a.length)];
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CASTER=['主播 林恩','球評 老K'];
const NAMES=['霧河觀眾','夜貓不睡覺','中路小學生','打野都在睡','補刀機器人','鹹魚翻身','路過的鑽晶','金焰卡關中','巔峰夢想家','網咖常客','輔助才是本體','射手要錢','開團就對了','視野在哪','後期無敵','前期送完了','吃瓜群眾','嘴砲王','真心粉絲','老觀眾','剛下課','爸媽在旁邊','零點還在看','藍方信徒','紅方死忠','逆風翻盤','教練你看','數據分析師','分推大師','聲音很大'];
const nick=()=>pick(NAMES)+(R()<.5?Math.floor(R()*99):'');

// 依情境分類的聊天內容（{p}＝你的名字，{h}＝你的英雄，{t}＝我方隊名，{o}＝對方隊名）
const LINES={
 youKill:['{p} 這波漂亮！！','{h} 太會玩了吧','教科書級操作','+2 +2 +2','這就是天才中路？','{p} 是要起飛了','777777','剪輯師準備好了','這反應速度是人嗎','我宣布 {p} 今天 MVP'],
 youMulti:['連殺！！！','{p} 一打多！！','這什麼神仙操作','直接把對面打穿','我人在現場我都站起來了','這波可以重播十次','{h} 這版本是不是太強','傳奇開始了'],
 youDie:['{p} 又倒了？','這波純送','走位跟我阿嬤一樣','{h} 不是這樣玩的吧','0 視野硬上？','{p} 你在幹嘛','醒醒啊','又來送了','這個死亡很沒必要','教練臉都黑了'],
 youFeed:['{p} 是對面派來的嗎','退役吧','這 KDA 我看不下去','換人換人','{p} 今天是來觀光的？','建議直接下去','送頭仔又來了','比賽結束我要去他留言區','這是職業水準？','對面的 MVP 是 {p}'],
 youAssist:['{p} 支援好快','這個助攻很關鍵','{p} 視野意識不錯','團隊型選手 +1'],
 teamKill:['{t} 打得好！','這波團戰漂亮','{t} 加油！！','拿下了！','穩穩穩'],
 teamDie:['{t} 在幹嘛','又被抓了','這團不該開','{o} 好強','視野呢？？','先別打啊'],
 tower:['推塔推塔','塔沒了','經濟拉開了','{t} 節奏不錯'],
 towerLost:['塔又掉了','守不住啦','{o} 推進好快','防守在哪'],
 dragon:['龍拿到了！','控龍大師','這條龍很重要','{t} 物件意識好'],
 dragonLost:['龍又被拿走','打野在幹嘛','龍坑沒人？','{o} 控圖好兇'],
 baron:['巴龍！！！','巴龍到手 這波贏了','{t} 要結束了嗎','拿下巴龍 全場沸騰'],
 baronLost:['巴龍被拿了...','完了完了','還有機會嗎','守高地啊'],
 ahead:['{t} 穩了吧','這場好看','經濟領先很多','{t} 今天狀態好','輕鬆贏'],
 behind:['逆風了...','還能打嗎','{t} 撐住','等後期','先發換人吧','GG?'],
 idle:['好看','這版本誰最強','主播聲音好好聽','剛來 現在幾比幾','{h} 是我本命','有人一起看嗎','吃宵夜看比賽','這地圖好漂亮','{p} 加油','中路對線好緊張','打野快來','有沒有人賭誰贏','我覺得 {o} 會贏','{t} 衝啊','LUL','???','笑死'],
 win:['GG！！！','{t} 贏了！！','{p} 今天帥','恭喜恭喜','這場值回票價','冠軍相！'],
 lose:['GG...','下次再來','{t} 還要加油','{p} 檢討一下','可惜了','對面太強']
};
const CAST={
 youKill:['{p} 操作著 {h} 拿下擊殺！','好！{p} 這波處理得非常乾淨！'],
 youMulti:['不可思議！{p} 一個人打出了連殺！','這就是 {p} 的實力，全場都在為他歡呼！'],
 youDie:['{p} 被抓到了，這波位置太前。','可惜，{p} 倒下了，{t} 要小心了。'],
 teamKill:['{t} 打出了漂亮的團戰！','{t} 這波配合非常好！'],
 teamDie:['{o} 抓住機會，{t} 損失慘重。','{t} 這波團戰處理得不夠好。'],
 tower:['{t} 推掉了一座防禦塔。'],towerLost:['{o} 拿下了一座防禦塔。'],
 dragon:['{t} 成功拿下元素龍！'],dragonLost:['{o} 偷到了這條龍。'],
 baron:['{t} 拿下巴龍！這可能是比賽的轉捩點！'],baronLost:['{o} 拿下巴龍，{t} 陷入危機！'],
 ahead:['{t} 目前經濟領先超過三千。'],behind:['{t} 落後了，需要找機會。'],
 win:['比賽結束！{t} 贏下這一局！'],lose:['比賽結束，{o} 拿下勝利。']
};

let box=null,cur=null,prev=null,queue=[],viewers=0,lastFlush=0,idleAt=0,recent=[],casterLine='',hype=0;
let who=null;
function teamsNow(){const L=window.WORLD?.data?.live,c=window.CAREER?.data,d=L?.draft||(c?.stage==='playing'?c.pending?.draft:null);
 if(d&&d.sides){const m=d.mine||'B';return {t:d.sides[m].name,o:d.sides[m==='B'?'R':'B'].name};}return {t:'逐光',o:'赤潮'};}
function names(){const c=window.CAREER?.data,me=state?.actors?.find(a=>a.player);who=who||teamsNow();return {p:c?.name||'你',h:me?.heroName||'',t:who.t,o:who.o};}
const fill=(s,n)=>s.replace(/\{(\w)\}/g,(_,k)=>n[k]||'');
function say(kind,count=1){const n=names(),pool=LINES[kind];if(!pool)return;for(let i=0;i<count;i++)queue.push({u:nick(),t:fill(pick(pool),n),k:kind});if(CAST[kind]&&R()<.85)casterLine=fill(pick(CAST[kind]),n);}
function baseViewers(){const L=window.WORLD?.data?.live,c=window.CAREER?.data;if(L){const key=WORLD.PHASES?.[WORLD.data.phase]?.[0]||'';return ['worlds','msi','fs'].includes(key)?180000:42000;}if(c)return 300+(c.fans||0)*3;return 120;}
function snap(s){const me=s.actors.find(a=>a.player);return {k:[...s.kills],tw:[...(s.towers||[0,0])],dr:[...(s.drakes||[0,0])],baron:s.baron?.alive,buff:[...(s.heroBuff||[0,0])],pk:s.personal?.kills||0,pd:s.personal?.deaths||0,pa:s.personal?.assists||0,gold:[...s.gold],done:s.done,t:s.time,meDead:me?.dead>0};}
function diff(s){const n=snap(s),p=prev;prev=n;if(!p)return;
 if(n.pk>p.pk){const quick=recent.filter(x=>n.t-x<12).length;recent.push(n.t);if(quick>=1){say('youMulti',4);hype+=3;}else{say('youKill',2+Math.floor(R()*2));hype+=1.5;}}
 if(n.pd>p.pd){const k=n.pk,d=n.pd;say(d>=3&&d>k+1?'youFeed':'youDie',2+Math.floor(R()*2));hype+=.5;}
 if(n.pa>p.pa&&n.pk===p.pk&&R()<.6)say('youAssist',1);
 const tk=n.k[0]-p.k[0]-(n.pk-p.pk),ok=n.k[1]-p.k[1];if(tk>=2)say('teamKill',2);else if(tk===1&&R()<.4)say('teamKill',1);if(ok>=2&&n.pd===p.pd)say('teamDie',2);else if(ok===1&&n.pd===p.pd&&R()<.35)say('teamDie',1);
 if(n.tw[1]<p.tw[1])say('tower',1);if(n.tw[0]<p.tw[0])say('towerLost',1);
 if(n.dr[0]>p.dr[0])say('dragon',1+Math.floor(R()*2));if(n.dr[1]>p.dr[1])say('dragonLost',1+Math.floor(R()*2));
 if(p.baron&&!n.baron){if(n.buff[0]>n.t)say('baron',3),hype+=3;else if(n.buff[1]>n.t)say('baronLost',2);}
 const gd=n.gold[0]-n.gold[1],pg=p.gold[0]-p.gold[1];if(gd>3000&&pg<=3000)say('ahead',2);if(gd<-3000&&pg>=-3000)say('behind',2);
 if(n.done&&!p.done){say(s.winner===0?'win':'lose',5);hype+=4;}
 // 閒聊依真實時間，加速播放時才不會洗版；有戰況留言排隊時不插閒聊
 const now=performance.now();if(now-idleAt>2600+R()*3200&&!n.done&&queue.length<2){idleAt=now;say('idle',1);}}
// 0.56 版面：戰場右邊放轉播＋聊天室；暫停與加速移到戰場上方的工具列
function layout(){const stage=document.querySelector('#match .broadcast-stage');if(!stage)return null;let row=stage.parentElement.classList.contains('stage-row')?stage.parentElement:null;
 if(!row){row=document.createElement('div');row.className='stage-row';stage.before(row);row.append(stage);}
 const tools=document.querySelector('#match .cast-camera-tools'),pause=document.querySelector('#pause'),speed=document.querySelector('#speed');
 if(tools&&pause&&speed&&!tools.querySelector('#pause')){const g=document.createElement('div');g.className='speed-tools';const rb=document.createElement('button');rb.id='recallBtn';rb.className='quiet';rb.type='button';rb.title='回城（B）：原地詠唱 8 秒傳回主堡，受到攻擊會中斷';rb.textContent='回城 B';rb.onclick=recall;g.append(rb,pause,speed);tools.append(g);}
 return row;}
// 你的英雄回城：附近有敵人會先撤退，安全了就原地詠唱（macro.js goHome）
function recall(){const p=state?.actors?.find(a=>a.player);if(!p||p.dead>0||state.done)return;if(p.recalling){p.recalling=false;p.recallAt=null;return;}p.recalling=true;p.recallAt=null;}
addEventListener('keydown',ev=>{if((ev.key==='b'||ev.key==='B')&&!ev.target.closest?.('input,textarea')&&state&&!document.querySelector('#match')?.hidden)recall();});
function recallLabel(){const b=document.querySelector('#recallBtn'),p=state?.actors?.find(a=>a.player);if(!b||!p)return;const t=p.dead>0?'回城 B':p.recallAt!=null?`回城中 ${Math.max(0,8-(state.time-p.recallAt)).toFixed(1)}`:p.recalling?'撤退中…':'回城 B';if(b.textContent!==t)b.textContent=t;b.classList.toggle('on',p.recallAt!=null||!!p.recalling);}
function ensureBox(){if(box&&box.isConnected)return box;const row=layout();if(!row)return null;box=document.createElement('details');box.id='liveChat';box.className='live-chat';box.open=true;
 box.innerHTML='<summary><span class="lc-live">LIVE</span> 直播轉播 <small id="lcViewers"></small></summary><div class="lc-caster" id="lcCaster"></div><ul class="lc-list" id="lcList" aria-live="off"></ul>';row.append(box);return box;}
function flush(){const now=performance.now(),gap=queue.length>8?160:380;if(now-lastFlush<gap||!queue.length)return;lastFlush=now;queue=queue.slice(-14);const m=queue.shift(),list=box.querySelector('#lcList');
 const li=document.createElement('li');li.className='lc-'+m.k;li.innerHTML=`<b style="color:hsl(${(m.u.length*47)%360} 55% 62%)">${e(m.u)}</b> ${e(m.t)}`;list.append(li);while(list.children.length>40)list.firstChild.remove();fitList(list);list.scrollTop=list.scrollHeight;}
// 桌機：聊天室跟戰場一樣高，訊息只在框內捲動
function fitList(list){if(!box?.parentElement?.classList.contains('stage-row')||innerWidth<=1100){list.style.height='';return;}const stage=box.parentElement.querySelector('.broadcast-stage');if(!stage)return;const h=Math.max(140,Math.round(stage.getBoundingClientRect().bottom-list.getBoundingClientRect().top-8));if(Math.abs((parseFloat(list.style.height)||0)-h)>2)list.style.height=h+'px';}
// 0.74 戰術事件（macro.js story）：入侵、一級團擊殺、gank 成敗、反野、越塔，主播與聊天室即時反應
const CAMP_TXT={red:'紅 Buff',blue:'藍 Buff',gromp:'大青蛙',wolves:'狼群',raptors:'火鳥',krugs:'石頭怪',scuttle:'河道蟹'};
const STORY={
 style:{cast:['{x} 這支隊伍的風格是「{s}」，看他們今天怎麼打。','注意 {x}：{s}。'],us:['看我們的 {f}','今天就靠 {f} 了'],them:['對面 {f} 很兇喔','小心他們的 {f}']},
 invade:{cast:['{x} 一開場就五個人摸進對面野區！這是要入侵！','好大膽！{x} 開局直接入侵！'],us:['衝啊入侵！','一級團開打','莽就對了','這開局我喜歡'],them:['對面來入侵了！','小心埋伏','快回防野區']},
 lvl1kill:{cast:['一級團就見血了！{a} 拿下 {v}！','開局就有擊殺！{a} 打得太積極了！'],us:['一級團賺爆','開局就領先','這入侵太值了'],them:['一級團被打崩','開局就送','這開局完了']},
 gank:{cast:['{a} 已經往{l}移動了，目標是 {v}。','打野 {a} 出現在{l}附近，{v} 要注意！'],us:['打野來了','準備抓人','{l} 要開打了'],them:['{l} 小心！','對面打野來了','快退快退']},
 gankKill:{cast:['{a} 這波 gank 完美！{v} 被抓掉了！','{l}的配合太漂亮了，{a} 帶走 {v}！'],us:['抓到了！！','打野帶飛','這節奏太好','+1 +1'],them:['又被抓','{v} 沒眼嗎','對面打野住在{l}了']},
 gankFail:{cast:['{v} 反應很快，{a} 這波空手而回。','{a} 的 gank 被看穿了，白跑一趟。'],us:['白跑了','可惜','下次再來'],them:['躲掉了！','{v} 好穩','對面打野浪費時間']},
 buffSteal:{cast:['入侵有收穫！{a} 直接拿走了對面的{c}！','{a} 把對面的{c}搶走了，開局就佔到便宜！'],us:['Buff 搶到了','入侵成功','開局賺翻'],them:['Buff 被偷了','開局就虧','打野要哭了']},
 matchup:{cast:['{l}的對位，{a} 對上 {v}，{x} 這邊明顯佔上風。','注意{l}：{a} 這個對位克制 {v}，看 {x} 怎麼利用。'],us:['{l}穩了','這對位我們賺','{a} 打 {v} 很舒服'],them:['{l}要苦了','這對位被克','{l}先忍住']},
 solokill:{cast:['單殺！{a} 在{l}一個人帶走 {v}！','{a} 的對線壓制力太強了，單殺 {v}！'],us:['單殺！！','線上打爆','這就是實力差距'],them:['被單殺了','{v} 對線打不過','線上被打穿']},
 call:{cast:['{s}！','現場聽得到語音：{s}。'],us:['好判斷','聽指揮','穩'],them:['他們在溝通','對面有在講話']},
 moment:{cast:['{s}這個決定，結果看起來{r}。','{p} 的判斷——{s}，{r}！'],us:['{r}','剛剛那個決定{r}','好的指揮'],them:['{r}']},
 counterjungle:{cast:['{a} 偷偷摸進對面野區，拿走了{c}！','反野！{a} 趁對面打野不在，吃掉了{c}。'],us:['反野成功','偷吃開心','對面野區是我們的'],them:['野怪被偷了','對面打野在我家吃飯','誰來看一下野區']},
 dive:{cast:['越塔！{a} 頂著防禦塔強殺 {v}！','好果斷！{a} 直接越塔帶走 {v}！'],us:['越塔！！','塔下也照殺','太有魄力'],them:['塔下都會死','這越塔太狠','防禦塔是裝飾嗎']},
};
let storyIdx=0;
function storySay(ev){const T=STORY[ev.type];if(!T)return;const n=names(),ours=ev.team===0;
 const v={...n,a:ev.who||'',v:ev.victim||'',l:ev.lane||'',c:CAMP_TXT[ev.camp]||'野怪',x:ours?n.t:n.o,s:ev.label||'',f:({top:'上路',mid:'中路',bot:'下路'})[ev.focus]||''};
 if(ev.type==='style'&&!ev.label)return;if(ev.type==='moment'){v.s=`${ev.label}選擇「${ev.choice}」`;v.r=ev.result==='win'?'打得漂亮':ev.result==='lose'?'代價不小':'雙方都沒佔到便宜';}if(ev.type==='call')v.s=ev.label||'';
 casterLine=fill(pick(T.cast),v);const pool=ours?T.us:T.them;const k=ev.type==='gank'||ev.type==='style'?1:2;for(let i=0;i<k;i++)queue.push({u:nick(),t:fill(pick(pool),v),k:'story'});hype+=ev.type==='gank'||ev.type==='style'?.5:2;}
function update(){if(typeof state==='undefined'||!state||!state.actors)return;if(!ensureBox())return;
 if(cur!==state){cur=state;who=null;prev=null;queue=[];recent=[];hype=0;idleAt=performance.now();viewers=baseViewers();storyIdx=0;box.querySelector('#lcList').innerHTML='';casterLine='比賽開始！雙方選手進入戰場。';say('idle',2);}
 diff(state);{const st=state.story||[];for(;storyIdx<st.length;storyIdx++)storySay(st[storyIdx]);}hype=Math.max(0,hype-.002);viewers=Math.round(baseViewers()*(1+Math.min(1.5,hype*.08))*(1+state.time/3600*.4));
 box.querySelector('#lcViewers').textContent=`${viewers.toLocaleString()} 人觀看`;const cl=box.querySelector('#lcCaster');const ct=casterLine?`<b>${CASTER[Math.floor(state.time/20)%2]}</b>${e(casterLine)}`:'';if(cl.dataset.t!==casterLine){cl.dataset.t=casterLine;cl.innerHTML=ct;}
 recallLabel();flush();}
const prevDraw=draw;draw=function(){const r=prevDraw.apply(this,arguments);try{update();}catch(err){}return r;};
window.LIVE_CHAT={update,get queue(){return queue;}};
})();
