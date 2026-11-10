/* 我的足球人生：遊戲本體(預覽)。從 0 歲出生，時間自己往前走(1× 一年約 36 秒)；出生依全世界各國出生人數抽。
   能力值用足球人生的九項能力與雷達圖，童年身體自然長大，踢球讓技術進步；上限由隱藏天分決定。第一版只到 18 歲十字路口。
   資料:js/world.js(各國、名字)、shared/fl-data.js(足球人生的小人、國旗、聯賽、球隊)。亂數獨立(mulberry32)。 */
(()=>{'use strict';
const FL=window.FL||{};
const lookOf=(n,k)=>FL.lookOf?FL.lookOf(n,k):{}, pixelFF=(...a)=>FL.pixelFF(...a);
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let rng=Math.random;
const mul=a=>()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
const R=()=>rng(), pick=a=>a[Math.floor(R()*a.length)], chance=p=>R()<p, gauss=()=>{ let u=0,v=0; while(!u)u=R(); while(!v)v=R(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const wpick=(arr,w)=>{ const t=arr.reduce((s,x)=>s+w(x),0); let x=R()*t; for(const a of arr){ x-=w(a); if(x<0)return a; } return arr[arr.length-1]; };
/* ---------- 各國資料 ----------
   b:每年出生(千人，約略值)、fc:孩子踢有組織足球的風氣 0–1、gf:女生踢球相對男生、inc:所得 1 低～4 高、c:城市(含鄉下)、nm:名字庫、lk:外型參考(主遊戲國籍)、nat:主遊戲有的國籍 */
const {C,CN_K,NM,JOBS,HOME}=window.WORLD;
const mkName=(nm,sex,last)=>{ const p=NM[nm]||NM.en, l=last||pick(p.l), g=pick(sex==='f'?p.f:p.m); return {full:p.o==='lf'?l+(p.s||'')+g:g+' '+l,last:l}; };
const FOCUS=[['ball','踢球'],['study','念書'],['family','陪家人'],['play','玩樂休息'],['work','打工幫家裡']];
const STAGE=['還沒碰過足球','街頭、空地踢球','社區／學校球隊','地區代表隊','職業俱樂部青訓'];
const SPY=36; /* 1× 時一年幾秒(整段人生約 45 分鐘) */
/* ---------- 狀態 ---------- */
let Z=null;
const birth=(sex)=>{ const c=window.ML_FORCE_C&&C.find(x=>x.k===window.ML_FORCE_C)||wpick(C,x=>x.b), /* ML_FORCE_C:只給模擬工具指定國家用 */ s=sex||(R()<.512?'m':'f'), q=1+Math.floor(R()*5), ci=Math.floor(R()*c.c.length), city=c.c[ci], rural=/鄉下|村落|小鎮|山區|高地|河岸|三角洲/.test(city);
  return {c,s,q,city,rural}; };
function newLife(){
  const seed=(Date.now()^Math.floor(Math.random()*1e9))>>>0; rng=mul(seed);
  const b=birth(window.ML_FORCE_S), me=mkName(b.c.nm,b.s), w=clamp(b.c.inc+(b.q-3)*.6+(b.rural?-.6:0),1,5.5);
  const momA=Math.round(clamp(29-(4-b.c.inc)*2.2+gauss()*4,17,44)), dadA=Math.round(clamp(momA+2+gauss()*3,18,55));
  const job=()=>pick(JOBS[clamp(Math.round(w-.5+gauss()*.6),1,4)]);
  const sibs=Math.max(0,Math.round((5-b.c.inc)*.55+gauss()*1.1-(b.q-3)*.15)), older=Math.min(sibs,Math.floor(R()*(sibs+1)));
  const month=1+Math.floor(R()*12), year=2026;
  const talent=clamp(R()**2.2,0,1); /* 天分:多數普通，少數很高 */
  Z={seed,b,me:me.full,sex:b.s,year,month,t:0,w,talent,
    look:Object.assign(lookOf(me.full,b.c.lk),b.s==='f'?{style:pick(['long','pony','bun','bowl','mid'])}:{}),
    mom:{n:mkName(b.c.nm,'f',NM[b.c.nm]?.o==='lf'?pick(NM[b.c.nm].l):null).full,a:momA,j:job()},dad:{n:mkName(b.c.nm,'m',me.last).full,a:dadA,j:job()},sibs,older,
    home:HOME[clamp(Math.round(w*1.2-.4+gauss()*.5),0,6)],
    st:{fame:0,hp:clamp(Math.round(60+b.c.inc*6+gauss()*8),25,95),joy:clamp(Math.round(62+gauss()*10),20,95),edu:0,ball:0,fam:clamp(Math.round(55+gauss()*12),15,95)},
    stage:0,club:null,evAt:{},pos:null,focus:'play',log:[],map:[],peers:[],ask:null,done:false,auto:false,speed:1,ff:false,pending:[]};
  Z.st.hp=clamp(Z.st.hp,20,98); useKeys(); Z.ab=Object.fromEntries(ALLK.map(k=>[k,1])); Z.pot=Object.fromEntries(ALLK.map(k=>[k,clamp(Math.round(24+46*Math.pow(talent,2.4)+gauss()*5),18,80)])) /* 頂尖潛力很稀有 */; Z.bias=Object.fromEntries(ALLK.map(k=>[k,.6+R()*.8]));
  Z.foot=R()<.02?'雙腳':R()<.2?'左腳':'右腳'; Z.tags=[]; while(Z.tags.length<3){ const x=pick(['好勝','冷靜','愛笑','固執','害羞','有領袖氣質','好奇心強','樂觀','敏感','愛表現','細心','膽子大','不服輸','溫和']); if(!Z.tags.includes(x))Z.tags.push(x); }
  { const X=window.CHO; Z.tr={}; Z.chUsed={}; if(X){ for(const k in X.TR)Z.tr[k]=clamp(Math.round(45+gauss()*8),20,80); for(const t of Z.tags)for(const [k,v] of Object.entries(X.TAG2TR[t]||{}))if(k in Z.tr)Z.tr[k]=clamp(Z.tr[k]+v,5,95); } }
  newMoney(); Z.ach=[]; Z.pq=[];
  Z.iq=chance(.07)?.8+R()*.2:clamp(.45+gauss()*.17,.05,.85); /* 足球頭腦:看比賽、懂戰術的天分，影響教練、球評與視野成長 */
  Z.gift=AB.slice().sort((x,y)=>Z.bias[y]*Z.pot[y]-Z.bias[x]*Z.pot[x])[0]; Z.momLook=Object.assign(lookOf(Z.mom.n,b.c.lk),{style:pick(['long','pony','bun'])});
  Z.ph='youth'; Z.kids=0; Z.wed=null; Z.job=null; Z.post=null; Z.offers=null; Z.car={lg:null,club:null,hist:[],apps:0,g:0,as:0,caps:0,ig:0,inNT:0,troph:[],aw:[],wc:[],best:0,peak:0};
  Z.die=Math.round(clamp(b.c.le+gauss()*9+(b.q-3)*1.2,30,101)); /* 壽命:當地平均壽命附近，家境好一點多活一點(看不到) */
  /* 世代名單:世界各地同一年出生、也愛踢球的孩子(依「出生人數 × 足球風氣」抽)，做成一張有背號、位置的名單 */
  for(let i=0;i<4;i++){ const c=wpick(C,x=>x.b*x.fc), s=R()<.7?'m':'f', n=mkName(c.nm,s).full; const used=new Set(Z.peers.map(p=>p.no)); let no; do{ no=2+Math.floor(R()*22); }while(used.has(no)); Z.peers.push({n,c,s,no,pos:pick(['GK','DF','DF','MF','MF','FW','FW']),stage:R()<c.fc?1:0,ball:0,talent:clamp(R()**1.8,0,1),q:1+Math.floor(R()*5),quit:false,note:'剛出生'}); }
  log(`${Z.year} 年 ${Z.month} 月，你出生在${b.c.n}${b.city}，一個${['','最窮的 20%','偏窮的 20–40%','中間的 40–60%','偏富裕的 60–80%','最富裕的 20%'][b.q]}家庭，是個${b.s==='m'?'男孩':'女孩'}。${Z.older?`上面有 ${Z.older} 個哥哥姊姊。`:'你是家裡第一個孩子。'}`,'big');
  const tot=C.reduce((s,x)=>s+x.b,0); fact(`全世界一年約有 1.3 億個嬰兒出生，大約每 ${Math.round(tot/b.c.b).toLocaleString()} 個就有 1 個生在${b.c.n}（聯合國人口資料）。`);
}
function fact(d,tx){ if(typeof d==='function')d=d(tx); if(!d||!Z.log[0])return; Z.fseen=Z.fseen||{}; if(Z.fseen[d])return; Z.fseen[d]=1; Z.log[0].d=d; } /* 每則資料一段人生只出現一次 */
function log(t,k=''){ if(t&&Z.log.slice(0,14).some(l=>l.t===t&&l.a===Math.floor(Z.t)))return; /* 同一年不重複同一句 */ Z.log.unshift({a:Math.floor(Z.t),t,k}); if(Z.log.length>700)Z.log.length=700; }
const OUTK=['sta','pac','sho','dri','pas','vis','phy','def','hea'], GKK=['ref','gkp','cmd','kic','phy','sta'], ALLK=[...new Set([...OUTK,...GKK])];
let AB=OUTK, SKILL=['sho','dri','pas','vis','def','hea'], PHYS=['sta','pac','phy'];
/* 門將用撲救、站位、出擊、腳下技術＋對抗、體能(同足球人生) */
function useKeys(){ const gk=Z&&Z.pos==='GK'; AB=gk?GKK:OUTK; SKILL=gk?['ref','gkp','cmd','kic']:['sho','dri','pas','vis','def','hea']; PHYS=gk?['sta','phy']:['sta','pac','phy']; }
function becomeGK(){ const A=Z.ab; if(A.ref<=1){ A.ref=Math.max(1,Math.round((A.pac+A.phy)/2)); A.gkp=Math.max(1,A.vis); A.cmd=Math.max(1,Math.round((A.hea+A.phy)/2)); A.kic=Math.max(1,A.pas); } useKeys(); }
const abCap=k=>Z.pot[k]*Math.min(1,(Math.floor(Z.t)+2)/20);
const abAdd=(k,v)=>{ const cap=abCap(k), cur=Z.ab[k]; Z.ab[k]=clamp(Math.round((cur+(cur>=cap&&v>0?v*.15:v))*10)/10,1,80); };
const ovr=()=>Math.round(AB.reduce((s,k)=>s+Z.ab[k],0)/AB.length);
const syncBall=()=>{ Z.st.ball=clamp(Math.round(ovr()*1.25),0,100); };
/* add('ball',v):踢球的進步分到技術能力(每段人生有自己的偏好) */
const trm=k=>Z.tr&&Z.tr[k]!=null?.9+Z.tr[k]/500:1; /* 性格加成:50 分＝1.0 */
const add=(k,v)=>{ if(Z.tr&&k in Z.tr){ Z.tr[k]=clamp(Math.round(Z.tr[k]+v),0,100); return; } if(k!=='ball'&&Z.ab&&k in Z.ab){ abAdd(k,v); syncBall(); return; } if(k==='joy'&&v<0&&Z.tr&&Z.tr.resi!=null)v*=1.15-Z.tr.resi/250; if(k==='ball'){ for(const a of SKILL)abAdd(a,v*.85*Z.bias[a]*(.6+R()*.8)); syncBall(); return; } Z.st[k]=clamp(Math.round(Z.st[k]+v),0,100); };
/* 踢球的門路:國家足球風氣 × 家境 × 城鄉 × 性別 */
const access=(c,q,rural,s)=>clamp(c.fc*(s==='f'?c.gf:1)*(.55+q*.1)*(rural?.75:1)*(c.inc>=3?1.1:1),0,1.2);
/* ---------- 事件(每年結算時抽) ---------- */
const EV=[
 {a:[1,4],p:.5,d:'世界衛生組織的研究：大多數孩子在 8 到 18 個月大之間學會自己走路。',t:()=>`你學會走路了，跌倒了好幾次。`,f:()=>add('joy',3)},
 {a:[2,6],p:()=>.35*Z.b.c.fc,d:'國際足總 2006 年的統計：全世界約有 2.65 億人在踢足球。',c:()=>Z.stage===0,t:()=>`${pick(['生日禮物是一顆小皮球','鄰居哥哥把一顆舊球丟給你','你在巷口追著別人的球跑'])}。你踢了一整個下午。`,f:()=>{ Z.stage=1; add('ball',4); add('joy',4); },star:1},
 {a:[3,9],p:.4,d:'國際足總統計：2022 年卡達世界盃決賽，全球約有 15 億人收看。',c:()=>[2026,2030,2034,2038].includes(Z.year+Math.floor(Z.t)),t:()=>`世界盃開打。${Z.dad.n}抱著你看轉播，${Z.b.c.n}${(FL.NATS&&FL.NATS[Z.b.c.k]?FL.NATS[Z.b.c.k].wc>=50:(Z.b.c.wcq||0)>=.3)?'有打進決賽圈，整條街都在歡呼':'沒有打進決賽圈，大家看別國的比賽'}。`,f:()=>{ add('joy',3); if(Z.stage===0&&chance(.3)){ Z.stage=1; log('從那天起，你開始拿任何圓的東西來踢。','star'); } }},
 {a:[1,10],p:()=>.08*(5-Z.b.c.inc),d:'聯合國統計：2022 年全球約有 490 萬個孩子在 5 歲前過世，大多死於可以預防的疾病。',t:()=>pick(['你發高燒住院了幾天。','一場腹瀉讓你瘦了一圈。','你得了肺炎，媽媽守了你好幾個晚上。']),f:()=>{ add('hp',-10); add('joy',-3); }},
 {a:[6,6],p:1,d:'聯合國教科文組織：全世界約有 2.5 億名學齡兒童沒有上學。',t:()=>Z.b.c.inc===1&&Z.w<2.2&&chance(.35)?'家裡付不太起學費，你晚了一年才上學。':'你上小學了。',f:()=>add('edu',6)},
 {a:[12,12],p:1,t:()=>'你上國中了，功課一下子變重。',f:()=>{}},
 {a:[15,15],p:1,d:t=>t.includes('幫家裡')?'國際勞工組織與聯合國兒童基金會：2020 年全世界約有 1.6 億名兒童在做童工。':null,t:()=>Z.st.edu>45?'你考上了高中。':Z.b.c.inc<=2&&Z.w<2.5?'你沒有繼續升學，開始幫家裡做事。':'你進了一所普通的高中。',f:()=>{}},
 {a:[5,14],p:()=>Z.focus==='ball'?.25:.08,c:()=>Z.stage>=1,t:()=>pick(['你一腳把球踢進鄰居家窗戶，被罵了一頓。','你在空地上一個人過了三個大孩子，大家都停下來看你。','你的球鞋開口笑了，用膠帶纏著繼續踢。','下雨天你還在泥巴裡踢球，回家被媽媽罵。']),f:()=>{ add('ball',2); add('joy',2); }},
 {a:[4,17],p:.12,t:()=>pick([`${Z.dad.n}換了工作，全家搬到另一區。`,'家裡多了一個弟弟。','家裡多了一個妹妹。','奶奶搬來跟你們一起住。']),f:()=>add('fam',2)},
 {a:[6,17],p:()=>.07*(5-Z.w),d:'世界銀行：全球約有 7 億人生活在極端貧窮線（每天 2.15 美元）以下。',t:()=>pick(['家裡這一年過得很緊，常常只吃得起最便宜的東西。','爸爸失業了好幾個月。','家裡為了醫藥費借了錢。']),f:()=>{ add('joy',-6); add('fam',-3); Z.w=clamp(Z.w-.2,1,5.5); }},
 {a:[8,17],p:.08,c:()=>Z.stage>=2,t:()=>pick(['你扭傷了腳踝，休息了一個月。','練球時撞到頭，教練讓你休息兩週。']),f:()=>{ add('hp',-6); add('ball',-2); }},
 {a:[9,17],p:.1,t:()=>pick(['你交到一個很要好的朋友。','你第一次喜歡上一個人。','你跟最好的朋友吵架，一個月沒說話。']),f:()=>add('joy',chance(.7)?4:-4)},
 {a:[10,17],p:()=>Z.focus==='study'?.2:.06,t:()=>pick(['你的數學考了全班第一。','老師說你很適合念書。','你參加科展得了獎。']),f:()=>add('edu',5)},
 {a:[13,17],p:()=>Z.w<2.5?.25:.04,c:()=>Z.focus!=='work',t:()=>'家裡希望你放學後去打工，貼補家用。',f:()=>{ add('fam',2); add('joy',-2); }},
 {a:[10,17],p:.06,c:()=>Z.stage>=2&&Z.st.ball>50,t:()=>'比賽後有個陌生人一直在看你，他說他是球探，但後來沒有消息。',f:()=>add('joy',2)}
];
/* 地區風味(童年) */
const RG=k=>({BR:'sa',AR:'sa',UY:'sa',CO:'sa',PE:'sa',EC:'sa',CL:'sa',PY:'sa',BO:'sa',VE:'sa',MX:'sa',GT:'sa',CR:'sa',EN:'eu',SC:'eu',ES:'eu',DE:'eu',FR:'eu',IT:'eu',NL:'eu',PT:'eu',BE:'eu',HR:'eu',RS:'eu',PL:'eu',CZ:'eu',AT:'eu',CH:'eu',SE:'eu',NO:'eu',DK:'eu',GR:'eu',RU:'eu',UA:'eu',TR:'eu',
 NG:'af',GH:'af',SN:'af',CI:'af',CM:'af',CD:'af',ET:'af',KE:'af',TZ:'af',UG:'af',AO:'af',MZ:'af',ZA:'af',EG:'me',MA:'me',DZ:'me',SD:'me',SA:'me',IQ:'me',IR:'me',YE:'me',AF:'me',IN:'sa2',PK:'sa2',BD:'sa2',NP:'sa2',JP:'ea',KR:'ea',CN:'ea',TW:'ea',HK:'ea'})[k]||'x';
EV.push(
 {a:[6,13],p:.18,c:()=>Z.stage>=1&&RG(Z.b.c.k)==='sa',t:()=>pick(['你在水泥地上踢五人制，球小、場小，腳下越來越細。','社區辦了一場街頭盃，你們隊靠一顆倒掛拿了冠軍。','巷口的老人說你踢球的樣子，像他年輕時看過的某個人。']),f:()=>{ add('ball',2); add('joy',3); }},
 {a:[7,14],p:.16,c:()=>Z.stage>=1&&RG(Z.b.c.k)==='af',t:()=>pick(['你們用塑膠袋和繩子綁成一顆球，在沙地上踢到天黑。','村子辦了一場比賽，獎品是一隻羊，你們隊贏了。','你光著腳踢球，腳底磨出了一層厚繭。']),f:()=>{ add('ball',2); add('joy',3); }},
 {a:[7,14],p:.14,c:()=>Z.stage>=1&&RG(Z.b.c.k)==='eu',t:()=>pick(['週日一早，爸爸開車送你去打少年聯賽，場邊都是家長。','你第一次進球場看職業比賽，記住了每一首加油歌。','冬天的球場結了霜，教練還是要你們跑完圈。']),f:()=>{ add('ball',1.5); add('joy',2); }},
 {a:[6,15],p:.15,c:()=>RG(Z.b.c.k)==='sa2',t:()=>pick(['鄰居的孩子都在打板球，你是少數想踢足球的。','你在學校的泥巴操場上踢球，雨季一來就停了好幾個月。','電視上播的是板球，你卻偷偷熬夜看歐洲足球。']),f:()=>add('joy',1)},
 {a:[6,15],p:.13,c:()=>RG(Z.b.c.k)==='ea',t:()=>pick(['補習班下課已經晚上九點，你只能在路燈下踢一下。','學校的足球社只有十幾個人，有時湊不滿一隊。','你們的球場一半被拿去停車。']),f:()=>{ add('edu',1); }},
 {a:[8,15],p:.12,c:()=>RG(Z.b.c.k)==='me',t:()=>pick(['夏天太熱，你們都等太陽下山才開始踢。','齋戒月的晚上，整條街的孩子都出來踢球。','你在海邊的沙灘上練盤帶。']),f:()=>{ add('ball',1); add('joy',2); }},
 {a:[9,16],p:.06,c:()=>Z.stage>=2,t:()=>'你在少年賽決賽踢進致勝球，被隊友抬起來繞場。',f:()=>{ add('joy',6); add('ball',1); },star:1},
 {a:[11,17],p:.05,d:'國際足總 2019 年調查：全球約有 1,300 萬名女性參加有組織的足球。',c:()=>Z.stage>=2&&Z.sex==='f',t:()=>pick(['有人說女生踢什麼足球，你用一個過人回答他。','學校沒有女足，你跟男生一起練。']),f:()=>add('joy',2)});
/* 成年事件(18 歲以後)；ph:pro／amateur／retired／any */
const EVA=[
 {a:[18,34],ph:'pro',p:.12,t:()=>pick(['你在客場被噓了整場，下一場你用一個進球回應。','你的球衣在主場賣到缺貨。','隊長在更衣室說了一段話，那場你們逆轉了。','你在德比賽中被罰下場，被球迷罵了一整週。']),f:()=>add('joy',chance(.6)?4:-4)},
 {a:[19,33],ph:'pro',p:.08,d:t=>t.includes('薪水晚發')?'國際職業球員工會（FIFPRO）2016 年調查：約 41% 的職業球員曾被拖欠薪水。':null,t:()=>pick(['你的經紀人說有個大合約，最後只是謠言。','俱樂部換了老闆，薪水晚發了三個月。','你在訓練中跟隊友起衝突，被罰款。']),f:()=>add('joy',-3)},
 {a:[20,35],ph:'pro',p:.07,d:t=>t.includes('十字韌帶')?'十字韌帶重建後，職業球員通常要 6 到 9 個月以上才能回到比賽。':null,t:()=>pick(['十字韌帶斷裂，你休息了九個月。','你得了腸胃炎，錯過了一場重要比賽。','反覆的腳踝傷讓你一直踢不到全場。']),f:()=>{ add('hp',-8); for(const k of PHYS)abAdd(k,-1.5); }},
 {a:[20,34],ph:'pro',p:.06,t:()=>`你回到${Z.b.city}，在你小時候踢球的地方辦了一天免費足球營。`,f:()=>{ add('fam',4); add('joy',4); }},
 {a:[22,34],ph:'pro',p:.05,t:()=>'你被選進聯賽的年度最佳陣容。',f:()=>add('joy',5),star:1},
 {a:[18,30],ph:'amateur',p:.12,t:()=>pick(['你換了一份工作，薪水多一點，加班也多一點。','你在公司的五人制比賽拿了 MVP。','你週末帶社區的小朋友踢球，他們叫你教練。','你跟朋友合租了一間小公寓。']),f:()=>add('joy',2)},
 {a:[30,60],ph:'amateur',p:.08,t:()=>pick(['你升職了。','公司裁員，你找了好幾個月的工作。','你開始跑步，想把肚子跑掉。','你帶孩子去看了人生第一場職業比賽。']),f:()=>add('joy',chance(.6)?3:-3)},
 {a:[36,70],ph:'retired',p:.07,t:()=>pick(['以前的隊友辦了一場退役球員友誼賽，你踢了半場就喘不過氣。','電視台回顧你當年的一個進球。','有人在街上認出你，要了一張合照。']),f:()=>add('joy',3)},
 {a:[25,80],ph:'any',p:.05,t:()=>pick(['你搬到一個新的城市。','你養了一隻狗。','你和老朋友聚會，大家聊起小時候踢球的事。']),f:()=>add('joy',2)},
 {a:[45,95],ph:'any',p:.07,t:()=>pick(['你的膝蓋開始在下雨天痛。','醫生要你少吃一點鹽。','你住院開了一次刀，恢復得還算順利。']),f:()=>add('hp',-5)},
 {a:[50,95],ph:'any',p:.05,c:()=>Z.kids>0,t:()=>pick(['你的孫子出生了。','孩子結婚了，你在婚禮上哭了。','孫子問你：「你以前真的會踢球嗎？」']),f:()=>{ add('joy',5); add('fam',4); }},
 {a:[55,95],ph:'any',p:.05,t:()=>`世界盃又開打了，你在家裡看完每一場。`,f:()=>add('joy',2)}];
/* ---------- 每年結算 ---------- */
function yearEnd(){
  useKeys(); goalYear(Math.floor(Z.t));
  const a=Math.floor(Z.t), c=Z.b.c, ac=access(c,Z.b.q,Z.b.rural,Z.sex), st=Z.st, cap=40+Z.talent*60;
  if(a>18){ adultYear(a); flushPost(); if(!Z.done){ fameYear(a); chYear(a); cfYear(a); yevYear(a); moneyYear(a); autoSpend(a); worldYear(a); autoGoal(a); kidYear(a); ownerYear(a); achCheck(); } Z.car.peak=Math.max(Z.car.peak,ovr()); Z.map[a]={joy:st.joy,star:Z.log.some(l=>l.a===a&&l.k==='star')}; return; }
  /* 重心的效果 */
  const f=a<6?'play':Z.focus;
  if(f==='ball'){ if(Z.stage>=1)add('ball',(2+Z.talent*6)*(st.ball<cap?1:.2)*(.3+ac*.8)*trm('disc')); /* 足球環境影響成長:風氣弱的國家約只有巴西的四成多 */ add('joy',2); add('edu',-1); add('hp',1); }
  if(f==='study'){ add('edu',4+R()*3); add('joy',-1); if(Z.stage>=1)add('ball',-1); }
  if(f==='family'){ add('fam',4); add('joy',2); }
  if(f==='play'){ add('joy',3); add('hp',1); if(Z.stage>=1&&a>=4)add('ball',1+Z.talent*2); }
  if(f==='work'){ add('fam',3); add('edu',-2); add('joy',-2); Z.w=clamp(Z.w+.08,1,5.5); }
  if(a>=6&&f!=='study')add('edu',a<15?1.5:.5);
  /* 足球的路 */
  if(Z.stage===0&&a>=3&&a<=13&&chance(ac*.22+(f==='play'?.04:0))){ Z.stage=1; log(pick(['同學拉你一起在操場踢球，你一踢就停不下來。','你在空地上撿到一顆洩了氣的球，修好之後天天踢。','表哥帶你去看了一場地方比賽，回家就吵著要踢球。']),'star'); }
  if(Z.stage===1&&a>=6&&a<=14&&chance(ac*.25+(f==='ball'?.12:0)+(st.ball-30)/250))ask('club');
  if(Z.stage===2&&a>=10&&a<=16&&st.ball>=42&&chance(.15+(st.ball-42)/90+(f==='ball'?.08:0))){ Z.stage=3; log(`你被選進${Z.b.city.replace(/鄉下|村落|小鎮/,'')}地區代表隊，第一次穿上印著地名的球衣。`,'star'); add('joy',6); }
  if(Z.stage===3&&a>=13&&a<=17&&st.ball>=52&&chance((.1+(st.ball-52)/70)*(.4+c.fc*.8)*(c.inc>=3?1.2:.8)*trm('ambi')))ask('scout');
  if(a===12&&Z.stage>=1)ask('mid');
  if(a===15&&Z.stage>=2&&st.edu<45&&chance(.6))ask('parents');
  if(a===6)ask('focus');
  /* 事件 */
  for(const [i,e] of EV.entries()){ if(a<e.a[0]||a>e.a[1])continue; if(Z.evAt[i]!=null&&a-Z.evAt[i]<4)continue; /* 同一件事至少隔 4 年 */ if(e.c&&!e.c())continue; const p=typeof e.p==='function'?e.p():e.p; if(chance(p)){ Z.evAt[i]=a; { const tx=e.t(); log(tx,e.star?'star':''); fact(e.d,tx); } e.f&&e.f(); } }
  if(Z.stage>=1&&a>=6)abAdd('vis',.25*(Z.iq||.45));
  wevYear(a); chYear(a); cfYear(a); yevYear(a); moneyYear(a); worldYear(a); autoGoal(a); prodigyCheck(a); if(Z.pq&&Z.pq.length)flushPost(); achCheck();
  if(a>=2)for(const k of PHYS)abAdd(k,(a<6?1.2:a<12?1.8:2.4)*(.7+Z.talent*.8)*(st.hp/70)*Z.bias[k]); if(a>=3&&Z.stage===0)for(const k of ['dri','vis'])abAdd(k,.3);
  if(Z.stage>=2&&!Z.pos&&a>=9){ const sc={GK:Z.ab.phy+Z.ab.hea*.5+(R()<.1?30:0),DF:Z.ab.def+Z.ab.phy+Z.ab.hea,MF:Z.ab.pas+Z.ab.vis+Z.ab.sta,FW:Z.ab.sho+Z.ab.dri+Z.ab.pac}; delete sc.GK; Z.pos=R()<.09?'GK':Object.keys(sc).sort((x,y)=>sc[y]-sc[x])[0]; if(Z.pos==='GK')becomeGK(); log(`教練讓你踢${{GK:'門將',DF:'後衛',MF:'中場',FW:'前鋒'}[Z.pos]}。`,'star'); }
  syncBall();
  /* 年紀自然變化 */
  add('hp',a<12?.5:0); add('joy',(st.fam-50)/40+(58-st.joy)*.12); /* 快樂會慢慢回到平常 */ if(Z.stage>=1&&a>=3&&f!=='ball'&&f!=='play')add('ball',-.6);
  Z.map[a]={joy:st.joy,star:Z.log.some(l=>l.a===a&&l.k==='star')};
  peersYear(a);
  if(a===18){ ask('cross'); for(const p of Z.peers){ if(p.quit)continue; const lgs=(p.s==='f'?Object.values(WLG):Object.values(FL.LV)).filter(v=>v.par<=26+p.ball*.45&&v.par>=p.ball*.45);
    p.note=p.stage>=4&&p.ball>=55&&lgs.length?`踢上職業：${pick(lgs).n}`:p.stage>=3?pick(['在低級別聯賽當半職業球員','拿到大學足球獎學金','踢業餘，白天上班']):p.stage>=2?'踢業餘，足球是興趣':p.stage>=1?'偶爾在街頭踢球':'從沒踢過足球'; p.quit=true; } }
}
function peersYear(a){ for(const p of Z.peers){ if(p.quit)continue; const ac=access(p.c,p.q,false,p.s), cap=40+p.talent*60;
  if(p.stage===0&&a>=3&&chance(ac*.25)){ p.stage=1; p.note='開始在街頭踢球'; }
  if(p.stage>=1&&a>=3)p.ball=clamp(p.ball+(2+p.talent*6)*(p.ball<cap?1:.2)*(.5+ac*.5)*(R()<.7?1:.3),0,100);
  if(p.stage===1&&a>=6&&a<=14&&chance(ac*.3)){ p.stage=2; p.note='加入了少年球隊'; }
  if(p.stage===2&&a>=10&&p.ball>=48&&chance(.2)){ p.stage=3; p.note='被選進地區代表隊'; }
  if(p.stage===3&&a>=13&&p.ball>=60&&chance(.15*(.4+p.c.fc*.8))){ p.stage=4; p.note='進了職業俱樂部青訓'; }
  if(p.stage>=1&&p.stage<4&&a>=11&&chance(.05+(p.q<=2?.04:0))){ p.quit=true; p.note=pick(['放下足球，專心念書','為了家計不再踢球','受傷後沒有再回到球場','搬家後就沒再踢了']); } } }
/* ---------- 抉擇 ---------- */
const ASK={
 focus:()=>({t:'你六歲了，可以選擇每一年的重心',d:'重心隨時可以在「今年的重心」裡換。踢球會讓球感進步，但要先有機會碰到足球。',o:FOCUS.slice(0,4).map(([k,n])=>({t:n,f:()=>{ Z.focus=k; }}))}),
 club:()=>{ const fee=Z.b.c.inc>=3?'每個月要繳月費':'不用錢，但要自己想辦法到球場'; return {t:'附近的少年球隊在招人',d:`教練看過你在空地踢球，問你要不要來練。${fee}。`,o:[
   {t:'加入球隊',main:1,f:()=>{ Z.stage=2; Z.club=`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}${pick(['少年隊','聯隊','青年足球會','體育會少年部'])}`; if(Z.w<2.6){ add('fam',-3); log('爸媽為了讓你踢球，省下了別的開銷。'); } Z.kidClub=Z.club; log(`你加入了${Z.club}，第一次有了自己的球衣號碼。`,'star'); fact('國際足總 2006 年的統計：全世界約有 3,800 萬名註冊球員，大約每 170 個人才有 1 個。'); add('joy',6); add('ball',3); }},
   {t:'先不要',f:()=>{ log('你還是只在空地上踢。'); }}]}; },
 mid:()=>({t:'國中了，足球還是功課？',d:'重心會影響之後幾年的球感和學業。',o:[
   {t:'全力踢球',main:Z.st.ball>=Z.st.edu,f:()=>{ Z.focus='ball'; }},{t:'先顧功課',main:Z.st.ball<Z.st.edu,f:()=>{ Z.focus='study'; }},{t:'兩邊都顧（重心：玩樂休息）',f:()=>{ Z.focus='play'; }}]}),
 parents:()=>({t:`${Z.mom.n}希望你放下足球`,d:'「你的成績這樣下去，以後怎麼辦？」',o:[
   {t:'堅持踢球',main:Z.st.ball>=60,f:()=>{ Z.focus='ball'; add('fam',-8); log('你跟爸媽大吵了一架，還是每天去練球。'); }},
   {t:'聽爸媽的',f:()=>{ Z.focus='study'; add('joy',-6); log('你把球鞋收進櫃子，開始補習。'); }},
   {t:'跟爸媽約定：成績進步就讓我踢',main:Z.st.ball<60,f:()=>{ Z.focus='study'; add('fam',3); if(Z.st.edu>30)add('ball',0); log('你們各退一步。'); }}]}),
 scout:()=>{ const far=Z.b.c.inc<=2; return {t:'職業俱樂部青訓邀你試訓',d:`對方看了你在地區賽的表現。${far?'球隊在很遠的城市，要離家住宿舍。':'球隊離家不遠，可以通勤。'}`,o:[
   {t:'去試訓',main:1,f:()=>{ if(chance(.55+Z.st.ball/250+(trm('calm')-1))){ Z.stage=4; Z.club=`${pick(['城市','港口','聯合','體育'])}俱樂部 U${Math.min(19,Math.floor(Z.t)+2)}`; log(`試訓通過！你進了職業青訓，${far?'第一次離家住宿舍':'每天放學後去俱樂部訓練'}。`,'star'); fact('英格蘭常被引用的估計：9 歲進入職業青訓的孩子，最後踢上英超的不到 1%。'); add('joy',8); if(far)add('fam',-4); } else { log('試訓沒有通過，教練說你還差一點。','big'); add('joy',-6); } }},
   {t:'留在家鄉',f:()=>{ log('你決定留在家鄉。'); add('fam',4); }}]}; },
 ch:()=>{ const e=window.CHO.CH[Z.chq], tx=fillTxt(Array.isArray(e.tx)?pick(e.tx):e.tx);
   /* 自動抉擇時，選最符合目前性格的(加一點隨機) */
   const sc=e.o.map(o=>Object.entries(o.fx||{}).reduce((t,[k,v])=>t+(Z.tr&&k in Z.tr?(Z.tr[k]-50)*v:0),0)+R()*40), best=sc.indexOf(Math.max(...sc));
   const fxs=o=>Object.entries(o.fx||{}).filter(([k])=>!hideFx(k)).map(([k,v])=>`<i class="${v>0?'up':'dn'}">${chLabel(k)} ${v>0?'+':'−'}${Math.abs(v)}</i>`).join('');
   return {t:fillTxt(e.ti),d:tx,o:e.o.map((o,i)=>({t:fillTxt(o.t),main:i===best,f:()=>doCh(e,o)})) /* 選之前不顯示加減分 */}; },
 mch:()=>{ const M=Z.m, e=MCH.find(x=>x.id===Z.mq), A=e.mk(M), o=A.o.filter(x=>!x.cost||x.cost<=M.bank);
   const sc=o.map(x=>Object.entries(x.fx||{}).reduce((t,[k,v])=>t+(Z.tr&&k in Z.tr?(Z.tr[k]-50)*v:0),0)+R()*40-(x.cost?x.cost/Math.max(1,M.bank)*40:0)+(M.life==='frugal'&&x.cost?-20:0)+(M.life==='lavish'&&x.cost?20:0)), best=sc.indexOf(Math.max(...sc));
   const chips=x=>x.cost?`<i class="dn">存款 −${fm(x.cost)}</i>`:''; /* 只顯示花費，性格與生活的加減分選了才知道 */
   return {t:A.t,d:A.d,o:o.map((x,i)=>({t:x.t+`<span class="cfx">${chips(x)}</span>`,main:i===best,f:()=>{ if(x.cost)M.bank-=x.cost; const fx=x.cost?[['存款',-x.cost,1]]:[]; for(const [k,v] of Object.entries(x.fx||{})){ add(k,v); if(!hideFx(k))fx.push([chLabel(k),v]); } const n0=Z.log.length; x.f&&x.f(x.cost);
     if(Z.log.length>n0){ const L=Z.log[0]; L.r=L.t; L.k='ch'; L.ti=A.t; L.t=x.t; L.fx=fx; } else { log(x.t,'ch'); Object.assign(Z.log[0],{ti:A.t,fx}); } }}))}; },
 end:()=>{ const o=outcome(); return {t:'18 歲的十字路口',d:o,o:[{t:'再出生一次',main:1,f:()=>{ start(); }},{t:'回首頁',f:()=>close()}],end:1}; }
};
function outcome(){ const s=Z.stage, b=Z.st.ball;
  const me=s===4&&b>=72?'你在青訓的最後一年拿到了職業合約。（下一版接上職業生涯）':s===4?'你從職業青訓結業，但沒拿到合約，接下來要找低級別球隊或另謀出路。':s===3?'你是地區代表隊等級的球員，可能走業餘、大學足球或半職業。':s===2?'你一直是社區球隊的一員，足球是你生活裡的快樂。':s===1?'你在街頭和空地踢球長大，從沒進過正式球隊。':'足球從來不是你生活的一部分。';
  const ps=Z.peers.map(p=>`${p.n}（${p.c.n}）：${p.quit?p.note:STAGE[p.stage]}`).join('<br>');
  return `<b>${me}</b><br><br>${Z.year} 世代名單裡的其他人：<br>${ps}`; }
/* ---------- 18 歲以後:職業生涯、業餘人生、退休、終老 ----------
   聯賽與球隊用足球人生的 LV／TEAMS(球隊依強弱排序)；國家隊用 NATS(nt＝入選門檻、tier、wc＝打進世界盃機率)。
   遊戲裡沒有職業聯賽的國家，用「國內聯賽」(虛擬球隊、水準依足球風氣)。 */
const POSN={GK:'門將',DF:'後衛',MF:'中場',FW:'前鋒'};
const isW=()=>Z.sex==='f';
/* 女子聯賽:k＝聯賽代碼(W:國家)、from＝借用男子頂級聯賽的球隊名(加「女足」)，美國用 NWSL 球隊原名 */
const WLG={'W:EN':{n:'英格蘭女子超級聯賽',par:56,c:'EN',from:'ENG',k:12},'W:US':{n:'美國國家女子足球聯賽',par:56,c:'US',list:['Portland Thorns','North Carolina Courage','Washington Spirit','Orlando Pride','Kansas City Current','San Diego Wave','Houston Dash','Seattle Reign','Angel City','Gotham FC','Bay FC','Racing Louisville']},
 'W:ES':{n:'西班牙女子甲級聯賽',par:55,c:'ES',from:'ESP',k:16},'W:DE':{n:'德國女子甲級聯賽',par:54,c:'DE',from:'GER',k:12},'W:FR':{n:'法國女子甲級聯賽',par:53,c:'FR',from:'FRA',k:12},'W:SE':{n:'瑞典女子超級聯賽',par:50,c:'SE',from:'SWE',k:14},
 'W:IT':{n:'義大利女子甲級聯賽',par:48,c:'IT',from:'ITA',k:10},'W:JP':{n:'日本女子職業聯賽',par:48,c:'JP',from:'J1',k:12},'W:NL':{n:'荷蘭女子甲級聯賽',par:47,c:'NL',from:'NED',k:12},'W:BR':{n:'巴西女子甲級聯賽',par:47,c:'BR',from:'BRA',k:16},
 'W:NO':{n:'挪威女子超級聯賽',par:46,c:'NO',from:'NOR',k:10},'W:MX':{n:'墨西哥女子聯賽',par:46,c:'MX',from:'MEX',k:18},'W:AU':{n:'澳洲女子聯賽',par:45,c:'AU',from:'AUS',k:12},'W:DK':{n:'丹麥女子聯賽',par:45,c:'DK',from:'DEN',k:8},
 'W:CN':{n:'中國女子超級聯賽',par:45,c:'CN',from:'CSL',k:12},'W:PT':{n:'葡萄牙女子聯賽',par:44,c:'PT',from:'POR',k:12},'W:KR':{n:'韓國女子 WK 聯賽',par:43,c:'KR',from:'K1',k:8},'W:SC':{n:'蘇格蘭女子超級聯賽',par:42,c:'SC',from:'SCO',k:10},
 'W:BE':{n:'比利時女子超級聯賽',par:42,c:'BE',from:'BEL',k:10},'W:CH':{n:'瑞士女子超級聯賽',par:41,c:'CH',from:'SUI',k:10},'W:AT':{n:'奧地利女子甲級聯賽',par:41,c:'AT',from:'AUT',k:10},'W:CO':{n:'哥倫比亞女子聯賽',par:40,c:'CO',from:'COL',k:16},'W:AR':{n:'阿根廷女子聯賽',par:40,c:'AR',from:'ARG',k:16}};
/* 女足國家隊實力 0 最強～4 */
const WT={US:0,ES:0,EN:0,DE:0,SE:0,FR:0,NL:1,JP:1,BR:1,CA:1,AU:1,NO:1,DK:1,IT:1,KR:2,CN:2,CO:2,NG:2,ZA:2,MX:2,CH:2,AT:2,PT:2,BE:2,SC:2,AR:3,CL:3,VN:3,TH:3,TW:3,PH:3,CR:3,JM:3,GH:3,MA:3,IE:3,PL:3,CZ:3,RU:3};
const LGC=(()=>{ const m={}; for(const [k,n] of Object.entries(FL.NATS||{}))for(const l of n.home||[])m[l]=k; return m; })(); /* 聯賽 → 國家 */
/* 足球大國的低級別職業聯賽(足球人生沒有的級別)：讓職業球員人數接近現實 */
const LOWS={BR:[['巴西丙級聯賽',34],['巴西州聯賽',28]],AR:[['阿根廷 B 級聯賽',31]],JP:[['J3 聯賽',33]],US:[['USL 第一級聯賽',32]],DE:[['德國地區聯賽',33]],IT:[['義大利丁級聯賽',31]],ES:[['西班牙第四級聯賽',32]],FR:[['法國全國聯賽 2',31]],
 MX:[['墨西哥第三級聯賽',30]],KR:[['K3 聯賽',32]],CN:[['中國乙級聯賽',30]],PT:[['葡萄牙第三級聯賽',31]],TR:[['土耳其第三級聯賽',31]],CO:[['哥倫比亞乙級聯賽',33]],UY:[['烏拉圭乙級聯賽',32]],CL:[['智利乙級聯賽',32]],EN:[['英格蘭全國聯賽',36]]};
/* 每一國的半職業／業餘小聯賽 [名稱, 水準, 'p'職業／'s'半職業／'a'業餘]：接在原本級別後面(舊存檔的 LOW:國:序號 不變)。有寫的用真實名稱，其他國家依最低一級的水準自動往下補 */
const LOWX={
 EN:[['全國聯賽北區／南區',31,'s'],['北方超級聯賽／南方聯賽／伊斯米安聯賽',27,'s'],['英格蘭郡級業餘聯賽',20,'a']],
 DE:[['德國高級聯賽',28,'s'],['德國州聯賽',21,'a']],ES:[['西班牙第五級聯賽',27,'s'],['西班牙地區優先聯賽',21,'a']],
 FR:[['法國全國聯賽 3',27,'s'],['法國地區聯賽',21,'a']],IT:[['義大利卓越聯賽',26,'s'],['義大利晉級聯賽',21,'a']],
 PT:[['葡萄牙全國錦標賽',27,'s'],['葡萄牙地區聯賽',21,'a']],NL:[['荷蘭第三級聯賽',33,'s'],['荷蘭第四級聯賽',28,'s'],['荷蘭業餘頂級聯賽',22,'a']],
 BE:[['比利時全國甲級聯賽',33,'s'],['比利時業餘乙級聯賽',28,'s'],['比利時省級聯賽',21,'a']],
 SC:[['蘇格蘭甲級聯賽',32,'s'],['蘇格蘭乙級聯賽',29,'s'],['蘇格蘭高地／低地聯賽',25,'s'],['蘇格蘭業餘聯賽',19,'a']],
 WA:[['威爾斯北部／南部聯賽',25,'s'],['威爾斯地區業餘聯賽',19,'a']],NI:[['北愛爾蘭冠軍聯賽',26,'s'],['北愛爾蘭業餘聯賽',19,'a']],
 JP:[['日本足球聯賽（JFL）',29,'s'],['日本地域聯賽',23,'a']],KR:[['K4 聯賽',28,'s'],['K5 聯賽',22,'a']],
 CN:[['中國足協會員協會冠軍聯賽',26,'s'],['中國城市業餘聯賽',20,'a']],TW:[['台灣企業乙級聯賽',27,'s'],['台灣城市業餘聯賽',20,'a']],
 HK:[['香港甲組聯賽',28,'s'],['香港乙組聯賽',23,'s'],['香港丙組聯賽',18,'a']],MO:[['澳門乙組聯賽',20,'a']],
 IN:[['印度 I 聯賽',29,'s'],['印度 I 聯賽二級',25,'s'],['印度州聯賽',18,'a']],AU:[['澳洲國家超級聯賽（NPL）',32,'s'],['澳洲州級聯賽',26,'s'],['澳洲社區業餘聯賽',20,'a']],
 US:[['USL 第二級聯賽',26,'s'],['美國全國超級聯賽（NPSL）',24,'s'],['美國業餘聯賽',19,'a']],CA:[['安大略一級聯賽',27,'s'],['加拿大業餘聯賽',20,'a']],
 MX:[['墨西哥第四級聯賽',26,'s'],['墨西哥業餘聯賽',20,'a']],BR:[['巴西丁級聯賽',31,'p'],['巴西州聯賽乙級',23,'s'],['巴西業餘聯賽',18,'a']],
 AR:[['阿根廷首都丙級聯賽',27,'s'],['阿根廷聯邦區域業餘聯賽',23,'s'],['阿根廷地方聯賽',18,'a']],TR:[['土耳其第四級聯賽',27,'s'],['土耳其地區業餘聯賽',21,'a']],
 SE:[['瑞典第三級聯賽',30,'s'],['瑞典第四級聯賽',25,'s'],['瑞典地區業餘聯賽',19,'a']],NO:[['挪威第三級聯賽',31,'s'],['挪威第四級聯賽',25,'s'],['挪威地區業餘聯賽',19,'a']],
 DK:[['丹麥第三級聯賽',31,'s'],['丹麥第四級聯賽',26,'s'],['丹麥地區業餘聯賽',19,'a']],RU:[['俄羅斯甲級聯賽',39,'p'],['俄羅斯乙級聯賽',32,'s'],['俄羅斯業餘聯賽',22,'a']],
 UA:[['烏克蘭甲級聯賽',36,'p'],['烏克蘭乙級聯賽',30,'s'],['烏克蘭業餘聯賽',21,'a']],IE:[['愛爾蘭甲級聯賽',27,'s'],['愛爾蘭萊恩斯特高級聯賽',20,'a']]};
(()=>{ const NUM='一二三四五六七八九'; for(const c of C){ if(!LOWS[c.k])LOWS[c.k]=[]; const L=LOWS[c.k], N=FL.NATS&&FL.NATS[c.k], top=N&&N.home?N.home.filter(k=>FL.LV[k]).map(k=>FL.LV[k].par):[c.lp||Math.round(18+c.fc*9)];
  for(const x of L)if(!x[2])x[2]='p';
  if(LOWX[c.k]){ L.push(...LOWX[c.k]); continue; }
  let lv=top.length+L.length, p=Math.min(...top,...L.map(x=>x[1])), add=0;
  while(add<3&&p-5>=22){ p-=5; add++; lv++; L.push([`${c.n}第${NUM[lv-1]}級聯賽`,p,p>=34?'p':'s']); }
  L.push([`${c.n}地區業餘聯賽`,Math.max(8,Math.min(22,p-6)),'a']); } })();
const LOWK=Object.entries(LOWS).flatMap(([c,L])=>L.map((x,i)=>['LOW:'+c+':'+i,x[1],c]));
const lgT=k=>{ if(!k||!String(k).startsWith('LOW:'))return 'p'; const [,c,i]=String(k).split(':'), x=LOWS[c]&&LOWS[c][+i]; return x?x[2]:'p'; }; /* 聯賽性質:p 職業／s 半職業／a 業餘 */
const isAm=lg=>!!lg&&!isW()&&lgT(lg.k)==='a';
/* 半職業聯賽:台灣企甲、澳門、威爾斯、北愛爾蘭，以及沒有正式職業聯賽的國家(遊戲裡的國內聯賽水準低於 26) */
const SEMI=new Set(['TW1','MAC','WAL','NIFL']);
const isSemi=lg=>!!lg&&(!isW()&&lg.k?SEMI.has(lg.k)||lgT(lg.k)!=='p':!lg.k&&lg.par<26);
const homeLg=c=>{ if(isW())return Object.keys(WLG).filter(k=>WLG[k].c===c.k); const N=FL.NATS&&FL.NATS[c.k]; return [...(N&&N.home&&N.home.length?N.home.filter(k=>FL.LV[k]):[null]),...LOWK.filter(x=>x[2]===c.k).map(x=>x[0])]; };
const LEAGUES=()=>isW()?Object.entries(WLG).map(([k,v])=>[k,v.par,v.c]):Object.entries(FL.LV).map(([k,v])=>[k,v.par,LGC[k]]).concat(LOWK);
const lgOf=k=>!isW()&&k&&String(k).startsWith('LOW:')?(()=>{ const [,c,i]=k.split(':'), x=LOWS[c][+i]; return {k,n:x[0],par:x[1],top5:0,lv:x[2]}; })():isW()?(k&&WLG[k]?{k,n:WLG[k].n,par:WLG[k].par,top5:WLG[k].par>=53?1:0}:{k:null,n:`${Z.b.c.n}女子聯賽`,par:Math.round(20+Z.b.c.fc*Z.b.c.gf*16),top5:0}):k&&FL.LV[k]?{k,n:FL.LV[k].n,par:FL.LV[k].par,top5:FL.LV[k].top5}:{k:null,n:Z.b.c.lg||`${Z.b.c.n}國內聯賽`,par:Z.b.c.lp||Math.round(18+Z.b.c.fc*9),top5:0} /* 遊戲聯賽表沒有的國家:用真實國內聯賽名稱與水準(world.js LG) */;
const teamsOf=lg=>isW()&&lg.k&&WLG[lg.k]?(WLG[lg.k].list||(FL.TEAMS[WLG[lg.k].from]||[]).slice(0,WLG[lg.k].k).map(x=>x+'女足')):!isW()&&lg.k&&FL.TEAMS[lg.k]?FL.TEAMS[lg.k]:(()=>{ const cc=lg.k&&String(lg.k).startsWith('LOW:')?(C.find(x=>x.k===lg.k.split(':')[1])||Z.b.c):Z.b.c, tier=lg.k&&String(lg.k).startsWith('LOW:')?+lg.k.split(':')[2]+1:0, nm=[...new Set(cc.c.map(x=>x.replace(/鄉下|村落|小鎮|山區|高地|河岸|三角洲|草原|沙漠|綠洲|山丘|蒙古包|（.*?）/g,'')).filter(x=>x.length>=2))], am=lgT(lg.k)==='a', suf=am?['業餘隊','聯隊','青年會','社區隊','足球會']:['FC','聯','體育會','城','競技'], GX=['鐵路隊','郵政隊','大學隊','銀行隊','礦工隊','海關隊','水泥廠','漁會','紡織廠','青年軍','消防隊','機場隊'], gen=am?['大學校友隊','老兵隊','工人隊','教師隊','市場隊','計程車隊']:tier?[0,1,2,3].map(j=>GX[(tier*4+j)%GX.length]):['國防軍','警察隊','電力隊','港務局']; const out=[]; nm.forEach((x,i)=>{ out.push(x+suf[(i+Z.seed+tier*2)%5]); if(i<2)out.push(x+suf[(i+Z.seed+2+tier*2)%5]); }); return out.concat(gen); })();
/* ---------- 球隊的真實規定與小知識 ---------- */
const clubOK=c=>{ if(!c)return true; const b=c.replace(/女足$/,'');
  if(b==='畢爾包競技')return Z.b.c.k==='ES'&&/畢爾包/.test(Z.b.city); /* 只簽巴斯克球員 */
  if(b==='瓜達拉哈拉')return Z.b.c.k==='MX'; /* 只用墨西哥籍球員 */
  return true; };
const CLUBF={
 '畢爾包競技':'畢爾包競技從 1912 年起只簽巴斯克地區出身或在當地培養的球員，而且從來沒有降級過。',
 '皇家社會':'皇家社會曾經和畢爾包一樣只用巴斯克球員，直到 1989 年才簽下第一位外籍球員。',
 '瓜達拉哈拉':'瓜達拉哈拉（芝華士）只派墨西哥籍球員上場，是墨西哥的傳統豪門。',
 '皇家馬德里':'皇家馬德里是拿下最多次歐洲冠軍聯賽冠軍的球隊。',
 '巴塞隆納':'巴塞隆納的口號是「不只是一家俱樂部」，球隊由會員共同擁有。',
 '馬德里競技':'馬德里競技的主場大都會球場在 2017 年啟用。',
 '拜仁慕尼黑':'拜仁慕尼黑是德甲奪冠次數最多的球隊。',
 '多特蒙德':'多特蒙德主場的南看台被稱為「黃牆」，是歐洲最大的站票看台之一。',
 '尤文圖斯':'尤文圖斯是義甲奪冠次數最多的球隊。',
 '國際米蘭':'國際米蘭在 2010 年拿下義甲、義大利盃與歐冠的三冠王。',
 'AC米蘭':'AC 米蘭拿過 7 次歐洲冠軍，次數僅次於皇家馬德里。',
 '拿坡里':'拿坡里的主場在 2020 年改名為「馬拉度納球場」，紀念這位傳奇。',
 '兵工廠':'兵工廠在 2003–04 球季以整季不敗拿下英超冠軍。',
 '曼聯':'曼聯和利物浦各拿過 20 次英格蘭頂級聯賽冠軍，是最多的兩支球隊。',
 '利物浦':'利物浦的隊歌是〈你永遠不會獨行〉（You\'ll Never Walk Alone）。',
 '曼城':'曼城在 2022–23 球季拿下英超、足總盃與歐冠三冠王。',
 '切爾西':'切爾西在 2012 年第一次拿下歐冠冠軍。',
 '巴黎聖日耳曼':'巴黎聖日耳曼在 2025 年第一次拿下歐冠冠軍。',
 '馬賽':'馬賽在 1993 年成為第一支拿下歐冠的法國球隊。',
 '阿賈克斯':'阿賈克斯以青訓聞名，傳奇球星克魯伊夫就是在這裡長大的。',
 '本菲卡':'本菲卡是葡超奪冠次數最多的球隊，傳奇射手尤西比奧在這裡踢了 15 年。',
 '波圖':'波圖在 2004 年拿下歐冠冠軍，當時的教練是穆里尼奧。',
 '塞爾提克':'塞爾提克在 1967 年成為第一支拿下歐洲冠軍盃的英國球隊，先發 11 人都在格拉斯哥附近出生。',
 '格拉斯哥流浪者':'格拉斯哥流浪者拿過超過 50 次蘇格蘭聯賽冠軍，是世界上國內聯賽冠軍最多的球隊之一。',
 '加拉塔沙雷':'加拉塔沙雷在 2000 年拿下歐洲足協盃，是第一支拿下歐洲主要盃賽的土耳其球隊。',
 '博卡青年':'博卡青年的主場被稱為「糖果盒」，球迷一起跳的時候看台真的會震動。',
 '河床':'河床的主場紀念碑球場是 1978 年世界盃決賽的場地。',
 '弗拉門哥':'弗拉門哥是巴西擁有最多球迷的球隊。',
 '桑托斯':'球王比利職業生涯大部分的時間都效力於桑托斯。',
 '阿赫利':'開羅的阿赫利是非洲冠軍聯賽奪冠次數最多的球隊。',
 '利雅德新月':'利雅德新月是亞冠奪冠次數最多的球隊。',
 '鹿島鹿角':'鹿島鹿角是日本職業聯賽奪冠次數最多的球隊，巴西球星濟科曾在這裡效力。',
 '全北現代':'全北現代是 K 聯賽奪冠次數最多的球隊。',
 '浦和紅鑽':'浦和紅鑽是日本觀眾最多的球隊之一，拿過 3 次亞冠冠軍。'};
function pickTeam(lg,o){ const T=teamsOf(lg), n=T.length, i=clamp(Math.round((.55-(o-lg.par)*.06)*n+gauss()*n*.15),0,n-1); if(!clubOK(T[i])){ const ok=T.filter(clubOK); return ok[Math.min(ok.length-1,i)]; } return T[i]; }
/* 報價:水準跟你差不多的聯賽；本國聯賽優先，外國聯賽依水準與距離 */
function genOffers(o,minPar,maxN){ const c=Z.b.c, home=homeLg(c), cand=[];
  for(const [k,par,ck] of LEAGUES()){ if(par>o+3||par<o-12||par<minPar)continue; let w=Math.exp(-Math.abs(par-(o-3))/4); { const w2=offerW(k,par,ck,home); if(!w2)continue; w*=w2; } cand.push([k,w]); }
  if((!home.length||home[0]===null)&&lgOf(null).par>=minPar&&lgOf(null).par<=o+5&&lgOf(null).par>=o-12)cand.push([null,4]);
  if(!cand.length){ const top=LEAGUES().filter(x=>x[1]>=minPar).sort((x,y)=>y[1]-x[1]).slice(0,4); for(const x of top)cand.push([x[0],home.includes(x[0])?3:1]); } /* 比所有聯賽都強:頂級聯賽來搶人 */
  const out=[], used=new Set(); for(let i=0;i<maxN&&cand.length;i++){ const tot=cand.reduce((s,x)=>s+x[1],0); let r=R()*tot, pk=cand[0]; for(const x of cand){ r-=x[1]; if(r<0){ pk=x; break; } } cand.splice(cand.indexOf(pk),1); if(used.has(pk[0]))continue; used.add(pk[0]); const lg=lgOf(pk[0]); out.push({lg,club:pickTeam(lg,o)}); }
  return out; }
const lgCtry=k=>isW()?(WLG[k]&&WLG[k].c):LGC[k]||(k&&String(k).startsWith('LOW:')?k.split(':')[1]:undefined);
const ofTxt=x=>`${x.club}（${x.lg.n}${x.lg.k&&lgCtry(x.lg.k)&&lgCtry(x.lg.k)!==Z.b.c.k?'・出國':''}）`;
function sign(x,why){ const C2=Z.car, first=!C2.hist.length, yr=Z.year+Math.floor(Z.t), prevC=C2.club, yrsP=C2.hist.filter(h=>h.club===C2.club).length; if(!x.kind)mkOffer(x,first?'free':'buy');
  if(x.kind==='loan'){ const ct=C2.ct||{yrs:1,sal:x.sal}; C2.ct={yrs:1,sal:ct.sal||x.sal,loan:{club:C2.club,lg:C2.lg,yrs:ct.yrs,sal:ct.sal||x.sal}}; C2.loaned=1; }
  else C2.ct={yrs:x.yrs,sal:x.sal};
  if(!Z.no)Z.no=pick({GK:[1,1,12],DF:[2,3,4,5,6],MF:[6,8,10,14,16],FW:[7,9,10,11,19]}[Z.pos]||[7,8,10]);
  if(x.kind==='rich')C2.rich=1; if(x.kind==='home')C2.home=1;
  if(x.kind==='loan')C2.ct.loan.str=C2.str;
  C2.lg=x.lg; C2.club=x.club; Z.club=`${x.club}・${x.lg.n}`; Z.ph='pro'; C2.since=Math.floor(Z.t); { const T=teamsOf(x.lg), i=T.indexOf(x.club); C2.str=i>=0?1-i/T.length:.5; }
  if(x.lg.k&&lgCtry(x.lg.k)&&lgCtry(x.lg.k)!==Z.b.c.k&&!C2.abroad){ C2.abroad=1; log(`你第一次離開${Z.b.c.n}，到國外踢球。`,'star'); fact('CIES 足球觀察站的統計：在國外踢職業的球員，人數最多的是巴西人。'); }
  const terms=x.kind==='loan'?'租期 1 年':`${x.yrs} 年合約、年薪約 ${fm(x.sal)}${x.fee?`，轉會費約 ${fm(x.fee)}`:''}`;
  const semi=isSemi(x.lg); if(!semi)C2.fullPro=1;
  if(first&&isAm(x.lg)){ log(`你加入業餘球隊：${ofTxt(x)}，球隊每年只給一點車馬費（約 ${fm(x.sal)}）。白天你照常上班，晚上和週末練球。`,'star'); fact('多數國家的足球金字塔底層都是業餘聯賽，表現好的球隊可以一級一級升上去。'); add('joy',4); queuePost('sign','加盟',yr); return; }
  if(first&&semi){ log(`你簽下第一份半職業合約：${ofTxt(x)}，${terms}。白天你還要去上班。`,'star'); fact(Z.b.c.k==='TW'?'台灣企業甲級聯賽的球員，很多白天還有正職工作或在學，台灣目前還沒有全職業的足球聯賽。':'半職業聯賽的球員，通常白天還有另一份工作，下班後才去練球。'); add('joy',6); queuePost('sign','加盟',yr); return; }
  if(!first&&!semi&&!C2.fullProLog){ C2.fullProLog=1; }
  log(first?`你簽下第一份職業合約：${ofTxt(x)}，${terms}。`:`${why||({loan:'你被租借到',free:'你以自由球員身分加盟',rich:'你接受高薪邀約，加盟',home:'你回到家鄉，加盟'}[x.kind]||'你轉會到')}${ofTxt(x)}，${terms}。`,'star');
  const cfB=!isW()&&CLUBF[x.club]&&!(C2.cfSeen||(C2.cfSeen={}))[x.club]?CLUBF[x.club]:null; if(cfB)C2.cfSeen[x.club]=1;
  if(cfB)fact(cfB);
  else if(first)fact(isW()?'FIFPRO 2017 年調查：約一半的女足球員沒有從球隊領到薪水。':'FIFPRO 2016 年調查：全球約 45% 的職業球員，月薪不到 1,000 美元。');
  else if(x.fee>=50000)fact('史上最高的轉會費，是 2017 年內馬爾從巴塞隆納轉到巴黎聖日耳曼的 2.22 億歐元。');
  else if(x.kind==='rich'&&x.lg.k==='SAU')fact('2023 年起，C 羅、內馬爾、本澤馬等球星陸續加盟沙烏地職業聯賽。');
  else if(x.kind==='rich'&&x.lg.k==='MLS')fact('美國職業足球大聯盟的「指定球員」規則，讓球隊可以用超出工資帽的薪水簽下少數球星。');
  if(first)add('joy',10); if(x.kind==='home'){ add('fam',5); add('joy',4); }
  if(x.kind!=='loan')queuePost('sign','加盟',yr);
  if(!first&&x.kind!=='loan'){ if(famePts()>=50)log(`${x.club}的球迷在機場擠滿了人，舉著寫你名字的牌子迎接你。`); if(yrsP>=3&&famePts()>=40&&chance(.5))log(`${prevC}的球迷在網路上燒你的舊球衣。`,'big'); }
  if(x.kind!=='loan'&&(first||x.kind==='rich'||x.kind==='home'||(x.fee||0)>=3000||x.lg.par>=52))pressCard(x,first,prevC,yrsP); }
function season(a){ const C2=Z.car, lg=C2.lg, o=ovr(), d=o-lg.par, T=teamsOf(lg), n=T.length, ti=Math.max(0,T.indexOf(C2.club)), str=C2.str!=null?(C2.str=clamp(C2.str+(R()-.5)*.08,.02,.98)):1-ti/n;
  const role=d>=3?'主力':d>=-3?'輪替':'替補', J=injRoll(a), inj=J?clamp(1-J.wk/40,.05,.95):1;
  const app=Math.round((role==='主力'?30+R()*8:role==='輪替'?16+R()*12:3+R()*10)*inj*(lg.k?1:.8));
  const gR={FW:.32,MF:.09,DF:.03,GK:0}[Z.pos||'MF']*clamp(1+d*.05,.5,1.6), aR={FW:.13,MF:.17,DF:.05,GK:.01}[Z.pos||'MF']*clamp(1+d*.04,.5,1.5);
  const g=Math.max(0,Math.round(app*gR*(.6+R()*.8))), as=Math.max(0,Math.round(app*aR*(.6+R()*.8))), rt=Math.round(clamp(6.45+d*.06+(R()-.5)*.6,5.6,8.9)*100)/100;
  const rank=clamp(Math.round((1-str)*(n-1)+gauss()*n*.16+1),1,n), title=rank===1, yr=Z.year+a;
  const cs=Z.pos==='GK'?Math.round(app*clamp(.16+str*.28+d*.01,.05,.55)*(.8+R()*.4)):0; C2.cs=(C2.cs||0)+cs;
  C2.apps+=app; C2.g+=g; C2.as+=as; const row={y:yr,a,club:C2.club,lg:lg.n,app,g,as,cs,rt,rank,role};
  row.semi=isSemi(lg); C2.hist.push(row); if(lg.par>C2.best){ C2.best=lg.par; C2.bestN=lg.n; }
  let t=`${yr-1}/${String(yr).slice(-2)} ${C2.club}：${role}，出場 ${app}${Z.pos==='GK'?`、零封 ${cs}`:`、進球 ${g}、助攻 ${as}`}，評分 ${rt.toFixed(2)}，球隊第 ${rank} 名。`;
  t+=paySeason(lg,o,role,title);
  log(t,title?'star':''); msCheck(); injApply(a,J); fameSeason(a,row,lg);
  if(title){ C2.troph.push(`${lg.n}冠軍 ${yr}`); log(`${C2.club}拿下${lg.n}冠軍！你${role==='主力'?'是奪冠的主力':'也是這支冠軍隊的一員'}。`,'star'); C2.lgT=(C2.lgT||0)+1; add('joy',8); add('fame',4); queuePost('lg',`${lg.n}冠軍`,yr); if(role!=='替補'&&chance(.55))liveCard(`${lg.n}冠軍之戰`,oppTeam(lg),true); }
  else if(role==='主力'&&lg.k&&chance(.15))liveCard('德比戰',oppTeam(lg),chance(.3+str*.4));
  if(role==='主力'&&rt>=7.6&&chance(.35)){ C2.aw.push(`${lg.n}年度最佳球員 ${yr}`); log(`你被選為${lg.n}年度最佳球員。`,'star'); queuePost('ind',`${lg.n}年度最佳球員`,yr); }
  if(lg.top5&&o>=74&&rt>=7.9&&chance(.25)){ C2.aw.push(`${isW()?'女子金球獎':'金球獎'} ${yr}`); log('你拿下了金球獎。從那個出生的地方走到這裡，沒有人想得到。','star'); queuePost('bdo',isW()?'女子金球獎':'金球獎',yr); fact(isW()?'女子金球獎 2018 年才設立。':'金球獎從 1956 年開始頒發，最早只有歐洲球員能拿。'); add('joy',15); }
  awardsSeason(a,row,lg,o,str);
  promoRel(a,lg,rank,n,yr);
  return row; }
function natTeam(a,row){ const C2=Z.car, W0=isW(), wt=WT[Z.b.c.k]??4, N0=FL.NATS&&FL.NATS[Z.b.c.k], N=W0?{tier:wt,wc:[97,85,50,20,5][wt],nt:[50,46,42,38,34][wt]}:N0||{tier:(Z.b.c.lp||20)>=40?2:(Z.b.c.lp||20)>=30?3:4,wc:Math.round((Z.b.c.wcq||.01)*100),nt:Math.round(36+(Z.b.c.lp||20)*.3)} /* 沒有國家隊資料的國家:依國內聯賽水準與世界盃機率 */, o=ovr(), thr=N?N.nt+3:47, yr=Z.year+a, cup=W0?'女足世界盃':'世界盃';
  if(o>=thr&&row.role==='主力'&&row.rt>=6.7&&a<=35&&(C2.inNT||chance(.3))){ const cp=3+Math.floor(R()*7), ig=Math.round(cp*({FW:.3,MF:.1,DF:.03,GK:0}[Z.pos||'MF'])*(.5+R())); if(!C2.caps){ log(`你第一次入選${Z.b.c.n}${W0?'女足':''}國家隊。`,'star'); fact('國際足總有 211 個會員協會，每一個都有自己的國家隊。'); queuePost('nt','國家隊',yr); } C2.caps+=cp; C2.ig+=ig; C2.inNT=1; msCheck(); }
  else C2.inNT=0;
  contCup(yr,N);
  if(yr%4===(W0?3:2)&&yr>=2030){ const q=N?N.wc/100:.02; if(C2.inNT&&chance(q)){ const ti=N?N.tier:5, st=['小組賽出局','32 強','16 強','8 強','4 強','亞軍','冠軍'], w=[[.15,.15,.2,.2,.15,.07,.08],[.3,.2,.25,.15,.06,.02,.02],[.45,.25,.2,.07,.02,.01,0],[.6,.25,.12,.03,0,0,0],[.75,.2,.05,0,0,0,0],[.85,.12,.03,0,0,0,0]][Math.min(5,ti)];
      let r=R(), k=0; for(;k<w.length-1;k++){ r-=w[k]; if(r<0)break; } C2.wc.push(`${yr} ${cup}・${st[k]}`); add('fame',6+k*3); if(k>=2)liveCard(`${yr} 年${cup}${k>=5?'決賽':k===4?'四強賽':k===3?'八強賽':'十六強賽'}`,pickNat(),st[k]==='冠軍',{pk:true,side:Z.b.c.n}); log(`你代表${Z.b.c.n}踢了 ${yr} 年${cup}，最後${st[k]==='冠軍'?'捧起了冠軍盃':`止步${st[k]}`}。`,'star'); fact(isW()?'女足世界盃 1991 年才第一次舉辦，2023 年擴大為 32 隊。':'2026 年起，世界盃從 32 隊擴大為 48 隊。'); if(st[k]==='冠軍'){ C2.troph.push(`${cup}冠軍 ${yr}`); add('joy',20); queuePost('wc',`${cup}冠軍`,yr); } if(['冠軍','亞軍','4 強'].includes(st[k])&&chance(.12))award(`${cup}金球獎`,yr,'ind'); if(Z.pos==='FW'&&chance(.08))award(`${cup}金靴`,yr,'ind'); }
    else if(chance(.6))log(`${yr} 年${cup}開打，${N&&chance(q)?`${Z.b.c.n}有打進決賽圈，但你不在名單裡`:`${Z.b.c.n}沒有打進決賽圈`}。`); } }
function growPro(a){ const C2=Z.car, r=C2.hist.length?C2.hist[C2.hist.length-1].role:'輪替', f=(Z.focus==='ball'?1.3:Z.focus==='rest'?.8:.9)*trm('disc'), rm=r==='主力'?1.1:r==='輪替'?1:.8;
  if(a<=27)for(const k of AB)abAdd(k,(.45+Z.talent*1.1)*f*rm*Z.bias[k]*(a<=23?1.2:.6));
  if(a>=30){ for(const k of PHYS)abAdd(k,-(.6+(a-30)*.35)*(Z.focus==='rest'?.7:1)); if(a>=32)for(const k of SKILL)abAdd(k,-(a-32)*.2); } syncBall(); }
const JOB_AD=[['工廠作業員','外送員','建築工','店員','保全'],['辦公室職員','業務','護理師','技師','公務員'],['工程師','老師','會計師','經理','醫師']];
function adultLife(a){ const st=Z.st;
  if(!Z.wed&&a>=22&&a<=38&&chance(.09+(st.joy-50)/400)){ Z.wed=mkName(Z.b.c.nm,Z.sex==='m'?'f':'m').full; log(`你和${Z.wed}結婚了。`,'star'); add('joy',8); add('fam',6); }
  if(Z.wed&&Z.kids<3&&a<=45&&chance(.17)){ Z.kids++; log(`你的第 ${Z.kids} 個孩子出生了。`,'star'); add('joy',6); }
  for(const p of [Z.mom,Z.dad]){ if(!p.gone&&p.a+a>=Math.min(98,Z.b.c.le+6+gauss()*4)&&chance(.25)){ p.gone=a; log(`${p===Z.mom?'母親':'父親'}${p.n}過世了，享年 ${p.a+a} 歲。`,'big'); fact(`${Z.b.c.n}的人平均壽命大約 ${Z.b.c.le} 歲。`); add('joy',-10); } }
  if(a>=45)add('hp',-(a-45)*.12-(st.hp>60?.3:0)); if(Z.focus==='rest')add('hp',1.2); if(Z.focus==='family')add('fam',3);
  add('joy',(st.fam-50)/40+(58-st.joy)*.12); }
function adultYear(a){
  const C2=Z.car; tragedyYear(a);
  if(Z.ph==='pro'){ growPro(a); const row=season(a); natTeam(a,row); const pg=prodigyCheck(a); if(pg&&(Z.car.lg.par<(isW()?53:56)||Z.car.str<.8)){ const of=eliteOffers(4); if(of.length){ Z.car.ct.yrs--; Z.offers=of; ask('war'); } else transferYear(a,row); } else transferYear(a,row); }
  else if(Z.ph==='amateur'){ if(Z.amCoach)coachYear(a); if(!Z.job&&!(Z.co&&Z.co.lv>=1)){ Z.job=pick(JOB_AD[Z.st.edu>=60?2:Z.st.edu>=35?1:0]); log(`你開始工作，當${Z.job}。週末還是會找人踢球。`); }
    if(a<=21&&Z.stage>=2&&ovr()>=lowPar()+2&&chance(.06)){ const of=genOffers(ovr(),lowPar(),1).map(x=>mkOffer(x,'free')); if(of.length){ Z.offers=of; ask('late'); } }
    else if(chance(.12))log(pick(['你在業餘聯賽進了一個漂亮的遠射。','你週末帶社區的小朋友踢球。','你和老朋友組了一支五人制球隊。','你熬夜看了一場歐冠決賽。']));
    if(a<=27)for(const k of SKILL)abAdd(k,Z.focus==='play'?.3:0); if(a>=30)for(const k of AB)abAdd(k,-.4); syncBall(); }
  else if(Z.ph==='retired'){ if(Z.post==='coach')coachYear(a); else if(Z.post==='admin')adminYear(a); else if(Z.post&&POST2[Z.post]&&chance(.45))log(pick(POST2[Z.post]));
    if(a>=40)for(const k of AB)abAdd(k,-.6); syncBall(); }
  for(const [i,e] of EVA.entries()){ if(a<e.a[0]||a>e.a[1])continue; if(e.ph!=='any'&&e.ph!==Z.ph)continue; if(e.c&&!e.c())continue; const k2='A'+i; if(Z.evAt[k2]!=null&&a-Z.evAt[k2]<4)continue; if(chance(e.p)){ Z.evAt[k2]=a; { const tx=e.t(); log(tx,e.star?'star':''); fact(e.d,tx); } e.f&&e.f(); } }
  wevYear(a);
  adultLife(a);
  if(a>=Z.die){ Z.done=true; flushPost(); achCheck(); ask('dead'); saveLife(); postDone(); } }
const POSTEV={coach:a=>pick(['你帶的球隊升級了。','你考到了更高一級的教練證照。','你提拔的年輕球員踢上了國家隊。','你被球隊解雇，休息了半年。']),
 agent:a=>pick(['你幫一個 17 歲的孩子談成了第一份職業合約。','你手上的球員轉會到了更大的聯賽。']),
 pundit:a=>pick(['你在電視上講評了一場德比。','你的一句評論在網路上被瘋傳。']),
 academy:a=>pick(['你的足球學校招到了第 100 個學生。','你的學生被職業俱樂部看中。','學校差點因為沒錢關門，你撐了下來。']),
 home:a=>pick(['你在家鄉開了一間小店，牆上掛著當年的球衣。','家鄉的孩子會跑來問你當年踢球的事。','你在家鄉的業餘隊多踢了幾場。'])};
function saveLife(){ if(window.ML_DEMO_RUN)return; try{ const C2=Z.car, L=JSON.parse(localStorage.getItem('ml-lives')||'[]'), best=C2.hist.slice().sort((x,y)=>(FL.LV[Object.keys(FL.LV).find(k=>FL.LV[k].n===y.lg)]?.par||0)-(FL.LV[Object.keys(FL.LV).find(k=>FL.LV[k].n===x.lg)]?.par||0))[0];
  const id=Date.now()+Math.floor(Math.random()*1000); if(!Z.demo)Z.lsid=id; L.push({id,t:id,demo:Z.demo?1:undefined,name:Z.me,k:Z.b.c.k,nat:Z.b.c.n,city:Z.b.city,sex:Z.sex,ovr:ovr(),peak:C2.peak||ovr(),age:Math.floor(Z.t),res:C2.hist.length?`職業 ${C2.hist.length} 季・最高 ${best?best.lg:''}`:Z.stage>=2?'業餘球員':'沒有踢職業',troph:C2.troph.length,caps:C2.caps,apps:C2.apps,g:C2.g}); localStorage.setItem('ml-lives',JSON.stringify(L.slice(-300))); saveSnap(id); }catch(e){} }
function saveSnap(id){ try{ const C2=Z.car, keep=['me','year','t','sex','pos','no','look','seed','tags','stage','job','kids','wed','post','iq','talent','kidClub','co','kid','ownEver','ownName','ad','ach','heart','crash'];
  const o={id,v:1,demo:Z.demo?1:undefined}; for(const k of keep)o[k]=Z[k]; o.b={k:Z.b.c.k,city:Z.b.city,q:Z.b.q};
  o.car={hist:C2.hist,troph:C2.troph,aw:C2.aw,wc:C2.wc,caps:C2.caps,ig:C2.ig,apps:C2.apps,g:C2.g,as:C2.as,cs:C2.cs,bestN:C2.bestN,best:C2.best,lg:C2.lg?{n:C2.lg.n}:null,club:C2.club,prodigy:C2.prodigy,fullPro:C2.fullPro,abroad:C2.abroad,lgT:C2.lgT};
  o.m=Z.m?{earn:Z.m.earn,bank:Z.m.bank,give:Z.m.give,house:Z.m.house,club:Z.m.club,school:Z.m.school,hosp:Z.m.hosp,found:Z.m.found}:null;
  o.peers=Z.peers.map(p=>({n:p.n,k:p.c.k,no:p.no,pos:p.pos,quit:p.quit,note:p.note,stage:p.stage}));
  o.log=Z.log.filter(l=>l.k==='star'||l.k==='big').slice(0,220).map(l=>({a:l.a,t:String(l.t).replace(/<[^>]+>/g,''),k:l.k}));
  const S=JSON.parse(localStorage.getItem('ml-snap')||'[]'); S.push(o); localStorage.setItem('ml-snap',JSON.stringify(S.slice(-30))); }catch(e){} }
function review(id){ let S=[]; try{ S=JSON.parse(localStorage.getItem('ml-snap')||'[]'); }catch(e){} const o=S.find(x=>String(x.id)===String(id)); if(!o){ start(); return; }
  const c=C.find(x=>x.k===o.b.k)||C[0]; Z=Object.assign({},o,{b:{c,city:o.b.city,q:o.b.q},peers:o.peers.map(p=>Object.assign({},p,{c:C.find(x=>x.k===p.k)||{k:p.k,n:p.k}})),done:true,shared:true,review:true,ph:'retired',pending:[],st:{},map:{},evAt:{},
    car:Object.assign({hist:[],troph:[],aw:[],wc:[]},o.car),mom:{n:'',a:0},dad:{n:'',a:0}});
  useKeys(); endUI(); }
function lifeSummary(){ const C2=Z.car, a=Math.floor(Z.t), pro=C2.hist.length, clubs=[...new Set(C2.hist.map(h=>h.club))];
  let s=`<b>你在 ${a} 歲離開了這個世界。</b>（${Z.b.c.n}的平均壽命是 ${Z.b.c.le} 歲）<br><br>`;
  s+=pro?`職業生涯 ${pro} 季，待過 ${clubs.length} 支球隊（${clubs.slice(0,5).join('、')}${clubs.length>5?'…':''}），出場 ${C2.apps} 次${Z.pos==='GK'?`，零封 ${C2.cs||0} 場`:`，進球 ${C2.g}、助攻 ${C2.as}`}。`:Z.stage>=2?'你沒有踢上職業，但足球一直是你生活的一部分。':'足球從來不是你生活的一部分。';
  if(C2.caps)s+=`<br>代表${Z.b.c.n}國家隊出賽 ${C2.caps} 場${C2.ig?`、進 ${C2.ig} 球`:''}。`;
  if(C2.troph.length||C2.aw.length||C2.wc.length)s+=`<br>榮譽：${[...C2.troph,...C2.aw,...C2.wc].slice(0,8).join('、')}`;
  if(Z.post)s+=`<br>退休後：${{coach:'當教練',agent:'當經紀人',pundit:'當球評',academy:'開足球學校',home:'回到家鄉'}[Z.post]}。`;
  if(Z.ach&&Z.ach.length)s+=`<br>這一生解鎖了 ${Z.ach.length} 個成就：${Z.ach.map(id=>(ACH.find(x=>x[0]===id)||[])[1]).join('、')}。`;
  if(Z.m)s+=`<br>你這一生賺了約 ${fm(Z.m.earn)}，最後留下 ${fm(Math.max(0,Z.m.bank))}${Z.m.give?`，捐出了 ${fm(Z.m.give)}`:''}${Z.m.house.length?`，買過 ${Z.m.house.length} 間房子`:''}${Z.m.club?'，還買下了家鄉的球隊':''}。`;
  s+=Z.wed?`<br>你和${Z.wed}結婚，有 ${Z.kids} 個孩子。`:'<br>你一直單身。';
  s+=`<br><br>${Z.year} 世代名單裡的其他人：<br>${Z.peers.map(p=>`#${p.no} ${p.n}（${p.c.n}）：${p.quit?p.note:STAGE[p.stage]}`).join('<br>')}`;
  return s; }
Object.assign(ASK,{
 cross:()=>{ const o=ovr(), s=Z.stage, home=homeLg(Z.b.c), minPar=Math.min(...Object.values(FL.LV).map(v=>v.par));
   const fcm=clamp(.15+Z.b.c.fc,.3,1), n=s>=4?(o>=minPar?3:1):s===3?(o>=minPar&&chance(.3*fcm)?1:0):s===2&&o>=minPar+2&&chance(.04*fcm)?1:0, of=n?genOffers(o+(s>=4?3:0),0,n).map(x=>mkOffer(x,'free')):[]; Z.offers=of;
   if(Z.car.prodigy&&s>=3){ const el=eliteOffers(3); if(el.length){ const seen=new Set(of.map(x=>x.club)); for(const x of el)if(!seen.has(x.club))of.unshift(x); of.length=Math.min(of.length,5); Z.offers=of; } }
   const head=Z.car.prodigy&&s>=3?'你是這一代最受矚目的天才，各大豪門都派人來看你的最後一場青年賽。':s===4?'青訓的最後一年結束了。':s===3?'你在地區代表隊踢到了 18 歲。':s===2?'你在社區球隊踢到了 18 歲。':s===1?'你在街頭和空地踢球長大。':'足球從來不是你生活的一部分。';
   return {t:'18 歲的十字路口',d:`${head}${of.length?`有 ${of.length} 支球隊向你招手。`:'沒有職業球隊找你。'}（綜合能力 ${o}${Z.pos?'・'+POSN[Z.pos]:''}）`,o:[
     ...of.map((x,i)=>({t:ofTx2(x),main:i===0,f:()=>{ if(!Z.pos)Z.pos=pick(['DF','MF','FW']); sign(x); Z.focus='ball'; }})),
     {t:of.length?'不簽了，去念大學／找工作':'念大學或找工作，週末踢業餘',main:!of.length,f:()=>{ Z.ph='amateur'; Z.club=Z.stage>=2?amClub():null; log(`你沒有走職業這條路。${Z.club&&Z.club.includes('・')?`週末你在${Z.club.replace('・','（')}）踢球。`:''}`); Z.focus='work'; }}]}; },
 move:()=>{ const of=Z.offers||[], C2=Z.car; return {t:'轉會窗：有球隊想買你',d:`你在${C2.club}的表現被看見了（綜合能力 ${ovr()}）。${ctTx()}`,o:(()=>{ const m=mainIdx(of,stScore()); return [...of.map((x,i)=>({t:ofTx2(x),main:i===m,f:()=>sign(x)})),Object.assign(stayOpt(`留在${C2.club}`,{fam:2,team:1}),{main:m===of.length})]; })()}; },
 expire:()=>{ const of=Z.offers||[], rn=Z.renew, C2=Z.car, m=mainIdx(of,stScore()+Math.log(Math.max(.1,rn.sal)/Math.max(.1,(C2.ct||{}).sal||rn.sal))*4+1); return {t:'合約到期',d:`你和${C2.club}的合約到期了。球隊開出續約：${rn.yrs} 年、年薪約 ${fm(rn.sal)}。${of.length?'也有其他球隊想用自由轉會簽你。':''}`,o:[
   {t:`續約：${C2.club}<small class="oft">${rn.yrs} 年・年薪約 ${fm(rn.sal)}</small>`,main:m===of.length,f:()=>{ C2.ct={yrs:rn.yrs,sal:rn.sal}; log(`你和${C2.club}續約 ${rn.yrs} 年，年薪約 ${fm(rn.sal)}。`); add('team',1); }},...of.map((x,i)=>({t:ofTx2(x),main:i===m,f:()=>sign(x)}))]}; },
 free:()=>{ const of=Z.offers||[], a=Math.floor(Z.t), M=mainIdx(of); return {t:'自由球員',d:'你現在沒有球隊。經紀人帶來了這些邀約：',o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),a>=30?{t:'就此退休',f:()=>ASK.retire().o[0].f()}:{t:'先回到業餘，白天工作',f:()=>{ Z.ph='amateur'; Z.club='業餘球隊'; log('你暫時離開職業足球，白天上班，週末踢業餘。'); }}]}; },
 loan:()=>{ const M=mainIdx(Z.offers||[],stScore()-2), of=Z.offers||[]; return {t:'租借',d:`教練說你在${Z.car.club}很難有出場機會，建議你先租借出去一年，累積比賽經驗。`,o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),Object.assign(stayOpt('留下來爭取位置',{resi:2,joy:-2}),{main:M===(Z.offers||[]).length})]}; },
 rich:()=>{ const M=mainIdx(Z.offers||[],stScore()), of=Z.offers||[], x=of[0], cur=(Z.car.ct||{}).sal||1; return {t:'高薪邀約',d:`${x.lg.n}的${x.club}開出非常高的年薪，大約是你現在的 ${(x.sal/cur).toFixed(1)} 倍。經紀人說：「這種價碼，一輩子不一定有第二次。」`,o:[{t:ofTx2(x),main:0===M,f:()=>sign(x)},Object.assign(stayOpt(`留在${Z.car.club}`,{ambi:1}),{main:M===(Z.offers||[]).length})]}; },
 home:()=>{ const M=mainIdx(Z.offers||[],stScore()-1), x=(Z.offers||[])[0]; return {t:'家鄉的邀請',d:`${x.lg.n}的${x.club}希望你回到${Z.b.c.n}，踢最後幾年。${Z.mom.gone==null?'媽媽在電話裡說，家裡的房間一直幫你留著。':''}`,o:[{t:ofTx2(x),main:0===M,f:()=>sign(x)},Object.assign(stayOpt('繼續在國外拚',{ambi:1}),{main:M===(Z.offers||[]).length})]}; },
 bench:()=>{ const M=mainIdx(Z.offers||[],stScore()-2), of=Z.offers||[]; return {t:'坐板凳',d:'你已經連續兩季大多坐在板凳上。經紀人說，有幾支球隊願意給你上場時間。',o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),Object.assign(stayOpt('留下來證明自己',{resi:2,joy:-3}),{main:M===(Z.offers||[]).length})]}; },
 sell:()=>{ const M=mainIdx(Z.offers||[],stScore()-4), of=Z.offers||[]; return {t:'轉會名單',d:`${Z.car.club}把你放上了轉會名單，教練說你不在下季的計畫裡。`,o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),Object.assign(stayOpt('不走，留下來坐板凳',{joy:-4,resi:1}),{main:M===(Z.offers||[]).length})]}; },
 war:()=>{ const of=Z.offers||[], M=mainIdx(of,stScore()-3); return {t:'搶人大戰',d:`${of.length} 支豪門同時開價，經紀人的電話一整天沒停過。${ctTx()}`,o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),Object.assign(stayOpt(`再留在${Z.car.club}一年`,{team:2,calm:1}),{main:M===of.length})]}; },
 coachup:()=>{ const x=Z.coOffer, co=Z.co; return {t:'執教邀約',d:`${x.team}（${x.lg}）想請你擔任${CO_LV[x.lv]}。你現在在${co.team}。`,o:[{t:`接下${x.team}`,main:((Z.tr&&Z.tr.ambi)||50)>=45,f:()=>{ coSet(x.lv,`你接下了${x.team}的教鞭，成為${CO_LV[x.lv]}。`); add('joy',4); }},{t:`留在${co.team}`,f:()=>{ log(`你決定留在${co.team}。`); add('team',2); }}]}; },
 ntcoach:()=>({t:'國家隊的電話',d:`${Z.b.c.n}足協打電話來，希望你接下${isW()?'女足':''}國家隊主帥。`,o:[{t:'接下國家隊',main:1,f:()=>{ coSet(4,`你成為${Z.b.c.n}${isW()?'女足':''}國家隊主帥。記者會上，你說：「這是我一輩子最大的榮耀。」`); add('joy',8); queuePost('nt','國家隊主帥',Z.year+Math.floor(Z.t)); }},{t:'婉拒，留在俱樂部',f:()=>log('你婉拒了足協的邀請。')}]}),
 kidball:()=>{ const k=Z.kid; return {t:`${k.n}想踢足球`,d:`5 歲的${k.n}抱著一顆球跑來問你：「我可以跟你一樣踢球嗎？」`,o:[
   {t:'每天陪他練球',main:Z.stage>=2,f:()=>{ k.track=1; k.push=2; add('fam',4); log(`你開始每天陪${k.n}在家門口練球。`); }},
   {t:'送他去足球學校',f:()=>{ k.track=1; k.push=1; k.school=1; if(Z.m)Z.m.bank-=HB()*.03; log(`你幫${k.n}報名了足球學校。`); }},
   {t:'讓他自己決定',main:Z.stage<2,f:()=>{ k.track=chance(.6)?1:0; if(!k.track){ k.done=1; log(`${k.n}踢了一陣子，後來愛上了${pick(['畫畫','音樂','籃球','科學','跳舞'])}。`); } else log(`${k.n}自己跑去找鄰居的孩子踢球。`); }},
   {t:'希望他先顧好功課',f:()=>{ k.track=chance(.25)?1:0; if(!k.track){ k.done=1; log(`${k.n}後來專心念書。`); } }}]}; },
 kidpress:()=>{ const k=Z.kid; return {t:'星二代的壓力',d:`媒體一直拿${k.n}跟你比較，他回家之後一句話都不說。`,o:[
   {t:'公開要媒體別再比較',main:1,f:()=>{ k.t+=.05; add('kind',2); log(`你在記者會上說：「他不是第二個我，他是第一個${k.n}。」`); }},
   {t:'讓他改用媽媽的姓踢球',f:()=>{ k.t+=.08; add('crea',1); log(`${k.n}改了球衣上的名字，沒有人再拿他跟你比了。`); }},
   {t:'要他更努力，證明自己',f:()=>{ k.push++; if(chance(.45)){ k.crushed=1; k.done=1; log(`${k.n}說他累了，不想再踢了。他後來成為一名${pick(['醫生','老師','音樂人','運動防護員','建築師'])}。`,'big'); add('fam',-5); add('joy',-5); } else { k.t+=.06; log(`${k.n}咬著牙練了一整年，教練說他變了一個人。`); } }},
   {t:'帶他去別的國家踢球',f:()=>{ k.t+=.04; add('brave',2); log(`你們全家搬到國外，${k.n}在那裡沒有人認得他。`); }}]}; },
 owner:()=>{ const O=Z.own, M=Z.m, ops=[
   {t:'砸錢買一位大牌球星',cost:Math.round(O.val*.12),f:()=>{ O.str=Math.min(.95,O.str+.12); O.wage+=.02; log(`${O.club}簽下了一位大牌球星，球迷在機場等了一整晚。`); }},
   {t:'蓋一座新球場',cost:Math.round(O.val*.35),f:()=>{ O.val*=1.3; log(`${O.club}的新球場動工了，你親手鏟下第一鏟土。`); }},
   {t:'降低票價，讓更多人進場',f:()=>{ O.val*=.97; add('kind',2); log('票價降了，球場第一次坐滿了家庭和孩子。'); }},
   {t:'開除總教練',f:()=>{ O.str=clamp(O.str+(R()-.4)*.2,.05,.95); log(`你開除了${O.club}的總教練。`); }},
   {t:'把球隊賣掉',f:()=>{ const g=O.val*(O.share||1); M.bank+=g; log(`你以 ${fm(g)} 把${O.club}${O.share<1?'的股份':''}賣掉了。`,'star'); Z.own=null; }}].filter(x=>!x.cost||x.cost<=M.bank);
   return {t:`${O.club}的董事會`,d:`你經營${O.club}的第 ${O.y} 年。總監問你下一步要怎麼走。`,o:ops.map((x,i)=>({t:x.t+(x.cost?`<small class="oft">存款 −${fm(x.cost)}</small>`:''),main:i===0&&x.cost?Z.tr&&Z.tr.ambi>=55:i===2,f:()=>{ if(x.cost)M.bank-=x.cost; x.f(); }}))}; },
 adelect:()=>({t:'足協主席選舉',d:'你決定參選足協主席。你要用什麼政見拉票？',o:[
   {t:'承諾把資源都給青訓',main:1,f:()=>adWin(.5,'team')},{t:'承諾讓國家隊打進世界盃',f:()=>adWin(.45,'ambi')},{t:'私下和地方足協交換條件',f:()=>{ add('kind',-2); adWin(.65,'calm'); }}]}),
 fifa:()=>({t:'參選國際足總主席',d:'211 個會員協會，一國一票。你要用什麼政見拉票？',o:[
   {t:'承諾給小國更多發展基金',main:1,f:()=>fifaRun(.42)},{t:'承諾徹底反貪腐',f:()=>{ add('brave',2); fifaRun(.3); }},{t:'承諾把世界盃擴大到 64 隊',f:()=>fifaRun(.36)},{t:'退出選舉',f:()=>log('你在最後一刻退出了選舉。')}]}),
 bribe:()=>({t:'信封',d:'一位申辦國的代表在飯店房間裡，塞給你一個厚厚的信封。',o:[
   {t:'退回，並向倫理委員會檢舉',main:1,f:()=>{ add('kind',3); add('brave',2); log('你把信封退了回去，隔天寫了一封檢舉信。'); }},
   {t:'收下',f:()=>{ if(Z.m)Z.m.bank+=HB()*.8; if(chance(.6)){ Z.ad.ban=1; log('幾年後，司法調查找上門，你被國際足總終身禁止參與足球事務。','big'); fact('2015 年，國際足總爆發貪腐醜聞，多名高層被美國司法部起訴。'); add('joy',-12); } else log('你把信封收進了行李箱。'); }},
   {t:'假裝沒看到',f:()=>{ add('calm',1); log('你把信封留在桌上，離開了房間。'); }}]}),
 pk:()=>{ const L=Z.log.find(l=>l.k==='live'&&l.lv&&l.lv.pk&&!l.lv.res); return {t:'點球大戰',d:`${L?L.lv.title+'，':''}比賽進入點球大戰。輪到你主罰，全場安靜下來，守門員在門線上左右跳動。`,o:[['往左下角推',.78,'你把球推向左下角'],['大力抽正中間',.7,'你一腳抽向正中間'],['瞄準右上角',.72,'你把球射向右上角']].map(([t,p,say],i)=>({t,main:i===0,f:()=>{ const ok=chance(p+((Z.tr&&Z.tr.calm||50)-50)/300); if(ok)Z.pkHero=1; if(!L)return; const lv=L.lv, n=[3,4,5][Math.floor(R()*3)], m=n-1; lv.res=lv.win?`點球 ${n}:${m}`:`點球 ${m}:${n}`;
     lv.L.push(`${say}——${ok?'進了！':'被撲出來了！'}`); lv.L.push(lv.win?`最後 ${lv.my} 以點球 ${n}:${m} 獲勝！${ok?'':'隊友們幫你扛了下來。'}`:`最後 ${lv.my} 以點球 ${m}:${n} 輸了。${ok?'':'你蹲在禁區裡，久久站不起來。'}`); if(!lv.win&&!ok){ add('joy',-6); add('resi',2); } else if(ok)add('joy',3); }}))}; },
 injury:()=>{ const J=Z.injQ||{n:'重傷'}; return {t:`${J.n}的復健`,d:'隊醫說這是很嚴重的傷，接下來的復健會影響你的未來。',o:[
   {t:'按部就班，完整復健',main:1,f:()=>{ Z.oldInj=Math.min(.12,(Z.oldInj||0)+.01); add('calm',2); add('hp',4); Z.aclBack=1; log('你一步一步做完了所有的復健療程。'); }},
   {t:'提早復出，球隊需要我',f:()=>{ Z.oldInj=Math.min(.15,(Z.oldInj||0)+.05); add('brave',2); add('team',1); Z.aclBack=1; log('你比預定早了兩個月復出，膝蓋偶爾還是會痛。'); }},
   ...(Z.m&&Z.m.bank>=HB()*.15?[{t:'出國找名醫治療',f:()=>{ Z.m.bank-=HB()*.15; add('hp',8); Z.aclBack=1; log('你飛到國外，找了最好的運動醫學團隊，恢復得比預期快。'); }}]:[])]}; },
 relegated:()=>{ const of=Z.offers||[], C2=Z.car, M=mainIdx(of,stScore()+((Z.tr&&Z.tr.kind||50)-50)/12); return {t:'降級之後',d:`${C2.club}降級了。更衣室裡一片沉默，好幾支球隊打電話給你的經紀人。${ctTx()}`,o:[...of.map((x,i)=>({t:ofTx2(x),main:i===M,f:()=>sign(x)})),Object.assign(stayOpt('留下來，幫球隊升回去',{team:3,kind:1}),{main:M===of.length})]}; },
 late:()=>{ const of=Z.offers||[]; return {t:'有球隊在業餘聯賽看到你',d:'對方說你踢得比很多職業球員還好，問你要不要試試看。',o:[...of.map(x=>({t:ofTx2(x),main:1,f:()=>{ if(!Z.pos)Z.pos=pick(['DF','MF','FW']); sign(x); Z.focus='ball'; }})),{t:'算了，維持現在的生活',f:()=>log('你婉拒了。')}]}; },
 retire:()=>({t:'該掛靴了嗎？',d:`你 ${Math.floor(Z.t)} 歲了，身體一年不如一年（綜合能力 ${ovr()}）。`,o:[
   {t:'宣布退休',main:1,f:()=>{ Z.ph='retired'; log(`你在${Z.car.club}宣布退休，結束 ${Z.car.hist.length} 季的職業生涯。`,'star'); fact('FIFPRO 的研究：超過三成的退役球員有焦慮或憂鬱的症狀。'); queuePost('bye','退休',Z.year+Math.floor(Z.t)); flushPost(); Z.club=`已退休・前${Z.car.club}球員`; Z.focus='family'; ask('post'); }},
   {t:'再踢一年',f:()=>log('你決定再拚一年。')}]}),
 post:()=>({t:'退休後要做什麼？',d:'足球陪了你大半輩子。',o:[['coach','當教練'],['agent','當經紀人'],['pundit','當球評'],['academy','開一間足球學校'],['home','回到家鄉過日子'],['admin','進入足協工作']].map(([k,n],i)=>({t:n,main:i===0,f:()=>{ Z.post=k; log(`你決定${n}。`,'star'); }}))}),
 dead:()=>({t:'一生',d:lifeSummary(),o:[{t:'再出生一次',main:1,f:()=>start()},{t:'存成人生小卡',f:()=>{ lifeCard(); Z.pending.unshift('dead'); }},...(Z.shared?[]:[{t:'分享到首頁',f:()=>shareUI()}]),{t:'回首頁',f:()=>close()}],end:1})
});

/* ---------- 分享牆:走完的人生匿名計數；玩家自願分享(暱稱＋一句話) ---------- */
const API='/api/share';
const lifeId=()=>Z.lid||(Z.lid='L'+Z.seed.toString(36)+'-'+Date.now().toString(36));
function lifePayload(){ const C2=Z.car;
  return {name:Z.me,k:Z.b.c.k,nat:Z.b.c.n,city:Z.b.city,sex:Z.sex,pos:Z.pos,age:Math.floor(Z.t),born:Z.year,seasons:C2.hist.length,apps:C2.apps,g:C2.g,cs:C2.cs||0,caps:C2.caps,
    best:C2.bestN||'',clubs:[...new Set(C2.hist.map(h=>h.club))].slice(0,4),honors:[...C2.troph,...C2.aw,...C2.wc].slice(0,6),
    post:Z.post?{coach:'教練',agent:'經紀人',pundit:'球評',academy:'足球學校',home:'回到家鄉'}[Z.post]:'',res:C2.hist.length?`職業 ${C2.hist.length} 季`:Z.stage>=2?'業餘球員':'沒有踢職業'}; }
function postDone(){ if(window.ML_DEMO_RUN)return; try{ fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'done',id:lifeId()}),keepalive:true}).catch(()=>{}); }catch(e){} }
function shareUI(){ const el=document.createElement('div'); el.className='ask';
  el.innerHTML=`<div class="bx"><h3>分享這段人生</h3><p>會放上首頁的「玩家分享的人生」。不會公開任何個人資料，只有這段人生的內容、你的暱稱和一句話。</p>
    <label class="sf"><span>暱稱（可以空白，最多 12 字）</span><input id="sh-nick" maxlength="12" placeholder="無名的球迷"></label>
    <label class="sf"><span>想說的一句話（最多 40 字）</span><input id="sh-q" maxlength="40" placeholder="例如：如果當年有雙好球鞋……"></label>
    <p class="sh-msg" id="sh-msg"></p><button class="main" id="sh-go">分享</button><button id="sh-x">取消</button></div>`;
  root.appendChild(el); const msg=el.querySelector('#sh-msg');
  el.querySelector('#sh-x').onclick=()=>{ el.remove(); Z.pending.unshift('dead'); };
  el.querySelector('#sh-go').onclick=async()=>{ const b=el.querySelector('#sh-go'); b.disabled=true; msg.textContent='分享中…';
    try{ const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',id:lifeId(),nick:el.querySelector('#sh-nick').value,quote:el.querySelector('#sh-q').value,life:lifePayload()})}); const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'分享失敗'); Z.shared=1; msg.textContent='已分享！回到首頁就看得到。'; setTimeout(()=>{ el.remove(); Z.pending.unshift('dead'); },1100); }
    catch(e){ msg.textContent=(e.message==='Failed to fetch'?'連不上伺服器':e.message)+'，請稍後再試。'; b.disabled=false; } };
}

/* ---------- 各國事件(js/events.js)：依國家標籤、年齡、階段抽，每年最多 2 則，同一則 5 年內不重複 ---------- */
function fillTxt(t){ const c=Z.b.c, lgN=(()=>{ try{ const h=homeLg(c); return lgOf(h[0]||null).n; }catch(e){ return c.lg||`${c.n}的聯賽`; } })();
  return t.replace(/\{city\}/g,Z.b.city.replace(/鄉下|村落|小鎮/,'')).replace(/\{country\}/g,c.n).replace(/\{dad\}/g,Z.dad.n).replace(/\{mom\}/g,Z.mom.n).replace(/\{lg\}/g,lgN).replace(/\{idol\}/g,()=>{ const S=(window.WORLD.STARS||{})[c.k]; return S&&S.length?S[0][0]:`${c.n}國家隊的隊長`; }); }
function applyFx(e){ for(const [k,v] of Object.entries(e||{})){ if(k==='w')Z.w=clamp(Z.w+v,1,5.5); else if(k==='start'){ if(Z.stage===0)Z.stage=1; } else add(k,v); } }
function wevYear(a){ const W=window.EVW; if(!W)return; const tg=W.tags(Z.b.c.k), ph=a<18?'youth':Z.ph; let n=0;
  const list=W.EVW.map((e,i)=>[e,i]).sort(()=>R()-.5);
  for(const [e,i] of list){ if(n>=2)break; if(a<e.a[0]||a>e.a[1])continue;
    const eph=e.ph||(e.a[1]<18?'youth':'any'); if(eph!=='any'&&eph!==ph)continue;
    if(e.g&&!e.g.split(' ').some(x=>tg.has(x)))continue; if(e.st&&Z.stage<e.st)continue; if(e.sx&&Z.sex!==e.sx)continue;
    const key='W'+i; if(Z.evAt[key]!=null&&a-Z.evAt[key]<5)continue; if(!chance(e.p))continue;
    Z.evAt[key]=a; n++; log(fillTxt(pick(e.t)),e.star?'star':''); fact(e.d); applyFx(e.e); }
  /* 各國專屬的日常 */
  const C1=W.CEV&&W.CEV[Z.b.c.k]; if(C1){ Z.cevUsed=Z.cevUsed||{}; const pool=a<18?(Z.stage>=1&&a>=6?C1.y:null):C1.a, p=a<18?.14:.05;
    if(pool&&chance(p)&&(Z.evAt.C==null||a-Z.evAt.C>=3)){ const left=pool.filter(t=>!Z.cevUsed[t]); if(left.length){ const t=pick(left); Z.cevUsed[t]=1; Z.evAt.C=a; log(fillTxt(t)); add('joy',2); } } } }
/* ---------- 成長抉擇(js/choices.js)：每年最多一個，一段人生同一個只出現一次 ---------- */
function chYear(a){ const X=window.CHO; if(!X||Z.done||!Z.tr)return; const ph=a<18?'youth':Z.ph, base=a<3?0:a<18?.5:ph==='pro'?.32:ph==='retired'?.12:.2;
  if(!chance(base)||Z.pending.length>1)return; const tg=window.EVW?window.EVW.tags(Z.b.c.k):new Set();
  const L=X.CH.map((e,i)=>[e,i]).filter(([e,i])=>!Z.chUsed[i]&&a>=e.a[0]&&a<=e.a[1]&&(e.ph?(e.ph==='any'||e.ph===ph):ph==='youth')&&(!e.st||Z.stage>=e.st)&&(!e.sx||e.sx===Z.sex)&&(!e.g||e.g.split(' ').some(t=>tg.has(t)))&&(!e.c||e.c(Z)));
  if(!L.length)return; const wt=e=>(e.p||1)*(e.g?1.6:1)*(e.iq?.3+(Z.iq||.45)*1.8:1); let r=R()*L.reduce((t,[e])=>t+wt(e),0), got=L[0]; for(const x of L){ r-=wt(x[0]); if(r<0){ got=x; break; } }
  Z.chUsed[got[1]]=1; Z.chq=got[1]; ask('ch'); }
const chLabel=k=>(window.CHO&&window.CHO.TR[k])||({joy:'快樂',hp:'健康',edu:'學業',fam:'家人支持',ball:'球感'})[k]||(FL.ABL&&FL.ABL[k])||k;
function doCh(e,o){ if(e.set)Z[e.set]=1; if(o.set)Z[o.set]=1; if(o.risk&&chance(o.risk.p))Z.riskHit=o.risk.k; const fx=[]; for(const [k,v] of Object.entries(o.fx||{})){ if(k==='start'){ if(Z.stage===0)Z.stage=1; continue; } add(k,v); if(!hideFx(k))fx.push([chLabel(k),v]); }
  log(fillTxt(o.t),'ch'); const L=Z.log[0]; L.ti=fillTxt(e.ti); L.fx=fx; if(o.r)L.r=fillTxt(o.r); fact(o.d||e.d); if(Z.riskHit){ const k=Z.riskHit; Z.riskHit=null; accident(k); } }
/* 各國足球歷史:課堂、長輩講古、紀錄片 */
function cfYear(a){ const X=window.CHO, F=X&&X.CF[Z.b.c.k]; if(!F)return; const left=F.filter(t=>!(Z.fseen&&Z.fseen[t])); if(!left.length)return;
  if(a<7||!chance(a<18?.2:a<=80?.04:0))return;
  log(fillTxt(pick(a<18?['老師在課堂上講到{country}的足球歷史。','{dad}跟你講了一段{country}足球的往事。','你在電視上看了一部{country}足球的紀錄片。','你在圖書館翻到一本{country}足球的書。']:['電視上在回顧{country}的足球歷史。','你跟朋友聊起{country}足球的往事。','你帶孩子去參觀了{country}的足球博物館。'])));
  fact(pick(left)); }
/* ---------- 每年的成長事件(js/yearly.js)：每年至少一件，能力在背後增加、不顯示 ---------- */
const hideFx=k=>k==='ball'||k==='start'||(Z.ab&&k in Z.ab);
function yevYear(a){ const Y=window.YEV; if(!Y||Z.done)return; const ph=a<18||Z.ph==='youth'?'youth':Z.ph; Z.yUsed=Z.yUsed||{}; const fresh=t=>Z.yUsed[t]==null||a-Z.yUsed[t]>=12; /* 抽完了才會重複 12 年前的事 */
  const ytg=window.EVW?window.EVW.tags(Z.b.c.k):new Set(); const ok=e=>a>=e.a[0]&&a<=e.a[1]&&(!e.g||e.g.split(' ').some(t=>ytg.has(t)))&&((e.ph||'youth')==='any'||(e.ph||'youth')===ph)&&(!e.st||Z.stage>=e.st)&&(e.ns==null||Z.stage<=e.ns)&&(e.gk==null||(e.gk?Z.pos==='GK':Z.pos!=='GK'))&&(!e.sx||e.sx===Z.sex)&&(!e.c||e.c(Z))&&e.t.some(fresh);
  const n=chance(a<18?.35:.2)?2:1; let L=Y.filter(ok);
  for(let k=0;k<n&&L.length;k++){ const wt=e=>(e.st?1+e.st*.25:1)*(e.gk?1.5:1); let r=R()*L.reduce((t,e)=>t+wt(e),0), e=L[0]; for(const x of L){ r-=wt(x); if(r<0){ e=x; break; } }
    const t=pick(e.t.filter(fresh)); Z.yUsed[t]=a; log(fillTxt(t));
    for(const [k2,v] of Object.entries(e.fx||{})){ if(k2==='ball')add('ball',v); else if(Z.tr&&k2 in Z.tr)add(k2,v); else if(Z.ab&&k2 in Z.ab){ abAdd(k2,v); syncBall(); } else if(k2 in Z.st)add(k2,v); }
    L=L.filter(x=>x!==e); } }
/* ---------- 金錢(單位：萬元新台幣；薪資基準、稅率沿用足球人生 v0.75–0.76 的存款與花錢) ----------
   職業：年薪＝聯賽薪資基準 ×(能力差 6%/分，0.5–2.5 倍)× 主力／輪替／替補 × 位置；扣稅與保險(依聯賽所在國家，薪水越低稅率越低)、經紀人佣金 5%
   上班：薪水依國家所得與職業；生活開銷依國家與生活方式；存款依理財方式每年漲跌，偶爾遇上全球股災 */
const CUR_RATE={USD:32,EUR:35,JPY:1/4.7,KRW:1/43}, CUR_SYM={USD:'$',EUR:'€',JPY:'¥',KRW:'₩'}, CUR_NAME={TWD:'新台幣',USD:'美金',EUR:'歐元',JPY:'日圓',KRW:'韓元'};
let CUR=(()=>{ try{ const c=localStorage.getItem('ml-cur'); if(c==='TWD'||CUR_RATE[c])return c; }catch(e){} const n=navigator.language||'zh'; return /^zh/i.test(n)?'TWD':/^ja/i.test(n)?'JPY':/^ko/i.test(n)?'KRW':'USD'; })();
const fm=v=>{ const sg=v<0?'−':''; v=Math.abs(v);
  if(CUR==='JPY'||CUR==='KRW'){ const x=Math.round(v*10000/CUR_RATE[CUR]), sy=CUR_SYM[CUR]; return sg+sy+(x>=1e8?(+(x/1e8).toFixed(x>=1e10?0:1)).toLocaleString()+'億':x>=1e4?Math.round(x/1e4).toLocaleString()+'萬':x.toLocaleString()); }
  if(CUR!=='TWD'){ const x=v*10000/CUR_RATE[CUR], sy=CUR_SYM[CUR]; return sg+sy+(x>=1e9?(x/1e9).toFixed(2)+'B':x>=1e6?(x/1e6).toFixed(x>=1e8?0:1)+'M':x>=1e3?Math.round(x/1e3).toLocaleString()+'K':Math.round(x).toLocaleString()); }
  return sg+(v>=10000?(v/10000).toFixed(v>=100000?0:1)+' 億元':v>=1?Math.round(v).toLocaleString()+' 萬元':Math.round(v*10000/100)*100+' 元'); };
const INC_BASE=[0,5,15,40,110], LIV_BASE=[0,2.4,7,19,52]; /* 一般人一年的收入與基本開銷(萬元) */
const LIFE={frugal:['節儉',.6,.12,-1,'能省則省，存最多錢，快樂少一點'],normal:['普通',1,.25,0,'過一般的日子'],comfy:['享受',1.5,.45,1.5,'吃好住好，快樂多一點'],lavish:['揮霍',2.2,.75,2.5,'名車派對，很快樂，但錢花得很兇、身體也受影響']};
const INV={bank:['存銀行',.015,.005,'很穩，幾乎不會賠'],fund:['指數基金',.06,.15,'長期穩定成長，偶爾大跌'],house:['房地產',.045,.08,'穩穩漲，遇到景氣差也會跌'],stock:['個股',.07,.32,'可能大賺，也可能大賠'],crypto:['加密貨幣',.1,.75,'暴漲暴跌，心臟要很強']};
const homeSal=()=>{ const N=FL.NATS&&FL.NATS[Z.b.c.k], L=N&&N.home&&N.home[0]&&FL.LV[N.home[0]]; return L&&L.sal?L.sal:null; };
const HB=()=>{ const s=homeSal(); return s?clamp(Math.round(s*.2),150,8000):[0,150,400,1200,3000][Z.b.c.inc]||400; }; /* 家鄉的房價基準 */
const ib=()=>INC_BASE[Z.b.c.inc]||15;
function lgSal(lg){ if(isW())return Math.max(3,10*Math.exp((lg.par-40)*.18)); const L=lg.k&&FL.LV[lg.k]; return L&&L.sal?L.sal:isAm(lg)?Math.max(1,7*Math.exp((lg.par-26)*.2)):Math.max(3,20*Math.exp((lg.par-26)*.2)); } /* 業餘聯賽只有車馬費 */
function proSal(lg,o,role){ return Math.max(.5,lgSal(lg)*clamp(1+(o-lg.par)*.06,.5,2.5)*({主力:1.1,輪替:.9,替補:.7}[role]||1)*({FW:1.15,MF:1.05,DF:.95,GK:.9}[Z.pos]||1)); }
function taxRate(sal,lg){ const T=FL.TAX||{}, c=lg&&lg.k?(isW()?WLG[lg.k]&&WLG[lg.k].c:FL.LV[lg.k]?FL.LV[lg.k].cty:lgCtry(lg.k)):Z.b.c.k, top=T[c]!=null?T[c]:.35; return Math.round(top*Math.min(1,.45+sal/6000)*100)/100; }
function newMoney(){ Z.m={bank:0,life:'normal',inv:'bank',earn:0,inY:0,outY:0,retY:0,netY:0,sal:0,peakSal:0,seen:{},due:[],house:[]}; }
/* 職業賽季的薪水(season 裡呼叫) */
function paySeason(lg,o,role,title){ const M=Z.m; if(!M)return ''; const sal=Z.car.ct&&Z.car.ct.sal?Z.car.ct.sal:proSal(lg,o,role), tr=taxRate(sal,lg), net=sal*(1-tr-.05), bonus=title?sal*.15*(1-tr):0;
  M.netY=net+bonus; M.sal=sal; const first=!M.peakSal; if(sal>M.peakSal)M.peakSal=sal;
  if(M.yf){ const g=net*.05; M.netY-=g; M.give=(M.give||0)+g; }
  if(sal>=3000&&!M.seen.rich){ M.seen.rich=1; M.pendFact='德勤會計師事務所的統計：英超是全世界薪資總額最高的足球聯賽。'; }
  return `年薪 ${fm(sal)}，扣稅與保險 ${Math.round(tr*100)}%、經紀人佣金 5%，實拿 ${fm(net)}${bonus?`，另有冠軍獎金 ${fm(bonus)}`:''}。`; }
function moneyYear(a){ const M=Z.m; if(!M)return; const c=Z.b.c; let inc=0;
  if(a<18){ if(a>=13&&Z.focus==='work')inc=ib()*.08; }
  else if(Z.ph==='pro'){ inc=M.netY||0; M.netY=0; if(Z.car&&isSemi(Z.car.lg)&&a<45)inc+=ib()*(isAm(Z.car.lg)?.8:.5); } /* 半職業／業餘：白天還有工作 */
  else if(Z.ph==='amateur'){ if(Z.co&&Z.co.lv>=1&&!Z.co.out&&Z.co.team)inc=ib()*[.3,1.3,3.5,9,7][Z.co.lv]*.8; else if(Z.job&&a<65){ const tier=Math.max(0,JOB_AD.findIndex(x=>x.includes(Z.job))), gross=ib()*[.7,1,1.7][tier]*Math.min(1.6,1+(a-20)*.025)*(Z.focus==='work'?1.1:1)*(Z.focus==='study'?.9:1); inc=gross*(1-(.05+.04*c.inc)); } if(a>=65)inc+=ib()*(M.pension?.6:.35); }
  else if(Z.ph==='retired'){ const P=M.peakSal||0; inc=({coach:Math.max(ib()*1.6,P*.06),agent:P*(.02+R()*.12)+ib(),pundit:Math.max(ib()*1.4,P*.08),academy:ib()*(.8+R()*.8),home:ib()*.8}[Z.post]||0)*(a>=70?.3:1)*.8; if(a>=65)inc+=ib()*(M.pension?.6:.35); }
  let out=0; if(a>=18&&Z.ph!=='youth'){ const L=LIFE[M.life]; out=(LIV_BASE[c.inc]||7)*L[1]*(1+.15*Z.kids)*(a>=65?.75:1)+Math.max(0,inc)*L[2]; add('joy',L[3]); if(M.life==='lavish')add('hp',-.4); }
  if(Z.ph==='pro'&&(M.life==='lavish'||(M.party||0)>=3)&&chance(.14)){ log(pick(['你凌晨在夜店被拍到，照片登上了所有體育版頭條。','你連續三次訓練遲到，教練把你下放到預備隊。','你的體重明顯上升，球迷在看台上舉牌諷刺你。','你在派對上和人起衝突，警察來了。']),'big'); for(const k of SKILL)abAdd(k,-.8); add('hp',-3); add('joy',-2);
    if(!M.seen.ronnie){ M.seen.ronnie=1; fact('巴西球星小羅納迪尼奧巔峰時拿過金球獎，退休後 2020 年因持假護照入境巴拉圭，被拘留了好幾個月。'); } }
  /* 全球股災 */
  if(a>=18&&chance(.035)){ M.crash=1; if(M.inv!=='bank'&&M.bank>HB()*.05){ log('全球股市大跌，新聞每天都在報誰又賠光了。','big'); fact(M.inv==='crypto'?'比特幣在 2022 年一年內跌了超過六成。':'2008 年金融海嘯，美國標普 500 指數那一年跌了約 37%。'); } } else M.crash=0;
  let ret=0; if(M.bank>0){ const I=INV[M.inv]; let r=I[1]+gauss()*I[2]; if(M.crash)r=Math.min(r,{bank:.01,fund:-.3,house:-.12,stock:-.45,crypto:-.7}[M.inv]); r=Math.max(r,-.95); ret=M.bank*r;
    if(M.inv!=='bank'&&Math.abs(ret)>Math.max(30,M.bank*.25)&&!M.crash)log(`你的${I[0]}今年${ret>0?'大漲，賺了':'大跌，虧了'} ${fm(Math.abs(ret))}。`,ret>0?'':'big'); }
  /* 到期的投資 */
  for(const d of M.due.filter(x=>x.y<=a)){ M.due.splice(M.due.indexOf(d),1); const r=R();
    if(d.k==='start'){ const x=r<.25?4:r<.55?1.2:0; M.bank+=d.amt*x; log(x>=4?`你投資的新創公司被大企業買下，你拿回了 ${fm(d.amt*x)}。`:x>0?'你投資的新創公司勉強撐了下來，錢拿回來一點點。':'你投資的新創公司倒閉了，錢全部沒了。',x>=4?'star':x?'':'big'); add('joy',x>=4?6:x?0:-5); }
    if(d.k==='shop'){ const x=r<.35?2:r<.7?1:0; M.bank+=d.amt*x; log(x>=2?'你投資的店生意很好，你拿回了兩倍的錢。':x?'你投資的店打平了，錢拿了回來。':'你投資的店撐不下去關門了。',x?'':'big'); add('joy',x>=2?4:x?0:-4); }
    if(d.k==='scam'){ if(r<.12){ M.bank+=d.amt*1.2; log('那筆「穩賺的投資」竟然真的賺了一點。'); } else { log('那個保證獲利的投資人捲款跑了，你的錢全部沒了。','big'); fact('各國金融監理機關都提醒：「保證獲利、穩賺不賠」幾乎都是詐騙的特徵。'); add('joy',-8); } } }
  M.bank+=inc-out+ret; M.inY=inc; M.outY=out; M.retY=ret; M.earn+=Math.max(0,inc);
  if(M.pendFact){ log(`你的年薪第一次超過 ${fm(3000)}。`,'star'); fact(M.pendFact); M.pendFact=null; }
  if(a>=18&&M.bank<-HB()*.5){ log('你欠的錢越來越多，最後只好賣掉值錢的東西還債，從頭開始。','big'); M.bank=0; M.life='frugal'; M.house=[]; M.seen.broke=1; add('joy',-12); add('fam',-6); }
  else if(M.bank<0&&a>=65&&Z.kids>0){ if(!M.seen.kidpay){ M.seen.kidpay=1; log('存款用完了，孩子們說好輪流幫你付生活費。'); add('fam',3); } M.bank=0; }
  else if(M.bank<0)add('joy',-2);
  if(a>=18&&chance(Z.ph==='pro'?.45:.3)&&Z.pending.length<=1){ const L=MCH.filter(e=>!(M.seen[e.id]>=a-(e.cd||4))&&e.c(M,a)); if(L.length){ const e=pick(L); M.seen[e.id]=a; Z.mq=e.id; ask('mch'); } } }
/* 花錢的抉擇(改寫自足球人生的場外事件) */
const PAR_ALIVE=()=>!(Z.mom.gone!=null&&Z.dad.gone!=null);
const MCH=[
 {id:'house',cd:3,c:(M,a)=>['par','home','city','villa'].some(k=>!M.house.includes(k)&&HP(k)<=M.bank),mk:M=>({t:'買房子',d:`存款到了 ${fm(M.bank)}。${Z.ph==='pro'?'經紀人說：「錢放著會變薄，該替自己和家人想想了。」':'銀行的人說，現在的房貸利率還不錯。'}`,
   o:[...['par','home','city','villa'].filter(k=>!M.house.includes(k)&&(k!=='par'||PAR_ALIVE())).slice(0,3).map(k=>({t:HT[k][0],cost:HP(k),fx:HT[k][2],f:()=>{ M.house.push(k); log(fillTxt(HT[k][1]),'star'); }})),{t:'先不買，錢留著',f:()=>log('你把錢留在銀行。')}]})},
 {id:'fund',cd:4,c:M=>M.bank>=HB()*.4,mk:M=>({t:'理財顧問',d:'銀行派來一位理財顧問：「以你的收入，錢不該只躺在帳戶裡。」',
   o:[{t:'把存款改成指數基金',fx:{calm:1},f:()=>{ M.inv='fund'; log('你把存款放進了指數基金。顧問說：「放著別管，十年後再看。」'); }},
      {t:'投資朋友的新創公司',cost:Math.round(M.bank*.2),fx:{ambi:1},f:c=>{ M.due.push({k:'start',amt:c,y:Math.floor(Z.t)+2}); log('你簽下投資協議。朋友說：「兩年後，我請你去最好的餐廳。」'); }},
      {t:'錢放銀行就好',fx:{calm:1},f:()=>log('你謝謝顧問的好意。錢放在銀行，晚上睡得比較安穩。')}]})},
 {id:'scam',cd:6,c:M=>M.bank>=HB()*.3,mk:M=>({t:'穩賺的投資',d:'一位西裝筆挺的人找上你：「保證每年兩成獲利，名額只剩兩個。」',
   o:[{t:'投一大筆',cost:Math.round(M.bank*.4),fx:{ambi:1},f:c=>{ M.due.push({k:'scam',amt:c,y:Math.floor(Z.t)+1}); log('你簽了名。對方緊緊握住你的手：「明年見。」'); }},
      {t:'婉拒',fx:{calm:2},f:()=>log('你婉拒了。半年後，那個人上了社會新聞。')}]})},
 {id:'shop',cd:5,c:M=>M.bank>=HB()*.1&&Z.ph!=='pro',mk:M=>({t:'朋友的店',d:'老朋友想開一間店，問你要不要一起投資。',
   o:[{t:'投資',cost:Math.round(M.bank*.3),fx:{team:1},f:c=>{ M.due.push({k:'shop',amt:c,y:Math.floor(Z.t)+2}); log('你成了小店的股東，開幕那天你去剪了綵。'); }},
      {t:'不投資',fx:{calm:1},f:()=>log('你說你還是想把錢留著。')}]})},
 {id:'yf',cd:4,c:M=>Z.ph==='pro'&&!M.yf&&M.bank>=HB()*.1,mk:M=>({t:'家鄉的來信',d:`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}小時候的教練寫信給你：球場的燈壞了一半，孩子們的球鞋都是學長穿剩的。`,
   o:[{t:'每季捐出薪水的 5%',fx:{kind:3},f:()=>{ M.yf=1; log('你答應長期資助家鄉的少年隊。教練回信只寫了一句：「孩子們知道了，都在尖叫。」'); }},
      {t:'一次捐一筆就好',cost:Math.round(HB()*.1),fx:{kind:2},f:c=>{ M.give=(M.give||0)+c; log('新的燈裝好那天，教練傳來一張照片：球場亮得像白天。'); }},
      {t:'下次再說',f:()=>log('你把信收進抽屜。')}]})},
 {id:'coach',cd:3,c:(M,a)=>Z.ph==='pro'&&a<=31&&M.bank>=Math.max(20,M.sal*.1),mk:M=>({t:'私人教練',d:'一位曾帶過國家隊的體能教練說，可以幫你在休賽期練得更好。',
   o:[{t:'請他來',cost:Math.round(Math.max(15,M.sal*.08)),fx:{disc:2,sta:1,phy:1,pac:.5},f:()=>log('整個休賽期，你每天早上六點就在跑坡。')},{t:'自己練就好',f:()=>log('你照著球隊給的課表自己練。')}]})},
 {id:'school',cd:5,c:(M,a)=>Z.ph==='pro'&&a>=28&&!M.school&&M.bank>=HB()*2.5,mk:M=>({t:'足球學校',d:'一位退休的老教練找上你：「我有場地、有教練，就缺一個名字和一筆錢。」',
   o:[{t:'創辦自己的足球學校',cost:Math.round(HB()*2.5),fx:{kind:2,team:1},f:()=>{ M.school=1; log(`${Z.me.split(' ')[0]}足球學校開幕了，第一天來了 40 個孩子。`,'star'); }},{t:'等退休再說',f:()=>log('老教練笑了：「我等你。」')}]})},
 {id:'car',cd:6,c:(M,a)=>a<=50&&M.bank>=HB()*.1,mk:M=>({t:'新車',d:'你的車已經很舊了。',
   o:[...(M.bank>=HB()*.6?[{t:'買一台跑車',cost:Math.round(HB()*.5),fx:{joy:4,ambi:1},f:()=>log('你把跑車開回家，鄰居都出來看。')}]:[]),{t:'買一台實用的車',cost:Math.round(HB()*.08),fx:{joy:2},f:()=>log('你買了一台實用的車，載家人剛剛好。')},{t:'舊的還能開',fx:{disc:1},f:()=>log('你決定再開幾年。')}]})},
 {id:'med',cd:8,c:(M,a)=>a>=30&&PAR_ALIVE()&&M.bank>=HB()*.05,mk:M=>({t:'醫藥費',d:`${Z.mom.gone==null?Z.mom.n:Z.dad.n}生病了，醫生說有一種比較好、但很貴的治療方式。`,
   o:[{t:'用最好的治療',cost:Math.round(HB()*.12),fx:{fam:6,kind:2},f:()=>log('治療很順利，醫生說恢復得比預期好。')},{t:'用一般的治療',cost:Math.round(HB()*.03),fx:{fam:2},f:()=>log('治療花了比較久的時間，但慢慢好起來了。')}]})},
 {id:'sib',cd:8,c:(M,a)=>Z.sibs>0&&a>=20&&a<=40&&M.bank>=HB()*.08,mk:M=>({t:'弟妹的學費',d:'家裡的弟弟妹妹考上了大學，但學費不便宜。',
   o:[{t:'幫忙付學費',cost:Math.round(HB()*.08),fx:{fam:5,kind:2},f:()=>log('你幫弟妹付了學費。畢業典禮那天，他們把學士帽丟給你。')},{t:'讓他們自己貸款',f:()=>log('你說貸款也是一種學習。')}]})},
 {id:'kidsch',cd:10,c:(M,a)=>Z.kids>0&&a>=30&&a<=55&&M.bank>=HB()*.3,mk:M=>({t:'孩子的學校',d:'孩子要上學了，有一間很貴的國際學校。',
   o:[{t:'送去國際學校',cost:Math.round(HB()*.3),fx:{fam:3},f:()=>log('孩子在國際學校交了來自很多國家的朋友。')},{t:'家附近的學校就好',fx:{calm:1},f:()=>log('孩子每天走路上學，放學跟鄰居一起踢球。')}]})},
 {id:'trip',cd:5,c:(M,a)=>a>=22&&a<=80&&M.bank>=HB()*.06,mk:M=>({t:'家族旅行',d:'家人說好久沒有一起出去玩了。',
   o:[{t:'帶全家出國旅行',cost:Math.round(HB()*.05),fx:{joy:4,fam:3},f:()=>log('你帶全家去了一趟國外，照片洗了一大疊。')},{t:'在附近走走就好',cost:Math.round(HB()*.01),fx:{fam:2},f:()=>log('你們去了附近的海邊，玩了一整天。')}]})},
 {id:'give',cd:6,c:(M,a)=>a>=25&&M.bank>=HB()*.3,mk:M=>({t:'災區募款',d:'一場大地震重創了一個國家，很多球員都在捐款。',
   o:[{t:'捐一大筆',cost:Math.round(HB()*.2),fx:{kind:4,joy:2},f:c=>{ M.give=(M.give||0)+c; log('你捐了一筆錢，沒有告訴任何人。'); }},{t:'捐一點',cost:Math.round(HB()*.02),fx:{kind:1},f:c=>{ M.give=(M.give||0)+c; log('你捐了一點錢。'); }},{t:'不捐',f:()=>log('你看完新聞，關掉了電視。')}]})},
 {id:'club',cd:20,c:(M,a)=>a>=30&&!M.club&&M.bank>=HB()*40,mk:M=>({t:'買下家鄉的球隊',d:`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}的職業球隊財務出了問題，老闆想把球隊賣掉。`,
   o:[{t:'買下來',cost:Math.round(HB()*30),fx:{ambi:3,joy:8},f:()=>{ M.club=1; { const H=homeLg(Z.b.c), lg=lgOf(H[0]||null); Z.own={club:pickTeam(lg,lg.par-4),lg:lg.n,share:1,val:Math.round(HB()*30),str:.35,wage:0,y:0}; Z.ownEver=1; Z.ownName=Z.own.club; } log('你成了家鄉球隊的老闆。第一個主場，看台上掛著一面寫著你名字的大旗。','star'); }},{t:'太冒險了',fx:{calm:1},f:()=>log('你說你還是比較適合在場上，不是在辦公室。')}]})},
 {id:'pension',cd:10,c:(M,a)=>a>=40&&a<=60&&!M.pension&&M.bank>=HB()*.3,mk:M=>({t:'退休規劃',d:'保險業務員說，現在買一份年金，老了每個月都有錢領。',
   o:[{t:'買一份年金',cost:Math.round(HB()*.25),fx:{disc:2},f:()=>{ M.pension=1; log('你買了一份年金。'); }},{t:'自己存就好',f:()=>log('你說你自己會存。')}]})},
 {id:'watch',cd:4,c:(M,a)=>Z.ph==='pro'&&(M.life==='comfy'||M.life==='lavish')&&M.bank>=M.sal*.2,mk:M=>({t:'名錶',d:'隊友都戴著很貴的錶，有人問你要不要一起去店裡看看。',
   o:[{t:'買一支',cost:Math.round(Math.max(10,M.sal*.05)),fx:{joy:2},f:()=>log('你買了一支名錶。比賽前，你把它小心地收進置物櫃。')},{t:'手機就能看時間',fx:{calm:1},f:()=>log('你笑著說，手機就能看時間。')}]})}];
const HT={par:['幫爸媽買一間房子','爸媽搬家那天，{mom}把你的第一雙球鞋擺在新家的玄關。',{fam:8,joy:4,kind:2}],home:['在家鄉買一間房子','你在家鄉買了一間房子，鄰居的小孩會在門口等你。',{joy:4}],
 city:['在城裡買一間大房子','你搬進了城裡的大房子，從陽台看得到整座城市。',{joy:5,ambi:1}],villa:['買一棟海邊別墅','你買下一棟海邊別墅，站在陽台上聽得到浪的聲音。',{joy:6}]};
const HP=k=>Math.round(HB()*{par:1,home:1.6,city:2.5,villa:4.5}[k]*(Z.ph==='pro'?1:.6));
/* 更多花錢的抉擇：揮霍與醜聞(像小羅)、回饋家鄉(像馬內、德羅巴) */
MCH.push(
 {id:'share',cd:8,c:(M,a)=>a>=25&&!Z.own&&M.bank>=HB()*1.5,mk:M=>{ const mc=mainClub(), H=homeLg(Z.b.c), lg=lgOf(H[0]||null), cl=mc||pickTeam(lg,lg.par); Z.mqClub=cl; return {t:'球隊的股份',d:`${cl}${mc?'（你的老東家）':''}正在找新的投資人，問你要不要成為股東。`,
   o:[{t:'買下 20% 的股份',cost:Math.round(HB()*1.2),fx:{ambi:2},f:()=>{ Z.own={club:cl,lg:'',share:.2,val:Math.round(HB()*6),str:.5,wage:0,y:0}; Z.ownEver=1; Z.ownName=cl+'（股東）'; log(`你成為${cl}的股東，球隊在官網上發了一則公告。`,'star'); }},{t:'不投資',fx:{calm:1},f:()=>log('你說你還是只當球迷就好。')}]}; }},
 {id:'bigclub',cd:30,c:(M,a)=>a>=35&&!Z.own&&M.bank>=300000,mk:M=>{ const k=pick(ELITE()), lg=lgOf(k), cl=pick(teamsOf(lg).slice(6,14).filter(clubOK)); return {t:'買下一支頂級聯賽球隊',d:`${lg.n}的${cl}正在出售，你的財富已經足夠買下它。`,
   o:[{t:`買下${cl}`,cost:Math.round(M.bank*.6),fx:{ambi:4,joy:6},f:c=>{ Z.own={club:cl,lg:lg.n,share:1,val:c,str:.45,wage:.01,y:0}; Z.ownEver=1; Z.ownName=cl; M.club=1; log(`你買下了${lg.n}的${cl}，成為球隊的老闆。`,'star'); }},{t:'這太瘋狂了',fx:{calm:2},f:()=>log('你搖搖頭，關掉了電腦。')}]}; }},
 {id:'party',cd:2,c:(M,a)=>Z.ph==='pro'&&a<=34&&M.bank>=Math.max(20,M.sal*.1),mk:M=>({t:'今晚的派對',d:'隊友說今晚包下了城裡最大的夜店，明天早上還有訓練。',
   o:[{t:'包下整個 VIP 區請大家',cost:Math.round(Math.max(10,M.sal*.06)),fx:{joy:4,team:1,disc:-2,hp:-2},f:()=>{ M.party=(M.party||0)+1; log('你玩到天亮，隔天訓練遲到了半小時。'); }},
      {t:'去露個臉就回家',fx:{team:1,disc:1},f:()=>log('你喝了一杯果汁，十一點就回家睡覺。')},{t:'不去',fx:{disc:2},f:()=>log('你在家看了對手的比賽影片。')}]})},
 {id:'casino',cd:5,c:(M,a)=>Z.ph==='pro'&&M.bank>=HB()*.3,mk:M=>({t:'賭場的貴賓室',d:'朋友帶你進了賭場的貴賓室，桌上的籌碼一疊一疊。',
   o:[{t:'押一大筆',cost:Math.round(M.bank*.25),fx:{brave:1,calm:-2},f:c=>{ if(chance(.3)){ M.bank+=c*2.2; log('你贏了！整桌的人都在拍你的肩膀。'); } else { log('一個晚上，你輸掉了一棟房子的錢。','big'); add('joy',-6); } }},
      {t:'小玩一下',cost:Math.round(Math.max(2,M.bank*.02)),fx:{joy:1},f:()=>log('你玩了幾把就收手。')},{t:'轉身離開',fx:{calm:2},f:()=>log('你說你還是比較喜歡球場。')}]})},
 {id:'cars',cd:4,c:(M,a)=>Z.ph==='pro'&&(M.life==='comfy'||M.life==='lavish')&&M.bank>=HB()*.8,mk:M=>({t:'跑車收藏',d:'車商打電話來，說有一台限量跑車全世界只有 50 台。',
   o:[{t:'買下來',cost:Math.round(HB()*.6),fx:{joy:4,ambi:1},f:()=>{ M.cars=(M.cars||0)+1; log(M.cars>=3?`這已經是你車庫裡的第 ${M.cars} 台跑車了。`:'你把跑車開進訓練場，隊友都圍過來拍照。'); }},{t:'不需要',fx:{disc:1},f:()=>log('你說你的車還很好開。')}]})},
 {id:'lend',cd:6,c:(M,a)=>a>=20&&M.bank>=HB()*.1,mk:M=>({t:'親戚來借錢',d:'很久沒聯絡的遠房表哥說要做生意，想跟你借一筆錢。',
   o:[{t:'借他',cost:Math.round(HB()*.1),fx:{kind:2},f:()=>{ if(chance(.3)){ M.bank+=HB()*.1; log('表哥的生意做起來了，兩年後把錢還給了你。'); } else log('那筆錢再也沒有回來，表哥也不太接你的電話了。','big'); }},
      {t:'婉拒',fx:{calm:1,fam:-2},f:()=>log('你婉拒了，表哥在家族群組裡說你變了。')}]})},
 {id:'tax',cd:12,c:(M,a)=>Z.ph==='pro'&&M.peakSal>=1500&&chance(.4),mk:M=>({t:'稅務調查',d:'稅務機關說你的肖像權收入有問題，要求說明。',
   o:[{t:'請最好的律師，補繳稅款',cost:Math.round(Math.min(M.bank,M.peakSal*.6)),fx:{calm:1},f:()=>{ log('你補繳了稅款和罰金，事情總算落幕。'); fact('梅西 2016 年在西班牙因逃稅被判刑 21 個月緩刑，後來改為繳納罰金。'); }},
      {t:'說是經紀人處理的，不關你的事',fx:{calm:-2},f:()=>{ if(chance(.5)){ log('法院判你要補繳兩倍的稅款，新聞連續報導了好幾天。','big'); M.bank-=M.peakSal*.9; add('joy',-8); } else log('調查最後不了了之。'); }}]})},
 {id:'hosp',cd:10,c:(M,a)=>a>=24&&M.bank>=HB()*3&&Z.b.c.inc<=2,mk:M=>({t:'家鄉的醫院',d:`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}最近的醫院要走好幾個小時，很多人來不及送醫。`,
   o:[{t:'捐錢蓋一間醫院',cost:Math.round(HB()*2.5),fx:{kind:5,joy:5,fam:3},f:c=>{ M.give=(M.give||0)+c; M.hosp=1; log('醫院開幕那天，全村的人都來了。門口的牌子上寫著你的名字。','star'); fact('塞內加爾球星馬內，在家鄉村莊捐建了醫院和學校。'); }},
      {t:'捐一輛救護車',cost:Math.round(HB()*.3),fx:{kind:3,joy:2},f:c=>{ M.give=(M.give||0)+c; log('救護車開進村子的那天，孩子們追著它跑。'); }},{t:'現在還不行',f:()=>log('你說等你退休再回來做。')}]})},
 {id:'found',cd:10,c:(M,a)=>a>=26&&M.bank>=HB()*2&&!M.found,mk:M=>({t:'成立基金會',d:'你的律師建議，與其每次零散地捐，不如成立一個基金會。',
   o:[{t:'成立自己的基金會',cost:Math.round(HB()*1.5),fx:{kind:4,disc:1},f:c=>{ M.give=(M.give||0)+c; M.found=1; log(`「${Z.me.split(' ')[0]}基金會」成立了，第一年資助了 200 個孩子上學。`,'star'); fact('象牙海岸球星德羅巴成立的基金會，在家鄉興建了醫院。'); }},{t:'再想想',f:()=>log('你說再想想。')}]})},
 {id:'trial',cd:6,c:(M,a)=>a>=24&&M.bank>=HB()*.3,mk:M=>({t:'家鄉的孩子',d:'家鄉有個 15 歲的孩子踢得很好，但家裡付不起出國試訓的機票。',
   o:[{t:'幫他出所有的錢',cost:Math.round(HB()*.2),fx:{kind:3},f:c=>{ M.give=(M.give||0)+c; Z.protege=Math.floor(Z.t); log('你幫他買了機票。他在機場一直跟你鞠躬。'); }},{t:'介紹經紀人給他',fx:{team:2},f:()=>log('你把他介紹給你的經紀人。')}]})},
 {id:'ad',cd:4,c:(M,a)=>Z.ph==='pro'&&(Z.car.lg&&Z.car.lg.par>=48||Z.car.caps>=10||famePts()>=35),mk:M=>({t:'廣告代言',d:'一家運動品牌想請你拍廣告。',
   o:[{t:'接下來',fx:{joy:2},f:()=>{ const g=Math.round(Math.max(10,M.sal*.15*(.5+famePts()/50))); M.bank+=g; M.earn+=g; log(`你拍了一支廣告，收入 ${fm(g)}。`); }},{t:'只代言家鄉的小品牌',fx:{kind:2},f:()=>{ const g=Math.round(Math.max(3,M.sal*.03)); M.bank+=g; log('你幫家鄉的小品牌拍了廣告，老闆哭了。'); }}]})},
 {id:'book',cd:15,c:(M,a)=>Z.ph==='retired'&&Z.car.hist.length>=8,mk:M=>({t:'自傳',d:'出版社想幫你出一本自傳。',
   o:[{t:'寫，把所有故事都寫出來',fx:{crea:2,joy:3},f:()=>{ const g=Math.round(HB()*.15); M.bank+=g; M.earn+=g; log(`你的自傳上市了，賣出好幾萬本。`,'star'); }},{t:'有些事還是不說的好',fx:{calm:2},f:()=>log('你婉拒了。')}]})});

/* ---------- 冠軍與獎項 ---------- */
const cfOf=k=>{ const N=FL.NATS&&FL.NATS[k]; if(N&&N.cf)return N.cf; if(['IL','KZ','AZ','GE','AM','CY'].includes(k))return 'UEFA'; if(k==='AU')return 'AFC';
  const t=window.EVW?window.EVW.tags(k):new Set(); return t.has('sam')?'CONMEBOL':t.has('cam')||t.has('nam')?'CONCACAF':t.has('weu')||t.has('eeu')||t.has('nor')?'UEFA':t.has('waf')||t.has('eaf')||t.has('saf')||t.has('naf')?'CAF':t.has('oce')?'OFC':'AFC'; };
const ctryN=k=>(FL.NATS&&FL.NATS[k]&&FL.NATS[k].n)||((C.find(x=>x.k===k)||{}).n)||'';
const CLUBCUP={UEFA:'歐冠',AFC:'亞冠',CONMEBOL:'自由盃',CAF:'非洲冠軍聯賽',CONCACAF:'中北美冠軍盃',OFC:'大洋洲冠軍聯賽'};
const NTCUP={UEFA:['歐洲國家盃',y=>y%4===0],CONMEBOL:['美洲盃',y=>y%4===0],AFC:['亞洲盃',y=>y%4===3],CAF:['非洲國家盃',y=>y%2===1],CONCACAF:['金盃賽',y=>y%2===1],OFC:['大洋洲國家盃',y=>y%4===0]};
const CPOY={UEFA:'歐足聯年度最佳球員',AFC:'亞洲足球先生',CONMEBOL:'南美足球先生',CAF:'非洲足球先生',CONCACAF:'中北美年度最佳球員',OFC:'大洋洲足球先生'};
function hon(name,yr,k,txt){ const C2=Z.car; C2.troph.push(`${name} ${yr}`); log(txt||`你拿下了${name}！`,'star'); add('fame',k==='wc'?20:k==='cl'||k==='cont'?8:3); if(['cup','cl','cont'].includes(k)&&Z.ph==='pro'&&chance(.7))liveCard(`${name.replace('冠軍','')}決賽`,k==='cont'?pickNat():k==='cl'?pickElite():oppTeam(C2.lg),true,{pk:true,side:k==='cont'?Z.b.c.n:undefined}); add('joy',k==='wc'?20:k==='cl'||k==='cont'?10:6); queuePost(k,name,yr); }
function award(name,yr,k,txt){ const C2=Z.car; C2.aw.push(`${name} ${yr}`); add('fame',k==='bdo'?25:5); log(txt||`你獲選${name}。`,'star'); add('joy',k==='bdo'?15:5); queuePost(k||'ind',name,yr); }
function awardsSeason(a,row,lg,o,str){ const yr=row.y, ck=lg.k?lgCtry(lg.k):Z.b.c.k, cn=ctryN(ck)||Z.b.c.n, cf=cfOf(ck||Z.b.c.k);
  if(chance(.015+str*.07))hon(`${cn}${isW()?'女子':''}盃賽冠軍`,yr,'cup',`${Z.car.club}拿下了${cn}${isW()?'女子':''}盃賽冠軍！`);
  const cc=isW()?(cf==='UEFA'?'女子歐冠':null):CLUBCUP[cf];
  if(cc&&lg.par>=(isW()?50:44)&&row.rank<=3&&chance(Math.max(0,(lg.par-40)/300)*str*str))hon(`${cc}冠軍`,yr,'cl',`${Z.car.club}拿下了${cc}冠軍，站上${cf==='UEFA'?'歐洲':'洲際'}之巔！`);
  if(Z.pos!=='GK'&&row.g>=(lg.par>=55?22:18)&&chance(.45))award(`${lg.n}金靴`,yr,'ind',`你以 ${row.g} 球拿下${lg.n}金靴。`);
  if(Z.pos==='GK'&&row.cs>=15&&chance(.4))award(`${lg.n}金手套`,yr,'ind',`你以 ${row.cs} 場零封拿下${lg.n}金手套。`);
  if(a<=21&&row.role==='主力'&&row.rt>=7.2&&chance(.35))award(`${lg.n}最佳年輕球員`,yr,'ind');
  const my=cfOf(Z.b.c.k), poy=CPOY[my]; if(poy&&row.role==='主力'&&row.rt>=7.4&&o>=(my==='UEFA'?74:isW()?54:62)&&chance(.25))award((isW()?'女子':'')+poy,yr,'ind'); }
function contCup(yr,N){ const C2=Z.car; if(!C2.inNT||yr<2027)return; const cf=cfOf(Z.b.c.k), T=NTCUP[cf]; if(!T||!T[1](yr))return; const nm=(isW()?'女子':'')+T[0], ti=Math.min(4,N?N.tier:4);
  if(chance([.28,.15,.06,.02,.006][ti])){ hon(`${nm}冠軍`,yr,'cont',`你和${Z.b.c.n}${isW()?'女足':''}國家隊拿下 ${yr} 年${nm}冠軍！`); if(chance(.25))award(`${nm}最佳球員`,yr,'ind'); }
  else log(`你代表${Z.b.c.n}踢了 ${yr} 年${nm}，${pick(ti<=1?['在八強止步','一路踢進四強','在決賽輸了','在十六強被淘汰']:['在小組賽就被淘汰','在十六強被淘汰','在八強止步'])}。`); }
/* ---------- 社群貼文(改寫自足球人生 v0.78)：每年挑最大的一件發一則 ---------- */
const POST_RANK=['fifa','bdo','wc','cl','cont','prodigy','lg','up','ind','cup','nt','kid','sign','bye'];
function queuePost(k,name,yr){ (Z.pq=Z.pq||[]).push({k,name,yr,club:Z.car.club}); }
function flushPost(){ const q=Z.pq; Z.pq=[]; if(!q||!q.length)return; q.sort((x,y)=>POST_RANK.indexOf(x.k)-POST_RANK.indexOf(y.k)); const P=q[0], more=q.slice(1).filter(x=>x.k==='ind').map(x=>x.name);
  const C2=Z.car, nat=Z.b.c.n, NT=`${nat}${isW()?'女足':''}國家隊`, club=P.club||C2.club||'', k=P.k, me=Z.me;
  const acct=k==='bdo'||k==='ind'||k==='prodigy'||k==='kid'||k==='fifa'?'足球新聞':k==='wc'||k==='cont'||k==='nt'?NT:club, place=k==='bdo'?'巴黎・頒獎典禮':k==='wc'||k==='cont'||k==='nt'||k==='prodigy'||k==='kid'?nat:k==='fifa'?'蘇黎世':`${club}主場`;
  const fame=clamp(((C2.lg?C2.lg.par:30)-15)/45,.1,1)*(1+Math.min(C2.caps,100)/100), likes=Math.round((.4+famePts()/60)*{bdo:1200000,wc:900000,cl:500000,cont:350000,lg:180000,up:120000,prodigy:260000,kid:70000,fifa:900000,ind:80000,cup:60000,nt:90000,sign:30000,bye:150000}[k]*fame*fame*(.7+R()*.6))+Math.round(R()*300)+20;
  const award={sign:'新球員加盟',nt:'國家隊名單',bye:'謝謝你',prodigy:'天才誕生',kid:'星二代',fifa:'國際足總主席'}[k]||P.name;
  const cap={bdo:`🏆 ${me} 拿下 ${P.yr} ${P.name}！`,wc:`🏆 ${nat}拿下${P.name}！${me} 和隊友們寫下歷史。`,cl:`🏆 ${P.name}！${me} 和 ${club} 站上${/歐冠/.test(P.name)?'歐洲':'洲際'}之巔。`,cont:`🏆 ${P.name}！`,lg:`🏆 ${P.name}！謝謝每一位球迷。`,up:`🎉 我們${P.name}了！下個賽季見。`,kid:`⚽ ${P.name} 簽下職業合約！${me} 在看台上哭了。`,fifa:`🌍 ${me} 當選國際足總主席。`,prodigy:`🌟 ${me}，${P.yr-Z.year} 歲，被稱為${nat}「${P.name}」。歐洲各大豪門都在排隊。`,ind:`🏅 ${me} 獲選 ${P.name}`,cup:`🏆 ${P.name}！`,
    nt:`📋 最新一期國家隊名單出爐，${me} 首度入選！`,sign:`✍️ 歡迎 ${me} 加盟 ${club}！`,bye:`💙 謝謝你，${me}。${C2.hist.length} 個賽季、${C2.apps} 次出場，這裡永遠是你的家。`}[k]+(more.length?`<br>🏅 本季個人獎：${more.join('、')}`:'');
  const fr=Z.peers.filter(p=>p.stage>=2).map(p=>p.n), kid=Z.kidClub||`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}少年隊`, cm=[];
  cm.push([fr[0]||pick(['老隊友','以前的隊長']),1,pick(k==='bye'?['謝謝你，兄弟。','場上見過最拚的人 👏']:k==='sign'?['終於等到這天了！','加油，我們都在看 🔥']:['你值得的 🔥','我就說吧！','一起長大的那個孩子 👏'])]);
  if(Z.wed)cm.push([Z.wed,0,pick(['❤️','我就知道 ❤️','回家吃飯了'])]); else if(Z.mom.gone==null)cm.push([Z.mom.n,0,pick(['媽媽以你為榮 ❤️','記得多穿一點','❤️❤️❤️'])]);
  cm.push([kid,1,'我們的孩子 ❤️']);
  cm.push([pick(['ajuan_10','soccer_mom88','北看台老球迷','kid_striker','ultras_1907','mylife_fan']),0,pick(k==='bye'?['我哭了 😭','不要走 😭','傳奇 🙏']:['凌晨三點起床的我終於可以睡了 😭',`${nat}之光 🙌`,'值回票價','我要買他的球衣！！'])]);
  log('','post'); Z.log[0].p={k,acct,place,award,sub:String(P.yr),name:me,team:k==='wc'||k==='cont'||k==='nt'?NT:club||Z.club||nat,likes,cap,cm:cm.slice(0,4),nt:k==='wc'||k==='cont'||k==='nt',kit:k==='wc'||k==='cont'||k==='nt'?natKit(Z.b.c.k):club?clubKit(club):curKit()}; }
const sprSrc=nt=>{ const h=sprite(Z.me,Z.look,nt?'#d8453a':SHIRT[Z.seed%6],120); const m=h.match(/src="([^"]+)"/); return m?m[1]:''; };
function postHTML(p,i){ return `<div class="pst"><div class="ph2"><i>${[...p.acct][0]}</i><span><b>${p.acct}</b><small>${p.place}</small></span></div><div class="pimg"><b>${p.award}</b><small>${p.sub}</small>${kitImg(p.kit||curKit(),96,posePose())}<em>${p.name}</em><span>${p.team}</span></div>
  <div class="plk">❤️ ${p.likes.toLocaleString()} 個讚</div><div class="pcp"><b>${p.acct}</b> ${p.cap}</div><div class="pcm">${p.cm.map(([n,v,t])=>`<div><b${v?' class="v"':''}>${n}</b> ${t}</div>`).join('')}</div><button type="button" class="psv" data-pi="${i}">📷 存成圖片</button></div>`; }
/* 存成 1080×1350 圖片(同足球人生 postImage) */
function postImage(P,done){ const W=1080,H=1350, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d'), F='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const img=new Image(); let fin=false; const go=()=>{ if(fin)return; fin=true; draw(img.complete&&img.naturalWidth?img:null); }; img.onload=go; img.onerror=go; setTimeout(go,1500); img.src=kitSrc(P.kit||curKit(),posePose());
  function draw(spr){ c.fillStyle='#0f1220'; c.fillRect(0,0,W,H); const ay=70;
    c.fillStyle='#ffcf4a'; c.beginPath(); c.arc(70,ay,36,0,7); c.fill(); c.fillStyle='#0f1220'; c.beginPath(); c.arc(70,ay,31,0,7); c.fill();
    c.fillStyle='#ffcf4a'; c.font=`900 28px ${F}`; c.textAlign='center'; c.textBaseline='middle'; c.fillText([...P.acct][0],70,ay+1);
    c.textAlign='left'; c.textBaseline='alphabetic'; c.fillStyle='#eef1f8'; c.font=`700 32px ${F}`; c.fillText(P.acct,124,ay-4); const aw=c.measureText(P.acct).width; c.fillStyle='#6cc6ff'; c.font=`700 26px ${F}`; c.fillText(' ✔',124+aw,ay-4); c.fillStyle='#8b93b0'; c.font=`400 24px ${F}`; c.fillText(P.place,124,ay+30);
    const T=140, IH=900, cx=W/2, cy=T+IH*.5; c.save(); c.beginPath(); c.rect(0,T,W,IH); c.clip();
    const bg=c.createLinearGradient(0,T,W,T+IH); bg.addColorStop(0,'#2a1d05'); bg.addColorStop(.7,'#0b0f22'); c.fillStyle=bg; c.fillRect(0,T,W,IH);
    c.fillStyle='#ffcf4a1c'; for(let i=0;i<24;i++){ const a0=i*Math.PI/12; c.beginPath(); c.moveTo(cx,cy); c.arc(cx,cy,1300,a0,a0+Math.PI/24); c.closePath(); c.fill(); }
    const rg=c.createRadialGradient(cx,T+IH*.45,10,cx,T+IH*.45,520); rg.addColorStop(0,'#ffcf4a66'); rg.addColorStop(1,'#ffcf4a00'); c.fillStyle=rg; c.fillRect(0,T,W,IH);
    c.textAlign='center'; let fs=124; c.font=`900 ${fs}px ${F}`; while(c.measureText(P.award).width>W-120&&fs>50){ fs-=6; c.font=`900 ${fs}px ${F}`; }
    c.shadowColor='#ffb300'; c.shadowBlur=40; c.fillStyle='#ffcf4a'; c.fillText(P.award,cx,T+160); c.shadowBlur=0; c.fillStyle='#fff'; c.font=`900 32px ui-monospace,Consolas,monospace`; c.fillText(P.sub.split('').join(' '),cx,T+215);
    if(spr){ const sh=420, sw=sh*spr.naturalWidth/spr.naturalHeight; c.imageSmoothingEnabled=false; c.fillStyle='#00000066'; c.beginPath(); c.ellipse(cx,T+250+sh-6,sw*.4,22,0,0,7); c.fill(); c.drawImage(spr,cx-sw/2,T+250,sw,sh); }
    c.shadowColor='#000'; c.shadowBlur=24; c.fillStyle='#fff'; let nf=72; c.font=`900 ${nf}px ${F}`; while(c.measureText(P.name).width>W-100&&nf>40){ nf-=4; c.font=`900 ${nf}px ${F}`; } c.fillText(P.name,cx,T+IH-110); c.shadowBlur=0;
    c.fillStyle='#ffcf4a'; c.font=`700 34px ${F}`; c.fillText(P.team,cx,T+IH-58); c.restore();
    c.textAlign='left'; let y=T+IH+64; c.font=`400 46px ${F}`; c.fillStyle='#e0483e'; c.fillText('❤',48,y); c.fillStyle='#eef1f8'; c.font=`400 40px ${F}`; c.fillText('💬   ↗',120,y);
    y+=56; c.font=`700 30px ${F}`; c.fillText(`${P.likes.toLocaleString()} 個讚`,48,y);
    const line=(who,v,t,yy)=>{ c.font=`700 28px ${F}`; c.fillStyle='#eef1f8'; c.fillText(who,48,yy); let x=48+c.measureText(who).width; if(v){ c.fillStyle='#6cc6ff'; c.font=`700 22px ${F}`; c.fillText(' ✔',x,yy); x+=c.measureText(' ✔').width; }
      c.font=`400 28px ${F}`; c.fillStyle='#d6dbea'; let s=' '+t.replace(/<br>.*/,''); while(c.measureText(s).width>W-48-x&&s.length>2)s=s.slice(0,-2)+'…'; c.fillText(s,x,yy); };
    y+=50; line(P.acct,1,P.cap,y); P.cm.slice(0,2).forEach((m,i)=>line(m[0],m[1],m[2],y+44*(i+1)));
    c.fillStyle='#8b93b0'; c.font=`600 24px ${F}`; c.textAlign='right'; c.fillText('我的足球人生 · mylife.bearledger.app',W-40,H-28);
    cv.toBlob(b=>done(b),'image/png'); } }
async function saveImg(blob,name,title){ if(!blob)return; const file=new File([blob],name,{type:'image/png'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title}); return; } }catch(e){ if(e&&e.name==='AbortError')return; }
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); }
/* ---------- 成就：每段人生解鎖，另外有跨人生的收藏冊 ---------- */
const lgTop5=()=>Z.car.hist.some(h=>/^(英超|西甲|德甲|義甲|法甲|英格蘭女子超級聯賽|美國國家女子足球聯賽|西班牙女子甲級聯賽|德國女子甲級聯賽|法國女子甲級聯賽)$/.test(h.lg));
const proN=()=>Z.car.hist.length;
const ACH=[
 ['ball','第一次踢球','開始踢足球',()=>Z.stage>=1],['club','球衣號碼','加入一支球隊',()=>Z.stage>=2],['region','地區代表隊','入選地區代表隊',()=>Z.stage>=3],['acad','職業青訓','進入職業俱樂部青訓',()=>Z.stage>=4],
 ['semi','半職業','在半職業聯賽踢球',()=>Z.car.hist.some(h=>SEMI.has(h.lgk)||h.semi)],['pro','職業球員','簽下全職業合約',()=>!!Z.car.fullPro],['abroad','離鄉','到國外踢職業',()=>!!Z.car.abroad],['top','頂級舞台','在五大聯賽（女足頂級聯賽）踢球',()=>lgTop5()],
 ['nt','國家隊','代表國家隊出賽',()=>Z.car.caps>0],['cap50','國家隊常客','國家隊出賽 50 場',()=>Z.car.caps>=50],['wc','世界盃','踢過世界盃',()=>Z.car.wc.length>0],['wcwin','世界冠軍','拿下世界盃冠軍',()=>Z.car.troph.some(t=>/世界盃冠軍/.test(t))],
 ['title','聯賽冠軍','拿下聯賽冠軍',()=>(Z.car.lgT||0)>=1],['titles5','王朝','拿下 5 座聯賽冠軍',()=>(Z.car.lgT||0)>=5],['cup','盃賽冠軍','拿下國內盃賽冠軍',()=>Z.car.troph.some(t=>/盃賽冠軍/.test(t))],
 ['cl','洲際之巔','拿下洲際俱樂部賽冠軍',()=>Z.car.troph.some(t=>/(歐冠|亞冠|自由盃|非洲冠軍聯賽|中北美冠軍盃|大洋洲冠軍聯賽)冠軍/.test(t))],
 ['cont','洲際國家盃','和國家隊拿下洲際盃賽冠軍',()=>Z.car.troph.some(t=>/(歐洲國家盃|美洲盃|亞洲盃|非洲國家盃|金盃賽|大洋洲國家盃)冠軍/.test(t))],
 ['bdo','金球獎','拿下金球獎',()=>Z.car.aw.some(t=>/^(女子)?金球獎/.test(t))],['poy','聯賽最佳','獲選聯賽年度最佳球員',()=>Z.car.aw.some(t=>/年度最佳球員/.test(t))],['boot','金靴','拿下聯賽金靴',()=>Z.car.aw.some(t=>/金靴/.test(t))],
 ['glove','金手套','拿下聯賽金手套',()=>Z.car.aw.some(t=>/金手套/.test(t))],['young','明日之星','獲選最佳年輕球員',()=>Z.car.aw.some(t=>/最佳年輕球員/.test(t))],['cpoy','洲際足球先生','獲選洲際年度最佳球員',()=>Z.car.aw.some(t=>/足球先生|歐足聯年度|中北美年度/.test(t))],
 ['g100','百球','職業生涯進 100 球',()=>Z.car.g>=100],['g300','進球機器','職業生涯進 300 球',()=>Z.car.g>=300],['app500','鐵人','職業生涯出場 500 次',()=>Z.car.apps>=500],
 ['loyal','一人一城','在同一支球隊踢滿 10 季',()=>{ const m={}; for(const h of Z.car.hist)m[h.club]=(m[h.club]||0)+1; return Object.values(m).some(v=>v>=10); }],['long','長青樹','38 歲還在踢職業',()=>Z.ph==='pro'&&Math.floor(Z.t)>=38],
 ['poor','逆境','生在最窮的 20% 家庭，踢上職業',()=>Z.b.q===1&&proN()>0],['far','從零開始','出生地沒有職業聯賽，卻踢上職業',()=>!Z.b.c.lg&&!(FL.NATS&&FL.NATS[Z.b.c.k])&&proN()>0],
 ['woman','她的球場','以女足球員身分踢上職業',()=>Z.sex==='f'&&proN()>0],['gk','最後一道防線','當上職業門將',()=>Z.pos==='GK'&&proN()>0],
 ['prodigy','天才','被媒體稱為天才',()=>!!Z.car.prodigy],['brain','戰術腦','天生足球頭腦頂尖，並當上主帥',()=>(Z.iq||0)>=.8&&!!Z.co&&(Z.co.maxLv||0)>=1],['amcoach','從場邊開始','沒踢過職業，卻成為職業球隊主帥',()=>!Z.car.fullPro&&!!Z.co&&(Z.co.maxLv||0)>=1],['coachtop','名帥','執教頂級聯賽球隊',()=>!!Z.co&&(Z.co.maxLv||0)>=2],['ntcoach','國家隊主帥','執教國家隊',()=>!!Z.co&&!!Z.co.nt],['coachwin','冠軍教練','以教練身分拿下冠軍',()=>!!Z.co&&Z.co.tit>0],['wccoach','世界盃主帥','帶國家隊踢世界盃',()=>!!Z.co&&Z.co.wc.length>0],['hosp','回饋家鄉','在家鄉捐建醫院',()=>!!(Z.m&&Z.m.hosp)],['found','基金會','成立自己的基金會',()=>!!(Z.m&&Z.m.found)],
 ['kidpro','星二代','孩子也踢上職業',()=>!!Z.kid&&Z.kid.st>=4],['kidnt','虎父無犬子','孩子也進了國家隊',()=>!!Z.kid&&!!Z.kid.nt],['ownerx','球隊股東','成為球隊的股東或老闆',()=>!!Z.ownEver],['adpres','足協主席','當上足協主席',()=>!!Z.ad&&Z.ad.max>=2],['fifa','國際足總主席','當選國際足總主席',()=>!!Z.ad&&Z.ad.max>=5],['survive','死裡逃生','在場上心臟驟停後被救回',()=>!!Z.heart],['crash','劫後餘生','在意外中受重傷，活了下來',()=>!!Z.crash&&!Z.tragic],
 ['icon','萬人迷','名氣到達 90',()=>(Z.st.fame||0)>=90],['comeback','浴火重生','重傷後重返球場',()=>!!Z.aclBack&&Z.ph!=='youth'],['pkhero','點球英雄','在點球大戰罰進',()=>!!Z.pkHero],
 ['promo','升級','和球隊一起升級',()=>(Z.car.promo||0)>0],['releg','谷底','經歷球隊降級',()=>(Z.car.releg||0)>0],['loan','租借之路','被租借到其他球隊',()=>!!Z.car.loaned],['richm','金元','接受高薪聯賽的邀約',()=>!!Z.car.rich],['homec','落葉歸根','回到家鄉球隊',()=>!!Z.car.home],['journey','浪人','職業生涯待過 6 支球隊',()=>new Set(Z.car.hist.map(h=>h.club)).size>=6],
 ['coach','教練','退休後當教練',()=>Z.post==='coach'],['school','傳承','創辦足球學校',()=>Z.post==='academy'||!!(Z.m&&Z.m.school)],['owner','老闆','買下家鄉的球隊',()=>!!(Z.m&&Z.m.club)],
 ['m1000','第一桶金','存款超過 1,000 萬元',()=>!!Z.m&&Z.m.bank>=1000],['m1e','億萬身家','存款超過 1 億元',()=>!!Z.m&&Z.m.bank>=10000],['broke','重新開始','破產過一次',()=>!!(Z.m&&Z.m.seen.broke)],
 ['give','善心','一生捐出超過 100 萬元',()=>!!Z.m&&(Z.m.give||0)>=100],['parents','孝順','幫爸媽買了房子',()=>!!Z.m&&Z.m.house.includes('par')],
 ['kids3','大家庭','有 3 個孩子',()=>Z.kids>=3],['age90','長壽','活到 90 歲',()=>Math.floor(Z.t)>=90],['age100','人瑞','活到 100 歲',()=>Math.floor(Z.t)>=100],
 ['weekend','週末英雄','沒踢職業，40 歲還在踢球',()=>Z.ph==='amateur'&&Math.floor(Z.t)>=40&&Z.stage>=2],['never','另一種人生','一輩子沒踢過足球',()=>Z.done&&Z.stage===0]];
const achStore=()=>{ try{ return JSON.parse(localStorage.getItem('ml-ach')||'{}'); }catch(e){ return {}; } };
function achCheck(){ Z.ach=Z.ach||[]; let st=null; for(const [id,n,d,f] of ACH){ if(Z.ach.includes(id))continue; let ok=false; try{ ok=f(); }catch(e){} if(!ok)continue;
  Z.ach.push(id); st=st||achStore(); const first=!st[id]; st[id]=(st[id]||0)+1; log(`解鎖成就：<b>${n}</b>・${d}${first?'<i class="nw">第一次解鎖</i>':''}`,'ach'); }
  if(st&&!window.ML_DEMO_RUN)try{ localStorage.setItem('ml-ach',JSON.stringify(st)); }catch(e){} }
/* ---------- 合約與轉會(參考足球人生的合約、續約、自由轉會、租借) ----------
   合約有年限與年薪；約滿時球隊決定續約或放人(自由球員)；表現好有同聯賽強隊或更高聯賽來買；
   21 歲以下坐板凳可能被租借；連續替補或能力跟不上會被放上轉會名單；30 歲後有高薪聯賽、32 歲後有家鄉球隊邀請 */
const RICH=['SAU','MLS','CSL'];
function mkOffer(x,kind){ const a=Math.floor(Z.t), o=ovr(), d=o-x.lg.par, role=d>=3?'主力':d>=-3?'輪替':'替補';
  const yrs=kind==='loan'?1:kind==='home'?1+Math.floor(R()*2):a<24?3+Math.floor(R()*3):a<30?2+Math.floor(R()*3):1+Math.floor(R()*2);
  const sal=Math.round(proSal(x.lg,o,role)*(kind==='rich'?2.2:kind==='home'?.8:1)*(.9+R()*.3)*10)/10;
  const fee=kind==='buy'||kind==='rich'?Math.round(sal*(a<=23?5:a<=27?3.5:a<=30?2:1)*(1+Math.max(0,d)*.08)*(.7+R()*.6)):0;
  return Object.assign(x,{kind,yrs,sal,fee}); }
const ofTx2=x=>`${x.kind==='loan'?'租借':x.kind==='free'||!Z.car.hist.length?'簽約':'轉會'}：${ofTxt(x)}<small class="oft">${isAm(x.lg)?'業餘・':isSemi(x.lg)?'半職業・':''}${x.yrs} 年・年薪約 ${fm(x.sal)}${x.fee?`・轉會費約 ${fm(x.fee)}`:''}</small>`;
function clubIn(lg,better){ const T=teamsOf(lg), i=Math.max(0,T.indexOf(Z.car.club)), pool=(better?T.slice(0,i):T.slice(i+1)).filter(clubOK); return pool.length?pick(pool):null; }
function market(a,o,kind,n){ const C2=Z.car, out=[];
  if(kind==='up'){ for(const x of genOffers(o,C2.lg.par+1,2))out.push(mkOffer(x,'buy')); const c=clubIn(C2.lg,true); if(c&&chance(.7))out.push(mkOffer({lg:C2.lg,club:c},'buy')); }
  else if(kind==='free'){ for(const x of genOffers(o,0,n||3))out.push(mkOffer(x,'free')); }
  else if(kind==='down'){ for(const x of genOffers(o-2,0,2))if(x.lg.par<=C2.lg.par)out.push(mkOffer(x,'buy')); const c=clubIn(C2.lg,false); if(c)out.push(mkOffer({lg:C2.lg,club:c},'buy')); }
  else if(kind==='loan'){ for(const x of genOffers(o+1,0,3))if(x.lg.par<C2.lg.par||x.lg.k===C2.lg.k)out.push(mkOffer(x,'loan')); }
  else if(kind==='rich'){ const ks=RICH.filter(k=>FL.LV[k]&&k!==C2.lg.k); if(ks.length){ const lg=lgOf(pick(ks)); out.push(mkOffer({lg,club:pickTeam(lg,o+4)},'rich')); } }
  else if(kind==='home'){ const H=homeLg(Z.b.c), lg=lgOf(H[0]||null); if(!lg.k||lg.k!==C2.lg.k)out.push(mkOffer({lg,club:pickTeam(lg,o+6)},'home')); }
  const seen=new Set([C2.club]); if(C2.burn&&a-C2.burn.y<3)seen.add(C2.burn.club); return out.filter(x=>x.club&&!seen.has(x.club)&&seen.add(x.club)).slice(0,3); }
function transferYear(a,row){ const C2=Z.car, ct=C2.ct||(C2.ct={yrs:2,sal:0}), o=ovr(), d=o-C2.lg.par, bench=C2.hist.slice(-2).filter(h=>h.role==='替補').length;
  ct.yrs--;
  if(a>=33&&(chance(.12+(a-33)*.13+(d<-5?.3:0))||a>=40)){ ask('retire'); return; }
  if(ct.loan&&ct.yrs<=0){ const L=ct.loan; log(`租借結束，你回到${L.club}。`); C2.lg=L.lg; C2.club=L.club; Z.club=`${L.club}・${L.lg.n}`; C2.ct={yrs:Math.max(1,L.yrs),sal:L.sal}; if(L.str!=null)C2.str=L.str; return; }
  if(ct.yrs<=0){ const keep=d>=-3&&a<=34&&chance(d>=3?.97:a<=23&&d>=0?.93:(row.role==='主力'?.88:row.role==='輪替'?.62:.15)+((Z.tr&&Z.tr.team||50)-50)/250), of=market(a,o,'free',keep?2:3);
    if(a>=30&&!isW()&&o>=44&&chance(.25))of.push(...market(a,o,'rich'));
    if(a>=31&&C2.abroad&&chance(.3))of.push(...market(a,o,'home'));
    if(keep){ Z.renew={yrs:a<28?3+Math.floor(R()*2):a<32?2:1,sal:Math.round(Math.max(ct.sal,proSal(C2.lg,o,row.role))*(row.role==='主力'?1.1+R()*.25:.95)*10)/10}; Z.offers=of.slice(0,3); ask('expire'); }
    else { C2.burn={club:C2.club,y:a}; log(`合約到期，${C2.club}沒有跟你續約，你成了自由球員。`,'big'); if(!C2.freeOnce){ C2.freeOnce=1; fact('1995 年的博斯曼判決，讓歐盟球員在合約到期後可以自由轉會，新東家不必付轉會費。'); } add('joy',-4);
      const f=of.length?of:market(a,o-4,'free',2); if(f.length){ Z.offers=f.slice(0,3); ask('free'); } else { log('整個夏天都沒有球隊打電話來。','big'); ASK.retire().o[0].f(); } }
    return; }
  if(C2.relY===a&&d>=2&&chance(.65)){ const of=market(a,o,'up'); if(of.length){ Z.offers=of; ask('relegated'); return; } }
  if(a<=21&&row.role==='替補'&&!ct.loan&&chance(.55)){ const of=market(a,o,'loan'); if(of.length){ Z.offers=of; ask('loan'); return; } }
  if(d>=3&&row.rt>=6.9&&chance(.2+Math.min(.25,(d-3)*.04))){ const of=market(a,o,'up'); if(of.length){ Z.offers=of; ask('move'); return; } }
  if(a>=30&&!isW()&&o>=46&&chance(.1)){ const of=market(a,o,'rich'); if(of.length){ Z.offers=of; ask('rich'); return; } }
  if(a>=32&&C2.abroad&&chance(.12)){ const of=market(a,o,'home'); if(of.length){ Z.offers=of; ask('home'); return; } }
  if(bench>=2&&chance(.6)){ const of=market(a,o,'down'); if(of.length){ Z.offers=of; ask('bench'); return; } }
  if(d<=-5&&chance(.45)){ const of=market(a,o,'down'); if(of.length){ Z.offers=of; ask('sell'); return; } }
  if(d>=-1&&chance(.05*((Z.tr&&Z.tr.ambi||50)/50))){ const of=genOffers(o,C2.lg.par-3,1).map(x=>mkOffer(x,'buy')).filter(x=>x.club!==C2.club); if(of.length){ Z.offers=of; ask('move'); } } }
const stayOpt=(t,fx)=>({t,f:()=>{ log(`你決定留在${Z.car.club}。`); for(const [k,v] of Object.entries(fx||{}))add(k,v); }});
const ctTx=()=>{ const ct=Z.car.ct||{}; return ct.sal?`現在的合約還有 ${Math.max(0,ct.yrs)} 年、年薪約 ${fm(ct.sal)}。`:''; };

/* ---------- 轉會的國家路線與個性 ----------
   LINK:真實常見的移動路線(語言、殖民歷史、地緣)；已經在某國踢球的人，比較會在同一國換隊；
   個性:企圖心想往上爬、勇氣敢跨洲、團隊與同理心比較忠誠、家人支持高想回家 */
const LINK=(()=>{ const m={}, g=(cs,to)=>cs.split(' ').forEach(c=>m[c]=(m[c]||[]).concat(to.split(' ')));
  g('AR UY CO CL PE EC PY BO VE','ES PT IT AR BR MX US'); g('MX CR GT HN SV NQ PA CU DO PR JM HT TT','MX US ES'); g('BR','PT ES IT BR JP SA');
  g('AO MZ CV GW','PT BR'); g('SN CI CM ML BF GN BJ TG NE CD CG GA TD CF MG KM DJ','FR BE PT TR'); g('DZ MA TN','FR BE ES SA');
  g('NG GH KE UG TZ ZM ZW MW SL LR GM BW NA SZ LS ET ER RW BI SS SO','EN ZA BE TR SE NO'); g('EG LY SD SA AE QA KW BH OM JO LB SY IQ YE PS MR','SA EG TR');
  g('SE NO DK FI IS','EN DE NL DK SE NO'); g('PL CZ SK HU RO BG HR RS BA SI MK ME AL XK UA BY MD LT LV EE GE AM AZ RU KZ GR CY','DE IT TR AT GR');
  g('IE SC WA NI','EN SC'); g('BE NL AT CH LU','DE NL BE FR EN'); g('PT ES IT FR DE EN','EN ES DE IT FR'); g('JP KR','DE NL BE JP PT EN');
  g('CN TW HK MO','JP CN KR'); g('TH VN ID MY SG PH MM KH LA BN TL','TH JP AU'); g('AU NZ FJ PG SB','AU EN SC NZ'); g('IN PK BD NP LK BT MV AF','IN');
  g('UZ TJ KG TM IR','IR SA UZ'); g('US CA','EN DE US'); return m; })();
function offerW(k,par,ck,home){ const c=Z.b.c, T=Z.tr||{}, cur=Z.car&&Z.car.lg&&Z.car.lg.k?lgCtry(Z.car.lg.k):null;
  if(home.includes(k))return 5*(.75+(Z.st.fam||50)/200+(T.kind||50)/400);
  if(par<32)return 0; /* 太小的外國聯賽不會來找你 */
  let w=cfOf(ck)===cfOf(c.k)?(par>=48?.9:.4):(par>=52?.4:.05); /* 別洲的小聯賽幾乎不會找上你 */
  if((LINK[c.k]||[]).includes(ck))w*=3;
  if(cur&&cur===ck)w*=2.2; /* 已經在這個國家踢，比較容易在同一國換隊 */
  return w*(.55+((T.brave||50)+(T.ambi||50))/220)*(Z.car&&Z.car.hist.length?1:clamp(.25+c.fc*.85,.3,1)); /* 第一份合約:國外球探很少去足球風氣弱的國家 */ }
/* 自動抉擇時的傾向:去或留 */
function mvScore(x){ const C2=Z.car, T=Z.tr||{}, a=Math.floor(Z.t), cur=C2.lg, s0=(C2.ct||{}).sal||x.sal||1, xc=x.lg.k?lgCtry(x.lg.k):Z.b.c.k, cc=cur&&cur.k?lgCtry(cur.k):Z.b.c.k, d=ovr()-x.lg.par;
  let s=(x.lg.par-(cur?cur.par:x.lg.par))*(.5+(T.ambi||50)/100)+Math.log(Math.max(.1,x.sal)/s0)*6*(.4+(100-(T.kind||50))/150)+(d>=3?2:d<-3?-4:0);
  if(xc!==cc)s-=(cfOf(xc)!==cfOf(cc)?6:2.5)*(1.5-(T.brave||50)/100);
  if(xc===Z.b.c.k&&cc!==Z.b.c.k)s+=1+(Z.st.fam||50)/25;
  if(x.kind==='loan'&&a<=21)s+=3; return s+gauss(); }
function stScore(){ const C2=Z.car, T=Z.tr||{}, row=C2.hist[C2.hist.length-1]||{}, yrs=C2.hist.filter(h=>h.club===C2.club).length;
  return ((T.team||50)+(T.kind||50)-100)/15+yrs*.35*((T.team||50)/50)+(row.role==='主力'?2:row.role==='替補'?-3:0)+gauss(); }
const mainIdx=(ofs,stay)=>{ const sc=ofs.map(mvScore); if(stay!=null)sc.push(stay); return sc.indexOf(Math.max(...sc)); };
/* ---------- 升級與降級(同足球人生:前 2 名升級、後段降級，降級條款年薪打六折) ---------- */
const amClub=()=>{ if(isW())return '業餘球隊'; const k=homeLg(Z.b.c).find(k=>lgT(k)==='a'); if(!k)return '業餘球隊'; const lg=lgOf(k); return `${pickTeam(lg,lg.par)}・${lg.n}`; };
/* 小聯賽(LOW)的升降級：同一國的金字塔依水準排，北美與澳洲沒有升降級 */
const NOPR=new Set(['US','CA','AU']);
function lowPR(a,lg,rank,n,yr){ const C2=Z.car, ck=lgCtry(lg.k); if(!ck||NOPR.has(ck))return; const N=FL.NATS&&FL.NATS[ck];
  const P=[...(N&&N.home?N.home.filter(k=>FL.LV[k]):ck===Z.b.c.k?[null]:[]),...LOWK.filter(x=>x[2]===ck).map(x=>x[0])].map(k=>[k,lgOf(k).par]).sort((x,y)=>y[1]-x[1]), i=P.findIndex(x=>x[0]===lg.k); if(i<0)return;
  if(rank===1&&i>0){ const nl=lgOf(P[i-1][0]); log(`${C2.club}拿下聯賽冠軍，升上了${nl.n}！`,'star'); C2.lg=nl; Z.club=`${C2.club}・${nl.n}`; C2.str=.25+R()*.2; C2.promo=(C2.promo||0)+1; add('joy',6); queuePost('up',`升上${nl.n}`,yr); }
  else if(rank>n-(n>=10?2:1)&&i<P.length-1){ const nl=lgOf(P[i+1][0]); log(`${C2.club}降級了，下季要踢${nl.n}。`,'big'); C2.lg=nl; Z.club=`${C2.club}・${nl.n}`; C2.str=.65+R()*.2; C2.releg=(C2.releg||0)+1; C2.relY=a; add('joy',-5); } }
function promoRel(a,lg,rank,n,yr){ const C2=Z.car, L0=lg.k&&FL.LV[lg.k]; if(!isW()&&lg.k&&String(lg.k).startsWith('LOW:'))return lowPR(a,lg,rank,n,yr); if(!L0||isW())return;
  const zone=L0.rel?(L0.relN||(n>=16?3:n>=12?2:1)):0, upN=L0.up?(L0.upN||2):0;
  if(L0.up&&rank<=upN&&FL.LV[L0.up]){ const nl=lgOf(L0.up); log(`${C2.club}升上了${nl.n}！`,'star'); C2.lg=nl; Z.club=`${C2.club}・${nl.n}`; C2.str=.22+R()*.18; C2.promo=(C2.promo||0)+1; add('joy',6);
    if(C2.ct&&C2.ct.relClause){ C2.ct.sal=Math.round(C2.ct.sal/.6*10)/10; C2.ct.relClause=0; log('回到原本的級別，降級條款解除，年薪恢復。'); } queuePost('up',`升上${nl.n}`,yr); }
  else if(L0.rel&&rank>n-zone&&FL.LV[L0.rel]){ const nl=lgOf(L0.rel); log(`${C2.club}降級了，下季要踢${nl.n}。${C2.ct&&!C2.ct.loan?'降級條款生效，你的年薪打六折。':''}`,'big'); C2.lg=nl; Z.club=`${C2.club}・${nl.n}`; C2.str=.68+R()*.2; C2.releg=(C2.releg||0)+1; C2.relY=a; add('joy',-6);
    if(C2.ct&&!C2.ct.loan){ C2.ct.sal=Math.round(C2.ct.sal*.6*10)/10; C2.ct.relClause=1; } if(!C2.relFact){ C2.relFact=1; fact('升降級制度是歐洲、南美等多數足球國家的傳統；美國職業足球大聯盟則沒有升降級。'); } } }
/* ---------- 天才報導與搶人大戰 ---------- */
const ELITE=()=>isW()?Object.keys(WLG).filter(k=>WLG[k].par>=53):Object.keys(FL.LV).filter(k=>FL.LV[k].par>=56);
function eliteOffers(n){ const C2=Z.car, out=[], ks=ELITE().sort(()=>R()-.5);
  for(const k of ks){ if(out.length>=n)break; const lg=lgOf(k), T=teamsOf(lg).slice(0,4).filter(x=>clubOK(x)&&x!==C2.club&&!(C2.burn&&C2.burn.club===x&&Math.floor(Z.t)-C2.burn.y<3)); if(!T.length)continue; out.push(mkOffer({lg,club:pick(T)},C2.hist.length?'buy':'free')); }
  return out; }
function prodigyCheck(a){ const C2=Z.car, o=ovr(); if(C2.prodigy||Z.stage<3)return false;
  if(!(a<=17&&o>=55||a<=21&&o>=60))return false;
  C2.prodigy=a; const nick=pick(['百年一遇的天才','下一個球王','天才少年','這一代最耀眼的新星']), yr=Z.year+a;
  log(`${Z.b.c.n}的媒體開始稱你為「${nick}」。才 ${a} 歲，全世界的球探都在看你的比賽。`,'star'); add('joy',5); add('ambi',2);
  queuePost('prodigy',nick,yr); return true; }
/* ---------- 球衣(沿用足球人生的球隊與國家隊球衣；沒有資料的球隊用名字算出顏色) ---------- */
const hsl2hex=(h,s,l)=>{ s/=100; l/=100; const k=n=>(n+h/30)%12, a=s*Math.min(l,1-l), f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))); return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join(''); };
const lum=h=>{ const n=parseInt(String(h).slice(1),16); return ((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)/255; };
function clubKit(club){ const nm=String(club||'').replace(/女足$/,'').replace(/（.*$/,''), raw=FL.KIT&&FL.KIT[nm];
  if(!raw){ let h=0; for(const ch of nm)h=(h*31+ch.charCodeAt(0))>>>0; const p=hsl2hex(h%360,62,42); return {p,s:null,pat:'-',shorts:'#f2f2f2',socks:p,trim:'#ffffff',txt:'#ffffff'}; }
  const [p,s,pat]=raw.split(' ').map(x=>x==='-'?null:x), P='#'+p, S2=s?'#'+s:null;
  return {p:P,s:S2,pat:pat||'-',shorts:S2&&lum(S2)<.35?S2:lum(P)>.7?P:'#f2f2f2',socks:P,trim:S2||'#ffffff',txt:lum(P)>.55?'#141414':'#ffffff'}; }
function natKit(k){ const raw=FL.NKIT&&FL.NKIT[k]; if(!raw)return clubKit((ctryN(k)||k)+'代表隊'); const [p,s,pat,sh,so]=raw.split(' '); const P='#'+p;
  return {p:P,s:'#'+s,pat:pat&&pat!=='-'?pat:'-',shorts:'#'+(sh||s),socks:'#'+(so||p),trim:'#'+s,txt:lum(P)>.55?'#141414':'#ffffff'}; }
const plainKit=()=>({p:SHIRT[Z.seed%6],s:null,shorts:'#2a3354',socks:'#e9edf6',trim:SHIRT[Z.seed%6],txt:'#ffffff',pat:'-'});
const kitAt=a=>{ const C2=Z.car, h=C2.hist.find(x=>x.a===a)||(a>=(C2.hist[0]||{}).a?C2.hist.filter(x=>x.a<=a).slice(-1)[0]:null); return h?clubKit(h.club):Z.kidClub&&Z.stage>=2&&a<19?clubKit(Z.kidClub):plainKit(); };
const curKit=()=>Z.car&&Z.car.club&&Z.ph==='pro'?clubKit(Z.car.club):Z.kidClub&&Z.stage>=2&&Math.floor(Z.t)<19?clubKit(Z.kidClub):plainKit();
const mainClub=()=>{ const m={}; for(const h of Z.car.hist)m[h.club]=(m[h.club]||0)+h.app; return Object.keys(m).sort((x,y)=>m[y]-m[x])[0]||null; };
const mainKit=()=>{ const c=mainClub(); return c?clubKit(c):plainKit(); };
function kitSvg(kit,pose){ let svg=''; try{ svg=pixelFF(kit,Z.me,Z.no||10,pose||'N',Z.b.c.lk,Z.look); }catch(e){ return ''; } return svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" '); }
const kitSrc=(kit,pose)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(kitSvg(kit,pose));
const kitImg=(kit,h,pose)=>{ const s=kitSvg(kit,pose); return s?`<img alt="" style="height:${h}px;image-rendering:pixelated" src="${kitSrc(kit,pose)}">`:''; };
const posePose=()=>Z.pos==='GK'?'GK':Z.pos||'N';
/* ---------- 榮譽收納:同一個獎合併成「×次數」 ---------- */
function grpHon(){ const C2=Z.car, g=new Map(), put=(t,cat)=>{ const m=String(t).match(/^(.*) (\d{4})$/), nm=m?m[1]:t, y=m?m[2]:''; const key=cat+'|'+nm; if(!g.has(key))g.set(key,{cat,nm,ys:[]}); g.get(key).ys.push(y); };
  C2.troph.forEach(t=>put(t,'t')); C2.aw.forEach(t=>put(t,'a')); C2.wc.forEach(t=>{ const m=t.match(/^(\d{4}) (.*)・(.*)$/); if(m&&m[3]!=='冠軍')put(`${m[2]}・${m[3]} ${m[1]}`,'w'); });
  (Z.co&&Z.co.tro||[]).forEach(t=>put(t,'c'));
  const rk=x=>/世界盃冠軍|^(女子)?金球獎$/.test(x.nm)?0:/(歐冠|亞冠|自由盃|冠軍聯賽|冠軍盃|國家盃|美洲盃|亞洲盃|金盃賽)冠軍/.test(x.nm)?1:x.cat==='t'&&!/盃賽/.test(x.nm)?2:x.cat==='a'?3:x.cat==='c'?4:x.cat==='w'?5:6;
  return [...g.values()].sort((a,b)=>rk(a)-rk(b)||b.ys.length-a.ys.length); }
const honIc=x=>x.cat==='a'?'🏅':x.cat==='w'?'🌍':x.cat==='c'?'📋':'🏆';
function timeline(){ const out=[]; for(const h of Z.car.hist){ const L=out[out.length-1]; if(L&&L.club===h.club){ L.y1=h.y; L.app+=h.app; L.g+=h.g; L.lg=h.lg; } else out.push({club:h.club,lg:h.lg,y0:h.y-1,y1:h.y,app:h.app,g:h.g}); } return out; }
function headline(){ const C2=Z.car, pro=C2.hist.length;
  return C2.aw.some(t=>/^(女子)?金球獎/.test(t))?'金球獎得主':C2.troph.some(t=>/世界盃冠軍/.test(t))?'世界冠軍':Z.co&&Z.co.nt?`${Z.b.c.n}國家隊主帥`:Z.co&&!Z.car.fullPro&&(Z.co.maxLv||0)>=1?CO_LV[Z.co.maxLv]:C2.prodigy&&pro?'天才球星':pro?(C2.fullPro?`${C2.bestN||(C2.lg&&C2.lg.n)||'職業'}球員`:'半職業球員'):Z.stage>=2?'業餘球員':Z.stage>=1?'街頭足球少年':'沒有踢過足球的人生'; }
function epitaph(){ const C2=Z.car, pro=C2.hist.length, city=Z.b.city.replace(/鄉下|村落|小鎮/,''), mc=mainClub();
  if(pro&&C2.bestN&&C2.abroad)return `從${city}的空地，一路踢到了${C2.bestN}。`;
  if(pro&&mc)return `${mc}的球迷，到現在還記得你的名字。`;
  if(Z.stage>=2)return '你沒有成為職業球員，但每個週末，你都在球場上。';
  if(Z.stage>=1)return '足球是你童年裡最快樂的一部分。';
  return `你在${Z.b.c.n}過完了屬於自己的一生。`; }
/* ---------- 結局頁 ---------- */
function endUI(){ root.querySelectorAll('.end').forEach(e=>e.remove()); const C2=Z.car, a=Math.floor(Z.t), pro=C2.hist.length, c=Z.b.c, el=document.createElement('div'); el.className='end'; root.appendChild(el); Z.ask={end:1}; Z.ff=false; if(document.getElementById('z-pause'))hud();
  const kit=mainKit(), H=grpHon(), TL=timeline(), st=achStore(), got=ACH.filter(x=>st[x[0]]).length;
  const rows=L=>L.map(x=>`<div class="hr"><i>${honIc(x)}</i><b>${x.nm}</b>${x.ys.length>1?`<em>×${x.ys.length}</em>`:''}<small>${x.ys.join('、')}</small></div>`).join('');
  const tl=L=>L.map(x=>`<div class="tr2"><span class="kd" style="background:${clubKit(x.club).p};border-color:${clubKit(x.club).s||'#fff'}"></span><b>${x.club}</b><small>${x.lg}・${x.y0}–${String(x.y1).slice(-2)}・${x.app} 場${Z.pos==='GK'?'':`・${x.g} 球`}</small></div>`).join('');
  const nums=pro?[[pro,'職業賽季'],[C2.apps,'出場'],[Z.pos==='GK'?(C2.cs||0):C2.g,Z.pos==='GK'?'零封':'進球'],[Z.pos==='GK'?(C2.troph.length):C2.as,Z.pos==='GK'?'冠軍':'助攻'],[C2.caps,'國家隊出賽'],[new Set(C2.hist.map(h=>h.club)).size,'待過的球隊']]:[[STAGE[Z.stage]||'—','足球'],[Z.job||'—','工作'],[Z.kids,'孩子'],[a,'歲']];
  const M=Z.m, co=Z.co;
  el.innerHTML=`<div class="ew">
   <div class="eh" style="--k1:${kit.p};--k2:${kit.s||kit.p};--kt:${kit.txt}"><div class="es">${kitImg(kit,170,posePose())}</div><div class="en"><small>${Z.year} – ${Z.year+a}・享年 ${a} 歲</small><h2>${esc(Z.me)}</h2><p class="ef">${flag(c.k)} ${c.n}・${Z.b.city}</p><b class="hl">${headline()}</b><p class="ep">${epitaph()}</p></div></div>
   <div class="ebt"><button class="main" id="e-reel">▶ 播放生涯回顧</button><button id="e-card">存成人生小卡</button><button id="e-ach">存成成就小卡</button>${Z.shared?'':'<button id="e-share">分享到首頁</button>'}<button id="e-again">${Z.review?'出生一段新人生':'再出生一次'}</button><button id="e-home">回首頁</button></div>
   <div class="ec"><h4>${pro?'生涯數字':'這一生'}</h4><div class="eg">${nums.map(([v,l])=>`<div><b>${typeof v==='number'?v.toLocaleString():v}</b><small>${l}</small></div>`).join('')}</div></div>
   ${H.length?`<div class="ec"><h4>榮譽 <small>${H.reduce((s,x)=>s+x.ys.length,0)} 項</small></h4>${rows(H.slice(0,6))}${H.length>6?`<details><summary>展開其他 ${H.length-6} 項</summary>${rows(H.slice(6))}</details>`:''}</div>`:''}
   ${TL.length?`<div class="ec"><h4>生涯足跡 <small>${TL.length} 段</small></h4>${tl(TL.slice(0,5))}${TL.length>5?`<details><summary>展開其他 ${TL.length-5} 段</summary>${tl(TL.slice(5))}</details>`:''}</div>`:''}
   ${co?`<div class="ec"><h4>教練生涯</h4><div class="ekv"><div><span>最高職位</span><b>${CO_LV[co.maxLv||0]}</b></div><div><span>執教過</span><b>${(co.teams||[]).slice(0,4).join('、')}</b></div><div><span>冠軍</span><b>${co.tit||0} 座</b></div>${co.wc&&co.wc.length?`<div><span>世界盃</span><b>${co.wc.join('、')}</b></div>`:''}</div></div>`:''}
   <div class="ec"><h4>人生</h4><div class="ekv">
     <div><span>家庭</span><b>${Z.wed?`和 ${esc(Z.wed)} 結婚，${Z.kids?`有 ${Z.kids} 個孩子`:'沒有孩子'}`:'一直單身'}</b></div>
     ${M?`<div><span>一生收入</span><b>${fm(M.earn)}</b></div><div><span>留下的財產</span><b>${fm(Math.max(0,M.bank))}${M.house.length?`・${M.house.length} 間房子`:''}</b></div>${M.give?`<div><span>捐出</span><b>${fm(M.give)}</b></div>`:''}`:''}
     ${Z.post?`<div><span>退休後</span><b>${{coach:'當教練',agent:'當經紀人',pundit:'當球評',academy:'開足球學校',home:'回到家鄉',admin:'足球行政'}[Z.post]}</b></div>`:''}
     ${Z.kid?`<div><span>孩子</span><b>${esc(Z.kid.n)}・${Z.kid.st>=4?`踢上職業（${Z.kid.club}）${Z.kid.nt?'・國家隊':''}`:Z.kid.crushed?'被光環壓垮，離開了足球':Z.kid.track?['剛開始踢球','少年隊','地區代表隊','職業青訓'][Z.kid.st]||'':'走了別的路'}</b></div>`:''}
     ${Z.ownEver?`<div><span>球隊老闆</span><b>${Z.ownName||''}${Z.own&&Z.own.tit?`・${Z.own.tit} 座冠軍`:''}</b></div>`:''}
     ${Z.ad?`<div><span>足球行政</span><b>最高做到${AD_LV[Z.ad.max]}${Z.ad.ban?'（後來被禁足）':''}</b></div>`:''}
     <div><span>出生</span><b>${c.n}${Z.b.city}・家境所得${QN[Z.b.q]}</b></div>
     <div><span>天生的足球頭腦</span><b>${iqLv()}</b></div></div></div>
   ${cmpHTML()}
   <div class="ec"><h4>成就 <small>這一生 ${(Z.ach||[]).length}・收藏 ${got}／${ACH.length}</small></h4><div class="achs">${ACH.filter(x=>(Z.ach||[]).includes(x[0])).map(([id,n,d])=>`<i class="on" title="${d}">${n}</i>`).join('')||'<small>這一生沒有解鎖成就。</small>'}</div></div>
   <div class="ec"><details><summary>${Z.year} 世代名單：其他人後來怎麼了</summary>${Z.peers.map(p=>`<div class="pr2">${flag(p.c.k)} <b>${esc(p.n)}</b><small>${p.c.n}・${p.quit?p.note:STAGE[p.stage]}</small></div>`).join('')}</details></div>
  </div>`;
  const $e=id=>el.querySelector('#'+id);
  $e('e-reel').onclick=()=>reel(); $e('e-card').onclick=e=>lifeCard(e.currentTarget); $e('e-ach').onclick=e=>achCard(e.currentTarget);
  if($e('e-share'))$e('e-share').onclick=()=>{ el.remove(); Z.ask=null; shareUI(); };
  $e('e-again').onclick=()=>{ el.remove(); Z.ask=null; start(); }; $e('e-home').onclick=()=>{ el.remove(); Z.ask=null; close(); }; }
/* ---------- 生涯回顧影片(依情境畫不同場景：捧盃、婚禮、簽約、執教、行政…) ---------- */
const SUIT={p:'#1d2440',s:'#ffffff',pat:'-',shorts:'#1d2440',socks:'#1d2440',trim:'#1d2440',txt:'#1d2440'};
const DRESS={p:'#ffffff',s:'#f4c2d0',pat:'-',shorts:'#ffffff',socks:'#ffffff',trim:'#f4c2d0',txt:'#ffffff'};
function sprX(kit,pose,cele,name,lookO,no){ let svg=''; const lk=Object.assign({},lookO||Z.look,cele?{cele}:{}); try{ svg=pixelFF(kit,name||Z.me,no==null?(Z.no||10):no,pose||'N',Z.b.c.lk,lk); }catch(e){ return ''; } return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" ')); }
function sceneOf(t,k){ if(k==='birth')return {sc:'birth'}; if(k==='end')return {sc:'end'};
  if(/結婚了/.test(t))return {sc:'wed'}; if(/孩子出生/.test(t))return {sc:'baby'};
  if(/世界盃冠軍|捧起了冠軍盃/.test(t))return {sc:'cup',cup:'wc'}; if(/(歐冠|亞冠|自由盃|冠軍聯賽|冠軍盃)冠軍|站上.*之巔/.test(t))return {sc:'cup',cup:'ears'};
  if(/(國家盃|美洲盃|亞洲盃|金盃賽)冠軍/.test(t))return {sc:'cup',cup:'gold'}; if(/金球獎/.test(t))return {sc:'cup',cup:'ball'}; if(/金靴/.test(t))return {sc:'cup',cup:'boot'}; if(/金手套/.test(t))return {sc:'cup',cup:'glove'};
  if(/年度最佳|最佳年輕|足球先生|最佳球員/.test(t))return {sc:'cup',cup:'star'}; if(/冠軍/.test(t))return {sc:'cup',cup:'league'}; if(/升上了/.test(t))return {sc:'promo'};
  if(/媒體開始稱你/.test(t))return {sc:'press'}; if(/國際足總|足協主席|理事/.test(t))return {sc:'admin'}; if(/老闆|買下/.test(t))return {sc:'owner'};
  if(/主帥|教練|執教|教鞭/.test(t))return {sc:'coach'}; if(/第一次離開/.test(t))return {sc:'plane'}; if(/第一次入選|國家隊/.test(t))return {sc:'nt'};
  if(/世界盃/.test(t))return {sc:'stad'}; if(/合約|加盟|轉會|租借/.test(t))return {sc:'sign'}; if(/宣布退休/.test(t))return {sc:'retire'};
  if(/加入了|地區代表隊|青訓/.test(t))return {sc:'youth'}; return {sc:'street'}; }
function reelSlides(){ const C2=Z.car, c=Z.b.c, S=[], L=Z.log.slice().reverse(), strip=t=>String(t).replace(/<[^>]+>/g,'');
  S.push({a:0,k:'birth',big:`${Z.year}`,t:`你出生在${c.n}${Z.b.city}。`,sub:`大約每 ${Math.round(132000/c.b).toLocaleString()} 個嬰兒，有 1 個生在這裡`,sc:'birth'});
  const PR=[[/一踢就停不下來|天天踢|吵著要踢球|你開始拿任何圓的東西來踢|一整個下午/,'ball',3],[/你加入了/,'club',4],[/地區代表隊/,'region',3],[/試訓通過/,'acad',4],[/媒體開始稱你/,'gold',8],[/第一份(半)?職業合約/,'pro',7],[/第一次離開/,'go',5],
   [/^你轉會到|^你接受高薪邀約|^你回到家鄉，加盟|自由球員身分加盟/,'move',4],[/升上了/,'gold',4],[/第一次入選/,'nt',6],[/世界盃，最後|世界盃，最後|帶.*踢 \d+ 年(女足)?世界盃/,'wc',8],[/冠軍！|冠軍，站上|拿下了.*冠軍/,'gold',7],[/金球獎|年度最佳球員|金靴|金手套|足球先生|最佳年輕球員/,'gold',7],
   [/宣布退休/,'retire',6],[/結婚了/,'love',7.5],[/第 1 個孩子出生/,'love',6],[/成為.*(主帥|教練)|接下了.*教鞭|國家隊主帥/,'coach',6],[/當選了.*足協主席|國際足總主席|國際足總理事/,'admin',7],[/成為.*老闆|買下了/,'owner',6]];
  const cand=[], seenT=new Set();
  L.forEach(l=>{ if(l.k!=='star'&&l.k!=='big')return; const t=strip(l.t); for(const [re,k,p] of PR)if(re.test(t)&&!seenT.has(t)){ seenT.add(t); cand.push({a:l.a,k,p,t}); break; } });
  const once=new Set(), c2=cand.filter(x=>{ if(['ball','club','region','acad','pro','go','nt','retire'].includes(x.k)){ if(once.has(x.k))return false; once.add(x.k); } return true; });
  const keep=new Set(c2.slice().sort((x,y)=>y.p-x.p).slice(0,14));
  c2.filter(x=>keep.has(x)).forEach(x=>{ const sc=sceneOf(x.t,x.k); S.push(Object.assign({a:x.a,k:x.k,big:`${x.a} 歲`,t:x.t,sub:`${Z.year+x.a} 年`},sc)); });
  const a=Math.floor(Z.t), pro=C2.hist.length;
  S.push({a,k:'end',sc:'end',big:headline(),t:epitaph(),sub:pro?`${pro} 個賽季・${C2.apps} 場・${Z.pos==='GK'?`零封 ${C2.cs||0}`:`${C2.g} 球`}${C2.troph.length?`・${C2.troph.length} 座冠軍`:''}`:`${Z.year} – ${Z.year+a}・享年 ${a} 歲`});
  /* 每一頁的人物與球衣 */
  for(const s of S){ const nt=s.sc==='nt'||(s.sc==='cup'&&(s.cup==='wc'||s.cup==='gold'))||(s.sc==='stad'&&!/主帥/.test(s.t)), coachCup=s.sc==='cup'&&/你帶領|你帶|主帥/.test(s.t); let kit=nt&&!coachCup?natKit(c.k):coachCup||['coach','admin','owner','wed'].includes(s.sc)?SUIT:s.a<19&&s.sc!=='end'?(Z.kidClub&&s.a>=6?clubKit(Z.kidClub):plainKit()):kitAt(s.a);
    const pose=s.sc==='cup'||s.sc==='promo'||s.sc==='sign'||s.sc==='youth'?'E':s.sc==='wed'||s.sc==='baby'?'E':s.sc==='nt'?'E':s.sc==='retire'?'E':s.sc==='press'?'E':s.sc==='admin'?'E':'N';
    const cele={cup:'arms',promo:'arms',sign:'arms',youth:'fist',wed:'heart',baby:'heart',nt:'salute',retire:'wings',press:'point',admin:'fist'}[s.sc]||'';
    if(s.sc==='sign'){ const m=String(s.t).match(/(?:：|加盟|轉會到|租借到)(.+?)（/); if(m){ kit=clubKit(m[1]); } } const wedKit=Z.sex==='f'?DRESS:SUIT; s.me=s.sc==='birth'?null:sprX(s.sc==='wed'?wedKit:kit,pose,cele);
    if(s.sc==='wed'&&Z.wed){ const sp=Object.assign({},lookOf(Z.wed,c.lk),Z.sex==='m'?{style:pick(['long','pony','bun'])}:{}); s.two=sprX(Z.sex==='m'?DRESS:SUIT,'E','heart',Z.wed,sp,0); }
    if(s.sc==='baby'){ s.two=sprX({p:'#f6d6e0',s:'#ffffff',pat:'-',shorts:'#f6d6e0',socks:'#ffffff',trim:'#fff',txt:'#f6d6e0'},'N','','寶寶',lookOf('寶寶'+Z.me,c.lk),0); }
    s.kit=kit; }
  return S; }
function reel(){ const S=reelSlides(), W=1080, H=1350, D=2.6, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'), F='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif', N='"Barlow Condensed","Noto Sans TC",sans-serif';
  const el=document.createElement('div'); el.className='rl'; el.innerHTML=`<div class="rb"><div class="rc"></div><div class="rbt"><button id="r-re">↺ 重播</button>${window.MediaRecorder&&cv.captureStream?'<button id="r-dl">⬇ 下載影片</button>':''}<button id="r-x">關閉</button></div></div>`; el.querySelector('.rc').appendChild(cv); root.appendChild(el);
  const ld=src=>new Promise(r=>{ if(!src)return r(null); const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); setTimeout(()=>r(null),1500); im.src=src; });
  let fl=''; try{ fl=FL.flagSVG(Z.b.c.k)||''; }catch(e){} const flSrc=fl?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent((fl.includes('xmlns')?fl:fl.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')).replace('<svg ','<svg width="300" height="200" ')):'';
  const wrap=(t,x,y,w,lh,mx)=>{ const out=[]; let line=''; for(const ch of t){ if(g.measureText(line+ch).width>w){ out.push(line); line=ch; } else line+=ch; } if(line)out.push(line); out.slice(0,mx).forEach((l,i)=>g.fillText(i===mx-1&&out.length>mx?l.slice(0,-1)+'…':l,x,y+i*lh)); };
  const R2=(x,y,w,h,c)=>{ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
  const GY=820; /* 地面 */
  /* ---- 背景 ---- */
  const sky=(a,b)=>{ const gr=g.createLinearGradient(0,140,0,GY); gr.addColorStop(0,a); gr.addColorStop(1,b); g.fillStyle=gr; g.fillRect(0,0,W,H); };
  const pitch=(night)=>{ R2(0,GY-60,W,H-GY+60,night?'#1f5a33':'#3d8f4f'); for(let x=0;x<W;x+=120)if((x/120)%2)R2(x,GY-60,120,H-GY+60,night?'#1b5230':'#37844a'); R2(0,GY-60,W,6,'#ffffff55'); };
  const stands=(T,cols)=>{ R2(0,300,W,GY-360,'#2a3048'); for(let r=0;r<9;r++)for(let x=0;x<W;x+=18){ const h=(x*7+r*13)%11; if(h<7)R2(x+4+(r%2)*8,320+r*42+Math.sin(T*6+x)*2,10,12,cols[(x/18+r)%cols.length]); } R2(0,GY-66,W,10,'#151a2c'); };
  const lights=T=>{ for(const x of [150,930]){ R2(x-4,160,8,180,'#3a3f55'); R2(x-50,140,100,30,'#d9dee6'); g.fillStyle=`rgba(255,250,220,${.18+.05*Math.sin(T*3)})`; g.beginPath(); g.moveTo(x-50,170); g.lineTo(x+200*(x<500?1:-1),GY); g.lineTo(x-200*(x<500?1:-1)*.2,GY); g.fill(); } };
  const confetti=(T,cols)=>{ for(let i=0;i<70;i++){ const x=(i*157+T*60*(1+i%3))%W, y=(i*97+T*180*(1+(i%4)*.3))%(GY+80); R2(x,140+y%(GY-100),10,16,cols[i%cols.length]); } };
  const hearts=T=>{ for(let i=0;i<14;i++){ const x=80+i*70, y=GY-((T*90+i*61)%560); g.globalAlpha=.75; heart(x,y,6+(i%3)*2,i%2?'#ff6b8b':'#ffb3c4'); g.globalAlpha=1; } };
  const heart=(x,y,u,c)=>{ R2(x,y,u*2,u,c); R2(x+u*3,y,u*2,u,c); R2(x-u,y+u,u*7,u*2,c); R2(x,y+u*3,u*5,u,c); R2(x+u,y+u*4,u*3,u,c); R2(x+u*2,y+u*5,u,u,c); };
  const flashes=T=>{ for(let i=0;i<9;i++){ const on=Math.sin(T*9+i*2.3)>.75; if(on){ const x=60+i*115, y=GY-40-(i%3)*30; g.fillStyle='#ffffffcc'; g.beginPath(); g.arc(x,y,26,0,7); g.fill(); } R2(60+i*115-22,GY-10-(i%3)*30,44,30,'#20242f'); R2(60+i*115-8,GY-22-(i%3)*30,16,12,'#20242f'); } };
  /* ---- 獎盃(像素) ---- */
  const cup=(type,cx,by,u)=>{ const P=(x,y,w,h,c)=>R2(cx+x*u,by-y*u,w*u,h*u,c);
    if(type==='wc'){ const G='#f2c230',D='#b8860b'; P(-3,13,6,1,G); P(-4,12,8,3,G); P(-3,9,6,1,G); P(-2,8,4,3,D); P(-1,5,2,2,G); P(-2,3,4,1,'#2e8b57'); P(-3,2,6,1,G); P(-3,1,6,1,D); P(-2,12,1,2,'#fff6c8'); return; }
    if(type==='ball'){ const G='#f2c230'; P(-3,8,6,1,G); P(-4,7,8,4,G); P(-3,3,6,1,G); P(-1,6,2,2,'#b8860b'); P(-3,5,1,1,'#b8860b'); P(2,5,1,1,'#b8860b'); P(-2,2,4,1,'#3a3f55'); P(-3,1,6,1,'#3a3f55'); return; }
    if(type==='boot'){ const G='#f2c230'; P(-2,9,3,5,G); P(-2,4,7,2,G); P(1,6,3,1,G); P(-2,2,8,1,'#b8860b'); P(-3,1,9,1,'#3a3f55'); return; }
    if(type==='glove'){ const G='#f2c230'; for(let i=0;i<4;i++)P(-3+i*2,11,1,3,G); P(-3,8,7,4,G); P(-2,4,5,1,'#b8860b'); P(-3,1,7,1,'#3a3f55'); P(4,7,1,2,G); return; }
    if(type==='star'){ const G='#f2c230'; P(-1,12,2,1,G); P(-2,11,4,1,G); P(-4,10,8,1,G); P(-3,9,6,1,G); P(-3,8,2,1,G); P(1,8,2,1,G); P(-1,7,2,4,'#b8860b'); P(-3,3,6,1,'#3a3f55'); P(-4,2,8,1,'#3a3f55'); return; }
    const C=type==='gold'?'#f2c230':'#dfe4ec', D=type==='gold'?'#b8860b':'#9aa4b2';
    P(-4,12,8,1,C); P(-3,11,6,4,C); P(-2,7,4,1,D); P(-1,6,2,2,D); P(-3,4,6,1,C); P(-4,3,8,1,D); P(-2,11,1,3,'#ffffff');
    if(type==='ears'){ P(-7,12,2,1,C); P(-8,11,1,5,C); P(-7,7,2,1,C); P(5,12,2,1,C); P(7,11,1,5,C); P(5,7,2,1,C); } else { P(-5,11,1,3,C); P(4,11,1,3,C); } };
  const scarf=(cx,y,kit,u)=>{ for(let i=0;i<12;i++)R2(cx-6*u*1.4+i*u*1.4,y,u*1.4,u*2,i%2?(kit.s||'#ffffff'):kit.p); for(let i=0;i<12;i+=2)R2(cx-6*u*1.4+i*u*1.4,y+u*2,u*.5,u,kit.p); };
  const plane=(x,y,s)=>{ R2(x,y,140*s,26*s,'#f4f6fa'); R2(x+110*s,y-30*s,20*s,30*s,'#d8453a'); R2(x+40*s,y+20*s,50*s,16*s,'#c9d1dc'); R2(x+40*s,y-14*s,50*s,16*s,'#c9d1dc'); for(let i=0;i<5;i++)R2(x+20*s+i*18*s,y+8*s,8*s,8*s,'#5b8def'); };
  let raf=0, t0=0, IM=[], flagImg=null, rec=null;
  Promise.all([...S.map(s=>ld(s.me)),...S.map(s=>ld(s.two)),flSrc?ld(flSrc):null]).then(arr=>{ flagImg=arr.pop(); IM=S.map((s,i)=>({me:arr[i],two:arr[S.length+i]})); play(); });
  const drawSpr=(im,cx,h,bob)=>{ if(!im)return; const w=h*im.naturalWidth/im.naturalHeight; g.imageSmoothingEnabled=false; g.fillStyle='#00000035'; g.beginPath(); g.ellipse(cx,GY+4,w*.4,16,0,0,7); g.fill(); g.drawImage(im,cx-w/2,GY-h+(bob||0),w,h); return {x:cx-w/2,y:GY-h+(bob||0),w,h}; };
  function frame(ts){ const T=Math.max(0,(ts-t0)/1000), i=Math.min(S.length-1,Math.floor(T/D)), s=S[i], p=(T-i*D)/D, ein=Math.min(1,p*4), tt=T-i*D, im=IM[i]||{}, k=s.kit||plainKit();
    const sc=s.sc, gold=sc==='cup'||sc==='end'||sc==='promo';
    /* 背景 */
    if(sc==='birth'){ sky('#eaf3ff','#cfe0f2'); }
    else if(sc==='wed'){ sky('#fff1f4','#ffe0e8'); R2(0,GY,W,H,'#f6e7d8'); hearts(tt); }
    else if(sc==='baby'){ sky('#fff7e6','#ffe9c7'); R2(0,GY,W,H,'#f3dcc0'); hearts(tt); }
    else if(sc==='cup'||sc==='promo'||sc==='stad'){ sky('#0b0f22','#1d2440'); stands(tt,[k.p,k.s||'#ffffff','#ffcf4a','#e9edf6']); lights(tt); pitch(1); }
    else if(sc==='retire'){ sky('#0b0f22','#151a2c'); stands(tt,[k.p,k.s||'#ffffff','#e9edf6']); pitch(1); g.fillStyle='rgba(255,250,220,.22)'; g.beginPath(); g.moveTo(W/2-60,140); g.lineTo(W/2+60,140); g.lineTo(W/2+260,GY+20); g.lineTo(W/2-260,GY+20); g.fill(); }
    else if(sc==='nt'){ sky('#eaf3ff','#cfe0f2'); if(flagImg){ g.globalAlpha=.9; for(let x=0;x<W;x+=20)g.drawImage(flagImg,(x/W)*flagImg.naturalWidth,0,flagImg.naturalWidth*20/W,flagImg.naturalHeight,x,190+Math.sin(tt*3+x/90)*14,20,520); g.globalAlpha=1; } pitch(0); }
    else if(sc==='coach'){ sky('#5b8fd0','#a9cbe8'); pitch(0); R2(60,GY-260,300,170,'#2b3348'); R2(70,GY-250,280,150,'#3d8f4f'); g.strokeStyle='#fff'; g.lineWidth=4; g.strokeRect(80,GY-240,260,130); g.font=`900 34px ${N}`; g.fillStyle='#fff'; g.fillText('X   O',140,GY-180); g.fillText('O  X',170,GY-130); R2(700,GY-200,320,140,'#c9d1dc'); R2(700,GY-200,320,20,'#8a95a6'); for(let i=0;i<5;i++)R2(720+i*60,GY-150,40,50,'#d8453a'); }
    else if(sc==='admin'){ sky('#163a7a','#0e2550'); R2(0,180,W,40,'#ffcf4a'); g.fillStyle='#163a7a'; g.font=`900 30px ${F}`; g.textAlign='center'; g.fillText(/國際足總/.test(s.t)?'國 際 足 總　大 會':`${Z.b.c.n}足球協會`,W/2,212); if(flagImg){ g.drawImage(flagImg,80,300,180,120); g.drawImage(flagImg,820,300,180,120); } R2(0,GY,W,H,'#0b1a38'); }
    else if(sc==='owner'){ sky('#f1e6d4','#e3d2b8'); R2(0,GY,W,H,'#8a5a3b'); R2(120,260,260,320,k.p); R2(120,260,260,60,k.s||'#fff'); R2(700,280,260,180,'#cfe0f2'); R2(700,280,260,10,'#8a5a3b'); }
    else if(sc==='sign'){ R2(0,0,W,H,'#0b1024'); R2(0,140,W,GY-140,k.p); for(let y=170;y<GY-60;y+=86)for(let x=((y/86)%2)*64;x<W;x+=128){ g.fillStyle=(Math.floor(x/128)+Math.floor(y/86))%2?(k.s||'#ffcf4a'):'#ffffff22'; g.beginPath(); g.arc(x+30,y,22,0,7); g.fill(); }
      g.fillStyle='#00000055'; g.fillRect(0,GY-200,W,200);
      R2(24,160,120,34,'#e0483e'); g.fillStyle='#fff'; g.font='900 22px '+F; g.textAlign='left'; g.fillText('● LIVE',34,186); flashes(tt); }
    else if(sc==='press'){ sky('#2b3348','#1d2440'); for(let x=0;x<W;x+=180)for(let y=200;y<GY-80;y+=110){ R2(x+20,y,140,70,'#ffffff12'); g.fillStyle='#ffffff40'; g.font=`700 22px ${F}`; g.fillText(sc==='sign'?((Z.car&&Z.car.club)||'FC').slice(0,4):'NEWS',x+40,y+44); } R2(0,GY,W,H,'#14182a'); flashes(tt); if(sc==='sign'){ R2(W/2-260,GY-90,520,90,'#5a3d28'); R2(W/2-120,GY-110,180,20,'#ffffff'); } }
    else if(sc==='plane'){ sky('#5b8fd0','#cfe6ff'); for(let i=0;i<5;i++){ const x=(i*260+tt*40)%(W+200)-100; R2(x,240+i*60,160,36,'#ffffffcc'); R2(x+30,220+i*60,90,30,'#ffffffcc'); } plane(-200+tt*420,300,1.2); R2(0,GY,W,H,'#9aa4b2'); R2(0,GY,W,8,'#7d8794'); }
    else if(sc==='youth'){ sky('#8fc1ef','#cfe6ff'); pitch(0); for(let i=0;i<6;i++){ R2(120+i*150,GY-30,18,30,'#ff7a1a'); } }
    else if(sc==='end'){ const gr=g.createLinearGradient(0,0,0,GY); gr.addColorStop(0,'#2a1d4a'); gr.addColorStop(.6,'#d8603a'); gr.addColorStop(1,'#ffc46b'); g.fillStyle=gr; g.fillRect(0,0,W,H); g.fillStyle='#ffe29a'; g.beginPath(); g.arc(W/2,GY-40,140,0,7); g.fill(); R2(0,GY-40,W,H,'#2f6b3f'); }
    else { sky('#9cc7ef','#d7ebff'); R2(0,GY-40,W,H,'#9a7b4f'); for(let i=0;i<7;i++)R2(i*160,GY-200-((i*37)%60),130,200,'#c9b79c'); R2(0,GY-40,W,6,'#7d6040'); }
    /* 人物與道具 */
    const yo=(1-ein)*30, bob=Math.round(Math.sin(tt*5)*4);
    g.globalAlpha=ein;
    if(sc==='birth'){ if(flagImg)g.drawImage(flagImg,W/2-270,250+yo,540,360); }
    else if(sc==='wed'){ drawSpr(im.me,W/2-120,440,bob); drawSpr(im.two,W/2+120,420,-bob); for(let a=0;a<=12;a++){ const an=Math.PI+a*Math.PI/12, x=W/2+Math.cos(an)*330, y=GY-60+Math.sin(an)*560; R2(x-14,y-14,28,28,a%2?'#ff9db5':'#ffffff'); R2(x-6,y-6,12,12,'#ffcf4a'); } }
    else if(sc==='baby'){ drawSpr(im.me,W/2-60,460,bob); if(im.two){ const h=150, w=h*im.two.naturalWidth/im.two.naturalHeight; g.imageSmoothingEnabled=false; g.drawImage(im.two,W/2+60,GY-300+bob,w,h); } }
    else { const big=s.a<18&&sc!=='end'?260+s.a*14:sc==='end'?420:480, r=drawSpr(im.me,W/2,big,sc==='cup'||sc==='promo'?bob:0);
      if(r&&sc==='cup')cup(s.cup,W/2,r.y+r.h*.16,s.cup==='wc'||s.cup==='ears'?19:17);
      if(r&&sc==='sign'&&!/租借/.test(s.t))scarf(W/2,r.y+10,k,14);
      if(r&&sc==='sign'){ R2(40,GY-150,W-80,170,shadeC(k.p,.7)); R2(40,GY-150,W-80,8,'#ffffff40'); R2(W/2-150,GY-118,300,40,'#f3f3f3'); g.fillStyle='#141a33'; g.font='900 28px '+F; g.textAlign='center'; g.fillText(Z.me.slice(0,14),W/2,GY-88);
        MICS.forEach(([m,t],j)=>{ const x=W*.3+j*W*.1; g.save(); g.translate(x,GY-150); g.rotate((j-2)*.12); R2(-4,-110,8,110,'#222'); R2(-20,-142,40,34,m); g.fillStyle='#fff'; g.font='900 13px '+F; g.textAlign='center'; g.fillText(t,0,-120); g.restore(); });
        CROWD.forEach(([l,hh,b,xx])=>{ const x=l/100*W; R2(x,GY+10,150,40,b); g.fillStyle=hh; g.beginPath(); g.arc(x+75,GY-6,40,0,7); g.fill(); if(/cam/.test(xx))R2(x+25,GY-40,100,46,'#1b1b1b'); }); }
      if(r&&sc==='promo'){ R2(W/2-220,r.y-90,440,70,'#ffcf4a'); g.fillStyle='#12233a'; g.font=`900 40px ${F}`; g.textAlign='center'; g.fillText('升 級 了！',W/2,r.y-40); }
      if(r&&sc==='admin'){ R2(W/2-170,GY-210,340,210,'#3a2a20'); R2(W/2-170,GY-210,340,24,'#5a4030'); R2(W/2-6,GY-290,12,90,'#20242f'); R2(W/2-20,GY-306,40,24,'#20242f'); }
      if(r&&sc==='coach'){ R2(W/2+110,r.y+r.h*.35,8,r.h*.4,'#20242f'); R2(W/2+100,r.y+r.h*.3,60,40,'#fff'); }
      if(sc==='press'){ R2(W/2-300,170,600,90,'#fff'); g.fillStyle='#12233a'; g.font=`900 52px ${F}`; g.textAlign='center'; g.fillText('天才誕生',W/2,234); } }
    if(sc==='cup'||sc==='promo')confetti(tt,[k.p,k.s||'#ffffff','#ffcf4a','#ffffff']);
    /* 文字 */
    g.globalAlpha=1; R2(0,0,W,120,'#00000030'); g.textAlign='left'; g.fillStyle='#ffffffdd'; g.font=`700 32px ${F}`; g.fillText('我的足球人生',60,78); g.textAlign='right'; g.fillText(Z.me,W-60,78);
    const dark=!['birth','wed','baby','nt','coach','owner','plane','youth','street'].includes(sc); R2(0,GY+40,W,H-GY-40,dark?'#0b0f22e6':'#ffffffe6');
    g.globalAlpha=ein; g.textAlign='center'; g.fillStyle=gold?'#ffcf4a':dark?'#ffffff':'#1e8cff'; let bf=sc==='end'?84:110; g.font=`900 ${bf}px ${sc==='end'?F:N}`; while(g.measureText(s.big).width>W-140&&bf>50){ bf-=6; g.font=`900 ${bf}px ${sc==='end'?F:N}`; } g.fillText(s.big,W/2,GY+150+yo/2);
    g.fillStyle=dark?'#ffffff':'#12233a'; g.font=`700 42px ${F}`; wrap(s.t,W/2,GY+225,W-140,56,3);
    g.fillStyle=dark?'#ffffffaa':'#4a5b70'; g.font=`500 30px ${F}`; g.fillText(s.sub,W/2,H-92); g.globalAlpha=1;
    const bw=(W-140)/S.length; S.forEach((_,j)=>{ R2(70+j*bw+3,H-50,bw-6,6,j<i?(dark?'#ffffffcc':'#1e8cffaa'):j===i?(dark?'#ffffff':'#1e8cff'):(dark?'#ffffff40':'#1e8cff30')); if(j===i)R2(70+j*bw+3,H-50,(bw-6)*p,6,'#ffcf4a'); });
    if(T<S.length*D)raf=requestAnimationFrame(frame); else if(rec){ rec.stop(); rec=null; } }
  function play(){ cancelAnimationFrame(raf); t0=performance.now(); raf=requestAnimationFrame(frame); }
  el.querySelector('#r-re').onclick=play; el.querySelector('#r-x').onclick=()=>{ cancelAnimationFrame(raf); if(rec)try{ rec.stop(); }catch(e){} el.remove(); };
  const dl=el.querySelector('#r-dl'); if(dl)dl.onclick=()=>{ const mt=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>MediaRecorder.isTypeSupported(t)); if(!mt)return; const ch=[], mr=new MediaRecorder(cv.captureStream(30),{mimeType:mt,videoBitsPerSecond:5e6});
    mr.ondataavailable=e=>{ if(e.data.size)ch.push(e.data); }; mr.onstop=()=>{ dl.disabled=false; dl.textContent='⬇ 下載影片'; const b=new Blob(ch,{type:mt.split(';')[0]}); saveImg(b,`mylife-${Date.now()%100000}.${mt.includes('mp4')?'mp4':'webm'}`,`${Z.me}的足球人生`); };
    dl.disabled=true; dl.textContent='錄製中…（播完自動下載）'; rec=mr; mr.start(); play(); }; }

const shadeC=(c,f)=>{ if(!/^#[0-9a-f]{6}$/i.test(c))return '#0b0f22'; const n=parseInt(c.slice(1),16); return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v*f).toString(16).padStart(2,'0')).join(''); };
/* ---------- 成就小卡 ---------- */
function achCard(btn){ const W=1080,H=1350, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'), F='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif', N='"Barlow Condensed","Noto Sans TC",sans-serif';
  const st=achStore(), mine=Z.ach||[], got=ACH.filter(x=>st[x[0]]).length; if(btn){ btn.disabled=true; btn.textContent='產生中…'; }
  g.fillStyle='#f4f8fb'; g.fillRect(0,0,W,H); const rr=(x,y,w,h,r,col)=>{ g.fillStyle=col; g.beginPath(); g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h); g.fill(); };
  rr(40,40,W-80,H-80,36,'#fff'); g.fillStyle='#12233a'; g.font=`900 54px ${F}`; g.textAlign='left'; g.fillText('成就收藏',90,140);
  g.font=`600 30px ${F}`; g.fillStyle='#4a5b70'; g.fillText(`${Z.me}・${Z.b.c.n}・${Z.year}–${Z.year+Math.floor(Z.t)}`,90,192);
  g.textAlign='right'; g.fillStyle='#1e8cff'; g.font=`700 64px ${N}`; g.fillText(`${got}/${ACH.length}`,W-90,140); g.fillStyle='#4a5b70'; g.font=`600 26px ${F}`; g.fillText(`這一生解鎖 ${mine.length} 個`,W-90,192);
  const cols=3, cw=(W-180-2*16)/cols, rh=Math.min(64,(H-330-90)/Math.ceil(ACH.length/cols)); g.textAlign='center';
  ACH.forEach(([id,n],i)=>{ const x=90+(i%cols)*(cw+16), y=240+Math.floor(i/cols)*rh, on=mine.includes(id), old=!on&&st[id];
    rr(x,y,cw,rh-12,(rh-12)/2,on?'#ffc400':old?'#eaf3ff':'#f0f3f7'); g.fillStyle=on?'#12233a':old?'#3f73b8':'#b3bcc8'; g.font=`${on?900:700} ${Math.round(rh*.42)}px ${F}`; g.fillText(n,x+cw/2,y+(rh-12)/2+rh*.15); });
  g.textAlign='left'; g.font=`600 24px ${F}`; [['#ffc400','這一生解鎖'],['#eaf3ff','以前收集過'],['#f0f3f7','還沒收集']].forEach(([c,t],i)=>{ rr(90+i*240,H-118,28,28,8,c); g.fillStyle='#4a5b70'; g.fillText(t,128+i*240,H-96); });
  g.textAlign='right'; g.fillStyle='#7a8aa0'; g.fillText('mylife.bearledger.app',W-90,H-96);
  cv.toBlob(b=>{ if(btn){ btn.disabled=false; btn.textContent='存成成就小卡'; } saveImg(b,`mylife-ach-${Date.now()%100000}.png`,`${Z.me}的成就`); },'image/png'); }
/* ---------- 人生小卡(重做：球隊球衣配色、榮譽收納、生涯足跡) ---------- */
function lifeCard(btn){ const W=1080,H=1350, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'), F='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif', N='"Barlow Condensed","Noto Sans TC",sans-serif';
  const C2=Z.car, a=Math.floor(Z.t), pro=C2.hist.length, kit=mainKit(), ld=src=>new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); setTimeout(()=>r(null),1500); im.src=src; });
  let fl=''; try{ fl=FL.flagSVG(Z.b.c.k)||''; }catch(e){} const flSrc=fl?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent((fl.includes('xmlns')?fl:fl.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')).replace('<svg ','<svg width="300" height="200" ')):'';
  if(btn){ btn.disabled=true; btn.textContent='產生中…'; }
  Promise.all([ld(kitSrc(kit,posePose())),flSrc?ld(flSrc):null]).then(([spr,flag])=>{ const rr=(x,y,w,h,r,col)=>{ g.fillStyle=col; g.beginPath(); g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h); g.fill(); };
    g.fillStyle='#f4f8fb'; g.fillRect(0,0,W,H);
    /* 上半:球隊顏色＋草皮條紋 */ const bg=g.createLinearGradient(0,0,W,560); bg.addColorStop(0,kit.p); bg.addColorStop(1,shadeC(kit.p,.45)); g.fillStyle=bg; g.fillRect(0,0,W,560);
    g.fillStyle='#ffffff12'; for(let x=0;x<W;x+=120)if((x/120)%2)g.fillRect(x,0,120,560); if(kit.s){ g.fillStyle=kit.s; g.fillRect(0,548,W,12); }
    g.fillStyle='#ffffffcc'; g.font=`700 30px ${F}`; g.textAlign='left'; g.fillText('我的足球人生',64,82); g.textAlign='right'; g.font=`700 36px ${N}`; g.fillText(`${Z.year} – ${Z.year+a}`,W-64,82);
    if(spr){ const sh=400, sw=sh*spr.naturalWidth/spr.naturalHeight; g.imageSmoothingEnabled=false; g.fillStyle='#00000035'; g.beginPath(); g.ellipse(250,530,sw*.42,18,0,0,7); g.fill(); g.drawImage(spr,250-sw/2,130,sw,sh); }
    g.textAlign='left'; g.fillStyle='#fff'; let nf=70; g.font=`900 ${nf}px ${F}`; while(g.measureText(Z.me).width>560&&nf>36){ nf-=4; g.font=`900 ${nf}px ${F}`; } g.fillText(Z.me,470,250);
    if(flag){ rr(468,282,68,46,6,'#fff'); g.drawImage(flag,472,286,60,38); } g.fillStyle='#fff'; g.font=`700 34px ${F}`; g.fillText(`${Z.b.c.n}・${Z.b.city}`,flag?552:470,316);
    g.font=`500 30px ${F}`; g.fillStyle='#ffffffd0'; g.fillText(`享年 ${a} 歲・${Z.sex==='m'?'男':'女'}${Z.pos?'・'+{GK:'門將',DF:'後衛',MF:'中場',FW:'前鋒'}[Z.pos]:''}`,470,370);
    const hd=headline(); g.font=`900 40px ${F}`; rr(470,402,g.measureText(hd).width+64,74,37,'#ffc400'); g.fillStyle='#12233a'; g.fillText(hd,502,452);
    /* 數字 */ const nums=pro?[[pro,'賽季'],[C2.apps,'出場'],[Z.pos==='GK'?(C2.cs||0):C2.g,Z.pos==='GK'?'零封':'進球'],[C2.caps,'國家隊']]:[[STAGE[Z.stage]||'—','足球'],[Z.kids,'孩子'],[Z.job||'—','工作'],[a,'歲']];
    nums.forEach(([v,l],i)=>{ const x=64+i*244; rr(x,600,226,150,22,'#fff'); g.textAlign='center'; g.fillStyle=kit.p&&lum(kit.p)<.75?kit.p:'#1e8cff'; const vs=typeof v==='number'?v.toLocaleString():v; g.font=`700 ${String(vs).length>4?40:68}px ${typeof v==='number'?N:F}`; g.fillText(vs,x+113,690); g.fillStyle='#4a5b70'; g.font=`700 26px ${F}`; g.fillText(l,x+113,730); });
    /* 榮譽(收納) */ const Hn=grpHon().slice(0,4), TL=timeline(); g.textAlign='left'; let y=812;
    if(Hn.length){ g.fillStyle='#12233a'; g.font=`900 32px ${F}`; g.fillText('榮譽',64,y); y+=50; Hn.forEach(x=>{ g.font=`700 30px ${F}`; g.fillStyle='#24384f'; const t=`${honIc(x)} ${x.nm}`; g.fillText(t,64,y); let w=g.measureText(t).width; if(x.ys.length>1){ g.fillStyle='#d19600'; g.font=`900 30px ${N}`; g.fillText(` ×${x.ys.length}`,64+w,y); } y+=46; }); y+=14; }
    if(TL.length){ g.fillStyle='#12233a'; g.font=`900 32px ${F}`; g.fillText('生涯足跡',64,y); y+=50; TL.slice(0,Math.max(2,Math.min(4,Math.floor((1210-y)/44)))).forEach(x=>{ rr(64,y-24,24,24,6,clubKit(x.club).p); g.fillStyle='#24384f'; g.font=`700 28px ${F}`; let s=`${x.club}・${x.y0}–${String(x.y1).slice(-2)}`; g.fillText(s,100,y); y+=44; }); }
    if(!Hn.length&&!TL.length){ g.fillStyle='#24384f'; g.font=`500 34px ${F}`; g.fillText(epitaph(),64,y+10); }
    g.strokeStyle='#dde7f0'; g.lineWidth=2; g.beginPath(); g.moveTo(64,1230); g.lineTo(W-64,1230); g.stroke(); g.fillStyle='#4a5b70'; g.font=`500 26px ${F}`;
    g.fillText(`${Z.m?`一生賺了約 ${fm(Z.m.earn)}・`:''}解鎖 ${(Z.ach||[]).length} 個成就`,64,1280); g.textAlign='right'; g.fillStyle='#7a8aa0'; g.font=`600 24px ${F}`; g.fillText('mylife.bearledger.app',W-64,1280);
    cv.toBlob(b=>{ if(btn){ btn.disabled=false; btn.textContent='存成人生小卡'; } saveImg(b,`mylife-${Date.now()%100000}.png`,`${Z.me}的足球人生`); },'image/png'); }); }

/* ---------- 教練生涯：青年隊教練 → 低級別主帥 → 頂級聯賽主帥 → 豪門主帥 → 國家隊主帥 ----------
   表現看冷靜、團隊、自律與視野，加上當年的名氣；會被挖角、會被炒、會奪冠，也可能帶國家隊踢世界盃 */
const CO_LV=['青年隊教練','低級別球隊主帥','頂級聯賽球隊主帥','豪門主帥','國家隊主帥'];
function coTeam(lv){ const H=homeLg(Z.b.c), C2=Z.car, mc=mainClub();
  if(lv===0)return {team:mc?`${mc}青年隊`:(Z.kidClub||Z.b.city.replace(/鄉下|村落|小鎮/,'')+'少年隊'),lg:'青年聯賽'};
  if(lv===1){ const lg=lgOf(H.filter(k=>lgT(k)!=='a').pop()||null); return {team:pickTeam(lg,lg.par-6),lg:lg.n}; }
  if(lv===2){ const lg=lgOf(H[0]||null); return {team:pickTeam(lg,lg.par-2),lg:lg.n}; }
  if(lv===3){ const ks=ELITE(); const lg=lgOf(H.find(k=>ks.includes(k))||pick(ks)); const T=teamsOf(lg).slice(0,4).filter(clubOK); return {team:pick(T),lg:lg.n}; }
  return {team:`${Z.b.c.n}${isW()?'女足':''}國家隊`,lg:'國家隊'}; }
function coSet(lv,why){ const co=Z.co, t=coTeam(lv); if(Z.amCoach&&lv>=1&&Z.job){ log(`你辭掉了${Z.job}的工作，成為全職教練。`,'star'); Z.job=null; } co.lv=lv; co.team=t.team; co.lg=t.lg; co.y=Math.floor(Z.t); co.maxLv=Math.max(co.maxLv||0,lv); (co.teams=co.teams||[]).includes(t.team)||co.teams.push(t.team); if(lv===4)co.nt=1;
  log(why||`你成為${t.team}的${CO_LV[lv]}。`,'star'); }
function coachYear(a){ if(!(Z.post==='coach'&&Z.ph==='retired'||Z.amCoach&&Z.ph==='amateur')||Z.done)return; const T=Z.tr||{}, C2=Z.car, yr=Z.year+a;
  if(!Z.co){ Z.co={lv:0,tit:0,fired:0,wc:[],tro:[],teams:[]}; const fame=Z.amCoach?0:(C2.best||20)+(C2.caps?8:0); coSet(fame>=55&&chance(.4)?2:fame>=45&&chance(.5)?1:0); if(Z.amCoach)fact(pick(['穆里尼奧球員時期只在葡萄牙低級別聯賽踢過，後來從翻譯做起，成為世界名帥。','薩里在成為職業教練之前是銀行員，一邊上班一邊執教業餘球隊。','納格斯曼 20 歲因傷退役，28 歲就成為德甲史上最年輕的主帥。','維拉斯-博阿斯從沒踢過職業，16 歲寫信給波圖主帥羅布森討論戰術，因此被找去球探部門。'])); return; }
  const co=Z.co; if(co.out)return;
  if(a>=66&&chance(.12+(a-66)*.06)){ co.out=1; log(`你結束了 ${a-(co.start||a)} 年的教練生涯${co.team||(co.teams||[]).length?`，最後一站是${co.team||co.teams[co.teams.length-1]}`:''}。`,'star'); return; } co.start=co.start||a;
  if(!co.team){ if(chance(.5))coSet(Math.max(0,co.lv),`休息了一陣子之後，${coTeam(co.lv).team}請你回到教練席。`); return; }
  const sk=((T.calm||50)+(T.team||50)+(T.disc||50))/300+(Z.ab.vis||30)/320+(Z.iq||.45)*.25+(C2.best||25)/200, res=sk+gauss()*.28;
  if(co.lv===4){ const N=FL.NATS&&FL.NATS[Z.b.c.k], q=N?N.wc/100:(Z.b.c.wcq||.02);
    if(yr%4===(isW()?3:2)&&yr>=2030){ const cup=isW()?'女足世界盃':'世界盃'; if(chance(q)){ const ti=N?N.tier:5, st=['小組賽出局','32 強','16 強','8 強','4 強','亞軍','冠軍'], w=[[.15,.15,.2,.2,.15,.07,.08],[.3,.2,.25,.15,.06,.02,.02],[.45,.25,.2,.07,.02,.01,0],[.6,.25,.12,.03,0,0,0],[.75,.2,.05,0,0,0,0],[.85,.12,.03,0,0,0,0]][Math.min(5,ti)];
        let r=R(), k=0; for(;k<w.length-1;k++){ r-=w[k]; if(r<0)break; } co.wc.push(`${yr} ${st[k]}`); log(`你以主帥身分帶${Z.b.c.n}踢 ${yr} 年${cup}，最後${st[k]==='冠軍'?'捧起了冠軍盃！':`止步${st[k]}`}。`,'star');
        if(st[k]==='冠軍'){ co.tit++; co.tro.push(`${cup}冠軍（主帥） ${yr}`); add('joy',20); queuePost('wc',`${cup}冠軍`,yr); } else if(k<=1&&chance(.5)){ log('世界盃表現不如預期，足協宣布和你解約。','big'); co.team=null; co.lv=2; add('joy',-6); } }
      else { log(`${Z.b.c.n}沒能打進 ${yr} 年${cup}，你在記者會上一個人扛下所有責任。`,'big'); if(chance(.6)){ co.team=null; co.lv=2; } } }
    if(chance(.6))log(pick(COEV[2])); { const T2=NTCUP[cfOf(Z.b.c.k)]; if(T2&&T2[1](yr)&&yr>=2027){ const N2=FL.NATS&&FL.NATS[Z.b.c.k], ti=Math.min(4,N2?N2.tier:4); if(chance([.28,.15,.06,.02,.006][ti])){ co.tit++; co.tro.push(`${T2[0]}冠軍（主帥） ${yr}`); log(`你帶${Z.b.c.n}拿下了 ${yr} 年${T2[0]}冠軍！`,'star'); add('joy',12); queuePost('cont',`${T2[0]}冠軍`,yr); } else log(`你帶${Z.b.c.n}踢了 ${yr} 年${T2[0]}，${pick(['在八強止步','在小組賽出局','一路打進四強','在決賽輸了'])}。`); } }
    return; }
  if(res>1.18&&chance(co.lv===0?.3:.16)){ co.tit++; const nm=co.lv===0?'青年聯賽冠軍':`${co.lg}冠軍`; co.tro.push(`${nm}（主帥） ${yr}`); log(`你帶領${co.team}拿下${nm}！`,'star'); add('joy',8); if(co.lv>=2)queuePost('lg',`${co.lg}冠軍`,yr); }
  if(co.lv>=2&&!co.nt&&(co.lv>=3||C2.caps>=40||co.tit>=3)&&chance(co.lv>=3?.04:.015)){ ask('ntcoach'); return; }
  if(res>1.05&&co.lv<3&&chance(.18)){ Z.coOffer=coTeam(co.lv+1); Z.coOffer.lv=co.lv+1; ask('coachup'); return; }
  if(res<.62&&chance(.38)){ co.fired++; log(pick([`成績太差，${co.team}把你解雇了。`,`連輸六場之後，${co.team}的老闆在電話裡請你走人。`,`球員在更衣室不聽你的，${co.team}決定換教練。`]),'big'); add('joy',-6); co.team=null; co.lv=Math.max(0,co.lv-1); return; }
  if(chance(.6))log(pick(COEV[co.lv===0?0:1])); }
/* 其他退休出路：每年較常發生的事件 */
const POST2={
 agent:['你幫一個 17 歲的孩子談成了第一份職業合約。','你手上的球員轉會到了更大的聯賽，你抽到一筆不小的佣金。','你為了一份合約在機場過夜。','你旗下的球員在社群上公開感謝你。','你拒絕了一份對球員不利的合約，球隊老闆很不高興。','你手上的球員受了重傷，你陪他走完復健。'],
 pundit:['你在電視上講評了一場德比，一句話被做成迷因。','你在節目裡批評了某位球星，隔天被他的球迷灌爆。','你被請去講評世界盃決賽。','你出了一本談戰術的書。','你的直播節目突破十萬訂閱。','你在節目上和另一位球評吵了起來。'],
 academy:['你的足球學校招到了第 100 個學生。','你的學生被職業俱樂部看中了。','學校差點因為沒錢關門，你撐了下來。','你帶學生去國外參加青年盃賽。','學校的第一個學生踢上了國家隊。','你親自幫學校的球場畫線。'],
 home:['你在家鄉開了一間小店，牆上掛著當年的球衣。','家鄉的孩子會跑來問你當年踢球的事。','你在家鄉的業餘隊多踢了幾場。','你被選為家鄉的社區委員。','你每個週末都在家鄉的空地教孩子踢球。','家鄉的學校邀請你當運動會的嘉賓。']};

/* ================= 第二批：足球世界新聞、孩子的足球路、球隊老闆、足球行政、意外、更多教練事件 ================= */
const NATL=()=>Object.entries(FL.NATS||{}).map(([k,v])=>({k,n:v.n,tier:v.tier,wc:v.wc}));
const wPick=(arr,wf)=>{ const t=arr.reduce((s,x)=>s+wf(x),0); let r=R()*t; for(const x of arr){ r-=wf(x); if(r<0)return x; } return arr[0]; };
const TIERW=[10,4,1.5,.5,.15,.05];
const WC_HOST={2026:'美國、加拿大、墨西哥',2030:'摩洛哥、西班牙、葡萄牙',2034:'沙烏地阿拉伯'};
/* ---------- 足球世界的新聞:每屆世界盃冠軍、洲際盃賽、金球獎、場邊新聞 ---------- */
function worldYear(a){ if(a<4||Z.done)return; const yr=Z.year+a, me=Z.b.c.k, NL=NATL();
  if(yr%4===2&&yr>=2026){ const host=WC_HOST[yr]||pick(NL.filter(x=>x.tier<=2)).n, win=wPick(NL,x=>(x.wc/100)*TIERW[Math.min(5,x.tier)]);
    if(!(Z.car.troph||[]).some(t=>t===`世界盃冠軍 ${yr}`)){ log(`${yr} 年世界盃在${host}舉行，最後由${win.n}捧起冠軍盃。${win.k===me?'整個國家都瘋了，全國放假一天。':''}`); if(win.k===me)add('joy',6); if(yr===2030&&!Z.seen30){ Z.seen30=1; fact('2030 年世界盃是百年紀念，開幕的三場比賽在第一屆主辦國烏拉圭，以及阿根廷、巴拉圭舉行。'); } } }
  if(isW()&&yr%4===3&&yr>=2027&&chance(.7)){ const win=pick(['美國','西班牙','英格蘭','德國','瑞典','日本','法國','巴西','荷蘭']); log(`${yr} 年女足世界盃，${win}奪下冠軍。`); }
  const cf=cfOf(me), T=NTCUP[cf]; if(T&&T[1](yr)&&yr>=2027&&chance(.6)&&!(Z.car.troph||[]).some(t=>t.startsWith(T[0]))){ const pool=NL.filter(x=>cfOf(x.k)===cf); if(pool.length){ const w=wPick(pool,x=>TIERW[Math.min(5,x.tier)]); log(`${yr} 年${T[0]}由${w.n}奪冠。`); } }
  if(isW()){ if(a>=8&&chance(.18)&&!(Z.car.aw||[]).some(t=>t===`女子金球獎 ${yr}`)){ const n=wPick(NL,x=>TIERW[Math.min(5,x.tier)]); log(`今年的女子金球獎，頒給了一位${n.n}的${pick(['前鋒','中場','邊鋒'])}。`); } }
  else starYear(a,yr);
  if(a>=7&&chance(.32))log(newsLine(NL)); }
/* ---------- 球星世界：2026 年的真實球星往後演進(成長、轉會、金球獎、退休)，每年再冒出新一代虛構天才 ---------- */
const SBIG=[['皇家馬德里',10],['巴塞隆納',8],['曼城',9],['利物浦',8],['兵工廠',7],['巴黎聖日耳曼',8],['拜仁慕尼黑',8],['切爾西',6],['曼聯',5],['國際米蘭',5],['馬德里競技',4],['尤文圖斯',4],['AC米蘭',3],['熱刺',3],['紐卡索聯',3],['多特蒙德',3],['拿坡里',3],['勒沃庫森',2]];
const SBW=Object.fromEntries(SBIG), SLATE=['利雅德新月','利雅德勝利','吉達聯合','吉達國民','邁阿密國際','洛杉磯FC','加拉塔沙雷','費內巴切'], SSELL=['本菲卡','波圖','葡萄牙體育','阿賈克斯','PSV燕豪芬','多特蒙德','萊比錫','布萊頓','摩納哥','里爾'];
const POSZ={FW:'前鋒',MF:'中場',DF:'後衛',GK:'門將'};
const sNat=k=>{ const c=C.find(x=>x.k===k); return c?c.n:(FL.NATS&&FL.NATS[k]?FL.NATS[k].n:k); };
const sCur=(x,y)=>{ const ag=y-x.b, pa=x.p==='GK'?30:27; return Math.round((ag<pa?x.pk-.35*Math.pow(pa-ag,1.5):ag>pa+3?x.pk-.9*Math.pow(ag-pa-3,1.4):x.pk)*10)/10; };
const sFee=(x,y)=>{ const ag=y-x.b, v=8*Math.exp((sCur(x,y)-70)*.17)*(ag<=24?1.4:ag<=28?1:ag<=31?.55:.2); return Math.round(clamp(v,2,260)); };
const sFeeT=m=>m>=100?`${(m/100).toFixed(1).replace(/.0$/,'')} 億歐元`:`${m*100} 萬歐元`;
const sWho=x=>`${sNat(x.n)}${POSZ[x.p]}${/^[A-Za-zÀ-ɏ]/.test(x.nm)?' ':''}${x.nm}`;
const homeTop=k=>{ const N=FL.NATS&&FL.NATS[k], L=N&&N.home&&N.home.find(h=>FL.TEAMS[h]); return L?FL.TEAMS[L].slice(0,4):null; };
function sNew(y){ const NL=NATL(); let c; if(chance(.85))c=wPick(NL,x=>TIERW[Math.min(5,x.tier)]*(x.wc+10)).k; else c=pick(C).k; const cc=C.find(x=>x.k===c), H=homeTop(c);
  return {nm:mkName(cc?cc.nm:'en','m').full,n:c,p:pick(['FW','FW','MF','MF','DF','GK']),b:y-17,c:H&&chance(.7)?pick(H):pick(SSELL),pk:Math.round(clamp(78+gauss()*3.5,72,92)),ret:0,bdo:0,f:1}; }
function sInit(){ const W=Z.sw={y:2026,L:[],gone:[],bdo:[]};
  for(const [nm,n,p,b,c,pk] of (window.WORLD.SPOOL||[])){ const ag=2026-b; W.L.push({nm,n,p,b,c,pk,r:1,ret:Math.max(Math.round(clamp(33+(pk-76)/3+R()*3,33,40)),ag+1+Math.floor(R()*3)),bdo:0}); }
  const B0={梅西:8,'C 羅':5,莫德里奇:1,登貝萊:1,羅德里:1}; for(const x of W.L)if(B0[x.nm])x.bdo=B0[x.nm]; W.bdo.push(['2024','羅德里'],['2025','登貝萊']); W.rec=222; } /* 歷史上的金球獎座數；世界轉會紀錄：2017 年內馬爾 2.22 億歐元 */
function sStep(y,show,a){ const W=Z.sw, C2=Z.car, me=Z.ph==='pro'&&C2&&C2.club, news=[];
  for(const x of W.L)if(!x.ret)x.ret=Math.round(clamp(33+(x.pk-76)/3+R()*3,33,40));
  /* 退休 */
  for(const x of W.L.slice()){ if(y-x.b>=x.ret){ W.L.splice(W.L.indexOf(x),1); W.gone.push([x.nm,x.n,x.b,x.bdo]); if(W.gone.length>80)W.gone.shift(); if((show&&(x.pk>=82||x.bdo))||(a>=4&&x.r&&x.pk>=83))news.push([x.pk+5,`球星新聞：${x.bdo?`拿過 ${x.bdo} 座金球獎的`:''}${sWho(x)}宣布退休，結束 ${y-x.b-17} 年的職業生涯。`]); if(me&&x.c===me)log(`你的隊友${x.nm}宣布退休，更衣室裡大家輪流跟他擁抱。`); } }
  /* 新一代天才 */
  for(let i=0;i<3;i++){ const x=sNew(y); W.L.push(x); if(show&&x.pk>=86&&chance(.5))news.push([x.pk-4,`球星新聞：${sNat(x.n)} 17 歲的${x.nm}在${x.c}一戰成名，被稱為下一個超級巨星。`]); }
  /* 轉會 */
  for(const x of W.L){ const ag=y-x.b, cur=sCur(x,y), big=SBW[x.c]||0; let p=0, to=null;
    if(ag>=31&&ag<x.ret&&!SLATE.includes(x.c)&&chance(.16)){ to=chance(.25)&&homeTop(x.n)?pick(homeTop(x.n)):pick(SLATE); }
    else if(ag>=18&&ag<=30){ p=big>=8?.07:big>=5?(cur>=78?.25:.06):big?(cur>=74?.4:.05):cur>=74?.45:cur>=72?.2:0; if(chance(p)){ const pool=SBIG.filter(([n,w])=>n!==x.c&&(w>big||(big>=8&&w>=8))); if(pool.length)to=wPick(pool,z=>z[1])[0]; } }
    if(!to||to===x.c)continue; const fee=sFee(x,y), from=x.c; x.c=to; x.fee=Math.max(x.fee||0,fee);
    if(me&&to===me)log(`${sWho(x)}以 ${sFeeT(fee)}從${from}加盟${me}，你們成了隊友。`,'star');
    else if(me&&from===me)log(`你的隊友${x.nm}以 ${sFeeT(fee)}轉會到${to}。`);
    else if(show)news.push([cur+(fee>=100?4:0),`轉會新聞：${sWho(x)}以 ${sFeeT(fee)}從${from}轉會到${to}${fee>(W.rec||222)?(W.rec=fee,'，打破世界轉會紀錄'):''}。`]); }
  /* 金球獎 */
  const sc=W.L.map(x=>[x,sCur(x,y)+gauss()*2.8+(SBW[x.c]||0)*.25+(x.p==='FW'?1:x.p==='GK'?-3:x.p==='DF'?-1.5:0)]).sort((u,v)=>v[1]-u[1]), mine=(C2&&C2.aw||[]).some(t=>t===`金球獎 ${y}`);
  if(mine){ W.bdo.push([String(y),Z.me]); if(show&&sc[0])log(`金球獎票選第二名是${sWho(sc[0][0])}。`); }
  else if(sc[0]){ const w=sc[0][0]; w.bdo=(w.bdo||0)+1; W.bdo.push([String(y),w.nm]);
    if(show&&(a<60||chance(.35))){ log(`${y} 年金球獎頒給了${w.c}的${sWho(w)}${w.bdo>1?`，這是他的第 ${w.bdo} 座`:''}。`); 
      if(Z.ph==='pro'&&C2.lg&&C2.lg.par>=50&&ovr()>=62){ const ms=ovr()+12+(C2.lg.top5?1:0); /* 遊戲綜合能力 74 ≈ 球星世界的金球獎水準 86 */ const rk=Math.max(2,sc.filter(z=>z[1]>ms).length+1); if(rk<=30)log(`你在金球獎票選排第 ${rk} 名。${rk<=3?'離最高榮譽只差一步。':''}`,rk<=10?'star':''); }
      if(w.c===me)log(`得獎的是你的隊友，頒獎典禮上他特別感謝了全隊。`); } }
  if(news.length){ news.sort((u,v)=>v[0]-u[0]); for(const [,t] of news.slice(0,2))log(t); }
  W.y=y; }
function starYear(a,yr){ if(!Z.sw)sInit(); const W=Z.sw; while(W.y<yr-1)sStep(W.y+1,false,a); if(W.y<yr)sStep(yr,a>=7,a); }
function newsLine(NL){ const n=pick(NL).n, n2=pick(NL).n, L=Object.keys(FL.LV), lg=FL.LV[pick(L)], T=FL.TEAMS[pick(L)]||['某球隊'], cl=pick(T), cl2=pick(T), age=15+Math.floor(R()*4);
  return pick([`場邊新聞：${n}出現了一位 ${age} 歲的天才少年，好幾支豪門已經派人去看。`,`場邊新聞：${cl}以破隊史紀錄的轉會費，買下一位${n}前鋒。`,`場邊新聞：${lg.n}爆發假球醜聞，好幾位球員被禁賽。`,`場邊新聞：${cl}的主教練在賽季中途被解雇了。`,
   `場邊新聞：一場女足比賽創下了${n}的觀眾人數紀錄。`,`場邊新聞：${cl}宣布興建一座六萬人的新球場。`,`場邊新聞：${n}一位 40 歲的老將宣布退休，全場球迷起立鼓掌三分鐘。`,`場邊新聞：國際足總修改了越位規則，引發一陣爭論。`,
   `場邊新聞：${cl}和${cl2}的德比戰，因為看台衝突中斷了二十分鐘。`,`場邊新聞：${n}國家隊換了新主帥。`,`場邊新聞：一位${n}門將在比賽最後一分鐘頭球破門。`,`場邊新聞：${lg.n}的轉播權賣出了破紀錄的價格。`,
   `場邊新聞：${n}和${n2}宣布聯合申辦未來的世界盃。`,`場邊新聞：${cl}被收購，新老闆來自海灣國家。`,`場邊新聞：一位${n}球員在比賽中受了重傷，全世界的球員都在社群上為他祈禱。`,`場邊新聞：${cl}的青訓學院一口氣有三個人入選國家隊。`,
   `場邊新聞：${n}的國內聯賽因為經濟問題停賽了一個月。`,`場邊新聞：AI 分析系統開始被各大俱樂部用來找球員。`,`場邊新聞：${cl}的老牌球星回到母隊，球迷在機場等了一整晚。`,`場邊新聞：${lg.n}決定導入半自動越位判定。`]); }
/* ---------- 孩子的足球路 ---------- */
function kidYear(a){ if(Z.kids<1||Z.done)return; const C2=Z.car, famous=(C2.best||0)>=50||C2.caps>=20||C2.troph.length>=3;
  if(!Z.kid){ Z.kid={born:a,n:mkName(Z.b.c.nm,chance(.6)?'m':'f').full,t:clamp(R()**2.2+(C2.hist.length?.15:0),0,1),push:0,st:0,famous}; return; }
  const k=Z.kid, ka=a-k.born; if(k.done)return;
  if(ka===5&&!k.asked){ k.asked=1; ask('kidball'); return; }
  if(!k.track)return;
  const p=k.t*.6+k.push*.08+(k.school?.08:0);
  if(k.st===0&&ka>=7&&chance(.5)){ k.st=1; k.club=`${Z.b.city.replace(/鄉下|村落|小鎮/,'')}${pick(['少年隊','青年足球會','聯隊'])}`; log(`${k.n}加入了${k.club}，背號和你當年一樣。`,'star'); add('joy',4); return; }
  if(k.st===1&&ka>=11&&chance(p*.22)){ k.st=2; log(`${k.n}被選進了地區代表隊。`,'star'); add('joy',3); return; }
  if(k.st===2&&ka>=14&&chance(p*.22)){ k.st=3; const mc=mainClub(); k.club=mc?`${mc} 青訓`:`${pick(['城市','聯合','體育'])}俱樂部青訓`; log(`${k.n}進了${k.club}。`,'star'); add('joy',5); if(famous&&chance(.6)){ ask('kidpress'); } return; }
  if(k.st===3&&ka>=18){ if(chance(p*.7)){ k.st=4; const H=homeLg(Z.b.c), lg=lgOf(H[0]||null), cl=pickTeam(lg,lg.par-2+k.t*8); k.club=cl; k.lg=lg.n; log(`${k.n}簽下了第一份職業合約：${cl}（${lg.n}）。你在看台上哭了。`,'star'); add('joy',10); queuePost('kid',`${k.n}`,Z.year+a); }
    else { k.done=1; log(`${k.n}沒有拿到職業合約，決定去念大學。你說：「我以你為榮。」`); } return; }
  if(k.st===4){ if(ka>=20&&!k.nt&&chance(k.t*.18)){ k.nt=1; log(`${k.n}入選了${Z.b.c.n}國家隊。記者問你感覺如何，你說不出話來。`,'star'); add('joy',10); return; }
    if(chance(.2))log(pick([`${k.n}在${k.club}踢進一球，慶祝動作跟你當年一模一樣。`,`${k.n}打電話問你怎麼面對低潮。`,`${k.n}轉會到更大的球隊了。`,`媒體說${k.n}比你當年踢得還好，你笑著說：「我同意。」`,`${k.n}受了傷，你飛過去陪他做復健。`]));
    if(ka>=34){ k.done=1; log(`${k.n}也退休了。你們父子／母子一共踢了 ${(C2.hist.length||0)+ka-18} 個職業賽季。`); } } }
/* ---------- 球隊老闆:股東或直接買下經營 ---------- */
function ownerYear(a){ const O=Z.own, M=Z.m; if(!O||Z.done||!M)return; const yr=Z.year+a;
  const rank=clamp(Math.round((1-O.str)*15+gauss()*3+1),1,16); O.y++;
  const rev=O.val*(.06+O.str*.06)+(rank<=3?O.val*.04:0), cost=O.val*(.08+O.wage), net=(rev-cost)*(O.share||1); M.bank+=net; O.tot=(O.tot||0)+net;
  O.val=Math.max(10,O.val*(1+(rank<=4?.06:rank>=13?-.06:.01)+gauss()*.03)); O.str=clamp(O.str+(R()-.5)*.06,.05,.95);
  if(O.share<1){ if(chance(.25))log(`你持股的${O.club}今年${net>=0?`分到了 ${fm(net)} 的紅利`:`虧了 ${fm(-net)}`}。`); }
  else { if(rank===1){ log(`你經營的${O.club}拿下了${O.lg}冠軍！你在頒獎台上和球員一起舉起獎盃。`,'star'); add('joy',10); O.tit=(O.tit||0)+1; }
    else if(rank>=15&&chance(.6)){ log(`你經營的${O.club}降級了，球迷在你家門口抗議。`,'big'); add('joy',-8); O.val*=.75; O.str=Math.min(O.str+.15,.7); O.rel=(O.rel||0)+1; }
    else if(chance(.3))log(pick([`你經營的${O.club}排名第 ${rank}，${net>=0?'帳面小賺':'帳面虧損'}。`,`${O.club}的季票賣光了。`,`你在${O.club}的董事會上和其他股東吵了一架。`,`${O.club}的青訓出了一個好球員，你親自跟他簽約。`]));
    if(chance(.3)&&Z.pending.length<=1){ ask('owner'); } }
  if(M.bank<-HB()&&O.share>=1){ log(`你的錢撐不下去了，只好把${O.club}賣掉。`,'big'); M.bank+=O.val*.7; Z.own=null; } }
/* ---------- 足球行政:足協到 FIFA ---------- */
const AD_LV=['足協職員','足協技術總監','足協主席','洲際足聯理事','國際足總理事','國際足總主席'];
function adminYear(a){ if(Z.post!=='admin'||Z.done)return; const T=Z.tr||{}, C2=Z.car;
  if(!Z.ad){ Z.ad={lv:C2.caps>=30?1:0,y:a,max:0}; log(`你進了${Z.b.c.n}足協工作，職稱是${AD_LV[Z.ad.lv]}。`,'star'); return; }
  const ad=Z.ad; if(ad.out||ad.ban)return; ad.max=Math.max(ad.max,ad.lv);
  if(a>=75){ ad.out=1; log('你從足協退休了。'); return; }
  const pw=((T.calm||50)+(T.team||50)+(T.ambi||50))/300+(C2.caps||0)/200+(C2.best||20)/150;
  if(ad.lv===1&&chance(.1*pw)){ ask('adelect'); return; }
  if(ad.lv===2&&a>=45&&chance(.1*pw)){ ad.lv=3; log(`你被選為${{UEFA:'歐洲足聯',AFC:'亞洲足聯',CAF:'非洲足聯',CONMEBOL:'南美足聯',CONCACAF:'中北美足聯',OFC:'大洋洲足聯'}[cfOf(Z.b.c.k)]}理事。`,'star'); add('joy',5); return; }
  if(ad.lv===3&&chance(.12*pw)){ ad.lv=4; log('你成為國際足總理事會的成員，每年要飛到蘇黎世好幾次。','star'); add('joy',6); return; }
  if(ad.lv===4&&a>=50&&!ad.ran&&chance(.15*pw)){ ad.ran=1; ask('fifa'); return; }
  if(ad.lv===0&&chance(.25*pw)){ ad.lv=1; log('你升為足協技術總監，負責全國的青訓和教練培訓。','star'); return; }
  if(ad.lv>=2&&!ad.bribe&&chance(.06)){ ad.bribe=1; ask('bribe'); return; }
  if(chance(.5))log(pick(ADEV[Math.min(5,ad.lv)])); }
const ADEV=[
 ['你在足協負責辦全國少年盃，三百支球隊報名。','你寫的青訓報告被主席退回了三次。','你到偏鄉辦了一場足球營。','你負責接待來訪的外國足協代表團。'],
 ['你推動全國的教練證照制度。','你訂下規定：每支職業球隊都要有女足和青年隊。','你從國外請來一位青訓顧問。','你在記者會上說明國家隊的長期計畫。','你推動在每個城市蓋一座公共人工草皮球場。'],
 ['你以足協主席的身分，看著國家隊踢進一場關鍵的資格賽。','你和政府談下了新的足球預算。','你推動國內聯賽的轉播合約，收入翻了一倍。','你開除了國家隊主帥，被球迷罵了一個月。','你推動國內聯賽導入 VAR。','你提出申辦洲際國家盃，結果落選了。'],
 ['你在洲際足聯會議上推動小國的青訓補助。','你負責洲際盃賽的抽籤典禮。','你提案改革洲際冠軍聯賽的賽制。','你在會議上和其他理事為了賽程吵了起來。'],
 ['你參與世界盃主辦國的投票。','你負責國際足總的女足發展委員會。','你飛到世界各地視察世界盃的球場。','你在國際足總的改革委員會上發言。'],
 ['你以國際足總主席的身分，為世界盃開幕致詞。','你推動世界盃在一個從沒辦過大賽的國家舉行。','你宣布每個會員協會都能拿到更多的發展基金。','你被媒體批評在賽程上太偏向大國。']];
/* ---------- 低機率的意外(真實發生過的悲劇) ---------- */
function tragedyYear(a){ if(Z.done||Z.tragic||Z.ph!=='pro')return;
  if(chance(.0015)){ if(chance(.8)){ log('比賽進行到一半，你突然倒在場上——心臟驟停。隊醫衝進場，用電擊器把你救了回來。','big'); fact('2021 年歐洲盃，丹麥的艾瑞克森在場上心臟驟停，被醫療團隊用 AED 救回，後來重返球場。'); add('hp',-20); add('joy',-8); Z.heart=1; }
    else { Z.tragic=1; Z.die=a; log('比賽進行到一半，你突然倒在場上，再也沒有醒來。','big'); fact('心臟驟停後，每晚一分鐘急救，存活率大約下降 7% 到 10%；越早使用 AED，越有機會救回一條命。'); } } }
/* 有風險的選項:出事時多半是重傷，少數喪命 */
function accident(k){ const a=Math.floor(Z.t);
  if(chance(.3)){ Z.tragic=1; Z.die=a+1; log(k==='plane'?'你搭乘的小飛機在暴風雨中失去了聯絡。':'你的車在凌晨失控，撞上了護欄。','big'); fact(k==='plane'?'小型飛機在惡劣天氣下的事故率，遠高於一般的民航客機。':'世界衛生組織統計，全世界每年約有 119 萬人死於道路交通事故。'); return; }
  log(k==='plane'?'小飛機在暴風雨中迫降，你在醫院醒來，全身都是傷。':'你的車在凌晨失控撞上護欄，你在醫院醒來，醫生說你能活下來很幸運。','big'); fact('世界衛生組織統計，全世界每年約有 119 萬人死於道路交通事故，還有數千萬人因此受傷。');
  add('hp',-25); add('joy',-10); for(const x of PHYS)abAdd(x,-5); syncBall(); Z.crash=1;
  if(Z.ph==='pro'&&chance(.4)){ log('傷勢太重，你再也回不到職業球場了。','big'); ASK.retire().o[0].f(); } }
/* ---------- 更多教練事件(青年隊、俱樂部、國家隊) ---------- */
const COEV=[
 ['你帶的青年隊有個孩子哭著說想放棄，你陪他練到天黑。','你堅持每個孩子都要輪流上場，家長們很感謝你。','你帶青年隊出國比賽，孩子們第一次坐飛機。','你發現一個 13 歲的天才，親自去說服他的爸媽。','你的青年隊拿下了全國少年盃。','你把自己當年的訓練方法教給孩子們。'],
 ['你在更衣室踢翻了一個水桶，下半場球隊逆轉了。','你被老闆要求先發他欽點的球員，你拒絕了。','你的戰術被球評稱為「本季最大驚喜」。','球隊連輸五場，看台上有人舉牌要你下台。','你和隊上的大牌球星吵了起來，只好把他放上板凳。','你帶隊在盃賽淘汰了一支豪門。','記者會上你說錯一句話，被罰款。','你在轉會窗爭取了一個年輕後衛，他後來成為隊長。','你的助理教練被別隊挖走了。','你在場邊被裁判驅逐，賽後被禁賽兩場。','你被選為本月最佳主帥。','你留在辦公室研究影片到凌晨三點。','球隊的財務出問題，薪水晚發了兩個月，你自掏腰包請球員吃飯。','你帶的球隊在最後一輪保級成功，全隊在場上抱成一團。'],
 ['國家隊名單公布後，被你落選的球星在社群上公開抱怨。','你決定徵召一位歸化球員，引起很大的爭議。','你帶國家隊在友誼賽擊敗了一支世界強權。','資格賽關鍵戰前，你一夜沒睡。','足協主席想干預你的名單，你在記者會上直接拒絕。','你給一位 17 歲的孩子國家隊初登場的機會。','你帶隊在客場的高原上苦戰到最後一分鐘。','國家隊輸給了實力較弱的對手，全國媒體都在罵你。','你把國家隊的訓練營搬到偏鄉的小鎮，當地的孩子都跑來看。','退役的老國腳打電話給你，說你讓他們想起了當年。','你的國家隊在世界排名上升到史上最高。','你在全國的電視上流下眼淚，因為資格賽晉級了。','你在洲際國家盃決賽前，帶球員去參觀國家的足球博物館。','你被球迷投票選為年度最受歡迎人物。']];

function adWin(p,tr){ const T=Z.tr||{}; if(chance(p+((T[tr]||50)-50)/200+(Z.car.caps||0)/300)){ if(Z.post!=='admin'){ if(Z.co&&!Z.co.out){ Z.co.out=1; log('你卸下了教練的職務。'); } Z.post='admin'; } Z.ad.lv=2; log(`你當選了${Z.b.c.n}足協主席。`,'star'); add('joy',6); } else log('你以些微差距落選了。','big'); }
function fifaRun(p){ const T=Z.tr||{}; if(chance(p+((T.team||50)+(T.calm||50)-100)/300+(Z.car.caps||0)/400+(Z.car.troph.length>=5?.08:0))){ Z.ad.lv=5; Z.ad.max=5; log('你當選了國際足總主席。全世界的足球，現在由你帶領。','star'); fact('國際足總主席由 211 個會員協會投票選出，不論國家大小都是一國一票。'); add('joy',15); queuePost('fifa','國際足總主席',Z.year+Math.floor(Z.t)); } else log('你在國際足總主席選舉中落選了，但你拿到的票比所有人預期的都多。','big'); }
const iqHint=()=>{ const q=Z.iq||.45; return q>=.8?'小時候看比賽，你總會問大人為什麼要這樣跑位。':q>=.64?'你很喜歡看球賽，常常一看就是一整場。':q<=.22&&Z.talent>=.6?'你踢球全靠直覺，不太愛聽大人講戰術。':''; };
const iqLv=()=>{ const q=Z.iq||.45; return q>=.85?'頂尖':q>=.68?'很好':q>=.4?'普通':'偏弱'; };
/* ---------- 加盟記者會(改寫自足球人生 v0.78)：第一份職業合約與重大轉會時出現在人生紀錄，可以選回答 ---------- */
function pressQ(x,first,prev,yrsPrev){ const city=Z.b.city.replace(/鄉下|村落|小鎮/,'');
  if(first)return {q:'你簽下了第一份職業合約，有什麼話想對家鄉的人說？',A:[['「謝謝一路支持我的家人。」',`${Z.mom.gone==null?Z.mom.n:'家人'}在電視機前哭了。`,{fam:4}],['「這只是開始。」','記者們低頭寫下了這句話。',{ambi:2}],[`「我想念${city}的那塊空地。」`,'家鄉的電視台把這段剪成了特輯。',{kind:2,joy:2}]]};
  if(x.kind==='home')return {q:'回家的感覺如何？當年為什麼離開？',A:[['「我欠這裡一個冠軍。」','看台上的老球迷把這句話印成了布條。',{joy:3}],['「出去看過世界，才知道家鄉有多好。」','有人在記者會現場鼓掌。',{fam:3}],['「我回來是因為這裡需要我。」','有人點頭，也有人搖頭，社群吵了一整晚。',{ambi:1}]]};
  if(x.kind==='rich')return {q:'有人說你是為了錢才來的，你怎麼回應？',A:[['「我是來贏球的。」','記者們面面相覷，有人笑了出來。',{brave:1}],['「我要照顧我的家人，這沒有錯。」','這段話在家鄉被轉發了好幾萬次。',{fam:3}],['笑而不答','隔天新聞標題：「沉默的高薪新援」。',{calm:1}]]};
  if(prev&&yrsPrev>=3)return {q:`你在${prev}待了 ${yrsPrev} 年，那裡的球迷說你背叛了他們。你想對他們說什麼？`,A:[[`「${prev}給了我一切。」`,'老東家的球迷在社群留言：「祝你好運。」',{kind:2}],['「我來這裡只為了冠軍。」','新球迷瘋狂轉發，老東家球迷把你的舊球衣掛上網拍賣。',{ambi:2}],['笑而不答','隔天四個新聞帳號寫了四種版本的故事。',{calm:1}]]};
  if(x.fee)return {q:`這筆轉會費約 ${fm(x.fee)}，你覺得自己值這個價嗎？`,A:[['「我會用表現證明。」','記者們低頭寫字，有人點了點頭。',{resi:1}],['「價錢是球隊決定的，我只負責踢球。」','主帥在後台聽了，滿意地笑了。',{team:2}],['笑而不答','隔天新聞標題：「沉默的天價新援」。',{calm:1}]]};
  return {q:`你來${x.club}的目標是什麼？`,A:[['「冠軍。」','看台上的球迷把這句話印上了布條。',{ambi:2}],['「先爭取先發位置。」','主帥說他欣賞這種態度。',{disc:2}],['「來這裡學習。」','老隊員在更衣室拍了拍你的肩。',{team:2}]]}; }
function pressCard(x,first,prev,yrsPrev){ const K=clubKit(x.club), Q=pressQ(x,first,prev,yrsPrev); log('','press'); Z.log[0].pr={club:x.club,c1:K.p,c2:K.s||'#ffcf4a',kit:K,q:Q.q,A:Q.A,ans:null}; }
const MICS=[['#e0483e','TV1'],['#2b6cb0','FC'],['#111','SPT'],['#27ae60','NEWS'],['#8e44ad','24H']], CROWD=[[2,'#2b2b2b','#3a3f55',''],[17,'#5a3a22','#26324d','cam'],[33,'#141414','#4a2c2c','arm'],[50,'#3a2a1a','#2d3b2d',''],[66,'#1d1d1d','#3b3355','cam'],[82,'#6b4a2a','#34404f','arm note']];
function pressHTML(pr,i){ return `<div class="prs"><div class="prc" style="--c1:${pr.c1};--c2:${pr.c2}"><div class="prc-wall"></div><span class="prc-lb">LIVE</span><div class="prc-who">${kitImg(pr.kit,200,'N')}</div><div class="prc-tbl"></div><div class="prc-pl">${esc(Z.me)}</div>
  ${MICS.map(([m,t],j)=>`<div class="prc-mic" style="--m:${m};left:${30+j*10}%;transform:rotate(${(j-2)*7}deg)"><i></i><b>${t}</b></div>`).join('')}
  <div class="prc-crowd">${CROWD.map(([l,hh,b,xx])=>`<div class="prc-rp" style="left:${l}%;--h:${hh};--b:${b}"><div class="bd"></div><div class="hd"></div>${/arm/.test(xx)?'<div class="arm"></div>':''}${/cam/.test(xx)?'<div class="cam"></div>':''}${/note/.test(xx)?'<div class="nt"></div>':''}</div>`).join('')}</div>
  ${[[-6,-4,.3],[92,6,1.1],[20,30,1.8],[70,40,2.3]].map(([l,t,d])=>`<div class="prc-fl" style="left:${l}%;top:${t}%;animation-delay:${d}s"></div>`).join('')}</div>
  <p class="prq"><b>加盟記者會・${esc(pr.club)}</b><br>記者搶先舉手：「${pr.q}」</p>${pr.ans==null?`<div class="prc-ans">${pr.A.map(([t],j)=>`<button type="button" class="pra" data-li="${i}" data-a="${j}">${t}</button>`).join('')}</div>`:`<p class="prr"><b>你：${pr.A[pr.ans][0]}</b><br>${pr.A[pr.ans][1]}</p>`}</div>`; }

/* 嬰兒:包著布巾的像素小嬰兒 */
function babySrc(skin,hair,wrap){ const px=[], R=(x,y,w,h,c)=>px.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`), d='#1b1426';
  R(4,9,10,8,wrap); R(3,10,12,6,wrap); R(5,17,8,1,wrap); R(4,9,10,1,d); R(3,10,1,6,d); R(14,10,1,6,d); R(4,16,1,1,d); R(13,16,1,1,d); R(5,17,8,1,d); R(6,12,6,1,'#ffffff66');
  R(5,2,8,7,skin); R(4,3,1,5,d); R(13,3,1,5,d); R(5,1,8,1,d); R(5,9,8,1,d); R(6,1,4,2,hair); R(9,0,2,1,hair); R(7,5,1,1,d); R(10,5,1,1,d); R(6,7,1,1,'#f0a0a0'); R(11,7,1,1,'#f0a0a0'); R(8,7,2,1,'#c0706a');
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" shape-rendering="crispEdges">${px.join('')}</svg>`); }
const babyImg=(h,lk,wrap)=>`<img alt="嬰兒" style="height:${h}px;image-rendering:pixelated" src="${babySrc((lk||Z.look).skin||'#e8b98f',(lk||Z.look).hair||'#3b2416',wrap||(Z.sex==='f'?'#f6c4d4':'#bcd8f6'))}">`;
/* ---------- 主動花錢(財務卡的「花錢」)：價格依出生國家物價；同一樣東西重複買，快樂一次比一次少；奢侈品買多了有代價 ---------- */
const PL=()=>clamp((LIV_BASE[Z.b.c.inc]||19)/19,.3,2.5); /* 物價:台灣約 1 */
const SHOP=[
 ['lux','奢侈品',[['watch','名錶',30,{joy:3}],['bag','名牌包',15,{joy:2}],['car','跑車',400,{joy:6}],['yacht','遊艇',3000,{joy:9}],['jet','私人飛機',15000,{joy:12}]]],
 ['life','生活',[['dinner','高級餐廳',1,{joy:1,fam:1}],['concert','演唱會',.5,{joy:1}],['trip','出國旅行',8,{joy:3,fam:2}],['wctrip','到現場看世界盃',20,{joy:5},Z=>[2,3].includes((Z.year+Math.floor(Z.t))%4)]]],
 ['health','健康',[['check','全身健康檢查',3,{hp:3}],['nutri','請營養師一年',10,{hp:4}],['trainer','私人健身教練一年',20,{hp:5,disc:1}]]],
 ['ball','足球',[['boots','頂級球鞋',1,{joy:1,dri:.3},Z=>Z.stage>=1&&Math.floor(Z.t)<=35],['camp','私人訓練營',15,{sta:1,phy:1,pac:.5},Z=>Z.stage>=1&&Math.floor(Z.t)<=30],['alt','高原移地訓練',30,{sta:2,hp:1},Z=>Z.ph==='pro'&&Math.floor(Z.t)<=33]]],
 ['fam','家人',[['ftrip','帶全家出國',25,{fam:5,joy:3}],['edu','孩子的教育基金',100,{fam:4},Z=>Z.kids>0],['ppl','幫爸媽整修房子',60,{fam:6,kind:1},Z=>Z.mom.gone==null||Z.dad.gone==null]]],
 ['give','回饋',[['pitch','捐家鄉一座人工草皮球場',80,{kind:4,joy:3}],['kids','資助家鄉孩子出國試訓',20,{kind:3}],['charity','捐款給慈善團體',10,{kind:2,joy:1}]]]];
const shopPrice=p=>Math.max(.05,Math.round(p*PL()*10)/10);
const LUX_BAD=['媒體把你的購物清單做成了專題，標題是「錢多到不知道怎麼花」。','網路上有人把你戴名錶的照片和家鄉的貧民區放在一起，罵聲一片。','家人說你變了，吃飯時大家都不太講話。','老朋友說你現在不太像以前的你了。'];
function buy(id,auto){ const M=Z.m; let it=null; for(const [,,L] of SHOP)for(const x of L)if(x[0]===id)it=x; if(!it)return; const price=shopPrice(it[2]); if(M.bank<price)return;
  M.bank-=price; M.spent=(M.spent||0)+price; M.buy=M.buy||{}; const n=M.buy[id]=(M.buy[id]||0)+1, dim=1/(1+.6*(n-1)); /* 新鮮感遞減 */
  const fx=[['存款',-price,1]]; for(const [k,v] of Object.entries(it[3])){ const vv=k==='joy'||k==='fam'?Math.round(v*dim*10)/10:v; if(!vv)continue; add(k,vv); if(!hideFx(k))fx.push([chLabel(k),vv]); }
  log(`${auto?'你':'你決定'}${it[1].startsWith('幫')||it[1].startsWith('帶')||it[1].startsWith('捐')||it[1].startsWith('資助')||it[1].startsWith('請')||it[1].startsWith('到')?'':'買了'}${it[1]}。${n>1&&dim<.8?'這次的開心，比上次少了一點。':''}`,'ch'); Object.assign(Z.log[0],{ti:auto?'花錢':'你主動花錢',fx});
  if(['watch','bag','car','yacht','jet'].includes(id)){ M.flash=(M.flash||0)+({watch:1,bag:1,car:2,yacht:3,jet:4}[id]);
    if(chance(Math.min(.6,M.flash*.06))){ const t=pick(LUX_BAD); log(t,'big'); if(/家人/.test(t))add('fam',-3); else add('joy',-2); add('kind',-1);
      if(Z.ph==='pro'&&M.flash>=8&&chance(.4)){ log('你花在派對和購物的時間越來越多，教練說你的狀態下滑了。','big'); for(const k of SKILL)abAdd(k,-.6); } } }
  if(id==='pitch'||id==='kids'||id==='charity')M.give=(M.give||0)+price; }
function shopUI(){ const M=Z.m, el=document.createElement('div'); el.className='ask shop'; root.appendChild(el); Z.ask={shop:1}; const wasP=Z.pause; Z.pause=true; hud();
  const draw=()=>{ el.innerHTML=`<div class="bx"><h3>花錢 <small>存款 ${fm(M.bank)}・依${Z.b.c.n}的物價</small></h3>${SHOP.map(([k,n,L])=>{ const ok=L.filter(x=>!x[4]||x[4](Z)); if(!ok.length)return ''; return `<p class="sc">${n}</p><div class="sg">${ok.map(x=>{ const pr=shopPrice(x[2]), c=(M.buy||{})[x[0]]||0; return `<button data-b="${x[0]}" ${M.bank<pr?'disabled':''}><b>${x[1]}</b><small>${fm(pr)}${c?`・買過 ${c} 次`:''}</small></button>`; }).join('')}</div>`; }).join('')}<button class="main" id="sh-close">完成</button></div>`;
    el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{ buy(b.dataset.b); panels(); draw(); }); el.querySelector('#sh-close').onclick=()=>{ el.remove(); Z.ask=null; Z.pause=wasP; hud(); panels(); }; };
  draw(); }
/* 自動抉擇時:依個性與生活方式自動花錢 */
function autoSpend(a){ const M=Z.m, T=Z.tr||{}; if(!Z.auto||!M||a<18||M.bank<=0)return; if(!chance(M.life==='lavish'?.5:M.life==='comfy'?.3:M.life==='normal'?.12:.04))return;
  const want=[]; const w=(id,n)=>{ for(let i=0;i<n;i++)want.push(id); };
  if(M.life==='lavish'||M.life==='comfy'){ w('watch',2); w('bag',1); w('car',2); w('yacht',1); w('jet',1); w('dinner',2); w('trip',2); }
  w('trip',1); w('dinner',1); if((T.kind||50)>=60){ w('charity',2); w('kids',1); w('pitch',1); } if((Z.st.fam||50)>=60){ w('ftrip',2); w('ppl',1); w('edu',1); } if((T.disc||50)>=60){ w('check',1); w('nutri',1); w('trainer',1); w('camp',1); }
  const id=pick(want); let it=null; for(const [,,L] of SHOP)for(const x of L)if(x[0]===id)it=x; if(!it||(it[4]&&!it[4](Z)))return; if(shopPrice(it[2])>M.bank*(M.life==='lavish'?.6:.25))return; buy(id,true); }

/* ---------- 今年的目標(參考 80億分之一的參選準備)：一年只能選一個，花一年準備，隔年揭曉 ---------- */
const lowPar=()=>{ const H=homeLg(Z.b.c).filter(k=>lgT(k)!=='a'); return Math.min(...(H.length?H:[null]).map(k=>lgOf(k).par)); }; /* 最低一級「非業餘」聯賽 */
const GOALS=[
 {id:'exam',n:'準備升學考試',c:a=>a>=14&&a<=17,d:()=>'學業大幅進步，隔年考試揭曉',cost:()=>0},
 {id:'ycamp',n:'參加足球夏令營',c:a=>a>=9&&a<=17&&Z.stage>=1,cd:2,d:()=>'球感進步，有機會被球探看見・每 2 年才能選一次',cost:()=>ib()*.03},
 {id:'tryout',n:'參加公開試訓',c:a=>Z.ph==='amateur'&&a>=18&&a<=24&&Z.stage>=2,lim:3,d:()=>`能力夠的話，隔年可能拿到職業合約・最多 3 次`,cost:()=>ib()*.05},
 {id:'coachlic',n:'準備教練證照',c:a=>a>=22&&((Z.ph==='amateur'&&!Z.amCoach)||(Z.ph==='retired'&&Z.post&&Z.post!=='coach')),lim:1,d:()=>'隔年開始執教',cost:()=>ib()*.3},
 {id:'brand',n:'經營個人品牌',c:a=>Z.ph==='pro',cd:3,d:()=>'代言收入增加，但可能被說不專心・每 3 年才能選一次',cost:()=>0},
 {id:'fa',n:'準備參選足協主席',c:a=>Z.ph==='retired'&&a>=40&&((Z.car.caps||0)>=30||(Z.co&&(Z.co.maxLv||0)>=2)||(Z.car.troph||[]).length>=5)&&!(Z.ad&&Z.ad.max>=2)&&!(Z.ad&&Z.ad.ban),lim:3,cd:4,d:()=>'隔年出現選舉・最多參選 3 次、每 4 年一次',cost:()=>HB()*.2},
 {id:'buyclub',n:'籌備買球隊',c:a=>a>=28&&!Z.own&&!!Z.m&&Z.m.bank>=HB()*1.5,d:()=>'隔年出現收購或入股的機會',cost:()=>0},
 {id:'hcamp',n:'回家鄉辦足球營',c:a=>a>=20&&Z.stage>=1,cd:2,d:()=>'家鄉的孩子會記得你，也可能發掘新人・每 2 年才能選一次',cost:()=>ib()*.1},
 {id:'study',n:'進修',c:a=>a>=18&&a<=70,cd:3,d:()=>'學業提升，工作和退休後的出路變多・每 3 年才能選一次',cost:()=>ib()*.2}];
const goalOK=(g,a)=>{ const G=Z.gc||{}, L=Z.gl||{}; return g.c(a)&&!(g.lim&&(G[g.id]||0)>=g.lim)&&!(g.cd&&L[g.id]!=null&&a-L[g.id]<g.cd); };
function goalYear(a){ const g0=Z.goal; Z.goal=null; if(!g0)return; const g=GOALS.find(x=>x.id===g0); if(!g)return; const M=Z.m, cost=g.cost(); if(M&&cost)M.bank-=cost;
  (Z.gc=Z.gc||{})[g.id]=(Z.gc[g.id]||0)+1; (Z.gl=Z.gl||{})[g.id]=a; const tag=t=>{ log(t,'star'); Object.assign(Z.log[0],{k:'ch',ti:`今年的目標：${g.n}`,t:t.replace(/<[^>]+>/g,''),fx:cost?[['存款',-cost,1]]:[]}); };
  if(g.id==='exam'){ add('edu',8); tag(Z.st.edu>=55?'你考上了理想的學校。':'考試結果普通，但你盡力了。'); }
  else if(g.id==='ycamp'){ add('ball',2); tag('夏令營的教練說你進步很快。'); if(Z.stage===3&&a>=13&&chance(.25))ask('scout'); else if(Z.stage===2&&Z.st.ball>=42&&chance(.2)){ Z.stage=3; log(`你被選進${Z.b.city.replace(/鄉下|村落|小鎮/,'')}地區代表隊。`,'star'); } }
  else if(g.id==='tryout'){ if(ovr()>=lowPar()-2&&chance(.55)){ const of=genOffers(ovr(),lowPar(),1).map(x=>mkOffer(x,'free')); if(of.length){ tag('公開試訓結束，有一支球隊打電話給你。'); Z.offers=of; ask('late'); return; } } tag('公開試訓沒有通過，教練說你還差一點。'); add('joy',-3); add('resi',1); }
  else if(g.id==='coachlic'){ if(Z.ph==='retired'){ Z.post='coach'; } else Z.amCoach=1; tag('你拿到了教練證照。'); add('disc',1); }
  else if(g.id==='brand'){ const gain=Math.round(Math.max(5,(M&&M.sal||20)*.15*((Z.car.caps||0)>0?1.5:1)*(.5+famePts()/50))); if(M){ M.bank+=gain; M.earn+=gain; } tag(`你經營社群、接了好幾支代言，多賺了 ${fm(gain)}。`); if(chance(.3)){ log('有球迷說你最近花太多時間在拍廣告，比賽反而不專心。','big'); add('team',-1); } }
  else if(g.id==='fa'){ if(!Z.ad)Z.ad={lv:1,y:a,max:1}; Z.ad.lv=Math.max(1,Z.ad.lv); tag('你準備了一年，正式宣布參選足協主席。'); ask('adelect'); }
  else if(g.id==='buyclub'){ tag('你找好了律師和會計師，開始物色球隊。'); Z.mq=M&&M.bank>=HB()*40?'club':'share'; if(Z.mq==='share'&&M.bank<HB()*1.5){ log('最後資金不夠，計畫先擱置。'); return; } ask('mch'); }
  else if(g.id==='hcamp'){ add('kind',3); add('joy',3); add('fam',2); tag(`你回到${Z.b.city.replace(/鄉下|村落|小鎮/,'')}辦了一週的足球營，來了上百個孩子。`); if(chance(.15)){ log('你在足球營發現一個很有天分的孩子，把他推薦給職業球隊。','star'); add('joy',3); } }
  else if(g.id==='study'){ add('edu',6); tag('你完成了進修課程。'); if(Z.ph==='amateur'&&Z.job&&Z.st.edu>=60&&!JOB_AD[2].includes(Z.job)&&chance(.4)){ Z.job=pick(JOB_AD[2]); log(`你換了一份新工作，成為${Z.job}。`,'star'); } } }
function goalPanel(a){ const el=$('z-goal'); if(!el)return; const L=GOALS.filter(g=>goalOK(g,a)); if(!L.length){ el.innerHTML=''; return; } const cur=GOALS.find(g=>g.id===Z.goal);
  el.innerHTML=`<p class="gl">今年的目標 <small>一年只能選一個，隔年揭曉</small></p><div class="fo gs">${L.map(g=>`<button data-g="${g.id}" class="${Z.goal===g.id?'on':''}">${g.n}</button>`).join('')}${Z.goal?'<button data-g="" class="off">不設定</button>':''}</div>
   <div class="gd">${cur?`${cur.d()}${cur.cost()>=.05?`・花費 ${fm(cur.cost())}`:''}${cur.lim?`・已挑戰 ${(Z.gc||{})[cur.id]||0}／${cur.lim} 次`:''}`:'選一個目標，花一年準備。'}</div>`;
  el.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ Z.goal=b.dataset.g||null; goalPanel(a); }); }
/* 自動抉擇時:依個性挑一個目標 */
function autoGoal(a){ if(!Z.auto||Z.goal||!chance(.35))return; const L=GOALS.filter(g=>goalOK(g,a)); if(!L.length)return; Z.goal=pick(L).id; }

/* ================= 球迷與名氣、傷病與復健、關鍵比賽文字直播 ================= */
/* ---- 名氣(Z.st.fame 0–100) ---- */
const famePts=()=>Z.st.fame||0;
function fameSeason(a,row,lg){ const v=(row.role==='主力'?2.2:row.role==='輪替'?1:.3)*clamp((lg.par-20)/30,.2,1.4)+(row.rt-6.6)*2+(Z.car.caps?1:0); add('fame',v);
  if(chance(.32)){ const f=famePts(), me=Z.me, cl=Z.car.club;
    const t=row.rt<6.2&&chance(.5)?pick([`${cl}的主場有人噓你，你低著頭走下場。`,'網路上有球迷要求教練把你換下來。']):f>=75?pick([`看台上掛著一面巨大的布條：「${me}，我們的英雄」。`,`有球迷把你的臉刺在手臂上，照片傳遍了網路。`,`你的球衣是${cl}今年賣得最好的一件。`,`客場比賽結束後，對手的球迷也起立為你鼓掌。`]):f>=45?pick([`你的球衣在${cl}的球迷商店賣到缺貨。`,'球迷在訓練場外等你簽名，你簽到天黑。','有一群球迷成立了你的後援會。']):pick(['主場有幾個小朋友舉著寫你名字的紙板。','一個小球迷在場邊要了你的球衣。','你第一次在街上被球迷認出來。']);
    log(t); if(/噓|換下來/.test(t))add('joy',-2); else add('joy',1); } }
function fameYear(a){ if(Z.ph==='retired'&&a>=40)add('fame',-.6); else if(Z.ph==='amateur')add('fame',-.3); }
/* ---- 傷病與復健 ---- */
const INJ=[['腳踝扭傷',3,1,'',.3],['腿後肌拉傷',5,1,'pac',.28,'腿後肌拉傷是職業足球最常見的傷病之一。'],['腦震盪',3,1,'',.08,'現在很多聯賽規定，疑似腦震盪的球員必須立刻下場檢查。'],['腳掌骨折',10,2,'',.12],['半月板撕裂',12,2,'pac',.1],['十字韌帶斷裂',36,3,'pac',.08,'十字韌帶重建後，職業球員通常要 6 到 9 個月以上才能回到比賽。'],['阿基里斯腱斷裂',40,3,'pac',.04,'阿基里斯腱斷裂是對球員影響最大的傷病之一，很多人回來後速度大不如前。']];
function injRoll(a){ const p=.12+(a>30?.05:0)+(Z.oldInj||0); if(!chance(p))return null; const w=INJ.reduce((s,x)=>s+x[4],0); let r=R()*w, it=INJ[0]; for(const x of INJ){ r-=x[4]; if(r<0){ it=x; break; } }
  const wk=Math.max(1,Math.round(it[1]*(.7+R()*.6))); return {n:it[0],wk,sev:it[2],ab:it[3],f:it[5]}; }
function injApply(a,J){ if(!J)return; log(`你在比賽中${J.n}，${J.wk>=20?`整整休息了 ${Math.round(J.wk/4)} 個月`:`缺陣了 ${J.wk} 週`}。`,'big'); if(J.f)fact(J.f); add('hp',-J.sev*4); add('joy',-J.sev*2);
  if(J.ab)abAdd(J.ab,-J.sev*1.2); if(J.sev>=3){ Z.injQ=J; ask('injury'); } else if(J.sev===2)Z.oldInj=Math.min(.12,(Z.oldInj||0)+.01); }
/* ---- 關鍵比賽文字直播 ---- */
function oppTeam(lg){ const T=teamsOf(lg).filter(x=>x!==Z.car.club); return T.length?pick(T):'對手'; }
function liveCard(title,opp,win,o){ o=o||{}; const me=Z.me, gk=Z.pos==='GK', my=o.side||Z.car.club||'我們', L=[]; let a=0,b=0;
  const goalsW=win?1+Math.floor(R()*3):Math.floor(R()*2), goalsL=win?Math.floor(R()*goalsW):goalsW+1+Math.floor(R()*2), pk=o.pk&&chance(.35);
  const mins=[...Array(goalsW+goalsL)].map(()=>3+Math.floor(R()*86)).sort((x,y)=>x-y); let ws=goalsW, ls=goalsL; const draw=pk?Math.min(goalsW,goalsL):null;
  let A=pk?draw:goalsW, B=pk?draw:goalsL; const seq=[]; while(A>0||B>0){ if(A>0&&(B===0||chance(.5))){ seq.push('w'); A--; } else { seq.push('l'); B--; } }
  L.push(`開賽前，${my}的球迷把看台染成一片。`);
  seq.forEach((s,i)=>{ const m=mins[i]||(10+i*12); if(s==='w'){ a++; L.push(gk?`${m}' ${my}進球了！你在後場高舉雙手。比分 ${a}:${b}`:pick([`${m}' 你接到傳中，頭球破門！比分 ${a}:${b}`,`${m}' 你在禁區外一腳遠射，球直掛死角！比分 ${a}:${b}`,`${m}' 你送出一記直塞，隊友推射得分！比分 ${a}:${b}`,`${m}' 隊友頭球攻門得手！比分 ${a}:${b}`])); }
    else { b++; L.push(gk?pick([`${m}' 對手近距離射門，你撲到了球，但還是滾進了球門。比分 ${a}:${b}`,`${m}' ${opp}打出一次快速反擊，破門得分。比分 ${a}:${b}`]):`${m}' ${opp}扳回一城。比分 ${a}:${b}`); } });
  if(gk&&chance(.7))L.splice(1+Math.floor(R()*(L.length-1)),0,`${30+Math.floor(R()*50)}' 你飛身撲出一記必進球！看台上一片驚呼。`);
  if(chance(.25))L.splice(1+Math.floor(R()*(L.length-1)),0,`${40+Math.floor(R()*40)}' 主審看了 VAR，取消了一個進球。`);
  if(pk){ L.push(`90+${2+Math.floor(R()*4)}' 終場哨響，${a}:${b}，比賽進入點球大戰。`); }
  else L.push(win?`終場哨響！${my} ${a}:${b} 贏下比賽。`:`終場哨響，${my} ${a}:${b} 輸了。`);
  log('','live'); Z.log[0].lv={title,opp,my,L,win,pk,res:pk?null:`${a}:${b}`};
  if(pk&&!gk){ Z.pkQ=0; ask('pk'); } else if(pk){ Z.log[0].lv.L.push(win?'點球大戰你撲出了兩球，'+my+'贏了！':'點球大戰你只撲出一球，'+my+'輸了。'); } }
function liveHTML(lv){ return `<div class="live"><div class="lvh"><span class="lvl">LIVE</span><b>${lv.title}</b><small>${lv.my} vs ${lv.opp}</small></div><ol>${lv.L.map((t,i)=>`<li style="animation-delay:${i*.35}s">${t}</li>`).join('')}</ol></div>`; }

const pickNat=()=>{ const L=Object.entries(FL.NATS||{}).filter(([k])=>k!==Z.b.c.k); return L.length?pick(L)[1].n:'對手'; };
const pickElite=()=>{ const k=pick(ELITE()), T=teamsOf(lgOf(k)).slice(0,6).filter(x=>x!==Z.car.club); return T.length?pick(T):'對手'; };
/* ================= 歷代球星比較：里程碑、世界紀錄、同國球星、自己的歷代人生 ================= */
/* 只用確定的歷史紀錄，不替真實球員編數字 */
const MS=[
 ['g',100,'你的職業生涯進球來到 100 球。','能在職業生涯進 100 球的球員，在所有職業球員裡只是少數。'],
 ['g',200,'職業生涯第 200 球！',''],
 ['g',300,'職業生涯第 300 球，你已經是同世代最會進球的人之一。',''],
 ['g',500,'職業生涯第 500 球。足球史上能做到的人寥寥可數。','職業生涯正式比賽進球超過 500 球的球員，在足球史上只有極少數幾位。'],
 ['apps',300,'你的職業生涯出場來到 300 場。',''],
 ['apps',500,'職業生涯第 500 場出賽。',''],
 ['apps',700,'職業生涯第 700 場出賽，很少有人能踢這麼久。',''],
 ['cs',100,'職業生涯第 100 場零封。',''],
 ['caps',50,'你為國家隊出賽滿 50 場。',''],
 ['caps',100,'國家隊第 100 場！你加入了國家隊的「百場俱樂部」。','國家隊出賽滿 100 場的球員，會被國際足總列入「百場俱樂部」。'],
 ['caps',150,'國家隊第 150 場出賽。',''],
 ['ig',50,'你的國家隊進球來到 50 球。',''],
 ['ig',100,'國家隊第 100 球！','在男子足球史上，國家隊進球破百的球員只有極少數。']];
function msCheck(){ const C2=Z.car, D=Z.ms=Z.ms||{}; for(const [k,n,t,f] of MS){ const id=k+n; if(D[id]||(C2[k]||0)<n)continue; D[id]=1; log(t,'star'); if(f)fact(f); add('fame',k==='caps'||k==='ig'?3:2); }
  if(!D.rec&&!isW()&&(C2.ig||0)>109){ D.rec=1; log('你的國家隊進球超過了伊朗傳奇代伊的 109 球。','star'); fact('代伊的 109 個國家隊進球，曾經保持男子足球的世界紀錄超過 15 年。'); add('fame',8); }
  if(!D.rec&&isW()&&(C2.ig||0)>190){ D.rec=1; log('你的國家隊進球超過了加拿大傳奇辛克萊的 190 球，這是國際足球史上的最高紀錄。','star'); fact('辛克萊的 190 個國家隊進球，是男女足球裡最多的國家隊進球紀錄。'); add('fame',12); } }
/* 結局頁：歷代比較 */
function cmpHTML(){ const C2=Z.car, c=Z.b.c, W0=isW(), out=[], gk=Z.pos==='GK';
  const bdo=(C2.aw||[]).filter(x=>/金球獎 \d/.test(x)).length, wcw=(C2.troph||[]).filter(x=>/世界盃冠軍/.test(x)).length+(C2.wc||[]).filter(x=>/冠軍/.test(x)).length;
  /* 世界紀錄 */
  const R0=[];
  if(bdo>=2)R0.push(bdo>8?`你拿了 ${bdo} 座金球獎，超過梅西的 8 座，這是金球獎史上最多。`:bdo===8?'你拿了 8 座金球獎，追平梅西的歷史紀錄。':`你拿了 ${bdo} 座金球獎。${W0?'':'史上最多的是梅西的 8 座。'}`);
  else if(bdo===1)R0.push('你拿過金球獎，這是一名球員能得到的最高個人榮譽。');
  if(wcw)R0.push(`你為${c.n}捧起了${W0?'女足':''}世界盃，${W0?'':'從 1930 年到現在，拿過男子世界盃的國家一隻手數得完。'}`.replace(/，$/,'。'));
  if(C2.caps>=100)R0.push(`國家隊出賽 ${C2.caps} 場，是國際足總「百場俱樂部」的一員。`);
  if(!W0&&C2.ig>109)R0.push(`國家隊進球 ${C2.ig} 球，超過伊朗代伊的 109 球。`);
  if(W0&&C2.ig>190)R0.push(`國家隊進球 ${C2.ig} 球，超過加拿大辛克萊的 190 球。`);
  if(R0.length)out.push(`<p class="cmh">和世界紀錄比</p>${R0.map(t=>`<div class="cmr">🏆 ${t}</div>`).join('')}`);
  /* 同國球星並列（只列名字與代表球隊，不編數字） */
  const S=((window.WORLD||{}).STARS||{})[c.k]||[];
  if(S.length){ const me=`<div class="cms me"><b>${esc(Z.me)}</b><small>${POS_N()}・${Z.year} 年生・${mainClub()||C2.club||'—'}</small><em>${C2.hist.length?`${C2.apps} 場${gk?`・零封 ${C2.cs||0}`:`・${C2.g} 球`}${C2.caps?`・國家隊 ${C2.caps} 場`:''}`:'沒有踢上職業'}</em></div>`;
    out.push(`<p class="cmh">${flag(c.k)} 同樣出身${c.n}的${W0?'足球名人':'球星'}</p>${S.slice(0,3).map(([n,p,y,t])=>`<div class="cms"><b>${n}</b><small>${p}・${y} 年生・${t}</small></div>`).join('')}${me}`); }
  /* 自己的歷代人生 */
  try{ const L=JSON.parse(localStorage.getItem('ml-lives')||'[]').filter(x=>!x.demo); const cur=L.find(x=>x.id===Z.lsid);
    if(cur&&L.length>=3){ const rk=(arr,f)=>1+arr.filter(x=>(f(x)||0)>(f(cur)||0)).length, R2=[];
      const same=L.filter(x=>x.k===cur.k);
      if(cur.g>0){ const r=rk(L,x=>x.g); if(r<=3)R2.push(`這一生的 ${cur.g} 個進球，在你走過的 ${L.length} 段人生裡排第 ${r}。`); }
      if(cur.caps>0){ const r=rk(L,x=>x.caps); if(r<=3)R2.push(`國家隊出賽 ${cur.caps} 場，在你的 ${L.length} 段人生裡排第 ${r}。`); }
      if(cur.troph>0){ const r=rk(L,x=>x.troph); if(r<=3)R2.push(`${cur.troph} 座冠軍，在你的 ${L.length} 段人生裡排第 ${r}。`); }
      if(same.length>=2){ const r=rk(same,x=>(x.apps||0)+(x.caps||0)*3+(x.troph||0)*20); R2.push(r===1?`在你出生在${c.n}的 ${same.length} 段人生裡，這是走得最遠的一次。`:`你在${c.n}出生過 ${same.length} 次，這一次排第 ${r}。`); }
      else R2.push(`這是你第一次出生在${c.n}。`);
      if(R2.length)out.push(`<p class="cmh">和你自己的歷代人生比</p>${R2.map(t=>`<div class="cmr">📒 ${t}</div>`).join('')}`); } }catch(e){}
  return out.length?`<div class="ec cmp"><h4>歷代比較</h4>${out.join('')}</div>`:''; }
const POS_N=()=>({FW:'前鋒',MF:'中場',DF:'後衛',GK:'門將'})[Z.pos]||'球員';

function ask(k){ if(Z.pending.some(p=>p===k))return; Z.pending.push(k); }
/* ---------- 版面 ---------- */
/* 樣式在 css/play.css(球員貼紙冊風格) */

let root=null, raf=0, prev=0, lastA=-1;
/* ---------- 預覽:產生 6 段不同類型的範例人生，存進過往人生 ---------- */
async function demoLives(el){ const SP=[
  {t:'巴西球星',c:'BR',s:'m',tal:.97,ok:Z=>Z.car.fullPro&&Z.car.troph.length>=3},
  {t:'美國女足職業球員',c:'US',s:'f',tal:.9,ok:Z=>Z.car.fullPro},
  {t:'日本業餘出身的教練',c:'JP',tal:.3,coach:1,ok:Z=>!Z.car.fullPro&&!!Z.co&&(Z.co.maxLv||0)>=1},
  {t:'台灣沒踢上全職業的球員',c:'TW',tal:.55,ok:Z=>Z.stage>=2&&!Z.car.fullPro},
  {t:'奈及利亞出國踢球的球員',c:'NG',s:'m',tal:.85,ok:Z=>Z.car.fullPro&&!!Z.car.abroad},
  {t:'一輩子沒踢過足球的人',c:'IN',ok:Z=>Z.stage===0}];
  window.ML_DEMO_RUN=1; let n=0;
  for(const sp of SP){ window.ML_FORCE_C=sp.c; window.ML_FORCE_S=sp.s||null; let got=false;
    for(let k=0;k<120&&!got;k++){ newLife(); Z.pause=true; Z.birth=false; if(sp.tal!=null){ Z.talent=sp.tal; if(sp.tal>=.8)for(const q in Z.pot)Z.pot[q]=Math.max(Z.pot[q],60+Math.round(sp.tal*12)); }
      let g=0; while(!Z.done&&g++<130){ Z.t=Math.floor(Z.t)+1; yearEnd(); while(Z.pending.length){ const q=Z.pending[0]; if(q==='dead')break; Z.pending.shift(); const A=ASK[q](); if(A.end)break; let j=Math.max(0,A.o.findIndex(o=>o.main)); if(sp.coach&&(A.t==='教練證照'||A.t==='戰術分析'))j=0; A.o[j].f(); } }
      if(sp.ok(Z)){ got=true; Z.demo=1; window.ML_DEMO_RUN=0; saveLife(); window.ML_DEMO_RUN=1; n++; }
      if(k%4===3){ el.textContent=`正在產生範例人生：${sp.t}（${n}/${SP.length}）…`; await new Promise(r=>setTimeout(r,0)); } } }
  window.ML_DEMO_RUN=0; window.ML_FORCE_C=null; window.ML_FORCE_S=null; return n; }
function open(){ if(new URLSearchParams(location.search).get('demo')){ const el=document.createElement('div'); el.style.cssText='position:fixed;inset:0;display:grid;place-items:center;background:#f4f8fb;font:700 18px sans-serif;color:#12233a;z-index:99'; el.textContent='正在產生範例人生…'; document.body.appendChild(el);
    demoLives(el).then(()=>{ location.href='index.html#mine'; }); return; } if(!root){ root=document.createElement('div'); root.id='zero'; document.body.appendChild(root); } root.style.display='block'; document.body.style.overflow='hidden'; const rv=new URLSearchParams(location.search).get('review'); if(rv)review(rv); else start(); }
function close(){ location.href='index.html'; }
function start(){ newLife(); Z.birth=true; lastA=-1; build(); birthUI(); prev=0; cancelAnimationFrame(raf); raf=requestAnimationFrame(loop); }
const SPEEDS=[1,2,4,8,16];
function build(){
  root.innerHTML=`<div class="zt"><a class="lg" href="index.html">我的足球人生</a><span class="age" id="z-age">0<small>歲</small></span><div class="dt"><div id="z-dt"></div><div class="bar"><i id="z-bar"></i></div></div>
   <div class="sp"><button id="z-pause">暫停</button>${SPEEDS.map(s=>`<button data-s="${s}">${s}×</button>`).join('')}<button id="z-ff">快轉到下一個抉擇 »</button><button id="z-auto">自動抉擇</button><button id="z-x">離開</button></div></div>
   <div class="zg"><div><div class="zc reg" id="z-reg"></div><div class="zc" id="z-abc"><h4>能力 <small id="z-ovr" style="color:var(--mute);font-weight:400;font-size:12px"></small><button type="button" class="tg" data-tg="z-abc">雷達圖</button></h4><div id="z-radar"></div></div><div class="zc" id="z-stc"><h4>生活</h4><div class="stt" id="z-st"></div></div><div class="zc" id="z-trc"><h4>性格 <small style="color:var(--mute);font-weight:400;font-size:12px">抉擇會改變性格，性格也影響成長</small></h4><div class="stt trt" id="z-tr"></div></div></div>
   <div><div class="scene"><canvas id="z-cv" width="320" height="100"></canvas><div class="who" id="z-who"></div></div><div class="loc" id="z-loc"></div>
    <div class="zc" id="z-foc"><h4>今年的重心</h4><div class="fo" id="z-fo"></div><div id="z-fod" style="font-size:12.5px;color:var(--mute);margin-top:8px"></div><div id="z-goal"></div></div><div class="zc" id="z-mon" style="display:none"></div>
    <div class="zc" id="z-logc"><h4>人生紀錄 <small style="color:var(--mute);font-weight:400;font-size:12px">最新的在上面</small></h4><div class="lgx" id="z-log"></div></div></div>
   <div><div class="zc fam" id="z-fam"></div><div class="zc pr" id="z-pr"></div><div class="zc pr" id="z-car" style="display:none"></div><div class="zc" id="z-mapc"><h4>人生地圖 <small style="color:var(--mute);font-weight:400;font-size:12px">一格＝一年・顏色＝快樂・★＝足球里程碑</small></h4><div class="map" id="z-map"></div></div><div class="zc" id="z-ach"></div></div></div>`;
  $('z-pause').onclick=()=>{ Z.pause=!Z.pause; hud(); };
  root.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ Z.speed=+b.dataset.s; Z.ff=false; hud(); });
  $('z-ff').onclick=()=>{ Z.ff=!Z.ff; hud(); };
  $('z-auto').onclick=()=>{ Z.auto=!Z.auto; hud(); };
  $('z-x').onclick=close;
  root.addEventListener('click',e=>{ const b=e.target.closest('[data-tg]'); if(!b)return; const c=document.getElementById(b.dataset.tg); if(c)c.classList.toggle('open'); });
  hud(); panels();
}
function hud(){ $('z-pause').textContent=Z.pause?'繼續':'暫停'; root.querySelectorAll('[data-s]').forEach(b=>b.classList.toggle('on',!Z.ff&&+b.dataset.s===Z.speed)); $('z-ff').classList.toggle('on',Z.ff); $('z-auto').classList.toggle('on',Z.auto); }
const flag=k=>{ try{ const f=FL.flagSVG&&FL.flagSVG(k); if(f)return f; }catch(e){} return `<span style="font:700 10px/1 sans-serif;border:1px solid var(--line);border-radius:3px;padding:1px 3px;color:var(--mute)">${k}</span>`; };
const sprite=(name,look,shirt,h)=>{ const kit=Z&&name===Z.me&&look===Z.look?curKit():{p:shirt,shorts:'#2a3354',socks:'#e9edf6',trim:shirt,txt:shirt,pat:'-'}; let svg=''; try{ svg=pixelFF(kit,name,1,'N',Z.b.c.lk,look); }catch(e){ return ''; } svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" '); return `<img alt="" style="height:${h}px" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`; };
const SHIRT=['#5b8def','#e0675b','#59b37a','#d9a441','#9b6bd6','#4fb3bf'];
/* 足球人生的能力雷達:實線＝目前；進地區隊後教練看得出潛力(虛線) */
function radar(){ const n=AB.length, R0=58, pt=(i,v)=>{ const an=-Math.PI/2+i*2*Math.PI/n, r=R0*Math.max(0,v)/80; return (Math.cos(an)*r).toFixed(1)+','+(Math.sin(an)*r).toFixed(1); }, L=FL.ABL||{};
  let g=[20,40,60,80].map(v=>`<polygon points="${AB.map((_,i)=>pt(i,v)).join(' ')}" fill="none" stroke="#dde7f0" stroke-width=".8"/>`).join('');
  AB.forEach((k,i)=>{ const [x,y]=pt(i,98).split(','); g+=`<text x="${x}" y="${(+y+3).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#4a5b70">${L[k]||k}</text>`; });
  if(Z.stage>=3)g+=`<polygon points="${AB.map((k,i)=>pt(i,Z.pot[k])).join(' ')}" fill="none" stroke="#12233a" stroke-opacity=".35" stroke-dasharray="3 3"/>`;
  g+=`<polygon points="${AB.map((k,i)=>pt(i,Z.ab[k])).join(' ')}" fill="#1e8cff33" stroke="#1e8cff" stroke-width="1.8" stroke-linejoin="round"/>`;
  return `<svg viewBox="-84 -76 168 152" style="width:100%;max-width:260px;display:block;margin:0 auto" aria-label="能力雷達">${g}</svg><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px 10px;font-size:12px;margin-top:4px">${AB.map(k=>`<span style="display:flex;justify-content:space-between"><span style="color:var(--mute)">${L[k]||k}</span><b>${Math.round(Z.ab[k])}</b></span>`).join('')}</div>${Z.stage>=3?'<div style="font-size:11.5px;color:var(--mute);margin-top:6px">虛線＝教練看出的潛力</div>':''}`; }
function focusList(a){ if(Z.ph==='pro')return [['ball','加練'],['family','陪家人'],['rest','保養身體'],['study','進修']];
  if(a>=18)return [['work','工作'],['family','陪家人'],['play','踢球、玩樂'],['rest','保養身體'],['study','進修']];
  return FOCUS.filter(([k])=>k!=='work'||a>=13); }
function panels(){ useKeys();
  const a=Math.floor(Z.t), c=Z.b.c, st=Z.st, born=`${Z.year} 年 ${Z.month} 月`;
  const kid=a<3?'':sprite(Z.me,Z.look,SHIRT[Z.seed%6],Math.round(30+Math.min(a,18)*2.6));
  $('z-reg').innerHTML=`<div class="hd"><span>球員登入卡</span><span>${Z.b.c.k}・${Z.year}</span></div><div class="pf"><div class="ph">${a<3?babyImg(70):kid.replace(/height:\d+px/,'height:84px')}</div><div><div class="nm">${esc(Z.me)}</div>
   <div class="kv"><b>性別</b><span>${Z.sex==='m'?'男':'女'}</span><b>出生</b><span>${flag(c.k)} ${c.n}・${born}</span><b>住在</b><span>${Z.b.city}</span><b>家境</b><span>${'●'.repeat(Z.b.q)}${'○'.repeat(5-Z.b.q)}</span><b>${a>=18?'身分':'學業'}</b><span>${a>=18?(Z.ph==='pro'?'職業球員':Z.ph==='retired'?'退休球員'+(Z.post?'・'+{coach:'教練',agent:'經紀人',pundit:'球評',academy:'足球學校校長',home:'回到家鄉'}[Z.post]:''):(Z.job||'大學生／找工作中')):a<6?'學齡前':a<12?'小學':a<15?'國中':'高中年紀'}</span></div></div></div>
   <div class="club">球籍：${Z.club?`<span>${esc(Z.club)}</span>`:'尚未登錄任何球隊'}・足球：${STAGE[Z.stage]}</div>`;
  const bars=[['健康','hp','#2fa866'],['快樂','joy','#ffc400'],['學業','edu','#1e8cff'],['家人','fam','#ff7a45'],['名氣','fame','#9b6bd6']];
  $('z-radar').innerHTML=radar(); $('z-ovr').textContent=`綜合 ${ovr()}${Z.pos?'・'+{GK:'門將',DF:'後衛',MF:'中場',FW:'前鋒'}[Z.pos]:''}`;
  $('z-st').innerHTML=bars.map(([n,k,col])=>`<span>${n}</span><i><b style="width:${st[k]||0}%;background:${col}"></b></i><span style="text-align:right">${Math.round(st[k]||0)}</span>`).join('');
  if(Z.tr&&window.CHO)$('z-tr').innerHTML=Object.entries(window.CHO.TR).map(([k,n])=>`<span>${n}</span><i><b style="width:${Z.tr[k]}%"></b></i><span style="text-align:right">${Z.tr[k]}</span>`).join('');
  { const M=Z.m, el=$('z-mon'); if(M){ el.style.display='';
    el.innerHTML=`<h4>財務 <select class="cur" id="z-cur">${Object.keys(CUR_NAME).map(k=>`<option value="${k}"${k===CUR?' selected':''}>${CUR_NAME[k]}</option>`).join('')}</select></h4><div class="mon"><div><small>存款</small><b class="${M.bank<0?'neg':''}">${fm(M.bank)}</b></div><div><small>去年收入</small><b>${fm(M.inY)}</b></div><div><small>去年開銷</small><b>${fm(M.outY)}</b></div><div><small>${Z.ph==='pro'?'年薪':'一生收入'}</small><b>${Z.ph==='pro'?fm(M.sal):fm(M.earn)}</b></div></div>`
     +(a>=15?'<button type="button" class="shopb" id="z-shop">🛍️ 花錢</button>':'')+(a>=18?`<p class="ml">生活方式</p><div class="fo">${Object.entries(LIFE).map(([k,v])=>`<button data-life="${k}" class="${M.life===k?'on':''}">${v[0]}</button>`).join('')}</div><p class="md">${LIFE[M.life][4]}</p><p class="ml">理財</p><div class="fo">${Object.entries(INV).map(([k,v])=>`<button data-inv="${k}" class="${M.inv===k?'on':''}">${v[0]}</button>`).join('')}</div><p class="md">${INV[M.inv][3]}${M.retY&&M.bank>0?`・去年${M.retY>0?'賺了':'虧了'} ${fm(Math.abs(M.retY))}`:''}</p>`:(a<13?'<p class="md">還小，錢由家裡管。13 歲起把重心放在「打工」可以存一點零用錢。</p>':'<p class="md">把重心放在「打工」可以存一點零用錢。</p>'));
    el.querySelectorAll('[data-life]').forEach(b=>b.onclick=()=>{ M.life=b.dataset.life; panels(); }); const sb=el.querySelector('#z-shop'); if(sb)sb.onclick=shopUI; const cs=el.querySelector('#z-cur'); if(cs)cs.onchange=()=>{ CUR=cs.value; try{ localStorage.setItem('ml-cur',CUR); }catch(e){} panels(); }; el.querySelectorAll('[data-inv]').forEach(b=>b.onclick=()=>{ M.inv=b.dataset.inv; panels(); }); } else el.style.display='none'; }
  { const st=achStore(), got=ACH.filter(x=>st[x[0]]).length; $('z-ach').innerHTML=`<h4>成就 <small style="color:var(--mute);font-weight:400;font-size:12px">這一生 ${(Z.ach||[]).length}・收藏 ${got}／${ACH.length}</small><button type="button" class="tg" data-tg="z-ach">全部收藏</button></h4>${(Z.ach||[]).length?'':'<p class="achn">這一生還沒有解鎖成就。</p>'}<div class="achs">${ACH.map(([id,n,d])=>`<i class="${(Z.ach||[]).includes(id)?'on':st[id]?'old':''}" title="${n}：${d}">${n}</i>`).join('')}</div>`; }
  $('z-loc').textContent=`${c.n}${Z.b.city}・${Z.home}${Z.sibs?`・家裡 ${Z.sibs+1} 個孩子`:''}`;
  const can=a>=6, FL2=focusList(a); if(!FL2.some(x=>x[0]===Z.focus))Z.focus=FL2[0][0]; $('z-fo').innerHTML=FL2.map(([k,n])=>`<button data-f="${k}" class="${Z.focus===k&&can?'on':''}" ${can?'':'disabled'}>${n}</button>`).join('');
  $('z-fod').textContent=a<6?'還是個孩子，正在長大。六歲起可以選每年的重心（之後隨時可以換）。':{ball:Z.stage?'把時間花在球場上，球感進步、功課會退步一點。':'想踢球，但還沒有機會碰到足球……',study:'專心念書，學業進步。',family:'多陪家人，家人支持變高。',play:'玩樂休息，快樂和健康。',work:a>=18?'專心工作，生活比較寬裕。':'放學後打工，家裡比較寬裕，但功課和快樂會受影響。',rest:'好好保養身體，健康變好，退化慢一點。'}[Z.focus];
  if(Z.ph==='pro'&&Z.focus==='ball')$('z-fod').textContent='加練，能力進步得比較快（27 歲以後主要是維持）。'; if(Z.ph==='pro'&&Z.focus==='study')$('z-fod').textContent='利用空檔進修、考教練證照，退休後的路比較多。';
  goalPanel(a);
  root.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ Z.focus=b.dataset.f; log(`你把今年的重心改成「${focusList(a).find(x=>x[0]===Z.focus)[1]}」。`); panels(); });
  $('z-log').onclick=e=>{ const pa=e.target.closest('.pra'); if(pa){ const L=Z.log[+pa.dataset.li]; if(L&&L.pr&&L.pr.ans==null){ const A=L.pr.A[+pa.dataset.a]; L.pr.ans=+pa.dataset.a; for(const [k,v] of Object.entries(A[2]||{}))add(k,v); panels(); } return; } const b=e.target.closest('.psv'); if(!b)return; const L=Z.log[+b.dataset.pi]; if(!L||!L.p)return; b.disabled=true; b.textContent='產生中…'; postImage(L.p,blob=>{ b.disabled=false; b.textContent='📷 存成圖片'; saveImg(blob,`mylife-post-${Date.now()%100000}.png`,L.p.award); }); };
  $('z-log').innerHTML=Z.log.map((l,i)=>l.k==='live'&&l.lv?`<div class="lp"><em>${l.a} 歲</em><span>${liveHTML(l.lv)}</span></div>`:l.k==='press'&&l.pr?`<div class="lp"><em>${l.a} 歲</em><span>${pressHTML(l.pr,i)}</span></div>`:l.k==='post'?`<div class="lp"><em>${l.a} 歲</em><span>${postHTML(l.p,i)}</span></div>`:`<div><em>${l.a} 歲</em><span>${l.k==='ch'?`<span class="cti">${l.ti}</span><b class="cch">→ ${l.t}</b>${l.r?`<span class="crr">${l.r}</span>`:''}${l.fx&&l.fx.length?`<span class="cfx">${l.fx.map(([n,v,m])=>`<i class="${v>0?'up':'dn'}">${n} ${v>0?'+':'−'}${m?fm(Math.abs(v)):Math.abs(v)}</i>`).join('')}</span>`:''}`:`<span class="${l.k}">${l.t}</span>`}${l.d?`<small class="dt"><b>資料</b>${l.d}</small>`:''}</span></div>`).join('');
  $('z-fam').innerHTML=`<h4>家人</h4><div><span>母親</span><span>${esc(Z.mom.n)}・${Z.mom.gone!=null?`享年 ${Z.mom.a+Z.mom.gone} 歲`:`${Z.mom.a+a} 歲`}<small class="d">${Z.mom.gone!=null?'已過世':Z.mom.j}</small></span></div><div><span>父親</span><span>${esc(Z.dad.n)}・${Z.dad.gone!=null?`享年 ${Z.dad.a+Z.dad.gone} 歲`:`${Z.dad.a+a} 歲`}<small class="d">${Z.dad.gone!=null?'已過世':Z.dad.j}</small></span></div><div><span>兄弟姊妹</span><span>${Z.sibs?`${Z.sibs} 人（${Z.older?`${Z.older} 個比你大`:'都比你小'}）`:'沒有'}</span></div>`;
  { const P2={GK:'GK',DF:'DF',MF:'MF',FW:'FW'}, row=(no,pos,n,k,cn,st,me)=>`<div class="sq${me?' me':''}"><b class="no">${no}</b><i class="ps">${pos||'—'}</i><span class="nm2"><b>${esc(n)}</b><small>${flag(k)} ${cn}</small></span><span class="st2">${st}</span></div>`;
  $('z-pr').innerHTML=`<h4>${Z.year} 世代名單<small>世界各地同年生的足球少年</small></h4><div class="sqh"><span>No.</span><span>位置</span><span>球員</span><span>現況</span></div>`+row(Z.car&&Z.car.hist.length?'★':'★',Z.pos?P2[Z.pos]:'',Z.me+'（你）',Z.b.c.k,Z.b.c.n,a<3?'剛出生':Z.ph==='pro'?'職業球員':Z.ph==='retired'?'已退休':STAGE[Z.stage],1)+Z.peers.map(p=>row(p.no,a>=9?P2[p.pos]:'',p.n,p.c.k,p.c.n,a<3?'剛出生':p.quit?p.note:STAGE[p.stage])).join(''); }
  { const C2=Z.car, el=$('z-car'); if(C2.hist.length||a>=18){ el.style.display=''; const H=C2.hist.slice(-6).reverse();
    el.innerHTML=`<h4>職業生涯<button type="button" class="tg" data-tg="z-car">全部賽季</button></h4>`+(C2.hist.length?`<div><span>${Z.pos==='GK'?'出場／零封':'出場／進球／助攻'}</span><span><b>${C2.apps}</b>／${Z.pos==='GK'?(C2.cs||0):C2.g+'／'+C2.as}</span></div><div><span>國家隊</span><span>${C2.caps?`${C2.caps} 場・${C2.ig} 球`:'未入選'}</span></div>${H.map(h=>`<div><span>${h.y-1}/${String(h.y).slice(-2)}・${esc(h.club)}<small class="d" style="text-align:left">${h.lg}・${h.role}</small></span><span>${h.app} 場${Z.pos==='GK'?` 零封 ${h.cs||0}`:` ${h.g} 球`}<small class="d">評分 ${h.rt.toFixed(2)}・第 ${h.rank} 名</small></span></div>`).join('')}${[...C2.troph,...C2.aw,...C2.wc].length?`<div style="display:block"><span style="color:var(--red)">${[...C2.troph,...C2.aw,...C2.wc].join('、')}</span></div>`:''}`:`<div><span style="color:var(--mute)">${Z.ph==='amateur'?'沒有走職業，週末踢業餘。':'還沒有職業紀錄。'}</span></div>`); } }
  $('z-map').innerHTML=Array.from({length:90},(_,i)=>{ const m=Z.map[i]; const col=m?`hsl(${8+m.joy*1.25},${38+m.joy*.25}%,${80-m.joy*.38}%)`:''; /* 不快樂偏紅、快樂偏綠 */ return `<i class="${i===a?'cur':''} ${m&&m.star?'st':''}" style="${col?`background:${col}`:''}"></i>`; }).join('');
}
/* 場景:家附近(城市／鄉下)的像素背景；三歲起出現自己，國中起有球門 */
/* 場景:依人生階段換背景(童年的家、球隊主場、城市、場邊、辦公室、公園)，人物依家庭狀況與身分變化 */
function stagePhase(){ const a=Math.floor(Z.t); if(a<18)return 'home'; if(Z.co&&Z.co.team&&!Z.co.out&&(Z.ph==='retired'||Z.amCoach))return 'coach'; if(Z.ad&&!Z.ad.out&&!Z.ad.ban&&Z.ph==='retired')return 'admin'; if(Z.ph==='pro')return 'stadium'; if(Z.ph==='retired'||a>=65)return 'park'; return 'city'; }
function scene(){
  const cv=$('z-cv'); if(!cv)return; const g=cv.getContext('2d'), W=320, H=100, a=Z.t, mo=(Z.t%1), night=Math.sin(mo*Math.PI*2*6)>.55; g.imageSmoothingEnabled=false;
  const sky=g.createLinearGradient(0,0,0,H); sky.addColorStop(0,night?'#141c3a':'#5b8fd0'); sky.addColorStop(1,night?'#2a3156':'#a9cbe8'); g.fillStyle=sky; g.fillRect(0,0,W,H);
  const r=Z.b.rural, poor=Z.w<2.2, h=(i,s)=>((i*9301+s*49297+Z.seed)%233280)/233280, F=(c,x,y,w,hh)=>{ g.fillStyle=c; g.fillRect(x,y,w,hh); }, ph=stagePhase(), t=performance.now();
  const city=(tall)=>{ for(let i=0;i<16;i++){ const x=i*21+Math.floor(h(i,3)*6), bh=24+Math.floor(h(i,4)*(tall?44:poor?18:38)); F(night?'#1a2038':poor&&!tall?'#7d7a74':'#6a7a96',x,70-bh,18,bh); g.fillStyle=night?'#f2d06a':'#cfe0f2'; for(let y=74-bh;y<66;y+=6)for(let xx=x+3;xx<x+16;xx+=5)if(h(xx,y)>(night?.5:.35))g.fillRect(xx,y,2,3); } };
  if(ph==='stadium'){ const K=Z.car&&Z.car.club?clubKit(Z.car.club):plainKit(), cols=[K.p,K.s||'#ffffff','#e9edf6',K.p];
    F(night?'#20263f':'#3a4258',0,26,W,46); for(let rr=0;rr<5;rr++)for(let x=0;x<W;x+=6)if(h(x,rr)<.8)F(cols[(x/6+rr)%cols.length],x+1+(rr%2)*2,30+rr*8+((Math.sin(t/300+x)>0.6)?-1:0),3,4);
    F('#151a2c',0,68,W,4); for(const x of [30,290]){ F('#3a3f55',x,6,2,22); F('#e9edf6',x-6,4,14,4); }
    F('#3d8f4f',0,72,W,28); for(let x=0;x<W;x+=40)if((x/40)%2)F('#37844a',x,72,40,28); F('#ffffff88',0,72,W,1); F('#ffffff66',160,72,1,28); }
  else if(ph==='coach'){ F('#3d8f4f',0,60,W,40); for(let x=0;x<W;x+=40)if((x/40)%2)F('#37844a',x,60,40,40); F('#c9d1dc',200,40,110,26); F('#8a95a6',200,40,110,4); for(let i=0;i<5;i++)F('#d8453a',208+i*20,52,12,12); F('#2b3348',14,40,52,34); F('#3d8f4f',17,43,46,26); F('#ffffff',22,50,4,1); F('#ffffff',40,58,4,1); F('#ffffff',30,64,6,1); }
  else if(ph==='admin'){ city(true); F('#20263f',96,14,128,56); F('#ffcf4a',96,14,128,6); for(let y=24;y<66;y+=8)for(let x=102;x<220;x+=10)F(night?'#f2d06a':'#cfe0f2',x,y,6,4); for(const x of [80,236]){ F('#d9dee6',x,10,2,60); F(x<100?'#1e8cff':'#d8453a',x+2,10,14,9); } F('#59794b',0,70,W,30); }
  else if(ph==='park'){ F(night?'#1b2a2a':'#6fa86a',0,58,W,42); for(let i=0;i<7;i++){ const x=Math.floor(h(i,1)*W), y=40+Math.floor(h(i,2)*10); g.fillStyle=night?'#12201a':'#3d6a3c'; g.beginPath(); g.arc(x,y,12,0,7); g.fill(); F('#5a3d28',x-1,y+8,3,14); } F('#4f8fbf',20,82,70,8); F('#8a5a3b',236,74,46,4); F('#6a442b',238,78,2,8); F('#6a442b',278,78,2,8); F('#8a5a3b',236,68,46,3); }
  else if(ph==='city'){ city(false); F('#9aa4b2',0,70,W,30); F('#7d8794',0,70,W,2); for(let x=0;x<W;x+=32)F('#ffffff',x+(Math.floor(a*6)%32),84,14,2); }
  else { if(r){ g.fillStyle=night?'#1b2a2a':'#5c8a5a'; for(let x=0;x<W;x+=2){ const y=58+Math.sin(x/30+Z.seed%7)*6; g.fillRect(x,y,2,H-y); } for(let i=0;i<9;i++){ const x=Math.floor(h(i,1)*W), y=54+Math.floor(h(i,2)*8); F(night?'#12201a':'#3d6a3c',x-4,y-10,9,10); F('#5a3d28',x,y,2,6); } }
    else city(false);
    F(r?'#7a6a48':'#59794b',0,70,W,30); g.fillStyle=r?'#6a5c3e':'#4f6d43'; for(let x=0;x<W;x+=8)g.fillRect(x+(Math.floor(a*4)%8),76+(x%3)*6,3,1);
    if(Z.stage>=1){ F('#e9edf6',262,62,2,18); F('#e9edf6',288,62,2,18); F('#e9edf6',262,62,28,2); g.fillStyle='#ffffff55'; for(let y=64;y<80;y+=3)g.fillRect(264,y,24,1); } }
  if((ph==='home'||ph==='stadium')&&Z.stage>=1&&a>=3){ const bx=170+Math.round(Math.sin(t/260)*20), by=86-Math.abs(Math.round(Math.sin(t/260)*6)); F('#fff',bx,by,4,4); F('#1d2440',bx+1,by+1,2,2); } }
function people(){ const a=Math.floor(Z.t), w=$('z-who'); if(!w)return; const ph=stagePhase(), kidA=Z.kid?a-Z.kid.born:-1;
  const key=[a,Z.stage,Z.car&&Z.car.club,Z.kidClub,Z.ph,ph,Z.wed,Z.widow,Z.kids,Z.mom.gone,Z.dad.gone,Z.kid&&Z.kid.club].join('|'); if(w.dataset.k===key)return; w.dataset.k=key;
  const im=(src,h)=>src?`<img alt="" style="height:${h}px" src="${src}">`:'';
  const aged=lk=>Object.assign({},lk,a>=70?{hair:'#e9e9e9'}:a>=55?{hair:'#a7a7a7'}:{});
  const casual=c=>({p:c,s:null,pat:'-',shorts:'#2a3354',socks:'#e9edf6',trim:c,txt:c}); /* 便服:沒有背號 */
  const meKit=ph==='coach'||ph==='admin'?SUIT:ph==='stadium'?clubKit(Z.car.club):a<19&&Z.kidClub&&Z.stage>=2?clubKit(Z.kidClub):a<19?plainKit():casual(SHIRT[Z.seed%6]);
  let html='';
  if(a<18&&Z.dad.gone==null)html+=sprite(Z.dad.n,lookOf(Z.dad.n,Z.b.c.lk),'#5b6fa8',64);
  if(a<18&&Z.mom.gone==null)html+=sprite(Z.mom.n,Z.momLook,'#c97a8a',60);
  html+=a<3?babyImg(30):im(sprX(meKit,'N','',Z.me,aged(Z.look)),Math.round(26+Math.min(a,18)*1.9));
  if(Z.wed&&!Z.widow&&a>=18){ const sp=Object.assign({},lookOf(Z.wed,Z.b.c.lk),Z.sex==='m'?{style:'long'}:{}); html+=im(sprX(casual(Z.sex==='m'?'#e58fa8':'#5b8def'),'N','',Z.wed,aged(sp),0),Z.sex==='m'?58:62); }
  for(let i=0;i<Math.min(3,Z.kids||0);i++){ const ka=kidA-i*2; if(ka<0||ka>19)continue; const kk=i===0&&Z.kid&&Z.kid.club&&Z.kid.st>=1?clubKit(Z.kid.club):casual(['#ffc400','#2fa866','#9b6bd6'][i]);
    html+=ka<2?babyImg(26,lookOf((Z.kid&&i===0?Z.kid.n:'kid'+i+Z.me),Z.b.c.lk),['#fff1b8','#cdeccf','#e3d4f7'][i]):im(sprX(kk,'N','',(Z.kid&&i===0?Z.kid.n:'kid'+i),lookOf((Z.kid&&i===0?Z.kid.n:'kid'+i+Z.me),Z.b.c.lk),0),Math.round(22+Math.min(ka,18)*1.9)); }
  w.innerHTML=html; }
/* ---------- 出生:轉盤→出生登記與該國足球資訊 ---------- */
const GIFT={pac:'天生腳程快',sta:'天生耐跑',phy:'身體比同齡強壯',sho:'天生腳法準',dri:'天生球感好',pas:'天生會傳球',vis:'天生會讀比賽',def:'天生不怕碰撞',hea:'天生彈跳好'};
const QN=['','最低的 20%','偏低的 20–40%','中間的 40–60%','偏高的 60–80%','最高的 20%'];
const dots=n=>'<span class="dots">'+'●'.repeat(n)+'<i>'+'●'.repeat(5-n)+'</i></span>';
const FCN=['','很少','偏少','普通','很普遍','街頭巷尾都在踢'];
function footballCard(c){ const N=FL.NATS&&FL.NATS[c.k], L=FL.LV||{}, T=FL.TEAMS||{}, Y=FL.YOUTH&&FL.YOUTH[c.k];
  const fcN=c.fc>=.85?5:c.fc>=.7?4:c.fc>=.5?3:c.fc>=.3?2:1, gN=c.gf>=.8?5:c.gf>=.5?4:c.gf>=.3?2:1, gT=c.gf>=.8?'很常見':c.gf>=.5?'越來越多':c.gf>=.3?'少數':'很少';
  const kid=`<div><small>孩子踢球的風氣</small><b>${FCN[fcN]}</b>${dots(fcN)}</div><div><small>女孩踢球</small><b>${gT}</b>${dots(gN)}</div>`;
  if(N&&N.home&&N.home.length&&L[N.home[0]]){ const top=L[N.home[0]], n=(T[N.home[0]]||[]).length, lvN=top.par>=58?5:top.par>=52?4:top.par>=46?3:top.par>=40?2:1, ya=Y?Object.keys(Y).filter(x=>Y[x]===1):[], low=N.home.slice(1).map(k=>L[k]&&L[k].n).filter(Boolean);
    const ti=Math.min(4,N.tier||0), ntN=['世界一流','洲際強隊','中段班','起步中','弱旅'][ti];
    return `<p>在${c.n}，最高級別的聯賽是<b>${top.n}</b>，遊戲裡有 ${n} 支球隊${low.length?`，下面還有${low.join('、')}`:''}。${ya.length?`年輕球員最先夢想進的是${ya.join('或')}。`:''}${N.wc>=80?'國家隊幾乎每屆都打進世界盃。':N.wc>=40?'國家隊有機會打進世界盃。':'國家隊很少打進世界盃。'}</p>
      <div class="kv2"><div><small>最高聯賽</small><b>${top.n}</b>${dots(lvN)}</div><div><small>國家隊・${N.cf}</small><b>${ntN}</b>${dots(5-ti)}</div>${kid}</div>`; }
  if(c.lg){ const lvN=c.lp>=40?4:c.lp>=32?3:c.lp>=24?2:1, wq=c.wcq||.01; return `<p>在${c.n}，最高級別的聯賽是<b>${c.lg}</b>。${c.lp<24?'聯賽規模不大，很多球員白天還有正職工作，想踢上更高水準多半要出國。':c.lp<34?'國內有職業聯賽，最好的球員通常會被鄰近國家或歐洲的球隊買走。':'國內聯賽有一定水準，也會吸引外國球員來踢。'}${wq>=.3?'國家隊常常打進世界盃。':wq>=.1?'國家隊偶爾有機會打進世界盃。':'國家隊很少打進世界盃。'}</p><div class="kv2"><div><small>最高聯賽</small><b>${c.lg}</b>${dots(lvN)}</div><div><small>打進世界盃</small><b>${wq>=.3?'常常':wq>=.1?'偶爾':'很少'}</b>${dots(wq>=.3?4:wq>=.1?3:wq>=.04?2:1)}</div>${kid}</div>`; }
  return `<p>${c.n}的職業聯賽還不在遊戲裡。想踢上職業，多半要先在國內冒出頭，再找機會出國。</p><div class="kv2">${kid}</div>`; }
function birthUI(){
  const c=Z.b.c, born=`${Z.year} 年 ${Z.month} 月`, el=document.createElement('div'); el.className='birth'; root.appendChild(el);
  const stars=(window.WORLD.STARS||{})[c.k]||[];
  el.innerHTML=`<div class="bw"><div class="bh"><p class="bk">你正在出生……</p><div class="reel" id="b-reel"></div><div class="bn"><h2>${esc(Z.me)}</h2><p>出生在${c.n}${Z.b.city}<span class="pill">${born}</span></p></div></div>
    <div class="bc bn2"><h4>${c.n}的足球</h4>${footballCard(c)}</div>
    ${stars.length?`<div class="bc bn2"><h4>這裡走出的球星</h4>${stars.map(([n,p,y,t])=>`<div class="bstar"><i></i><div><b>${n}</b><small>${p}・${y} 年生・${t}</small></div></div>`).join('')}</div>`:''}
    <div class="bc bn2"><h4>出生登記 <span class="bf">${flag(c.k)} ${c.n}</span></h4><p>${Z.year} 年，你出生在${c.n}${Z.b.city}，是個${Z.sex==='m'?'男孩':'女孩'}，家境屬於所得${QN[Z.b.q]}。</p>
      <div class="kv2"><div><small>出生地</small><b>${Z.b.city}</b></div><div><small>家境</small><b>${QN[Z.b.q]}</b>${dots(Z.b.q)}</div>
        <div class="hi"><small>天生</small><b>${GIFT[Z.gift]}</b></div><div><small>慣用腳</small><b>${Z.foot}</b></div>
        <div><small>母親・${Z.mom.a} 歲</small><b>${Z.mom.j}</b></div><div><small>父親・${Z.dad.a} 歲</small><b>${Z.dad.j}</b></div>
        <div><small>住處</small><b>${Z.home}</b></div><div><small>兄弟姊妹</small><b>${Z.sibs?Z.sibs+' 人':'沒有'}</b></div>
        <div class="w2"><small>當地平均壽命</small><b>${c.le} 歲</b><i class="lb"><i style="width:${(c.le/90*100).toFixed(0)}%"></i></i></div></div>
      <p class="note">現實中大約每 ${Math.round(132000/c.b).toLocaleString()} 個嬰兒，就有 1 個出生在${c.n}。這個遊戲依真實的出生人數決定你生在哪裡。</p>
      <p class="tg"><small>你的個性</small>${Z.tags.map(t=>`<span>${t}</span>`).join('')}</p>${iqHint()?`<p class="note">${iqHint()}</p>`:''}</div></div>
    <div class="bb"><button id="b-re">↻ 再次出生</button><button class="main" id="b-go" disabled>開始這一生 ▶</button></div>`;
  /* 轉盤:依出生人數抽國名(只是動畫，不用遊戲亂數)，越轉越慢，最後停在你出生的國家 */
  const reel=el.querySelector('#b-reel'), show=x=>{ reel.innerHTML=`<span class="rf">${flag(x.k)}</span><b>${x.n}</b>`; };
  const tot=C.reduce((s2,x)=>s2+x.b,0), any=()=>{ let r=Math.random()*tot; for(const x of C){ r-=x.b; if(r<0)return x; } return C[0]; };
  const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches, N=calm?0:26; let i=0;
  const done=()=>{ show(c); reel.classList.add('stop'); el.classList.add('shown'); el.querySelector('#b-go').disabled=false; };
  const tick=()=>{ if(!el.isConnected)return; if(i>=N)return done(); let x=any(); while(i>N-4&&x===c)x=any(); show(x); i++; setTimeout(tick,40+Math.pow(i/N,3)*380); };
  tick();
  el.querySelector('#b-go').onclick=()=>{ el.remove(); Z.birth=false; panels(); };
  el.querySelector('#b-re').onclick=()=>{ el.remove(); start(); };
}
/* ---------- 主迴圈 ---------- */
function showAsk(){ const k=Z.pending.shift(); if(k==='dead'){ endUI(); return; } const A=ASK[k](); Z.ask=A; Z.ff=false; hud();
  const el=document.createElement('div'); el.className='ask'; el.innerHTML=`<div class="bx"><h3>${A.t}</h3><p>${A.d}</p>${A.o.map((o,i)=>`<button data-i="${i}" class="${o.main?'main':''}">${o.t}</button>`).join('')}</div>`; root.appendChild(el);
  const done=i=>{ el.remove(); Z.ask=null; A.o[i].f(); panels(); };
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>done(+b.dataset.i));
  if(Z.auto&&!A.end){ const i=Math.max(0,A.o.findIndex(o=>o.main)), b=el.querySelector(`[data-i="${i}"]`); b.classList.add('hint'); setTimeout(()=>{ if(el.isConnected)done(R()<.8?i:Math.floor(R()*A.o.length)); },1400); } }
function loop(ts){ raf=requestAnimationFrame(loop); if(!root||root.style.display==='none')return;
  const dt=prev?Math.min(.1,(ts-prev)/1000):0; prev=ts;
  if(!Z.ask&&Z.pending.length){ showAsk(); return; }
  if(!Z.pause&&!Z.ask&&!Z.done&&!Z.birth){ const sp=Z.ff?40:Z.speed; const before=Math.floor(Z.t); Z.t+=dt*sp/SPY;
    if(Math.floor(Z.t)>before){ Z.t=Math.min(Z.t,before+1); yearEnd(); panels(); } }
  const a=Math.floor(Z.t), m=(Z.month-1+Math.floor((Z.t%1)*12));
  $('z-age').innerHTML=`${a}<small>歲</small>`; $('z-dt').textContent=`${Z.year+a+Math.floor(m/12)} 年 ${m%12+1} 月・${Z.me}・1 年≈${Math.round(SPY/(Z.ff?40:Z.speed))} 秒`; $('z-bar').style.width=(Math.min(Z.t,90)/90*100).toFixed(1)+'%';
  scene(); people(); }
window.FL_ZERO={open,state:()=>Z,yearEnd,ASK,newLife,ovr,useKeys,panels:()=>panels()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',open); else open();
})();
