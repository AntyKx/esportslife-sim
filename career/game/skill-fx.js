'use strict';
// 0.70 像素技能特效：依技能效果（ops）組合畫面——突進殘影、範圍爆炸、命中火花、暈眩星星、定身鎖鏈、緩速冰晶、燃燒、
// 推拉箭頭、護盾泡泡、治療十字、加速線、無敵閃爍、減傷護甲、易傷記號、吸血。Q/W/E/R 都適用，R 更大更亮。
// 只在「外觀 → 戰場角色：像素小人」時接手；純畫面，不碰模擬、不用 Math.random。
(()=>{
const on=()=>(window.FIELD_PIXEL?.style||'pixel')==='pixel';
const TAU=Math.PI*2;
function sq(c,x,y,s,col){c.fillStyle=col;c.fillRect(Math.round(x/2)*2-s/2,Math.round(y/2)*2-s/2,s,s);}
function ring(c,x,y,r,n,s,col,rot=0){for(let i=0;i<n;i++){const a=rot+i/n*TAU;sq(c,x+Math.cos(a)*r,y+Math.sin(a)*r*.55,s,col);}}
function star(c,x,y,col){sq(c,x,y,2,col);sq(c,x-2,y,2,col);sq(c,x+2,y,2,col);sq(c,x,y-2,2,col);sq(c,x,y+2,2,col);}
function plus(c,x,y,col){c.fillStyle=col;c.fillRect(Math.round(x)-1,Math.round(y)-3,2,6);c.fillRect(Math.round(x)-3,Math.round(y)-1,6,2);}
function draw(c,e,p){if(!on()||!e.ops||!e.key)return false;
 const ops=new Set(e.ops),R=e.key==='r',big=R?1.4:1,s=R?3:2,col=ROSTER?.[e.id]?.hi||(e.team?'#f4a49a':'#8fdbe4'),fade=1-p;
 const sx=e.x,sy=e.y,tx=e.tx,ty=e.ty,dx=tx-sx,dy=ty-sy,len=Math.hypot(dx,dy)||1;
 c.save();c.globalAlpha=Math.max(0,.95*fade+.05);
 // 位移
 if(ops.has('dash')){for(let i=0;i<10;i++){const q=i/10;if(q>p*1.4)break;sq(c,sx+dx*q,sy+dy*q-8,s,i%2?col:'#ffffff');}}
 if(ops.has('blink')){for(const [x,y] of [[sx,sy],[tx,ty]])ring(c,x,y-8,6+p*10,8,s,'#d8c8ff',p*3);}
 // 範圍或單體傷害
 if(ops.has('dmg')){
  if(e.t==='area'||e.t==='around'){const r=(e.r||80)*big*(.35+.65*p);ring(c,tx,ty,r,R?28:20,s,col,p);ring(c,tx,ty,r*.6,R?16:10,s,'#ffffff',-p*2);
   for(let i=0;i<(R?10:6);i++){const a=i*2.4+p*4,rr=r*.8*((i*37%10)/10);sq(c,tx+Math.cos(a)*rr,ty+Math.sin(a)*rr*.55-4,s,i%2?'#ffffff':col);}}
  else{const r=(4+p*12)*big;for(let i=0;i<8;i++){const a=i/8*TAU;sq(c,tx+Math.cos(a)*r,ty-10+Math.sin(a)*r,s,i%2?'#fff2b0':col);}sq(c,tx,ty-10,s+2,'#ffffff');}}
 // 控制
 if(ops.has('stun')||ops.has('up')){for(let i=0;i<3;i++){const a=p*8+i/3*TAU;star(c,tx+Math.cos(a)*7,ty-26+Math.sin(a)*2.5,'#ffe45a');}}
 if(ops.has('root')){ring(c,tx,ty+2,9,10,2,'#9aa3b2',p);ring(c,tx,ty+2,6,6,2,'#c8cdd6',-p);}
 if(ops.has('slow')){for(let i=0;i<6;i++){const a=i/6*TAU;sq(c,tx+Math.cos(a)*9,ty-6+((p*20+i*5)%16)-8,2,'#9fe4ff');}}
 if(ops.has('burn')){for(let i=0;i<6;i++){const f=(p*30+i*7)%12;sq(c,tx-6+i*2.4,ty-6-f,2,f<4?'#ffe45a':f<8?'#ff8a3a':'#c8402a');}}
 if(ops.has('push')||ops.has('pull')){const dir=ops.has('push')?1:-1,ux=dx/len*dir,uy=dy/len*dir;for(let k=0;k<3;k++){const q=(p+k/3)%1,cx=tx-ux*12+ux*q*18,cy=ty-8-uy*12+uy*q*18;sq(c,cx,cy,2,'#ffffff');sq(c,cx-ux*3-uy*3,cy-uy*3+ux*3,2,'#ffffff');sq(c,cx-ux*3+uy*3,cy-uy*3-ux*3,2,'#ffffff');}}
 if(ops.has('vuln')||ops.has('exec')){sq(c,tx,ty-30,4,'#ff4a5a');sq(c,tx,ty-25,2,'#ff4a5a');}
 if(ops.has('drain')){for(let i=0;i<6;i++){const q=(p+i/6)%1;sq(c,tx-dx*q,ty-dy*q-10,2,'#e0465a');}}
 // 增益（畫在施放者或附近隊友）
 const ax=e.t==='ally'?tx:sx,ay=e.t==='ally'?ty:sy,team=e.t==='allies'?(e.r||130):0;
 if(ops.has('shield')||ops.has('sshield')){const r=team?team*(.3+.7*p):13+Math.sin(p*TAU)*1.5;ring(c,ax,ay-10,r,team?24:14,2,'#bfe6ff',p);if(!team)ring(c,ax,ay-10,r-3,10,2,'rgba(191,230,255,.6)',-p);}
 if(ops.has('heal')||ops.has('sheal')){for(let i=0;i<4;i++){const ox=(i-1.5)*7,rise=((p*24+i*6)%22);plus(c,ax+ox,ay-6-rise,'#8ff07a');}}
 if(ops.has('haste')||ops.has('speed')){for(let i=0;i<4;i++){const y=ay-18+i*5,off=(p*30+i*7)%14;c.fillStyle='rgba(255,255,255,.85)';c.fillRect(Math.round(ax-14-off),y,6,1);}}
 if(ops.has('untarget')){for(let i=0;i<8;i++){const a=i/8*TAU+p*6;if((i+Math.floor(p*12))%2)sq(c,ax+Math.cos(a)*11,ay-12+Math.sin(a)*13,2,'#e8d8ff');}}
 if(ops.has('dr')){for(const [ox,oy] of [[0,-24],[-10,-12],[10,-12],[0,0]])sq(c,ax+ox,ay+oy,3,'#c8cdd6');}
 if(R){ring(c,ax,ay-12,16+p*10,12,2,'#ffd66e',p*2);}
 c.restore();return true;}
window.SKILL_FX={draw};
})();
