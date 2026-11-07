'use strict';
// 1.06 預估機率：用雲端 1000 場完整模擬校正出的邏輯迴歸（esportslife-sim / sim/odds-fit.cjs），
// 在關鍵時刻即時算「我去／不去／我喊開團」各自的我方贏面。結果仍由比賽模擬打出來，數字只是「預估」。
// 特徵順序必須和 sim/odds-data.cjs 的 feats() 完全一致。
(()=>{
const MODEL={"fight":{"b":-0.1507,"W":[-0.1376,-0.0555,0.6599,0.5908,0.0443,0.0701,0.1593,0.2032,0.286,2.0919,0.1643,0.0406,-0.0222,0.0467]},"skirm":{"b":-0.2155,"W":[-0.0326,-0.0222,0.4668,0.2096,-0.005,0.0332,0.2013,0.343,0.244,0.4805,0.0101,0.0151,0.2883,0.0295]},"obj":{"b":0.1347,"W":[-0.1208,-0.0586,0.4129,0.4596,-0.0301,0.0247,0.1459,-0.1456,-0.0622,-2.1023,0.3532,0.0816,-0.1198,0.1282]}};
const R={fight:350,skirm:350,obj:420};
const M=()=>window.MACRO,live=a=>a&&a.kind==='hero'&&a.hp>0&&!(a.dead>0),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),sig=z=>1/(1+Math.exp(-z));
const H=()=>state.actors.filter(a=>a.kind==='hero');
const cc=a=>{try{return window.PLAYS?.hasCC(a)?1:0;}catch{return 0;}};
const hpEff=a=>{const m=(typeof heroes!=='undefined'?heroes:null)?.[a.heroIndex]?.hpMul||1;return m;};
const pow=a=>M().heroPower(a)*hpEff(a);
// 生涯中你的傷害倍率（growth.js 的公式，取中後期的團戰能力）；練習賽＝1
function myMul(){const c=window.CAREER?.data,s=state;if(!c||!s||!(s.careerMatchId||s.proGame)||!c.stats)return 1;const v=s.time<840?c.stats.laning:c.stats.teamfight;return Math.max(.8,Math.min(1.3,.94+(v||60)/800));}
// me：'actual' 照現在位置、'here' 當作你到場、'away' 當作你不在；allies：'actual'、'all'（900 內的隊友都跟上）、'none'（只有你）
function feats(c,team,r,o={}){const s=state,me=H().find(a=>a.player),meT=me?.team;
 let us=H().filter(a=>live(a)&&a.team===team),them=H().filter(a=>live(a)&&a.team!==team);
 const pos=a=>{if(o.bring?.includes(a))return c;if(a.player&&o.me==='here')return c;if(a.team===meT&&!a.player&&o.allies==='all'&&D(a,c)<900)return c;return a;};
 const gone=a=>o.away?.includes(a)||a.player&&o.me==='away'||a.team===meT&&!a.player&&o.allies==='none';
 us=us.filter(a=>!gone(a));them=them.filter(a=>!gone(a));
 const near=L=>L.filter(a=>D(pos(a),c)<r),arr=L=>L.filter(a=>{const d=D(pos(a),c);return d>=r&&d<r+450;});
 const pw=L=>L.reduce((x,a)=>x+pow(a),0),lv=L=>L.length?L.reduce((x,a)=>x+(a.level||1),0)/L.length:0;
 const u=near(us),t=near(them),ua=arr(us),ta=arr(them);
 const tower=s.structures.some(x=>x.kind==='tower'&&x.hp>0&&x.team===team&&D(x,c)<260)?1:s.structures.some(x=>x.kind==='tower'&&x.hp>0&&x.team!==team&&D(x,c)<260)?-1:0;
 const e=1-team,buff=k=>((s[k]?.[team]>s.time)?1:0)-((s[k]?.[e]>s.time)?1:0);
 const pin=me&&live(me)&&u.concat(t).includes(me)?(me.team===team?1:-1):0;
 return [u.length-t.length,ua.length-ta.length,Math.log((pw(u)+.3)/(pw(t)+.3)),Math.log((pw(u)+pw(ua)*.5+.3)/(pw(t)+pw(ta)*.5+.3)),
  u.filter(a=>!(a.ultCD>0)).length-t.filter(a=>!(a.ultCD>0)).length,u.reduce((x,a)=>x+cc(a),0)-t.reduce((x,a)=>x+cc(a),0),
  u.filter(a=>M().spell(a,'flash')).length-t.filter(a=>M().spell(a,'flash')).length,tower,buff('heroBuff'),buff('elderUntil'),((s.drakes?.[team]||0)-(s.drakes?.[e]||0))/4,
  lv(u)-lv(t),pin*Math.log(myMul()),(s.gold[team]-s.gold[e])/1000];}
function p(kind,c,team=0,o={}){const m=MODEL[kind];if(!m||!state||!M())return null;const x=feats(c,team,R[kind],o);return Math.max(.03,Math.min(.97,sig(m.b+x.reduce((s,v,j)=>s+v*m.W[j],0))));}
// 隊友跟你的機率：教練信任、名氣；練習賽 60%
function follow(){const c=window.CAREER?.data,s=state;if(!c||!(s?.careerMatchId||s?.proGame))return .6;const tr=c.trust??50,fame=Math.min(.15,(c.fans||0)/4000);return Math.max(.2,Math.min(.92,.3+(tr-30)/100+fame));}
const mix=(f,a,b)=>a==null||b==null?null:f*a+(1-f)*b;
// 選項校正（雲端隨機對照實驗：每個選項隨機選 240～580 次，實際勝率 vs 原始預估，在 logit 上補差）
// 第三輪（7500 次）再微調：帶線 +、強攻高地 −、留線 −、搶龍 +
const OFF={objGo:-.02,objStay:-.52,objCall:.24,join:-.084,engage:.69,retreat:-.15,side:.85,siege:.19};
// 個人時刻（對線、被抓、野區、守家、對手中路消失）的補差：先由雲端隨機對照實驗量出，填在這裡
// 樣本 ≥40 的直接用實測補差；樣本少的依 n/(n+60) 打折，避免被少數幾場帶偏（對線類事件在模擬裡很少觸發）
// 1.07 對線類補資料（雲端 LANE 模式 1200 場）：被 gank、對線優劣勢、打野幫忙各 88～1028 筆
const OFF2={bdFight:1.32,bdHold:.7,bdHunt:.66,gwBack:-.32,gwJg:-.25,gwStay:-.26,ivGo:.54,ivStay:.76,joGo:.23,llBack:-.91,llJg:-1.07,lwDive:2.4,lwHelp:.67,mmBack:-.43,mmJg:-.36,mmWard:-.17,whLurk:-.41,bdSteal:0};// 第三輪（2400 場）// 第二輪（LANE=2、新種子）再修
const logit=v=>Math.log(v/(1-v));
// 第二輪驗證（新種子）：各選項誤差都在 ±5% 內，但 80% 以上和 10% 以下偏太自信 → logit 再乘 0.8，範圍限制在 15%～85%
function adj(key,v){if(v==null)return null;return Math.max(.15,Math.min(.85,sig((logit(Math.max(.02,Math.min(.98,v)))+(OFF[key]??OFF2[key]??0))*.8)));}
// ---------- 選項上的圓環 ----------
const TAGS={safe:'穩健',std:'標準',risky:'冒險'};
function ring(od){if(!od||od.p==null)return od?.note?`<span class="od"><span class="od-txt">${od.note}</span></span>`:'';const v=Math.round(od.p*100);
 return `<span class="od"><i class="od-ring ${od.tag||'std'}" style="--p:${v}"><b>${v}%</b></i><span class="od-txt"><u class="od-tag ${od.tag||'std'}">${TAGS[od.tag||'std']}</u> 預估${od.what?`・${od.what}`:''}${od.note?`<br><small>${od.note}</small>`:''}</span></span>`;}
const prevSD=showDecision;showDecision=function(type,title,text,opts,...rest){const r=prevSD.call(this,type,title,text,opts,...rest);
 (opts||[]).forEach(o=>{const od=o?.odds;if(!od||!od.c||od.p==null||o.__w)return;o.__w=1;const run=o.run;o.run=function(){const r=run.apply(this,arguments);try{watch({kind:od.judge||'fight',c:{x:od.c.x,y:od.c.y},obj:od.obj,secs:od.secs||16,until:state.time+(od.secs||60),choice:o.name,p:od.p,what:od.what,key:od.key});}catch{}return r;};});
 try{const bs=[...document.querySelectorAll('#decision .choice')];(opts||[]).forEach((o,i)=>{if(o?.odds&&bs[i]&&!bs[i].querySelector('.od'))bs[i].insertAdjacentHTML('beforeend',ring(o.odds));});}catch{}return r;};
// ---------- 結果追蹤：預估 X% → 成功／失敗 ----------
function watch(w){const s=state;if(!s)return;(s.oddsWatch||(s.oddsWatch=[])).push({...w,t0:s.time,k0:[...s.kills],d0:(s.oddsDeaths||[]).length});}
const prevD=bDamage;bDamage=function(f,t){const was=live(t);const r=prevD.apply(this,arguments);const s=state;if(s&&was&&t?.kind==='hero'&&!live(t))(s.oddsDeaths||(s.oddsDeaths=[])).push({t:s.time,team:t.team,x:t.x,y:t.y});return r;};
function judge(s,w){if(w.kind==='obj'){const got=(s.history||[]).find(h=>h.kind==='objective'&&h.name===w.obj.name&&h.time>=w.t0);if(got)return got.team===0?'win':'lose';return s.time>w.until?'none':null;}
 if(s.time<w.t0+w.secs)return null;const dd=(s.oddsDeaths||[]).slice(w.d0).filter(d=>d.t<=w.t0+w.secs&&D(d,w.c)<650),k0=dd.filter(d=>d.team===1).length,k1=dd.filter(d=>d.team===0).length;return k0>k1?'win':k0<k1?'lose':'none';}
const prevTick=tick;tick=function(dt){prevTick(dt);const s=state;if(!s?.oddsWatch?.length)return;
 for(const w of s.oddsWatch.slice()){const res=judge(s,w);if(!res&&!s.done)continue;s.oddsWatch.splice(s.oddsWatch.indexOf(w),1);const r=res||'none';
  const e={choice:w.choice,key:w.key,p:w.p,res:r,what:w.what,t:s.time,upset:r==='win'&&w.p!=null&&w.p<.35,choke:r==='lose'&&w.p!=null&&w.p>.7};(s.oddsLog||(s.oddsLog=[])).push(e);
  try{log(`預估結果　「${w.choice}」預估 ${w.p!=null?Math.round(w.p*100)+'%':'—'} → ${r==='win'?'成功':r==='lose'?'失敗':'沒有分出勝負'}`);M().story('odds',0,{label:w.choice,result:r,p:w.p,upset:e.upset});}catch{}}};
function OD(key,c,kind,o,tag,what,extra={}){if(!c)return {note:what};return {p:adj(key,p(kind,c,0,o)),tag,what,key,c:{x:c.x,y:c.y},...extra};}
window.ODDS={p,feats,follow,mix,adj,watch,ring,myMul,MODEL,OD,OFF2};
})();
