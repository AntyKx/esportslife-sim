// 電競人生 service worker（0.85）
// 首頁：先拿網路上的最新版，離線時才用快取（更新不用等）；其他檔案（js/css/圖片，網址帶 ?v= 版本號）：先用快取、背景更新。
// 贊助說明頁與 Vercel 統計不經過快取。
const C='esl-v1',CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/_vercel'))return;
  if(/\/(support|hero-preview|rank-preview)\.html$/.test(u.pathname))return;
  if(r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname)){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp));}return res;})
      .catch(()=>caches.match('./index.html').then(x=>x||caches.match('./'))));
    return;}
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})
      .catch(()=>hit||caches.match(r,{ignoreSearch:true}));
    return hit||net;}));
});
