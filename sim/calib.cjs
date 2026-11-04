// 校正：關掉相剋，統計前 14 分鐘同路對手之間的擊殺（擊殺者職業 > 被殺者職業）
const fs=require('fs'),vm=require('vm'),D=__dirname+'/../engine';
function harness(seed){const elements=new Map(),el=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,after(){},scrollIntoView(){},querySelectorAll(){return [];},getContext:()=>new Proxy({},{get:()=>()=>{}})});let n=seed;const math=Object.create(Math);math.random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);const ctx={document:{querySelector:s=>{if(!elements.has(s))elements.set(s,el());return elements.get(s);},createElement:el},window:{scrollTo(){}},innerWidth:1280,requestAnimationFrame(){},Math:math,console:{log(){},warn(){}},LANE_CALIB:true};vm.createContext(ctx);for(const f of ['roster.js','game.js','battle.js','rift.js','rift-nav.js','macro.js','kits.js'])vm.runInContext(fs.readFileSync(D+'/'+f,'utf8'),ctx);return ctx;}
const N=+(process.argv[2]||100),IQ=process.argv[3]||'0.6',OFF=+(process.argv[4]||0),pairs={};
for(let g=0;g<N;g++){const id=OFF*100000+g;const ctx=harness(id*17+3);vm.runInContext(`role=${id%5};selected=${(id*13)%80};start()`,ctx);const api=ctx.window.ESPORTS;
 vm.runInContext(`window.ESPORTS.state.actors.forEach(a=>a.iq=${IQ})`,ctx);
 for(let n=0;n<3600&&!api.state.done;n++){const s=api.state;if(s.decision){const c=s.decision.choices[1]||s.decision.choices[0];s.decision=null;c.run();s.next=s.time+210;}api.tick(.25);if(s.time>860)break;}
 for(const [k,v] of api.state.pairKills||[]){const key=k+'>'+v;pairs[key]=(pairs[key]||0)+1;}}
console.log(JSON.stringify({games:N,iq:IQ,pairs}));
