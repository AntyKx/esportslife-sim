'use strict';
// 0.68 戰場其他物件也改成像素風：防禦塔、抑制水晶、主堡、小兵、野怪、巨型野怪、地圖。
// 與 field-pixel.js 共用「外觀 → 戰場角色」的切換（FIELD_PIXEL.style：pixel / classic）。
// 純畫面：不讀寫模擬、不用 Math.random。
(()=>{
if(!window.RPG_ART||!window.FIELD_ACTORS)return;
const on=()=>(window.FIELD_PIXEL?.style||'pixel')==='pixel';
const INK='#1c2130',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TEAM=[{hi:'#8fdbe4',mid:'#4fa3b4',lo:'#2f6b7c',glow:'rgba(143,219,228,'},{hi:'#f4a49a',mid:'#c8606a',lo:'#8a3a4a',glow:'rgba(244,164,154,'}];
const STONE=['#c3c8b2','#a3aa94','#7f8a78','#5e6a60'];
const clock=()=>window.HERO_ART?.getScene?.()?.clock??performance.now()/1000;

// ── 像素畫布工具：在格子上畫，最後自動描邊 ──
const cache=new Map();
function sprite(key,w,h,fn,outline=true){let c=cache.get(key);if(c)return c;const g=Array.from({length:h},()=>Array(w).fill(null));
 const px=(x,y,col)=>{x|=0;y|=0;if(x>=0&&x<w&&y>=0&&y<h&&col)g[y][x]=col;},rect=(x,y,ww,hh,col)=>{for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)px(x+i,y+j,col);};
 fn(px,rect);
 c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 for(let y=0;y<h;y++)for(let i=0;i<w;i++){let col=g[y][i];if(!col&&outline&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>g[y+b]?.[i+a]))col=INK;if(col){x.fillStyle=col;x.fillRect(i,y,1,1);}}
 cache.set(key,c);return c;}
function blit(c,img,x,y,{flip=1,alpha=1,rot=0,sx=1,sy=1}={}){c.save();c.translate(x,y);if(rot)c.rotate(rot);c.scale(flip*sx,sy);if(alpha!==1)c.globalAlpha*=alpha;c.imageSmoothingEnabled=false;c.drawImage(img,-img.width/2,-img.height);c.restore();}
const shadow=(c,x,y,rx,ry)=>{c.fillStyle='rgba(8,22,22,.38)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
function bar(c,x,y,w,frac,team){c.fillStyle='#14202a';c.fillRect(Math.round(x-w/2)-1,Math.round(y)-1,w+2,5);c.fillStyle=team===1?'#e0646a':team===0?'#4fc0d0':'#e6c36a';c.fillRect(Math.round(x-w/2),Math.round(y),Math.round(w*clamp(frac,0,1)),3);}

// ── 防禦塔 ──
function towerSprite(team){const T=TEAM[team];return sprite('tower'+team,24,42,(px,rect)=>{
 rect(1,36,22,6,STONE[2]);rect(2,36,20,1,STONE[0]);rect(1,41,22,1,STONE[3]);for(let i=3;i<22;i+=5)px(i,38,STONE[3]);
 rect(5,14,14,22,STONE[1]);rect(5,14,2,22,STONE[0]);rect(17,14,2,22,STONE[2]);
 for(let y=17;y<36;y+=5){rect(5,y,14,1,STONE[2]);px(9+(y%2)*4,y+2,STONE[2]);}
 rect(5,22,14,2,T.mid);rect(5,22,14,1,T.hi);
 rect(10,27,4,4,'#23303a');rect(10,17,4,3,'#23303a');px(11,18,T.hi);
 rect(3,10,18,4,STONE[1]);rect(3,10,18,1,STONE[0]);for(let i=3;i<21;i+=4)rect(i,8,2,2,STONE[1]);
 rect(9,1,6,9,T.mid);rect(10,0,4,1,T.hi);rect(10,1,2,7,T.hi);px(13,3,'#ffffff');rect(8,4,1,4,T.lo);rect(15,4,1,4,T.lo);});}
function rubbleSprite(team){return sprite('rubble'+team,24,10,(px,rect)=>{rect(2,6,20,4,STONE[2]);rect(4,3,6,4,STONE[1]);rect(13,2,7,5,STONE[1]);rect(9,5,5,3,STONE[0]);px(6,4,STONE[0]);px(16,3,STONE[0]);rect(17,7,3,2,TEAM[team].lo);});}
function tower(c,t,ck,showHealth=true){if(!on())return false;const x=t.x,y=t.y;shadow(c,x+1,y+11,20,6);
 if(t.hp<=0){blit(c,rubbleSprite(t.team),x,y+12);return true;}
 blit(c,towerSprite(t.team),x,y+12);
 const T=TEAM[t.team],pulse=.35+.25*Math.sin(ck*3+x);c.fillStyle=T.glow+pulse+')';c.beginPath();c.arc(x,y-37,6,0,Math.PI*2);c.fill();
 if(showHealth&&t.hp<(t.maxHp||1))bar(c,x,y-48,30,t.hp/(t.maxHp||1),t.team);
 return true;}

// ── 抑制水晶、主堡 ──
function inhibSprite(team,alive){const T=TEAM[team];return sprite('inh'+team+alive,20,22,(px,rect)=>{
 rect(2,16,16,6,STONE[2]);rect(3,16,14,1,STONE[0]);rect(2,21,16,1,STONE[3]);
 if(alive){rect(7,3,6,13,T.mid);rect(8,1,4,2,T.hi);rect(8,3,2,11,T.hi);px(11,5,'#ffffff');rect(6,8,1,6,T.lo);rect(13,8,1,6,T.lo);}
 else{rect(5,12,4,4,'#8a9098');rect(11,13,4,3,'#6f767e');px(7,11,'#8a9098');px(13,12,'#6f767e');}});}
function inhibitor(c,x,y,team,alive,ck,seen=true){if(!on())return orig.inhibitor.apply(this,arguments);c.save();if(!seen)c.globalAlpha*=.72;shadow(c,x,y+8,12,4);blit(c,inhibSprite(team,!!alive),x,y+9);
 if(alive){const T=TEAM[team];c.fillStyle=T.glow+(.25+.2*Math.sin(ck*2.5+x))+')';c.beginPath();c.arc(x,y-4,7,0,Math.PI*2);c.fill();}c.restore();}
function coreSprite(team,alive){const T=TEAM[team];return sprite('core'+team+alive,44,44,(px,rect)=>{
 rect(4,34,36,8,STONE[2]);rect(2,36,40,4,STONE[2]);rect(5,34,34,1,STONE[0]);rect(2,41,40,1,STONE[3]);for(let i=6;i<40;i+=6)px(i,37,STONE[3]);
 rect(10,30,24,4,STONE[1]);rect(10,30,24,1,STONE[0]);
 if(alive){rect(16,6,12,24,T.mid);rect(18,2,8,4,T.mid);rect(20,0,4,2,T.hi);rect(18,4,4,22,T.hi);px(24,8,'#ffffff');px(25,9,'#ffffff');rect(14,14,2,14,T.lo);rect(28,14,2,14,T.lo);
  rect(8,18,4,10,T.mid);rect(9,16,2,2,T.hi);rect(32,18,4,10,T.mid);rect(33,16,2,2,T.hi);}
 else{rect(14,24,6,6,'#8a9098');rect(24,22,7,8,'#6f767e');rect(19,27,6,3,'#9aa0a8');px(17,23,'#8a9098');}});}
function core(c,u,ck){if(!on())return orig.core.apply(this,arguments);const x=u.x,y=u.y,alive=u.hp>0;shadow(c,x,y+12,26,9);blit(c,coreSprite(u.team,alive),x,y+16);
 if(alive){const T=TEAM[u.team];c.fillStyle=T.glow+(.25+.2*Math.sin(ck*2+u.team))+')';c.beginPath();c.arc(x,y-14,12,0,Math.PI*2);c.fill();}}

// ── 小兵 ──
const kindOf=new WeakMap();let nth=0;
function minionKind(a){if(a.siege)return 'siege';let k=kindOf.get(a);if(!k){k=(nth++%3===2)?'caster':'melee';kindOf.set(a,k);}return k;}
function minionSprite(team,kind,step){const T=TEAM[team];return sprite(`m${team}${kind}${step}`,kind==='siege'?18:11,kind==='siege'?13:14,(px,rect)=>{
 if(kind==='siege'){rect(2,5,13,5,T.mid);rect(2,5,13,1,T.hi);rect(9,1,8,3,'#4a4a52');rect(15,0,2,5,'#2a2a30');rect(3,10,4,3,'#5b4636');rect(11,10,4,3,'#5b4636');px(4+step,11,'#c9ab7c');px(12+step,11,'#c9ab7c');return;}
 rect(3,1,5,2,kind==='caster'?T.lo:STONE[0]);rect(2,3,7,4,'#f0c9a0');rect(2,3,7,1,kind==='caster'?T.lo:STONE[1]);px(4,5,INK);px(7,5,INK);
 rect(3,7,5,4,T.mid);rect(3,7,5,1,T.hi);
 rect(3+(step?0:0),11,2,2+(step?0:1),T.lo);rect(6,11,2,2+(step?1:0),T.lo);
 if(kind==='caster'){rect(9,2,1,10,'#7a5230');rect(8,0,3,2,T.hi);}else{rect(9,4,1,6,'#d8dce4');px(9,10,'#e0b04a');}});}
function minion(c,a,o={}){if(!on())return orig.minion.apply(this,arguments);
 const face=(o.face??1)<0?-1:1,walk=o.walk||0,g=o.gait||0,F=clamp(o.fall||0,0,1),kind=minionKind(a),step=walk>.3&&Math.sin(g)>0?1:0;
 const s=a.super?1.35:1;shadow(c,a.x,a.y+4,(kind==='siege'?9:5)*s,(kind==='siege'?2.6:1.7)*s);
 blit(c,minionSprite(a.team,kind,step),a.x,a.y+4,{flip:face,alpha:F>.5?1-(F-.5)/.5:1,rot:F?-face*1.3*Math.min(1,F/.4):0,sx:s,sy:s});}

// ── 野怪 ──
function campSprite(type){return sprite('camp'+type,30,24,(px,rect)=>{
 if(type==='blue'||type==='red'){const hi=type==='blue'?'#8fd0f0':'#f08a5a',mid=type==='blue'?'#4f7fb0':'#b04a3a',lo=type==='blue'?'#2f4f7a':'#6a2a2a';
  rect(7,6,16,14,STONE[2]);rect(7,6,16,2,STONE[1]);rect(4,9,4,8,STONE[2]);rect(22,9,4,8,STONE[2]);rect(9,20,4,4,STONE[3]);rect(17,20,4,4,STONE[3]);
  rect(10,2,10,5,STONE[1]);rect(12,4,2,1,hi);rect(16,4,2,1,hi);rect(12,10,6,6,mid);rect(13,11,3,3,hi);px(8,12,hi);px(21,13,hi);px(5,11,mid);px(24,11,mid);rect(11,0,2,2,lo);rect(17,0,2,2,lo);}
 else if(type==='gromp'){rect(5,8,20,12,'#5a9a4a');rect(5,8,20,2,'#7aba5a');rect(7,4,5,5,'#5a9a4a');rect(18,4,5,5,'#5a9a4a');rect(8,5,3,3,'#f4e6b0');rect(19,5,3,3,'#f4e6b0');px(9,6,INK);px(20,6,INK);rect(8,15,14,2,'#e0d090');rect(4,19,6,3,'#3f7a36');rect(20,19,6,3,'#3f7a36');px(12,11,'#3f7a36');px(17,12,'#3f7a36');}
 else if(type==='wolves'){for(const [ox,oy,s] of [[2,10,1],[17,10,1],[9,4,1.2]]){const W=8,H=6;rect(ox,oy+2,W,H-2,'#8a94a0');rect(ox+W-2,oy,3,4,'#8a94a0');px(ox+W-1,oy-1,'#6a7480');px(ox+W,oy+1,INK);rect(ox,oy+H,2,2,'#5a6470');rect(ox+W-3,oy+H,2,2,'#5a6470');px(ox-1,oy+2,'#6a7480');}}
 else if(type==='raptors'){for(const [ox,oy] of [[2,12],[11,6],[20,12]]){rect(ox,oy+2,6,4,'#d8683a');rect(ox+4,oy,3,3,'#d8683a');px(ox+7,oy+1,'#f0c040');px(ox+5,oy,INK);rect(ox-1,oy+1,2,2,'#a84a2a');rect(ox+1,oy+6,1,2,'#7a3a2a');rect(ox+4,oy+6,1,2,'#7a3a2a');}}
 else if(type==='krugs'){rect(4,6,14,14,'#8a7a5a');rect(4,6,14,2,'#a89a72');px(7,10,'#f0c040');px(13,10,'#f0c040');rect(6,14,10,2,'#5a4a3a');rect(2,10,3,6,'#8a7a5a');rect(17,10,3,6,'#8a7a5a');rect(20,13,8,8,'#7a6a4a');rect(20,13,8,1,'#a89a72');px(22,16,'#f0c040');px(25,16,'#f0c040');}
 else if(type==='scuttle'){rect(6,10,18,8,'#4fb0b0');rect(8,8,14,3,'#6fd0c8');rect(10,6,2,3,'#6fd0c8');rect(18,6,2,3,'#6fd0c8');px(10,5,INK);px(19,5,INK);for(let i=0;i<3;i++){px(5-i,17+i%2,'#3a8a8a');px(24+i,17+i%2,'#3a8a8a');}rect(2,9,4,3,'#e07a6a');rect(24,9,4,3,'#e07a6a');}
 else{rect(8,8,14,12,'#9a8a6a');px(12,12,INK);px(17,12,INK);}});}
function creature(c,type){if(!on())return orig.creature.apply(this,arguments);const bob=Math.round(Math.sin(clock()*2.2+type.length)*.8);blit(c,campSprite(type),0,10+bob);}

// ── 巨型野怪（翼龍、領主、預示者、幼蟲） ──
function epicSprite(kind){return sprite('epic'+kind,44,36,(px,rect)=>{
 if(kind==='dragon'){const a='#d89a4a',b='#a86a2a',w='#f0c070';rect(12,14,20,12,a);rect(12,14,20,2,w);rect(28,8,8,8,a);rect(34,10,4,3,b);px(31,10,INK);px(36,11,'#ffffff');rect(2,6,10,10,w);rect(0,4,6,4,w);rect(32,4,2,4,b);rect(14,26,4,6,b);rect(26,26,4,6,b);rect(6,20,8,3,a);rect(2,22,5,2,b);for(let i=14;i<30;i+=4)px(i,13,b);}
 else if(kind==='baron'){const a='#8a6ab8',b='#5a4a8a',w='#c8a8f0';rect(8,10,28,22,a);rect(8,10,28,3,w);rect(14,2,16,10,a);rect(16,0,3,3,b);rect(25,0,3,3,b);rect(17,6,3,2,'#ffd04a');rect(24,6,3,2,'#ffd04a');rect(18,10,8,2,'#e8dcc0');for(let i=10;i<34;i+=5)rect(i,16,2,12,b);rect(2,20,7,4,a);rect(35,20,7,4,a);rect(6,32,32,4,b);}
 else if(kind==='herald'){const a='#9d8cbc',b='#6a5a8a';rect(10,8,24,22,a);rect(10,8,24,3,'#c8b8e8');rect(18,14,8,8,'#f0e6ff');rect(20,16,4,4,'#7a4ab8');px(21,17,'#ffffff');rect(6,12,5,10,b);rect(33,12,5,10,b);rect(14,30,6,4,b);rect(24,30,6,4,b);rect(14,4,4,5,b);rect(26,4,4,5,b);}
 else{for(const [ox,oy] of [[4,16],[17,12],[30,16]]){rect(ox,oy+4,10,8,'#c0a4ce');rect(ox,oy+4,10,2,'#e0c8f0');rect(ox+2,oy,6,5,'#c0a4ce');px(ox+3,oy+2,INK);px(ox+6,oy+2,INK);rect(ox+1,oy+12,2,2,'#8a6aa0');rect(ox+7,oy+12,2,2,'#8a6aa0');}}});}
function epic(c,o,baron,ck,seen,dying){if(!on())return orig.epic.apply(this,arguments);if(!o.alive)return false;
 const kind=baron?(o.epic==='grubs'?'grubs':o.epic==='herald'?'herald':'baron'):'dragon';
 c.save();if(!seen)c.globalAlpha=.4;let a=1,dy=0;if(dying!==undefined){a=1-dying;dy=dying*10;}
 shadow(c,o.x,o.y+10,22,7);const bob=Math.round(Math.sin(ck*2)*1.5);blit(c,epicSprite(kind),o.x,o.y+14+dy+bob,{alpha:a});
 if(seen&&o.hp<(o.maxHp||1))bar(c,o.x,o.y-30,36,o.hp/(o.maxHp||1),2);c.restore();return true;}

// ── 地圖：把原本的手繪地圖縮成 1/4 解析度、壓色階＋有序抖色，再放大成像素風 ──
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function ground(c,lanes,bases,camps){if(!on())return orig.ground.apply(this,arguments);
 const big=document.createElement('canvas');big.width=800;big.height=640;orig.ground.call(this,big.getContext('2d'),lanes,bases,camps);
 const W=400,H=320,sm=document.createElement('canvas');sm.width=W;sm.height=H;const x=sm.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(big,0,0,W,H);
 const img=x.getImageData(0,0,W,H),d=img.data,L=12;
 for(let y=0;y<H;y++)for(let i=0;i<W;i++){const p=(y*W+i)*4,t=(BAYER[(y%4)*4+i%4]/16-.5)*(255/L)*.15;for(let k=0;k<3;k++){const v=clamp(d[p+k]+t,0,255);d[p+k]=Math.round(Math.round(v/255*L)/L*255);}}
 x.putImageData(img,0,0);c.save();c.imageSmoothingEnabled=false;c.drawImage(sm,0,0,800,640);c.restore();}

// ── 安裝（保留原本的，切回「原本美術」時使用） ──
const orig={};
function install(){let changed=false;
 for(const [obj,name,fn] of [[FIELD_ACTORS,'minion',minion],[FIELD_ACTORS,'inhibitor',inhibitor],[FIELD_ACTORS,'core',core],[RPG_ART,'creature',creature],[RPG_ART,'epic',epic],[RPG_ART,'ground',ground]]){
  if(obj[name]!==fn){orig[name]=obj[name];obj[name]=fn;changed=true;}}
 if(changed)try{HERO_ART.invalidateGround?.();}catch{}}
install();setInterval(install,1000);
let last=on();setInterval(()=>{const now=on();if(now!==last){last=now;try{HERO_ART.invalidateGround?.();}catch{}}},300);
window.PIXEL_WORLD={tower,get on(){return on();}};
})();
