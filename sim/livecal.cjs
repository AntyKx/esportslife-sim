// 1.28 親自上場勝率校正（由 odds-check 改）：（隨機選擇對照實驗）：每個關鍵時刻隨機選一個選項，比較「顯示的預估」和「實際結果」。
// 原本的說明：預估機率的資料收集：完整引擎（含裝備、地圖資源、各位置判斷）自動對戰，
// 每遇到「團戰／小規模交戰／物件爭奪」就記下開打前的局勢（我方−對方的差值）和之後的結果。
// 玩家英雄的傷害乘上隨機倍率（0.8～1.3，模擬生涯能力高低），讓模型學到「你越強，你在場的影響越大」。
// 用法：node sim/odds-data.cjs 場數 種子  → 輸出 JSON 行：{k:'fight'|'skirm'|'obj',x:[特徵],y:1/0,d:擊殺差}
const fs=require('fs'),vm=require('vm'),D=__dirname+'/../engine';
const FILES=['roster.js','game.js','battle.js','rift.js','rift-nav.js','macro.js','kits.js','equipment.js','plays.js','objectives.js','odds.js'];
function harness(seed){const elements=new Map(),el=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},after(){},append(){},prepend(){},remove(){},insertAdjacentHTML(){},addEventListener(){},setAttribute(){},getAttribute(){return null;},closest(){return null;},scrollIntoView(){},querySelector(){return null;},querySelectorAll(){return [];},getBoundingClientRect(){return {x:0,y:0,width:0,height:0,top:0,left:0,bottom:0,right:0};},getContext:()=>new Proxy({},{get:()=>()=>{}})});
 let n=seed;const math=Object.create(Math);math.random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
 const store={};const ctx={document:{querySelector:s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s);},querySelectorAll:()=>[],getElementById:s=>{if(!elements.has('#'+s))elements.set('#'+s,el());return elements.get('#'+s);},createElement:el,addEventListener(){},body:el(),documentElement:el()},
  window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
  innerWidth:1280,requestAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>0},matchMedia:()=>({matches:false,addEventListener(){}}),Math:math,console:{log(){},warn(){},error(){}}};
 ctx.CAREER={data:null,save(){}};ctx.window.CAREER=ctx.CAREER;ctx.window.document=ctx.document;ctx.window.localStorage=ctx.localStorage;vm.createContext(ctx);vm.runInContext('var window=this.window;',ctx);
 for(const f of FILES)vm.runInContext(fs.readFileSync(D+'/'+f,'utf8'),ctx,{filename:f});return ctx;}
const N=+(process.argv[2]||10),S0=+(process.argv[3]||1),out=[];
for(let g=0;g<N;g++){const ctx=harness(S0*7919+g*104729),R=()=>ctx.Math.random();
 const m=Math.round(20+R()*70),bA=72+R()*16,bB=72+R()*16,rA=[0,1,2,3,4].map(()=>bA+(R()-.5)*6),rB=[0,1,2,3,4].map(()=>bB+(R()-.5)*6),ev=(R()*2-1),lanes=[0,1,2,3,4].map(()=>{const x=R();return x<.25?-1:x<.75?0:1;});
 vm.runInContext(`role=${g%5};{const pool=ROSTER.map((h,i)=>[h,i]).filter(([h])=>h.role===role).map(x=>x[1]);selected=pool[${(g*7+S0*3)}%pool.length];heroes[selected].mastery=${m};}start();`,ctx);
 vm.runInContext(`{const rA=${JSON.stringify(rA)},rB=${JSON.stringify(rB)},ev=${ev},lanes=${JSON.stringify(lanes)};for(const a of state.actors){if(a.kind!=='hero'&&a.role==null)continue;const r=(a.team?rB:rA)[a.role],sign=a.team?-1:1;a.power*=Math.pow(r/85,2)*(1+sign*ev*.15)*(1+sign*lanes[a.role]*.15);}}`,ctx);
 for(let i=0;i<20000;i++){const s=vm.runInContext('state',ctx);if(!s||s.done)break;if(s.decision){const ch=s.decision.choices,sur=s.decision.type==='surrender';let c=sur?ch[1]:ch[0];if(!sur){let bp=-1;for(const x of ch){const p=x.odds?.p;if(p!=null&&p>bp){bp=p;c=x;}}}s.decision=null;c.run();s.next=s.time+210;}
  vm.runInContext('tick(.25)',ctx);}
 const s=vm.runInContext('state',ctx),mean=a=>a.reduce((x,v)=>x+v,0)/a.length;
 out.push({dr:+(mean(rA)-mean(rB)).toFixed(2),ev:+ev.toFixed(3),la:mean(lanes),lm:lanes[g%5],m,win:s.winner===0?1:0});}
require('fs').writeFileSync('cal.json',JSON.stringify(out));console.log(JSON.stringify({N,win:out.filter(x=>x.win).length}));
