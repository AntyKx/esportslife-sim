'use strict';
// 0.88 結局分享卡（參考足球人生的分享卡）：canvas 產生圖片，可選 4:5 貼文／9:16 限時動態，分享或下載。
// 每種結局一個場景插畫，畫面上放本命英雄的像素小人。只讀資料，不改遊戲狀態。
// 開發預覽：網址加 #ending-preview 會一次列出六種結局卡。
(()=>{
const FONT="'Noto Sans TC','Microsoft JhengHei','PingFang TC',sans-serif";
const SITE='esports.bearledger.app';
const ROLE=['上路','打野','中路','射手','輔助'];
// 結局 → 場景與配色
const SCENES={
 '實況主之路':{key:'stream',bg:['#24103d','#0d0820'],acc:'#ff5fa8',tag:'#ff5fa8'},
 '回到課本':{key:'school',bg:['#2c2418','#120e08'],acc:'#ffc965',tag:'#e2a64a'},
 '網咖的傳說':{key:'cafe',bg:['#0e1a30','#05080f'],acc:'#4fd6ff',tag:'#38b8e6'},
 '夢想暫停':{key:'family',bg:['#1b2442','#0a0e1c'],acc:'#b9c8ff',tag:'#8a9be0'},
 '轉當陪練':{key:'spar',bg:['#11302b','#06120f'],acc:'#5fe0b4',tag:'#3fbf92'},
 '離開青訓':{key:'leave',bg:['#2a2340','#0c0a16'],acc:'#ffb36b',tag:'#e08a4a'},
 // 0.89 職業退役：依退役後的去向；傳奇、名人堂另有專屬場景
 '轉任教練':{key:'spar',bg:['#11302b','#06120f'],acc:'#5fe0b4',tag:'#3fbf92'},
 '成為賽評':{key:'caster',bg:['#1a1d3a','#080a18'],acc:'#7fb2ff',tag:'#4f7fe0'},
 '全職實況主':{key:'stream',bg:['#24103d','#0d0820'],acc:'#ff5fa8',tag:'#ff5fa8'},
 '離開職業舞台':{key:'farewell',bg:['#231a2c','#0b0810'],acc:'#ffb36b',tag:'#c9774a'},
 '回歸生活':{key:'farewell',bg:['#1f2433','#0a0c12'],acc:'#ffd99a',tag:'#b8925a'}
};
const TIER_SCENE={'傳奇':{key:'trophy',bg:['#2e2208','#0d0904'],acc:'#ffd36b',tag:'#d6a02e'},'名人堂':{key:'hall',bg:['#2a1f12','#0c0906'],acc:'#f0c27a',tag:'#b8863a'}};
const sceneOf=en=>(en?.kind==='pro'&&TIER_SCENE[en.tier])||SCENES[en?.path]||SCENES['網咖的傳說'];

// ---------- 小工具 ----------
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
const NOHEAD='，。、」』）！？：；…,.!?)';function wrap(x,text,maxW){const out=[];let line='';for(const ch of String(text)){const t=line+ch;if(x.measureText(t).width>maxW&&line&&!NOHEAD.includes(ch)){out.push(line);line=ch.trim()?ch:'';}else line=t;}if(line)out.push(line);return out;}
function grad(x,a,b,c,d,stops){const g=x.createLinearGradient(a,b,c,d);stops.forEach(([o,col])=>g.addColorStop(o,col));return g;}
function glow(x,col,blur,fn){x.save();x.shadowColor=col;x.shadowBlur=blur;fn();x.restore();}
function hero(x,i,cx,bottom,h){let src;if(i&&typeof i==='object'){if(!window.PLAYER_LOOK)return;src=PLAYER_LOOK.canvas(i,{scale:4});}else{const P=window.HERO_PIXEL;const HS=typeof heroes!=='undefined'?heroes:null;if(!P||i==null||!HS?.[i])return;src=P.canvas(i,{scale:4});}const s=h/src.height,w=src.width*s;x.save();x.imageSmoothingEnabled=false;x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(cx,bottom-4,w*.32,h*.05,0,0,Math.PI*2);x.fill();x.drawImage(src,Math.round(cx-w/2),Math.round(bottom-h),Math.round(w),Math.round(h));x.restore();}

// ---------- 六個場景（x,y,w,h 是插畫區） ----------
const DRAW={
 stream(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#3a1660'],[1,'#140a2a']]);x.fillRect(X,Y,W,H);
  glow(x,'#ffd6f0',60,()=>{x.strokeStyle='#ffe6f6';x.lineWidth=W*.012;x.beginPath();x.arc(X+W*.59,Y+H*.1,W*.035,0,Math.PI*2);x.stroke();});
  x.fillStyle='#2a1c3c';x.fillRect(X,Y+H*.74,W,H*.26);x.fillStyle='#3d2a55';x.fillRect(X,Y+H*.74,W,H*.025);
  const mx=X+W*.1,my=Y+H*.16,mw=W*.46,mh=H*.42;x.fillStyle='#0b0b12';rr(x,mx-8,my-8,mw+16,mh+16,14);x.fill();
  x.fillStyle=grad(x,mx,my,mx+mw,my+mh,[[0,'#5b3df5'],[1,'#ff4fa3']]);x.fillRect(mx,my,mw,mh);
  x.fillStyle='rgba(255,255,255,.18)';for(let i=0;i<5;i++)x.fillRect(mx+mw*.08,my+mh*(.3+i*.12),mw*(.3+((i*37)%40)/100),mh*.05);
  x.fillStyle='#e5484d';rr(x,mx+mw*.05,my+mh*.07,mw*.17,mh*.13,8);x.fill();x.fillStyle='#fff';x.font=`900 ${Math.round(mh*.085)}px ${FONT}`;x.textBaseline='middle';x.fillText('LIVE',mx+mw*.075,my+mh*.135);
  x.fillStyle='#0b0b12';x.fillRect(mx+mw*.45,my+mh,mw*.1,H*.08);
  const cx=X+W*.62,cy=Y+H*.14,cw=W*.3,ch=H*.5;x.fillStyle='rgba(20,10,35,.85)';rr(x,cx,cy,cw,ch,16);x.fill();
  const cols=['#ff8ac5','#8fd3ff','#ffd36b','#a3ffb0','#c9a3ff','#ff9f7a'];for(let i=0;i<6;i++){x.fillStyle=cols[i];x.fillRect(cx+cw*.08,cy+ch*(.1+i*.14),cw*.18,ch*.05);x.fillStyle='rgba(255,255,255,.55)';x.fillRect(cx+cw*.3,cy+ch*(.1+i*.14),cw*(.25+((i*29)%35)/100),ch*.05);}
  x.fillStyle='rgba(255,255,255,.75)';x.font=`700 ${Math.round(H*.04)}px ${FONT}`;x.fillText(`觀看 ${(S.viewers||1280).toLocaleString()}`,cx+cw*.08,cy+ch+H*.05);
  hero(x,hi,X+W*.33,Y+H*.97,H*.42);},
 school(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#3a2c1a'],[1,'#1c140b']]);x.fillRect(X,Y,W,H);
  const wx=X+W*.6,wy=Y+H*.1,ww=W*.3,wh=H*.4;x.fillStyle='#16203a';x.fillRect(wx,wy,ww,wh);x.fillStyle='#f7e7b0';x.beginPath();x.arc(wx+ww*.7,wy+wh*.3,ww*.1,0,Math.PI*2);x.fill();x.fillStyle='#16203a';x.beginPath();x.arc(wx+ww*.75,wy+wh*.26,ww*.09,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';for(const [a,b] of [[.2,.2],[.4,.6],[.15,.75],[.5,.35]])x.fillRect(wx+ww*a,wy+wh*b,4,4);x.strokeStyle='#5a4128';x.lineWidth=10;x.strokeRect(wx,wy,ww,wh);x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);x.stroke();
  x.fillStyle='#5a3d22';x.fillRect(X,Y+H*.7,W,H*.3);x.fillStyle='#6e4b2a';x.fillRect(X,Y+H*.7,W,H*.03);
  x.fillStyle='rgba(255,214,120,.18)';x.beginPath();x.moveTo(X+W*.2,Y+H*.24);x.lineTo(X+W*.04,Y+H*.72);x.lineTo(X+W*.5,Y+H*.72);x.closePath();x.fill();
  x.fillStyle='#2b2b2b';x.fillRect(X+W*.19,Y+H*.2,W*.02,H*.5);glow(x,'#ffd27a',40,()=>{x.fillStyle='#ffd27a';x.beginPath();x.moveTo(X+W*.14,Y+H*.26);x.lineTo(X+W*.26,Y+H*.26);x.lineTo(X+W*.22,Y+H*.17);x.lineTo(X+W*.18,Y+H*.17);x.closePath();x.fill();});
  const bk=['#c84b4b','#3f7fbf','#e0b03f','#4f9d6b','#8b5fbf'];bk.forEach((c,i)=>{x.fillStyle=c;x.fillRect(X+W*(.06+i*.005),Y+H*(.64-i*.045),W*.2,H*.045);});
  x.fillStyle='#202634';x.fillRect(X+W*.62,Y+H*.58,W*.22,H*.12);x.fillStyle='#8fb4ff';x.fillRect(X+W*.635,Y+H*.595,W*.19,H*.09);
  hero(x,hi,X+W*.45,Y+H*.97,H*.42);},
 cafe(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#0f1a33'],[1,'#060a14']]);x.fillRect(X,Y,W,H);
  for(let r=0;r<2;r++)for(let i=0;i<6;i++){const mx=X+W*(.05+i*.155),my=Y+H*(.32+r*.16),mw=W*.12,mh=H*.1;glow(x,'#3fa9ff',24,()=>{x.fillStyle=r?'#1b4c7a':'#2a6fae';x.fillRect(mx,my,mw,mh);});x.fillStyle='#0a0f1a';x.fillRect(mx+mw*.45,my+mh,mw*.1,H*.03);}
  glow(x,'#ff4fa3',50,()=>{x.fillStyle='#ff6fb5';x.font=`900 ${Math.round(H*.13)}px ${FONT}`;x.textBaseline='middle';x.textAlign='center';x.fillText('網 咖',X+W*.5,Y+H*.15);x.textAlign='left';});
  hero(x,hi,X+W*.48,Y+H*.83,H*.44);
  x.fillStyle='#3a2a20';x.fillRect(X+W*.08,Y+H*.72,W*.84,H*.28);x.fillStyle='#5a3f2c';x.fillRect(X+W*.08,Y+H*.72,W*.84,H*.04);
  x.fillStyle='#ffe08a';x.fillRect(X+W*.7,Y+H*.66,W*.08,H*.06);x.fillStyle='#202634';x.fillRect(X+W*.16,Y+H*.62,W*.12,H*.1);x.fillStyle='#5fe0b4';x.fillRect(X+W*.17,Y+H*.635,W*.1,H*.07);
},
 family(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#202a4c'],[1,'#0c1122']]);x.fillRect(X,Y,W,H);
  const wx=X+W*.08,wy=Y+H*.1,ww=W*.34,wh=H*.42;x.fillStyle='#0b1430';x.fillRect(wx,wy,ww,wh);glow(x,'#dfe8ff',50,()=>{x.fillStyle='#eef3ff';x.beginPath();x.arc(wx+ww*.65,wy+wh*.32,ww*.12,0,Math.PI*2);x.fill();});
  x.fillStyle='#fff';for(const [a,b] of [[.15,.2],[.3,.7],[.82,.75],[.45,.5],[.2,.45]])x.fillRect(wx+ww*a,wy+wh*b,4,4);x.strokeStyle='#36406a';x.lineWidth=10;x.strokeRect(wx,wy,ww,wh);
  x.fillStyle='rgba(200,215,255,.10)';x.beginPath();x.moveTo(wx,wy+wh);x.lineTo(wx+ww,wy+wh);x.lineTo(X+W*.7,Y+H);x.lineTo(X+W*.05,Y+H);x.closePath();x.fill();
  x.fillStyle='#2a3358';x.fillRect(X+W*.55,Y+H*.55,W*.4,H*.2);x.fillStyle='#d9def0';x.fillRect(X+W*.55,Y+H*.5,W*.4,H*.07);x.fillStyle='#8a96c8';x.fillRect(X+W*.57,Y+H*.46,W*.12,H*.06);
  x.fillStyle='#b98a52';x.fillRect(X+W*.1,Y+H*.72,W*.26,H*.2);x.fillStyle='#9a6f3e';x.fillRect(X+W*.1,Y+H*.72,W*.26,H*.04);x.fillStyle='#1b1e27';x.save();x.translate(X+W*.15,Y+H*.66);x.rotate(-.18);x.fillRect(0,0,W*.18,H*.06);x.fillStyle='#596080';for(let i=0;i<6;i++)x.fillRect(W*.01+i*W*.028,H*.012,W*.02,H*.02);x.restore();
  hero(x,hi,X+W*.48,Y+H*.97,H*.4);},
 spar(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#163b35'],[1,'#071512']]);x.fillRect(X,Y,W,H);
  const bx=X+W*.08,by=Y+H*.1,bw=W*.42,bh=H*.42;x.fillStyle='#e9efe9';x.fillRect(bx,by,bw,bh);x.strokeStyle='#9aa7a0';x.lineWidth=8;x.strokeRect(bx,by,bw,bh);
  x.strokeStyle='#3a8f6e';x.lineWidth=6;x.beginPath();x.moveTo(bx+bw*.1,by+bh*.85);x.lineTo(bx+bw*.1,by+bh*.15);x.lineTo(bx+bw*.9,by+bh*.15);x.moveTo(bx+bw*.1,by+bh*.85);x.lineTo(bx+bw*.9,by+bh*.85);x.lineTo(bx+bw*.9,by+bh*.15);x.moveTo(bx+bw*.1,by+bh*.85);x.lineTo(bx+bw*.9,by+bh*.15);x.stroke();
  x.fillStyle='#d24b4b';x.font=`900 ${Math.round(bh*.16)}px ${FONT}`;x.textBaseline='middle';x.fillText('×',bx+bw*.62,by+bh*.4);x.fillStyle='#2f6fd0';x.fillText('○',bx+bw*.3,by+bh*.62);
  for(let i=0;i<2;i++){const mx=X+W*(.58+i*.2),my=Y+H*.3,mw=W*.17,mh=H*.16;glow(x,'#5fe0b4',20,()=>{x.fillStyle='#1f5e4c';x.fillRect(mx,my,mw,mh);});x.fillStyle='#0a1a16';x.fillRect(mx+mw*.45,my+mh,mw*.1,H*.06);}
  x.fillStyle='#24413a';x.fillRect(X,Y+H*.72,W,H*.28);x.fillStyle='#2f5a4f';x.fillRect(X,Y+H*.72,W,H*.03);
  hero(x,hi,X+W*.5,Y+H*.97,H*.42);},
 trophy(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#1c1406'],[1,'#3a2a0c']]);x.fillRect(X,Y,W,H);
  for(const [a,b] of [[.18,-.08],[.5,0],[.82,.08]]){x.fillStyle='rgba(255,230,160,.10)';x.beginPath();x.moveTo(X+W*a-W*.03,Y);x.lineTo(X+W*a+W*.03,Y);x.lineTo(X+W*(a+b)+W*.16,Y+H*.8);x.lineTo(X+W*(a+b)-W*.16,Y+H*.8);x.closePath();x.fill();}
  x.fillStyle='#120d05';for(let i=0;i<16;i++){const h=H*(.05+((i*29)%7)/100);x.beginPath();x.arc(X+W*(i/15),Y+H*.74,W*.04,Math.PI,0);x.fill();x.fillRect(X+W*(i/15)-W*.04,Y+H*.74,W*.08,h);}
  x.fillStyle='#2a1f0c';x.fillRect(X,Y+H*.8,W,H*.2);x.fillStyle='#5a4215';x.fillRect(X,Y+H*.8,W,H*.02);
  const tx=X+W*.72,ty=Y+H*.78;x.fillStyle='#3b2c10';x.fillRect(tx-W*.09,ty-H*.1,W*.18,H*.1);x.fillStyle='#7a5a1c';x.fillRect(tx-W*.09,ty-H*.1,W*.18,H*.015);
  glow(x,'#ffd36b',60,()=>{x.fillStyle=grad(x,tx-W*.08,0,tx+W*.08,0,[[0,'#b8862a'],[.5,'#ffe9a0'],[1,'#b8862a']]);x.beginPath();x.moveTo(tx-W*.075,ty-H*.52);x.lineTo(tx+W*.075,ty-H*.52);x.quadraticCurveTo(tx+W*.07,ty-H*.3,tx+W*.015,ty-H*.25);x.lineTo(tx+W*.015,ty-H*.17);x.lineTo(tx+W*.05,ty-H*.12);x.lineTo(tx-W*.05,ty-H*.12);x.lineTo(tx-W*.015,ty-H*.17);x.lineTo(tx-W*.015,ty-H*.25);x.quadraticCurveTo(tx-W*.07,ty-H*.3,tx-W*.075,ty-H*.52);x.closePath();x.fill();});
  x.strokeStyle='#e8c060';x.lineWidth=W*.01;for(const sg of [-1,1]){x.beginPath();x.arc(tx+sg*W*.085,ty-H*.44,W*.03,sg<0?Math.PI*.5:-Math.PI*.5,sg<0?Math.PI*1.5:Math.PI*.5,false);x.stroke();}
  const cc=['#ff5f5f','#ffd36b','#5fd0ff','#8fff9f','#ff8ad8','#ffffff'];for(let i=0;i<46;i++){const a=(i*97)%100/100,b=(i*61)%80/100;x.save();x.translate(X+W*a,Y+H*b);x.rotate(i);x.fillStyle=cc[i%cc.length];x.fillRect(0,0,W*.012,H*.022);x.restore();}
  hero(x,hi,X+W*.36,Y+H*.92,H*.46);},
 hall(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#2e2214'],[1,'#140e08']]);x.fillRect(X,Y,W,H);
  x.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<10;i++)x.fillRect(X+i*W*.1,Y,W*.05,H*.76);
  for(const a of [.12,.64]){x.fillStyle='rgba(255,220,150,.08)';x.beginPath();x.moveTo(X+W*(a+.12),Y);x.lineTo(X+W*(a-.02),Y+H*.76);x.lineTo(X+W*(a+.26),Y+H*.76);x.closePath();x.fill();}
  const fx=X+W*.6,fy=Y+H*.1,fw=W*.3,fh=H*.46;glow(x,'#f0c27a',40,()=>{x.fillStyle='#c99a45';x.fillRect(fx-12,fy-12,fw+24,fh+24);});x.fillStyle='#1a1410';x.fillRect(fx,fy,fw,fh);
  const sx=fx+fw/2,sy=fy+fh*.1,s=fh*.82;x.fillStyle=S.col||'#c44';x.beginPath();x.moveTo(sx-s*.18,sy);x.lineTo(sx-s*.42,sy+s*.1);x.lineTo(sx-s*.34,sy+s*.3);x.lineTo(sx-s*.24,sy+s*.26);x.lineTo(sx-s*.24,sy+s*.95);x.lineTo(sx+s*.24,sy+s*.95);x.lineTo(sx+s*.24,sy+s*.26);x.lineTo(sx+s*.34,sy+s*.3);x.lineTo(sx+s*.42,sy+s*.1);x.lineTo(sx+s*.18,sy);x.quadraticCurveTo(sx,sy+s*.1,sx-s*.18,sy);x.fill();
  x.fillStyle='#fff';x.font=`900 ${Math.round(s*.3)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(S.no||'7',sx,sy+s*.58);
  x.fillStyle='#c99a45';rr(x,fx+fw*.1,fy+fh+H*.05,fw*.8,H*.07,6);x.fill();x.fillStyle='#2a1f12';x.font=`800 ${Math.round(H*.04)}px ${FONT}`;x.fillText('名 人 堂',fx+fw/2,fy+fh+H*.087);x.textAlign='left';
  x.fillStyle='#3a2a18';x.fillRect(X,Y+H*.76,W,H*.24);x.fillStyle='#8a2a2a';x.fillRect(X+W*.05,Y+H*.8,W*.9,H*.2);x.fillStyle='#a33a3a';x.fillRect(X+W*.05,Y+H*.8,W*.9,H*.015);
  hero(x,hi,X+W*.3,Y+H*.95,H*.46);},
 caster(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#161a36'],[1,'#080a18']]);x.fillRect(X,Y,W,H);
  const mx=X+W*.08,my=Y+H*.08,mw=W*.84,mh=H*.42;x.fillStyle='#05060c';rr(x,mx-8,my-8,mw+16,mh+16,12);x.fill();
  x.fillStyle=grad(x,mx,my,mx+mw,my+mh,[[0,'#1b3a6b'],[1,'#3a1b5a']]);x.fillRect(mx,my,mw,mh);
  x.fillStyle='#2d5a3a';x.fillRect(mx+mw*.35,my+mh*.08,mw*.3,mh*.84);
  x.strokeStyle='#8fd3ff';x.lineWidth=4;x.beginPath();x.moveTo(mx+mw*.37,my+mh*.88);x.lineTo(mx+mw*.63,my+mh*.12);x.stroke();
  x.fillStyle='#5f9dff';for(let i=0;i<5;i++)x.fillRect(mx+mw*.05,my+mh*(.12+i*.16),mw*.24,mh*.1);x.fillStyle='#ff6f6f';for(let i=0;i<5;i++)x.fillRect(mx+mw*.71,my+mh*(.12+i*.16),mw*.24,mh*.1);
  x.fillStyle='#fff';x.font=`900 ${Math.round(mh*.12)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('VS',mx+mw/2,my+mh*.5);x.textAlign='left';
  hero(x,hi,X+W*.42,Y+H*.79,H*.4);
  x.fillStyle='#1d2244';x.fillRect(X+W*.04,Y+H*.7,W*.92,H*.3);x.fillStyle='#4f7fe0';x.fillRect(X+W*.04,Y+H*.7,W*.92,H*.02);
  x.fillStyle='#e8ecff';x.font=`800 ${Math.round(H*.045)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('賽 評 席',X+W*.5,Y+H*.84);x.textAlign='left';
  for(const a of [.22,.66]){x.fillStyle='#222';x.fillRect(X+W*a,Y+H*.6,W*.01,H*.1);x.fillStyle='#444';rr(x,X+W*a-W*.012,Y+H*.55,W*.034,H*.07,10);x.fill();}
  x.fillStyle='#e8ecff';x.fillRect(X+W*.78,Y+H*.64,W*.1,H*.06);x.fillStyle='#4f7fe0';x.fillRect(X+W*.79,Y+H*.65,W*.08,H*.04);},
 farewell(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#0d0b12'],[1,'#1c1622']]);x.fillRect(X,Y,W,H);
  x.fillStyle='#17131d';for(let r=0;r<4;r++)for(let i=0;i<14;i++){x.beginPath();x.arc(X+W*(i/13)+(r%2)*W*.035,Y+H*(.14+r*.09),W*.026,Math.PI,0);x.fill();x.fillRect(X+W*(i/13)+(r%2)*W*.035-W*.026,Y+H*(.14+r*.09),W*.052,H*.05);}
  x.fillStyle='#2a2230';x.fillRect(X,Y+H*.62,W,H*.38);x.fillStyle='#3d3245';x.fillRect(X,Y+H*.62,W,H*.02);
  x.fillStyle='rgba(255,236,190,.16)';x.beginPath();x.moveTo(X+W*.46,Y);x.lineTo(X+W*.54,Y);x.lineTo(X+W*.7,Y+H*.92);x.lineTo(X+W*.3,Y+H*.92);x.closePath();x.fill();
  x.fillStyle='rgba(255,236,190,.22)';x.beginPath();x.ellipse(X+W*.5,Y+H*.92,W*.2,H*.04,0,0,Math.PI*2);x.fill();
  x.fillStyle='#4a3a2a';x.fillRect(X+W*.74,Y+H*.66,W*.1,H*.02);x.fillRect(X+W*.75,Y+H*.68,W*.012,H*.16);x.fillRect(X+W*.818,Y+H*.68,W*.012,H*.16);x.fillRect(X+W*.818,Y+H*.5,W*.012,H*.16);
  x.fillStyle=S.col||'#5a7bd6';rr(x,X+W*.745,Y+H*.53,W*.08,H*.13,6);x.fill();x.fillStyle='#fff';x.font=`900 ${Math.round(H*.05)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(S.no||'7',X+W*.785,Y+H*.595);x.textAlign='left';
  hero(x,hi,X+W*.5,Y+H*.92,H*.44);},
 leave(x,X,Y,W,H,S,hi){
  x.fillStyle=grad(x,0,Y,0,Y+H,[[0,'#1b2142'],[.7,'#3b2c4f'],[1,'#2a2033']]);x.fillRect(X,Y,W,H);
  x.fillStyle='#fff';for(const [a,b] of [[.1,.1],[.3,.18],[.55,.08],[.75,.22],[.9,.12],[.45,.3]])x.fillRect(X+W*a,Y+H*b,4,4);
  x.fillStyle='#14121f';for(let i=0;i<7;i++){const bw=W*.12,bh=H*(.18+((i*37)%25)/100);x.fillRect(X+i*W*.15,Y+H*.72-bh,bw,bh);x.fillStyle='#ffd27a';for(let k=0;k<3;k++)x.fillRect(X+i*W*.15+bw*.2+k*bw*.25,Y+H*.72-bh+bh*.2,bw*.1,bh*.08);x.fillStyle='#14121f';}
  x.fillStyle='#22202c';x.fillRect(X,Y+H*.72,W,H*.28);x.fillStyle='#e8d36b';for(let i=0;i<6;i++)x.fillRect(X+W*(.04+i*.17),Y+H*.88,W*.09,H*.015);
  x.fillStyle='rgba(255,200,120,.16)';x.beginPath();x.moveTo(X+W*.78,Y+H*.2);x.lineTo(X+W*.6,Y+H*.86);x.lineTo(X+W*.98,Y+H*.86);x.closePath();x.fill();
  x.fillStyle='#3a3a48';x.fillRect(X+W*.775,Y+H*.18,W*.012,H*.68);glow(x,'#ffc77a',40,()=>{x.fillStyle='#ffd99a';x.fillRect(X+W*.755,Y+H*.17,W*.05,H*.03);});
  x.fillStyle='#3a3a48';x.fillRect(X+W*.12,Y+H*.42,W*.01,H*.32);x.fillStyle='#2f7fd0';rr(x,X+W*.08,Y+H*.36,W*.09,H*.08,6);x.fill();x.fillStyle='#fff';x.font=`900 ${Math.round(H*.045)}px ${FONT}`;x.textBaseline='middle';x.fillText('站',X+W*.105,Y+H*.4);
  x.fillStyle='#5a7bd6';rr(x,X+W*.6,Y+H*.76,W*.07,H*.1,8);x.fill();x.fillStyle='#41599e';x.fillRect(X+W*.61,Y+H*.79,W*.05,H*.02);
  hero(x,hi,X+W*.45,Y+H*.86,H*.4);}
};

// ---------- 整張卡 ----------
function draw(en,opt={}){const P=opt.size==='916'?{W:1080,H:1920}:{W:1080,H:1350},{W,H}=P,tall=H>1500;
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),sc=sceneOf(en);
 x.fillStyle=grad(x,0,0,0,H,[[0,sc.bg[0]],[1,sc.bg[1]]]);x.fillRect(0,0,W,H);
 const M=60,top=tall?150:70;
 x.textBaseline='alphabetic';x.fillStyle='rgba(255,255,255,.7)';x.font=`700 30px ${FONT}`;x.fillText('電競人生 · 生涯結局',M,tall?100:52+8);
 x.textAlign='right';x.fillText(`${en.age} 歲`,W-M,tall?100:60);x.textAlign='left';
 const sh=tall?820:540;x.save();rr(x,M,top,W-2*M,sh,36);x.clip();DRAW[sc.key](x,M,top,W-2*M,sh,{viewers:Math.max(300,(en.fans||0)*7),no:en.no,col:en.col},en.look||en.hero);
 x.fillStyle=grad(x,0,top+sh*.6,0,top+sh,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.35)']]);x.fillRect(M,top,W-2*M,sh);x.restore();
 if(en.sig)sigBadge(x,M+22,top+22,en.sig,sc.acc);
 let y=top+sh+(tall?70:52);
 x.font=`800 32px ${FONT}`;const tw=x.measureText(en.path).width+48;x.fillStyle=sc.tag;rr(x,M,y-38,tw,54,27);x.fill();x.fillStyle='#fff';x.fillText(en.path,M+24,y-1);
 x.textAlign='right';x.textBaseline='alphabetic';if(en.score!=null){x.fillStyle=sc.acc;x.font=`900 46px ${FONT}`;x.fillText(String(en.score),W-M,y);const sw=x.measureText(String(en.score)).width;x.fillStyle='rgba(255,255,255,.6)';x.font=`600 26px ${FONT}`;x.fillText('生涯分',W-M-sw-12,y-4);}else{x.fillStyle='rgba(255,255,255,.6)';x.font=`600 28px ${FONT}`;x.fillText('平凡人生',W-M,y-4);}x.textAlign='left';
 y+=tall?100:84;if(en.tier)stamp(x,W-M-74,y+6,en.tier,en.tierCol||sc.acc,.72);x.fillStyle='#fff';x.font=`900 ${tall?80:70}px ${FONT}`;x.fillText(en.title,M,y);
 y+=tall?62:52;x.fillStyle=sc.acc;x.font=`700 32px ${FONT}`;x.fillText([en.name,en.role,en.sub].filter(Boolean).join(' · '),M,y);
 y+=tall?70:56;x.fillStyle='rgba(255,255,255,.88)';x.font=`500 ${tall?36:32}px ${FONT}`;const lines=wrap(x,en.text,W-2*M),maxL=tall?8:5,lh=tall?60:50;
 lines.slice(0,maxL).forEach((l,i)=>x.fillText(i===maxL-1&&lines.length>maxL?l.slice(0,-1)+'…':l,M,y+i*lh));
 const st=(en.stats||[]).slice(0,4),ty=H-(tall?330:228),gap=16,tw2=(W-2*M-gap*(st.length-1))/Math.max(1,st.length);
 st.forEach(([k,v],i)=>{const tx=M+i*(tw2+gap);x.fillStyle='rgba(255,255,255,.08)';rr(x,tx,ty,tw2,118,20);x.fill();x.fillStyle='rgba(255,255,255,.6)';x.font=`600 24px ${FONT}`;x.fillText(k,tx+22,ty+42);x.fillStyle='#fff';x.font=`800 40px ${FONT}`;x.fillText(String(v),tx+22,ty+94);});
 x.fillStyle='rgba(255,255,255,.55)';x.font=`600 26px ${FONT}`;x.fillText('你的電競人生，會走到哪裡？',M,H-(tall?110:56));x.textAlign='right';x.fillStyle=sc.acc;x.font=`800 26px ${FONT}`;x.fillText(SITE,W-M,H-(tall?110:56));x.textAlign='left';
 return cv;}
// 代表英雄徽章：英雄頭像＋名字＋熟練度（畫在插畫左上角）
function sigBadge(x,bx,by,sg,acc){const P=window.HERO_PIXEL;if(!P||sg.i==null)return;let src;try{src=P.canvas(sg.i,{scale:4});}catch{return;}
 x.save();x.font=`800 30px ${FONT}`;const tw=Math.max(x.measureText(sg.name).width,150),bw=118+tw+26,bh=104;
 x.fillStyle='rgba(8,8,14,.72)';rr(x,bx,by,bw,bh,22);x.fill();x.strokeStyle=acc;x.globalAlpha=.7;x.lineWidth=3;rr(x,bx,by,bw,bh,22);x.stroke();x.globalAlpha=1;
 x.fillStyle='rgba(255,255,255,.08)';rr(x,bx+10,by+10,84,84,16);x.fill();
 x.save();rr(x,bx+10,by+10,84,84,16);x.clip();x.imageSmoothingEnabled=false;const sw=src.width,sh2=src.height*.56;x.drawImage(src,0,0,sw,sh2,bx+52-60,by+12,120,120*sh2/sw);x.restore();
 x.textBaseline='alphabetic';x.fillStyle='rgba(255,255,255,.62)';x.font=`700 20px ${FONT}`;x.fillText('代表英雄',bx+108,by+36);
 x.fillStyle='#fff';x.font=`800 30px ${FONT}`;x.fillText(sg.name,bx+108,by+70);x.fillStyle=acc;x.font=`700 19px ${FONT}`;x.fillText(`熟練 ${sg.mastery}`,bx+108,by+94);x.restore();}
function stamp(x,cx,cy,t,col,k=1){x.save();x.translate(cx,cy);x.scale(k,k);x.rotate(-.18);x.globalAlpha=.94;x.strokeStyle=col;x.fillStyle='rgba(0,0,0,.5)';x.lineWidth=7;x.beginPath();x.arc(0,0,96,0,Math.PI*2);x.fill();x.stroke();x.lineWidth=2.5;x.beginPath();x.arc(0,0,82,0,Math.PI*2);x.stroke();
 x.fillStyle=col;x.textAlign='center';x.textBaseline='middle';const fs=t.length<=2?60:t.length<=3?46:38;x.font=`900 ${fs}px ${FONT}`;x.fillText(t,0,4);x.font=`700 17px ${FONT}`;x.fillText('生涯評價',0,-54);x.fillText('ESPORTS LIFE',0,58);x.restore();x.textAlign='left';x.textBaseline='alphabetic';}
const jerseyNo=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return String(1+h%99);};
function cardData(c){const S=window.SCORE,PL=window.PLAYER_LOOK,base={name:c.name||'你',role:ROLE[c.role]||'',fans:c.fans||0,hero:typeof selected==='number'?selected:null,no:jerseyNo(c.name||''),look:PL?PL.of(c):null,sig:PL?PL.signature():null};
 if(c.ending){const sc=S?S.calc(c).sc:null,t=S?.tierInfo(c,sc);return {...c.ending,...base,score:sc,tier:t?.n,tierCol:t?.col};}
 const pe=S?.proEnding(c);if(!pe)return {...base};const t=S.tierInfo(c,pe.score);return {...pe,...base,tierCol:t.col,col:`hsl(${(+base.no*37)%360} 60% 50%)`};}

// ---------- 分享對話框 ----------
let dlg=null,size='45';
function open(){const c=CAREER.data;if(!c||!cardData(c).path)return;if(!dlg){dlg=document.createElement('dialog');dlg.className='life-dialog share-dialog';document.body.append(dlg);}
 const paint=()=>{const cv=draw(cardData(c),{size});const url=cv.toDataURL('image/png');dlg.querySelector('img').src=url;dlg._cv=cv;};
 dlg.innerHTML=`<div class="life-dialog-head"><h2>分享結局卡</h2><button class="quiet" data-x>關閉</button></div><div class="share-seg"><button type="button" data-size="45">貼文 4:5</button><button type="button" data-size="916">限時動態 9:16</button></div><div class="share-img"><img alt="結局分享卡"></div><div class="share-act"><button class="primary" data-share>分享</button><button class="quiet" data-dl>下載圖片</button><button class="quiet" data-copy>複製文字</button></div><p class="muted share-status"></p>`;
 const status=t=>dlg.querySelector('.share-status').textContent=t;
 const segs=()=>dlg.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('sel',b.dataset.size===size));
 dlg.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{size=b.dataset.size;segs();paint();});segs();paint();
 const text=()=>{const en=cardData(c);return `${c.name}・${en.kind==='pro'?en.tier:en.path}（生涯分 ${en.score??'—'}）｜${en.kind==='pro'?en.path:en.title}\n${en.text}\n— 電競人生 https://${SITE}`;};
 const blob=()=>new Promise(r=>dlg._cv.toBlob(r,'image/png'));const fname=()=>`電競人生-${cardData(c).tier||cardData(c).path}.png`;
 dlg.querySelector('[data-x]').onclick=()=>dlg.close();
 dlg.querySelector('[data-dl]').onclick=async()=>{const b=await blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fname();a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);status('已下載圖片');};
 dlg.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(text());status('已複製文字');}catch{status('這個瀏覽器不能自動複製');}};
 dlg.querySelector('[data-share]').onclick=async()=>{try{const b=await blob(),file=new File([b],fname(),{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'電競人生',text:text()});return;}if(navigator.share){await navigator.share({title:'電競人生',text:text(),url:`https://${SITE}`});return;}dlg.querySelector('[data-dl]').click();status('這個瀏覽器不支援分享，已改為下載圖片');}catch(err){if(err?.name!=='AbortError')status('分享失敗，可以改用下載圖片');}};
 dlg.showModal();}
// 結局卡上加「分享結局卡」按鈕
setInterval(()=>{const card=document.querySelector('.ending-card');if(!card||card.querySelector('#endingShare'))return;const b=document.createElement('button');b.id='endingShare';b.className='quiet';b.type='button';b.textContent='📤 分享結局卡';b.onclick=open;card.querySelector('#endingRestart,#proNewCareer')?.before(b);},300);

// ---------- 開發預覽：#ending-preview ----------
function preview(){const samples=[
 {path:'實況主之路',title:'直播間的燈還亮著',age:18,name:'小明',role:'中路',fans:420,text:'18 歲的夏天，小明 沒有等到職業隊的電話。但直播間每晚都有幾百個人在等開台，聊天室刷著「中路教學什麼時候開」。小明 沒有站上職業舞台，卻找到了一群陪自己打遊戲的人。',stats:[['最高段位','晶鉑'],['排位','186 場'],['勝率','54%'],['粉絲',420]]},
 {path:'回到課本',title:'宿舍裡的高手',age:18,name:'阿哲',role:'打野',text:'阿哲 把滑鼠收進抽屜，考上了大學。偶爾在宿舍跟室友打幾場排位，大家都說：「你以前是不是有在打比賽？」阿哲 笑著說：「差一點。」',stats:[['最高段位','耀金'],['排位','142 場'],['勝率','51%'],['粉絲',60]]},
 {path:'網咖的傳說',title:'櫃台後面的那個人',age:18,name:'小鬼',role:'射手',text:'小鬼 在常去的那間網咖打工。常客都知道，櫃台那個店員排位打到過 晶鉑，有人卡關就會來請教，大家都叫 小鬼「師父」。夢想沒有實現，但 小鬼 還在這個圈子裡。',stats:[['最高段位','晶鉑'],['排位','201 場'],['勝率','53%'],['粉絲',120]]},
 {path:'夢想暫停',title:'先把書讀完',age:16,name:'凱凱',role:'上路',text:'成績單寄到家裡的那天，凱凱 的電腦被搬進了爸媽的房間。「先把書讀完，之後你想怎麼打都行。」凱凱 沒有反駁。帳號停在 霜銀，好友名單裡的人偶爾會問：那個上路怎麼不上線了？',stats:[['最高段位','霜銀'],['排位','88 場'],['勝率','49%']]},
 {path:'轉當陪練',title:'名單上沒有你的名字',age:18,name:'阿布',role:'輔助',text:'青訓賽段結束，一軍名單貼出來，上面沒有 阿布。教練說：「你很努力，只是現在的位置不多。」阿布 留在隊上當陪練，每天陪一軍的輔助對線。也許哪天，會有人看見。',stats:[['青訓出賽','6 場'],['平均評價','6.9'],['教練信任',58],['聯賽成績','未進決賽']]},
 {path:'離開青訓',title:'背包裡的隊服',age:18,name:'小林',role:'中路',text:'賽段結束後，教練把 小林 叫進辦公室，談話不到十分鐘。小林 把隊服摺好放進背包，坐上回家的車。手機裡還留著隊伍群組，偶爾會跳出一軍的比賽通知。',stats:[['青訓出賽','6 場'],['平均評價','6.1'],['教練信任',41],['聯賽成績','未進決賽']]}];
 [46,38,52,14,61,29].forEach((v,i)=>Object.assign(samples[i],{score:v,tier:'平凡人生',tierCol:'#b9c8ff'}));
 const T=window.SCORE?.TIERS||[],tc=n=>(T.find(t=>t.n===n)||{}).col,pro=(o)=>({kind:'pro',age:o.age,name:o.name,role:o.role,no:o.no,col:o.col,tier:o.tier,tierCol:tc(o.tier),title:o.tier,sub:o.sub,path:o.path,score:o.score,text:o.text,stats:o.stats});
 samples.push(
  pro({tier:'傳奇',score:1712,age:29,name:'夜嵐',role:'中路',no:'7',col:'#c33',sub:'星冠聯賽歷史上最偉大的中路',path:'成為賽評',text:'29 歲，夜嵐 宣布退役。11 個賽季、1032 局職業比賽，拿下 3 座霧河世界大賽冠軍、生涯 14 座冠軍。後來 夜嵐 坐上賽評席，用最懂選手的角度解說每一波團戰。',stats:[['生涯分',1712],['職業出賽','1032 局'],['世界冠軍',3],['效力隊伍','2 隊']]}),
  pro({tier:'名人堂',score:1104,age:27,name:'阿杰',role:'打野',no:'23',col:'#2f6fd0',sub:'龍域聯賽名人堂打野',path:'轉任教練',text:'27 歲，阿杰 宣布退役。9 個賽季、812 局職業比賽，拿下 1 座霧河世界大賽冠軍、生涯 6 座冠軍。退役後，阿杰 把多年的比賽經驗帶進教練席，開始培養下一代選手。',stats:[['生涯分',1104],['職業出賽','812 局'],['世界冠軍',1],['效力','上海星辰']]}),
  pro({tier:'明星選手',score:640,age:26,name:'小鬼',role:'射手',no:'11',col:'#7a3fbf',sub:'歐陸聯賽的明星射手',path:'成為賽評',text:'26 歲，小鬼 宣布退役。7 個賽季、590 局職業比賽，生涯 3 座冠軍。後來 小鬼 坐上賽評席，用最懂選手的角度解說每一波團戰。',stats:[['生涯分',640],['職業出賽','590 局'],['冠軍',3],['效力隊伍','3 隊']]}),
  pro({tier:'職業選手',score:318,age:25,name:'凱凱',role:'上路',no:'4',col:'#3f9d6b',sub:'穩定的職業上路',path:'全職實況主',text:'25 歲，凱凱 宣布退役。5 個賽季、402 局職業比賽，生涯 1 座冠軍。退役後 凱凱 開始全職直播，當年一路支持的粉絲，現在每天都來聊天室報到。',stats:[['生涯分',318],['職業出賽','402 局'],['冠軍',1],['效力隊伍','2 隊']]}),
  pro({tier:'職業過客',score:121,age:22,name:'阿布',role:'輔助',no:'9',col:'#d07a2f',sub:'職業舞台上的過客',path:'離開職業舞台',text:'22 歲，阿布 宣布退役。2 個賽季、96 局職業比賽，沒有拿過冠軍，但每一場都算數。那年夏天沒有隊伍提出合約，阿布 的職業生涯在這裡畫下句點。',stats:[['生涯分',121],['職業出賽','96 局'],['冠軍',0],['效力','濟州風暴']]}));
 const pool=(typeof heroes!=='undefined'?heroes:[]).map((h,i)=>i),PS=window.PLAYER_LOOK?.PRESETS||[];
 samples.forEach((en,k)=>{if(PS.length)en.look=PS[k%PS.length].l;const hi=pool[(k*13+5)%Math.max(1,pool.length)];if(hi!=null)en.sig={i:hi,name:heroes[hi].name,mastery:60+(k*7)%40};});const box=document.createElement('div');box.className='ending-preview';
 box.innerHTML=`<h2>結局分享卡預覽（開發用）</h2><div class="ep-seg"><button data-s="45" class="sel">貼文 4:5</button><button data-s="916">限時動態 9:16</button></div><div class="ep-grid"></div>`;document.body.prepend(box);
 const fill=s=>{const g=box.querySelector('.ep-grid');g.innerHTML='';samples.forEach((en,k)=>{const im=document.createElement('img');im.src=draw({...en,hero:pool[(k*13+5)%Math.max(1,pool.length)]},{size:s}).toDataURL();g.append(im);});};
 box.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{box.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('sel',x===b));fill(b.dataset.s);});fill('45');}
const tryPreview=()=>{if(location.hash==='#ending-preview'&&!document.querySelector('.ending-preview'))setTimeout(()=>{try{preview();}catch(err){console.warn(err);}},600);};tryPreview();addEventListener('hashchange',tryPreview);
window.SHARE_CARD={draw,open,SCENES};
})();
