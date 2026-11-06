'use strict';
(()=>{
const arena=document.querySelector('.arena'),stage=document.querySelector('.broadcast-stage');arena.classList.add('overview-arena');
const details=document.createElement('details');details.className='overview-details';details.innerHTML='<summary>展開詳細戰況 · KDA</summary>';details.append(document.querySelector('.cast-table'));arena.append(details);
const bar=document.createElement('div');bar.className='overview-bar';bar.append(document.querySelector('.cast-player'));const hint=document.createElement('div');hint.className='overview-hint';hint.innerHTML='<span id="overviewHint">全覽：點擊英雄或交戰區，可近看戰鬥。</span><button id="backOverview" class="quiet" hidden>回到全覽 ↩</button>';bar.append(hint);arena.append(bar);document.querySelector('#backOverview').onclick=()=>BROADCAST.setMode('full');
document.querySelector('.cast-camera-tools>span').textContent='戰術視角';for(const [mode,text]of [['full','全覽'],['player','近看自己'],['auto','交戰近景']])document.querySelector(`[data-camera="${mode}"]`).textContent=text;
const fullButton=document.querySelector('[data-camera="full"]');fullButton.parentNode.insertBefore(fullButton,document.querySelector('[data-camera="auto"]'));
document.querySelector('.mapfoot').innerHTML='<span>藍框：我方　紅框：敵方　金框：你</span><span>點擊地圖近看 · 保留視野限制</span>';
const portraits=HERO_ART.art.map((_,id)=>{const c=document.createElement('canvas');c.width=96;c.height=96;const q=c.getContext('2d');q.scale(2,2);HERO_ART.heroSprite(q,id,24,34,{scale:1.05,ring:false});return c;});
const surface=document.createElement('canvas');surface.id='overviewSurface';surface.width=1600;surface.height=1280;surface.style.cssText='position:absolute;pointer-events:none';stage.append(surface);const surfaceCtx=surface.getContext('2d');surfaceCtx.setTransform(2,0,0,2,0,0);let current=null,box=null,markers=[],baseDraw=draw;
const color=t=>t?'#f0948b':'#8bdae6';
function path(c,p,stroke,width){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=width;c.strokeStyle=stroke;c.lineCap='round';c.lineJoin='round';c.stroke();}
function disk(c,x,y,r,fill,stroke,width=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function diamond(c,x,y,r,fill){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fillStyle=fill;c.fill();}
function text(c,t,x,y,col,size){c.textAlign='center';c.font=`600 ${size}px sans-serif`;c.lineWidth=3;c.strokeStyle='#12272c';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y);}
function decisionPoint(){if(!state.decision)return null;const s=state,title=document.querySelector('#decision h2')?.textContent||'';if(s.decision.type==='objective'){const o=[s.baron,s.dragon].find(o=>title.includes(o.name));return o?{...o,label:'資源爭奪'}:null;}if(s.decision.type==='support'){const a=s.actors.filter(a=>!a.team&&!a.player&&bLive(a)).sort((a,b)=>a.hp-b.hp)[0];return a?{x:a.x,y:a.y,label:'支援決策'}:null;}return{...s.actors.find(a=>a.player),label:'你的決策'};}
function paint(){const c=surfaceCtx,s=state,r=canvas.getBoundingClientRect(),sx=r.width/800,sy=r.height/640,scale=Math.min(r.width*.73/800,r.height*.80/640),w=800*scale/sx,h=640*scale/sy;box={x:(800-w)/2,y:78+(540-h)/2,w,h};
 ctx.fillStyle=window.MATCH_UI?.background||'#eef1f5';ctx.fillRect(0,0,800,640);Object.assign(surface.style,{left:box.x/8+'%',top:box.y/6.4+'%',width:box.w/8+'%',height:box.h/6.4+'%'});c.clearRect(0,0,800,640);c.save();
 // Use the same complete world artwork as the close-up view.
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';c.drawImage(BROADCAST.world,0,0,800,640);
 const font=9/scale;
 const visible=s.actors.filter(a=>bLive(a)&&bVisible(a)),fights=[];for(const a of visible.filter(a=>!a.team)){const b=visible.find(b=>b.team&&dist(a,b)<130);if(b){const p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(!fights.some(q=>dist(q,p)<70))fights.push(p);}}
 for(const p of fights){disk(c,p.x,p.y,35,null,'#edb879',2);path(c,[[p.x-6,p.y-9],[p.x+7,p.y+8]],'#f2c789',3);path(c,[[p.x+7,p.y-9],[p.x-6,p.y+8]],'#f2c789',3);}
 const p= s.actors.find(a=>a.player);if(s.order){c.save();c.setLineDash([7,7]);path(c,[[p.x,p.y],[s.order.point.x,s.order.point.y]],'#efd499',2);c.restore();disk(c,s.order.point.x,s.order.point.y,13,null,'#efd499',2);}
 markers=[];const radius=Math.max(10,Math.min(20,9/scale));for(const a of visible){const nearby=visible.filter(b=>dist(a,b)<48),index=nearby.indexOf(a),offset=nearby.length>1?18+nearby.length*2:0,angle=index/nearby.length*Math.PI*2-Math.PI/2,x=Math.max(radius,Math.min(800-radius,a.x+Math.cos(angle)*offset)),y=Math.max(radius,Math.min(640-radius,a.y+Math.sin(angle)*offset));markers.push({x,y,r:radius,a});if(offset){path(c,[[a.x,a.y],[x,y]],color(a.team)+'99',1);disk(c,a.x,a.y,3,color(a.team),null);}disk(c,x,y,radius+2,'#10272d',a.player?'#ffe1a0':color(a.team),a.player?4:2);c.save();c.beginPath();c.arc(x,y,radius-2,0,Math.PI*2);c.clip();c.fillStyle='#213b40';c.fillRect(x-radius,y-radius,radius*2,radius*2);c.imageSmoothingEnabled=true;c.drawImage(portraits[a.heroIndex],x-radius,y-radius,radius*2,radius*2);c.restore();c.fillStyle='#0b212b';c.fillRect(x-radius,y+radius+4,radius*2,4);c.fillStyle=color(a.team);c.fillRect(x-radius,y+radius+4,radius*2*a.hp/a.maxHp,4);if(a.player)text(c,'你',x,y-radius-7,'#ffe1a0',font);}
 const point=decisionPoint();if(point){disk(c,point.x,point.y,48,null,'#ffe3a0',3);text(c,point.label,point.x,point.y-58,'#ffe4aa',font);}
 c.restore();c.strokeStyle='#56746c';c.lineWidth=1;c.strokeRect(0,0,800,640);}
function hit(e){if(BROADCAST.mode!=='full'||!box)return;const r=canvas.getBoundingClientRect(),cx=(e.clientX-r.left)/r.width*800,cy=(e.clientY-r.top)/r.height*640;if(cx<box.x||cx>box.x+box.w||cy<box.y||cy>box.y+box.h)return;const x=(cx-box.x)/box.w*800,y=(cy-box.y)/box.h*640,m=markers.find(m=>dist(m,{x,y})<m.r+10);BROADCAST.focusAt(m?{x:m.a.x,y:m.a.y}:{x,y});draw();}
canvas.addEventListener('click',hit);
// close-up controls: drag to pan, double-click / Esc / floating button to return to the overview
const zoomBack=document.createElement('button');zoomBack.id='zoomBack';zoomBack.type='button';zoomBack.textContent='回到全覽 ↩';zoomBack.hidden=true;stage.append(zoomBack);
const toFull=()=>{if(BROADCAST.mode!=='full'){BROADCAST.setMode('full');draw();}};zoomBack.onclick=toFull;
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(BROADCAST.mode==='full')return;const cam=BROADCAST.camera;drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false};canvas.setPointerCapture?.(e.pointerId);stage.classList.add('dragging');});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;const r=canvas.getBoundingClientRect(),sw=800/1.8,kx=sw/r.width,ky=.75*sw/r.width,x=Math.max(0,Math.min(800,drag.cx-dx*kx)),y=Math.max(0,Math.min(640,drag.cy-dy*ky));BROADCAST.focusAt({x,y});const cam=BROADCAST.camera;cam.x=x;cam.y=y;});
const endDrag=()=>{drag=null;stage.classList.remove('dragging');};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('dblclick',toFull);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state&&!state.done)toFull();});
draw=function(){if(!state)return;if(current!==state){current=state;BROADCAST.setMode('full');details.open=false;}baseDraw();const full=BROADCAST.mode==='full';stage.classList.toggle('tactical-overview',full);surface.hidden=!full;stage.classList.toggle('zoomed',!full);zoomBack.hidden=full;if(full)paint();document.querySelector('#backOverview').hidden=full;document.querySelector('#overviewHint').textContent=full?(state.decision?'關鍵時刻已標在地圖上；點擊可近看，選項在下方。':'全覽：點擊英雄或交戰區，可近看戰鬥。'):'近景：拖曳地圖可移動鏡頭；雙擊地圖、按 Esc 或右上角按鈕回到全覽。';};
BROADCAST.setMode('full');window.OVERVIEW={refreshPortraits(){portraits.forEach((p,id)=>{const c=p.getContext('2d');c.clearRect(0,0,48,48);HERO_ART.heroSprite(c,id,24,34,{scale:1.05,ring:false});});},get box(){return box;},get markers(){return markers;},draw};
})();
