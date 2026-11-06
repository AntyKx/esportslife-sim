'use strict';
// 0.85 PWA 與贊助入口（參照足球人生）：
// ・加到手機桌面：可一鍵安裝時直接安裝；否則依手機與瀏覽器顯示步驟（LINE、FB 等內建瀏覽器先引導用 Safari／Chrome 開啟）。
// ・贊助：設定畫面左下角與生涯結局頁各一個「☕ 請作者喝杯咖啡」，直接連到 Ko-fi（與足球人生共用）；頁尾「贊助」連到說明頁。只是外部連結，不影響遊戲。
(()=>{
const $=s=>document.querySelector(s);
let EVT=null;
if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
const standalone=()=>!!(matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
function env(){const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),and=/Android/.test(ua);
 const app=/\bLine\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|Threads|KAKAOTALK|Messenger/.test(ua)?(/Line\//.test(ua)?'LINE':/Instagram/.test(ua)?'Instagram':/Threads/.test(ua)?'Threads':/MicroMessenger/.test(ua)?'微信':/KAKAOTALK/.test(ua)?'KakaoTalk':'Facebook'):'';
 const b=ios?(app?'ios-app':/CriOS/.test(ua)?'ios-chrome':/FxiOS/.test(ua)?'ios-firefox':/EdgiOS/.test(ua)?'ios-edge':'ios-safari'):and?(app?'and-app':/SamsungBrowser/.test(ua)?'and-samsung':/Firefox/.test(ua)?'and-firefox':/EdgA/.test(ua)?'and-edge':'and-chrome'):'desktop';
 return {b,app,mobile:ios||and};}
const SHARE='<span class="pwa-ic" aria-label="分享"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V1.5M5 4.5l3-3 3 3"/><path d="M4.5 7H3.5v7.5h9V7h-1"/></svg></span>';
const DOTS='<span class="pwa-ic" aria-label="選單">⋮</span>',MENU='<span class="pwa-ic" aria-label="選單">≡</span>',MORE='<span class="pwa-ic" aria-label="更多">⋯</span>';
const NAME={'ios-safari':'Safari','ios-chrome':'iPhone 版 Chrome','ios-firefox':'iPhone 版 Firefox','ios-edge':'iPhone 版 Edge','and-chrome':'Chrome','and-edge':'Edge','and-samsung':'三星網際網路','and-firefox':'Firefox','desktop':'電腦瀏覽器'};
function steps(E){const b=E.b;
 if(b==='ios-app'||b==='and-app')return [`點右上角（或右下角）的 ${MORE} 或 ${DOTS}`,`選 <b>${b==='ios-app'?'用 Safari 開啟':'用 Chrome 開啟'}</b>（也可能寫「在瀏覽器中開啟」）`,'在瀏覽器裡會再出現這份教學，照著做就好'];
 if(b==='ios-safari')return [`點畫面下方的分享按鈕 ${SHARE}（iPad 在右上角）`,'往下滑，點 <b>加入主畫面</b>','右上角點 <b>新增</b>'];
 if(b==='ios-chrome')return [`點網址列右邊的分享按鈕 ${SHARE}`,'點 <b>加入主畫面</b>（沒看到就先點「更多」）','點 <b>新增</b>'];
 if(b==='ios-firefox'||b==='ios-edge')return [`點選單 ${b==='ios-firefox'?MENU:MORE}，再點 <b>分享</b> ${SHARE}`,'點 <b>加入主畫面</b>','點 <b>新增</b>'];
 if(b==='and-samsung')return [`點下方的選單 ${MENU}`,'點 <b>新增頁面至</b> → <b>主畫面</b>','點 <b>新增</b>'];
 if(b==='and-firefox')return [`點右上角的 ${DOTS}`,'點 <b>安裝</b>（或「新增至主畫面」）','點 <b>新增</b>'];
 if(b==='desktop')return ['在網址列右邊找到「安裝」圖示（Chrome、Edge）','點 <b>安裝</b>'];
 return [`點右上角的 ${DOTS}`,'點 <b>加到主畫面</b> 或 <b>安裝應用程式</b>','點 <b>安裝</b>'];}
function dialog(){let d=$('#pwaDialog');if(d)return d;d=document.createElement('dialog');d.id='pwaDialog';d.className='life-dialog pwa-dialog';document.body.append(d);
 d.addEventListener('click',async e=>{if(e.target===d||e.target.closest('#pwaClose')){d.close();return;}
  if(e.target.closest('#pwaGo')&&EVT){EVT.prompt();try{await EVT.userChoice;}catch{}EVT=null;d.close();sync();}
  if(e.target.closest('#pwaCopy')){try{await navigator.clipboard.writeText(location.origin+location.pathname);e.target.textContent='已複製';}catch{e.target.textContent=location.origin;}}});return d;}
function open(){const d=dialog(),E=env(),app=E.b==='ios-app'||E.b==='and-app';
 d.innerHTML=`<div class="life-dialog-head"><h2>📲 加到${E.mobile?'手機桌面':'電腦'}</h2><button class="quiet" id="pwaClose">關閉 ✕</button></div>
 <p class="pwa-why">從桌面打開：全螢幕、沒有網址列，一點就能接著打你的生涯；沒有網路也能玩。</p>
 ${EVT?`<button type="button" class="primary pwa-go" id="pwaGo">📲 一鍵安裝到${E.mobile?'手機':'電腦'}</button><p class="muted">或是照下面的步驟手動加入</p>`:''}
 <p class="pwa-who">${app?`你正在 ${E.app} 的內建瀏覽器裡，這裡沒辦法加到桌面`:`你用的是：${NAME[E.b]||'瀏覽器'}`}</p>
 <ol class="pwa-steps">${steps(E).map(t=>`<li>${t}</li>`).join('')}</ol>
 ${app?`<p class="pwa-copy">找不到選項的話：<button type="button" class="quiet" id="pwaCopy">複製網址</button>貼到 ${E.b==='ios-app'?'Safari':'Chrome'} 打開</p>`:''}`;
 d.showModal?d.showModal():d.setAttribute('open','');}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();EVT=e;sync();});
addEventListener('appinstalled',()=>{EVT=null;sync();});
// ---------- 入口 ----------
const SUPPORT='support.html',KOFI='https://ko-fi.com/footlife'; // 與足球人生共用同一個 Ko-fi
function sync(){const show=!standalone()&&(env().mobile||!!EVT);document.querySelectorAll('.pwa-entry').forEach(b=>{b.hidden=!show;});}
function mount(){
 const foot=document.querySelector('body>footer, main>footer, footer');
 if(foot&&!foot.querySelector('.foot-links')){const s=document.createElement('span');s.className='foot-links';s.innerHTML=` · <button type="button" class="linkish pwa-entry" hidden>📲 加到桌面</button><a class="linkish" href="${SUPPORT}" target="_blank" rel="noopener">☕ 贊助</a>`;foot.append(s);s.querySelector('.pwa-entry').onclick=open;}
 const welcome=document.querySelector('.careerwelcome');
 if(welcome&&!welcome.querySelector('.pwa-entry')){const b=document.createElement('button');b.type='button';b.className='quiet pwa-entry pwa-welcome';b.textContent='📲 加到手機桌面';b.hidden=true;b.onclick=open;welcome.append(b);}
 // 設定畫面左下角的贊助鈕（比賽中、BP 中隱藏，不擋戰場）
 let k=$('#kofiHome');if(!k){k=document.createElement('a');k.id='kofiHome';k.className='kofi-a';k.href=KOFI;k.target='_blank';k.rel='noopener';k.textContent='☕ 請作者喝杯咖啡';document.body.append(k);}
 k.hidden=!($('#setup')&&!$('#setup').hidden);
 // 生涯結局頁
 const end=$('#proNewCareer');if(end&&!document.querySelector('.kofi-end')){const a=document.createElement('a');a.className='kofi-a kofi-end';a.href=KOFI;a.target='_blank';a.rel='noopener';a.textContent='☕ 喜歡這段生涯？請作者喝杯咖啡';end.after(a);}
 sync();}
const prev=renderSetup;renderSetup=function(){const r=prev.apply(this,arguments);try{mount();}catch(e){console.warn(e);}return r;};
// 進出比賽時切換左下角贊助鈕
try{new MutationObserver(()=>{const k=$('#kofiHome'),s=$('#setup');if(k&&s)k.hidden=s.hidden;}).observe($('#setup'),{attributes:true,attributeFilter:['hidden']});}catch{}
mount();
window.PWA={open,env,get canInstall(){return !!EVT;}};
})();
