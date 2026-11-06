'use strict';
// 0.40 職業世界：賽區、隊伍、選手、年度賽程、快速模擬。
// 隊伍強度依 2026 年各賽區實際戰績排序估計；隊名、代號、選手 ID 全部原創，檔案內不含任何真實隊名或選手名。
(()=>{
// [隊名, 代號, 強度, 風格, 位置強弱 {位置:差值}, 國家]
const REGIONS=[
 {id:'SCL',name:'星冠聯賽',area:'韓國',teams:[
  ['首爾閃電','SLT',96,'運營',{1:4,3:2}],['漢江獵鷹','HRF',95,'前期',{0:4,1:2}],['釜山浪潮','BSW',93,'團戰',{2:3,4:3,0:-2}],['光州火鳳','GJP',92,'前期',{2:3,3:2}],['大田星艦','DSS',87,'運營',{3:2}],
  ['仁川鐵翼','ICW',83,'分推'],['水原王冠','SWC',82,'團戰'],['蔚山巨浪','USB',81,'後期'],['濟州風暴','JJS',78,'前期'],['春川白虎','CCT',76,'團戰']]},
 {id:'DRL',name:'龍域聯賽',area:'中國',teams:[
  ['上海星辰','SHX',93,'團戰',{0:4,2:2}],['成都赤熊','CDB',91,'團戰',{2:3}],['北京烈焰','BJF',91,'前期',{3:3}],['杭州錢塘','HZT',89,'後期',{1:2}],['西安古城','XAG',86,'運營'],['廣州雄獅','GZL',85,'前期'],['深圳光速','SZL',84,'前期'],
  ['武漢江城','WHJ',82,'團戰'],['重慶山城','CQM',80,'分推'],['蘇州青石','SZQ',78,'後期'],['南京紫金','NJZ',77,'運營'],['天津海港','TJH',75,'團戰'],['長沙火炬','CST',74,'前期'],['青島藍鯨','QDW',72,'後期']]},
 {id:'EUL',name:'歐陸聯賽',area:'歐洲',teams:[
  ['柏林鐵狼','BIW',88,'運營',{2:3,0:2}],['馬德里鬥牛','MDB',85,'前期',{1:2}],['巴黎極光','PAA',84,'團戰',{3:2}],['倫敦騎士','LDK',82,'後期'],['斯德哥爾摩維京','STV',79,'分推'],
  ['華沙飛鷹','WSE',78,'前期'],['伊斯坦堡新月','ISC',77,'團戰'],['米蘭鋒刃','MLB',76,'前期'],['哥本哈根冰熊','CPB',75,'後期'],['杜拜沙鷹','DXF',73,'團戰']]},
 {id:'NSL',name:'北極星聯賽',area:'北美',teams:[
  ['洛杉磯日冕','LAC',81,'運營'],['紐約天際','NYS',80,'團戰'],['芝加哥疾風','CHW',79,'前期'],['西雅圖松林','SEP',76,'後期'],['多倫多楓葉','TOM',74,'團戰'],['達拉斯荒原','DLB',72,'前期'],['邁阿密熱帶','MIT',70,'分推'],['溫哥華浪人','VNR',68,'後期']]},
 {id:'PRL',name:'環太平洋聯賽',area:'亞太',teams:[
  ['胡志明烈火','HCM',79,'前期',{},'越南'],['台北曙光','TPD',78,'運營',{},'台灣'],['河內雷龍','HND',76,'前期',{},'越南'],['東京月影','TKM',74,'後期',{},'日本'],['高雄港灣','KHH',73,'團戰',{},'台灣'],['峴港潮汐','DNT',72,'團戰',{},'越南'],['福岡疾風','FKW',70,'前期',{},'日本'],['雪梨衝浪','SYS',68,'前期',{},'大洋洲']]},
 {id:'SXL',name:'南十字聯賽',area:'巴西',teams:[
  ['聖保羅烈陽','SPS',75,'前期'],['里約森巴','RJS',74,'團戰'],['美景礦脈','BHO',72,'運營'],['庫里提巴松鴉','CTJ',70,'前期'],['南港野馬','PAM',68,'分推'],['福塔雷薩海風','FTW',67,'團戰'],['巴西利亞藍天','BSB',65,'後期'],['薩爾瓦多鼓聲','SVD',63,'前期']]}
];
// 順序＝選單顯示順序：同聯賽相鄰，聯賽由強到弱。
const COUNTRIES={KR:['韓國','SCL','JJS'],CN:['中國','DRL','NJZ'],EU:['歐洲','EUL','MLB'],NA:['北美','NSL','DLB'],TW:['台灣','PRL','KHH'],HK:['香港','PRL','KHH'],VN:['越南','PRL','DNT'],JP:['日本','PRL','FKW'],BR:['巴西','SXL','PAM']};
// 第三欄只是舊存檔的備用值；實際起點由 startTeam 隨機決定（青訓開局）或球探邀約決定（天梯開局）。
function homeTeams(country){const [n,r]=COUNTRIES[country]||COUNTRIES.TW,all=REGION[r].teams,own=all.filter(t=>t[5]===n);return own.length?own:all;}
function startTeam(country){const h=homeTeams(country);return h[Math.floor(Math.random()*h.length)][1];}
const REGION=Object.fromEntries(REGIONS.map(r=>[r.id,r]));
const PHASES=[['split1','第一賽段・冬季盃'],['fs','開季先鋒賽'],['split2','第二賽段・季中之路'],['msi','季中邀請賽'],['split3','第三賽段・世界賽之路'],['worlds','霧河世界大賽'],['off','休賽期']];
const SHORT={split1:'冬季盃',split2:'季中之路',split3:'夏季'};
const BASE_WORLDS={SCL:3,DRL:3,EUL:3,NSL:3,PRL:3,SXL:2};

// ---------- 原創選手 ID ----------
const S1=['Ka','Ri','Vo','Ze','Lu','Mo','Ta','Ny','Sa','Dra','Ke','Fi','Qua','Xe','Ba','Ro','Ti','Ve','Ha','Jo','Pa','Ul','Cy','No','Gri','Pe','Su','Wy','El','Ar','Io','Da'];
const S2=['ren','vix','lo','dar','mi','zen','thos','ka','rok','sk','ly','ne','van','ix','o','eth','ra','um','is','ko','pex','ril','tan','wen','ze','bo','lune','ga'];
const BLOCK=new Set(['faker','zeus','oner','keria','chovy','canyon','ruler','peyz','kiin','showmaker','deft','caps','knight','bin','elk','uzi','rookie','theshy','viper','meiko','tarzan','zeka','kanavi','doran','lehends','aiming','lucid','beryl','doinb','tian','xun','scout','wei','hope','crisp','ming','breathe','yagao','ale','kael','hans','jojo','delight','gumayusi','bdd','peanut','score','pyosik','clozer','kingen','duro','bull','siwoo','hylissang','mikyx','yike','razork','upset','inspired','berserker','vulcan','impact','blaber','jensen','bwipo','humanoid','labrov','noah','ella','elyoya','targamas','larssen','comp','rekkles','perkz','jankos','wunder','mata','cuzz','pawn','khan','smeb','mlxg','ning','karsa','light','on','missing','xiaohu','gala','369','wayward','jiejie','kiaya','rich','lava','ellie']);
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}

function generate(seed){
 const rnd=mulberry(seed),pick=a=>a[Math.floor(rnd()*a.length)],used=new Set(),name=()=>{for(let k=0;k<200;k++){const n=pick(S1)+pick(S2)+(rnd()<.18?pick(['x','n','y','o']):'');const low=n.toLowerCase();if(!used.has(low)&&!BLOCK.has(low)&&n.length>=3){used.add(low);return n;}}return 'P'+used.size;};
 const teams=[],players=[];
 for(const R of REGIONS)for(const [tname,tag,rating,style,off={},country] of R.teams){
  teams.push({tag,name:tname,region:R.id,rating,style,country:country||R.area,form:0});
  for(let role=0;role<6;role++){const r=role<5?role:Math.floor(rnd()*5),base=rating+(role<5?(off[r]||0):-6)+Math.round((rnd()-.5)*4);
   const pool=heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===r).sort(()=>rnd()-.5).slice(0,3+Math.floor(rnd()*4));
   players.push({id:tag+role,name:name(),team:tag,role:r,starter:role<5,rating:Math.max(50,Math.min(99,base)),age:18+Math.floor(rnd()*9),pool});}
 }
 return {teams,players};
}

// ---------- 存取 ----------
let P=null;
const team=tag=>P.teams.find(t=>t.tag===tag);
const roster=tag=>[0,1,2,3,4].map(r=>P.players.find(p=>p.team===tag&&p.starter&&p.role===r));
function userRating(){const c=CAREER.data;if(!c)return 70;if(window.GROWTH)return GROWTH.rating(c);const s=c.stats;return Math.round(40+(s.mechanics+s.awareness+s.teamwork)/3*.6);}
function syncUser(){const u=P.players.find(p=>p.user);if(u){u.rating=userRating();const c=CAREER.data;u.name=c.name;u.age=c.age;}}
function strength(tag){syncUser();const ps=roster(tag);return ps.reduce((x,p)=>x+p.rating,0)/5+(team(tag).form||0);}
function side(tag){return {name:team(tag).name,players:roster(tag).map(p=>({role:p.role,pool:p.pool,rating:p.rating,name:p.name}))};}

// ---------- 比賽模擬 ----------
// 單局：雙方 BP 後，依強度差＋陣容差決定勝率
function simGame(a,b,fearless,blueIsA){const blue=blueIsA?a:b,red=blueIsA?b:a,q=DRAFT.quick(side(blue),side(red),fearless),ev=q.ev.team*(blueIsA?1:-1);
 const lane=q.ev.lanes.reduce((x,v)=>x+v,0)/5*(blueIsA?1:-1),p=1/(1+Math.exp(-((strength(a)-strength(b))/7+ev*.9+lane*.4)));
 return {aWin:Math.random()<p,picks:[...q.B,...q.R]};}
function simSeries(sr){const need=Math.ceil(sr.bo/2),fear=[];let blueIsA=strength(sr.a)>=strength(sr.b);sr.s=[0,0];
 while(sr.s[0]<need&&sr.s[1]<need){const g=simGame(sr.a,sr.b,fear,blueIsA);fear.push(...g.picks);if(g.aWin){sr.s[0]++;blueIsA=false;}else{sr.s[1]++;blueIsA=true;}}
 sr.w=sr.s[0]>sr.s[1]?sr.a:sr.b;}
const isUser=sr=>sr.a===P.team||sr.b===P.team;

// ---------- 賽事 ----------
function rrRounds(ids,double){const t=[...ids];if(t.length%2)t.push(null);const n=t.length,rounds=[];for(let r=0;r<n-1;r++){const pairs=[];for(let i=0;i<n/2;i++){const a=t[i],b=t[n-1-i];if(a!=null&&b!=null)pairs.push(r%2?[b,a]:[a,b]);}rounds.push(pairs);t.splice(1,0,t.pop());}
 if(double)rounds.push(...rounds.map(p=>p.map(([a,b])=>[b,a])));return rounds;}
let uid=0;
// 編號計數器重新整理後會歸零，所以要跳過已存在的 id，避免兩個賽事同 id（會讓 userSeries 找錯賽事而當掉）
function comp(o){let id;do id=`${P.year}-${o.key}-${uid++}`;while(P.comps?.some(x=>x.id===id));const c={id,name:o.name,key:o.key,region:o.region||'INTL',kind:o.kind,bo:o.bo,teams:o.teams,rounds:[],ri:0,done:false,table:{},seeds:o.teams,then:o.then||null,advance:o.advance||0,spec:o.spec||null,res:{}};
 for(const t of o.teams)c.table[t]={w:0,l:0,gw:0,gl:0};
 if(o.kind==='rr')c.rounds=rrRounds(o.teams,o.double).map(r=>r.map(([a,b])=>({a,b,bo:o.bo,w:null,s:[0,0]})));
 else genNext(c);
 P.comps.push(c);return c;}
function stand(c){return [...c.teams].sort((x,y)=>{const a=c.table[x],b=c.table[y];return b.w-a.w||(b.gw-b.gl)-(a.gw-a.gl)||strength(y)-strength(x);});}
// 雙敗淘汰：每場 [編號, 來源A, 來源B]；來源 ['s',種子] / ['W',場次] 勝者 / ['L',場次] 敗者
const sd=i=>['s',i],Wn=id=>['W',id],Ln=id=>['L',id];
const DE={
 d6:{final:'GF',m:[['U1',sd(2),sd(5)],['U2',sd(3),sd(4)],['U3',sd(0),Wn('U2')],['U4',sd(1),Wn('U1')],['UF',Wn('U3'),Wn('U4')],['L1',Ln('U1'),Ln('U2')],['L2',Ln('U4'),Wn('L1')],['L3',Ln('U3'),Wn('L2')],['LF',Ln('UF'),Wn('L3')],['GF',Wn('UF'),Wn('LF')]]},
 q6:{q:['UF','LF'],m:[['U1',sd(2),sd(5)],['U2',sd(3),sd(4)],['U3',sd(0),Wn('U2')],['U4',sd(1),Wn('U1')],['UF',Wn('U3'),Wn('U4')],['L1',Ln('U1'),Ln('U2')],['L2',Ln('U4'),Wn('L1')],['L3',Ln('U3'),Wn('L2')],['LF',Ln('UF'),Wn('L3')]]},
 d8:{final:'GF',m:[['U1',sd(0),sd(7)],['U2',sd(3),sd(4)],['U3',sd(1),sd(6)],['U4',sd(2),sd(5)],['U5',Wn('U1'),Wn('U2')],['U6',Wn('U3'),Wn('U4')],['UF',Wn('U5'),Wn('U6')],['L1',Ln('U1'),Ln('U2')],['L2',Ln('U3'),Ln('U4')],['L3',Ln('U6'),Wn('L1')],['L4',Ln('U5'),Wn('L2')],['L5',Wn('L3'),Wn('L4')],['LF',Ln('UF'),Wn('L5')],['GF',Wn('UF'),Wn('LF')]]},
 d4:{final:'GF',m:[['U1',sd(0),sd(3)],['U2',sd(1),sd(2)],['UF',Wn('U1'),Wn('U2')],['L1',Ln('U1'),Ln('U2')],['LF',Ln('UF'),Wn('L1')],['GF',Wn('UF'),Wn('LF')]]}
};
const DE_LABEL=id=>id==='GF'?'總決賽':id==='UF'?'勝部決賽':id==='LF'?'敗部決賽':id[0]==='U'?'勝部':'敗部';
function deGet(c,id){const ref=c.res[id];if(!ref)return null;if(ref.bye)return ref;const r=c.rounds[ref.ri];return r?r[ref.i]:{pending:true};}
function genNext(c){
 const last=c.rounds.at(-1),winners=last?last.map(s=>s.w):null,S=(a,b,bo=c.bo)=>({a,b,bo,w:null,s:[0,0]});
 if(c.kind==='bracket6'){const s=c.seeds;
  if(!last)c.rounds.push([S(s[2],s[5]),S(s[3],s[4])]);
  else if(c.rounds.length===1){const ws=winners.sort((x,y)=>s.indexOf(x)-s.indexOf(y));c.rounds.push([S(s[0],ws[1]),S(s[1],ws[0])]);}
  else if(c.rounds.length===2)c.rounds.push([S(winners[0],winners[1])]);
  else c.done=true;return;}
 if(c.kind==='elim'){
  if(!last){const s=c.seeds,n=s.length,order=n===8?[[0,7],[3,4],[1,6],[2,5]]:n===4?[[0,3],[1,2]]:[[0,1]];c.rounds.push(order.map(([i,j])=>S(s[i],s[j])));}
  else if(winners.length>1){const r=[];for(let i=0;i<winners.length;i+=2)r.push(S(winners[i],winners[i+1]));c.rounds.push(r);}
  else c.done=true;return;}
 if(c.kind==='de'){const spec=DE[c.spec],src=([k,v])=>{if(k==='s')return c.seeds[v]??null;const r=deGet(c,v);if(!r||!(r.w||r.bye))return undefined;return k==='W'?r.w:(r.l??null);};
  let changed=true;while(changed){changed=false;for(const [id,A,B] of spec.m){if(c.res[id])continue;const a=src(A),b=src(B);if(a===undefined||b===undefined)continue;if(a===null||b===null){c.res[id]={bye:true,w:a??b,l:null};changed=true;}}}
  const r=[];for(const [id,A,B] of spec.m){if(c.res[id])continue;const a=src(A),b=src(B);if(a==null||b==null)continue;const sr=S(a,b);sr.mid=id;c.res[id]={ri:c.rounds.length,i:r.length};r.push(sr);}
  if(r.length)c.rounds.push(r);else c.done=true;return;}
 if(c.kind==='swiss'){
  const live=c.teams.filter(t=>c.table[t].w<3&&c.table[t].l<3);if(!live.length){c.done=true;return;}
  const groups={};for(const t of live){const k=c.table[t].w+'-'+c.table[t].l;(groups[k]||=[]).push(t);}
  const r=[];for(const k of Object.keys(groups).sort()){const g=groups[k].sort(()=>Math.random()-.5);const [w,l]=k.split('-').map(Number);for(let i=0;i+1<g.length;i+=2)r.push(S(g[i],g[i+1],w===2||l===2?3:1));}
  c.rounds.push(r);return;}
}
function record(c,sr){sr.l=sr.w===sr.a?sr.b:sr.a;const A=c.table[sr.a],B=c.table[sr.b];if(!A||!B)return;A.gw+=sr.s[0];A.gl+=sr.s[1];B.gw+=sr.s[1];B.gl+=sr.s[0];if(sr.w===sr.a){A.w++;B.l++;}else{B.w++;A.l++;}}
function placement(c){if(c.kind==='de'){const spec=DE[c.spec],lref=new Set(spec.m.flatMap(([,A,B])=>[A,B]).filter(x=>x[0]==='L').map(x=>x[1])),elim=[];for(const r of c.rounds)for(const sr of r)if(sr.w&&!lref.has(sr.mid))elim.push(sr.l);
  const top=spec.final?[deGet(c,spec.final).w]:spec.q.map(id=>deGet(c,id).w);return [...top,...elim.reverse().filter(t=>t&&!top.includes(t))];}// 淘汰賽名次：冠、亞、四強敗者、八強敗者（依種子）
 const out=[],R=c.rounds;const fin=R.at(-1)[0];out.push(fin.w,fin.w===fin.a?fin.b:fin.a);
 for(let i=R.length-2;i>=0;i--){const losers=R[i].map(s=>s.w===s.a?s.b:s.a).sort((x,y)=>c.seeds.indexOf(x)-c.seeds.indexOf(y));out.push(...losers);}
 for(const t of c.seeds)if(!out.includes(t))out.push(t);return out;}

// ---------- 年度流程 ----------
function domestic(key,label){for(const R of REGIONS){const ids=R.teams.map(t=>t[1]);
 if(key==='split3'&&R.id==='SCL'){const prev=P.quals.split2rank?.SCL||ids;comp({key,name:`${R.name}・傳說組`,region:R.id,kind:'rr',bo:3,teams:prev.slice(0,5),double:true,then:'sclgroups'});comp({key,name:`${R.name}・崛起組`,region:R.id,kind:'rr',bo:3,teams:prev.slice(5),double:true,then:'sclgroups'});continue;}
 if(key==='split1'){const sorted=[...ids].sort((a,b)=>strength(b)-strength(a)),g=[[],[]];sorted.forEach((t,i)=>g[[0,1,1,0][i%4]].push(t));
  comp({key,name:`${R.name}・冬季盃 A 組`,region:R.id,kind:'rr',bo:3,teams:g[0],double:P.full,then:'groups1'});comp({key,name:`${R.name}・冬季盃 B 組`,region:R.id,kind:'rr',bo:3,teams:g[1],double:P.full,then:'groups1'});continue;}
 comp({key,name:`${R.name}・${label}`,region:R.id,kind:'rr',bo:3,teams:ids,double:P.full,then:'playoff'});}}
function startPhase(){const [key,label]=PHASES[P.phase];P.week=0;for(const t of P.teams)t.form=Math.round((Math.random()-.5)*3*10)/10;{const mine=team(P.team);if(mine)mine.form=Math.round((mine.form+((P.chem??50)-50)/25)*10)/10;}
 if(key==='split1'||key==='split2'||key==='split3')domestic(key,label);
 else if(key==='fs'){const q=P.quals.split1;const seeds=[q.SCL[0],q.DRL[0],q.EUL[0],q.PRL[0],q.SCL[1],q.DRL[1],q.NSL[0],q.SXL[0]];comp({key,name:'開季先鋒賽',kind:'elim',bo:5,teams:seeds,then:'fsdone'});}
 else if(key==='msi'){const q=P.quals.split2,bonus=P.quals.fsRegion;const direct=['SCL','DRL','EUL','NSL','PRL'].map(r=>q[r][0]);let pin;
  if(bonus==='SXL'){direct.push(q.SXL[0]);pin=['SCL','DRL','EUL','NSL','PRL'].map(r=>q[r][1]);}
  else{if(bonus)direct.push(q[bonus][1]);pin=['SCL','DRL','EUL','NSL','PRL'].filter(r=>r!==bonus).map(r=>q[r][1]).concat([q.SXL[0]]);}
  pin.sort((a,b)=>strength(b)-strength(a));P.quals.msiDirect=direct;comp({key,name:'季中邀請賽・入圍賽',kind:'de',spec:'q6',bo:5,teams:pin,then:'msiplayin'});}
 else if(key==='worlds'){const q=P.quals.split3,slots={...BASE_WORLDS};for(const r of P.quals.msiTop||[])slots[r]=(slots[r]||0)+1;
  const seeded=[];for(const r of ['SCL','DRL','EUL','NSL','PRL','SXL'])seeded.push(...q[r].slice(0,slots[r]).map((t,i)=>({t,r,i})));
  const pin=['SXL','PRL','NSL','EUL'].map(r=>{const list=seeded.filter(x=>x.r===r);return list.at(-1);}).filter(Boolean);
  const pinIds=pin.map(x=>x.t);P.quals.worldsSwiss=seeded.map(x=>x.t).filter(t=>!pinIds.includes(t)).slice(0,15);
  comp({key,name:'霧河世界大賽・入圍賽',kind:'de',spec:'d4',bo:5,teams:pinIds,then:'worldsplayin'});}
 else if(key==='off'){}
}
function followUp(c){const R=c.region;
 if(c.then==='groups1'){const groups=P.comps.filter(x=>x.then==='groups1'&&x.key===c.key&&x.region===R&&x.id.startsWith(P.year+'-'));if(!groups.every(g=>g.done))return;const [A,B]=groups.map(stand);
  comp({key:c.key,name:REGION[R].name+'・冬季盃季後賽',region:R,kind:'de',spec:'d6',bo:5,teams:[A[0],B[0],A[1],B[1],A[2],B[2]],then:'domdone'});}
 else if(c.then==='playoff'){const top=stand(c).slice(0,6);comp({key:c.key,name:REGION[R].name+'・'+SHORT[c.key]+'季後賽',region:R,kind:'de',spec:'d6',bo:5,teams:top,then:'domdone'});if(c.key==='split2')(P.quals.split2rank||={})[R]=stand(c);}
 else if(c.then==='sclgroups'){const groups=P.comps.filter(x=>x.then==='sclgroups'&&x.key===c.key&&x.region===R&&x.id.startsWith(P.year+'-'));if(!groups.every(g=>g.done))return;const [L,Ri]=groups;const lt=stand(L),rt=stand(Ri);const pool=[lt[4],rt[0],rt[1],rt[2]].sort((x,y)=>{const a=(L.table[x]||Ri.table[x]),b=(L.table[y]||Ri.table[y]);return b.w-a.w||strength(y)-strength(x);});
  comp({key:c.key,name:`${REGION[R].name}・${SHORT[c.key]}季後賽`,region:R,kind:'de',spec:'d6',bo:5,teams:[...lt.slice(0,4),pool[0],pool[1]],then:'domdone'});}
 else if(c.then==='domdone'){const rank=placement(c);const k=c.key;(P.quals[k]||={})[R]=rank;P.history.push({year:P.year,event:c.name,champ:rank[0]});}
 else if(c.then==='fsdone'){const champ=placement(c)[0];P.quals.fsRegion=team(champ).region;P.history.push({year:P.year,event:c.name,champ});}
 else if(c.then==='msiplayin'){const adv=placement(c).slice(0,8-P.quals.msiDirect.length);const seeds=[...P.quals.msiDirect,...adv];comp({key:c.key,name:'季中邀請賽・淘汰賽',kind:'de',spec:'d8',bo:5,teams:seeds,then:'msidone'});}
 else if(c.then==='msidone'){const pl=placement(c);P.quals.msiTop=[team(pl[0]).region,team(pl[1]).region===team(pl[0]).region?team(pl[2]).region:team(pl[1]).region];P.history.push({year:P.year,event:'季中邀請賽',champ:pl[0]});}
 else if(c.then==='worldsplayin'){const w=placement(c)[0];comp({key:c.key,name:'霧河世界大賽・瑞士輪',kind:'swiss',bo:1,teams:[...P.quals.worldsSwiss,w],then:'swissdone'});}
 else if(c.then==='swissdone'){const adv=c.teams.filter(t=>c.table[t].w>=3).sort((x,y)=>c.table[x].l-c.table[y].l||strength(y)-strength(x));comp({key:c.key,name:'霧河世界大賽・淘汰賽',kind:'elim',bo:5,teams:adv,then:'worldsdone'});}
 else if(c.then==='worldsdone'){const champ=placement(c)[0];P.history.push({year:P.year,event:'霧河世界大賽',champ,world:true});}
}
const phaseComps=()=>P.comps.filter(c=>c.key===PHASES[P.phase][0]&&c.id.startsWith(P.year+'-'));
function afterRound(c){c.ri++;if(c.kind==='rr'){if(c.ri>=c.rounds.length)c.done=true;}else if(c.ri>=c.rounds.length){genNext(c);if(c.ri>=c.rounds.length)c.done=true;}if(c.done)followUp(c);}
function nextPhase(){P.phase++;if(P.phase>=PHASES.length){newYear();return;}startPhase();}
// 0.82 青訓 BP 也要顯示選手名字：不需要世界資料的隨機原創 ID
function anyName(){return S1[Math.floor(Math.random()*S1.length)]+S2[Math.floor(Math.random()*S2.length)]+(Math.random()<.18?['x','n','y','o'][Math.floor(Math.random()*4)]:'');}
function newName(){const used=new Set(P.players.map(p=>p.name.toLowerCase()));for(let k=0;k<400;k++){const n=S1[Math.floor(Math.random()*S1.length)]+S2[Math.floor(Math.random()*S2.length)]+(Math.random()<.2?['x','n','y','o'][Math.floor(Math.random()*4)]:'');if(!used.has(n.toLowerCase())&&!BLOCK.has(n.toLowerCase()))return n;}return 'Rookie'+P.players.length;}
function rookie(tag,role,starter){const t=team(tag),p={id:tag+'r'+Date.now().toString(36)+Math.floor(Math.random()*1e4),name:newName(),team:tag,role,starter,rating:Math.max(55,Math.round(t.rating-8+Math.random()*6)),age:18+Math.floor(Math.random()*2),pool:heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===role).sort(()=>Math.random()-.5).slice(0,4)};P.players.push(p);return p;}
function offseasonMoves(){const moves=[];
 // 退役：30 歲以上或能力過低的 AI 選手
 for(const p of [...P.players]){if(p.user)continue;if(p.age>=30&&Math.random()<.55||p.rating<56&&Math.random()<.5){P.players.splice(P.players.indexOf(p),1);moves.push({kind:'retire',name:p.name,team:p.team});if(p.starter){const sub=P.players.find(x=>x.team===p.team&&!x.starter&&!x.user&&x.role===p.role);if(sub&&sub.rating>=p.rating-6){sub.starter=true;moves.push({kind:'promote',name:sub.name,team:p.team});}else{const r=rookie(p.team,p.role,true);moves.push({kind:'rookie',name:r.name,team:p.team});}}}}
 // 每隊保持 1 名替補
 for(const t of P.teams)if(!P.players.some(x=>x.team===t.tag&&!x.starter&&!x.user))rookie(t.tag,Math.floor(Math.random()*5),false);
 // 轉會：同位置先發互換（強隊挖角較強選手）
 for(let k=0;k<8;k++){const a=P.players.filter(x=>x.starter&&!x.user&&x.age>=21)[Math.floor(Math.random()*P.players.length)%Math.max(1,P.players.filter(x=>x.starter&&!x.user&&x.age>=21).length)];if(!a)continue;
  const b=P.players.filter(x=>x.starter&&!x.user&&x.role===a.role&&x.team!==a.team&&team(x.team).rating>team(a.team).rating&&x.rating<a.rating&&x.team!==P.team&&a.team!==P.team).sort(()=>Math.random()-.5)[0];
  if(b){const ta=a.team;a.team=b.team;b.team=ta;moves.push({kind:'transfer',name:a.name,from:ta,to:a.team});}}
 return moves;}
function newYear(){P.year++;P.phase=0;P.quals={};P.comps=P.comps.filter(c=>false);for(const p of P.players){if(p.user)continue;p.age++;const d=p.age<21?2+Math.random()*2:p.age<25?Math.random()*2:p.age<28?Math.random()*2-1:-2-Math.random()*2;p.rating=Math.max(50,Math.min(99,Math.round(p.rating+d)));}
 P.moves=offseasonMoves();
 const c=CAREER.data;if(c)c.age++;startPhase();}
// 推進一週：模擬所有非玩家的系列賽；遇到玩家的系列賽就停下來
function week(){if(!P||P.wait)return 'wait';if(PHASES[P.phase][0]==='off'){nextPhase();return 'year';}
 for(const c of phaseComps()){if(c.done)continue;const round=c.rounds[c.ri];if(!round){afterRound(c);continue;}
  round.forEach((sr,idx)=>{if(sr.w)return;if(isUser(sr)){if(!P.wait)P.wait={comp:c.id,idx};return;}simSeries(sr);record(c,sr);});
  if(round.every(sr=>sr.w))afterRound(c);}
 P.week++;
 if(!P.wait&&phaseComps().every(c=>c.done))nextPhase();
 return P.wait?'wait':'ok';}
function userSeries(){if(!P?.wait)return null;const c=P.comps.find(x=>x.id===P.wait.comp&&!x.done&&x.rounds[x.ri]?.[P.wait.idx]);if(!c){P.wait=null;return null;}return {comp:c,sr:c.rounds[c.ri][P.wait.idx]};}
function resolveUser(score){const u=userSeries();if(!u)return;const {comp:c,sr}=u;sr.s=sr.a===P.team?score:[score[1],score[0]];sr.w=sr.s[0]>sr.s[1]?sr.a:sr.b;record(c,sr);P.wait=null;
 if(c.rounds[c.ri].every(s=>s.w))afterRound(c);if(phaseComps().every(x=>x.done))nextPhase();}
function simUser(){const u=userSeries();if(!u)return;const {comp:c,sr}=u;simSeries(sr);record(c,sr);P.wait=null;if(c.rounds[c.ri].every(s=>s.w))afterRound(c);if(phaseComps().every(x=>x.done))nextPhase();}

function create(country,full){const [,,tag0]=COUNTRIES[country]||COUNTRIES.TW,c=CAREER.data,tag=c.proTeam&&REGIONS.some(r=>r.teams.some(t=>t[1]===c.proTeam))?c.proTeam:tag0,{teams,players}=generate(hashStr(c.id));
 P={v:1,year:2027,phase:0,week:0,full:!!full,country,team:tag,teams,players,comps:[],quals:{},history:[],wait:null,live:null,log:[]};
 const old=players.find(p=>p.team===tag&&p.starter&&p.role===c.role);old.starter=false;
 players.push({id:'YOU',name:c.name,team:tag,role:c.role,starter:true,user:true,rating:userRating(),age:c.age,pool:heroes.map((h,i)=>i).filter(i=>ROSTER[i].role===c.role).sort((a,b)=>heroes[b].mastery-heroes[a].mastery).slice(0,4)});
 c.pro=P;startPhase();return P;}
function moveUser(tag){const me=P.players.find(p=>p.user),old=me.team;if(tag===old)return;
 const displaced=P.players.find(p=>p.team===tag&&p.starter&&p.role===me.role&&!p.user);if(displaced)displaced.starter=false;
 me.team=tag;P.team=tag;const backup=P.players.filter(p=>p.team===old&&!p.starter&&!p.user).sort((a,b)=>(b.role===me.role)-(a.role===me.role)||b.rating-a.rating)[0];
 if(backup&&backup.role===me.role)backup.starter=true;else rookie(old,me.role,true);}
function attach(data){P=data||null;return P;}

window.WORLD={anyName,homeTeams,startTeam,DE_LABEL,moveUser,rookie,REGIONS,REGION,COUNTRIES,PHASES,generate,create,attach,get data(){return P;},team,roster,strength,side,week,userSeries,resolveUser,simUser,stand,placement,phaseComps,userRating,simGame,isUser};
})();
