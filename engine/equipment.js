'use strict';
(()=>{
const ITEMS=[
 {id:'blade',name:'鍛鋼短劍',price:350,type:'attack',icon:'⚔',stats:{attack:2}},
 {id:'tome',name:'秘法書',price:350,type:'magic',icon:'✦',stats:{skill:.12}},
 {id:'cloth',name:'守衛布甲',price:300,type:'defense',icon:'◇',stats:{armor:.08}},
 {id:'stone',name:'生命晶石',price:400,type:'defense',icon:'♥',stats:{health:20}},
 {id:'boots',name:'旅者短靴',price:300,type:'move',icon:'➚',stats:{move:.06}},
 {id:'crystal',name:'回聲水晶',price:350,type:'support',icon:'❋',stats:{heal:.12,cdr:.06}},
 {id:'windblade',name:'疾風長刃',price:1400,component:'blade',type:'attack',icon:'⚔',stats:{attack:5,speed:.12}},
 {id:'staff',name:'星火法杖',price:1500,component:'tome',type:'magic',icon:'✦',stats:{skill:.28,cdr:.08}},
 {id:'guard',name:'守望鎧甲',price:1500,component:'cloth',type:'defense',icon:'◇',stats:{health:45,armor:.18}},
 {id:'spring',name:'月泉法器',price:1350,component:'crystal',type:'support',icon:'❋',stats:{heal:.30,cdr:.15}},
 {id:'greatblade',name:'破陣巨刃',price:1600,component:'blade',type:'attack',icon:'⚔',stats:{attack:8,lifesteal:.08}},
 {id:'stride',name:'疾行戰靴',price:850,component:'boots',type:'move',icon:'➚',stats:{move:.14}},
 {id:'shield',name:'光盾聖印',price:1300,component:'stone',type:'support',icon:'◈',stats:{health:25,armor:.10,heal:.12}},
 {id:'bastion',name:'不屈披風',price:1400,component:'cloth',type:'defense',icon:'◇',stats:{armor:.12,health:25}},
 {id:'crown',name:'祕星王冠',price:1700,component:'tome',type:'magic',icon:'✧',stats:{skill:.35}},
 {id:'scope',name:'追獵之眼',price:1500,component:'blade',type:'attack',icon:'◎',stats:{attack:5,speed:.18}},
 {id:'banner',name:'晨光戰旗',price:1350,component:'crystal',type:'support',icon:'⚑',stats:{health:20,heal:.18,cdr:.10}},
 {id:'orb',name:'暮光寶珠',price:1600,component:'tome',type:'magic',icon:'◉',stats:{skill:.22,armor:.12}},
 {id:'mantle',name:'靜謐斗篷',price:1350,component:'stone',type:'defense',icon:'◇',stats:{health:35,cdr:.12}},
 // 1.02 新增：小件、三種鞋子、帶特殊效果的大件
 {id:'dagger',name:'迅捷匕首',price:300,type:'attack',icon:'†',stats:{speed:.08}},
 {id:'amulet',name:'靈思護符',price:300,type:'magic',icon:'✧',stats:{cdr:.08}},
 {id:'vest',name:'荊棘背心',price:300,type:'defense',icon:'◇',stats:{armor:.05,thorns:.05}},
 {id:'swiftboots',name:'迅擊之靴',price:850,component:'boots',type:'move',icon:'➚',stats:{move:.10,speed:.08}},
 {id:'ironboots',name:'鐵衛之靴',price:850,component:'boots',type:'move',icon:'➚',stats:{move:.10,armor:.06}},
 {id:'sageboots',name:'智者之靴',price:850,component:'boots',type:'move',icon:'➚',stats:{move:.10,cdr:.08}},
 {id:'reaper',name:'收割者鐮刀',price:1450,component:'blade',type:'attack',icon:'⚔',stats:{attack:5,crit:.20}},
 {id:'tempest',name:'雷霆連弩',price:1400,component:'dagger',type:'attack',icon:'⚔',stats:{attack:3,speed:.15,crit:.12}},
 {id:'piercer',name:'碎甲重弓',price:1500,component:'dagger',type:'attack',icon:'◎',stats:{attack:4,speed:.10,pen:.20}},
 {id:'executioner',name:'斷罪戰斧',price:1500,component:'blade',type:'attack',icon:'⚔',stats:{attack:5,health:15,execute:.15}},
 {id:'inferno',name:'熾焰魔典',price:1600,component:'tome',type:'magic',icon:'✦',stats:{skill:.20,burn:.15}},
 {id:'voidwand',name:'虛空權杖',price:1550,component:'amulet',type:'magic',icon:'✦',stats:{skill:.18,pen:.25,cdr:.06}},
 {id:'hourglass',name:'時砂沙漏',price:1450,component:'amulet',type:'magic',icon:'◉',stats:{skill:.15,armor:.12,cdr:.06}},
 {id:'thornmail',name:'荊棘重鎧',price:1450,component:'vest',type:'defense',icon:'◇',stats:{armor:.14,health:20,thorns:.15}},
 {id:'aegis',name:'不滅壁壘',price:1550,component:'stone',type:'defense',icon:'◈',stats:{health:30,ward:.20}},
 {id:'warhorn',name:'戰鼓號角',price:1250,component:'amulet',type:'support',icon:'⚑',stats:{cdr:.12,heal:.15,move:.04}},
 {id:'lantern',name:'守夜燈籠',price:1300,component:'crystal',type:'support',icon:'❋',stats:{heal:.15,health:15,ward:.15}}
];
const BOOTS=['boots','stride','swiftboots','ironboots','sageboots'];
const byId=Object.fromEntries(ITEMS.map(i=>[i.id,i])),plans=[['guard','stride','greatblade','bastion','shield','windblade'],['greatblade','stride','guard','windblade','bastion','scope'],['staff','stride','crown','orb','mantle','banner'],['windblade','stride','scope','greatblade','guard','mantle'],['spring','stride','banner','shield','guard','mantle']],
 PATHS=[[plans[0],['executioner','ironboots','thornmail','guard','aegis','greatblade'],['guard','ironboots','thornmail','aegis','bastion','executioner']],
  [plans[1],['reaper','swiftboots','executioner','guard','piercer','bastion'],['greatblade','ironboots','thornmail','aegis','executioner','guard']],
  [plans[2],['inferno','sageboots','staff','voidwand','hourglass','crown'],['staff','sageboots','voidwand','crown','hourglass','aegis']],
  [plans[3],['reaper','swiftboots','tempest','piercer','executioner','aegis'],['tempest','swiftboots','reaper','piercer','windblade','hourglass']],
  [plans[4],['warhorn','sageboots','lantern','banner','aegis','thornmail'],['lantern','ironboots','shield','warhorn','spring','aegis']]],planNames={balanced:'位置推薦',damage:'輸出優先',tank:'生存優先',utility:'團隊支援'},statNames={attack:'普攻攻擊',skill:'技能傷害',health:'生命',armor:'傷害減免',heal:'治療效果',cdr:'冷卻縮減',speed:'攻擊速度',move:'移動速度',lifesteal:'普攻吸血',crit:'暴擊機率',pen:'穿透減免',thorns:'反彈傷害',execute:'對殘血英雄傷害',burn:'技能燃燒',ward:'殘血護盾'},percent=new Set(['skill','armor','heal','cdr','speed','move','lifesteal','crit','pen','thorns','execute','burn','ward']);
let reflecting=false;const bases=new WeakMap(),damageLog=new WeakMap(),casting=new WeakSet(),seenGear=new WeakMap();let held=null,filter='recommended',message='',viewState=null,lastPaint=0;
const settings=()=>{const c=CAREER.data;if(c){c.equipment||={mode:'auto',plan:'balanced'};if(!['auto','manual'].includes(c.equipment.mode))c.equipment.mode='auto';if(!planNames[c.equipment.plan])c.equipment.plan='balanced';return c.equipment;}return quickSettings;},quickSettings={mode:'auto',plan:'balanced'};
function ensure(){const s=state;if(!s||s.equipmentReady||!s.actors.every(a=>a.kind==='hero'))return;s.equipmentReady=true;for(const a of s.actors){a.gold=500;a.inventory=[];a.gear={};bases.set(a,{attack:a.attack,maxHp:a.maxHp});}s.equipmentLog=[];}
function statsText(stats){return Object.entries(stats).filter(([,v])=>v).map(([k,v])=>`${statNames[k]} +${percent.has(k)?Math.round(v*100)+'%':v}`).join(' · ');}
function apply(a){const s={attack:0,skill:0,health:0,armor:0,heal:0,cdr:0,speed:0,move:0,lifesteal:0,crit:0,pen:0,thorns:0,execute:0,burn:0,ward:0};for(const id of a.inventory)for(const [k,v]of Object.entries(byId[id].stats))s[k]+=v;for(const [k,max]of Object.entries({attack:40,health:180,skill:.9,armor:.45,heal:.8,cdr:.4,speed:.65,move:.25,lifesteal:.18,crit:.45,pen:.4,thorns:.3,execute:.3,burn:.3,ward:.3}))s[k]=Math.min(max,s[k]);const base=bases.get(a),old=a.maxHp;a.gear=s;a.attack=base.attack+s.attack;a.maxHp=base.maxHp+s.health;if(a.hp>0)a.hp=Math.max(1,Math.min(a.maxHp,a.hp+a.maxHp-old));}
function cost(a,item){return item.price-(item.component&&a.inventory.includes(item.component)?byId[item.component].price:0);}
function atShop(a){return a.dead>0||dist(a,bBase(a.team))<=75;}
function canBuy(a,item){if(!item||!state||state.done)return '本場比賽已結束';if(!atShop(a))return '回到基地或復活等待時才能購買';if(a.inventory.includes(item.id))return '已持有這件裝備';if(a.inventory.length>=6&&!(item.component&&a.inventory.includes(item.component)))return '六格已滿，請升級或出售裝備';if(a.gold<cost(a,item))return '金錢不足';return '';}
function buy(a,id){ensure();const item=byId[id],error=canBuy(a,item);if(error)return {ok:false,error};const paid=cost(a,item);a.gold-=paid;if(item.component&&a.inventory.includes(item.component))a.inventory.splice(a.inventory.indexOf(item.component),1);a.inventory.push(id);apply(a);state.equipmentLog.push({time:state.time,team:a.team,role:a.role,item:id,paid});if(a.player)log(`購入${item.name}，花費 ${paid} 金。`);return {ok:true,paid};}
function sell(a,id){ensure();if(!state||state.done||!atShop(a)||!a.inventory.includes(id))return false;a.inventory.splice(a.inventory.indexOf(id),1);a.gold+=Math.floor(byId[id].price*.7);apply(a);if(a.player)log(`出售${byId[id].name}，返還 ${Math.floor(byId[id].price*.7)} 金。`);return true;}
function pathOf(a){if(a.buildPath==null){const n=PATHS[a.role]?.length||1;a.buildPath=Math.floor(Math.random()*n);}return PATHS[a.role]?.[a.buildPath]||plans[a.role];}
function targets(a){const plan=a.player?settings().plan:'balanced';return plan==='tank'?['guard','ironboots','thornmail','aegis','bastion','shield']:plan==='utility'?['warhorn','sageboots','lantern','banner','spring','aegis']:plan==='damage'?(a.role===2||a.role===4?['inferno','sageboots','voidwand','staff','crown','hourglass']:['reaper','swiftboots','tempest','piercer','executioner','greatblade']):pathOf(a);}
function nextItem(a){if(!a.inventory.length){const first=byId[targets(a)[0]];return byId[first.component]||first;}if(!a.inventory.some(id=>BOOTS.includes(id))&&a.inventory.length<6)return byId.boots;for(const id of targets(a)){if(a.inventory.includes(id))continue;const item=byId[id];if(item.component&&!a.inventory.includes(item.component)&&a.inventory.length<6)return byId[item.component];return item;}return null;}
function autoBuy(a){for(let i=0;i<9;i++){const item=nextItem(a);if(!item||!buy(a,item.id).ok)break;}}
const beforeDamage=bDamage;bDamage=function(from,to,n){ensure();if(!state?.equipmentReady){beforeDamage(from,to,n);return;}const hp=to.hp;if(n>0&&from.kind==='hero'&&to.kind==='hero'&&hp>0){let hits=damageLog.get(to);if(!hits){hits=new Map();damageLog.set(to,hits);}hits.set(from,state.time);}const g=from.kind==='hero'?from.gear||{}:{},tg=to.kind==='hero'?to.gear||{}:{},cast=from.kind==='hero'&&casting.has(from);
 if(to.kind==='hero')n*=1-(tg.armor||0)*(1-(g.pen||0));
 if(from.kind==='hero'){if(cast)n*=1+(g.skill||0);else if(g.crit&&n>0&&!reflecting&&Math.random()<g.crit){n*=1.5;state.effects?.push({x:to.x,y:to.y-12,ttl:.8,color:'#ffd66e',label:'暴擊'});}
  if(to.kind==='hero'&&g.execute&&to.hp<to.maxHp*.35)n*=1+g.execute;
  if(cast&&g.burn&&to.kind==='hero'&&n>0&&state.burns)state.burns.push({from,to,dps:n*g.burn/3,until:state.time+3});}
 beforeDamage(from,to,n);const dealt=Math.max(0,hp-to.hp);
 if(dealt&&tg.thorns&&from.kind==='hero'&&from.team!==to.team&&!cast&&!reflecting&&bLive(from)){reflecting=true;try{bDamage(to,from,dealt*tg.thorns);}finally{reflecting=false;}}
 if(tg.ward&&to.hp>0&&to.hp<to.maxHp*.3&&!(to.wardCd>state.time)){to.shield=(to.shield||0)+to.maxHp*tg.ward;to.wardCd=state.time+60;state.effects?.push({x:to.x,y:to.y-14,ttl:1.4,color:'#9fd8ff',label:'護盾'});}
 if(dealt&&from.kind==='hero'&&!casting.has(from)&&bLive(from)&&['hero','minion','camp'].includes(to.kind))from.hp=Math.min(from.maxHp,from.hp+dealt*(from.gear?.lifesteal||0));if(hp<=0||to.hp>0)return;
 if(to.kind==='hero'){if(from.kind==='hero'&&from.team!==to.team)from.gold+=300;for(const [a,t]of damageLog.get(to)||[])if(a!==from&&a.team!==to.team&&state.time-t<=12)a.gold+=50;damageLog.delete(to);}
 else if(to.kind==='minion'&&from.kind==='hero')from.gold+=18;
 else if(to.kind==='camp'&&from.kind==='hero')from.gold+=to.type==='red'||to.type==='blue'?140:85;
 else if(['tower','inhibitor'].includes(to.kind)&&from.team<2)for(const a of state.actors.filter(a=>a.team===from.team))a.gold+=to.kind==='tower'?90:50;
};
const beforeSkill=bSkill;bSkill=function(a,target){ensure();const used=state.skillUses,allies=state.actors.filter(b=>b.team===a.team&&bLive(b)).map(b=>({a:b,hp:b.hp}));casting.add(a);try{beforeSkill(a,target);}finally{casting.delete(a);}if(state.skillUses>used){a.skillCD*=1-(a.gear?.cdr||0);for(const b of allies){const extra=Math.min(b.a.maxHp-b.a.hp,Math.max(0,b.a.hp-b.hp)*(a.gear?.heal||0));b.a.hp+=extra;if(a.player)state.personal.healing+=extra;}}};
const beforeHero=bHero;bHero=function(a,dt){ensure();const alive=bLive(a),x=a.x,y=a.y,cd=a.cd;beforeHero(a,dt);if(!alive||!bLive(a))return;if(a.rootUntil<=state.time){const bonus=a.gear?.move||0,nx=Math.max(0,Math.min(800,a.x+(a.x-x)*bonus)),ny=Math.max(0,Math.min(640,a.y+(a.y-y)*bonus));if(!window.RIFT_NAV||RIFT_NAV.walk(nx,ny)||!RIFT_NAV.walk(a.x,a.y)){a.x=nx;a.y=ny;}}if(a.cd>cd)a.cd/=1+(a.gear?.speed||0);};
const beforeObjective=bObjective;bObjective=function(o,dt,name){ensure();const count=state.history.length;beforeObjective(o,dt,name);for(const e of state.history.slice(count).filter(e=>e.kind==='objective'))for(const a of state.actors.filter(a=>a.team===e.team))a.gold+=e.name==='裂隙蟲群'?24:100;};
const beforeTick=tick;tick=function(dt){ensure();const s=state;if(!s||!s.equipmentReady){beforeTick(dt);return;}if(s.done||s.paused||s.decision)return;const elapsed=s.time;beforeTick(dt);const passive=Math.max(0,s.time-Math.max(65,elapsed))*2;for(const a of s.actors){a.gold+=passive;const automatic=!a.player||settings().mode==='auto';if(automatic&&atShop(a)&&!s.done)autoBuy(a);else if(automatic&&bLive(a)&&!s.order&&s.time>120){const item=nextItem(a);if(item&&a.gold>=Math.max(800,cost(a,item))&&!s.actors.some(b=>b.team!==a.team&&bLive(b)&&dist(a,b)<160))a.recalling=true;}}};
Object.assign(window.ESPORTS,{tick,bDamage,bSkill,bHero,bObjective});
const shop=document.createElement('dialog');shop.id='equipmentShop';shop.className='life-dialog equipment-shop';shop.innerHTML='<div class="life-dialog-head"><div><small class="eyebrow">裝備商店</small><h2>為下一波交戰做準備</h2></div><button id="closeShop" class="quiet">關閉 ×</button></div><div id="shopBody"></div>';document.body.append(shop);document.querySelector('#closeShop').onclick=()=>shop.close();shop.addEventListener('close',()=>{if(held&&state===held.state&&!state.done)state.paused=held.paused;held=null;});
function open(){ensure();if(!state?.equipmentReady)return;if(shop.open){paintShop();return;}held={state,paused:state.paused};state.paused=true;message='';paintShop();shop.showModal();}
const icon=i=>`<span class="item-icon item-${i.type}">${window.PX?.has(i.id)?PX.html(i.id):i.icon}</span>`;
function slots(a,interactive=false){return Array.from({length:6},(_,n)=>{const item=byId[a.inventory[n]];return item?`<${interactive?'button':'div'} class="gear-slot" ${interactive?`data-sell="${item.id}" title="出售：返還 ${Math.floor(item.price*.7)} 金"`:''}>${icon(item)}<small>${item.name}</small></${interactive?'button':'div'}>`:'<div class="gear-slot empty"><span>＋</span><small>空裝備格</small></div>';}).join('');}
function paintShop(){const a=state?.actors.find(a=>a.player);if(!a)return;const config=settings(),recommended=new Set(targets(a).flatMap(id=>[id,byId[id].component]).filter(Boolean)),items=ITEMS.filter(i=>filter==='all'||filter==='recommended'?filter==='all'||recommended.has(i.id):i.type===filter);document.querySelector('#shopBody').innerHTML=`<div class="shop-wallet"><strong>${Math.floor(a.gold)} <small>金</small></strong><span>${atShop(a)?'基地商店開放':'回到基地或等待復活後可購買'}</span></div><div class="gear-mode"><button data-mode="auto" class="${config.mode==='auto'?'selected':''}">自動回城出裝</button><button data-mode="manual" class="${config.mode==='manual'?'selected':''}">手動購買</button></div><div class="gear-slots">${slots(a,true)}</div><p class="muted">點擊已持有裝備可出售，返還原價 70%。升級會消耗對應小件，只支付差額。</p><div class="shop-summary">${statsText(a.gear)||'選擇第一件裝備，準備出發。'}</div>${message?`<p class="shop-message">${esc(message)}</p>`:''}${!atShop(a)&&bLive(a)?'<button id="recallForShop" class="secondary">回到基地購買 →</button>':''}<div class="shop-filters">${[['recommended','推薦'],['attack','攻擊'],['magic','法術'],['defense','防禦'],['support','輔助'],['move','移動'],['all','全部']].map(([k,n])=>`<button data-filter="${k}" class="${filter===k?'selected':''}">${n}</button>`).join('')}</div><div class="shop-items">${items.map(i=>`<article>${icon(i)}<div><strong>${i.name}</strong><p>${statsText(i.stats)}</p>${i.component?`<small>由${byId[i.component].name}升級</small>`:''}</div><button data-buy="${i.id}" ${canBuy(a,i)?'disabled':''}>${a.inventory.includes(i.id)?'已持有':cost(a,i)+' 金'}</button></article>`).join('')}</div>`;
 document.querySelectorAll('#shopBody [data-buy]').forEach(b=>b.onclick=()=>{const result=buy(a,b.dataset.buy);message=result.ok?`已購入${byId[b.dataset.buy].name}。`:result.error;paintShop();});document.querySelectorAll('#shopBody [data-sell]').forEach(b=>b.onclick=()=>{message=sell(a,b.dataset.sell)?'已出售裝備。':'回到基地後才能出售。';paintShop();});document.querySelectorAll('#shopBody [data-mode]').forEach(b=>b.onclick=()=>{config.mode=b.dataset.mode;if(CAREER.data)CAREER.save();paintShop();});document.querySelectorAll('#shopBody [data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;paintShop();});const recall=document.querySelector('#recallForShop');if(recall)recall.onclick=()=>{a.recalling=true;shop.close();};}
let gearPanel=document.createElement('div');gearPanel.id='equippedItems';document.querySelector('.overview-bar').after(gearPanel);function updatePanel(){const s=state;if(!s?.equipmentReady)return;const a=s.actors.find(a=>a.player);gearPanel.innerHTML=`<div class="gear-panel-head"><strong>本場裝備 <small>${Math.floor(a.gold)} 金</small></strong><button class="quiet" id="openGearPanel">裝備商店</button></div><div class="gear-slots">${slots(a)}</div><p class="muted">${settings().mode==='auto'?'自動出裝 · '+planNames[settings().plan]:'手動出裝'} · ${atShop(a)?'目前可以購買':'回基地後可購買'}</p>`;document.querySelector('#openGearPanel').onclick=open;for(const a of s.actors){if(!a.team||bVisible(a))seenGear.set(a,[...a.inventory]);const b=document.querySelector(`[data-actor="${s.actors.indexOf(a)}"]`);if(b){let label=b.querySelector('.gear-count');if(!label){label=document.createElement('small');label.className='gear-count';b.querySelector('div').append(label);}const known=seenGear.get(a);label.textContent=known?`裝備 ${known.length}/6`:'裝備未偵察';}}}
const shopButton=document.createElement('button');shopButton.id='openEquipment';shopButton.className='quiet';shopButton.textContent='裝備';shopButton.onclick=open;document.querySelector('.maptools>div').append(shopButton);
function planner(){document.querySelector('.equipment-planner')?.remove();if(true)return;// 1.16 出裝移到 BP 頁面
const config=settings(),node=document.createElement('section');node.className='equipment-planner';node.innerHTML=`<h3>本場出裝</h3><p class="muted">回基地時依策略購買，裝備與金錢每場重新開始。</p><div class="build-plans">${Object.entries(planNames).map(([id,name])=>`<button data-plan="${id}" class="${config.plan===id?'selected':''}">${name}</button>`).join('')}</div>`;document.querySelector('#start').before(node);node.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{config.plan=b.dataset.plan;CAREER.save();planner();});}
const beforeRender=renderSetup;renderSetup=function(){const result=beforeRender();planner();return result;};
const beforeDraw=draw;draw=function(){ensure();beforeDraw();const now=performance.now();if(state&&(viewState!==state||now-lastPaint>700)){viewState=state;lastPaint=now;updatePanel();}};planner();
window.EQUIPMENT={ITEMS,ensure,buy,sell,atShop,cost,apply,settings,open,shop,statsText,targets};
})();
