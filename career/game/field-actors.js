'use strict';
// Field actors v2: smooth rigged figures in the spirit of the football match view.
// Pure presentation: reads only the options it is given (plus the presentation clock), never state or simulation RNG.
(()=>{
const TAU=Math.PI*2,INK='#1c2130';
const SKIN=['#e8bd93','#b98261','#f0cfad','#93603f','#d9a57c'];
const HAIR=['#3a2c2a','#b38f4c','#6a4433','#252f45','#8a4f3d','#d8d0c1'];
const hex=h=>{h=h.replace('#','');if(h.length===3)h=[...h].map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const tone=(h,t)=>'#'+hex(h).map(n=>Math.round(clamp(t<0?n*(1+t):n+(255-n)*t,0,255)).toString(16).padStart(2,'0')).join('');
const alpha=(h,a)=>{const v=hex(h);return `rgba(${v[0]},${v[1]},${v[2]},${a})`;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t*t*(3-2*t);
const now=()=>window.HERO_ART?.getScene?.()?.clock??performance.now()/1000;

// ---------- drawing helpers ----------
function line(c,pts,w,col){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.lineWidth=w;c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';c.stroke();}
function inked(c,pts,w,col){line(c,pts,w+1.4,INK);line(c,pts,w,col);}
function dot(c,x,y,r,col){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=col;c.fill();}
function shape(c,build,fill,stroke=INK,lw=.9){c.beginPath();build();c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.lineJoin='round';c.stroke();}}
function oval(c,x,y,rx,ry,fill,stroke=INK,lw=.9,rot=0){shape(c,()=>c.ellipse(x,y,rx,ry,rot,0,TAU),fill,stroke,lw);}
function lin(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g;}
function glow(c,x,y,r,col,a){if(a<=0)return;c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,alpha(col,a));g.addColorStop(1,alpha(col,0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
function ik(sx,sy,tx,ty,l1,l2,bend){let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);const max=l1+l2-.05;if(d>max){tx=sx+dx/d*max;ty=sy+dy/d*max;d=max;}d=Math.max(d,Math.abs(l1-l2)+.05);const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),e=Math.atan2(ty-sy,tx-sx)+bend*a;return{sx,sy,ex:sx+Math.cos(e)*l1,ey:sy+Math.sin(e)*l1,hx:tx,hy:ty};}

// ---------- hero kits: silhouette, weapon and motion per hero ----------
const KIT=[
 {head:'stone',weapon:'fists',motion:'slam',build:1.3,stone:true},          // 磐岩
 {head:'band',weapon:'sword',motion:'slash',twin:true},                       // 赤刃
 {head:'helm',weapon:'lance',motion:'thrust',shield:'#d8dde2',armor:true,build:1.1}, // 雷鎧
 {head:'wolfhood',weapon:'claw',motion:'lunge',cape:'#5d6874',twin:true},     // 逐影
 {head:'antler',weapon:'staff',tip:'leaf',motion:'cast',robe:true},           // 森牙
 {head:'hood',weapon:'orb',motion:'orb',robe:true,spider:true},               // 幽蛛
 {head:'wizard',weapon:'staff',tip:'flame',motion:'cast',robe:true},          // 星火
 {head:'beak',weapon:'dagger',motion:'lunge',cape:'#363149',raven:true},      // 夜鴉
 {head:'wrap',weapon:'staff',tip:'crook',motion:'cast',robe:true,scarf:true}, // 砂語
 {head:'hood',weapon:'bow',motion:'bow'},                                     // 霜弓
 {head:'feather',weapon:'bow',motion:'bow'},                                  // 疾羽
 {head:'brim',weapon:'gun',motion:'gun'},                                     // 燼槍
 {head:'bellhelm',weapon:'hammer',motion:'slash',shield:'#e2c06a',armor:true,build:1.1}, // 晨鐘
 {head:'longhair',weapon:'trident',motion:'thrust',robe:true,hair:'#2d5d68'}, // 潮汐
 {head:'wisp',weapon:'lantern',motion:'cast',robe:true,float:true,skin:'#d4eef3'} // 燈靈
];
const REACH={sword:10.5,lance:17,claw:5,dagger:6.5,hammer:10,trident:16.5};
// Keyframes: hand target relative to the front shoulder, weapon angle, body lean and travel.
const M={
 slash:{rest:{hx:2.6,hy:8,wa:-1.05},keys:[[.3,{hx:-2.6,hy:-6.5,wa:-2.55,lean:-.12,dx:-1}],[.42,{hx:4.8,hy:-5.6,wa:-1.1,lean:.04,dx:.6}],[.52,{hx:7.6,hy:2.6,wa:.75,lean:.2,dx:2.4}],[.74,{hx:6.2,hy:4.6,wa:.95,lean:.12,dx:2}]],trail:[.34,.62]},
 thrust:{rest:{hx:3,hy:7,wa:-1.25},keys:[[.34,{hx:-1.8,hy:2.4,wa:-.18,lean:-.1,dx:-1.6}],[.5,{hx:9.2,hy:.8,wa:-.1,lean:.2,dx:3.2}],[.72,{hx:7.4,hy:2,wa:-.12,lean:.1,dx:2}]],trail:[.4,.6]},
 lunge:{rest:{hx:2.2,hy:8,wa:.35},keys:[[.3,{hx:-2.4,hy:4,wa:-.7,lean:.08,dx:-2,crouch:1.6}],[.45,{hx:8.6,hy:.8,wa:.15,lean:.32,dx:5}],[.7,{hx:6,hy:4,wa:.4,lean:.14,dx:3}]],trail:[.32,.56]},
 slam:{rest:{hx:2.8,hy:8.4},keys:[[.34,{hx:.6,hy:-9.5,lean:-.16,dx:-1}],[.5,{hx:7.4,hy:7.4,lean:.26,dx:2,crouch:2.2,flash:1}],[.75,{hx:6,hy:8,lean:.14,crouch:1}]]},
 cast:{rest:{hx:3.6,hy:6.6,wa:-1.5},keys:[[.34,{hx:1,hy:-3.4,wa:-1.9,lean:-.1,glow:.6}],[.5,{hx:7.6,hy:-.2,wa:-.75,lean:.16,dx:1.4,glow:1}],[.75,{hx:6.2,hy:2,wa:-.95,lean:.06,glow:.5}]]},
 orb:{rest:{hx:3,hy:5.5},keys:[[.34,{hx:.8,hy:-6.5,lean:-.1,glow:.7}],[.5,{hx:8.4,hy:-1.4,lean:.16,dx:1.2,glow:1}],[.75,{hx:6.4,hy:1.6,glow:.5}]]},
 bow:{rest:{hx:2.4,hy:8.2,wa:.55},keys:[[.22,{hx:8.6,hy:-.6,wa:0,draw:.2}],[.48,{hx:8.6,hy:-.6,wa:-.04,draw:1,lean:-.04}],[.54,{hx:8.9,hy:-.8,wa:-.08,draw:0,dx:-.6}],[.8,{hx:8.2,hy:0,wa:0}]]},
 gun:{rest:{hx:3,hy:6.8,wa:.65},keys:[[.3,{hx:8.4,hy:-1,wa:0}],[.46,{hx:8.4,hy:-1,wa:0}],[.52,{hx:6.4,hy:-2.4,wa:-.4,dx:-1.6,flash:1}],[.74,{hx:7.8,hy:-1.2,wa:-.06}]]}
};
const FIELDS=['hx','hy','wa','lean','dx','crouch','glow','draw','flash'];
for(const m of Object.values(M)){const rest={hx:0,hy:0,wa:0,lean:0,dx:0,crouch:0,glow:0,draw:0,flash:0,...m.rest};m.restPose=rest;m.frames=[[0,rest],...m.keys.map(([t,v])=>[t,{...rest,...v}]),[1,rest]];}
function sample(m,p){if(!(p>0&&p<1))return m.restPose;const f=m.frames;let i=0;while(i<f.length-2&&p>=f[i+1][0])i++;const [t0,a]=f[i],[t1,b]=f[i+1],u=ease((p-t0)/(t1-t0)),o={};for(const k of FIELDS)o[k]=a[k]+(b[k]-a[k])*u;return o;}

// ---------- heads ----------
function hairCap(c,r,col){shape(c,()=>{c.arc(0,0,r+.35,Math.PI*.82,Math.PI*1.98);c.quadraticCurveTo(2.2,-2.2,.4,-1.7);c.quadraticCurveTo(-1.4,-.5,-2.6,1.6);},col);}
function hood(c,col,tip){shape(c,()=>{c.moveTo(-3.4,3.8);c.lineTo(tip?-6.8:-5,tip?-.6:.6);c.quadraticCurveTo(-4.8,-5.9,0,-5.4);c.quadraticCurveTo(4.6,-5,5.2,-.4);c.quadraticCurveTo(2.6,-2.7,.2,-1.9);c.quadraticCurveTo(-1.6,-.9,-1.9,3.2);},col);}
function eyes(c,col=INK){oval(c,1.5,.5,.55,.8,col,null);oval(c,3.4,.4,.5,.78,col,null);}
function head(c,id,kit,P,t,w,g){
 const r=kit.stone?3.7:4.3,skin=kit.stone?P.hi:kit.skin||SKIN[id%5],hair=kit.hair||HAIR[id%6],H=kit.head,fl=Math.sin(t*7+id)*.6+Math.sin(g)*.5*w;
 // back layer
 if(H==='band')for(const k of[0,1])inked(c,[[-3.4,-1.4+k],[-6.6,-1+fl+k*.8],[-9.2,.4+fl*1.4+k*1.6]],1.1,'#e0564c');
 if(H==='longhair')shape(c,()=>{c.moveTo(-1.2,-4.2);c.quadraticCurveTo(-6.6,-2.2,-6.4+fl*.4,6.8);c.lineTo(-2.6,5.4);c.quadraticCurveTo(-1.6,2,0,0);},hair);
 if(H==='wisp'){glow(c,-1,-5,9,P.hi,.55);shape(c,()=>{c.moveTo(-3.8,.4);c.quadraticCurveTo(-7,-5,-5+fl,-10.6);c.quadraticCurveTo(-3.4,-6.6,-1.6,-7);c.quadraticCurveTo(-1.4,-10.4,1+fl*.5,-12.6);c.quadraticCurveTo(1.6,-7.8,3.8,-5.6);c.quadraticCurveTo(5.2,-3.6,4.4,-.8);},lin(c,0,-12,0,0,['#ffffff',P.hi,P.lo]),alpha(P.lo,.9),.7);}
 // face
 const fg=c.createRadialGradient(1.2,-1.6,.4,0,0,r+.4);fg.addColorStop(0,tone(skin,.18));fg.addColorStop(1,tone(skin,-.12));oval(c,0,0,r,r,fg);
 if(kit.stone){shape(c,()=>{c.moveTo(-.4,-2.3);c.lineTo(4,-2.4);c.lineTo(3.8,-.9);c.lineTo(.2,-.9);},P.lo,null);line(c,[[-2.2,-2.4],[-1.2,-.6],[-2,1.2]],.5,tone(P.lo,-.25));dot(c,-.8,-3.6,1.5,'#7fae62');glow(c,2.4,-.2,3,'#ffe7a3',.7);c.fillStyle='#fff1c4';c.fillRect(1.4,-.7,1,.8);c.fillRect(3,-.7,1,.8);return;}
 // front layer
 if(H==='band'){hairCap(c,r,hair);line(c,[[-4,-1.4],[4.3,-2.2]],1.3,'#e0564c');}
 else if(H==='helm'){shape(c,()=>c.arc(0,-.4,r+.8,0,TAU),lin(c,-3,-5,3,3,['#f2f7fa',P.hi,P.lo]));oval(c,-.6,-2.2,1.6,1,'#ffffff80',null);c.fillStyle='#16202c';c.fillRect(.8,-1,4.6,1.4);inked(c,[[-.4,-4.9],[-3.6,-6.6],[-6.4,-4.8+fl]],1.3,'#f2d27a');}
 else if(H==='wolfhood'){hood(c,P.lo,false);for(const [a,b,d]of[[-2.6,-4.6,-3.6],[.6,-5.1,1.3]]){shape(c,()=>{c.moveTo(a,b);c.lineTo(d,-8.6);c.lineTo(a+2.4,b+.2);},P.lo);shape(c,()=>{c.moveTo(a+.6,b-.2);c.lineTo(d+.2,-7.4);c.lineTo(a+1.8,b);},tone(P.hi,.1),null);}}
 else if(H==='antler'){for(const [x0,x1,bx,b2]of[[-1.2,-3,-2.3,-4.6],[1.4,2.6,2.1,4.4]]){inked(c,[[x0,-4.6],[x1,-9]],.9,'#a7835a');inked(c,[[bx,-7],[b2,-7.8]],.8,'#a7835a');}hood(c,P.lo,false);}
 else if(H==='hood')hood(c,P.lo,true);
 else if(H==='wizard'){hairCap(c,r,hair);shape(c,()=>{c.moveTo(-3.8,-3.3);c.quadraticCurveTo(-2,-8.6,-5.8+fl*.4,-11.8);c.quadraticCurveTo(-.2,-9.4,3.9,-3.5);},lin(c,0,-12,0,-3,[P.hi,P.lo]));oval(c,0,-3,6.8,1.5,P.lo,INK,.9,-.1);line(c,[[-3.4,-4],[3.4,-4.3]],1,'#ffe39a');}
 else if(H==='beak'){shape(c,()=>{c.moveTo(.6,-2.8);c.lineTo(4.4,-2);c.lineTo(8.6,1.6);c.lineTo(4.4,1.6);c.lineTo(1,1.4);},'#e6d8b8');hood(c,P.lo,true);dot(c,2.9,-.9,.75,'#ff8f7a');glow(c,2.9,-.9,2,'#ff8f7a',.5);}
 else if(H==='wrap'){oval(c,-.2,-2.6,5,3.2,P.hi);line(c,[[-4,-3],[3.8,-1.6]],.6,tone(P.hi,-.25));line(c,[[-3.6,-4.4],[3,-4]],.6,tone(P.hi,-.25));shape(c,()=>{c.moveTo(-.6,1);c.lineTo(4.6,.3);c.quadraticCurveTo(4.8,3.4,1.8,4);c.lineTo(-1.6,3.4);},P.lo);}
 else if(H==='feather'){inked(c,[[-2.6,-3.2],[-5,-5.6],[-7.4+fl*.6,-6.4+fl*.4]],1.5,P.hi);line(c,[[-2.6,-3.2],[-7.2+fl*.6,-6.4+fl*.4]],.4,tone(P.lo,-.2));hairCap(c,r,hair);}
 else if(H==='brim'){hairCap(c,r,hair);shape(c,()=>{c.moveTo(-3.6,-3.2);c.lineTo(-3,-6.9);c.quadraticCurveTo(0,-8,3,-6.9);c.lineTo(3.6,-3.2);},P.lo);oval(c,.2,-3,7.6,1.6,tone(P.lo,-.18));line(c,[[-3.4,-4],[3.4,-4]],.9,P.hi);}
 else if(H==='bellhelm'){shape(c,()=>{c.arc(0,-.4,r+.8,Math.PI,TAU);c.lineTo(r+.8,.6);c.lineTo(-r-.8,.6);},lin(c,0,-5,0,1,['#fff0b8','#e8c25e','#a97f34']));line(c,[[-r-.8,.6],[r+.8,.6]],1,'#f6dc8c');dot(c,0,-5.8,1.2,'#f6dc8c');}
 else if(H==='longhair'){hairCap(c,r,hair);line(c,[[-3.6,-2.6],[3.8,-2.8]],.8,P.hi);dot(c,2.4,-2.9,.8,'#fff4c6');}
 else if(H==='wisp'){}
 if(!['helm','beak'].includes(H))eyes(c,H==='wisp'?'#3f7d9a':INK);
}

// ---------- weapons ----------
function weapon(c,kit,P,J,wa,A,t,engage){
 const x=J.hx,y=J.hy,dx=Math.cos(wa),dy=Math.sin(wa),px=-dy,py=dx,at=d=>[x+dx*d,y+dy*d],seg=(a,b,w,col)=>inked(c,[at(a),at(b)],w,col);
 switch(kit.weapon){
 case 'sword':seg(-2.2,.6,1.4,'#5a3b2c');inked(c,[[x+dx*.9+px*2.2,y+dy*.9+py*2.2],[x+dx*.9-px*2.2,y+dy*.9-py*2.2]],1.1,'#d9b56a');seg(1.1,10.5,1.8,'#e3e8ea');line(c,[at(1.6),at(9.6)],.5,'#ffffff');break;
 case 'lance':seg(-5,12.5,1.5,'#8a6a46');shape(c,()=>{const [a,b]=at(12),[e,f]=at(17.5);c.moveTo(a+px*1.6,b+py*1.6);c.lineTo(e,f);c.lineTo(a-px*1.6,b-py*1.6);},'#e6ecef');shape(c,()=>{const [a,b]=at(10.8),[e,f]=at(8.6);c.moveTo(a,b);c.lineTo(a+px*3.2,b+py*3.2);c.lineTo(e,f);},'#f2d27a',INK,.6);break;
 case 'claw':for(const k of[-1,0,1])inked(c,[[x+px*k*.8,y+py*k*.8],[x+dx*5+px*k*1.5,y+dy*5+py*k*1.5]],.7,'#e9e4d6');break;
 case 'dagger':seg(-1.4,.6,1.3,'#3a2f3c');seg(.8,6.5,1.5,'#cfd6e4');break;
 case 'staff':{seg(-7,11.5,1.4,'#8b6845');const [tx,ty]=at(12.2);glow(c,tx,ty,4+5*A.glow,kit.tip==='flame'?'#ffb15e':P.hi,.35+.5*A.glow);
  if(kit.tip==='leaf'){oval(c,tx-1.2,ty,1.3,2.6,P.hi,INK,.7,-.6);oval(c,tx+1.2,ty-.4,1.3,2.6,tone(P.hi,.2),INK,.7,.6);dot(c,tx,ty+.6,1,'#fff6c8');}
  else if(kit.tip==='flame'){const f=Math.sin(t*14)*.6;shape(c,()=>{c.moveTo(tx-2.2,ty+1.4);c.quadraticCurveTo(tx-2.6,ty-2.6,tx+f,ty-5.6);c.quadraticCurveTo(tx+2.8,ty-2.4,tx+2.2,ty+1.4);},lin(c,tx,ty-6,tx,ty+2,['#fff3b8','#ffb04e','#e0573d']),'#8c3a2e',.6);}
  else{inked(c,[at(11),[tx+dx*1.4+px*1.6,ty+dy*1.4+py*1.6],[tx+px*3.4,ty+py*3.4],[tx-dx*1.6+px*2.6,ty-dy*1.6+py*2.6]],1.3,'#c9a86a');}break;}
 case 'bow':{const tip=s=>[x-dx*1.2+px*7.4*s,y-dy*1.2+py*7.4*s],draw=1.2+A.draw*6.4,sx=x-dx*draw,sy=y-dy*draw;
  c.beginPath();c.moveTo(...tip(1));c.quadraticCurveTo(x+dx*3.6,y+dy*3.6,...tip(-1));c.lineWidth=2.6;c.strokeStyle=INK;c.lineCap='round';c.stroke();c.lineWidth=1.3;c.strokeStyle='#8b6845';c.stroke();
  line(c,[tip(1),[sx,sy],tip(-1)],.45,'#f2ead2');
  if(engage>0&&A.draw>.05){inked(c,[[sx,sy],[sx+dx*10,sy+dy*10]],.6,'#d9c9a5');shape(c,()=>{c.moveTo(sx+dx*11.6,sy+dy*11.6);c.lineTo(sx+dx*9.6+px*1.2,sy+dy*9.6+py*1.2);c.lineTo(sx+dx*9.6-px*1.2,sy+dy*9.6-py*1.2);},P.hi,INK,.5);}break;}
 case 'gun':seg(-6,-1.4,2.4,'#8b5a3c');seg(-1.6,10,1.7,'#3a3436');line(c,[at(-1),at(9.4)],.5,'#9c9496');if(A.flash>0){const [mx,my]=at(11.4);glow(c,mx,my,7,'#ffcf86',A.flash);c.save();c.globalCompositeOperation='lighter';shape(c,()=>{for(let i=0;i<10;i++){const a=wa+i/10*TAU,rr=i%2?1.2:3.6*A.flash+1;c.lineTo(mx+Math.cos(a)*rr,my+Math.sin(a)*rr);}},'#fff1c0',null);c.restore();}break;
 case 'hammer':{seg(-3,8.6,1.4,'#8b6845');const [hx,hy]=at(10.2);c.save();c.translate(hx,hy);c.rotate(wa+Math.PI/2);shape(c,()=>{c.moveTo(-3.4,2);c.quadraticCurveTo(-3,-2.8,0,-3);c.quadraticCurveTo(3,-2.8,3.4,2);},lin(c,0,-3,0,2,['#fff0b8','#e2bb57','#a8792f']));line(c,[[-3.4,2],[3.4,2]],.9,'#f6dc8c');c.restore();break;}
 case 'trident':{seg(-6,12.6,1.4,'#5e8b8a');const [tx,ty]=at(12.6);for(const k of[-1.9,0,1.9])inked(c,[[tx+px*k,ty+py*k],[tx+dx*(k?3.4:4.4)+px*k,ty+dy*(k?3.4:4.4)+py*k]],.8,'#d8f3ee');inked(c,[[tx+px*1.9,ty+py*1.9],[tx-px*1.9,ty-py*1.9]],.8,'#d8f3ee');break;}
 case 'lantern':{seg(-6,10.4,1.3,'#7b6a52');const [tx,ty]=at(10.6),sw=Math.sin(t*3.2)*.35,lx=tx+Math.sin(sw)*3.4+dx*1.4,ly=ty+Math.cos(sw)*3.4;line(c,[[tx,ty],[lx,ly-1.6]],.5,INK);glow(c,lx,ly,6+4*A.glow,P.hi,.6+.4*A.glow);shape(c,()=>{c.roundRect?c.roundRect(lx-1.7,ly-1.8,3.4,4,1):c.rect(lx-1.7,ly-1.8,3.4,4);},lin(c,lx,ly-2,lx,ly+2,['#ffffff',P.hi]));break;}
 }
}
function shield(c,x,y,P,rim){c.save();c.translate(x,y);shape(c,()=>{c.moveTo(-2.5,-3.6);c.quadraticCurveTo(0,-4.7,2.8,-3.6);c.lineTo(2.6,1);c.quadraticCurveTo(1.8,3.7,.2,4.9);c.quadraticCurveTo(-1.6,3.7,-2.5,1);},lin(c,-2,-4,2,4,[tone(P.hi,.2),P.hi,P.lo]));shape(c,()=>{c.moveTo(.2,-2.4);c.lineTo(1.4,-.4);c.lineTo(.2,1.8);c.lineTo(-1,-.4);},rim,null);c.restore();}

// ---------- hero ----------
const KITS=new Map();function heroKit(id){if(!KITS.has(id)){const r=typeof ROSTER!=="undefined"&&ROSTER[id];KITS.set(id,r?{...KIT[r.look],...r.tweak}:KIT[((id%15)+15)%15]);}return KITS.get(id);}
function palette(id){const a=window.HERO_ART?.art?.[id];return{hi:a?.[2]||'#a8d4df',lo:a?.[3]||'#647aab'};}
function hero(c,id,x,y,o={}){
 id=id|0;const P=palette(id),kit=heroKit(id),m=M[kit.motion],t=o.clock||0;
 const k=o.ring===false?(o.scale||1.35)*1.37:(o.scale||1.35)/1.35,face=(o.face??1)<0?-1:1;
 const F=clamp(o.fall||0,0,1),p=!F&&o.attack>0&&o.attack<1?o.attack:0,A=sample(m,p),engage=p?Math.min(1,p/.12,(1-p)/.12):0,free=1-engage;
 const walk=F?0:clamp(o.walk??(Math.abs(o.step||0)>.01?1:0),0,1),g=o.gait??(t*11+id*.7),hurt=F?clamp(1-Math.max(0,F-.08)/.2,0,1):clamp(o.hurt||0,0,1);
 const fq=F?clamp((F-.08)/.3,0,1):0,ang=F?-(fq*fq)*1.48+(F>.38&&F<.5?Math.sin((F-.38)/.12*Math.PI)*.12:0):0,fade=F>.62?1-(F-.62)/.38:1;
 const b=kit.build||1,breath=Math.sin(t*2.3+id*1.3)*(1-walk),float=!!kit.float;
 const bob=-Math.abs(Math.cos(g))*1.1*walk+(float?Math.sin(t*2.6+id)*1.1-2.4:0);
 const dx=A.dx-hurt*1.4,hipY=-10.4+bob+A.crouch,lean=A.lean+walk*.07-hurt*.24;
 c.save();c.translate(x,y+9);c.scale(k,k);c.globalAlpha*=fade;
 // ground contact: soft shadow + team ring
 oval(c,1-face*fq*13,0,(float?6:8)+fq*7,float?2:2.6,'rgba(8,22,22,.38)',null);
 if(o.ring!==false&&!F){c.beginPath();c.ellipse(0,0,9.6,3.5,0,0,TAU);c.lineWidth=o.player?1.8:1.1;c.strokeStyle=o.player?'#ffd98a':o.team?'#f0928a':'#86d3e6';c.stroke();}
 c.scale(face,1);c.save();c.rotate(ang);
 const SF={x:3.2*b,y:-7.6+breath*.25},SB={x:-2.9*b,y:-7.8+breath*.25},sw=Math.sin(g)*walk*free;
 const reach=4.3+4.3-.05,wa=A.wa+sw*.12;
 const front=ik(SF.x,SF.y,SF.x+A.hx-sw*3,SF.y+A.hy-Math.abs(sw)*.5,4.3,4.3,1);
 let hb;const restB={x:SB.x-.6+sw*3,y:SB.y+8};
 if(kit.twin){const B=sample(m,clamp(p-.12,0,1));hb={x:SB.x+B.hx*.9+sw*3*(1-engage),y:SB.y+B.hy};}
 else if(kit.motion==='slam'||kit.motion==='orb')hb={x:SB.x+A.hx+1.2+sw*3,y:SB.y+A.hy+.4};
 else if(kit.weapon==='bow'){const d=1.2+A.draw*6.4,tgt={x:front.hx-Math.cos(wa)*d,y:front.hy-Math.sin(wa)*d};hb={x:restB.x+(tgt.x-restB.x)*engage,y:restB.y+(tgt.y-restB.y)*engage};}
 else if(kit.weapon==='gun')hb={x:front.hx+Math.cos(wa)*3.4,y:front.hy+Math.sin(wa)*3.4};
 else if(kit.shield)hb={x:SB.x+3.2,y:SB.y+5.6-engage*1.5};
 else if(kit.motion==='cast')hb={x:restB.x+(SF.x+A.hx-2.5-restB.x)*engage*.8,y:restB.y+(SF.y+A.hy+2-restB.y)*engage*.8};
 else hb=restB;
 const back=ik(SB.x,SB.y,hb.x,hb.y,4.3,4.3,1);
 const sleeve=kit.stone?P.lo:kit.armor?tone(P.hi,-.05):tone(P.hi,-.08),skin=kit.stone?P.hi:kit.skin||SKIN[id%5],glove=kit.armor?tone(P.lo,-.1):null,aw=kit.stone?3:2.1;
 const upper=fn=>{c.save();c.translate(dx,hipY);c.rotate(lean);fn();c.restore();};
 const drawArm=(J,dark)=>{const sl=dark?tone(sleeve,-.25):sleeve,sk=dark?tone(skin,-.2):skin;line(c,[[J.sx,J.sy],[J.ex,J.ey],[J.hx,J.hy]],aw+1.4,INK);dot(c,J.hx,J.hy,(kit.stone?2.6:1.3)+.7,INK);line(c,[[J.sx,J.sy],[J.ex,J.ey]],aw,sl);line(c,[[J.ex,J.ey],[J.hx,J.hy]],aw*.9,glove||sk);dot(c,J.hx,J.hy,kit.stone?2.6:1.3,glove||(kit.stone?(dark?tone(P.lo,-.2):P.lo):sk));};
 // --- behind the body
 upper(()=>{
  if(kit.spider)for(let i=0;i<3;i++){const wg=Math.sin(t*5+i*1.7)*.6;inked(c,[[-2,-6+i*1.6],[-6.4-i*.6,-10.2+i*2.4+wg],[-8.6-i*.4,-3.6+i*2.6]],.6,tone(P.lo,-.2));}
  if(kit.cape){const flow=.6+2.4*walk,sway=Math.sin(g*.5+t)*.6;shape(c,()=>{c.moveTo(-2.4,-8.6);c.quadraticCurveTo(-5-flow*.5,-3,-6.8-flow,3.8+sway);if(kit.raven){c.lineTo(-5.4-flow,2.6);c.lineTo(-4.6-flow*.7,4.6);c.lineTo(-3.4-flow*.5,3.2);c.lineTo(-2.4-flow*.3,4.8);}else c.lineTo(-2.6-flow*.4,4.6);c.quadraticCurveTo(-1.2,-2,1.6,-8.6);},lin(c,0,-9,-4,5,[tone(kit.cape,.15),kit.cape]));}
  if(kit.twin&&kit.weapon==='sword'){const B=sample(m,clamp(p-.12,0,1));weapon(c,kit,P,back,B.wa-.3,B,t,engage);}
  drawArm(back,true);
  if(kit.twin&&kit.weapon==='claw')weapon(c,kit,P,back,wa+.2,A,t,engage);
 });
 // --- legs
 const lift=ph=>Math.max(0,Math.cos(ph))*2.3*walk;
 if(!float){const pants=kit.stone?tone(P.lo,-.15):tone(P.lo,-.42),boot=kit.stone?tone(P.lo,-.35):'#2b2531',lw=kit.stone?3:2.4;
  for(const [hx,ph,fx,shade]of[[-1.3,g+Math.PI,-1.5+dx*.4,-.25],[1.3,g,1.6+dx,0]]){const J=ik(dx+hx*b,hipY+.6,fx+Math.sin(ph)*4.2*walk,-1.3-lift(ph),4.8,4.8,-1),pc=shade?tone(pants,shade):pants;
   line(c,[[J.sx,J.sy],[J.ex,J.ey],[J.hx,J.hy]],lw+1.4,INK);line(c,[[J.hx-.2,J.hy-.3],[J.hx+1.8,J.hy+.1]],2.8+1.4,INK);line(c,[[J.sx,J.sy],[J.ex,J.ey],[J.hx,J.hy]],lw,pc);line(c,[[J.hx-.2,J.hy-.3],[J.hx+1.8,J.hy+.1]],2.6,shade?tone(boot,shade):boot);}}
 // --- body, head, front arm
 upper(()=>{
  const hem=Math.sin(g)*1.1*walk;
  if(kit.robe){if(float)shape(c,()=>{c.moveTo(-3.3*b,-.6);c.quadraticCurveTo(-4.6,5,-1.6+hem*2,10.6);c.quadraticCurveTo(1.6,6,3.4*b,-.6);},lin(c,0,0,0,10,[P.lo,alpha(P.lo,.25)]),alpha(P.lo,.8),.7);
   else shape(c,()=>{c.moveTo(-3.3*b,-.6);c.lineTo(-4.8+hem,7.2);c.quadraticCurveTo(0,8.6,5+hem,7);c.lineTo(3.4*b,-.6);},lin(c,0,-1,0,8,[tone(P.lo,.08),tone(P.lo,-.2)]));}
  shape(c,()=>{c.moveTo(-3.2*b,.8);c.lineTo(-4.3*b,-6.8);c.quadraticCurveTo(-4.3*b,-8.7,-2.4*b,-8.8);c.lineTo(2.6*b,-8.8);c.quadraticCurveTo(4.5*b,-8.6,4.4*b,-6.8);c.lineTo(3.4*b,.8);c.quadraticCurveTo(0,1.8,-3.2*b,.8);},lin(c,-4,-9,4,1,[tone(P.hi,.14),P.hi,P.lo]));
  if(kit.stone){oval(c,-1.6,-6.6,1.8,1,'#7fae62',null);line(c,[[1,-7.4],[2.2,-4.6],[1.2,-2.4]],.5,tone(P.lo,-.2));}
  else{line(c,[[-3.2*b,-.3],[3.3*b,-.3]],1.1,tone(P.lo,-.4));dot(c,1.2,-.3,.6,'#e8c46a');line(c,[[-.8,-8.7],[.8,-6.8],[2.2,-8.7]],.6,tone(P.lo,-.3));}
  if(kit.armor)for(const [sx,dk]of[[-2.9*b,.25],[3.2*b,0]])oval(c,sx,-8,2.5,1.7,tone(P.hi,dk?-.25:.1));
  if(kit.scarf){const fl=Math.sin(t*6)*.6+Math.sin(g)*.6*walk;inked(c,[[-1.4,-8.4],[-3.6,-6.4+fl*.5],[-5.4-walk*1.6,-3.2+fl]],1.5,P.lo);line(c,[[-2.6,-8.6],[2.8,-8.8]],1.6,P.lo);}
  c.fillStyle=tone(skin,-.15);c.fillRect(-.6,-10,2,1.6);
  c.save();c.translate(.6,kit.stone?-11:-12.9+breath*.3);head(c,id,kit,P,t,walk,g);c.restore();
  if(kit.shield)shield(c,back.hx+.6,back.hy-.6,P,kit.shield);
  const tr=m.trail;if(tr&&p>tr[0]&&p<tr[1]+.08&&REACH[kit.weapon]){const pts=[];for(let q=Math.max(tr[0],p-.16);q<=Math.min(p,tr[1])+1e-6;q+=.02){const S=sample(m,q),J=ik(SF.x,SF.y,SF.x+S.hx,SF.y+S.hy,4.3,4.3,1),L=REACH[kit.weapon];pts.push([J.hx+Math.cos(S.wa)*L,J.hy+Math.sin(S.wa)*L]);}
   if(pts.length>1){c.save();c.globalAlpha=.55*clamp((tr[1]+.08-p)/.12,0,1);line(c,pts,2.6,tone(P.hi,.3));c.globalAlpha*=1.4;line(c,pts,.9,'#ffffff');c.restore();}}
  if(kit.weapon!=='fists'&&kit.weapon!=='orb')weapon(c,kit,P,front,wa,A,t,engage);
  drawArm(front,false);
  if(kit.weapon==='orb'){const ox=(front.hx+back.hx)/2+1.4,oy=Math.min(front.hy,back.hy)-3.4+Math.sin(t*3)*.8;glow(c,ox,oy,6+5*A.glow,P.hi,.55+.45*A.glow);oval(c,ox,oy,2.1,2.1,lin(c,ox-2,oy-2,ox+2,oy+2,['#ffffff',P.hi,P.lo]),alpha(P.lo,.9),.6);for(let i=0;i<3;i++){const a=t*2+i*2.1;dot(c,ox+Math.cos(a)*3.6,oy+Math.sin(a)*1.6,.45,'#f4e8ff');}}
 });
 if(kit.motion==='slam'&&A.flash>0){const r=3+(1-A.flash)*8;c.save();c.globalAlpha=A.flash*.85;c.beginPath();c.ellipse(9+dx,-.4,r,r*.35,0,0,TAU);c.lineWidth=1.2;c.strokeStyle='#efe2bb';c.stroke();for(let i=0;i<4;i++)dot(c,9+dx+(i-1.5)*r*.5,-1-(1-A.flash)*3*(i%2+1),.7,'#b9ad8e');c.restore();}
 c.restore();
 if(F>.3){const sq=(F-.3)/.7,sx=-14+Math.sin(sq*9)*1.5,sy=-4-sq*26,tc=o.player?'#ffe1a0':o.team?'#ffb4a8':'#b6ecf6';c.save();c.globalAlpha=Math.sin(Math.PI*sq)*.9;glow(c,sx,sy,7,tc,.7);shape(c,()=>{c.moveTo(sx,sy-3.4);c.quadraticCurveTo(sx+2.4,sy,sx,sy+3.4);c.quadraticCurveTo(sx-2.4,sy,sx,sy-3.4);},'#ffffff',null);c.restore();}
 c.restore();
}

// ---------- minions ----------
function minion(c,a,o={}){
 const face=(o.face??1)<0?-1:1,walk=o.walk||0,g=o.gait||0,hi=a.team?'#e79c8c':'#93cfd9',lo=a.team?'#8e5560':'#4d7b8c';
 c.save();c.translate(a.x,a.y+4);if(a.super)c.scale(1.3,1.3);const F=clamp(o.fall||0,0,1);if(F>.5)c.globalAlpha*=1-(F-.5)/.5;oval(c,.6,0,a.siege?9:4.6,a.siege?2.6:1.6,'rgba(8,22,22,.36)',null);c.scale(face,1);if(F)c.rotate(a.siege?Math.min(1,F/.3)*.5:-1.4*Math.min(1,F/.4)**2);
 if(a.siege){const sp=g*.9;for(const wx of[-5,5]){oval(c,wx,-2.6,2.6,2.6,'#5b4636');line(c,[[wx-Math.cos(sp)*2,-2.6-Math.sin(sp)*2],[wx+Math.cos(sp)*2,-2.6+Math.sin(sp)*2]],.6,'#c9ab7c');}
  shape(c,()=>{c.moveTo(-8,-4);c.lineTo(8,-4);c.lineTo(7,-9);c.lineTo(-7,-9);},lin(c,0,-9,0,-4,[hi,lo]));inked(c,[[1,-9],[8.6,-12.4]],2.4,'#4a4448');oval(c,-2,-11,2.6,2.2,hi);}
 else{const bob=-Math.abs(Math.cos(g))*.7*walk,s=Math.sin(g)*walk;
  for(const [hx,ph,sh]of[[-.8,Math.PI,-.25],[.8,0,0]]){const ss=Math.sin(g+ph)*walk;line(c,[[hx,-5+bob],[hx+ss*2.4,-.9]],1.9+1.2,INK);line(c,[[hx,-5+bob],[hx+ss*2.4,-.9]],1.9,tone(lo,-.35+sh));}
  shape(c,()=>{c.moveTo(-2.6,-4.4+bob);c.lineTo(-2.8,-9.4+bob);c.quadraticCurveTo(0,-10.6+bob,2.8,-9.4+bob);c.lineTo(2.6,-4.4+bob);},lin(c,0,-10,0,-4,[hi,lo]));
  oval(c,.3,-12+bob,2.7,2.7,'#e3bd98');shape(c,()=>{c.arc(.3,-12.3+bob,3.1,Math.PI*1.02,Math.PI*1.98);c.lineTo(3.4,-11.6+bob);c.lineTo(-2.8,-11.6+bob);},lo);dot(c,1.6,-11.6+bob,.45,INK);
  inked(c,[[2.8,-6.4+bob+s*.4],[6,-10.4+bob+s*.4]],.8,'#dfe6ea');}
 c.restore();
}

// ---------- jungle camps ----------
function creature(c,type){
 const t=now(),br=Math.sin(t*2.2),ink=INK;c.save();
 if(type==='blue'||type==='red'){const hi=type==='blue'?'#8fc6d8':'#d9805c',lo=type==='blue'?'#3f6a86':'#7a3a36',gem=type==='blue'?'#c6f6ff':'#ffd27a';
  if(type==='blue'){for(const lx of[-4.5,4.5])oval(c,lx,1,3.2,2.4,tone(lo,-.2));for(const s of[-1,1])oval(c,s*10,-7+br*.4,3.4,4.4,lo);shape(c,()=>{c.moveTo(-8,0);c.quadraticCurveTo(-10.5,-18-br*.6,0,-20-br*.6);c.quadraticCurveTo(10.5,-18-br*.6,8,0);c.quadraticCurveTo(0,2.4,-8,0);},lin(c,-8,-20,8,0,[tone(hi,.2),hi,lo]));
   glow(c,0,-24-br,8,gem,.6);shape(c,()=>{c.moveTo(0,-30-br);c.lineTo(3,-23-br);c.lineTo(0,-19-br);c.lineTo(-3,-23-br);},lin(c,0,-30,0,-19,['#ffffff',gem]));c.fillStyle='#fff6d0';c.fillRect(-4,-13-br*.5,2.2,1.4);c.fillRect(2,-13-br*.5,2.2,1.4);glow(c,0,-12.4,5,gem,.4);}
  else{for(const lx of[-8,-3,4,9])inked(c,[[lx,-4],[lx-.6,1]],1.8,tone(lo,-.2));shape(c,()=>c.ellipse(0,-7-br*.4,11,6.6,0,0,TAU),lin(c,0,-14,0,0,[hi,lo]));for(let i=0;i<5;i++){const sx=-8+i*3.8;shape(c,()=>{c.moveTo(sx-1.6,-11-br*.4);c.lineTo(sx-.2,-17.4-br*.4+(i%2)*1.6);c.lineTo(sx+1.6,-11.6-br*.4);},tone(lo,-.25));}glow(c,-1,-12,6,gem,.35+.2*br);
   oval(c,10.5,-6.4-br*.3,4.6,3.8,hi);inked(c,[[13,-4.6],[15.4,-7]],.8,'#f3e4c0');dot(c,12,-7.6,.7,'#ffe9a8');}}
 else if(type==='krugs'){shape(c,()=>{c.moveTo(-12,0);c.quadraticCurveTo(-14,-14,-4,-16-br*.4);c.quadraticCurveTo(7,-16,6,0);},lin(c,-10,-16,6,0,['#c4c3a8','#8c8d77','#5c6152']));oval(c,-7,-15-br*.4,3.6,1.6,'#7fa864',null);c.fillStyle='#ffe0a0';c.fillRect(0,-9,1.6,1.2);c.fillRect(2.8,-9,1.6,1.2);line(c,[[-6,-11],[-3,-6],[-5,-2]],.6,'#5c6152');
  shape(c,()=>{c.moveTo(6,1);c.quadraticCurveTo(6,-7-br*.3,11,-7-br*.3);c.quadraticCurveTo(15,-6,15,1);},lin(c,6,-7,15,1,['#bdbca2','#727563']));c.fillStyle='#ffe0a0';c.fillRect(11.4,-3.4,1.2,1);c.fillRect(13.4,-3.4,1.2,1);}
 else if(type==='gromp'){const sac=.5+.5*Math.max(0,br);for(const s of[-1,1])oval(c,s*9,-1,4,2.4,'#5e6f4c');shape(c,()=>c.ellipse(0,-7,11.5,8+br*.3,0,0,TAU),lin(c,0,-15,0,1,['#a6b37f','#748457','#4c5a3c']));oval(c,4,-3.2,5+sac,3.2+sac,'#e3cf8e');for(const s of[-5,3.5]){oval(c,s,-14.6,2.8,2.8,'#a6b37f');dot(c,s+.8,-14.6,1.1,INK);dot(c,s+1.1,-15,.35,'#ffffff');}for(const [sx,sy]of[[-6,-8],[-2,-11],[-8,-4]])dot(c,sx,sy,1,'#5f6d47');}
 else if(type==='wolves'){for(const [wx,wy,sc,f]of[[-8,1,1.1,1],[8.5,-3.5,.9,-1]]){c.save();c.translate(wx,wy);c.scale(sc*f,sc);const tw=Math.sin(t*4+wx)*.5;const fur=f>0?'#8794a0':'#a7afb6';inked(c,[[-6,-5],[-9.5,-8+tw*2],[-10.6,-10.6+tw*2]],1.8,fur);for(const lx of[-4,-1,2.4,4.6])inked(c,[[lx,-3],[lx,0]],1.2,tone(fur,-.25));shape(c,()=>c.ellipse(0,-5.6-br*.2,6.4,3.6,0,0,TAU),lin(c,0,-9,0,-2,[tone(fur,.2),fur]));shape(c,()=>{c.moveTo(3.6,-6.6);c.lineTo(5.2,-12);c.lineTo(9.6,-9.4);c.lineTo(11.6,-8);c.lineTo(9,-6.4);},fur);shape(c,()=>{c.moveTo(5.4,-10.8);c.lineTo(5.8,-13.8);c.lineTo(7.4,-11.4);},tone(fur,-.2));dot(c,8.2,-9.2,.6,'#ffd27a');c.restore();}}
 else if(type==='raptors'){for(const [rx,ry,ph]of[[-11,1,0],[0,-5,2],[11,1,4]]){const pk=Math.max(0,Math.sin(t*3+ph))**6*2;c.save();c.translate(rx,ry);inked(c,[[-1,-3],[-1.4,0]],.6,'#6a4a3a');inked(c,[[1.4,-3],[1.8,0]],.6,'#6a4a3a');shape(c,()=>c.ellipse(0,-6,4.2,3.6,0,0,TAU),lin(c,0,-10,0,-2,['#d9a77c','#a86a48']));oval(c,2.6,-9.6+pk,2.3,2.2,'#c98256');shape(c,()=>{c.moveTo(4.4,-10+pk);c.lineTo(7.2,-9+pk);c.lineTo(4.4,-8.4+pk);},'#f0cf80',INK,.5);inked(c,[[1.4,-11.4+pk],[.2,-13.8+pk]],.7,'#e05a48');dot(c,3.2,-10+pk,.45,INK);c.restore();}}
 else{const ph=t*6;for(let i=0;i<3;i++)for(const s of[-1,1])inked(c,[[s*4,-3+i],[s*(7.4+Math.sin(ph+i*1.4)*.8),-1.6+i*.8],[s*8.6,1]],.6,'#5f8b84');shape(c,()=>c.ellipse(0,-4.6-br*.3,8,4.8,0,0,TAU),lin(c,0,-10,0,0,['#b6d6c2','#6f9e8f','#45736a']));for(const s of[-1,1]){inked(c,[[s*2,-8.6],[s*2.6,-11.6]],.5,'#45736a');dot(c,s*2.6,-11.8,.9,'#f4e8c0');}oval(c,9.6,-5,2.4,1.8,'#6f9e8f');oval(c,-9.6,-5,2.4,1.8,'#6f9e8f');}
 c.restore();
}

// ---------- epic monsters ----------
function epic(c,o,baron,clock,seen,dying){if(!o.alive)return false;const t=clock,up=Math.sin(t*2);c.save();c.translate(o.x,o.y);if(!seen)c.globalAlpha=.4;if(dying!==undefined){c.globalAlpha*=1-dying;c.translate(0,dying*10);c.scale(1+dying*.15,1-dying*.45);}
 if(baron&&o.epic==='grubs'){for(const [gx,gy,ph]of[[-13,2,0],[0,-6,1.7],[13,2,3.4]]){const wv=Math.sin(t*3+ph);c.save();c.translate(gx,gy);for(let s=3;s>=0;s--){const sx=-s*2.6+wv*s*.4,sy=-3-s*.4;oval(c,sx,sy-wv*.3*s,3.6-s*.35,3-s*.25,s?'#9d82b4':'#c3a9d4');}dot(c,1.8,-4.6,.8,'#f6e3ff');glow(c,1.8,-4.6,3,'#d9b6ff',.5);c.restore();}}
 else if(baron&&o.epic==='herald'){oval(c,0,8,20,5,'rgba(10,20,26,.4)',null);const h=up*1.4;for(const s of[-1,1])inked(c,[[s*12,-2+h],[s*18,6],[s*16,9]],2,'#5c4a74');shape(c,()=>{c.moveTo(-17,2+h);c.quadraticCurveTo(-18,-20+h,0,-22+h);c.quadraticCurveTo(18,-20+h,17,2+h);c.quadraticCurveTo(0,8+h,-17,2+h);},lin(c,0,-22,0,6,['#c8b2d8','#8c73a0','#4f3e66']));for(let i=-2;i<=2;i++)line(c,[[i*5,-18+h],[i*6,2+h]],.7,'#5e4a78');oval(c,0,-8+h,5.6,4.2,'#2b2238');oval(c,.6,-8+h,3.2,3,'#e9b4e3',null);dot(c,1.2,-8.4+h,1.3,'#3a2050');glow(c,.6,-8+h,8,'#e9b4e3',.5);shape(c,()=>{c.moveTo(-3,-21+h);c.lineTo(0,-31+h);c.lineTo(3,-21+h);},'#b29ac6');}
 else if(baron){oval(c,0,6,24,8,'#1f1a2c');oval(c,0,5,20,6,'#2e2440',null);const sw=Math.sin(t*1.3)*2.4;c.lineCap='round';
  for(let i=0;i<6;i++){const a=i/5;const x=-14+a*12+Math.sin(t*1.3+a*3)*2*a,y=4-a*22+up*a;oval(c,x+sw*a,y,7-a*1.6,5.4-a*1.2,lin(c,x-6,y-5,x+6,y+5,['#b59ec8','#7a5f92','#4a3a5f']));if(i<5)shape(c,()=>{c.moveTo(x+sw*a-2,y-4.6+a);c.lineTo(x+sw*a-.4,y-9+a);c.lineTo(x+sw*a+1.8,y-4.4+a);},'#d9c3e8',INK,.6);}
  const hx=1+sw,hy=-24+up;shape(c,()=>{c.moveTo(hx-7,hy+3);c.quadraticCurveTo(hx-6,hy-7,hx+3,hy-7);c.quadraticCurveTo(hx+12,hy-5,hx+13,hy+1);c.quadraticCurveTo(hx+6,hy+6,hx-7,hy+3);},lin(c,hx,hy-7,hx,hy+5,['#cdb8dc','#8a6fa2']));
  for(const s of[0,1])inked(c,[[hx-3+s*5,hy-6],[hx-7+s*4,hy-13],[hx-10+s*4,hy-12]],1.3,'#5e4a74');shape(c,()=>{c.moveTo(hx+4,hy+2);c.lineTo(hx+13,hy+1.4);c.lineTo(hx+6,hy+4.6);},'#2a1c36',INK,.5);dot(c,hx+5.6,hy-2.6,1.2,'#ffd88a');glow(c,hx+5.6,hy-2.6,5,'#ffd88a',.6);}
 else{oval(c,0,10,20,5,'rgba(10,20,26,.4)',null);const fl=Math.sin(t*3)*5;
  for(const s of[-1,1]){shape(c,()=>{c.moveTo(s*3,-10);c.lineTo(s*24,-22-fl);c.lineTo(s*28,-8-fl*.4);c.quadraticCurveTo(s*20,-10,s*17,-4-fl*.2);c.quadraticCurveTo(s*12,-6,s*6,-2);},lin(c,0,-24,0,-2,['#b98a6c','#8a5f4c']));line(c,[[s*3,-10],[s*24,-22-fl]],1,'#5c3d33');}
  inked(c,[[-4,6],[-12,10+up],[-19,7+up]],2.6,'#a77b5f');shape(c,()=>c.ellipse(0,-2,8,11,0,0,TAU),lin(c,-8,-13,8,9,['#e6c08d','#bb8d63','#835f45']));oval(c,0,1,4,6,'#f0d6a6',null);
  for(const lx of[-5,5])inked(c,[[lx,6],[lx,10]],2.2,'#835f45');shape(c,()=>{c.moveTo(-3,-10);c.quadraticCurveTo(-2,-22+up,4,-24+up);c.quadraticCurveTo(12,-23+up,13,-18+up);c.quadraticCurveTo(7,-16+up,3,-9);},lin(c,0,-24,0,-9,['#e6c08d','#a8805c']));
  inked(c,[[2,-23+up],[-1,-28+up]],1,'#6f4f3d');inked(c,[[6,-23.4+up],[5,-29+up]],1,'#6f4f3d');dot(c,8,-20.6+up,.9,'#ffe6a1');glow(c,8,-20.6+up,4,'#ffe6a1',.5);}
 c.restore();if(seen&&dying===undefined){c.fillStyle=INK;c.fillRect(o.x-23,o.y-43,46,4);c.fillStyle=baron?'#bda1d6':'#d3ac7c';c.fillRect(o.x-22,o.y-42,44*Math.max(0,o.hp/(o.maxHp||450)),2);}return true;}

// ---------- structures: nexus, barracks, rubble, collapse ----------
const TEAM=t=>t?{hi:'#f3a6a5',lo:'#b46b8e',glow:'#ff9f9a',banner:'#c9575e'}:{hi:'#a1eeef',lo:'#4b9eaf',glow:'#8ff0f2',banner:'#3f8fb0'};
const STONE=['#c3cab1','#97a38c','#647269'];
const rnd=(i,s=0)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
function rubble(c,x,y,size=1,seed=0,tint){c.save();c.translate(x,y);c.scale(size,size);oval(c,1,5,17,5.5,'rgba(8,22,22,.32)',null);
 for(let i=0;i<9;i++){const a=rnd(i,seed)*TAU,r=4+rnd(i+9,seed)*10,px=Math.cos(a)*r,py=Math.sin(a)*r*.35+2,w=2.4+rnd(i+3,seed)*3.4;shape(c,()=>{c.moveTo(px-w,py+1);c.lineTo(px-w*.6,py-w*.9);c.lineTo(px+w*.7,py-w*.7);c.lineTo(px+w,py+1);},lin(c,px,py-w,px,py+1,[STONE[0],STONE[2]]),INK,.7);}
 if(tint)for(let i=0;i<4;i++){const px=(rnd(i,seed+5)-.5)*16,py=(rnd(i,seed+7)-.5)*5;shape(c,()=>{c.moveTo(px,py-3);c.lineTo(px+1.6,py);c.lineTo(px,py+1.4);c.lineTo(px-1.6,py);},tint,INK,.5);}
 c.restore();}
function puffs(c,x,y,q,spread,seed=0,col='#d8ccaa'){if(q>=1)return;c.save();for(let i=0;i<10;i++){const a=Math.PI+rnd(i,seed)*Math.PI,d=spread*(.3+q*(.6+rnd(i+4,seed)*.6));c.globalAlpha=(1-q)*(1-q)*.4;dot(c,x+Math.cos(a)*d*1.3,y+6+Math.sin(a)*d*.45-q*8*rnd(i+8,seed),1.6+q*4.5*rnd(i+2,seed)+1.2,col);}c.restore();}
// The standing art sinks into the ground with a shake while dust rises; drawAlive paints at world coordinates.
function collapse(c,x,y,q,drawAlive,w,h,big){q=clamp(q,0,1);const sink=ease(clamp((q-.1)/.8,0,1));c.save();c.beginPath();c.rect(x-w-20,y-h-60,w*2+40,h+60+12);c.clip();c.translate(x,y+12);c.rotate(sink*.1*(rnd(x,y)>.5?1:-1));c.translate(-x,-(y+12));c.translate(Math.sin(q*70)*1.6*(1-q),sink*h*.95);c.globalAlpha*=1-sink*sink;drawAlive();c.restore();
 puffs(c,x,y,q,w*1.2,x);
 if(big){const r=q*90;c.save();c.globalAlpha=Math.max(0,1-q*1.4);c.lineWidth=3*(1-q)+.5;c.strokeStyle='#fff3c8';c.beginPath();c.ellipse(x,y-6,r,r*.45,0,0,TAU);c.stroke();glow(c,x,y-20,40+q*30,'#fff1c4',Math.max(0,.9-q*2));for(let i=0;i<12;i++){const a=rnd(i,7)*TAU,v=30+rnd(i,9)*45;dot(c,x+Math.cos(a)*v*q,y-20+Math.sin(a)*v*q*.6+60*q*q,2*(1-q)+.4,'#e9fbff');}c.restore();}}
function crystal(c,x,y,s,hi,lo,crack){shape(c,()=>{c.moveTo(x,y-22*s);c.lineTo(x+13*s,y-9*s);c.lineTo(x+8*s,y+10*s);c.lineTo(x,y+17*s);c.lineTo(x-9*s,y+9*s);c.lineTo(x-13*s,y-9*s);},lin(c,x-13*s,y-22*s,x+13*s,y+17*s,['#ffffff',hi,lo]),INK,1);
 line(c,[[x,y-22*s],[x-2*s,y+2*s],[x,y+17*s]],.7,alpha('#ffffff',.6));line(c,[[x-13*s,y-9*s],[x-2*s,y+2*s],[x+8*s,y+10*s]],.6,alpha(lo,.8));shape(c,()=>{c.moveTo(x-1*s,y-18*s);c.lineTo(x-9*s,y-8*s);c.lineTo(x-3*s,y-4*s);},alpha('#ffffff',.55),null);
 if(crack)line(c,[[x+4*s,y-14*s],[x+1*s,y-6*s],[x+5*s,y-1*s],[x+2*s,y+6*s]],.8,'#3a2a3a');}
function core(c,u,clock){const x=u.x,y=u.y,T=TEAM(u.team),alive=u.hp>0,frac=u.hp/(u.maxHp||700);
 oval(c,x+1,y+13,32,9,'rgba(8,22,22,.42)',null);
 shape(c,()=>c.ellipse(x,y+9,28,10,0,0,TAU),lin(c,x-28,y,x+28,y+16,STONE));shape(c,()=>c.ellipse(x,y+5,22,7.6,0,0,TAU),lin(c,x-22,y,x+22,y+10,['#b8c0a6','#8e9a84']),INK,.9);
 c.save();c.globalAlpha=alive?.55+.25*Math.sin(clock*3):.15;c.lineWidth=1.2;c.strokeStyle=T.hi;c.beginPath();c.ellipse(x,y+5,16,5.4,0,0,TAU);c.stroke();c.setLineDash([2,3]);c.beginPath();c.ellipse(x,y+5,19.5,6.6,0,0,TAU);c.stroke();c.restore();
 const pillars=[0,1,2,3].map(i=>{const a=i/4*TAU+Math.PI/4;return{px:x+Math.cos(a)*24,py:y+5+Math.sin(a)*8.4};});
 const pillar=({px,py})=>{shape(c,()=>{c.moveTo(px-2.6,py+2);c.lineTo(px-2.2,py-12);c.lineTo(px+2.2,py-12);c.lineTo(px+2.6,py+2);},lin(c,px-3,0,px+3,0,STONE),INK,.8);oval(c,px,py-12.6,2.8,1.2,'#b4bba3',INK,.7);if(alive){glow(c,px,py-15,5,T.glow,.5);oval(c,px,py-15.4,1.3,1.8,T.hi,INK,.5);}};
 const shard=a=>{const cy=y-26+Math.sin(clock*2)*2,sx=x+Math.cos(a)*20,sy=cy+4+Math.sin(a)*6;shape(c,()=>{c.moveTo(sx,sy-3.4);c.lineTo(sx+2,sy);c.lineTo(sx,sy+3.4);c.lineTo(sx-2,sy);},T.hi,INK,.6);};
 pillars.filter(p=>p.py<y+5).forEach(pillar);
 if(alive){const cy=y-26+Math.sin(clock*2)*2;glow(c,x,cy,38,T.glow,.45+(frac<.35?.25*Math.sin(clock*12):0));
  for(let i=0;i<3;i++){const a=clock*1.1+i*TAU/3;if(Math.sin(a)<0)shard(a);}
  crystal(c,x,cy,1.05,T.hi,T.lo,frac<.5);
  for(let i=0;i<3;i++){const a=clock*1.1+i*TAU/3;if(Math.sin(a)>=0)shard(a);}}
 else{rubble(c,x,y+2,1.1,u.team+3,T.lo);shape(c,()=>{c.moveTo(x-6,y+4);c.lineTo(x-4,y-6);c.lineTo(x+1,y-9);c.lineTo(x+5,y-3);c.lineTo(x+6,y+4);},lin(c,x,y-9,x,y+4,[tone(T.hi,-.3),tone(T.lo,-.4)]),INK,.8);}
 pillars.filter(p=>p.py>=y+5).forEach(pillar);}
function inhibitor(c,x,y,team,alive,clock,seen=true){const T=TEAM(team);c.save();if(!seen)c.globalAlpha*=.72;
 if(!alive){rubble(c,x,y,.85,team+x,T.lo);c.restore();return;}
 oval(c,x+1,y+7,18,5.5,'rgba(8,22,22,.38)',null);shape(c,()=>c.ellipse(x,y+4,15,5.2,0,0,TAU),lin(c,x-15,y,x+15,y+8,STONE),INK,.9);
 shape(c,()=>{c.moveTo(x-11,y+4);c.lineTo(x-11,y-11);c.lineTo(x+11,y-11);c.lineTo(x+11,y+4);c.quadraticCurveTo(x,y+7,x-11,y+4);},lin(c,x-11,0,x+11,0,STONE));
 c.strokeStyle='rgba(40,52,52,.35)';c.lineWidth=.6;for(const yy of[-6,-1]){c.beginPath();c.moveTo(x-11,y+yy);c.lineTo(x+11,y+yy);c.stroke();}
 const pulse=.55+.3*Math.sin(clock*3+x);shape(c,()=>{c.moveTo(x-4,y+5.4);c.lineTo(x-4,y-3);c.arc(x,y-3,4,Math.PI,0);c.lineTo(x+4,y+5.4);},'#1a2230',INK,.8);glow(c,x,y-1,7,T.glow,pulse*.7);oval(c,x,y-1,2,3,alpha(T.hi,.9),null);
 shape(c,()=>{c.moveTo(x-14,y-10);c.lineTo(x,y-25);c.lineTo(x+14,y-10);c.quadraticCurveTo(x,y-7.6,x-14,y-10);},lin(c,x,y-25,x,y-8,[tone(T.lo,.25),T.lo,tone(T.lo,-.3)]));line(c,[[x,y-25],[x,y-9]],.6,alpha('#ffffff',.3));
 glow(c,x,y-28,6,T.glow,.6);shape(c,()=>{c.moveTo(x,y-32);c.lineTo(x+2.4,y-28);c.lineTo(x,y-24.6);c.lineTo(x-2.4,y-28);},lin(c,x,y-32,x,y-25,['#ffffff',T.hi]),INK,.6);
 const fx=x+12.5,wv=Math.sin(clock*4+x)*1.2;line(c,[[fx,y+3],[fx,y-19]],1.6,INK);line(c,[[fx,y+3],[fx,y-19]],.8,'#8b6845');shape(c,()=>{c.moveTo(fx,y-18.6);c.quadraticCurveTo(fx+4,y-19.6+wv,fx+8,y-17.6+wv*1.4);c.lineTo(fx+7.4,y-13.8+wv*1.2);c.quadraticCurveTo(fx+4,y-15.4+wv,fx,y-14);},T.banner,INK,.6);
 c.restore();}

// ---------- install ----------
function install(){RPG_ART.hero=hero;RPG_ART.creature=creature;RPG_ART.epic=epic;if(window.ART_PACK)ART_PACK.actorStyle='field-rig';document.querySelectorAll('.hero .avatar canvas').forEach(c=>c.remove());HERO_ART.portraits();window.OVERVIEW?.refreshPortraits();if(typeof state!=='undefined'&&state&&window.BROADCAST)BROADCAST.refreshPortraits();if(window.MATCH_UI)MATCH_UI.update();}
window.FIELD_ACTORS={hero,minion,creature,epic,core,inhibitor,rubble,collapse,puffs,kits:KIT,motions:M,sample,worldBodyHeight:28};
install();if(!window.ART_PACK?.ready)window.addEventListener('artpackready',install,{once:true});
})();
