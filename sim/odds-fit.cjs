// 1.06 預估機率擬合：邏輯迴歸（L2），依場次切訓練／測試（80/20），輸出權重與校正表
// 用法：node sim/odds-fit.cjs rows1.jsonl rows2.jsonl ...  → odds-model.json ＋ 螢幕報告
const fs=require('fs');
const NAMES=['人數差','趕到人數差','現場戰力比(log)','含趕到戰力比(log)','大招差','控場差','閃現差','防禦塔','領主','太古','龍層差','等級差','玩家強度','經濟差(k)'];
const rows=process.argv.slice(2).flatMap(f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)));
const sig=z=>1/(1+Math.exp(-z));
function fit(X,Y,l2=.02,it=3000,lr=.15){const d=X[0].length;let w=new Array(d+1).fill(0);
 // 特徵標準化
 const mu=[...Array(d)].map((_,j)=>X.reduce((s,x)=>s+x[j],0)/X.length),sd=[...Array(d)].map((_,j)=>Math.sqrt(X.reduce((s,x)=>s+(x[j]-mu[j])**2,0)/X.length)||1);
 const Z=X.map(x=>x.map((v,j)=>(v-mu[j])/sd[j]));
 for(let k=0;k<it;k++){const g=new Array(d+1).fill(0);for(let i=0;i<Z.length;i++){const p=sig(w[0]+Z[i].reduce((s,v,j)=>s+v*w[j+1],0)),e=p-Y[i];g[0]+=e;for(let j=0;j<d;j++)g[j+1]+=e*Z[i][j];}
  for(let j=0;j<=d;j++)w[j]-=lr*(g[j]/Z.length+(j?l2*w[j]:0));}
 // 換回原始尺度：z = b + Σ w_j (x_j−mu_j)/sd_j
 const W=w.slice(1).map((v,j)=>v/sd[j]),b=w[0]-W.reduce((s,v,j)=>s+v*mu[j],0);return {b,W};}
const pred=(m,x)=>sig(m.b+x.reduce((s,v,j)=>s+v*m.W[j],0));
function report(kind,rs){const F=r=>r.x.slice(0,14);const test=rs.filter(r=>r.g%5===0),train=rs.filter(r=>r.g%5!==0);
 const m0=fit(train.map(F),train.map(r=>r.y));
 // 信心校正（Platt）：在訓練集上再擬合 z'=a·z+c，修正整體太保守或太自信
 const zs=train.map(r=>[m0.b+F(r).reduce((q,v,j)=>q+v*m0.W[j],0)]),pc=fit(zs,train.map(r=>r.y),0,2000,.3),A=pc.W[0],C=pc.b;
 const m={b:A*m0.b+C,W:m0.W.map(v=>A*v),scale:A};const P=test.map(r=>pred(m,F(r))),Y=test.map(r=>r.y);
 const base=Y.reduce((s,y)=>s+y,0)/Y.length,brier=P.reduce((s,p,i)=>s+(p-Y[i])**2,0)/P.length,brier0=Y.reduce((s,y)=>s+(base-y)**2,0)/Y.length;
 const bins=[...Array(10)].map((_,b)=>{const idx=P.map((p,i)=>[p,i]).filter(([p])=>p>=b/10&&p<(b+1)/10);if(!idx.length)return null;const pm=idx.reduce((s,[p])=>s+p,0)/idx.length,ym=idx.reduce((s,[,i])=>s+Y[i],0)/idx.length;return {bin:`${b*10}-${b*10+10}%`,n:idx.length,pred:+(pm*100).toFixed(1),real:+(ym*100).toFixed(1),err:+((ym-pm)*100).toFixed(1)};}).filter(Boolean);
 const acc=P.filter((p,i)=>(p>.5)===(Y[i]===1)).length/P.length;
 return {kind,scale:+m.scale.toFixed(3),n:rs.length,train:train.length,test:test.length,brier:+brier.toFixed(4),brier0:+brier0.toFixed(4),acc:+(acc*100).toFixed(1),bins,model:{b:+m.b.toFixed(4),W:m.W.map(v=>+v.toFixed(4))},weights:Object.fromEntries(NAMES.map((n,j)=>[n,+m.W[j].toFixed(3)]))};}
const out={};for(const k of ['fight','skirm','obj']){const rs=rows.filter(r=>r.k===k);if(rs.length<50)continue;out[k]=report(k,rs);}
fs.writeFileSync('odds-model.json',JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.model]))));
for(const v of Object.values(out)){console.log(`\n== ${v.kind} n=${v.n}（測試 ${v.test}）準確率 ${v.acc}%  Brier ${v.brier}（全猜平均 ${v.brier0}）`);for(const b of v.bins)console.log(`  ${b.bin.padEnd(8)} n=${String(b.n).padStart(4)} 預估 ${b.pred}% 實際 ${b.real}% 誤差 ${b.err>0?'+':''}${b.err}`);console.log('  權重',JSON.stringify(v.weights));}
