'use strict';
// 0.57 選手看板（參考足球人生）：頂部屬性條＋下方選手卡合併成一塊。
// 桌機（≥1180px）：左側固定欄，雷達圖＋八項能力＋信任／體力／位置熟悉／擅長。
// 手機：放在頂部，平常只顯示綜合與幾個關鍵數字，點「能力」展開雷達圖與全部能力，可再收起。
// 比賽與 BP 畫面需要寬度，左欄會暫時隱藏。
(()=>{
const ROLE=['上路','打野','中路','射手','輔助'];
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stars=p=>{const n=Math.max(1,Math.min(5,Math.round((p-65)/6)));return '★'.repeat(n)+'☆'.repeat(5-n);};
const wide=matchMedia('(min-width:1180px)');
let open=false;try{open=localStorage.getItem('esports-board-open')==='1';}catch{}

// 雷達圖：實線＝目前能力，虛線＝潛力上限，金色標籤＝這個位置最看重的三項
function radar(c){const G=GROWTH,keys=G.KEYS,n=keys.length,R=58,w=G.WEIGHT[c.role],top=[...w].map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
 const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=R*Math.max(0,Math.min(100,v))/100;return (Math.cos(a)*r).toFixed(1)+','+(Math.sin(a)*r).toFixed(1);};
 let g=[25,50,75,100].map(v=>`<polygon points="${keys.map((_,i)=>pt(i,v)).join(' ')}" class="rg"/>`).join('');
 keys.forEach((_,i)=>{const [x,y]=pt(i,100).split(',');g+=`<line x1="0" y1="0" x2="${x}" y2="${y}" class="ra"/>`;});
 keys.forEach((k,i)=>{const [x,y]=pt(i,122).split(',');g+=`<text x="${x}" y="${y}" class="${top.includes(i)?'rk':'rl'}">${G.NAME[k]}</text>`;});
 g+=`<polygon points="${keys.map((_,i)=>pt(i,c.pot)).join(' ')}" class="rp"/><polygon points="${keys.map(k=>pt(keys.indexOf(k),c.stats[k])).join(' ')}" class="rv"/>`;
 return `<svg class="radar" viewBox="-86 -80 172 160" role="img" aria-label="能力雷達：${keys.map(k=>G.NAME[k]+' '+Math.round(c.stats[k])).join('、')}">${g}</svg>`;}
const meter=(name,v,cls)=>`<div class="pb-meter ${cls||''}"><span>${name}</span><i style="--v:${Math.max(0,Math.min(100,v))}%"></i><b>${Math.round(v)}</b></div>`;

function html(c){const G=GROWTH;G.ensure(c);const w=G.WEIGHT[c.role],top=[...w].map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]),ovr=G.rating(c);
 return `<div class="pb-head"><div class="pb-ovr"><b>${ovr}</b><small>綜合</small></div><div class="pb-id"><strong>${e(c.name)}</strong><small>${ROLE[c.role]} · ${c.age} 歲 · 潛力 ${stars(c.pot)} · ${G.TYPES[c.growth]}</small></div>
 <button type="button" class="pb-toggle" aria-expanded="${open}">${open?'收起':'能力'} ${open?'▴':'▾'}</button></div>
 <div class="pb-quick">${meter('教練信任',c.trust??50,'trust')}${meter('體力',c.energy??80,c.energy<30?'low':'')}${top.map(i=>meter(G.NAME[G.KEYS[i]],c.stats[G.KEYS[i]],'key')).join('')}</div>
 <div class="pb-more">${radar(c)}
 <div class="pb-attrs">${G.KEYS.map((k,i)=>meter(G.NAME[k],c.stats[k],top.includes(i)?'key':'')).join('')}</div>
 <p class="pb-note">實線＝目前，虛線＝潛力上限；金色＝${ROLE[c.role]}最看重的能力。</p>
 <div class="pb-sub"><h4>位置熟悉</h4>${ROLE.map((r,i)=>meter(r,c.roleFam[i],i===c.role?'key':'')).join('')}</div>
 <p class="pb-note">每次訓練消耗體力 ${G.cost(c)}${c.energy<30?' · <b class="bad">體力不足，比賽表現下降</b>':''}</p>
 ${window.TALENT?TALENT.boardHTML(c):""}
 <p class="pb-note">擅長：${c.styles.like.map(t=>DRAFT.TAG_NAME[t]).join('、')}型 · 不擅長：${DRAFT.TAG_NAME[c.styles.dislike]}型</p></div>`;}

let board=null,last='';
function place(){const main=document.querySelector('main'),header=document.querySelector('header.life-header');if(!board||!main||!header)return;
 if(wide.matches){if(board.parentElement!==main||main.firstElementChild!==board)main.prepend(board);}else if(board.parentElement!==header)header.append(board);}
function update(){const c=window.CAREER?.data;document.body.classList.toggle('has-board',!!c);
 if(!c){board?.remove();board=null;last='';return;}
 if(!board){board=document.createElement('aside');board.id='playerBoard';board.className='player-board';board.addEventListener('click',ev=>{if(!ev.target.closest('.pb-toggle'))return;open=!open;try{localStorage.setItem('esports-board-open',open?'1':'0');}catch{}last='';update();});}
 board.classList.toggle('full',open||wide.matches);place();
 const h=html(c);if(h!==last){last=h;board.innerHTML=h;}
 // 頂部的綜合分數改用同一個算法（之前頂部是三項平均、選手卡是位置加權，數字對不起來）
 const o=document.getElementById('lifeOverall');const v=String(GROWTH.rating(c));if(o&&o.textContent!==v)o.textContent=v;}
wide.addEventListener?.('change',()=>{last='';update();});
const prevRender=renderSetup;renderSetup=function(){const r=prevRender.apply(this,arguments);update();return r;};
const prevDraw=draw;let lastTick=0;draw=function(){const r=prevDraw.apply(this,arguments);const now=performance.now();if(now-lastTick>400){lastTick=now;update();}return r;};
window.PLAYER_BOARD={update,radar};
update();
})();
// 0.58 頂部固定「重新開始」入口：按一次變確認，3 秒內再按一次才清除存檔並回到建立角色首頁
(()=>{function ensure(){const nav=document.querySelector('.life-nav');if(!nav)return;let b=document.getElementById('lifeRestart');
 if(!b){b=document.createElement('button');b.id='lifeRestart';b.type='button';b.textContent='重新開始';let t=0;
  b.onclick=()=>{if(!b.dataset.confirm){b.dataset.confirm='1';b.textContent='確定重開？';b.classList.add('warn');clearTimeout(t);t=setTimeout(()=>{delete b.dataset.confirm;b.textContent='重新開始';b.classList.remove('warn');},3000);return;}
   try{localStorage.removeItem('nexus-life-career-v1');}catch{}location.reload();};nav.append(b);}
 b.hidden=!window.CAREER?.data;}
const prev=renderSetup;renderSetup=function(){const r=prev.apply(this,arguments);ensure();return r;};ensure();})();
