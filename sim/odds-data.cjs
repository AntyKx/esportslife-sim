// 1.06 預估機率的資料收集：完整引擎（含裝備、地圖資源、各位置判斷）自動對戰，
// 每遇到「團戰／小規模交戰／物件爭奪」就記下開打前的局勢（我方−對方的差值）和之後的結果。
// 玩家英雄的傷害乘上隨機倍率（0.8～1.3，模擬生涯能力高低），讓模型學到「你越強，你在場的影響越大」。
// 用法：node sim/odds-data.cjs 場數 種子  → 輸出 JSON 行：{k:'fight'|'skirm'|'obj',x:[特徵],y:1/0,d:擊殺差}
const fs=require('fs'),vm=require('vm'),D=__dirname+'/../engine';
const FILES=['roster.js','game.js','battle.js','rift.js','rift-nav.js','macro.js','kits.js','equipment.js','plays.js','objectives.js'];
function harness(seed){const elements=new Map(),el=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},after(){},append(){},prepend(){},remove(){},insertAdjacentHTML(){},addEventListener(){},setAttribute(){},getAttribute(){return null;},closest(){return null;},scrollIntoView(){},querySelector(){return null;},querySelectorAll(){return [];},getBoundingClientRect(){return {x:0,y:0,width:0,height:0,top:0,left:0,bottom:0,right:0};},getContext:()=>new Proxy({},{get:()=>()=>{}})});
 let n=seed;const math=Object.create(Math);math.random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
 const store={};const ctx={document:{querySelector:s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s);},querySelectorAll:()=>[],getElementById:s=>{if(!elements.has('#'+s))elements.set('#'+s,el());return elements.get('#'+s);},createElement:el,addEventListener(){},body:el(),documentElement:el()},
  window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
  innerWidth:1280,requestAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>0},matchMedia:()=>({matches:false,addEventListener(){}}),Math:math,console:{log(){},warn(){},error(){}}};
 ctx.CAREER={data:null,save(){}};ctx.window.CAREER=ctx.CAREER;ctx.window.document=ctx.document;ctx.window.localStorage=ctx.localStorage;vm.createContext(ctx);vm.runInContext('var window=this.window;',ctx);
 for(const f of FILES)vm.runInContext(fs.readFileSync(D+'/'+f,'utf8'),ctx,{filename:f});return ctx;}
// 在遊戲環境裡執行的觀察器：特徵與結果都在裡面算
const OBSERVER=`(()=>{const M=window.MACRO,P=window.PLAYS,live=a=>a&&a.kind==='hero'&&a.hp>0&&!(a.dead>0),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const H=()=>state.actors.filter(a=>a.kind==='hero');const __deaths=[],__rows=[];window.__rows=__rows;const open=[];
 const _d=bDamage;bDamage=function(f,t,amt,...r){if(f&&f.player&&t&&t.kind==='hero')amt*=window.__mul;const was=live(t);const res=_d.call(this,f,t,amt,...r);if(was&&t.kind==='hero'&&!live(t))__deaths.push({t:state.time,team:t.team,x:t.x,y:t.y});return res;};
 const cc=a=>{try{return P.hasCC(a)?1:0;}catch{return 0;}};
 // 某個中心點附近、從 team 的角度看的特徵（我方−對方）
 function feats(c,team,r){const s=state,us=H().filter(a=>live(a)&&a.team===team),them=H().filter(a=>live(a)&&a.team!==team);
  const near=(L,rr)=>L.filter(a=>D(a,c)<rr),arr=(L)=>L.filter(a=>D(a,c)>=r&&D(a,c)<r+450);
  const pw=L=>L.reduce((x,a)=>x+M.heroPower(a),0),lv=L=>L.length?L.reduce((x,a)=>x+(a.level||1),0)/L.length:0;
  const u=near(us,r),t=near(them,r),ua=arr(us),ta=arr(them);
  const tower=s.structures.some(x=>x.kind==='tower'&&x.hp>0&&x.team===team&&D(x,c)<260)?1:s.structures.some(x=>x.kind==='tower'&&x.hp>0&&x.team!==team&&D(x,c)<260)?-1:0;
  const e=1-team,buff=k=>((s[k]?.[team]>s.time)?1:0)-((s[k]?.[e]>s.time)?1:0);
  const me=H().find(a=>a.player),pin=me&&live(me)&&D(me,c)<r?(me.team===team?1:-1):0;
  return [u.length-t.length,ua.length-ta.length,Math.log((pw(u)+.3)/(pw(t)+.3)),Math.log((pw(u)+pw(ua)*.5+.3)/(pw(t)+pw(ta)*.5+.3)),
   u.filter(a=>!(a.ultCD>0)).length-t.filter(a=>!(a.ultCD>0)).length,u.reduce((x,a)=>x+cc(a),0)-t.reduce((x,a)=>x+cc(a),0),
   u.filter(a=>M.spell(a,'flash')).length-t.filter(a=>M.spell(a,'flash')).length,tower,buff('heroBuff'),buff('elderUntil'),((s.drakes?.[team]||0)-(s.drakes?.[e]||0))/4,
   lv(u)-lv(t),pin*Math.log(window.__mul),(s.gold[team]-s.gold[e])/1000,u.length+t.length];}
 window.__obs=function(){const s=state;if(!s||s.done)return;const t=s.time,hs=H().filter(live);
  // 結算到期的紀錄
  for(let i=open.length-1;i>=0;i--){const o=open[i];if(t<o.end)continue;open.splice(i,1);
   if(o.k==='obj'){const got=(s.history||[]).filter(h=>h.kind==='objective'&&h.name===o.name&&h.time>=o.t0&&h.time<=o.end);if(!got.length)continue;const y=got[0].team===0?1:0;__rows.push({k:'obj',x:o.x,y,n:o.name});__rows.push({k:'obj',x:o.xr,y:1-y,n:o.name});continue;}
   const dd=__deaths.filter(d=>d.t>=o.t0&&d.t<=o.end&&Math.hypot(d.x-o.c.x,d.y-o.c.y)<600),k0=dd.filter(d=>d.team===1).length,k1=dd.filter(d=>d.team===0).length;
   if(k0===k1)continue;__rows.push({k:o.k,x:o.x,y:k0>k1?1:0,d:k0-k1});__rows.push({k:o.k,x:o.xr,y:k0>k1?0:1,d:k1-k0});}
  // 物件：出現前 12 秒起算，90 秒內誰拿到
  for(const o of [s.dragon,s.baron]){if(!o)continue;const key='o'+o.name+Math.round(o.respawn||0);const due=o.alive?0:(o.respawn||0)-t;
   if(due<=12&&!s[key]){s[key]=1;open.push({k:'obj',name:o.name,t0:t,end:t+100,x:feats(o,0,420),xr:feats(o,1,420)});}}
  // 交戰：雙方各 2 人以上在 350 內、有人 1.5 秒內掉血
  for(const a of hs.filter(a=>a.team===0)){const foes=hs.filter(b=>b.team===1&&D(a,b)<300);if(!foes.length)continue;
   const c={x:(a.x+foes[0].x)/2,y:(a.y+foes[0].y)/2},n0=hs.filter(b=>b.team===0&&D(b,c)<350).length,n1=hs.filter(b=>b.team===1&&D(b,c)<350).length;
   if(n0<1||n1<1||n0+n1<2)continue;if(!hs.some(b=>D(b,c)<350&&t-(b.lastHurt??-99)<1.5))continue;
   if(open.some(o=>o.k!=='obj'&&Math.hypot(o.c.x-c.x,o.c.y-c.y)<450&&t-o.t0<20)||window.__last&&window.__last.some(l=>Math.hypot(l.x-c.x,l.y-c.y)<450&&t-l.t<25))continue;
   const k=Math.min(n0,n1)>=3?'fight':'skirm';(window.__last||(window.__last=[])).push({x:c.x,y:c.y,t});
   open.push({k,c,t0:t,end:t+(k==='fight'?20:12),x:feats(c,0,350),xr:feats(c,1,350)});}};})()`;
const N=+(process.argv[2]||10),S0=+(process.argv[3]||1);let rows=0;const out=[];
for(let g=0;g<N;g++){const ctx=harness(S0*7919+g*104729);const mul=.8+ctx.Math.random()*.5;
 vm.runInContext(`role=${g%5};{const pool=ROSTER.map((h,i)=>[h,i]).filter(([h])=>h.role===role).map(x=>x[1]);selected=pool[${(g*7+S0*3)}%pool.length];}start();window.__mul=${mul};`,ctx);
 vm.runInContext(OBSERVER,ctx);
 for(let i=0;i<20000;i++){const s=vm.runInContext('state',ctx);if(!s||s.done)break;if(s.decision){const ch=s.decision.choices,sur=s.decision.type==='surrender';const c=sur?ch[1]:ch[Math.floor(ctx.Math.random()*ch.length)];s.decision=null;c.run();s.next=s.time+210;}
  vm.runInContext('tick(.25)',ctx);if(i%4===0)vm.runInContext('window.__obs()',ctx);}
 const R=vm.runInContext('window.__rows',ctx);for(const r of R)out.push(JSON.stringify({...r,x:r.x.map(v=>+v.toFixed(3)),g:S0*1000+g}));rows+=R.length;}
fs.writeFileSync('rows.jsonl',out.join('\n'));console.log(JSON.stringify({N,rows,kinds:out.reduce((m,l)=>{const k=JSON.parse(l).k;m[k]=(m[k]||0)+1;return m;},{})}));
