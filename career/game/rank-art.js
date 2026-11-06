'use strict';
// 0.78 天梯段位徽章：32×32 像素畫，左右對稱，段位越高裝飾越多（翅膀→寶石→王冠→犄角→光芒）。
(()=>{
const N=32;
// [主色, 亮色, 暗色, 點綴, 外框]
const PAL=[
 ['#6e5f53','#9a8775','#40352d','#b4643a','#221b16'], // 鏽鐵
 ['#a8643a','#dc9a62','#683819','#f2c08c','#2e170a'], // 赤銅
 ['#93a8bf','#e3eef8','#56697f','#ffffff','#202b38'], // 霜銀
 ['#d6a12a','#ffe27c','#87600f','#fff4bf','#3a2804'], // 耀金
 ['#4fb9b4','#b6f3ec','#25716e','#efffff','#0e2e2d'], // 晶鉑
 ['#2ea463','#86e3a8','#165c37','#d4ffe2','#08281a'], // 翠曜
 ['#6a86f5','#c9d5ff','#3042a3','#ffffff','#141d4c'], // 鑽晶
 ['#9656d4','#d8acff','#542689','#ffe1ff','#24103c'], // 霧河大師
 ['#cf4239','#ff9f8e','#7a1b17','#ffd679','#330807'], // 霧河宗師
 ['#3b9fe6','#c4e8ff','#1b588a','#ffd54d','#0b2338'], // 巔峰王者
];
const WING=[0,0,3,4,5,6,7,7,8,9],GEM=[1,1,1,2,2,2,3,3,3,3];
function grid(t){const g=Array.from({length:N},()=>Array(N).fill(null)),P=PAL[t],[base,light,dark,acc]=P,gold='#ffd54d',goldD='#a8780f';
 const put=(x,y,c)=>{if(x>=0&&x<N&&y>=0&&y<N){g[y][x]=c;g[y][N-1-x]=c;}};
 // 王者：背後光芒
 if(t===9)for(let a=0;a<12;a++){const ang=a/12*Math.PI*2;for(let r=10;r<16;r++){const x=Math.round(15.5+Math.cos(ang)*r-.5),y=Math.round(16+Math.sin(ang)*r);if(x<16&&y>=0&&y<N&&r%2===0)put(x,y,'#ffe78a');}}
 // 翅膀（羽毛分層）
 const span=WING[t];for(let k=0;k<span;k++){const x=8-1-k,top=10+Math.round(k*.7),bot=21-Math.round(k*1.1);for(let y=top;y<=bot;y++)put(x,y,(y-top)%3===0?light:k%2?dark:base);}
 // 霧河：翅尖霧氣
 if(t===7)for(const [x,y] of [[0,9],[1,7],[2,9],[0,13]])put(x,y,'#e9cfff');
 // 宗師：犄角
 if(t===8)for(let i=0;i<8;i++){const x=7-Math.floor(i/2.2);put(x,9-i,i<6?'#f3e3c8':'#fff6e6');if(i<6)put(x+1,9-i,'#c9b392');}
 // 盾牌本體
 const half=y=>y<19?7:7-(y-19)*.85;
 for(let y=8;y<=27;y++)for(let x=0;x<16;x++){const dx=15.5-x-.5,w=half(y);if(dx>w)continue;
  let c=dx>w-1.6||y<9.6?light:base;if(dx>w-1.6&&y>17)c=acc;if(y>=9.6&&dx<=w-1.6){c=x<12&&y<15?light:y>22?dark:base;if(dx<w-1.6&&dx>w-2.6)c=dark;}
  put(x,y,c);}
 // 鏽鐵：鏽斑
 if(t===0)for(const [x,y] of [[10,12],[11,19],[13,23],[9,16]])put(x,y,acc);
 // 赤銅：鉚釘
 if(t===1)for(const y of [11,17])put(10,y,acc);
 // 王冠
 if(t>=4){const pts=t>=9?[[8,3],[11,2],[14,1]]:t>=7?[[9,4],[12,3],[15,2]]:[[10,5],[15,4]];
  for(let x=8;x<16;x++)for(let y=6;y<=7;y++)put(x,y,y===6?gold:goldD);
  for(const [px,py] of pts)for(let y=py;y<6;y++){put(px,y,gold);if(px<15)put(px+1,y,y===py?gold:goldD);}
  if(t>=6)put(12,6,acc);}
 // 中央寶石（菱形）
 const r=GEM[t],cy=17;for(let y=cy-r-1;y<=cy+r+1;y++)for(let x=8;x<16;x++){const d=Math.abs(15.5-x-.5)+Math.abs(y-cy)*.9;if(d<=r+.5)put(x,y,d<=r-.5&&y<cy?'#ffffff':d<=r-.5?acc:dark);}
 // 外框
 const out=g.map(r=>r.slice());for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!g[y][x]&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>g[y+b]?.[x+a]))out[y][x]=P[4];
 return out;}
const cache={};
function canvas(t,scale=4){const c=document.createElement('canvas');c.width=c.height=N*scale;const x=c.getContext('2d'),g=grid(t);
 for(let y=0;y<N;y++)for(let i=0;i<N;i++)if(g[y][i]){x.fillStyle=g[y][i];x.fillRect(i*scale,y*scale,scale,scale);}c.className='rank-badge';return c;}
function url(t,scale=4){const k=t+':'+scale;return cache[k]||(cache[k]=canvas(t,scale).toDataURL());}
function img(t,size=40){return `<img class="rank-badge" src="${url(t)}" width="${size}" height="${size}" alt="" style="image-rendering:pixelated;vertical-align:middle">`;}
window.RANK_ART={canvas,url,img,COUNT:PAL.length};
})();
