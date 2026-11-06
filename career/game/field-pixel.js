'use strict';
// 0.67 戰場英雄改用像素小人（與介面立繪同一套 HERO_PIXEL）。
// 只換 RPG_ART.hero 這個繪圖入口：走路、攻擊、受傷、倒地、陣營圈。純畫面，不讀寫模擬、不用 Math.random。
// 「外觀」裡可以切回原本的戰場美術（localStorage esports-field-style：pixel / classic）。
(()=>{
const P=window.HERO_PIXEL;if(!P||!window.RPG_ART)return;
const KEY='esports-field-style';
let style='pixel';try{style=localStorage.getItem(KEY)||'pixel';}catch{}
let original=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ── 影格快取：idle0/idle1/walk1/walk2，各有一般與受傷（白閃）版本 ──
const cache=new Map();
function base(i,frame){const g=P.sprite(i,frame),c=document.createElement('canvas');c.width=P.W;c.height=P.H;const x=c.getContext('2d');
 for(let y=0;y<P.H;y++)for(let k=0;k<P.W;k++)if(g[y][k]){x.fillStyle=g[y][k];x.fillRect(k,y,1,1);}return c;}
function frameCanvas(i,kind,hurt){const key=i+':'+kind+(hurt?':h':'');let c=cache.get(key);if(c)return c;
 const src=base(i,kind==='idle1'?1:0);c=document.createElement('canvas');c.width=P.W;c.height=P.H;const x=c.getContext('2d');
 if(kind==='walk1'||kind==='walk2'){
  // 走路：上半身照畫，腿部（第 25 列以下）左右腳輪流抬起 1 格
  x.drawImage(src,0,0,P.W,25,0,0,P.W,25);
  const up=kind==='walk1'?0:12;
  x.drawImage(src,up,25,12,7,up,24,12,7);         // 抬起的那隻腳
  x.drawImage(src,12-up,25,12,7,12-up,25,12,7);   // 著地的那隻腳
 }else x.drawImage(src,0,0);
 if(hurt){x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,255,255,.7)';x.fillRect(0,0,P.W,P.H);x.globalCompositeOperation='source-over';}
 cache.set(key,c);return c;}
const designs=new Map();
const design=i=>{let d=designs.get(i);if(!d){d=P.design(i);designs.set(i,d);}return d;};
const RANGED=new Set(['bow','gun','rifle','pistols','crossbow','cannon']),CASTER=new Set(['staff','orb','wand','book','lantern','bell','lyre','mirror','hourglass','puppet','brush']);

function hero(c,id,x,y,o={}){
 if(style!=='pixel'&&original)return original.call(this,c,id,x,y,o);
 id=id|0;if(!heroes?.[id]&&!ROSTER?.[id])return original?.call(this,c,id,x,y,o);
 const t=o.clock||0,face=(o.face??1)<0?-1:1;
 const k=o.ring===false?(o.scale||1.35)*1.37:(o.scale||1.35)/1.35;
 const F=clamp(o.fall||0,0,1),atk=!F&&o.attack>0&&o.attack<1?o.attack:0;
 const walk=F?0:clamp(o.walk??(Math.abs(o.step||0)>.01?1:0),0,1),g=o.gait??(t*11+id*.7);
 const hurt=F?0:clamp(o.hurt||0,0,1),d=design(id),float=d.creature==='spirit';
 const kind=walk>.3?(Math.sin(g)>0?'walk1':'walk2'):(Math.floor(t*1.6+id*.37)%2?'idle1':'idle0');
 const img=frameCanvas(id,kind,hurt>.35);
 const s=.98*k,w=P.W*s,h=P.H*s,hover=float?Math.sin(t*2.6+id)*1.2-2:0;
 c.save();c.translate(x,y+9);
 const fade=F>.62?1-(F-.62)/.38:1;c.globalAlpha*=fade;
 // 影子與陣營圈
 c.fillStyle='rgba(8,22,22,.38)';c.beginPath();c.ellipse(F?-face*F*12*k:0,0,(float?6:8)*k+F*8*k,(float?2:2.6)*k,0,0,Math.PI*2);c.fill();
 if(o.ring!==false&&!F){c.beginPath();c.ellipse(0,0,9.6*k,3.5*k,0,0,Math.PI*2);c.lineWidth=o.player?1.8:1.1;c.strokeStyle=o.player?'#ffd98a':o.team?'#f0928a':'#86d3e6';c.stroke();}
 // 攻擊：前傾＋往前衝一點
 const thrust=atk?Math.sin(atk*Math.PI):0,lean=atk?thrust*.16:walk*.04;
 // 倒地：以腳為軸往後倒
 const fq=F?clamp((F-.05)/.35,0,1):0,ang=F?-face*fq*fq*1.45:face*lean;
 c.translate(face*thrust*2.5*k,hover);c.rotate(ang);
 c.scale(face,1);c.imageSmoothingEnabled=false;
 c.drawImage(img,-w/2,-h+1*k,w,h);
 c.restore();
 // 攻擊特效：近戰揮砍弧線、遠程槍口閃光、法術光點
 if(atk&&atk>.2&&atk<.8){c.save();c.translate(x,y+9);const wp=d.weapon,fx=face;
  if(RANGED.has(wp)){c.fillStyle='rgba(255,236,160,.95)';const mx=fx*13*k,my=-14*k;c.beginPath();c.arc(mx,my,2.4*k*thrust+.6,0,Math.PI*2);c.fill();}
  else if(CASTER.has(wp)){c.fillStyle=d.orb||'#bfe6ff';c.globalAlpha=.85;c.beginPath();c.arc(fx*12*k,-24*k,3*k*thrust+.8,0,Math.PI*2);c.fill();}
  else{c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.6;c.beginPath();const a0=-1.2+atk*1.6;c.arc(fx*4*k,-13*k,12*k,fx>0?a0:Math.PI-a0-1.1,fx>0?a0+1.1:Math.PI-a0);c.stroke();}
  c.restore();}
 // 你自己：頭上小箭頭
 if(o.player&&o.ring!==false&&!F){c.save();c.translate(x,y+9-h-4*k+hover);c.fillStyle='#ffd98a';c.beginPath();c.moveTo(-3,-4);c.lineTo(3,-4);c.lineTo(0,0);c.closePath();c.fill();c.restore();}
}

function refresh(){try{HERO_ART.portraits?.();}catch{}try{window.OVERVIEW?.refreshPortraits?.();}catch{}try{if(typeof state!=='undefined'&&state&&window.BROADCAST)BROADCAST.refreshPortraits?.();}catch{}try{window.MATCH_UI?.update?.();}catch{}}
function install(){if(RPG_ART.hero===hero)return;original=RPG_ART.hero;RPG_ART.hero=hero;refresh();}
install();
// 其他模組（美術包載入完成）可能晚一點又換掉繪圖入口，這裡補回來
setInterval(()=>{if(RPG_ART.hero!==hero){original=RPG_ART.hero;RPG_ART.hero=hero;refresh();}},1000);

// ── 外觀設定：戰場角色風格 ──
function mountToggle(){const box=document.querySelector('.theme-options');if(!box||document.querySelector('#fieldStyle'))return;
 const wrap=document.createElement('div');wrap.id='fieldStyle';wrap.className='field-style';
 const draw=()=>{wrap.innerHTML=`<h3>戰場角色</h3><div class="field-style-opts">${[['pixel','像素小人'],['classic','原本美術']].map(([v,n])=>`<button type="button" data-fs="${v}" class="${style===v?'on':''}" aria-pressed="${style===v}">${n}</button>`).join('')}</div>`;};
 wrap.addEventListener('click',e=>{const b=e.target.closest('[data-fs]');if(!b)return;style=b.dataset.fs;try{localStorage.setItem(KEY,style);}catch{}draw();refresh();try{if(typeof state!=='undefined'&&state)window.draw?.();}catch{}});
 draw();box.after(wrap);}
new MutationObserver(()=>mountToggle()).observe(document.body,{childList:true,subtree:true});mountToggle();
window.FIELD_PIXEL={get style(){return style;},set style(v){style=v;},hero};
})();
