'use strict';
const mobileScreen=matchMedia('(max-width:650px), (pointer:coarse)');
const galleryReturn=document.createElement('button');
galleryReturn.textContent='‹ 返回圖庫';
galleryReturn.onclick=()=>parent.document.getElementById('warehouseClose').click();
$('desktop').before(galleryReturn);
function arrangePhone(){
 const phone=mobileScreen.matches;
 galleryReturn.hidden=!phone;
 $('desktop').hidden=phone;$('mobile').hidden=phone;
 if(phone)setDevice('mobile');
 parent.document.getElementById('warehouseDialog').classList.toggle('phoneReady',phone);
}
arrangePhone();mobileScreen.addEventListener('change',arrangePhone);
window.addEventListener('pagehide',()=>parent.document.getElementById('warehouseDialog')?.classList.remove('phoneReady'));

const listToggle=document.createElement('button'),shelfPanel=document.createElement('section');
listToggle.type='button';listToggle.className='viewIcon';listToggle.setAttribute('aria-controls','shelfPanel');
listToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4v17m18-17v17M3 10h18M3 19h18M6 5h5v5H6zM12 13h6v6h-6z"/></svg>';
$('minus').before(listToggle);
shelfPanel.id='shelfPanel';shelfPanel.hidden=true;shelfPanel.setAttribute('aria-label','貨架分層清單');
cameraScene.after(shelfPanel);
let listBook=null,listWarehouse=null;
const visibleCards=new Set();
function refreshCard(button){
 if(hiddenCardFields.has('images'))return;
 const url=photoFor(button.dataset.product);
 if(!url||button.querySelector('img'))return;
 const img=new Image();img.draggable=false;img.alt='';img.src=url;button.prepend(img);
}
const cardObserver=new IntersectionObserver(entries=>{
 for(const entry of entries){
  if(entry.isIntersecting){visibleCards.add(entry.target);refreshCard(entry.target)}
  else visibleCards.delete(entry.target);
 }
},{root:shelfPanel});
const refreshScenePhotos=window.refreshWarehousePhotos;
window.refreshWarehousePhotos=()=>{refreshScenePhotos();for(const button of visibleCards)refreshCard(button)};
function populateShelves(){
 if(shelfPanel.hidden||(listBook===demo&&listWarehouse===m))return;
 const same=listWarehouse===m,scroll=same?shelfPanel.scrollTop:0;
 const expanded=new Set(same?[...shelfPanel.querySelectorAll('details[open]')].map(d=>d.dataset.rack):[active.o.id]);
 const racks=new Map();
 for(const c of cells){if(!racks.has(c.o.id))racks.set(c.o.id,[]);racks.get(c.o.id).push(c)}
 cardObserver.disconnect();visibleCards.clear();shelfPanel.replaceChildren();
 for(const [rack,slots] of racks){
  const section=document.createElement('details'),heading=document.createElement('summary'),body=document.createElement('div');
  section.dataset.rack=rack;heading.textContent=demo.names[rack]||slots[0].o.name;
  function fill(){
   if(!section.open||body.childElementCount)return;
   for(const c of slots.slice().sort((a,b)=>b.level-a.level||a.col-b.col)){
    const layer=document.createElement('h3'),items=document.createElement('div');
    layer.textContent=title(c).split(' · ').slice(1).join(' · ')||title(c);
    items.className='shelfItems';items.dataset.cell=c.id;
    for(const [id,item] of Object.entries(demo.stock[c.id]||{}).sort((a,b)=>a[1].pos-b[1].pos)){
     const button=document.createElement('button');
     button.dataset.product=id;button.setAttribute('aria-label',productName(id)+'，'+title(c));
     const name=hiddenCardFields.has('names')?'':productName(id);
     const details=hiddenCardFields.has('locations')?'':item.qty+' 件';
     button.textContent=[name,details].filter(Boolean).join(' · ');
     button.onclick=()=>showProduct(c,id);items.append(button);cardObserver.observe(button);
    }
    if(!items.childElementCount)items.textContent='空位';
    const add=document.createElement('button');
    add.type='button';add.className='addLayerItem';add.textContent='＋ 新增商品';
    add.setAttribute('aria-label',title(c)+' 新增商品');
    add.onclick=()=>{
     choose(c);chosen=null;pulling=false;
     if(mode==='issue')mode='move';
     openActions();
     $('shelfCards').querySelector('.addCard')?.focus({preventScroll:true});
    };
    const row=document.createElement('div');row.className='layerHeading';row.append(layer,add);
    body.append(row,items);
   }
  }
  section.append(heading,body);section.open=expanded.has(rack);section.ontoggle=fill;
  shelfPanel.append(section);fill();
 }
 listBook=demo;listWarehouse=m;shelfPanel.scrollTop=scroll;
}
function showShelves(open){
 shelfPanel.hidden=!open;view.hidden=open;foot.hidden=open;
 listToggle.setAttribute('aria-pressed',String(open));
 listToggle.title=open?'返回倉庫視圖':'顯示貨架分層清單';listToggle.setAttribute('aria-label',listToggle.title);
 if(open)populateShelves();else draw();
}
listToggle.onclick=()=>showShelves(shelfPanel.hidden);
// A quick tap uses the same info dialog as a billboard. Long holds use the same position ledger.
let listPress=null,suppressListClick=0;
shelfPanel.addEventListener('pointerdown',e=>{
 const card=e.target.closest('button[data-product]');
 if(!card||!e.isPrimary||listPress)return;
 const row=card.closest('[data-cell]'),cell=cells.find(c=>c.id===row.dataset.cell),product=card.dataset.product;
 const g=listPress={inList:true,id:e.pointerId,x:e.clientX,y:e.clientY,cell,product,width:Math.max(1,row.clientWidth),card};
 function begin(){
  if(listPress!==g||!demo.stock[cell.id]?.[product])return;
  g.held=true;clearTimeout(idlePinTimer);g.startValue=cardPosition(cell,product);
  moving={cell,product,value:g.startValue,card};press=g;shelfPanel.setPointerCapture(g.id);
  card.classList.add('positioning');
 }
 if(moving?.cell===cell&&moving.product===product){g.resumed=true;begin()}
 else{if(moving)pin();g.timer=setTimeout(begin,holdMs)}
});
shelfPanel.addEventListener('pointermove',e=>{
 const g=listPress;if(!g||e.pointerId!==g.id)return;
 const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(Math.hypot(dx,dy)>5)g.drag=true;
 if(!g.held){if(Math.hypot(dx,dy)>8){clearTimeout(g.timer);listPress=null}return}
 const t=g.startValue+dx/g.width;
 if(t<-.03||t>1.03||Math.abs(dy)>Math.max(40,g.card.offsetHeight)){
  listPress=null;g.card.classList.remove('positioning');suppressListClick=performance.now()+600;requestRelocation();return;
 }
 moving.value=Math.max(.05,Math.min(.95,t));
 g.card.style.setProperty('--position',Math.round(moving.value*100)+'%');
});
function endListPress(e){
 const g=listPress;if(!g||e.pointerId!==g.id)return;
 listPress=null;clearTimeout(g.timer);
 if(!g.held)return;
 press=null;suppressListClick=performance.now()+600;
 if(e.type==='pointerup'){if(g.resumed&&!g.drag)pin();else schedulePin()}
 else{g.card.classList.remove('positioning');moving=null;draw()}
}
for(const name of ['pointerup','pointercancel'])window.addEventListener(name,endListPress,true);
shelfPanel.addEventListener('click',e=>{
 if(performance.now()<suppressListClick){e.stopImmediatePropagation();e.preventDefault();return}
 if(moving){pin();e.stopImmediatePropagation();e.preventDefault()}
},true);
for(const button of document.querySelectorAll('[data-hide]'))button.addEventListener('click',()=>{listBook=null;populateShelves()});
const updateShelfPanel=panel;
panel=function(){updateShelfPanel();populateShelves()};
$('back').addEventListener('click',()=>{showShelves(false);listWarehouse=null});
for(const b of [$('top'),$('iso')])b.addEventListener('click',()=>showShelves(false));
showShelves(false);

// Hold the world point under the fingers steady as their midpoint, distance and angle change.
function offsetAt(x,y){
 const r=canvas.getBoundingClientRect(),u=(x-r.left-W/2)/scale,v=(r.top+H/2-y)/scale;
 const co=Math.cos(yaw),si=Math.sin(yaw),sp=Math.sin(pitch);
 return [u*co-v*sp*si,v*Math.cos(pitch),u*si+v*sp*co];
}
function depthAxis(){
 return [-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
}
function transformTouch(old,next){
 const mid=pts=>pts.length===1?pts[0]:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
 const a=mid(old),b=mid(next),before=offsetAt(a.x,a.y),center=cameraCenter();
 const focal=center.map((v,i)=>v+before[i]);
 if(old.length===2){
  const dx=old[1].x-old[0].x,dy=old[1].y-old[0].y,nx=next[1].x-next[0].x,ny=next[1].y-next[0].y;
  const gap=Math.hypot(dx,dy),newGap=Math.hypot(nx,ny);
  if(gap>5&&newGap>5){
   const cell=pickCell({clientX:a.x,clientY:a.y});
   if(cell){
    const axis=depthAxis(),anchorPoint=anchor(cell,.5);
    const distance=axis.reduce((d,v,i)=>d+v*(anchorPoint[i]-focal[i]),0);
    for(let i=0;i<3;i++)focal[i]+=axis[i]*distance;
   }
   const oldScale=scale;
   yaw+=Math.atan2(dx*ny-dy*nx,dx*nx+dy*ny);
   zoom=Math.max(.4,Math.min(4,zoom*newGap/gap*oldScale/viewScale(m.room.w,m.room.d)));
   scale=viewScale(m.room.w,m.room.d);
  }
 }
 const after=offsetAt(b.x,b.y),newCenter=cameraCenter();
 const delta=focal.map((v,i)=>v-newCenter[i]-after[i]);
 const axis=depthAxis(),depth=axis.reduce((sum,v,i)=>sum+v*delta[i],0);
 for(let i=0;i<3;i++)pan[i]+=delta[i]-depth*axis[i];
 scheduleTouchDraw();
}
let pendingFrame=0;
function scheduleTouchDraw(){
 if(!pendingFrame)pendingFrame=requestAnimationFrame(()=>{pendingFrame=0;draw()});
}
const contacts=new Map();
let candidate=null,longTimer=0,skipClickUntil=0;
function cancelTap(){clearTimeout(longTimer);candidate=null}
function takeEvent(e){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation()}
function points(){return [...contacts.values()].slice(0,2)}
function touchStart(e){
 if(e.pointerType!=='touch'||!document.body.classList.contains('compact')||!view.contains(e.target))return;
 clearTimeout(idlePinTimer);takeEvent(e);view.setPointerCapture(e.pointerId);
 const point={x:e.clientX,y:e.clientY};contacts.set(e.pointerId,point);
 if(contacts.size>1){
  cancelTap();press=null;moving=null;foot.textContent=hint;scheduleTouchDraw();return;
 }
 const tag=e.target.closest('.bill,[data-rack],[data-group],#locationAction');
 candidate={point,id:e.pointerId,tag,cell:tag?.dataset.cell,product:tag?.dataset.product,held:false,wasMoving:!!moving};
 if(candidate.product||moving){
  const cell=moving?.cell||cells.find(c=>c.id===candidate.cell),product=moving?.product||candidate.product;
  press={id:e.pointerId,cell,product,x:point.x,y:point.y,startValue:cardPosition(cell,product)};
  if(!moving)longTimer=setTimeout(()=>{
   if(!candidate||contacts.size!==1)return;
   candidate.held=true;moving={cell,product,value:press.startValue};choose(cell);foot.textContent='放開 1.5 秒自動固定，或輕點立即固定';
  },holdMs);
 }
}
function touchMove(e){
 if(!contacts.has(e.pointerId))return;
 takeEvent(e);
 const old=points(),p={x:e.clientX,y:e.clientY};
 contacts.set(e.pointerId,p);
 if(contacts.size>2)return;
 if(candidate){
  const dx=p.x-candidate.point.x,dy=p.y-candidate.point.y;
  if(Math.hypot(dx,dy)<8&&!candidate.drag)return;
  const first=!candidate.drag;candidate.drag=true;clearTimeout(longTimer);
  if(moving&&press){slide(dx,dy);return}
  press=null;if(first)old[0]=candidate.point;
 }
 transformTouch(old,points());
}
function touchEnd(e){
 if(!contacts.has(e.pointerId))return;
 takeEvent(e);contacts.delete(e.pointerId);skipClickUntil=performance.now()+600;
 const tap=candidate;cancelTap();press=null;
 if(e.type!=='pointerup'){moving=null;foot.textContent=hint;scheduleTouchDraw();return}
 if(moving&&tap&&!contacts.size){if(tap.wasMoving&&!tap.drag)pin();else schedulePin();return}
 if(!tap||tap.drag||tap.held||contacts.size)return;
 if(tap.wasMoving){pin();return}
 if(tap.product){const c=cells.find(c=>c.id===tap.cell);if(demo.stock[c.id]?.[tap.product])showProduct(c,tap.product);return}
 if(tap.tag?.id==='locationAction'){openActions();return}
 const rack=tap.tag?.dataset.rack,group=tap.tag?.dataset.group;
 const c=rack?(cells.find(c=>c.o.id===rack&&c.level===active.level)||cells.find(c=>c.o.id===rack)):group?cells.find(c=>c.id===group):pickCell(e);
 if(c)choose(c);else{inspectRack(null);focused=false;hover=null;draw()}
}
for(const [event,handler] of [['pointerdown',touchStart],['pointermove',touchMove],['pointerup',touchEnd],['pointercancel',touchEnd]]){
 window.addEventListener(event,handler,{capture:true,passive:false});
}
// Capture can change when a projected image is redrawn. End the hold on physical
// release, including Safari's final TouchEvent when no captured pointerup arrives.
window.addEventListener('touchend',e=>{
 if(e.touches.length)return;
 if(listPress?.held)endListPress({type:'pointerup',pointerId:listPress.id});
 if(contacts.size&&moving){
  contacts.clear();cancelTap();press=null;skipClickUntil=performance.now()+600;schedulePin();
 }
},{capture:true,passive:true});
for(const surface of [view,shelfPanel])surface.addEventListener('dragstart',e=>e.preventDefault());
view.addEventListener('click',e=>{if(e.detail&&performance.now()<skipClickUntil)takeEvent(e)},true);
for(const event of ['gesturestart','gesturechange','gestureend'])view.addEventListener(event,e=>e.preventDefault(),{passive:false});
foot.textContent='單指平移 · 雙指平移、縮放或旋轉 · 點商品查看';
