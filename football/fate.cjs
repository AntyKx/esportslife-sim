// 我的足球人生：指定國家跑 N 段人生，統計踢上職業(含半職業)、全職業、國家隊。用法 node football/fate.cjs 國家代碼|WORLD 段數
const path=require('path'),fs=require('fs');const {JSDOM}=require('jsdom');
const C0=process.argv[2]||'WORLD', N=+process.argv[3]||600, rd=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const dom=new JSDOM('<!DOCTYPE html><body></body>',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/play.html'});
const w=dom.window; w.matchMedia=()=>({matches:false}); for(const f of ['fl-data.js','world.js','events.js','life.js']){ const s=w.document.createElement('script'); s.textContent=rd(f); w.document.body.appendChild(s); }
const Fz=w.FL_ZERO; w.ML_FORCE_C=C0==='WORLD'?null:C0; let pro=0,full=0,nt=0,semiOnly=0;
for(let i=0;i<N;i++){ Fz.newLife(); let Z=Fz.state(); Z.pause=true; Z.birth=false; let g=0;
  while(!Z.done&&g++<130){ Z.t=Math.floor(Z.t)+1; Fz.yearEnd(); while(Z.pending.length){ const k=Z.pending.shift(), A=Fz.ASK[k](); if(A.end)break; const mi=Math.max(0,A.o.findIndex(o=>o.main)), j=Math.random()<.8?mi:Math.floor(Math.random()*A.o.length); A.o[j].f&&A.o[j].f(); } Z=Fz.state(); }
  const C=Z.car; if(C.hist.length)pro++; if(C.fullPro)full++; if(C.hist.length&&!C.fullPro)semiOnly++; if(C.caps>0)nt++; }
console.log(JSON.stringify({c:C0,n:N,pro:+(pro/N*100).toFixed(2),full:+(full/N*100).toFixed(2),semiOnly:+(semiOnly/N*100).toFixed(2),nt:+(nt/N*100).toFixed(2)})); process.exit(0);
