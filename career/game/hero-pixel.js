'use strict';
// 0.64 英雄像素立繪（介面用）：24×32 格大頭小人，依英雄的稱號、風格與外觀設定組合零件，程式即時繪製。
// 只用在選角卡、英雄榜、BP、頭像等介面；戰場仍用原本的美術。不會讀寫遊戲狀態，也不會用 Math.random。
(()=>{
const W=24,H=32;
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function rgb(hex){const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
function toHex([r,g,b]){return '#'+[r,g,b].map(v=>clamp(v).toString(16).padStart(2,'0')).join('');}
const shade=(hex,k)=>toHex(rgb(hex).map(v=>k<0?v*(1+k):v+(255-v)*k));
const mix=(a,b,t)=>{const A=rgb(a),B=rgb(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t));};

const SKIN=['#f2c9a0','#e8b48a','#d39a6e','#b97c52','#8f5b3a','#f6d8b8'];
const HAIR=['#2a2430','#4a3324','#7a4a2a','#c99a4a','#d8d2c4','#8a2f2a','#3b3f5c','#e6c36a'];
const METAL='#9aa3b2',GOLD='#e0b04a',WOOD='#7a5230',DARK='#1d1a24',WHITE='#fbf6ea',EYE='#231c22';

// ── 依文字判斷零件 ──
const has=(t,re)=>re.test(t);
function design(i){const h=ROSTER[i],tw=h.tweak||{},t=`${h.name}${h.title}${h.skill}${h.style}`,cls=h.style.split('・')[0],R=hash('px'+h.name);
 const d={hi:h.hi,lo:h.lo,role:h.role,skin:SKIN[R%SKIN.length],hair:tw.hair||HAIR[(R>>>3)%HAIR.length],build:tw.build||1,cape:tw.cape||null,scarf:!!tw.scarf,head:tw.head||null,weapon:null,shield:!!tw.shield,body:'tunic',creature:null,extra:null};
 // 非人型：岩石、巨獸、骨、靈體
 if(has(t,/巨人|岩|山嶽|石像|磐/))d.creature='stone';
 else if(has(t,/熊|犀|龜|鯨/))d.creature='beast';
 else if(has(t,/骨|亡|冥|魂/))d.creature='bone';
 else if(has(t,/精靈|燈靈|靈體|幽靈|星蝶|花語/))d.creature='spirit';
 if(d.creature==='stone')d.skin=mix(h.lo,'#8c8a80',.55);
 if(d.creature==='beast')d.skin=mix(h.hi,'#7a6a52',.5);
 if(d.creature==='bone')d.skin='#e9e2cf';
 if(d.creature==='spirit')d.skin=mix(h.hi,'#ffffff',.55);
 // 服裝
 if(cls==='坦克'||has(t,/騎士|重騎|衛士|守衛|鎧|甲/))d.body='armor';
 else if(cls==='法師'||has(t,/祭司|術士|巫|法師|女祭司|先知|賢者/))d.body='robe';
 else if(cls==='刺客'||has(t,/忍|影|刺客|盜/))d.body='leather';
 else if(cls==='射手')d.body='coat';
 else if(cls==='輔助')d.body=has(t,/鐵拳|聖盾|鎖鏈|岩龜|雷鼓/)?'armor':'robe';
 if(tw.robe)d.body='robe';
 // 武器
 const W_=[[/弓|箭|矢|遊俠|羽射手|獵月/,'bow'],[/槍手|火藥|砲|鏢客|鐵翼|彈/,'gun'],[/鐮/,'scythe'],[/雙刀|刃蜂|雙/,'twin'],[/錘|鎚|鐵匠|鐵砧/,'hammer'],[/鐘/,'bell'],[/燈|燭/,'lantern'],[/拳/,'fist'],[/鎖|鏈|典獄/,'chain'],[/鼓/,'drum'],[/鏡/,'mirror'],[/槍兵|長槍|戟|矛|重騎|騎兵|三叉/,'spear'],[/劍|刃|斬|武者|浪人|斷鋼|一閃/,'sword'],[/杖|法師|術士|祭司|巫|焰|星|霜|雷|月|潮|花|藤|森/,'staff']];
 for(const [re,w] of W_)if(has(t,re)){d.weapon=w;break;}
 if(tw.weapon)d.weapon=tw.weapon==='trident'?'spear':tw.weapon;
 if(!d.weapon)d.weapon=cls==='射手'?'bow':cls==='法師'||cls==='輔助'?'staff':cls==='坦克'?'hammer':'sword';
 if(cls==='坦克'&&d.weapon!=='hammer'&&!d.creature)d.shield=true;
 if(has(t,/盾/))d.shield=true;
 if(d.weapon==='bow'||d.weapon==='gun'||d.weapon==='twin'||d.weapon==='drum')d.shield=false;
 // 頭飾
 if(!d.head){const H_=[[/狼|狐|豹|獵手/,'wolfhood'],[/鷹|鴉|鷲/,'beak'],[/羽|風|蝶/,'feather'],[/鹿|森|角/,'antler'],[/忍|刺客|影|盜|夜/,'hood'],[/法師|術士|巫|賢/,'wizard'],[/鏢客|牛仔|旅者|拓荒/,'brim'],[/騎士|衛|鎧|武者|將|重騎/,'helm'],[/祭司|女|月|潮|花|泉|聖/,'circlet'],[/沙|砂|旅/,'wrap']];
  for(const [re,v] of H_)if(has(t,re)){d.head=v;break;}}
 if(!d.head)d.head=['band','short','longhair','short'][R%4];
 if(d.creature==='stone'||d.creature==='beast')d.build=Math.max(d.build,1.25);
 if(has(t,/鬼面|武者/)&&d.head==='helm')d.head='kabuto';
 if(has(t,/精靈|狐|妖/))d.extra='ears';
 if(has(t,/龜/))d.extra='shell';
 if(has(t,/翼|鷹|蝶|鐵翼/))d.extra='wings';
 if(has(t,/王|后|皇/))d.head=d.head==='hood'?'hood':'crown';
 const o=OVR[h.name];if(FEMALE.has(h.name)&&!(o&&o.acc))d.acc='lash';if(o){Object.assign(d,o);
  if('creature' in o){if(o.creature===null)d.skin=SKIN[R%SKIN.length];if(o.creature==='stone')d.skin=mix(h.lo,'#8c8a80',.55);if(o.creature==='bone')d.skin='#e9e2cf';if(o.creature==='robot')d.skin='#b8c0cc';if(o.creature==='wood')d.skin=mix('#8a6a44',h.hi,.25);if(o.creature==='beast')d.skin=mix(h.hi,'#7a6a52',.5);}}
 return d;}
// 女性英雄（依名字與稱號）
const FEMALE=new Set(['朔夜','緋刃瑪琳','蛛后黛菈','焰心莉亞','霜弓希兒','潮音瑪琳','燈靈小螢','槍騎莉薇','夜豹琪塔','蜂后賽菈','冥狐紗月','流星拳小蓮','霜晶伊絲','月刃千夜','千面米拉','劍舞姬紅綾','星歌者艾莉','焰羽菲妮','月獵人夜音','星弓莉拉','晶弓瑟琳','瘴弓莫娜','花精靈蘿絲','風鈴巫女鈴音','星蝶緹緹','月泉祭司希雅','燭光修女瑟西']);
// 0.65 中路／射手個別造型，避免撞臉
const OVR={
 '焰心莉亞':{body:'dress',head:'twintail',hair:'#c8402a',weapon:'orb',orb:'#ff8a3a'},
 '砂語者薩伊':{body:'poncho',head:'wrap',weapon:'wand',acc:'mask'},
 '霜晶伊絲':{body:'dress',head:'bun',hair:'#e6eef6',weapon:'orb',orb:'#9fe4ff'},
 '雷咒師卡朗':{body:'cloak',head:'hood',weapon:'staff',orb:'#ffe45a',acc:'glasses'},
 '星師諾瓦':{body:'robe',head:'wizard',weapon:'book',acc:'glasses'},
 '傀儡師皮普':{body:'vest',head:'beret',weapon:'puppet'},
 '時砂翁':{body:'robe',head:'beard',weapon:'hourglass'},
 '暗焰莫格':{body:'cloak',head:'horns',weapon:'orb',orb:'#b05cff',acc:'mask'},
 '墨書生白硯':{body:'hanfu',head:'scholar',weapon:'brush',scarf:false},
 '菇巫婆婆':{body:'robe',head:'mushroom',hair:'#d8d2c4',weapon:'staff',orb:'#e0574a'},
 '星歌者艾莉':{body:'dress',head:'longhair',weapon:'lyre'},
 '渦流師澤恩':{body:'hanfu',head:'wrap',weapon:'wand',orb:'#4fd6e0'},
 '千面米拉':{body:'cloak',head:'longhair',hair:'#7a4a8a',weapon:'mirror',acc:'lash'},
 '劍舞姬紅綾':{body:'hanfu',head:'bun',weapon:'fan'},
 '霜弓希兒':{body:'cloak',head:'longhair',hair:'#a8d8ee',weapon:'bow',cape:'#5f9fc8',acc:'lash'},
 '風羽艾文':{body:'vest',head:'feather',weapon:'bow'},
 '火藥手布雷克':{body:'jacket',head:'tricorne',weapon:'rifle',acc:'eyepatch',shield:false},
 '雙槍羅可':{body:'poncho',head:'band',weapon:'pistols',scarf:true},
 '鷹眼老韓':{body:'vest',head:'beard',weapon:'bow',acc:'eyepatch',extra:null},
 '弩匠格斯':{body:'jacket',head:'goggles',weapon:'crossbow'},
 '焰羽菲妮':{body:'dress',head:'ponytail',hair:'#c8402a',weapon:'bow'},
 '電光伏特':{body:'jacket',head:'mohawk',weapon:'pistols',acc:'glasses'},
 '月獵人夜音':{body:'cloak',head:'longhair',hair:'#2e3a6a',extra:'ears',weapon:'bow'},
 '星弓莉拉':{body:'dress',head:'twintail',weapon:'bow'},
 '砲彈小子波波':{body:'vest',head:'goggles',weapon:'cannon',build:.9},
 '寒鴉諾爾':{body:'cloak',head:'beak',weapon:'rifle'},
 '晶弓瑟琳':{body:'coat',head:'circlet',weapon:'crossbow',orb:'#9fe4ff'},
 '鏢客傑西':{body:'poncho',head:'brim',weapon:'gun'},
 '瘴弓莫娜':{body:'cloak',head:'twintail',hair:'#6a8a3a',weapon:'bow',cape:'#3f5a3a'},
 '鐵翼艾瑞':{body:'jacket',head:'helm',weapon:'gun'},
 // 0.66 上路
 '格朗德':{body:'armor',head:'bald',weapon:'fist',build:1.4,acc:null},
 '緋刃瑪琳':{body:'leather',head:'ponytail',hair:'#c8402a',weapon:'twin'},
 '鐸雷克':{body:'armor',head:'helm',weapon:'spear',cape:'#3a4a7a',shield:false},
 '鐵匠布倫':{body:'vest',head:'goggles',acc:'beard',weapon:'hammer',shield:true},
 '狂劍薩德':{creature:null,body:'tunic',head:'mohawk',weapon:'greatsword',build:1.2},
 '荊棘公爵':{body:'armor',head:'crown',weapon:'whip',cape:'#2f4a26',shield:false},
 '蒼牙伯恩':{body:'leather',head:'wolfhood',weapon:'claws',build:1.15},
 '朔夜':{body:'hanfu',head:'ponytail',weapon:'katana',scarf:false},
 '山王厄格':{body:'armor',head:'crown',weapon:'hammer',build:1.4},
 '血伯爵羅森':{body:'jacket',head:'short',hair:'#e9e6df',weapon:'sword',creature:null},
 '鐸恩鐵鬚':{body:'armor',head:'hornhelm',acc:'beard',weapon:'hammer',build:1.25},
 '銅壁卡修':{body:'armor',head:'helm',weapon:'spear',shield:'tower',build:1.2},
 '霧刃無音':{body:'leather',head:'hood',acc:'mask',weapon:'katana'},
 '熔岩匠伊格':{creature:'stone',body:'robe',head:'horns',weapon:'orb',orb:'#ff6a2a'},
 '槍騎莉薇':{body:'coat',head:'circlet',weapon:'spear',shield:false},
 '收魂人摩爾':{creature:'bone',body:'cloak',head:'hood',weapon:'scythe',cape:'#2b2a34'},
 // 打野
 '影狼瓦爾':{body:'leather',head:'wolfhood',weapon:'twin'},
 '森語者歐蘭':{body:'robe',head:'antler',acc:'beard',weapon:'staff',orb:'#9be27a',shield:false},
 '蛛后黛菈':{body:'dress',head:'crown',weapon:'wand',extra:'spiderlegs',orb:'#c8a0e8'},
 '犀王格羅':{body:'armor',head:'rhino',weapon:'hammer',build:1.35},
 '夜豹琪塔':{body:'leather',head:'ponytail',hair:'#2a2430',extra:'ears',weapon:'claws'},
 '雷翼艾洛':{body:'tunic',head:'beak',weapon:'spear',extra:'wings'},
 '老苔熊巴庫':{body:'armor',head:'bearears',weapon:'fist',build:1.45},
 '蜂后賽菈':{body:'dress',head:'antennae',hair:'#e6c36a',weapon:'spear',extra:'wings',head2:'crown'},
 '冥狐紗月':{creature:null,body:'hanfu',head:'longhair',hair:'#e9e6df',extra:'ears',weapon:'orb',orb:'#6ad0ff'},
 '鬼面鐵心':{body:'armor',head:'kabuto',acc:'mask',weapon:'katana'},
 '藤守伍德':{creature:'wood',body:'tunic',head:'leafhair',weapon:'fist',build:1.3,shield:false},
 '雪狼王斯寇':{body:'leather',head:'crown',cape:'#e8eef2',weapon:'axe'},
 '鼓祭師烏魯':{body:'poncho',head:'feather',acc:'mask',weapon:'drum'},
 '鋼蠍七號':{creature:'robot',body:'armor',head:'visor',weapon:'claws',extra:'tail'},
 '燼騎士赫爾':{body:'armor',head:'hornhelm',weapon:'greatsword',cape:'#3c3330'},
 '流星拳小蓮':{body:'hanfu',head:'bun',weapon:'fist'},
 // 輔助
 '鐘守霍德':{body:'armor',head:'helm',weapon:'bell',shield:false},
 '潮音瑪琳':{body:'dress',head:'longhair',hair:'#4fb0c8',weapon:'spear',orb:'#6ad6e0'},
 '燈靈小螢':{body:'dress',head:'antennae',weapon:'lantern'},
 '獄卒杜克':{body:'armor',head:'helm',acc:'mask',weapon:'chain',build:1.2},
 '聖盾艾德溫':{body:'armor',head:'short',hair:'#e6c36a',weapon:'sword',shield:'tower'},
 '花精靈蘿絲':{body:'dress',head:'flowercrown',weapon:'wand',orb:'#ff9ac0'},
 '風鈴巫女鈴音':{body:'hanfu',head:'longhair',weapon:'bell'},
 '老岩龜圖圖':{head:'bald',acc:'beard',weapon:'staff',extra:'shell'},
 '星蝶緹緹':{body:'dress',head:'antennae',weapon:'wand',extra:'wings',orb:'#d6c8ff'},
 '雷鼓巨漢轟':{body:'vest',head:'mohawk',weapon:'drum',build:1.3},
 '月泉祭司希雅':{body:'robe',head:'circlet',weapon:'staff',orb:'#cfe6ff'},
 '霧鏡師沃倫':{body:'cloak',head:'wizard',acc:'glasses',weapon:'mirror'},
 '藤靈小芽':{creature:'wood',body:'tunic',head:'leafhair',weapon:'whip',build:.9},
 '燭光修女瑟西':{body:'robe',head:'veil',weapon:'lantern'},
 '鯨歌者奧凱':{creature:'beast',body:'vest',head:'bald',weapon:'spear',build:1.2},
 '鐵拳慧明':{body:'hanfu',head:'monk',weapon:'fist',build:1.1},
};

// ── 繪製到格子 ──
function sprite(i,frame=0){const d=design(i),g=Array.from({length:H},()=>Array(W).fill(null));
 const px=(x,y,c)=>{if(x>=0&&x<W&&y>=0&&y<H&&c)g[y][x]=c;};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let k=0;k<w;k++)px(x+k,y+j,c);};
 const bob=frame%2?1:0; // 待機呼吸：上半身下沉 1 格
 const bw=d.build>=1.35?12:d.build>=1.15?10:8,L=12-bw/2,Rt=L+bw-1; // 軀幹左右
 const top=17+bob,hy=7+bob;
 const hiD=shade(d.hi,-.25),loD=shade(d.lo,-.3),skinD=shade(d.skin,-.18);
 // 背後：披風、翅膀、龜殼
 if(d.cape){rect(L-1,top+1,bw+2,10-bob,d.cape);rect(L-1,top+9,bw+2,2,shade(d.cape,-.25));}
 if(d.extra==='wings'){for(let j=0;j<7;j++){rect(L-3-Math.floor(j/2),top-1+j,2,1,mix(d.hi,WHITE,.4));rect(Rt+2+Math.floor(j/2),top-1+j,2,1,mix(d.hi,WHITE,.4));}}
 if(d.extra==='shell')rect(L-2,top,bw+4,8,shade(d.lo,-.1)),rect(L-1,top+1,bw+2,6,mix(d.lo,'#6b8a4a',.4));
 // 腿與靴子（長袍蓋住腿）
 const legY=26;
 if(d.body==='robe'||d.body==='hanfu'){rect(L,top+8-bob,bw,legY-top-8+bob+4,d.body==='hanfu'?d.lo:d.hi);rect(L,29,bw,1,d.body==='hanfu'?loD:hiD);rect(L+1,30,3,1,DARK);rect(Rt-3,30,3,1,DARK);}
 else if(d.body==='dress'){for(let j=0;j<7-bob;j++){const w=bw+Math.min(4,Math.floor(j/1.5));rect((12-w/2)|0,top+6+j,w,1,j%5===4?shade(d.hi,.3):d.hi);}rect(L+2,29,1,1,d.skin);rect(Rt-2,29,1,1,d.skin);rect(L+1,30,3,1,DARK);rect(Rt-3,30,3,1,DARK);}
 else{const lc=d.body==='armor'?METAL:d.body==='leather'?shade(d.lo,-.2):d.lo;rect(L+1,legY,3,3,lc);rect(Rt-3,legY,3,3,lc);rect(L+1,29,3,2,DARK);rect(Rt-3,29,3,2,DARK);if(bw>8){rect(L+1,legY,1,3,shade(lc,-.15));}}
 // 軀幹
 if(d.body==='armor'){rect(L,top,bw,9,METAL);rect(L+2,top+1,bw-4,7,d.hi);rect(L,top+6,bw,1,GOLD);rect(L,top,bw,1,shade(METAL,.3));rect(L-1,top,2,3,shade(METAL,.15));rect(Rt,top,2,3,shade(METAL,.15));for(let k=L+3;k<Rt-1;k+=2)px(k,top+3,shade(d.hi,.35));}
 else if(d.body==='robe'){rect(L,top,bw,9,d.hi);rect(11,top,2,9,d.lo);rect(L,top+5,bw,1,GOLD);px(11,top+1,WHITE);px(12,top+1,WHITE);}
 else if(d.body==='leather'){rect(L,top,bw,9,d.lo);rect(L+1,top+1,bw-2,1,loD);rect(L,top+6,bw,1,shade(d.hi,-.1));rect(Rt-2,top+2,2,4,hiD);}
 else if(d.body==='coat'){rect(L,top,bw,9,d.hi);rect(11,top,2,9,WHITE);rect(L,top+6,bw,1,DARK);px(12,top+7,GOLD);rect(L,top+7,2,2,hiD);rect(Rt-1,top+7,2,2,hiD);}
 else if(d.body==='dress'){rect(L,top,bw,7,d.hi);rect(L+1,top,bw-2,1,WHITE);rect(L,top+5,bw,1,d.lo);px(11,top+2,d.lo);px(12,top+2,d.lo);}
 else if(d.body==='hanfu'){rect(L,top,bw,9,d.hi);for(let j=0;j<4;j++){px(L+2+j,top+j,WHITE);px(Rt-2-j,top+j,WHITE);}rect(L,top+5,bw,2,d.lo);px(11,top+5,GOLD);px(12,top+5,GOLD);}
 else if(d.body==='vest'){rect(L,top,bw,9,WHITE);rect(L,top,3,8,d.lo);rect(Rt-2,top,3,8,d.lo);rect(L,top+7,bw,2,d.hi);px(L+2,top+3,GOLD);px(Rt-2,top+3,GOLD);}
 else if(d.body==='jacket'){rect(L,top,bw,9,d.hi);rect(11,top+1,2,6,DARK);rect(L,top+7,bw,2,'#3b3f4a');px(10,top,WHITE);px(13,top,WHITE);rect(L,top,bw,1,shade(d.hi,.25));px(L+1,top+4,GOLD);}
 else if(d.body==='poncho'){rect(L-1,top,bw+2,7,d.lo);for(let k=L-1;k<=Rt+1;k++)px(k,top+3,(k%2)?GOLD:d.hi);rect(L+1,top+7,bw-2,2,shade(d.lo,-.25));}
 else if(d.body==='cloak'){const c=d.cape||shade(d.lo,-.15);rect(L-1,top,bw+2,10,c);rect(11,top+1,2,8,shade(c,-.25));px(11,top+1,GOLD);px(12,top+1,GOLD);rect(L-1,top+9,bw+2,1,shade(c,-.3));}
 else{rect(L,top,bw,9,d.hi);rect(L,top+6,bw,1,loD);px(11,top+6,GOLD);px(12,top+6,GOLD);rect(L,top,bw,1,shade(d.hi,.25));}
 if(d.scarf){rect(L+1,top,bw-2,2,d.lo);rect(Rt-1,top+2,2,3,d.lo);}
 // 手臂與手
 const armC=d.body==='armor'?METAL:d.body==='leather'||d.body==='poncho'?d.lo:d.body==='vest'?WHITE:d.body==='cloak'?(d.cape||shade(d.lo,-.15)):d.hi;
 if(d.body==='hanfu'){rect(L-3,top+1,3,6,d.hi);rect(Rt+1,top+1,3,6,d.hi);rect(L-3,top+6,3,1,d.lo);rect(Rt+1,top+6,3,1,d.lo);}
 rect(L-2,top+1,2,5,armC);rect(Rt+1,top+1,2,5,armC);px(L-2,top+6,d.skin);px(L-1,top+6,d.skin);px(Rt+1,top+6,d.skin);px(Rt+2,top+6,d.skin);
 // 頭
 const hx=7,hw=10;
 rect(hx,hy+1,hw,8,d.skin);rect(hx+1,hy,hw-2,1,d.skin);rect(hx,hy+8,hw,1,skinD);
 if(d.creature==='stone'){px(hx+2,hy+2,shade(d.skin,-.15));px(hx+7,hy+6,shade(d.skin,-.15));px(hx+8,hy+3,shade(d.skin,-.15));}
 const eyeC=d.creature==='spirit'?shade(d.lo,-.4):d.creature==='bone'?'#3a2030':EYE;
 rect(hx+2,hy+4,1,2,eyeC);rect(hx+7,hy+4,1,2,eyeC);
 if(d.creature==='bone'){rect(hx+2,hy+4,2,2,'#3a2030');rect(hx+6,hy+4,2,2,'#3a2030');rect(hx+3,hy+7,4,1,'#cfc6ad');}
 else{px(hx+1,hy+6,mix(d.skin,'#e88a8a',.45));px(hx+8,hy+6,mix(d.skin,'#e88a8a',.45));}
 if(d.extra==='ears'){rect(hx-1,hy-2,2,3,d.hair);rect(hx+hw-1,hy-2,2,3,d.hair);px(hx,hy-1,mix(d.hair,'#f4b6b6',.5));px(hx+hw-1,hy-1,mix(d.hair,'#f4b6b6',.5));}
 // 頭髮／頭飾
 const hairD=shade(d.hair,-.3),hd=d.head;
 const hairCap=()=>{rect(hx,hy,hw,2,d.hair);rect(hx-1,hy+1,1,3,d.hair);rect(hx+hw,hy+1,1,3,d.hair);px(hx+1,hy+2,d.hair);px(hx+hw-2,hy+2,d.hair);};
 if(hd==='short')hairCap();
 else if(hd==='longhair'){hairCap();rect(hx-1,hy+3,2,8,d.hair);rect(hx+hw-1,hy+3,2,8,d.hair);rect(hx-1,hy+10,2,1,hairD);rect(hx+hw-1,hy+10,2,1,hairD);}
 else if(hd==='band'){hairCap();rect(hx-1,hy+2,hw+2,1,d.lo);px(hx+hw+1,hy+3,d.lo);px(hx+hw+2,hy+4,d.lo);rect(hx+1,hy-1,hw-2,1,d.hair);}
 else if(hd==='helm'||hd==='kabuto'){rect(hx-1,hy-2,hw+2,4,METAL);rect(hx,hy-3,hw,1,METAL);rect(hx-1,hy+2,2,5,METAL);rect(hx+hw-1,hy+2,2,5,METAL);rect(hx-1,hy+1,hw+2,1,shade(METAL,-.25));px(11,hy-4,d.hi);px(12,hy-4,d.hi);rect(11,hy-6,2,2,d.hi);
  if(hd==='kabuto'){rect(hx-3,hy-5,2,1,GOLD);rect(hx-2,hy-4,1,2,GOLD);rect(hx+hw+1,hy-5,2,1,GOLD);rect(hx+hw+1,hy-4,1,2,GOLD);rect(hx-2,hy+1,hw+4,1,shade(METAL,-.35));}}
 else if(hd==='hood'){const c=d.cape||shade(d.lo,-.15);rect(hx-1,hy-2,hw+2,4,c);rect(hx,hy-3,hw,1,c);rect(hx-1,hy+2,2,7,c);rect(hx+hw-1,hy+2,2,7,c);rect(hx+1,hy+6,hw-2,3,shade(c,-.1));px(hx+2,hy+4,mix(d.hi,WHITE,.3));px(hx+7,hy+4,mix(d.hi,WHITE,.3));}
 else if(hd==='wizard'){hairCap();rect(hx-2,hy,hw+4,2,d.lo);rect(hx+1,hy-2,hw-2,2,d.lo);rect(hx+2,hy-4,hw-4,2,d.lo);rect(hx+4,hy-6,3,2,d.lo);rect(hx+6,hy-8,2,2,d.lo);px(hx+8,hy-8,d.lo);rect(hx-2,hy+1,hw+4,1,GOLD);px(hx+5,hy-3,GOLD);}
 else if(hd==='wolfhood'){const c=d.cape||shade(d.lo,-.1);rect(hx-1,hy-2,hw+2,4,c);rect(hx-1,hy+2,2,5,c);rect(hx+hw-1,hy+2,2,5,c);rect(hx,hy-4,2,2,c);rect(hx+hw-2,hy-4,2,2,c);px(hx+1,hy-3,mix(c,'#f4b6b6',.4));px(hx+hw-2,hy-3,mix(c,'#f4b6b6',.4));px(hx+4,hy-1,WHITE);px(hx+5,hy-1,WHITE);}
 else if(hd==='beak'){hairCap();rect(hx-1,hy-1,hw+2,3,d.cape||d.lo);rect(hx+3,hy+3,4,1,GOLD);rect(hx+4,hy+4,2,2,GOLD);rect(hx+hw,hy-3,2,3,WHITE);rect(hx-2,hy-3,2,3,WHITE);}
 else if(hd==='feather'){hairCap();rect(hx-1,hy+2,hw+2,1,d.lo);rect(hx+hw-1,hy-5,1,5,d.hi);rect(hx+hw,hy-7,1,4,mix(d.hi,WHITE,.3));px(hx+hw+1,hy-8,mix(d.hi,WHITE,.5));}
 else if(hd==='antler'){hairCap();const c='#9a7448';rect(hx,hy-4,1,4,c);rect(hx-2,hy-4,2,1,c);rect(hx-2,hy-6,1,2,c);px(hx+1,hy-6,c);rect(hx+hw-1,hy-4,1,4,c);rect(hx+hw,hy-4,2,1,c);rect(hx+hw+1,hy-6,1,2,c);px(hx+hw-2,hy-6,c);}
 else if(hd==='brim'){hairCap();rect(hx-3,hy,hw+6,1,shade(d.lo,-.2));rect(hx,hy-4,hw,4,d.lo);rect(hx,hy-1,hw,1,GOLD);}
 else if(hd==='wrap'){rect(hx-1,hy-2,hw+2,4,mix(d.hi,WHITE,.5));rect(hx-1,hy+2,2,3,mix(d.hi,WHITE,.4));rect(hx,hy-1,hw,1,mix(d.hi,WHITE,.25));px(11,hy-1,d.lo);px(12,hy-1,d.lo);rect(hx+hw,hy+2,1,6,mix(d.hi,WHITE,.4));}
 else if(hd==='circlet'){hairCap();rect(hx-1,hy+3,2,6,d.hair);rect(hx+hw-1,hy+3,2,6,d.hair);rect(hx,hy+1,hw,1,GOLD);px(11,hy,d.hi);px(12,hy,d.hi);}
 else if(hd==='twintail'){hairCap();rect(hx-3,hy+1,2,9,d.hair);rect(hx+hw+1,hy+1,2,9,d.hair);px(hx-1,hy+1,d.lo);px(hx+hw,hy+1,d.lo);rect(hx-3,hy+9,2,1,hairD);rect(hx+hw+1,hy+9,2,1,hairD);}
 else if(hd==='ponytail'){hairCap();rect(hx+hw,hy,2,2,d.lo);rect(hx+hw+1,hy+1,2,8,d.hair);rect(hx+hw+1,hy+8,2,1,hairD);}
 else if(hd==='bun'){hairCap();rect(hx+3,hy-3,4,3,d.hair);px(hx+2,hy-2,d.hi);px(hx+7,hy-2,d.hi);rect(hx-1,hy+3,1,4,d.hair);rect(hx+hw,hy+3,1,4,d.hair);}
 else if(hd==='beard'){const w='#e9e6df';rect(hx-1,hy+2,2,4,w);rect(hx+hw-1,hy+2,2,4,w);rect(hx+1,hy+6,hw-2,4,w);rect(hx+3,hy+10,4,2,w);rect(hx+2,hy+3,2,1,w);rect(hx+6,hy+3,2,1,w);px(hx+4,hy+7,mix(d.skin,'#b05050',.4));px(hx+5,hy+7,mix(d.skin,'#b05050',.4));}
 else if(hd==='beret'){hairCap();rect(hx-1,hy-2,hw+1,3,d.lo);rect(hx+2,hy-3,hw-3,1,d.lo);px(hx+5,hy-4,d.lo);}
 else if(hd==='goggles'){hairCap();rect(hx-1,hy+1,hw+2,1,'#4a3a2a');rect(hx+1,hy,3,3,'#4a3a2a');rect(hx+6,hy,3,3,'#4a3a2a');px(hx+2,hy+1,'#9fe4ff');px(hx+7,hy+1,'#9fe4ff');}
 else if(hd==='tricorne'){hairCap();rect(hx-3,hy-1,hw+6,2,'#2a2430');rect(hx,hy-4,hw,3,'#2a2430');rect(hx-3,hy-1,hw+6,1,GOLD);px(hx-3,hy-2,'#2a2430');px(hx+hw+2,hy-2,'#2a2430');px(hx+4,hy-3,WHITE);}
 else if(hd==='mohawk'){rect(hx,hy,hw,1,shade(d.skin,-.1));rect(hx+4,hy-4,2,5,d.hi);rect(hx+3,hy-2,4,2,d.hi);px(hx+4,hy-5,mix(d.hi,WHITE,.4));}
 else if(hd==='horns'){const c=shade(d.lo,-.2);rect(hx-1,hy-1,hw+2,3,c);rect(hx-1,hy+2,2,6,c);rect(hx+hw-1,hy+2,2,6,c);rect(hx-2,hy-4,2,3,'#e8dcc0');px(hx-1,hy-5,'#e8dcc0');rect(hx+hw,hy-4,2,3,'#e8dcc0');px(hx+hw,hy-5,'#e8dcc0');}
 else if(hd==='mushroom'){rect(hx-3,hy-1,hw+6,3,'#d8483a');rect(hx-1,hy-3,hw+2,2,'#d8483a');rect(hx+1,hy-4,hw-2,1,'#d8483a');px(hx,hy-2,WHITE);px(hx+5,hy-3,WHITE);px(hx+8,hy-1,WHITE);px(hx-2,hy,WHITE);rect(hx-1,hy+2,2,5,d.hair);rect(hx+hw-1,hy+2,2,5,d.hair);}
 else if(hd==='scholar'){rect(hx,hy-3,hw,4,'#24222a');rect(hx-4,hy-2,4,1,'#24222a');rect(hx+hw,hy-2,4,1,'#24222a');rect(hx,hy,hw,1,GOLD);rect(hx-1,hy+1,1,3,'#24222a');rect(hx+hw,hy+1,1,3,'#24222a');}
 else if(hd==='bald'){rect(hx+1,hy,hw-2,1,shade(d.skin,.15));px(hx+2,hy+1,shade(d.skin,.25));}
 else if(hd==='monk'){rect(hx+1,hy,hw-2,1,shade(d.skin,.15));px(hx+3,hy+1,'#c0503a');px(hx+5,hy+1,'#c0503a');px(hx+7,hy+1,'#c0503a');}
 else if(hd==='hornhelm'){rect(hx-1,hy-2,hw+2,4,'#6a6e7a');rect(hx,hy-3,hw,1,'#6a6e7a');rect(hx-1,hy+2,2,4,'#6a6e7a');rect(hx+hw-1,hy+2,2,4,'#6a6e7a');rect(hx-1,hy+1,hw+2,1,GOLD);rect(hx-3,hy-3,2,2,'#e8dcc0');px(hx-3,hy-5,'#e8dcc0');px(hx-3,hy-4,'#e8dcc0');rect(hx+hw+1,hy-3,2,2,'#e8dcc0');px(hx+hw+2,hy-5,'#e8dcc0');px(hx+hw+2,hy-4,'#e8dcc0');}
 else if(hd==='veil'){const c='#2a2a36';rect(hx-1,hy-2,hw+2,3,c);rect(hx-1,hy+1,2,9,c);rect(hx+hw-1,hy+1,2,9,c);rect(hx,hy+1,hw,1,WHITE);px(11,hy-1,GOLD);px(12,hy-1,GOLD);}
 else if(hd==='flowercrown'){hairCap();rect(hx-1,hy+3,2,6,d.hair);rect(hx+hw-1,hy+3,2,6,d.hair);for(let k=0;k<hw+2;k+=2)px(hx-1+k,hy,k%4?'#ff9ac0':'#fff3a0');for(let k=1;k<hw+2;k+=2)px(hx-1+k,hy,'#6ab04a');}
 else if(hd==='leafhair'){const g='#5aa04a',gd='#3f7a36';rect(hx-1,hy-1,hw+2,3,g);rect(hx,hy-3,2,2,g);rect(hx+4,hy-4,2,3,g);rect(hx+8,hy-3,2,2,g);px(hx+5,hy-4,gd);px(hx+1,hy-2,gd);rect(hx-1,hy+2,1,3,gd);rect(hx+hw,hy+2,1,3,gd);}
 else if(hd==='antennae'){hairCap();rect(hx+2,hy-4,1,4,DARK);rect(hx+7,hy-4,1,4,DARK);px(hx+1,hy-5,d.hi);px(hx+8,hy-5,d.hi);if(d.head2==='crown'){rect(hx+3,hy-1,4,1,GOLD);px(hx+3,hy-2,GOLD);px(hx+6,hy-2,GOLD);}}
 else if(hd==='bearears'){rect(hx,hy,hw,2,shade(d.skin,-.1));rect(hx-1,hy-2,3,3,shade(d.skin,-.2));rect(hx+hw-2,hy-2,3,3,shade(d.skin,-.2));px(hx,hy-1,mix(d.skin,'#f4b6b6',.4));px(hx+hw-1,hy-1,mix(d.skin,'#f4b6b6',.4));rect(hx+3,hy+6,4,2,shade(d.skin,.25));px(hx+4,hy+6,DARK);px(hx+5,hy+6,DARK);}
 else if(hd==='rhino'){rect(hx,hy,hw,2,shade(d.skin,-.1));rect(hx+3,hy+6,4,2,shade(d.skin,.15));rect(hx+4,hy+3,2,3,'#e8dcc0');px(hx+4,hy+2,'#e8dcc0');rect(hx-1,hy-1,2,2,shade(d.skin,-.2));rect(hx+hw-1,hy-1,2,2,shade(d.skin,-.2));}
 else if(hd==='visor'){rect(hx-1,hy-1,hw+2,3,'#6a7280');rect(hx,hy+3,hw,2,'#2a2e38');rect(hx+1,hy+3,hw-2,1,'#ff5a4a');rect(hx-1,hy+2,1,5,'#6a7280');rect(hx+hw,hy+2,1,5,'#6a7280');rect(11,hy-3,2,2,'#6a7280');px(11,hy-4,'#ff5a4a');}
 else if(hd==='crown'){hairCap();rect(hx+1,hy-2,hw-2,2,GOLD);px(hx+1,hy-3,GOLD);px(hx+4,hy-3,GOLD);px(hx+5,hy-3,GOLD);px(hx+hw-2,hy-3,GOLD);px(11,hy-1,d.hi);px(12,hy-1,d.hi);}
 // 臉部配件
 if(d.acc==='mask'){rect(hx,hy+3,hw,3,shade(d.lo,-.35));px(hx+2,hy+4,mix(d.hi,WHITE,.4));px(hx+7,hy+4,mix(d.hi,WHITE,.4));}
 else if(d.acc==='eyepatch'){rect(hx+6,hy+3,3,3,DARK);rect(hx,hy+3,hw,1,DARK);}
 else if(d.acc==='beard'){const bc=d.head==='bald'||d.head==='hornhelm'||d.head==='goggles'?'#d8cbb0':shade(d.hair,-.05);rect(hx,hy+6,hw,3,bc);rect(hx+2,hy+9,hw-4,2,bc);rect(hx+3,hy+5,4,1,bc);px(hx+4,hy+7,mix(d.skin,'#b05050',.4));px(hx+5,hy+7,mix(d.skin,'#b05050',.4));}
 else if(d.acc==='lash'){px(hx+1,hy+3,EYE);px(hx+8,hy+3,EYE);rect(hx+4,hy+7,2,1,'#d86a7a');}
 else if(d.acc==='glasses'){rect(hx+1,hy+3,3,3,'#3a3040');rect(hx+6,hy+3,3,3,'#3a3040');px(hx+2,hy+4,'#cfe6f2');px(hx+7,hy+4,'#cfe6f2');rect(hx+4,hy+4,2,1,'#3a3040');}
 // 武器（右手 x≈Rt+2，左手 x≈L-2）
 const hxR=Rt+2,hyH=top+6,wpn=d.weapon;
 if(wpn==='spear'){rect(hxR,1+bob,1,29,WOOD);rect(hxR-1,0+bob,3,1,METAL);rect(hxR,-2+bob+2,1,3,METAL);px(hxR,0+bob,shade(METAL,.4));rect(hxR-1,4+bob,3,1,d.hi);}
 else if(wpn==='sword'){rect(hxR,hyH-12,1,11,shade(METAL,.25));px(hxR+1,hyH-11,METAL);rect(hxR-1,hyH-1,3,1,GOLD);rect(hxR,hyH,1,2,WOOD);px(hxR,hyH-13,WHITE);}
 else if(wpn==='twin'){rect(hxR,hyH-6,1,6,shade(METAL,.3));px(hxR,hyH-7,WHITE);rect(L-3,hyH-6,1,6,shade(METAL,.3));px(L-3,hyH-7,WHITE);px(hxR,hyH,GOLD);px(L-3,hyH,GOLD);}
 else if(wpn==='hammer'){rect(hxR,hyH-11,1,14,WOOD);rect(hxR-2,hyH-14,5,4,METAL);rect(hxR-2,hyH-14,5,1,shade(METAL,.35));rect(hxR-2,hyH-11,5,1,shade(METAL,-.3));}
 else if(wpn==='staff'){rect(hxR,hyH-14,1,20,WOOD);rect(hxR-1,hyH-17,3,3,d.orb||mix(d.hi,WHITE,.35));px(hxR,hyH-16,WHITE);px(hxR-2,hyH-16,shade(d.hi,.2));px(hxR+2,hyH-16,shade(d.hi,.2));}
 else if(wpn==='bow'){const x0=L-4;for(let j=0;j<15;j++){const off=j<3||j>11?1:0;px(x0+off,top-5+j,WOOD);}rect(x0+2,top-4,1,13,'#e8e0cc');px(Rt+2,top-2,WOOD);rect(Rt+2,top-6,1,5,WOOD);px(Rt+2,top-7,METAL);}
 else if(wpn==='gun'){rect(hxR-3,hyH-2,8,2,'#4a4a52');rect(hxR+4,hyH-2,1,1,DARK);rect(hxR-2,hyH,2,2,WOOD);px(hxR+1,hyH-3,GOLD);}
 else if(wpn==='scythe'){rect(hxR,hyH-14,1,20,'#5b4a3a');rect(hxR-6,hyH-14,6,1,shade(METAL,.3));rect(hxR-6,hyH-13,2,1,shade(METAL,.3));px(hxR-6,hyH-12,shade(METAL,.3));}
 else if(wpn==='bell'){rect(hxR,hyH-3,1,3,WOOD);rect(hxR-2,hyH-7,5,4,GOLD);rect(hxR-3,hyH-3,7,1,shade(GOLD,-.2));px(hxR,hyH-8,GOLD);}
 else if(wpn==='lantern'){rect(hxR,hyH-6,1,6,WOOD);rect(hxR-2,hyH-5,5,1,DARK);rect(hxR-2,hyH-4,5,4,mix(d.hi,'#fff2a8',.6));rect(hxR-1,hyH-3,3,2,'#fff8d0');rect(hxR-2,hyH,5,1,DARK);}
 else if(wpn==='fist'){rect(L-3,top+5,3,3,GOLD);rect(Rt+1,top+5,3,3,GOLD);}
 else if(wpn==='chain'){for(let j=0;j<9;j++)px(hxR+(j%2),hyH-j,METAL);rect(hxR-1,hyH-11,3,2,shade(METAL,-.2));}
 else if(wpn==='drum'){rect(L-1,top+3,bw+2,5,mix(d.lo,'#b0563a',.5));rect(L-1,top+3,bw+2,1,WHITE);rect(L-1,top+7,bw+2,1,GOLD);}
 else if(wpn==='mirror'){rect(hxR-1,hyH-8,3,5,'#cfe6f2');rect(hxR-2,hyH-8,1,5,GOLD);rect(hxR+2,hyH-8,1,5,GOLD);px(hxR,hyH-7,WHITE);rect(hxR,hyH-3,1,3,GOLD);}
 const orb=d.orb||mix(d.hi,WHITE,.35);
 if(wpn==='orb'){rect(hxR,hyH-9,3,3,orb);rect(hxR+1,hyH-10,1,5,orb);rect(hxR-1,hyH-8,5,1,orb);px(hxR+1,hyH-8,WHITE);px(hxR-1,hyH-11,mix(orb,WHITE,.5));px(hxR+3,hyH-5,mix(orb,WHITE,.5));}
 else if(wpn==='book'){rect(L-6,top+3,5,4,'#7a3a2a');rect(L-5,top+3,3,3,WHITE);px(L-4,top+4,d.lo);rect(hxR,hyH-5,1,5,WOOD);px(hxR,hyH-6,GOLD);}
 else if(wpn==='wand'){rect(hxR,hyH-6,1,7,WOOD);rect(hxR-1,hyH-8,3,1,orb);rect(hxR,hyH-9,1,3,orb);px(hxR,hyH-8,WHITE);}
 else if(wpn==='hourglass'){rect(hxR-1,hyH-8,5,1,GOLD);rect(hxR-1,hyH-1,5,1,GOLD);rect(hxR,hyH-7,3,2,'#f4e6b0');px(hxR+1,hyH-5,'#e6c36a');rect(hxR,hyH-4,3,3,'#e6c36a');px(hxR-1,hyH-6,GOLD);px(hxR+3,hyH-6,GOLD);px(hxR-1,hyH-3,GOLD);px(hxR+3,hyH-3,GOLD);}
 else if(wpn==='puppet'){rect(hxR,hyH-6,3,1,WOOD);for(let j=0;j<4;j++)px(hxR+1,hyH-5+j,'#d8d2c4');rect(hxR,hyH-1,3,3,d.lo);px(hxR+1,hyH-2,'#f2c9a0');rect(hxR,hyH+2,1,2,d.lo);rect(hxR+2,hyH+2,1,2,d.lo);}
 else if(wpn==='brush'){rect(hxR,hyH-12,1,13,WOOD);rect(hxR-1,hyH+1,3,3,DARK);px(hxR,hyH+4,DARK);rect(hxR,hyH-13,1,1,GOLD);}
 else if(wpn==='crossbow'){rect(hxR-3,hyH-2,7,1,WOOD);rect(hxR+3,hyH-5,1,7,d.orb||WOOD);rect(hxR-3,hyH-1,1,1,METAL);rect(hxR-2,hyH,2,2,WOOD);}
 else if(wpn==='cannon'){rect(Rt-2,top-3,9,4,'#4a4a52');rect(Rt+6,top-4,2,6,'#2a2a30');rect(Rt-1,top-2,7,1,shade('#4a4a52',.3));px(Rt-3,top-2,GOLD);}
 else if(wpn==='pistols'){rect(hxR,hyH-2,4,2,'#4a4a52');rect(hxR,hyH,1,2,WOOD);rect(L-6,hyH-2,4,2,'#4a4a52');rect(L-3,hyH,1,2,WOOD);px(hxR+3,hyH-2,GOLD);px(L-6,hyH-2,GOLD);}
 else if(wpn==='rifle'){for(let j=0;j<12;j++)px(hxR+2-Math.floor(j/3),hyH-10+j,j<8?'#4a4a52':WOOD);px(hxR+2,hyH-11,DARK);px(hxR+3,hyH-9,DARK);}
 else if(wpn==='lyre'){rect(hxR-1,hyH-7,1,6,GOLD);rect(hxR+3,hyH-7,1,6,GOLD);rect(hxR-1,hyH-1,5,1,GOLD);for(let k=0;k<3;k++)rect(hxR+k,hyH-6,1,5,'#f4ead0');px(hxR-2,hyH-8,GOLD);px(hxR+4,hyH-8,GOLD);}
 else if(wpn==='fan'){rect(hxR-2,hyH-6,6,1,d.lo);rect(hxR-1,hyH-5,5,1,d.hi);rect(hxR,hyH-4,3,1,d.lo);px(hxR+1,hyH-3,WOOD);rect(L-5,hyH-6,6,1,d.lo);rect(L-4,hyH-5,5,1,d.hi);rect(L-3,hyH-4,3,1,d.lo);}
 if(wpn==='greatsword'){rect(hxR,hyH-15,2,14,shade(METAL,.25));px(hxR+1,hyH-16,WHITE);rect(hxR-2,hyH-1,6,1,GOLD);rect(hxR,hyH,2,3,WOOD);}
 else if(wpn==='katana'){for(let j=0;j<12;j++)px(hxR+(j<4?1:0),hyH-1-j,shade(METAL,.35));rect(hxR-1,hyH,3,1,GOLD);rect(hxR,hyH+1,1,3,'#3a2a3a');}
 else if(wpn==='axe'){rect(hxR,hyH-12,1,15,WOOD);rect(hxR+1,hyH-13,3,5,METAL);rect(hxR+3,hyH-14,1,7,shade(METAL,.3));rect(hxR-2,hyH-12,2,3,METAL);}
 else if(wpn==='claws'){for(const x0 of [hxR,L-3]){px(x0,hyH+1,METAL);px(x0+1,hyH+1,METAL);px(x0,hyH+2,shade(METAL,.4));px(x0+1,hyH+3,shade(METAL,.4));px(x0-1,hyH+2,shade(METAL,.4));}}
 else if(wpn==='whip'){const c='#4a8a3a';rect(hxR,hyH-2,1,3,WOOD);for(let j=0;j<10;j++)px(hxR+1+Math.round(Math.sin(j/1.6)*1.5),hyH-3-j,c);px(hxR+2,hyH-13,'#d84a6a');}
 if(d.extra==='spiderlegs'){const c=shade(d.lo,-.3);for(let j=0;j<3;j++){rect(L-4,top+1+j*3,3,1,c);px(L-5,top+2+j*3,c);rect(Rt+2,top+1+j*3,3,1,c);px(Rt+5,top+2+j*3,c);}}
 if(d.extra==='tail'){const c='#8a92a0';for(let j=0;j<8;j++)px(L-2-Math.floor(j/2),top+8-j,c);rect(L-7,top+1,3,2,'#ff5a4a');}
 if(d.shield==='tower'){const sx=L-7,sy=top-2;rect(sx,sy,6,11,shade(d.hi,-.1));rect(sx,sy,6,1,GOLD);rect(sx,sy+10,6,1,GOLD);rect(sx,sy,1,11,GOLD);rect(sx+5,sy,1,11,GOLD);rect(sx+2,sy+3,2,5,WHITE);rect(sx+1,sy+4,4,1,WHITE);}
 else if(d.shield){const sx=L-6,sy=top+1;rect(sx,sy,5,7,shade(d.lo,-.05));rect(sx,sy,5,1,METAL);rect(sx,sy+6,5,1,METAL);rect(sx+1,sy+7,3,1,METAL);rect(sx+2,sy+2,1,3,GOLD);px(sx+1,sy+3,GOLD);px(sx+3,sy+3,GOLD);}
 // 靈體：腳下發光
 if(d.creature==='spirit'){rect(L,30,bw,1,mix(d.hi,WHITE,.5));}
 // 外框
 const out=g.map(r=>r.slice());for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!g[y][x]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>g[y+b]?.[x+a]))out[y][x]=DARK;
 return out;}

const cache=new Map();
function canvas(i,{scale=4,frame=0}={}){const key=i+':'+scale+':'+frame;if(cache.has(key))return cache.get(key);const g=sprite(i,frame),c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;const x=c.getContext('2d');
 for(let y=0;y<H;y++)for(let k=0;k<W;k++)if(g[y][k]){x.fillStyle=g[y][k];x.fillRect(k*scale,y*scale,scale,scale);}cache.set(key,c);return c;}
const urlCache=new Map();function dataURL(i,o){const k=i+':'+(o?.scale||4)+':'+(o?.frame||0);let u=urlCache.get(k);if(!u){u=canvas(i,o).toDataURL();urlCache.set(k,u);}return u;}
// 把畫好的圖放進 <canvas>（呼吸動畫兩格）
function paint(el,i,scale=4,frame=0){el.width=W*scale;el.height=H*scale;const x=el.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,el.width,el.height);x.drawImage(canvas(i,{scale,frame}),0,0);}
window.HERO_PIXEL={W,H,design,sprite,canvas,dataURL,paint};
})();
