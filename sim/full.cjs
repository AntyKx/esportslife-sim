// 1.06 完整引擎（含裝備、地圖資源、各位置判斷）的一致性報告：跟瀏覽器版比對平均時長、擊殺、推塔、物件、戰術事件
// 用法：node sim/full.cjs 場數 [起始種子]   環境變數 BASE=1 只載入舊的 7 個戰鬥檔（對照用）
const fs=require('fs'),vm=require('vm'),D=__dirname+'/../engine';
const FILES=['roster.js','game.js','battle.js','rift.js','rift-nav.js','macro.js','kits.js',...(process.env.BASE?[]:['equipment.js','plays.js','objectives.js'])];
function harness(seed){const elements=new Map(),el=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},after(){},append(){},prepend(){},remove(){},insertAdjacentHTML(){},addEventListener(){},setAttribute(){},getAttribute(){return null;},closest(){return null;},scrollIntoView(){},querySelector(){return null;},querySelectorAll(){return [];},getBoundingClientRect(){return {x:0,y:0,width:0,height:0,top:0,left:0,bottom:0,right:0};},getContext:()=>new Proxy({},{get:()=>()=>{}})});
 let n=seed;const math=Object.create(Math);math.random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
 const store={};const ctx={document:{querySelector:s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s);},querySelectorAll:()=>[],getElementById:s=>{if(!elements.has('#'+s))elements.set('#'+s,el());return elements.get('#'+s);},createElement:el,addEventListener(){},body:el(),documentElement:el()},
  window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
  innerWidth:1280,requestAnimationFrame(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>0},matchMedia:()=>({matches:false,addEventListener(){}}),Math:math,console:process.env.DBG?{log(){},warn:(...a)=>process.stderr.write('W '+a.map(String).join(' ').slice(0,200)+String.fromCharCode(10)),error(){}}:{log(){},warn(){},error(){}}};
 ctx.CAREER={data:null,save(){}};ctx.window.CAREER=ctx.CAREER;ctx.window.document=ctx.document;ctx.window.localStorage=ctx.localStorage;vm.createContext(ctx);vm.runInContext('var window=this.window;',ctx);
 for(const f of FILES){try{vm.runInContext(fs.readFileSync(D+'/'+f,'utf8'),ctx,{filename:f});}catch(e){throw Error(f+': '+e.message);}}return ctx;}
const N=+(process.argv[2]||10),S0=+(process.argv[3]||1),res=[];
for(let g=0;g<N;g++){const ctx=harness(S0*7919+g*104729);
 vm.runInContext(`role=${g%5};{const pool=ROSTER.map((h,i)=>[h,i]).filter(([h])=>h.role===role).map(x=>x[1]);selected=pool[${g*7}%pool.length];}start()`,ctx);
 const api=ctx.window.ESPORTS||{state:vm.runInContext('state',ctx),tick:dt=>vm.runInContext('tick('+dt+')',ctx)};
 const st=()=>vm.runInContext('state',ctx);
 for(let i=0;i<20000;i++){const s=st();if(!s||s.done)break;if(s.decision){const ch=s.decision.choices,sur=s.decision.type==='surrender';const c=sur?ch[1]:ch[Math.floor(ctx.Math.random()*ch.length)];s.decision=null;c.run();s.next=s.time+210;}vm.runInContext('tick(.25)',ctx);}
 const s=st(),story=s.story||[],cnt={};for(const e of story)cnt[e.type]=(cnt[e.type]||0)+1;
 const obj=(s.history||[]).filter(h=>h.kind==='objective'),oc={};for(const o of obj)oc[o.name]=(oc[o.name]||0)+1;
 const items=s.actors.filter(a=>a.kind==='hero').reduce((x,a)=>x+(a.inventory?.length||0),0)/10;
 res.push({t:s.time,k:s.kills[0]+s.kills[1],w:s.winner,tw:s.structures.filter(u=>u.kind==='tower'&&u.hp<=0).length,obj:oc,story:cnt,items});}
const avg=f=>res.reduce((x,r)=>x+f(r),0)/res.length,sumK=(k)=>{const m={};for(const r of res)for(const [n,v] of Object.entries(r[k]))m[n]=+(((m[n]||0)+v/res.length).toFixed(2));return m;};
console.log(JSON.stringify({N,base:!!process.env.BASE,avgMin:+(avg(r=>r.t)/60).toFixed(1),minMax:[Math.round(Math.min(...res.map(r=>r.t))/60),Math.round(Math.max(...res.map(r=>r.t))/60)],kills:+avg(r=>r.k).toFixed(1),towers:+avg(r=>r.tw).toFixed(1),items:+avg(r=>r.items).toFixed(1),blueWin:res.filter(r=>r.w===0).length,obj:sumK('obj'),story:sumK('story')}));
