'use strict';
// 0.90 選手造型：你自己（操作英雄的人）的像素小人，24×32 格，跟英雄立繪同一種畫風。
// 開局可自訂：性別、臉型、眼睛、髮型、髮色、挑染、膚色、配件、上衣；也有「職業選手風格」一鍵套用（原創名稱）。
// 造型存在 CAREER.data.look；開局前的選擇存在 localStorage 'esports-look'。不影響任何數值。
(()=>{
const W=24,H=32;
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const rgb=hex=>{const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const toHex=a=>'#'+a.map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
const shade=(hex,k)=>toHex(rgb(hex).map(v=>k<0?v*(1+k):v+(255-v)*k));
const mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t));};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const SKINS=['#f6dcc0','#f2c9a0','#e3b088','#c99068','#a06a44','#7a4a2c'];
const HAIRC=[['#1f1b24','黑'],['#4a3324','深棕'],['#8a5a32','栗棕'],['#d9b45a','金'],['#efe6cf','漂白'],['#9a9fae','銀灰'],['#b83a3a','紅'],['#f08cb8','粉'],['#5a7bd6','藍'],['#6a4bb0','紫'],['#4fb08a','綠']];
const DYES=[['','無'],['#efe6cf','白'],['#d9b45a','金'],['#f08cb8','粉'],['#5fd0ff','藍'],['#b07bff','紫'],['#ff6a4a','橘紅']];
const TOPC=[['#d24b4b','紅'],['#2f6fd0','藍'],['#1d2230','黑'],['#f2f2f2','白'],['#e0b04a','金'],['#3f9d6b','綠'],['#7a3fbf','紫'],['#f08cb8','粉'],['#ff8a3d','橘']];
const STYLES={short:'短髮',side:'旁分',mid:'中分',spiky:'刺蝟頭',buzz:'平頭',undercut:'側推油頭',bowl:'西瓜皮',curly:'捲髮',mullet:'狼尾',bob:'鮑伯短髮',hime:'公主切',long:'長直髮',pony:'高馬尾',lowpony:'低馬尾',twin:'雙馬尾',bun:'丸子頭',bald:'光頭'};
const FACES={round:'圓臉',square:'方臉',v:'瓜子臉',long:'長臉'};
const EYES={dot:'豆豆眼',big:'大眼',sharp:'銳利',smile:'笑眼',sleepy:'睡眼'};
const TOPS={jersey:'戰隊球衣',hoodie:'連帽衣',jacket:'隊服外套'};
// 配件：同一組只能選一個
const ACC=[['glasses','黑框眼鏡','eye'],['round','圓框眼鏡','eye'],['shades','墨鏡','eye'],['headset','電競耳機','ear'],['catset','貓耳耳機','ear'],['cap','反戴棒球帽','head'],['beanie','毛帽','head'],['band','頭帶','head'],['earring','耳環',''],['mask','口罩','mouth'],['stubble','鬍渣','mouth'],['freckle','雀斑',''],['bandaid','OK 繃',''],['mole','淚痣','']];
const ACC_GROUP=Object.fromEntries(ACC.map(a=>[a[0],a[2]]));
// 職業選手風格（原創名稱，只取常見的造型特徵）
const PRESETS=[
 {n:'冷靜大魔王',l:{g:'m',face:'round',eyes:'dot',hair:'side',hc:'#1f1b24',dye:'',acc:['glasses'],top:'jersey',tc:'#d24b4b'}},
 {n:'金髮狂戰士',l:{g:'m',face:'square',eyes:'sharp',hair:'undercut',hc:'#d9b45a',dye:'',acc:['earring','headset'],top:'jersey',tc:'#1d2230'}},
 {n:'狼尾天才',l:{g:'m',face:'v',eyes:'sharp',hair:'mullet',hc:'#1f1b24',dye:'#5fd0ff',acc:['earring'],top:'jacket',tc:'#2f6fd0'}},
 {n:'反帽野王',l:{g:'m',face:'square',eyes:'dot',hair:'short',hc:'#4a3324',dye:'',acc:['cap','stubble'],top:'hoodie',tc:'#3f9d6b'}},
 {n:'圓框學霸',l:{g:'m',face:'round',eyes:'smile',hair:'bowl',hc:'#4a3324',dye:'',acc:['round'],top:'hoodie',tc:'#f2f2f2'}},
 {n:'長髮浪人',l:{g:'m',face:'long',eyes:'sleepy',hair:'lowpony',hc:'#1f1b24',dye:'',acc:['band'],top:'jacket',tc:'#7a3fbf'}},
 {n:'爆炸頭老將',l:{g:'m',face:'square',eyes:'smile',hair:'curly',hc:'#1f1b24',dye:'#d9b45a',acc:['stubble','headset'],top:'jersey',tc:'#e0b04a'}},
 {n:'颯爽短髮',l:{g:'f',face:'v',eyes:'sharp',hair:'bob',hc:'#1f1b24',dye:'',acc:['headset'],top:'jersey',tc:'#2f6fd0'}},
 {n:'雙馬尾輔助',l:{g:'f',face:'round',eyes:'big',hair:'twin',hc:'#f08cb8',dye:'',acc:['catset'],top:'hoodie',tc:'#f08cb8'}},
 {n:'公主切中單',l:{g:'f',face:'v',eyes:'sharp',hair:'hime',hc:'#1f1b24',dye:'',acc:['earring','mole'],top:'jacket',tc:'#1d2230'}},
 {n:'高馬尾射手',l:{g:'f',face:'round',eyes:'big',hair:'pony',hc:'#8a5a32',dye:'',acc:['band'],top:'jersey',tc:'#d24b4b'}},
 {n:'丸子頭軍師',l:{g:'f',face:'round',eyes:'smile',hair:'bun',hc:'#4a3324',dye:'',acc:['round','freckle'],top:'hoodie',tc:'#3f9d6b'}},
 {n:'銀髮冰山',l:{g:'f',face:'long',eyes:'sleepy',hair:'long',hc:'#efe6cf',dye:'#b07bff',acc:['shades'],top:'jacket',tc:'#7a3fbf'}}];
const M_HAIR=['short','side','mid','spiky','buzz','undercut','bowl','curly','mullet'],F_HAIR=['bob','hime','long','pony','lowpony','twin','bun','mid','short'];
function auto(name){const R=hash('look'+(name||'')),g=R%2?'f':'m',pool=g==='f'?F_HAIR:M_HAIR;
 return {g,skin:(R>>>3)%4,face:Object.keys(FACES)[(R>>>5)%4],eyes:Object.keys(EYES)[(R>>>7)%5],hair:pool[(R>>>9)%pool.length],hc:HAIRC[(R>>>12)%4][0],dye:'',acc:(R>>>15)%3?[]:['headset'],top:'jersey',tc:TOPC[(R>>>17)%TOPC.length][0]};}
function norm(l){const a=auto('');l={...a,...(l||{})};if(!Array.isArray(l.acc))l.acc=[];if(!(l.hair in STYLES))l.hair=a.hair;if(!(l.face in FACES))l.face='round';if(!(l.eyes in EYES))l.eyes='dot';if(!(l.top in TOPS))l.top='jersey';l.skin=Math.max(0,Math.min(SKINS.length-1,+l.skin||0));return l;}

// ---------- 繪製 ----------
const DARK='#1d1a24',WHITE='#fbf6ea',EYE='#231c22';
function sprite(look){const L=norm(look),g=Array.from({length:H},()=>Array(W).fill(null));
 const px=(x,y,c)=>{if(x>=0&&x<W&&y>=0&&y<H&&c)g[y][x]=c;};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let k=0;k<w;k++)px(x+k,y+j,c);};
 const has=k=>L.acc.includes(k),skin=SKINS[L.skin],skinD=shade(skin,-.18),hc=L.hc,hcD=shade(hc,-.3),dye=L.dye||null,tc=L.tc,tcD=shade(tc,-.28),trim=mix(tc,'#ffffff',.7)===tc?DARK:(rgb(tc).reduce((a,b)=>a+b)>600?'#2f3a55':WHITE);
 const hx=7,hw=10,hy=7,top=17,bw=L.g==='f'?8:8,Lx=12-bw/2,Rt=Lx+bw-1,f=L.g==='f';
 const long=L.face==='long';
 // 背後的頭髮（長髮、馬尾）
 if(L.hair==='long'||L.hair==='hime'){rect(hx-1,hy+2,hw+2,11,hc);rect(hx-1,hy+12,hw+2,1,hcD);}
 if(L.hair==='lowpony'){rect(11,hy+9,3,7,hc);rect(11,hy+15,3,1,hcD);}
 if(L.hair==='twin'){for(const sx of [hx-3,hx+hw+1]){rect(sx,hy+2,2,9,hc);rect(sx,hy+10,2,1,hcD);px(sx+(sx<hx?1:0),hy+1,hc);}}
 if(L.hair==='pony'){rect(hx+hw,hy-1,2,2,hc);rect(hx+hw+1,hy+1,2,7,hc);rect(hx+hw+1,hy+7,2,1,hcD);}
 // 腿與鞋
 rect(Lx+1,26,3,3,'#2c3140');rect(Rt-3,26,3,3,'#2c3140');rect(Lx+1,29,3,2,WHITE);rect(Rt-3,29,3,2,WHITE);rect(Lx+1,30,3,1,'#b8bcc8');rect(Rt-3,30,3,1,'#b8bcc8');
 // 上衣
 if(L.top==='jersey'){rect(Lx,top,bw,9,tc);rect(Lx,top,bw,1,shade(tc,.25));rect(10,top,4,1,trim);px(11,top+1,trim);px(12,top+1,trim);rect(Lx,top+3,1,5,trim);rect(Rt,top+3,1,5,trim);rect(Lx+3,top+3,2,1,trim);rect(Lx+2,top+8,bw-4,1,tcD);}
 else if(L.top==='hoodie'){rect(Lx,top,bw,9,tc);rect(Lx+1,top-1,bw-2,2,tcD);rect(10,top+5,4,3,tcD);px(11,top+1,WHITE);px(12,top+1,WHITE);px(11,top+2,WHITE);px(12,top+3,WHITE);}
 else{rect(Lx,top,bw,9,tc);rect(11,top,2,9,DARK);rect(Lx,top,bw,1,shade(tc,.25));rect(Lx,top+4,bw,1,trim);px(10,top+1,trim);px(13,top+1,trim);rect(Lx,top+8,bw,1,tcD);}
 // 手臂
 const armC=L.top==='jacket'?tc:L.top==='hoodie'?tc:tc;rect(Lx-2,top+1,2,5,armC);rect(Rt+1,top+1,2,5,armC);if(L.top==='jersey'){rect(Lx-2,top+3,2,3,skin);}rect(Lx-2,top+6,2,1,skin);rect(Rt+1,top+6,2,1,skin);if(L.top==='jersey')rect(Rt+1,top+3,2,3,skin);
 // 脖子
 rect(11,hy+9,2,1,skinD);
 // 臉型
 rect(hx,hy+1,hw,8,skin);rect(hx+1,hy,hw-2,1,skin);rect(hx,hy+8,hw,1,skinD);
 if(L.face==='round'){px(hx,hy+8,null);g[hy+8][hx]=null;g[hy+8][hx+hw-1]=null;px(hx+1,hy+8,skinD);}
 if(L.face==='v'){for(const [y,inset] of [[hy+7,1],[hy+8,2]]){for(let k=0;k<inset;k++){g[y][hx+k]=null;g[y][hx+hw-1-k]=null;}}rect(hx+2,hy+8,hw-4,1,skinD);px(hx+1,hy+7,skinD);px(hx+hw-2,hy+7,skinD);}
 if(L.face==='square'){rect(hx,hy+8,hw,1,skinD);rect(hx,hy+7,1,1,skinD);rect(hx+hw-1,hy+7,1,1,skinD);}
 if(long){rect(hx,hy+8,hw,1,skin);rect(hx+1,hy+9,hw-2,1,skinD);}
 // 眼睛
 const ey=hy+4,ex1=hx+2,ex2=hx+7;
 if(L.eyes==='dot'){rect(ex1,ey,1,2,EYE);rect(ex2,ey,1,2,EYE);}
 else if(L.eyes==='big'){rect(ex1,ey,2,2,EYE);rect(ex2-1,ey,2,2,EYE);px(ex1,ey,WHITE);px(ex2-1,ey,WHITE);}
 else if(L.eyes==='sharp'){rect(ex1,ey+1,2,1,EYE);rect(ex2-1,ey+1,2,1,EYE);px(ex1,ey,EYE);px(ex2,ey,EYE);px(ex1-1,ey-1,hcD);px(ex1,ey-1,hcD);px(ex2,ey-1,hcD);px(ex2+1,ey-1,hcD);}
 else if(L.eyes==='smile'){px(ex1-1,ey+1,EYE);px(ex1,ey,EYE);px(ex1+1,ey+1,EYE);px(ex2-1,ey+1,EYE);px(ex2,ey,EYE);px(ex2+1,ey+1,EYE);}
 else if(L.eyes==='sleepy'){rect(ex1-1,ey+1,2,1,EYE);rect(ex2,ey+1,2,1,EYE);}
 if(f&&L.eyes!=='smile'){px(ex1-1,ey-(L.eyes==='sharp'?0:0),EYE);px(ex2+1,ey,EYE);}
 // 腮紅、嘴
 if(f||L.eyes==='smile'){px(hx+1,hy+6,mix(skin,'#e88a8a',.5));px(hx+8,hy+6,mix(skin,'#e88a8a',.5));}
 px(hx+4,hy+7,shade(skin,-.35));px(hx+5,hy+7,shade(skin,-.35));
 if(has('freckle')){px(hx+2,hy+6,shade(skin,-.25));px(hx+3,hy+7,shade(skin,-.25));px(hx+7,hy+6,shade(skin,-.25));px(hx+6,hy+7,shade(skin,-.25));}
 if(has('mole'))px(ex2+1,ey+2,DARK);
 if(has('stubble')){const sc=mix(skinD,hc,.45);for(let k=hx+2;k<hx+hw-2;k++)px(k,hy+8,sc);px(hx+3,hy+7,mix(skin,hc,.3));px(hx+6,hy+7,mix(skin,hc,.3));}
 if(has('bandaid')){rect(hx+6,hy+6,3,1,'#f2c48a');px(hx+7,hy+6,'#e6a868');}
 if(has('mask')){rect(hx+1,hy+6,hw-2,3,'#f4f4f4');rect(hx+1,hy+8,hw-2,1,'#d9dbe2');px(hx,hy+5,'#d9dbe2');px(hx+hw-1,hy+5,'#d9dbe2');}
 // 前面的頭髮
 const cap=()=>{rect(hx,hy-1,hw,3,hc);rect(hx-1,hy,1,4,hc);rect(hx+hw,hy,1,4,hc);rect(hx+1,hy-2,hw-2,1,hc);};
 const tip=(x,y)=>dye&&px(x,y,dye);
 const S=L.hair;
 if(S==='short'){cap();px(hx+1,hy+2,hc);px(hx+3,hy+2,hc);px(hx+hw-2,hy+2,hc);tip(hx+2,hy+1);tip(hx+6,hy+1);}
 else if(S==='side'){cap();rect(hx,hy+2,5,1,hc);px(hx,hy+3,hc);px(hx+hw-1,hy+2,hc);px(hx+5,hy,hcD);tip(hx+1,hy+2);tip(hx+3,hy+2);}
 else if(S==='mid'){cap();rect(hx,hy+2,4,1,hc);rect(hx+hw-4,hy+2,4,1,hc);px(hx,hy+3,hc);px(hx+hw-1,hy+3,hc);px(hx+4,hy+1,skin);px(hx+5,hy+1,skin);px(hx+4,hy,hcD);px(hx+5,hy,hcD);tip(hx+1,hy+2);tip(hx+hw-2,hy+2);}
 else if(S==='spiky'){cap();for(let k=0;k<5;k++){px(hx+k*2,hy-3,hc);px(hx+k*2+1,hy-2,hc);}rect(hx,hy+2,hw,1,hc);for(let k=0;k<hw;k+=2)g[hy+2][hx+k]=skin;tip(hx+2,hy-3);tip(hx+6,hy-3);tip(hx+8,hy-3);}
 else if(S==='buzz'){rect(hx,hy,hw,2,shade(hc,.12));rect(hx+1,hy-1,hw-2,1,shade(hc,.12));px(hx-1,hy+1,shade(hc,.12));px(hx+hw,hy+1,shade(hc,.12));}
 else if(S==='undercut'){rect(hx,hy-1,hw,2,hc);rect(hx+1,hy-3,hw-1,2,hc);rect(hx+hw-3,hy-2,4,1,hc);rect(hx-1,hy+1,1,3,shade(hc,-.15));rect(hx+hw,hy+1,1,3,shade(hc,-.15));rect(hx,hy+1,1,1,shade(hc,-.15));tip(hx+3,hy-3);tip(hx+5,hy-3);tip(hx+7,hy-3);}
 else if(S==='bowl'){cap();rect(hx-1,hy+2,hw+2,1,hc);rect(hx,hy+3,hw,1,hc);rect(hx-1,hy+4,1,2,hc);rect(hx+hw,hy+4,1,2,hc);tip(hx+2,hy+3);tip(hx+7,hy+3);}
 else if(S==='curly'){rect(hx-2,hy-3,hw+4,5,hc);rect(hx-2,hy+2,2,4,hc);rect(hx+hw,hy+2,2,4,hc);for(let k=0;k<hw+4;k+=2){px(hx-2+k,hy-4,hc);px(hx-2+k,hy-3,hcD);}px(hx+1,hy+2,hc);px(hx+4,hy+2,hc);px(hx+7,hy+2,hc);tip(hx,hy-4);tip(hx+4,hy-4);tip(hx+8,hy-4);}
 else if(S==='mullet'){cap();rect(hx,hy+2,3,1,hc);rect(hx+5,hy+2,2,1,hc);rect(hx-1,hy+4,2,6,hc);rect(hx+hw-1,hy+4,2,6,hc);rect(hx-1,hy+9,2,1,dye||hcD);rect(hx+hw-1,hy+9,2,1,dye||hcD);tip(hx+1,hy+2);tip(hx+5,hy+2);}
 else if(S==='bob'){cap();rect(hx-1,hy+2,2,7,hc);rect(hx+hw-1,hy+2,2,7,hc);rect(hx,hy+2,hw,1,hc);for(let k=hx+1;k<hx+hw;k+=3)g[hy+2][k]=skin;rect(hx-1,hy+8,2,1,dye||hcD);rect(hx+hw-1,hy+8,2,1,dye||hcD);}
 else if(S==='hime'){cap();rect(hx,hy+2,hw,1,hc);rect(hx-1,hy+2,2,9,hc);rect(hx+hw-1,hy+2,2,9,hc);rect(hx+1,hy+6,1,3,hc);rect(hx+hw-2,hy+6,1,3,hc);tip(hx-1,hy+10);tip(hx+hw,hy+10);}
 else if(S==='long'){cap();rect(hx,hy+2,3,1,hc);rect(hx+hw-4,hy+2,4,1,hc);rect(hx-1,hy+2,2,8,hc);rect(hx+hw-1,hy+2,2,8,hc);tip(hx-1,hy+11);tip(hx+hw,hy+11);tip(hx+1,hy+2);}
 else if(S==='pony'){cap();rect(hx,hy+2,4,1,hc);px(hx+hw-1,hy+2,hc);rect(hx+hw-1,hy-1,1,1,'#e05a7a');tip(hx+hw+1,hy+7);tip(hx+hw+2,hy+7);}
 else if(S==='lowpony'){cap();rect(hx,hy+2,3,1,hc);rect(hx+hw-3,hy+2,3,1,hc);rect(hx-1,hy+2,1,4,hc);rect(hx+hw,hy+2,1,4,hc);}
 else if(S==='twin'){cap();rect(hx,hy+2,hw,1,hc);for(let k=hx+2;k<hx+hw-1;k+=3)g[hy+2][k]=skin;px(hx-2,hy+1,'#e05a7a');px(hx+hw+1,hy+1,'#e05a7a');tip(hx-3,hy+10);tip(hx+hw+2,hy+10);}
 else if(S==='bun'){rect(hx+3,hy-5,4,3,hc);rect(hx+4,hy-6,2,1,hc);px(hx+4,hy-4,hcD);cap();rect(hx,hy+2,4,1,hc);px(hx-1,hy+4,hc);px(hx+hw,hy+4,hc);tip(hx+3,hy-5);tip(hx+6,hy-5);}
 else if(S==='bald'){px(hx+2,hy+1,shade(skin,.25));px(hx+3,hy+1,shade(skin,.25));}
 // 配件
 if(has('band')){rect(hx-1,hy+1,hw+2,1,'#e5484d');px(hx+hw+1,hy+2,'#e5484d');px(hx+hw+2,hy+3,'#e5484d');}
 if(has('beanie')){rect(hx-1,hy-3,hw+2,4,'#3a4a7a');rect(hx-1,hy,hw+2,1,'#5a6aa0');rect(hx+3,hy-5,4,2,'#e0b04a');for(let k=hx;k<hx+hw;k+=2)px(k,hy-2,'#4a5a8e');}
 if(has('cap')){const cc=tc===DARK||tc==='#1d2230'?'#e5484d':tcD;rect(hx-1,hy-3,hw+2,4,cc);rect(hx-1,hy,hw+2,1,shade(cc,-.25));rect(hx+hw,hy-1,3,2,shade(cc,-.2));rect(hx+1,hy-2,3,1,shade(cc,.3));px(hx+4,hy-3,shade(cc,.4));}
 if(has('glasses')){for(const [x0,eyeX] of [[ex1-1,ex1],[ex2-2,ex2]]){rect(x0,ey-1,4,1,DARK);rect(x0,ey+1,4,1,DARK);px(x0,ey,DARK);px(x0+3,ey,DARK);px(x0+1,ey,'#d6e6ff');px(x0+2,ey,'#d6e6ff');px(eyeX,ey,EYE);}}
 if(has('round')){for(const cx of [ex1,ex2-1]){px(cx-1,ey,'#b08a3a');px(cx+2,ey,'#b08a3a');px(cx-1,ey+1,'#b08a3a');px(cx+2,ey+1,'#b08a3a');px(cx,ey-1,'#b08a3a');px(cx+1,ey-1,'#b08a3a');px(cx,ey+2,'#b08a3a');px(cx+1,ey+2,'#b08a3a');}px(hx+4,ey,'#b08a3a');px(hx+5,ey,'#b08a3a');}
 if(has('shades')){rect(ex1-1,ey,4,2,'#15121c');rect(ex2-2,ey,4,2,'#15121c');rect(hx+4,ey,2,1,'#15121c');px(ex1-1,ey,'#5a6a8e');px(ex2-2,ey,'#5a6a8e');}
 if(has('headset')||has('catset')){const hc2=has('catset')?'#f4f4f4':'#2a2e3a',acc2=has('catset')?'#f08cb8':'#e5484d';rect(hx,hy-3,hw,1,hc2);px(hx-1,hy-2,hc2);px(hx+hw,hy-2,hc2);rect(hx-2,hy-1,1,4,hc2);rect(hx+hw+1,hy-1,1,4,hc2);rect(hx-2,hy+2,2,4,hc2);rect(hx+hw,hy+2,2,4,hc2);px(hx-2,hy+3,acc2);px(hx+hw+1,hy+3,acc2);
  if(has('catset')){rect(hx,hy-5,2,2,hc2);rect(hx+hw-2,hy-5,2,2,hc2);px(hx,hy-6,hc2);px(hx+hw-1,hy-6,hc2);px(hx+1,hy-4,acc2);px(hx+hw-2,hy-4,acc2);}}
 if(has('earring')){px(hx-1,hy+6,'#e0b04a');px(hx+hw,hy+6,'#e0b04a');}
 return g;}
const cache=new Map();
function canvas(look,{scale=4}={}){const L=norm(look),key=JSON.stringify(L)+':'+scale;if(cache.has(key))return cache.get(key);const g=sprite(L),c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;const x=c.getContext('2d');
 // 外框描邊
 const ol='#14111a';for(let y=0;y<H;y++)for(let k=0;k<W;k++){if(g[y][k])continue;const n=[[0,1],[0,-1],[1,0],[-1,0]].some(([a,b])=>g[y+b]?.[k+a]);if(n){x.fillStyle=ol;x.fillRect(k*scale,y*scale,scale,scale);}}
 for(let y=0;y<H;y++)for(let k=0;k<W;k++)if(g[y][k]){x.fillStyle=g[y][k];x.fillRect(k*scale,y*scale,scale,scale);}
 if(cache.size>300)cache.clear();cache.set(key,c);return c;}
const ucache=new Map();const url=(look,o={})=>{const k=JSON.stringify(norm(look))+':'+(o.scale||4);let u=ucache.get(k);if(!u){u=canvas(look,o).toDataURL();if(ucache.size>300)ucache.clear();ucache.set(k,u);}return u;};

// ---------- 造型存取 ----------
const KEY='esports-look';
const loadPick=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}};
const savePick=l=>{try{localStorage.setItem(KEY,JSON.stringify(l));}catch{}};
const nameNow=()=>(document.querySelector('#rookieName')?.value||(typeof rookieName!=='undefined'?rookieName:'')||'').trim();
const current=()=>norm(loadPick()||auto(nameNow()));
function of(c){c=c||window.CAREER?.data;return norm(c?.look||auto(c?.name));}
// 代表英雄：熟練度最高（同分取第一個）
function signature(){const HS=typeof heroes!=='undefined'?heroes:null;if(!HS?.length)return null;let b=0;HS.forEach((h,i)=>{if((h.mastery||0)>(HS[b].mastery||0))b=i;});return {i:b,name:HS[b].name,mastery:Math.round(HS[b].mastery||0)};}

// ---------- 開局造型編輯 ----------
let open=false;
function editorHTML(){const L=current(),pick=!!loadPick();
 const row=(t,sub,inner)=>`<div class="pl-row"><h4>${t}${sub?`<small>${sub}</small>`:''}</h4><div class="pl-strip">${inner}</div></div>`;
 const chip=(k,map,cur)=>Object.entries(map).map(([v,n])=>`<button type="button" class="pl-chip" aria-pressed="${cur===v}" data-k="${k}" data-v="${v}">${n}</button>`).join('');
 const sw=(k,list,cur)=>list.map(([v,n])=>`<button type="button" class="pl-sw${v?'':' none'}" style="${v?`background:${v}`:''}" title="${n}" aria-label="${n}" aria-pressed="${(cur||'')===v}" data-k="${k}" data-v="${v}">${v?'':'無'}</button>`).join('');
 const opt=(lk,label,attr)=>`<button type="button" class="pl-opt" ${attr}><img src="${url(lk,{scale:2})}" alt="">${label}</button>`;
 return `<div class="pl-head"><img class="pl-big" src="${url(L,{scale:4})}" alt="你的選手造型"><div><b>選手造型</b><small>${pick?'自訂造型':'依名字自動產生'}・之後會出現在結局卡上</small><div class="pl-acts"><button type="button" class="quiet" data-pl-toggle>${open?'收起 ▴':'自訂造型 ▾'}</button><button type="button" class="quiet" data-pl-rand>🎲 隨機</button>${pick?'<button type="button" class="quiet" data-pl-reset>改回自動</button>':''}</div></div></div>
 ${open?`<div class="pl-body">
 ${row('職業選手風格','一鍵套用，再自己微調',PRESETS.map((p,i)=>opt({...p.l,skin:L.skin},p.n,`data-pre="${i}"`)).join(''))}
 ${row('性別','',`<button type="button" class="pl-chip" aria-pressed="${L.g==='m'}" data-k="g" data-v="m">男生</button><button type="button" class="pl-chip" aria-pressed="${L.g==='f'}" data-k="g" data-v="f">女生</button>`)}
 ${row('髮型',`左右滑看全部 ${Object.keys(STYLES).length} 種`,Object.entries(STYLES).map(([k,n])=>opt({...L,hair:k},n,`data-k="hair" data-v="${k}" aria-pressed="${L.hair===k}"`)).join(''))}
 ${row('髮色','',sw('hc',HAIRC,L.hc))}
 ${row('挑染','髮尾或瀏海',sw('dye',DYES,L.dye))}
 ${row('膚色','',SKINS.map((c,i)=>`<button type="button" class="pl-sw" style="background:${c}" aria-label="膚色 ${i+1}" aria-pressed="${L.skin===i}" data-k="skin" data-v="${i}"></button>`).join(''))}
 ${row('臉型','',chip('face',FACES,L.face))}
 ${row('眼睛','',chip('eyes',EYES,L.eyes))}
 ${row('配件','可以複選（同部位只能戴一個）',ACC.map(([v,n])=>`<button type="button" class="pl-chip" aria-pressed="${L.acc.includes(v)}" data-acc="${v}">${n}</button>`).join(''))}
 ${row('上衣','',chip('top',TOPS,L.top))}
 ${row('上衣顏色','',sw('tc',TOPC,L.tc))}</div>`:''}`;}
function mount(){if(window.CAREER?.data)return;const nf=document.querySelector('#careerHub .namefield');if(!nf)return;let box=document.querySelector('#plEditor');
 if(!box){box=document.createElement('div');box.id='plEditor';box.className='pl-editor';nf.after(box);paint(box);
  const inp=document.querySelector('#rookieName');if(inp&&!inp.dataset.pl){inp.dataset.pl=1;inp.addEventListener('input',()=>{if(!loadPick())paint(box);});}}}
function paint(box){const sx=[...box.querySelectorAll('.pl-strip')].map(s=>s.scrollLeft);box.innerHTML=editorHTML();[...box.querySelectorAll('.pl-strip')].forEach((s,i)=>s.scrollLeft=sx[i]||0);
 const set=patch=>{savePick({...current(),...patch});paint(box);};
 box.querySelector('[data-pl-toggle]').onclick=()=>{open=!open;paint(box);};
 box.querySelector('[data-pl-rand]').onclick=()=>{const R=n=>Math.floor(Math.random()*n),g=R(2)?'f':'m',pool=g==='f'?F_HAIR:M_HAIR,accs=[];ACC.forEach(([v,,grp])=>{if(Math.random()<.14&&!(grp&&accs.some(a=>ACC_GROUP[a]===grp)))accs.push(v);});
  savePick({g,skin:R(SKINS.length),face:Object.keys(FACES)[R(4)],eyes:Object.keys(EYES)[R(5)],hair:pool[R(pool.length)],hc:HAIRC[R(HAIRC.length)][0],dye:R(4)?'':DYES[1+R(DYES.length-1)][0],acc:accs,top:Object.keys(TOPS)[R(3)],tc:TOPC[R(TOPC.length)][0]});paint(box);};
 box.querySelector('[data-pl-reset]')?.addEventListener('click',()=>{try{localStorage.removeItem(KEY);}catch{}paint(box);});
 box.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>set({...PRESETS[+b.dataset.pre].l}));
 box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>set({[b.dataset.k]:b.dataset.k==='skin'?+b.dataset.v:b.dataset.v}));
 box.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{const L=current(),v=b.dataset.acc,grp=ACC_GROUP[v];let a=L.acc.filter(x=>x!==v);if(!L.acc.includes(v)){if(grp)a=a.filter(x=>ACC_GROUP[x]!==grp);a.push(v);}set({acc:a});});}
// 建立生涯後把造型存進存檔（舊存檔依名字自動產生）
function adopt(){const c=window.CAREER?.data;if(!c||c.look)return;c.look=norm(loadPick()||auto(c.name));try{CAREER.save();}catch{}}
const prev=renderSetup;renderSetup=function(){const r=prev.apply(this,arguments);try{adopt();mount();}catch(err){console.warn(err);}return r;};
// 左上角：建立生涯後，用自己的造型取代球衣圖示
function headerAvatar(){const em=document.querySelector('.life-emblem');if(!em)return;const c=window.CAREER?.data;let im=document.querySelector('.life-avatar');
 if(!c){if(im)im.remove();em.style.display='';return;}
 const src=url(of(c),{scale:3});if(!im){im=document.createElement('img');im.className='life-avatar';im.alt='';em.after(im);}if(im.dataset.src!==src){im.dataset.src=src;im.src=src;}em.style.display='none';}
setInterval(()=>{try{adopt();mount();headerAvatar();}catch{}},400);
window.PLAYER_LOOK={canvas,url,auto,norm,of,signature,PRESETS,STYLES};
})();
