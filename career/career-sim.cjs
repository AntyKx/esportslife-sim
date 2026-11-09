// 生涯分分布試跑：機器人用遊戲本身的按鈕打完整個職業生涯（常規賽、關鍵賽都用「模擬」），讀 SCORE.calc。
const fs=require('fs'),useBrowser=require('./browser.cjs');
const N=+(process.argv[2]||1),outFile=process.argv[3];
useBrowser(async({run,wait,sleep,errors})=>{
 await wait('!!window.SCORE&&!!window.PRO&&!!window.WORLD');await sleep(500);
 const res=[];
 for(let k=0;k<N;k++){const t0=Date.now();
  const r=await run(`(async()=>{
   const R=Math.random,pick=a=>a[Math.floor(R()*a.length)];
   window.__rt=[];localStorage.removeItem('nexus-life-career-v1');rookieName='bot'+${k};CAREER.create();LADDER.start?.(CAREER.data);
   const c=CAREER.data;c.role=Math.floor(R()*5);TALENT.apply(c,TALENT.newSeed(),true);c.country=pick(Object.keys(WORLD.COUNTRIES));
   LADDER.data.peak=5+Math.floor(R()*4);c.results=Array.from({length:6},()=>({rating:+(6.4+R()*1.8).toFixed(1)}));c.finalist=R()<.5;c.champion=c.finalist&&R()<.5;
   c.age=18;c.stage='complete';c.promoChecked=true;CAREER.save();renderSetup();
   document.querySelector('[data-full="0"]').click();
   const retireAge=${process.env.NORETIRE?99:'26+Math.floor(R()*6)'};let steps=0;
   const q=s=>document.querySelector(s);
   while(steps++<6000){const p=CAREER.data.pro;if(!p||p.ended)break;
    const pickR=sel=>{const L=[...document.querySelectorAll(sel)].filter(x=>!x.disabled);return L.length?L[Math.floor(R()*L.length)]:null;};
    let b=pickR('dialog[open] [data-ev]')||q('dialog[open] [data-cer]')||pickR('[data-event]')||pickR('[data-osev]')||pickR('[data-ospr]')||pickR('[data-scrim]')||q('[data-win="stay"]')||pickR('[data-win]')
     ||q('#proFfClose')||q('#proSimRest')||q('#proBenchSim')||q('#proSimSeries')||q('#proSimGame');
    if(!b&&(q('#proNextYear')||q('[data-offer]')||q('#proRetire'))){
     if(CAREER.data.age>=retireAge&&q('#proRetire'))b=q('#proRetire');
     else if(q('[data-offer]')){const os=[...document.querySelectorAll('[data-offer]')];b=os[0];}
     else b=q('#proNextYear')||q('#proRetire');if(b&&b.id==='proNextYear')(window.__rt||=[]).push([CAREER.data.age,WORLD.userRating()]);}
    if(!b)b=q('#proFFYear')||q('#proFF')||q('#proWeek');
    if(!b){document.querySelectorAll('dialog[open]').forEach(d=>d.close());b=q('#proFFYear')||q('#proFF')||q('#proWeek');}
    if(!b)return {err:'stuck',btns:[...document.querySelectorAll('#careerHub button,dialog[open] button')].map(x=>(x.id||'')+'|'+[...x.attributes].map(a=>a.name).filter(n=>n.startsWith('data-')).join(',')+'|'+x.textContent.trim().slice(0,12)).slice(0,30),html:(q('#careerHub')?.innerText||'').slice(0,200)};
    b.click();if(steps%40===0)await new Promise(r=>setTimeout(r,0));}
   const p=CAREER.data.pro,S=SCORE.calc(),T=SCORE.tierInfo();
   const ach=p.achievements||[];
   return {steps,score:S.sc,parts:S.parts,tier:T.n,age:CAREER.data.age,years:p.year-2026,games:p.games,region:WORLD.team(p.team)?.region,
    titles:ach.filter(a=>/冠軍$/.test(a.title)).length,worlds:ach.filter(a=>/世界大賽 冠軍/.test(a.title)).length,
    ach:ach.map(a=>a.year+' '+a.title),seasons:Object.values(p.seasons||{}).map(s=>[s.g,+(s.s/s.g).toFixed(2)]),rating:WORLD.userRating(),rt:window.__rt,pot:CAREER.data.pot,potBoost:CAREER.data.potBoost||0,ttier:CAREER.data.talent?.tier,ended:!!p.ended,path:p.ended?.path,growth:CAREER.data.growth,decay:CAREER.data.decay};
  })()`);
  r.sec=Math.round((Date.now()-t0)/1000);res.push(r);console.log(JSON.stringify(r));
  if(outFile)fs.writeFileSync(outFile,JSON.stringify(res));
 }
 console.log('errors',errors.slice(0,5));
});
