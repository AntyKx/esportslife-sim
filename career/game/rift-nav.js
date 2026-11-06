'use strict';
// Walkable terrain for the 540×540 rift (inside the 800×640 world) and wall-aware movement.
// One geometry feeds both the painter (map-painter.js carves exactly these shapes) and pathfinding,
// so a wall you can see is a wall heroes cannot walk through.
const RIFT_NAV=(()=>{
const W=800,H=640,TAU=Math.PI*2,PLAY={x0:84,y0:12,x1:716,y1:628},mirror=([x,y])=>[W-x,H-y];
const LANES=[[[130,590],[130,50],[670,50]],[[130,590],[400,320],[670,50]],[[130,590],[670,590],[670,50]]],LANE_ROUND=46;
function rounded(l,r=LANE_ROUND){const out=[l[0]];for(let i=1;i<l.length-1;i++){const [px,py]=l[i-1],[cx,cy]=l[i],[nx,ny]=l[i+1],a=Math.atan2(py-cy,px-cx),b=Math.atan2(ny-cy,nx-cx);let turn=Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));if(Math.abs(turn-Math.PI)<1e-3){out.push(l[i]);continue;}const t=r/Math.tan(turn/2),p1=[cx+Math.cos(a)*t,cy+Math.sin(a)*t],p2=[cx+Math.cos(b)*t,cy+Math.sin(b)*t];const bis=(a+b)/2,bx=Math.cos(bis),by=Math.sin(bis),k=Math.hypot(t,r),ox=cx+bx*k*Math.sign(bx*(Math.cos(a)+Math.cos(b))+by*(Math.sin(a)+Math.sin(b))||1),oy=cy+by*k*Math.sign(bx*(Math.cos(a)+Math.cos(b))+by*(Math.sin(a)+Math.sin(b))||1);const s0=Math.atan2(p1[1]-oy,p1[0]-ox),s1=Math.atan2(p2[1]-oy,p2[0]-ox);let ds=Math.atan2(Math.sin(s1-s0),Math.cos(s1-s0));for(let j=0;j<=8;j++){const s=s0+ds*j/8;out.push([ox+Math.cos(s)*r,oy+Math.sin(s)*r]);}}out.push(l[l.length-1]);return out;}
const ROAD=LANES.map(l=>rounded(l)),SHARP_R=26;
const BARON=[300,193],DRAGON=[500,447],CENTER=[400,320];
const RIVER=[[173,93],[223,139],[275,194],[335,257],[400,320],[465,383],[525,446],[577,501],[627,547]];
const BLUE_CAMPS=[['blue',256,306],['gromp',190,271],['wolves',254,359],['raptors',370,427],['red',396,485],['krugs',413,535]];
const CAMPS=[...BLUE_CAMPS,...BLUE_CAMPS.map(([t,x,y])=>[t,W-x,H-y])].map(([type,x,y])=>({type,x,y}));
// Jungle paths (blue side; red side is the point mirror): camp-to-camp links plus entrances from lanes, river and base.
// traced from the annotated reference: gromp–blue–wolves chain, lane / river / base entrances; raptors–red–krugs chain likewise
const NET_BLUE=[[[190,271],[256,306]],[[256,306],[254,359]],[[190,271],[130,215]],[[254,359],[130,335]],[[254,359],[220,430]],[[254,359],[300,420]],[[256,306],[330,268]],[[190,271],[215,172]],
 [[370,427],[396,485]],[[396,485],[413,535]],[[370,427],[330,390]],[[370,427],[445,372]],[[396,485],[300,520]],[[413,535],[445,590]],[[413,535],[475,560],[560,528]]];
const NET=NET_BLUE.flatMap(s=>[s,s.map(mirror)]);
const LANE_R=32,PATH_R=15,CAMP_R=34,PIT_R=56,MOUTH_R=40,RIVER_PAD=13;
function basePoly(team,g=0){const pts=[[-40,438-g],[215+g*.4,438-g],[282+g,505-g*.4],[282+g,H+40],[-40,H+40]];return team?pts.map(mirror):pts;}
function riverSamples(){const pits=[BARON,DRAGON],out=[];for(let i=0;i<RIVER.length-1;i++){const [ax,ay]=RIVER[i],[bx,by]=RIVER[i+1],len=Math.hypot(bx-ax,by-ay);for(let d=0;d<len;d+=3){const x=ax+(bx-ax)*d/len,y=ay+(by-ay)*d/len,half=x+y<720?0:1,dp=Math.hypot(x-pits[half][0],y-pits[half][1]),db=Math.hypot(x-400,y-320);out.push([x,y,Math.max(24,30+8*Math.exp(-((dp/90)**2))-Math.max(0,8-db/8)),half]);}}out.push([...RIVER[RIVER.length-1],32,1]);return out;}
const RS=riverSamples();
function alcove([px,py]){let b=RS[0],bd=1e9;for(const q of RS){const d=Math.hypot(q[0]-px,q[1]-py);if(d<bd){bd=d;b=q;}}return{n:[(px-b[0])/bd,(py-b[1])/bd],mouth:[b[0],b[1]]};}
const ALC=[alcove(BARON),alcove(DRAGON)];
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+dx*t-px,ay+dy*t-py);}
function lineDist(px,py,pts){let d=1e9;for(let i=0;i<pts.length-1;i++)d=Math.min(d,segDist(px,py,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]));return d;}
function inPoly(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
// Exact open-ground test (the painter carves the same shapes).
function open(x,y){if(x<PLAY.x0+4||x>PLAY.x1-4||y<PLAY.y0+4||y>PLAY.y1-4)return false;
 for(const [k,p]of[[0,BARON],[1,DRAGON]]){const d=Math.hypot(x-p[0],y-p[1]);if(d>PIT_R&&d<PIT_R+30){const a=Math.atan2(y-p[1],x-p[0]),na=Math.atan2(ALC[k].n[1],ALC[k].n[0]),da=Math.abs(Math.atan2(Math.sin(a-na),Math.cos(a-na)));if(da<1.55)return false;}}
 for(const l of ROAD)if(lineDist(x,y,l)<=LANE_R)return true;
 for(const l of LANES)if(lineDist(x,y,l)<=SHARP_R)return true;
 for(const [rx,ry,r]of RS)if(Math.hypot(x-rx,y-ry)<=r+RIVER_PAD)return true;
 for(const [k,p]of[[0,BARON],[1,DRAGON]])if(Math.hypot(x-p[0],y-p[1])<=PIT_R||segDist(x,y,ALC[k].mouth[0],ALC[k].mouth[1],p[0],p[1])<=MOUTH_R)return true;
 if(Math.hypot(x-CENTER[0],y-CENTER[1])<=56)return true;
 for(const t of[0,1])if(inPoly(x,y,basePoly(t,8)))return true;
 for(const c of CAMPS)if(Math.hypot(x-c.x,y-c.y)<=CAMP_R)return true;
 for(const s of NET)if(lineDist(x,y,s)<=PATH_R)return true;
 return false;}
// Grid + A*
const CELL=5,GW=Math.ceil(W/CELL),GH=Math.ceil(H/CELL),grid=new Uint8Array(GW*GH);
for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++)grid[gy*GW+gx]=open(gx*CELL+CELL/2,gy*CELL+CELL/2)?1:0;
const cellOf=(x,y)=>[Math.max(0,Math.min(GW-1,Math.floor(x/CELL))),Math.max(0,Math.min(GH-1,Math.floor(y/CELL)))];
const walk=(x,y)=>{const [gx,gy]=cellOf(x,y);return grid[gy*GW+gx]===1;};
// grid traversal (Amanatides–Woo) over every 5px cell the segment touches; corner crossings check both neighbours
function clear(ax,ay,bx,by){let gx=Math.floor(ax/CELL),gy=Math.floor(ay/CELL);const ex=Math.floor(bx/CELL),ey=Math.floor(by/CELL),dx=bx-ax,dy=by-ay,sx=dx>0?1:-1,sy=dy>0?1:-1;
 const tdx=dx?Math.abs(CELL/dx):Infinity,tdy=dy?Math.abs(CELL/dy):Infinity;let tx=dx?((sx>0?(gx+1)*CELL-ax:ax-gx*CELL)/Math.abs(dx)):Infinity,ty=dy?((sy>0?(gy+1)*CELL-ay:ay-gy*CELL)/Math.abs(dy)):Infinity;
 const ok=(x,y)=>x>=0&&y>=0&&x<GW&&y<GH&&grid[y*GW+x]===1;if(!ok(gx,gy))return false;let n=0;
 while((gx!==ex||gy!==ey)&&n++<600){if(Math.abs(tx-ty)<1e-9){if(!ok(gx+sx,gy)||!ok(gx,gy+sy))return false;gx+=sx;gy+=sy;tx+=tdx;ty+=tdy;}else if(tx<ty){gx+=sx;tx+=tdx;}else{gy+=sy;ty+=tdy;}if(!ok(gx,gy))return false;}
 return true;}
function nearestOpen(x,y){let [gx,gy]=cellOf(x,y);if(grid[gy*GW+gx])return gy*GW+gx;for(let r=1;r<40;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const nx=gx+dx,ny=gy+dy;if(nx>=0&&ny>=0&&nx<GW&&ny<GH&&grid[ny*GW+nx])return ny*GW+nx;}return gy*GW+gx;}
const G=new Float32Array(GW*GH),from=new Int32Array(GW*GH),stamp=new Uint32Array(GW*GH);let gen=0;
const HF=new Float32Array(GW*GH*4),HI=new Int32Array(GW*GH*4),closed=new Uint32Array(GW*GH);
function path(ax,ay,bx,by){const s=nearestOpen(ax,ay),e=nearestOpen(bx,by);if(s===e)return[[bx,by]];gen++;
 let size=0;const ex=e%GW,ey=(e/GW)|0;
 const push=(i,f)=>{let k=size++;while(k){const p=(k-1)>>1;if(HF[p]<=f)break;HF[k]=HF[p];HI[k]=HI[p];k=p;}HF[k]=f;HI[k]=i;};
 const pop=()=>{const top=HI[0],lf=HF[--size],li=HI[size];let k=0;for(;;){const l=k*2+1;if(l>=size)break;const r=l+1,m=r<size&&HF[r]<HF[l]?r:l;if(HF[m]>=lf)break;HF[k]=HF[m];HI[k]=HI[m];k=m;}HF[k]=lf;HI[k]=li;return top;};
 const h=(x,y)=>{const dx=x>ex?x-ex:ex-x,dy=y>ey?y-ey:ey-y;return dx>dy?dx+.414*dy:dy+.414*dx;};
 stamp[s]=gen;G[s]=0;from[s]=-1;push(s,h(s%GW,(s/GW)|0));let found=false,guard=0;
 while(size&&guard++<40000){const i=pop();if(closed[i]===gen)continue;closed[i]=gen;if(i===e){found=true;break;}const x=i%GW,y=(i/GW)|0,gi=G[i];
  for(let dy=-1;dy<=1;dy++){const ny=y+dy;if(ny<0||ny>=GH)continue;for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx;if(nx<0||nx>=GW)continue;const j=ny*GW+nx;if(!grid[j]||closed[j]===gen)continue;if(dx&&dy&&(!grid[y*GW+nx]||!grid[ny*GW+x]))continue;
   const g=gi+(dx&&dy?1.414:1);if(stamp[j]!==gen||g<G[j]){stamp[j]=gen;G[j]=g;from[j]=i;if(size<HF.length)push(j,g+h(nx,ny));}}}}
 if(!found)return[[bx,by]];
 const cells=[];for(let i=e;i!==-1;i=from[i])cells.push([(i%GW)*CELL+CELL/2,((i/GW)|0)*CELL+CELL/2]);cells.reverse();
 if(walk(bx,by))cells[cells.length-1]=[bx,by];
 // string-pull: keep only the waypoints needed for line of sight
 const out=[];let cx=ax,cy=ay,k=0;while(k<cells.length){let far=k;for(let m=cells.length-1;m>k;m--)if(clear(cx,cy,cells[m][0],cells[m][1])){far=m;break;}out.push(cells[far]);[cx,cy]=cells[far];k=far+1;}
 return out;}
return{W,H,PLAY,LANES,ROAD,SHARP_R,BARON,DRAGON,CENTER,RIVER,RS,ALC,CAMPS,NET,LANE_R,PATH_R,CAMP_R,PIT_R,MOUTH_R,RIVER_PAD,basePoly,open,walk,clear,path,grid,GW,GH,CELL};
})();
if(typeof window!=='undefined')window.RIFT_NAV=RIFT_NAV;
// Wall-aware replacement for toward(): straight when the line is clear, otherwise follow a cached A* path.
function bWalk(a,b,n){if(!(n>0)||!b)return;const N=RIFT_NAV,ox=a.x,oy=a.y;bWalkRaw(a,b,n);
 // never step from open ground into a wall: slide along one axis, or stay put
 if(N.walk(ox,oy)&&!N.walk(a.x,a.y)){if(N.walk(a.x,oy))a.y=oy;else if(N.walk(ox,a.y))a.x=ox;else{a.x=ox;a.y=oy;}}}
function bWalkRaw(a,b,n){const N=RIFT_NAV;
 if(N.clear(a.x,a.y,b.x,b.y)){a.nav=null;toward(a,b,n);return;}
 const now=state?.time||0;let P=a.nav;
 if(!P||Math.hypot(P.gx-b.x,P.gy-b.y)>Math.max(30,Math.hypot(a.x-b.x,a.y-b.y)*.25)||now-P.t>2.5||P.i>=P.pts.length&&now-P.t>.5){P=a.nav={pts:N.path(a.x,a.y,b.x,b.y),i:0,gx:b.x,gy:b.y,t:now};}
 let rem=n;while(rem>1e-6&&P.i<P.pts.length){const [wx,wy]=P.pts[P.i],d=Math.hypot(wx-a.x,wy-a.y);if(d<=rem){a.x=wx;a.y=wy;rem-=d;P.i++;}else{a.x+=(wx-a.x)*rem/d;a.y+=(wy-a.y)*rem/d;rem=0;}}}
