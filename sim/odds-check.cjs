// 1.06 預估機率驗證（隨機選擇對照實驗）：每個關鍵時刻隨機選一個選項，比較「顯示的預估」和「實際結果」。
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
for(let g=0;g<N;g++){const ctx=harness(S0*7919+g*104729);
 vm.runInContext(`role=${g%5};{const pool=ROSTER.map((h,i)=>[h,i]).filter(([h])=>h.role===role).map(x=>x[1]);selected=pool[${(g*7+S0*3)}%pool.length];}start();`,ctx);
 for(let i=0;i<20000;i++){const s=vm.runInContext('state',ctx);if(!s||s.done)break;if(s.decision){const ch=s.decision.choices,sur=s.decision.type==='surrender';const k=sur?1:Math.floor(ctx.Math.random()*ch.length),c=ch[k];
   s.__dec=s.__dec||[];s.__dec.push({type:s.decision.type,name:c.name,p:c.odds?.p??null});s.decision=null;c.run();s.next=s.time+210;}
  vm.runInContext('tick(.25)',ctx);}
 const L=vm.runInContext('JSON.stringify(state.oddsLog||[])',ctx);for(const e of JSON.parse(L))out.push(e);}
const G={};for(const e of out){const k=e.choice.replace(/元素翼龍|深淵領主|太古翼龍|岩角巨獸|裂隙蟲群/,'X').replace(/上路|中路|下路/,'某路');const o=G[k]||(G[k]={n:0,p:0,win:0,lose:0,none:0});o.n++;o.p+=e.p||0;o[e.res]++;}
const rep=Object.fromEntries(Object.entries(G).map(([k,o])=>{const dec=o.win+o.lose;return [k,{n:o.n,預估:+(o.p/o.n*100).toFixed(1),實際勝率:dec?+(o.win/dec*100).toFixed(1):null,實際含平手:+(o.win/o.n*100).toFixed(1),平手率:+(o.none/o.n*100).toFixed(1)}];}));
require('fs').writeFileSync('check.json',JSON.stringify(out));console.log(JSON.stringify({N,events:out.length,rep}));
