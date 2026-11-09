// 彙整所有分片的生涯結果：分數百分位、目前門檻下的等級比例、各項分數平均、冠軍數與分數的關係
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'results';let all=[];
for(const f of fs.readdirSync(dir,{recursive:true}))if(String(f).endsWith('.json')){try{all.push(...JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));}catch{}}
all=all.filter(r=>r&&r.score!=null&&!r.err);
const sc=all.map(r=>r.score).sort((a,b)=>a-b),pct=q=>sc[Math.min(sc.length-1,Math.floor(q/100*sc.length))];
const TH=[['傳奇',1500],['名人堂',900],['明星選手',500],['職業選手',200],['職業過客',0]];
const tierOf=v=>TH.find(t=>v>=t[1])[0],cnt={};all.forEach(r=>cnt[tierOf(r.score)]=(cnt[tierOf(r.score)]||0)+1);
const avg=k=>Math.round(all.reduce((a,r)=>a+(r.parts?.[k]||0),0)/all.length);
const by=(f)=>{const m={};all.forEach(r=>{const k=f(r);(m[k]||=[]).push(r.score);});return Object.fromEntries(Object.entries(m).sort((a,b)=>+a[0]-+b[0]).map(([k,v])=>[k,{n:v.length,avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length),min:Math.min(...v),max:Math.max(...v)}]));};
const out={n:all.length,percentiles:{p10:pct(10),p25:pct(25),p50:pct(50),p65:pct(65),p75:pct(75),p90:pct(90),p95:pct(95),p98:pct(98),max:sc.at(-1)},
 tiers:Object.fromEntries(TH.map(([n])=>[n,`${cnt[n]||0} (${Math.round((cnt[n]||0)/all.length*100)}%)`])),
 avgParts:Object.fromEntries(['ladder','academy','pro','honor','fans'].map(k=>[k,avg(k)])),
 avgYears:+(all.reduce((a,r)=>a+r.years,0)/all.length).toFixed(1),avgGames:Math.round(all.reduce((a,r)=>a+r.games,0)/all.length),
 byWorlds:by(r=>r.worlds),byTitles:by(r=>Math.min(6,r.titles)),byRegion:by(r=>r.region),
 endAge:by(r=>r.age),endPath:all.reduce((o,r)=>(o[r.path]=(o[r.path]||0)+1,o),{}),
 ratingByAge:(()=>{const m={};all.forEach(r=>(r.rt||[]).forEach(x=>{if(Array.isArray(x))(m[x[0]]||=[]).push(x[1]);}));return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,{n:v.length,avg:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)}]));})(),
 errors:all.length?undefined:'no data'};
console.log(JSON.stringify(out,null,1));
