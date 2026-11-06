'use strict';
// Football-like anatomy, drawn as native pixel art. Presentation never changes battle state.
(()=>{
const cache=new Map(),ink='#252132',skin=['#e6bc91','#b97b58','#f0ccaa'],hair=['#40312e','#b69a54','#6b4535','#293449','#875044'];
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function limb(c,x,y,dx,dy,col){box(c,x,y,3,Math.max(2,dy-y+2),ink);box(c,x+1,y,2,Math.max(2,dy-y+1),col);box(c,dx,dy,3,3,col);}
function sprite(id,frame,attack){const key=[id,frame,attack].join(':');if(cache.has(key))return cache.get(key);const n=document.createElement('canvas');n.width=40;n.height=42;const c=n.getContext('2d'),p=HERO_ART.art[id],hi=p[2],lo=p[3],s=skin[id%3],h=hair[id%5],L=heroLook(id),a=attack?2:0,step=frame===1?2:frame===3?-2:0;
 // All heroes share the same head, shoulder and foot reference lines.
 box(c,13,27,5,9,ink);box(c,21,27,5,9,ink);box(c,14,28,3,6+step,lo);box(c,22,28,3,6-step,lo);box(c,12,34+step,6,2,ink);box(c,21,34-step,6,2,ink);
 if([4,5,6,7,8,12,13,14].includes(L)){box(c,12,20,15,11,ink);box(c,13,21,13,9,lo);box(c,14,21,3,8,hi);box(c,23,21,2,8,hi);}
 box(c,13,17,13,12,ink);box(c,14,18,11,9,lo);box(c,14,18,4,8,hi);box(c,15,27,10,2,'#bfa16a');box(c,19,27,2,2,'#f2d7a0');
 limb(c,10,18,10-step,25,s);box(c,10,18,3,4,hi);limb(c,26,18-a,27+a,25-a,s);box(c,26,18-a,3,4,lo);
 box(c,14,5,11,11,ink);box(c,15,6,9,9,s);box(c,14,5,11,4,h);box(c,14,8,2,4,h);box(c,23,8,2,3,h);box(c,16,6,4,1,'#ffffff25');box(c,16,10,2,2,ink);box(c,21,10,2,2,ink);box(c,19,13,3,1,'#a46c55');box(c,18,16,4,2,s);
 if([0,2,12].includes(L)){box(c,13,5,13,4,lo);box(c,14,4,11,2,hi);box(c,13,8,3,6,lo);box(c,23,8,3,6,lo);box(c,18,5,3,2,'#f1d99c');}
 if([5,7,14].includes(L)){box(c,13,5,13,3,lo);box(c,12,7,3,9,lo);box(c,24,7,3,9,lo);box(c,16,13,8,2,lo);}
 if([4,13].includes(L)){box(c,13,5,2,13,lo);box(c,24,5,2,13,lo);box(c,13,5,13,2,hi);}
 if(L===6){box(c,14,3,10,3,lo);box(c,16,1,6,3,hi);}
 if(L===11){box(c,11,6,17,2,lo);box(c,15,3,9,3,h);}
 // Weapons are held beside the body; attack frames move the arms and weapon together.
 if([0,2,12].includes(L)){box(c,6,20,6,10,ink);box(c,7,21,4,7,hi);box(c,8,22,2,4,lo);}
 if([1,3,7].includes(L)){box(c,29+a,11-a,2,15,'#e4ddc5');box(c,28+a,23-a,5,2,'#bd9a5f');box(c,29+a,25-a,2,3,'#694d3e');if(attack)box(c,31,11,6,2,'#fff0be');}
 else if([9,10].includes(L)){box(c,31+a,14-a,2,13,lo);box(c,29+a,11-a,2,3,hi);box(c,29+a,27-a,2,3,hi);box(c,29+a,14-a,1,13,'#d8d6b3');if(attack)box(c,28,20,10,1,'#eee3c0');}
 else if(L===11){box(c,28+a,21-a,9,3,ink);box(c,29+a,21-a,8,1,'#c7c2a9');if(attack)box(c,37,20,2,4,'#ffdca1');}
 else if([4,5,6,8,13,14].includes(L)){box(c,30+a,13-a,2,19,'#967749');box(c,28+a,10-a,6,5,lo);box(c,29+a,9-a,4,4,hi);box(c,30+a,10-a,2,2,'#f6efd3');}
 cache.set(key,n);return n;}
function hero(c,id,x,y,o={}){const walking=Math.abs(o.step||0)>.01,frame=walking?Math.floor((o.clock||0)*10)%4:0,attack=o.attack>.05&&o.attack<.95,scale=o.ring===false?(o.scale||1.35)*1.15:(o.scale||1.35)/1.35*.82;c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(x),Math.round(y+9));if(o.ring!==false){c.fillStyle='#111b2855';c.beginPath();c.ellipse(0,0,10,4,0,0,Math.PI*2);c.fill();c.strokeStyle=o.player?'#f8d489':o.team?'#e38c88':'#82c6df';c.lineWidth=o.player?2:1;c.stroke();}c.scale((o.face??1)*scale,scale);c.drawImage(sprite(id,frame,attack),-20,-36);c.restore();}
const beastCache=new Map();
function beast(type){if(beastCache.has(type))return beastCache.get(type);const n=document.createElement('canvas');n.width=64;n.height=64;const c=n.getContext('2d');c.translate(32,46);const b=(x,y,w,h,col)=>box(c,x,y,w,h,col),eyes=(x,y)=>{b(x,y,2,2,'#f1d6a0');b(x+7,y,2,2,'#f1d6a0');};
 if(type==='blue'||type==='red'||type==='krugs'){const col=type==='blue'?'#79a5b6':type==='red'?'#b87957':'#9b9d82',shade=type==='blue'?'#496f83':type==='red'?'#775244':'#626d60';b(-10,-20,20,17,ink);b(-8,-19,16,15,shade);b(-7,-19,7,7,col);b(-13,-15,5,10,shade);b(8,-15,5,10,shade);b(-8,-4,6,5,ink);b(3,-4,6,5,ink);eyes(-5,-13);b(-2,-7,5,2,'#d9b67c');if(type!=='krugs'){b(-3,-26,6,10,col);b(-1,-24,2,7,type==='blue'?'#c7eff2':'#f1c37e');}else{b(12,-9,9,9,shade);b(13,-9,4,3,col);}}
 else if(type==='gromp'){b(-12,-13,24,13,ink);b(-10,-15,20,14,'#707a5c');b(-8,-13,16,7,'#a1aa7b');b(-10,-19,6,6,'#a1aa7b');b(4,-19,6,6,'#a1aa7b');eyes(-7,-17);b(-7,-4,14,3,'#c6b687');b(-15,-3,6,4,'#606e55');b(9,-3,6,4,'#606e55');}
 else if(type==='wolves'){for(const [x,y,s]of[[-10,0,0],[8,-4,1]]){const col=s?'#a8afb0':'#808f94';b(x-6,y-13,12,12,ink);b(x-5,y-14,10,10,col);b(x-5,y-19,3,6,col);b(x+3,y-19,3,6,col);b(x+3,y-10,8,4,'#c5c7bc');b(x-5,y-2,3,5,ink);b(x+3,y-2,3,5,ink);b(x+3,y-13,2,2,'#f4cc8b');}}
 else if(type==='raptors'){for(const [x,y]of[[-11,1],[0,-5],[11,1]]){b(x-4,y-12,8,11,'#805a49');b(x-3,y-13,6,8,'#bf9370');b(x-2,y-16,4,5,'#ca7653');b(x+3,y-12,5,3,'#e4bf7e');b(x+1,y-14,1,2,ink);b(x-3,y-1,2,3,ink);b(x+2,y-1,2,3,ink);}}
 else{b(-11,-11,22,10,ink);b(-9,-13,18,10,'#789d91');b(-6,-13,10,4,'#acc4a6');for(const x of[-14,-7,7,14])b(x,-2,3,5,'#637f77');eyes(-5,-9);}
 beastCache.set(type,n);return n;}
function creature(c,type){c.imageSmoothingEnabled=false;c.drawImage(beast(type),-32,-46);}
function epic(c,o,baron,clock,seen){if(!o.alive)return false;c.save();c.translate(o.x,o.y);if(!seen)c.globalAlpha=.4;const b=(x,y,w,h,col)=>box(c,x,y,w,h,col),up=Math.sin(clock*2)>0?1:0;
 if(baron&&o.epic==='grubs'){for(const [x,y]of[[-13,2],[0,-6],[13,2]]){b(x-5,y-14,10,16,ink);b(x-4,y-15,8,14,'#ab92b9');b(x-3,y-14,3,10,'#c8b5cd');b(x+1,y-11,2,2,'#f5dfab');}}
 else if(baron&&o.epic==='herald'){b(-17,-18,34,26,ink);b(-15,-20,30,25,'#8c73a0');b(-11,-23,22,15,'#b09abf');b(-5,-15,10,7,'#e2b7dc');b(-1,-14,3,5,'#493957');b(-23,-8,8,19,'#68547d');b(15,-8,8,19,'#68547d');}
 else if(baron){b(-19,-13,38,22,ink);b(-16,-13,30,18,'#68517f');b(-10,-22,24,22,'#9a7cac');b(-5,-32+up,18,16,'#b59ec8');b(-9,-36+up,5,10,'#786089');b(13,-35+up,4,10,'#786089');b(0,-26+up,3,3,'#e9c9a1');b(10,-26+up,3,3,'#e9c9a1');b(5,-18+up,13,3,'#55415f');b(-22,3,7,8,'#876d9a');b(14,3,7,8,'#876d9a');}
 else{b(-8,-17,17,27,ink);b(-6,-17,13,25,'#ba9467');b(-27,-22-up,17,4,'#795b54');b(-29,-18-up,21,7,'#936d5d');b(-24,-11-up,16,7,'#ad866b');b(10,-22-up,17,4,'#795b54');b(8,-18-up,21,7,'#936d5d');b(8,-11-up,16,7,'#ad866b');b(-5,-29+up,15,14,'#c5a177');b(6,-23+up,3,2,'#ffe0a1');b(9,-19+up,6,5,'#a7805d');b(-12,9,9,4,'#947154');b(3,9,9,4,'#947154');}
 c.restore();if(seen){box(c,o.x-23,o.y-43,46,4,'#252132');box(c,o.x-22,o.y-42,44*Math.max(0,o.hp/(o.maxHp||450)),2,baron?'#bda1d6':'#d3ac7c');}return true;}
function install(){RPG_ART.hero=hero;RPG_ART.creature=creature;RPG_ART.epic=epic;ART_PACK.actorStyle='compact-football-like';document.querySelectorAll('.hero .avatar canvas').forEach(c=>c.remove());HERO_ART.portraits();OVERVIEW.refreshPortraits();if(state)BROADCAST.refreshPortraits();window.COMPACT_ACTORS={sprite,beast,hero,creature,epic,worldBodyHeight:26};if(window.MATCH_UI)MATCH_UI.update();}
if(window.ART_PACK?.ready)install();else window.addEventListener('artpackready',install,{once:true});
})();
