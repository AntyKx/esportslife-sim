'use strict';
// 0.40 BP：英雄標籤、克制、陣容評分，以及 2026 職業賽的選角順序（20 格、Fearless）。
// 只用 MOBA 共通概念（開戰、突進、消耗…），所有英雄與數值都是本作原創資料。
(()=>{
const CLS={坦克:'tank',鬥士:'fighter',戰士:'fighter',刺客:'assassin',法師:'mage',射手:'marksman',輔助:'support',支援:'support'};
const TRAIT={團戰:'engage',開戰:'engage',衝鋒:'engage',分推:'split',決鬥:'split',攻城:'split',推進:'split',突進:'dive',機動:'dive',連擊:'dive',控圖:'early',入侵:'early',野區:'early',支援:'enchanter',保護:'enchanter',視野:'enchanter',守護:'enchanter',增益:'enchanter',治療:'enchanter',範圍:'poke',消耗:'poke',遠程:'poke',長射程:'poke',召喚:'poke',上路:'poke',法師:'poke',爆發:'assassin',追獵:'assassin',幻術:'assassin',斬殺:'assassin',控制:'cc',控場:'cc',恐懼:'cc',後期:'scaling',刷野:'scaling',攻速:'scaling',持續:'sustain',吸血:'sustain',重裝:'sustain',變身:'sustain',反制:'tank',反傷:'tank',坦克:'tank',穿梭:'dive'};
const TAG_NAME={engage:'開戰',dive:'突進',assassin:'刺客',tank:'坦克',poke:'消耗',cc:'控場',enchanter:'保護',sustain:'持續',split:'分推',early:'前期',scaling:'後期'};
// [克制方, 被克制方]
const RULES=[['enchanter','assassin'],['engage','poke'],['poke','tank'],['dive','scaling'],['cc','dive'],['sustain','poke'],['tank','assassin'],['early','scaling']];
const RULE_TEXT={'enchanter>assassin':'保護型能擋下刺客的爆發','engage>poke':'開戰型能衝進消耗陣容','poke>tank':'消耗型能磨掉坦克','dive>scaling':'突進型能在前期壓制後期英雄','cc>dive':'控場能打斷突進','sustain>poke':'持續型不怕消耗','tank>assassin':'坦克能扛住刺客','early>scaling':'前期型能在後期英雄成形前取得優勢'};

const TAGS=ROSTER.map(h=>{
 const [c,t]=h.style.split('・'),cls=CLS[c]||'fighter',s=new Set();
 if(cls==='tank')s.add('tank');if(cls==='assassin')s.add('assassin');if(TRAIT[t])s.add(TRAIT[t]);
 const ops=[...h.kit.s.ops,...h.kit.u.ops].map(o=>o[0]);
 if(ops.some(o=>['stun','up','root','pull'].includes(o)))s.add('cc');
 if(ops.some(o=>o==='dash'||o==='blink'))s.add('dive');
 if(['ally','allies'].includes(h.kit.s.t)&&h.kit.s.ops.some(o=>['heal','shield','haste'].includes(o[0])))s.add('enchanter');
 if(['lifesteal','regen','bulk'].includes(h.kit.p[1])||ops.includes('drain'))s.add('sustain');
 if(h.kit.u.range>=240)s.add('poke');
 return {cls,tags:[...s]};
});
const isFront=i=>TAGS[i].cls==='tank'||TAGS[i].tags.includes('tank');
const hasTag=(i,t)=>TAGS[i].tags.includes(t);
function matchup(a,b){let v=0;for(const [w,l] of RULES){if(hasTag(a,w)&&hasTag(b,l))v++;if(hasTag(b,w)&&hasTag(a,l))v--;}return v;}
function reasons(a,b){const out=[];for(const [w,l] of RULES){if(hasTag(a,w)&&hasTag(b,l))out.push(RULE_TEXT[w+'>'+l]);}return out;}
// 同位置中「擅長對付」與「怕遇到」各 3 位
const COUNTERS=ROSTER.map((h,i)=>{const peers=ROSTER.map((x,j)=>j).filter(j=>j!==i&&ROSTER[j].role===h.role);const scored=peers.map(j=>({j,v:matchup(i,j)+((i*7+j*13)%10)/100}));
 return {beats:scored.filter(x=>x.v>=1).sort((a,b)=>b.v-a.v).slice(0,3).map(x=>x.j),fears:scored.filter(x=>x.v<=-1).sort((a,b)=>a.v-b.v).slice(0,3).map(x=>x.j)};});

function compScore(mine,theirs){
 let s=0;const ok=mine.filter(x=>x!=null);
 const front=ok.filter(isFront).length+ok.filter(i=>TAGS[i].cls==='fighter').length*.5;s+=front>=1?1:-1.5;
 const eng=ok.filter(i=>hasTag(i,'engage')||hasTag(i,'cc')).length;s+=eng>=3?1:eng>=1?0:-1;
 if(ok.some(i=>hasTag(i,'enchanter'))&&ok.some(i=>hasTag(i,'scaling')))s+=.5;
 for(let r=0;r<5;r++)for(let q=0;q<5;q++)if(mine[r]!=null&&theirs[q]!=null)s+=matchup(mine[r],theirs[q])*(r===q?1:.25);
 s+=ok.reduce((x,i)=>x+((heroes[i]?.power||1)-1)*10,0);
 return s;
}
// 回傳以藍方角度的陣容差：team ∈ [-1,1]（團戰 ±10%），lanes[r] ∈ [-1,1]（對線 ±8%）
function evaluate(blue,red){const d=compScore(blue,red)-compScore(red,blue);return {team:Math.max(-1,Math.min(1,d/6)),lanes:blue.map((b,r)=>Math.max(-1,Math.min(1,matchup(b,red[r])/2))),diff:d};}
function compNotes(mine){const ok=mine.filter(x=>x!=null),notes=[];if(!ok.length)return notes;
 if(!ok.some(isFront)&&ok.filter(i=>TAGS[i].cls==='fighter').length<2)notes.push(['bad','缺少前排']);else notes.push(['good','有前排']);
 const eng=ok.filter(i=>hasTag(i,'engage')||hasTag(i,'cc')).length;notes.push(eng>=3?['good','開戰與控場充足']:eng===0?['bad','缺少開戰手段']:['mid','控場普通']);
 const early=ok.filter(i=>hasTag(i,'early')).length,late=ok.filter(i=>hasTag(i,'scaling')).length;if(early>late+1)notes.push(['mid','偏前期，要早點取得優勢']);else if(late>early+1)notes.push(['mid','偏後期，前期要穩']);
 if(ok.some(i=>hasTag(i,'enchanter')))notes.push(['good','有保護型隊友']);return notes;}

// ---------- 選角順序（2026 職業賽） ----------
const ORDER=[['B','ban'],['R','ban'],['B','ban'],['R','ban'],['B','ban'],['R','ban'],['B','pick'],['R','pick'],['R','pick'],['B','pick'],['B','pick'],['R','pick'],['R','ban'],['B','ban'],['R','ban'],['B','ban'],['R','pick'],['B','pick'],['B','pick'],['R','pick']];
const BAN_PHASE=i=>i<6?1:i>=12&&i<16?2:0;
// side = {name, players:[{role,pool,rating}]}（依位置 0–4）
function create(blue,red,fearless=[]){return {step:0,bans:{B:[],R:[]},picks:{B:[null,null,null,null,null],R:[null,null,null,null,null]},fearless:[...fearless],sides:{B:blue,R:red},suggest:{},log:[]};}
function taken(d){return new Set([...d.bans.B,...d.bans.R,...d.picks.B,...d.picks.R,...d.fearless].filter(x=>x!=null&&x>=0));}
function available(d,role){const t=taken(d),ok=ROSTER.map((h,i)=>i).filter(i=>!t.has(i)&&(role==null||ROSTER[i].role===role));if(ok.length||role==null)return ok;
 // 這個位置被 Fearless 鎖光時，開放系列賽用過的英雄（禁用與本局已選仍排除）
 const hard=new Set([...d.bans.B,...d.bans.R,...d.picks.B,...d.picks.R].filter(x=>x!=null&&x>=0));return ROSTER.map((h,i)=>i).filter(i=>!hard.has(i)&&ROSTER[i].role===role);}
const roleLeft=(d,r)=>available(d,r).length;
function value(d,side,hero){const S=d.sides[side],r=ROSTER[hero].role,pl=S.players[r]||{pool:[]};const enemy=side==='B'?'R':'B';
 let v=((heroes[hero]?.power||1)-1)*40+(pl.pool.includes(hero)?6:0)+(pl.pool[0]===hero?2:0);
 const ep=d.picks[enemy];for(let q=0;q<5;q++)if(ep[q]!=null)v+=matchup(hero,ep[q])*(q===r?3:1);
 const mine=d.picks[side].filter(x=>x!=null);
 if(!mine.some(isFront)&&isFront(hero))v+=3;
 if(mine.filter(i=>hasTag(i,'engage')||hasTag(i,'cc')).length<2&&(hasTag(hero,'engage')||hasTag(hero,'cc')))v+=2;
 return v+Math.random()*2.5;}
function aiPick(d,side){const open=[0,1,2,3,4].filter(r=>d.picks[side][r]==null),pool=new Set(open.flatMap(r=>available(d,r)));let best=-1,bv=-1e9;for(let i=0;i<ROSTER.length;i++){if(!pool.has(i))continue;const v=value(d,side,i);if(v>bv){bv=v;best=i;}}return best;}
function aiBan(d,side){const enemy=side==='B'?'R':'B',open=[0,1,2,3,4].filter(r=>d.picks[enemy][r]==null&&roleLeft(d,r)>4),t=taken(d);let best=-1,bv=-1e9;for(let i=0;i<ROSTER.length;i++){if(t.has(i)||!open.includes(ROSTER[i].role))continue;const v=value(d,enemy,i);if(v>bv){bv=v;best=i;}}return best;}
function apply(d,hero){const [side,type]=ORDER[d.step];if(type==='ban')d.bans[side].push(hero);else d.picks[side][ROSTER[hero].role]=hero;d.log.push({side,type,hero});d.step++;}
// 自動推進，直到需要玩家操作。user = {side, role, trust}
// 回傳 null（完成）或 {need:'pick'|'suggest'}
const suggestKey=step=>'s'+step;
function run(d,user){
 while(d.step<ORDER.length){
  const [side,type]=ORDER[d.step];
  if(user&&side===user.side){
   if(type==='pick'){const open=[0,1,2,3,4].filter(r=>d.picks[side][r]==null),choice=aiPick(d,side);if(open.includes(user.role)&&(ROSTER[choice]?.role===user.role||open.length===1))return {need:'pick'};apply(d,choice);continue;}
   const ph=BAN_PHASE(d.step);
   // 0.54 我方每一手禁用都可以建議（之前每個禁用階段只問一次）；d.suggestOff＝本場都交給教練
   const key=suggestKey(d.step);
   if(ph&&!d.suggestOff&&d.suggest[key]===undefined)return {need:'suggest'};
   if(ph&&!d.suggestOff&&d.suggest[key]!=null&&d.suggest[key]>=0){const s=d.suggest[key];if(!taken(d).has(s)&&Math.random()<.4+user.trust/100*.6){d.log.push({note:`教練採納了你的建議：禁用 ${ROSTER[s].name}`});apply(d,s);continue;}d.log.push({note:'教練沒有採納你的建議，改用自己的判斷'});}
   apply(d,aiBan(d,side));continue;
  }
  // d.force：預先指定某方接下來的禁用（青訓對手會先禁掉你的本命英雄）
  if(type==='ban'&&d.force?.[side]?.length){const f=d.force[side].shift();if(f>=0&&!taken(d).has(f)){apply(d,f);continue;}}
  apply(d,type==='ban'?aiBan(d,side):aiPick(d,side));
 }
 return null;
}
function quick(blue,red,fearless){const d=create(blue,red,fearless);run(d,null);return {B:d.picks.B,R:d.picks.R,ev:evaluate(d.picks.B,d.picks.R)};}
// 0.80 BP 提示：這隻英雄是不是對面同位置選手的招牌（英雄池第一順位）或熟練英雄
function foeNote(d,mine,i){const S=d?.sides?.[mine==='B'?'R':'B'],r=ROSTER[i].role,pl=S?.players?.[r];if(!pl?.pool?.includes(i))return '';const who=String(pl.name||'對手'+['上路','打野','中路','射手','輔助'][r]).replace(/[&<>"']/g,''),sig=pl.pool[0]===i;return `<em class="foe${sig?' sig':''}">${sig?'★ ':''}${who} ${sig?'招牌英雄':'熟練英雄'}</em>`;}
// 0.86 BP 轉播風格：頭像與禁用列
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function face(i,cls=''){if(i==null||i<0)return `<span class="bp-face empty ${cls}"></span>`;let src='';try{src=window.HERO_PIXEL?.dataURL(i,{scale:2})||'';}catch{}return `<span class="bp-face ${cls}">${src?`<img src="${src}" alt="">`:''}</span>`;}
function banRow(d,s){const b=d.bans[s]||[];return `<div class="bp-bans" aria-label="禁用">${[0,1,2,3,4].map(k=>{const i=b[k];return i!=null?`<figure class="bp-ban${i<0?' none':''}">${face(i)}<figcaption>${i>=0?esc(ROSTER[i].name):'未禁'}</figcaption></figure>`:`<figure class="bp-ban wait">${face(null)}<figcaption>禁用 ${k+1}</figcaption></figure>`;}).join('')}</div>`;}
window.DRAFT={face,banRow,foeNote,suggestKey,TAGS,TAG_NAME,RULES,matchup,reasons,COUNTERS,evaluate,compNotes,ORDER,BAN_PHASE,create,run,apply,available,taken,aiPick,aiBan,quick,isFront};
})();
