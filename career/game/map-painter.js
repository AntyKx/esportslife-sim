'use strict';
// Original vector battlefield, painted once into the cached ground layer (800×640 world, 2× device pixels).
// Open areas (lanes, river, pits, plazas, camp clearings, straight jungle corridors) are carved from a jungle mask;
// what remains becomes cliff-and-canopy walls. Purely decorative: no collision or pathing is added.
(()=>{
const W=800,H=640,TAU=Math.PI*2,INK='#1c2130';
function rng(seed){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function layer(){const n=document.createElement('canvas');n.width=W*2;n.height=H*2;const c=n.getContext('2d');c.setTransform(2,0,0,2,0,0);return [n,c];}
const mirror=([x,y])=>[W-x,H-y];
function laneStroke(c,l,w,col,r=46){c.beginPath();c.moveTo(l[0][0],l[0][1]);for(let i=1;i<l.length-1;i++)c.arcTo(l[i][0],l[i][1],l[i+1][0],l[i+1][1],r);c.lineTo(l[l.length-1][0],l[l.length-1][1]);c.lineWidth=w;c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';c.stroke();}
function smooth(c,pts){c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++)c.quadraticCurveTo(pts[i][0],pts[i][1],(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2);const l=pts[pts.length-1];c.lineTo(l[0],l[1]);}
function strokePath(c,pts,w,col,smoothIt=true){c.beginPath();smoothIt?smooth(c,pts):pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=w;c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';c.stroke();}
function disc(c,x,y,r,col){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=col;c.fill();}
function soft(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}

// ---------- layout ----------
const NAV=window.RIFT_NAV,RIVER=NAV.RIVER;
const PLAY={x0:84,y0:12,x1:716,y1:628},ZONE=[{bank:'#5f5a52',deep:'#2c3f6a',mid:'#41538e',glow:'rgba(170,140,240,A)'},{bank:'#6e5f48',deep:'#25606a',mid:'#3a8582',glow:'rgba(250,200,120,A)'}];
// Base: cut-corner square that keeps every high-ground tower, inhibitor and Nexus tower just inside its gate.
function basePoly(team,g=0){return NAV.basePoly(team,g);}
function plazaPath(c,team,g=0){const p=basePoly(team,g),n=p.length;c.moveTo((p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2);for(let i=1;i<=n;i++)c.arcTo(p[i%n][0],p[i%n][1],p[(i+1)%n][0],p[(i+1)%n][1],22);c.closePath();}
function baseEdge(team){const p=basePoly(team),out=[];for(let i=0;i<3;i++){const [ax,ay]=p[i],[bx,by]=p[i+1],len=Math.hypot(bx-ax,by-ay);for(let d=0;d<len;d+=2)out.push([ax+(bx-ax)*d/len,ay+(by-ay)*d/len]);}return out;}
// River: each half is tinted as the Baron (upper) / Dragon (lower) zone; the pits are alcoves cut into the banks.
function riverSamples(){return NAV.RS;}
function corridors(camps,lanes,pits){const out=[],pts=[...camps.map(c=>[c.x,c.y]),...pits];
 for(const p of pts){const near=pts.filter(q=>q!==p).map(q=>[q,Math.hypot(q[0]-p[0],q[1]-p[1])]).sort((a,b)=>a[1]-b[1]).slice(0,2);for(const [q,d]of near)if(d<175)out.push([p,q]);
  let best=null,bd=1e9;for(const lane of lanes)for(let i=0;i<lane.length-1;i++){const [ax,ay]=lane[i],[bx,by]=lane[i+1],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p[0]-ax)*dx+(p[1]-ay)*dy)/(dx*dx+dy*dy))),x=ax+dx*t,y=ay+dy*t,d=Math.hypot(x-p[0],y-p[1]);if(d<bd){bd=d;best=[x,y];}}
  if(best&&bd<190)out.push([p,best]);}
 return out;}

function roundMask(m,mN){m.save();m.setTransform(1,0,0,1,0,0);const t=document.createElement('canvas');t.width=mN.width;t.height=mN.height;const tc=t.getContext('2d');tc.filter='blur(5px)';tc.drawImage(mN,0,0);const d=tc.getImageData(0,0,t.width,t.height),a=d.data;for(let i=3;i<a.length;i+=4)a[i]=a[i]>110?255:0;m.globalCompositeOperation='copy';m.putImageData(d,0,0);m.restore();m.globalCompositeOperation='destination-out';}
// (unused) Jungle as walkable ground with wall islands: Voronoi cell borders become paths (point-symmetric seeds), then blur+threshold rounds the blobs.
function islands(m,mN,R){const seeds=[],IN={x0:166,y0:86,x1:634,y1:554};let tries=0;for(const c of(window.state?.camps||[]).filter(c=>c.type!=='scuttle'&&c.home===0))for(let k=0;k<3;k++){const a=k/3*TAU+R()*1.2,q=[c.x+Math.cos(a)*62,c.y+Math.sin(a)*62];if(q[0]>IN.x0&&q[0]<IN.x1&&q[1]>IN.y0&&q[1]<IN.y1)seeds.push(q,mirror(q));}
 while(seeds.length<70&&tries++<4000){const x=IN.x0+R()*(IN.x1-IN.x0),y=IN.y0+R()*(IN.y1-IN.y0);if(x/W+y/H>1)continue;const q=[x,y],mq=mirror(q);if(Math.hypot(x-mq[0],y-mq[1])<60)continue;if(seeds.some(s=>Math.hypot(s[0]-x,s[1]-y)<60||Math.hypot(s[0]-mq[0],s[1]-mq[1])<60))continue;seeds.push(q,mq);}
 const S=2,gw=W/S,gh=H/S,e=document.createElement('canvas');e.width=gw;e.height=gh;const ec=e.getContext('2d'),img=ec.createImageData(gw,gh);
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const x=gx*S+1,y=gy*S+1;if(x<IN.x0||x>IN.x1||y<IN.y0||y>IN.y1)continue;let d1=1e9,d2=1e9;for(const [sx,sy]of seeds){const d=Math.hypot(sx-x,sy-y);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}if(d2-d1<15)img.data[(gy*gw+gx)*4+3]=255;}
 ec.putImageData(img,0,0);m.save();m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation='destination-out';m.imageSmoothingEnabled=true;m.drawImage(e,0,0,mN.width,mN.height);
 const t=document.createElement('canvas');t.width=mN.width;t.height=mN.height;const tc=t.getContext('2d');tc.filter='blur(5px)';tc.drawImage(mN,0,0);
 const d=tc.getImageData(0,0,t.width,t.height),a=d.data;for(let i=3;i<a.length;i+=4)a[i]=a[i]>110?255:0;m.globalCompositeOperation='copy';m.putImageData(d,0,0);m.restore();m.globalCompositeOperation='destination-out';}

// Border scenery outside the playfield: rocky plateau, low-poly peaks, pines, ruined pillars and a boulder rim.
function rimPath(c,g=0){const {x0,y0,x1,y1}=PLAY,r=34;c.roundRect?c.roundRect(x0-g,y0-g,x1-x0+g*2,y1-y0+g*2,r):c.rect(x0-g,y0-g,x1-x0+g*2,y1-y0+g*2);}
function scenery(c,R){c.save();c.beginPath();c.rect(-10,-10,W+20,H+20);rimPath(c);c.clip('evenodd');
 const bg=c.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#283330');bg.addColorStop(.12,'#4d5249');bg.addColorStop(.88,'#4d5249');bg.addColorStop(1,'#283330');c.fillStyle=bg;c.fillRect(0,0,W,H);
 for(let i=0;i<160;i++){const x=R()<.5?R()*90:W-R()*90,y=R()*H;soft(c,x,y,10+R()*26,R()>.5?'rgba(120,125,105,A)':'rgba(20,28,26,A)',.35);}
 const items=[],peak=(px,py,w,h)=>()=>{const tip=[px+(R()-.5)*w*.2,py-h],mid=[px+w*(.05+R()*.15),py];
   c.beginPath();c.moveTo(px-w/2,py);c.lineTo(tip[0],tip[1]);c.lineTo(mid[0],mid[1]);c.closePath();const lg=c.createLinearGradient(px-w/2,py,tip[0],tip[1]);lg.addColorStop(0,'#7d7f6e');lg.addColorStop(1,'#b9b8a2');c.fillStyle=lg;c.fill();
   c.beginPath();c.moveTo(mid[0],mid[1]);c.lineTo(tip[0],tip[1]);c.lineTo(px+w/2,py);c.closePath();c.fillStyle='#55594f';c.fill();
   c.beginPath();c.moveTo(px-w/2,py);c.lineTo(tip[0],tip[1]);c.lineTo(px+w/2,py);c.strokeStyle=INK;c.lineWidth=.9;c.lineJoin='round';c.stroke();
   c.beginPath();c.moveTo(tip[0],tip[1]);c.lineTo(tip[0]-h*.14,tip[1]+h*.24);c.lineTo(tip[0]-h*.02,tip[1]+h*.18);c.lineTo(tip[0]+h*.1,tip[1]+h*.26);c.closePath();c.fillStyle='rgba(235,235,220,.85)';c.fill();
   c.strokeStyle='rgba(30,35,30,.35)';c.lineWidth=.6;for(let k=0;k<3;k++){const f=.35+k*.2;c.beginPath();c.moveTo(tip[0]+(mid[0]-tip[0])*f,tip[1]+(mid[1]-tip[1])*f);c.lineTo(tip[0]+(mid[0]-tip[0])*f+w*.12,tip[1]+(mid[1]-tip[1])*f+h*.12);c.stroke();}};
 for(const side of[0,1])for(let y=-30;y<H+60;y+=26+R()*16){const w=46+R()*44,x=side?W-14-R()*58:14+R()*58;items.push({y,draw:peak(x,y,w,38+R()*44)});}
 for(let i=0;i<70;i++){const side=R()<.5,x=side?W-6-R()*80:6+R()*80,y=R()*H,t=sprites.trees[sprites.trees.length-1-Math.floor(R()*2)];items.push({y,draw:()=>stamp(c,t,x,y-4,.8+R()*.4)});}
 for(const [x,y]of[[34,150],[766,490],[52,420],[748,220]])items.push({y,draw:()=>{c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+3,y,9,3.5,0,0,TAU);c.fill();const pg=c.createLinearGradient(x-5,0,x+5,0);pg.addColorStop(0,'#c9c6b0');pg.addColorStop(1,'#7e7c6c');c.fillStyle=pg;c.fillRect(x-5,y-26,10,26);c.fillStyle='#d8d5bf';c.fillRect(x-7,y-29,14,4);c.strokeStyle=INK;c.lineWidth=.8;c.strokeRect(x-5,y-26,10,26);c.strokeRect(x-7,y-29,14,4);c.beginPath();c.moveTo(x-5,y-12);c.lineTo(x+1,y-15);c.lineTo(x+5,y-11);c.strokeStyle='rgba(40,40,30,.6)';c.stroke();stamp(c,sprites.rocks[1],x+9,y-1,.8);}});
 items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
 const v=c.createRadialGradient(400,320,330,400,320,560);v.addColorStop(0,'rgba(10,18,20,0)');v.addColorStop(1,'rgba(10,18,20,.55)');c.fillStyle=v;c.fillRect(0,0,W,H);c.restore();
 // cliff rim: drop shadow onto the playfield edge, a stone lip, then boulders along it
 c.save();c.beginPath();rimPath(c);c.clip();c.beginPath();rimPath(c,8);c.lineWidth=16;c.strokeStyle='rgba(20,28,20,.35)';c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=10;c.stroke();c.restore();
 c.beginPath();rimPath(c,1);c.lineWidth=5;c.strokeStyle='#5f6155';c.stroke();c.beginPath();rimPath(c,-1);c.lineWidth=1.4;c.strokeStyle='#a7a891';c.stroke();
 const {x0,y0,x1,y1}=PLAY,edge=[];for(let x=x0+30;x<x1-30;x+=9)edge.push([x,y0-3],[x,y1+3]);for(let y=y0+30;y<y1-30;y+=9)edge.push([x0-3,y],[x1+3,y]);
 for(const [x,y]of edge)if(R()<.7)stamp(c,sprites.rocks[Math.floor(R()*3)],x+(R()-.5)*3,y+(R()-.5)*3,.7+R()*.4);}

// ---------- sprites ----------
const sprites={};
function treeSprite(r,base,light,dark,kind){const s=Math.ceil(r*2+6),n=document.createElement('canvas');n.width=n.height=s*2;const c=n.getContext('2d');c.scale(2,2);const cx=s/2,cy=s/2;
 const lobes=(rad,col,ox=0,oy=0)=>{c.beginPath();for(let i=0;i<7;i++){const a=i/7*TAU+.3,x=cx+ox+Math.cos(a)*rad*.42,y=cy+oy+Math.sin(a)*rad*.42;c.moveTo(x+rad*.62,y);c.arc(x,y,rad*.62,0,TAU);}c.fillStyle=col;c.fill();};
 if(kind==='pine'){for(let k=0;k<3;k++){const y0=cy-r+k*r*.55,w=r*(.55+k*.25);c.beginPath();c.moveTo(cx,y0-r*.2);c.lineTo(cx+w,y0+r*.7);c.lineTo(cx-w,y0+r*.7);c.closePath();c.fillStyle=k?base:light;c.fill();c.strokeStyle=dark;c.lineWidth=.8;c.stroke();}return n;}
 lobes(r+.8,dark,.6,1.2);const g=c.createRadialGradient(cx-r*.35,cy-r*.45,r*.1,cx,cy,r*1.05);g.addColorStop(0,light);g.addColorStop(.55,base);g.addColorStop(1,dark);lobes(r,g);
 c.globalAlpha=.55;for(let i=0;i<5;i++){const a=i*1.3+.4;disc(c,cx-r*.25+Math.cos(a)*r*.35,cy-r*.3+Math.sin(a)*r*.3,r*.16,light);}c.globalAlpha=1;return n;}
function rockSprite(r){const n=document.createElement('canvas'),s=Math.ceil(r*2+4);n.width=n.height=s*2;const c=n.getContext('2d');c.scale(2,2);const cx=s/2,cy=s/2;c.beginPath();c.moveTo(cx-r,cy+r*.45);c.lineTo(cx-r*.75,cy-r*.35);c.lineTo(cx-r*.1,cy-r*.75);c.lineTo(cx+r*.7,cy-r*.45);c.lineTo(cx+r,cy+r*.4);c.quadraticCurveTo(cx,cy+r*.8,cx-r,cy+r*.45);c.closePath();const g=c.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#c7c8b5');g.addColorStop(.5,'#8e9586');g.addColorStop(1,'#596259');c.fillStyle=g;c.fill();c.strokeStyle=INK;c.lineWidth=.8;c.stroke();c.beginPath();c.moveTo(cx-r*.6,cy-r*.2);c.lineTo(cx-r*.05,cy-r*.55);c.strokeStyle='rgba(255,255,255,.4)';c.stroke();return n;}
function buildSprites(){if(sprites.ready)return;const T=[['#2f5b3b','#5f9055','#183021'],['#2a5240','#4f8a66','#152a20'],['#3b6438','#79a25a','#1d3620'],['#4a6b38','#97b062','#25381c'],['#2c5a4a','#5c9a7c','#16302a']];
 sprites.trees=[];for(const [b,l,d]of T)for(const r of[7,9,11])sprites.trees.push({img:treeSprite(r,b,l,d),r});
 for(const r of[8,10])sprites.trees.push({img:treeSprite(r,'#2b5146','#4e8a72','#132a24','pine'),r,pine:true});
 sprites.rocks=[4,6,8].map(r=>({img:rockSprite(r),r}));sprites.ready=true;}
function stamp(c,s,x,y,scale=1){const d=s.img.width/2*scale;c.drawImage(s.img,x-d/2,y-d/2,d,d);}

// ---------- painting ----------
function paint(c,lanes,bases,camps){buildSprites();const R=rng(20261102),S=window.state;
 const baron=S?.baron?[S.baron.x,S.baron.y]:NAV.BARON,dragon=S?.dragon?[S.dragon.x,S.dragon.y]:NAV.DRAGON,cores=bases.map(b=>[b.x,b.y]);
 if(!camps?.length)camps=[[256,306],[190,271],[254,359],[370,427],[396,485],[413,535]].flatMap(p=>[p,mirror(p)]).map(([x,y])=>({x,y}));
 // 1. grass
 const gg=c.createLinearGradient(0,0,W,H);gg.addColorStop(0,'#5d8a4b');gg.addColorStop(.5,'#4f7e45');gg.addColorStop(1,'#46733f');c.fillStyle=gg;c.fillRect(0,0,W,H);
 for(let i=0;i<260;i++){const x=R()*W,y=R()*H,r=25+R()*70;soft(c,x,y,r,R()>.5?'rgba(120,160,90,A)':'rgba(40,70,40,A)',.12);}
 for(let i=0;i<7000;i++){const x=R()*W,y=R()*H,l=1.6+R()*2;c.strokeStyle=R()>.55?'rgba(150,190,110,.35)':'rgba(30,60,35,.35)';c.lineWidth=.6;c.beginPath();c.moveTo(x-1,y);c.lineTo(x-.6,y-l);c.moveTo(x+.6,y);c.lineTo(x+1.2,y-l*.8);c.stroke();}
 for(let i=0;i<420;i++){disc(c,R()*W,R()*H,.7+R()*.6,['#f4ecd0','#f2d36b','#e9a3b8','#c9e4f5'][i%4]);}
 // 4. river, pits, bridge
 // 2b. jungle trails along the walkable network (same geometry as the pathfinding)
 for(const [w,col]of[[30,'rgba(52,62,38,.35)'],[22,'#8a7d5a'],[14,'rgba(176,160,118,.75)']])for(const seg of NAV.NET)strokePath(c,seg,w,col,false);
 for(const seg of NAV.NET)for(let i=0;i<seg.length-1;i++){const [ax,ay]=seg[i],[bx,by]=seg[i+1],len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/len,ny=(bx-ax)/len;for(let d=0;d<len;d+=4){if(R()<.6)continue;const o=(R()-.5)*16,x=ax+(bx-ax)*d/len+nx*o,y=ay+(by-ay)*d/len+ny*o;c.beginPath();c.ellipse(x,y,1.3+R()*1.2,.9+R()*.8,R()*3,0,TAU);c.fillStyle=R()>.5?'#b9a882':'#8f7f5c';c.fill();}}
 const RS=riverSamples([baron,dragon]);
 const alcove=([px,py])=>{let b=RS[0],bd=1e9;for(const q of RS){const d=Math.hypot(q[0]-px,q[1]-py);if(d<bd){bd=d;b=q;}}return{n:[(px-b[0])/bd,(py-b[1])/bd],mouth:[b[0],b[1]],d:bd};},ALC=[alcove(baron),alcove(dragon)];
 // the river bulges into a bay on its upper (Baron) and lower (Dragon) bank; each pit is a sunken platform standing in that bay
 for(const [grow,key]of[[9,'shade'],[5,'bank'],[0,'deep'],[-7,'mid']]){for(const [x,y,r,h]of RS)disc(c,x,y,r+grow,key==='shade'?'rgba(40,46,30,.45)':ZONE[h][key]);for(const [k,p]of[[0,baron],[1,dragon]])disc(c,p[0],p[1],47+grow,key==='shade'?'rgba(40,46,30,.45)':ZONE[k][key]);}
 for(const [px,py,kind]of[[...baron,'void'],[...dragon,'rune']]){disc(c,px,py,38,'rgba(200,235,235,.28)');c.save();c.shadowColor='rgba(0,0,0,.4)';c.shadowBlur=6;c.shadowOffsetY=2;disc(c,px,py,35,'#77705c');c.restore();
  const g=c.createRadialGradient(px,py-4,4,px,py,32);if(kind==='void'){g.addColorStop(0,'#3d2d63');g.addColorStop(.7,'#2b2346');g.addColorStop(1,'#1a1a2c');}else{g.addColorStop(0,'#c9ad7e');g.addColorStop(.7,'#9c8460');g.addColorStop(1,'#6b5a45');}disc(c,px,py,32,g);}
 for(const [x,y,r,h]of RS)soft(c,x,y,r*.8,ZONE[h].glow,h?.03:.05);
 // 2. lanes: worn edge, dirt, cobbles
 for(const [w,col]of[[50,'rgba(52,62,38,.45)'],[42,'#8f8360'],[34,'#a99a73'],[18,'rgba(196,182,140,.5)']])for(const l of lanes)laneStroke(c,l,w,col);
 for(const l of lanes)for(let i=0;i<l.length-1;i++){const [ax,ay]=l[i],[bx,by]=l[i+1],len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/len,ny=(bx-ax)/len;for(let d=0;d<len;d+=3.2){const o=(R()-.5)*34,x=ax+(bx-ax)*d/len+nx*o,y=ay+(by-ay)*d/len+ny*o;if(R()<.55)continue;c.beginPath();c.ellipse(x,y,1.6+R()*1.8,1.1+R()*1.1,R()*3,0,TAU);c.fillStyle=R()>.5?'#c4b48e':'#9c8c66';c.fill();c.lineWidth=.35;c.strokeStyle='rgba(60,50,35,.5)';c.stroke();}
  for(let d=0;d<len;d+=2.4)for(const s of[-1,1]){const x=ax+(bx-ax)*d/len+nx*s*(19+R()*3),y=ay+(by-ay)*d/len+ny*s*(19+R()*3);c.strokeStyle='rgba(70,110,55,.7)';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+(R()-.5)*2,y-2-R()*2);c.stroke();}}
 // 3. base plazas
 cores.forEach(([cx,cy],team)=>{c.save();c.beginPath();c.rect(PLAY.x0,PLAY.y0,PLAY.x1-PLAY.x0,PLAY.y1-PLAY.y0);c.clip();c.beginPath();plazaPath(c,team);c.save();c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=8;const pg=c.createRadialGradient(cx,cy,10,cx,cy,280);pg.addColorStop(0,team?'#c9bfb6':'#b9c6c3');pg.addColorStop(1,team?'#8f8a80':'#83918d');c.fillStyle=pg;c.fill();c.restore();c.clip();
  c.strokeStyle='rgba(80,90,78,.5)';c.lineWidth=.8;for(let r=24;r<320;r+=19){c.beginPath();c.arc(cx,cy,r,0,TAU);c.stroke();}for(let a=0;a<TAU;a+=TAU/32){c.beginPath();c.moveTo(cx+Math.cos(a)*24,cy+Math.sin(a)*24);c.lineTo(cx+Math.cos(a)*340,cy+Math.sin(a)*340);c.stroke();}
  for(let i=0;i<110;i++){const a=R()*TAU,d=30+R()*230;soft(c,cx+Math.cos(a)*d,cy+Math.sin(a)*d,6+R()*14,'rgba(90,130,70,A)',.35);}
  soft(c,cx,cy,90,team?'rgba(240,140,140,A)':'rgba(120,220,230,A)',.22);c.restore();});
 for(let i=0;i<340;i++){const [sx,sy,sr]=RS[Math.floor(R()*RS.length)],a=R()*TAU,d=R()*(sr-6),x=sx+Math.cos(a)*d,y=sy+Math.sin(a)*d;c.strokeStyle='rgba(220,245,240,.28)';c.lineWidth=.6;c.beginPath();c.arc(x,y,2+R()*3,Math.PI*1.1,Math.PI*1.7);c.stroke();}
  for(const [px,py,kind,k]of[[...baron,'void',0],[...dragon,'rune',1]]){const {n}=ALC[k],na=Math.atan2(n[1],n[0]);
  // a horseshoe cliff closes the far side; the river side stays open
  c.beginPath();c.arc(px,py,57,na-2.05,na+2.05);c.lineWidth=10;c.strokeStyle='#5d6152';c.lineCap='round';c.stroke();c.beginPath();c.arc(px,py,53,na-2.05,na+2.05);c.lineWidth=3;c.strokeStyle='#8d8f7c';c.stroke();
  c.lineWidth=1;if(kind==='void'){for(let i=0;i<4;i++){c.strokeStyle=`rgba(170,140,230,${.35-i*.06})`;c.beginPath();c.arc(px,py,8+i*6,i*1.3,i*1.3+Math.PI*1.3);c.stroke();}soft(c,px,py,30,'rgba(150,110,230,A)',.3);}
  else{c.strokeStyle='rgba(240,190,110,.6)';c.beginPath();c.arc(px,py,26,0,TAU);c.stroke();c.setLineDash([3,4]);c.beginPath();c.arc(px,py,20,0,TAU);c.stroke();c.setLineDash([]);for(let i=0;i<6;i++){const a=i/6*TAU;c.beginPath();c.moveTo(px+Math.cos(a)*20,py+Math.sin(a)*20);c.lineTo(px+Math.cos(a)*26,py+Math.sin(a)*26);c.stroke();}}
  for(let i=0;i<30;i++){const a=na-2.1+i/29*4.2+R()*.05;stamp(c,sprites.rocks[i%3],px+Math.cos(a)*57,py+Math.sin(a)*56,.8+R()*.35);}}
 {const [cx,cy]=[400,320],ang=Math.atan2(-250,250);c.save();c.translate(cx,cy);c.rotate(ang);c.shadowColor='rgba(0,0,0,.45)';c.shadowBlur=8;c.shadowOffsetY=4;c.fillStyle='#8c8066';c.fillRect(-52,-21,104,42);c.restore();
  c.save();c.translate(cx,cy);c.rotate(ang);const bg=c.createLinearGradient(0,-21,0,21);bg.addColorStop(0,'#c2b28a');bg.addColorStop(1,'#9b8b68');c.fillStyle=bg;c.fillRect(-50,-19,100,38);c.strokeStyle='rgba(70,60,40,.5)';c.lineWidth=.7;for(let x=-46;x<50;x+=7){c.beginPath();c.moveTo(x,-19);c.lineTo(x,19);c.stroke();}
  for(const s of[-1,1]){c.fillStyle='#6f6a5c';c.fillRect(-52,s*20-2.5,104,5);c.fillStyle='#b9b6a2';c.fillRect(-52,s*20-2.5,104,1.6);for(const x of[-50,-17,17,50])disc(c,x,s*20,3.4,'#8c897a');}c.restore();}
 // 5. jungle mask: everything that is not open ground
 const [mN,m]=layer();m.fillStyle='#000';m.fillRect(0,0,W,H);m.globalCompositeOperation='destination-out';
 m.save();m.beginPath();m.rect(PLAY.x0,PLAY.y0,PLAY.x1-PLAY.x0,PLAY.y1-PLAY.y0);m.clip();for(const team of[0,1]){m.beginPath();plazaPath(m,team,8);m.fill();}m.restore();
 for(const l of lanes)laneStroke(m,l,64,'#000');for(const l of NAV.LANES)strokePath(m,l,NAV.SHARP_R*2,'#000',false);for(const [x,y,r]of RS)disc(m,x,y,r+13,'#000');for(const k of[0,1]){const p=k?dragon:baron,{n,mouth}=ALC[k];disc(m,p[0],p[1],56,'#000');strokePath(m,[mouth,p],80,'#000',false);}disc(m,400,320,56,'#000');
 for(const camp of NAV.CAMPS)disc(m,camp.x,camp.y,NAV.CAMP_R,'#000');
 // fixed jungle network: camp-to-camp paths plus set entrances from lanes, river and base (blue side, mirrored for red)
 for(const seg of NAV.NET)strokePath(m,seg,NAV.PATH_R*2,'#000',false);
 roundMask(m,mN);
 m.save();m.globalCompositeOperation='source-over';for(const k of[0,1]){const p=k?dragon:baron,na=Math.atan2(ALC[k].n[1],ALC[k].n[0]);m.beginPath();m.arc(p[0],p[1],71,na-1.55,na+1.55);m.lineWidth=30;m.lineCap='butt';m.strokeStyle='#000';m.lineCap='round';m.stroke();}m.restore();
 // 6. walls: ambient shadow, cliff face, rim of boulders, canopy
 const tint=(col)=>{const [n,t]=layer();t.setTransform(1,0,0,1,0,0);t.drawImage(mN,0,0);t.globalCompositeOperation='source-in';t.fillStyle=col;t.fillRect(0,0,n.width,n.height);return n;};
 c.save();c.shadowColor='rgba(10,20,10,.55)';c.shadowBlur=14;c.shadowOffsetY=7;c.drawImage(tint('#2d3a2b'),0,0,W,H);c.restore();
 c.drawImage(tint('#5d6152'),0,7,W,H);c.drawImage(tint('#7a7c68'),0,3.5,W,H);c.drawImage(tint('#22412c'),0,0,W,H);
 const md=m.getImageData(0,0,mN.width,mN.height).data,solid=(x,y)=>{const px=Math.round(x*2),py=Math.round(y*2);return px>=0&&py>=0&&px<mN.width&&py<mN.height&&md[(py*mN.width+px)*4+3]>128;};
 const items=[];for(let y=-4;y<H+8;y+=6.5)for(let x=-4;x<W+8;x+=6.5){const jx=x+(R()-.5)*5,jy=y+(R()-.5)*5;if(jx<PLAY.x0-4||jx>PLAY.x1+4||jy<PLAY.y0-4||jy>PLAY.y1+4)continue;if(!solid(jx,jy))continue;const inner=solid(jx-5,jy)&&solid(jx+5,jy)&&solid(jx,jy-5)&&solid(jx,jy+3);if(!inner&&R()<.6)continue;const edge=!solid(jx,jy+9);if(edge&&R()<.35)items.push({y:jy+3,draw:()=>stamp(c,sprites.rocks[Math.floor(R()*3)],jx+(R()-.5)*4,jy+5)});const t=sprites.trees[Math.floor(R()*sprites.trees.length)];items.push({y:jy,draw:()=>stamp(c,t,jx,jy-2,.95+R()*.2)});}
 items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
 scenery(c,R);
 // 7. plaza walls and torches (gaps where lanes leave the base)
 cores.forEach(([cx,cy],team)=>{const laneD=(x,y)=>Math.min(...lanes.flatMap(l=>l.slice(1).map((b,i)=>{const a=l[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(a[0]+dx*t-x,a[1]+dy*t-y);})));const pts=baseEdge(team).map(([x,y])=>{const inside=x>PLAY.x0+4&&x<PLAY.x1-4&&y>PLAY.y0+4&&y<PLAY.y1-4;return laneD(x,y)<34||!inside?null:[x,y];});
  const runs=[];let cur=[];for(const p of pts){if(p)cur.push(p);else{if(cur.length>2)runs.push(cur);cur=[];}}if(cur.length>2)runs.push(cur);
  c.save();c.beginPath();c.rect(PLAY.x0,PLAY.y0,PLAY.x1-PLAY.x0,PLAY.y1-PLAY.y0);c.clip();c.beginPath();plazaPath(c,team);c.lineWidth=4;c.strokeStyle='#59625a';c.stroke();c.lineWidth=1.4;c.strokeStyle='#c2c8b8';c.stroke();c.restore();
  for(const run of runs){c.save();c.shadowColor='rgba(0,0,0,.4)';c.shadowBlur=5;c.shadowOffsetY=3;strokePath(c,run,10,'#4d5549',false);c.restore();strokePath(c,run,7.4,'#8d968a',false);strokePath(c,run.map(([x,y])=>[x,y-2.4]),2.6,'#c6ccbc',false);for(let i=0;i<run.length;i+=5){const [x,y]=run[i];c.fillStyle='#4d5549';c.fillRect(x-2.6,y-7,5.2,5);c.fillStyle='#a3ab9c';c.fillRect(x-2,y-6.6,4,3.6);}}
  for(const run of runs)for(let i=4;i<run.length;i+=22){const [x,y]=run[i];soft(c,x,y-5,16,team?'rgba(255,170,120,A)':'rgba(255,210,140,A)',.55);c.fillStyle='#5a4a3a';c.fillRect(x-.8,y-6,1.6,5);disc(c,x,y-7,1.8,'#ffe3a0');}});
 // lanterns by the bridge and pits
 for(const [x,y]of[[362,358],[438,282],...[baron,dragon].flatMap(([px,py],k)=>{const n=ALC[k].n,mx=px-n[0]*22,my=py-n[1]*22;return[[mx-n[1]*50,my+n[0]*50],[mx+n[1]*50,my-n[0]*50]];})]){soft(c,x,y,18,'rgba(255,214,150,A)',.45);c.fillStyle='#4a3e33';c.fillRect(x-.8,y-6,1.6,7);disc(c,x,y-7,1.9,'#ffe7ac');}
 // 8. light and vignette
 soft(c,170,120,420,'rgba(255,245,210,A)',.1);const v=c.createRadialGradient(400,320,240,400,320,520);v.addColorStop(0,'rgba(10,20,15,0)');v.addColorStop(1,'rgba(10,20,15,.45)');c.fillStyle=v;c.fillRect(0,0,W,H);
}
function install(){RPG_ART.ground=function(c,lanes,bases,camps){paint(c,lanes,bases,camps);};if(window.ART_PACK)ART_PACK.mapStyle='vector-rift';window.HERO_ART?.invalidateGround();}
window.MAP_PAINTER={paint,corridors};
install();window.addEventListener('artpackready',install);
})();
