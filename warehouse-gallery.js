'use strict';
const warehouseDialog=$('warehouseDialog'), warehouseFrame=$('warehouseFrame'), warehouseButton=$('warehouseButton');
const shelfBooks=new Map(),readFlights=new Map(),readTimes=new Map();
let bookSession='',entrance=0;
function resetBookCache(){
 shelfBooks.clear();readFlights.clear();readTimes.clear();bookSession=state.token;
}
function invalidateBook(wh){shelfBooks.delete(wh);readFlights.delete(wh)}
async function shelfBook(wh,fresh=false){
 if(!state.token)throw Error('請先登入圖庫');
 if(bookSession!==state.token)resetBookCache();
 const cached=shelfBooks.get(wh);
 if(cached&&!fresh){
  if(Date.now()-readTimes.get(wh)>30000&&!readFlights.has(wh))void shelfBook(wh,true).catch(()=>{});
  return cached;
 }
 let flight=readFlights.get(wh);
 if(!flight){
  flight=warehouseRpc('apiWarehouse',{kind:'read',warehouse:wh,since:cached?.revision}).then(result=>{
   if(result.warehouse!==wh||!Number.isInteger(result.revision))throw Error('倉庫主機版本回應異常');
   const book=result.book||(cached?.revision===result.revision&&cached.book);
   if(!book?.stock||!book.names)throw Error('倉庫主機未回傳完整架位');
   if(readFlights.get(wh)!==flight)return shelfBook(wh,true);
   const next={...result,book};shelfBooks.set(wh,next);readTimes.set(wh,Date.now());return next;
  }).finally(()=>{if(readFlights.get(wh)===flight)readFlights.delete(wh)});
  readFlights.set(wh,flight);
 }
 return flight;
}
const preload=document.createElement('section');
preload.className='warehousePreload';preload.hidden=true;
preload.innerHTML='<div role="progressbar" aria-label="載入倉庫" aria-valuemin="0" aria-valuemax="4"><strong>0/4</strong></div><p role="status"></p><button type="button" hidden>重試載入</button>';
warehouseFrame.before(preload);
const preloadStyle=document.createElement('style');
preloadStyle.textContent='.warehousePreload{flex:1;display:grid;align-content:center;justify-items:center;padding:20px;text-align:center}.warehousePreload [role=progressbar]{width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#24745e var(--percent,0%),#deebe5 0)}.warehousePreload strong{background:white;width:66px;height:66px;border-radius:50%;display:grid;place-items:center}.warehousePreload p{margin:14px 0}';
document.head.append(preloadStyle);
function preloadStatus(count,msg){
 const ring=preload.firstElementChild;
 ring.setAttribute('aria-valuenow',count);ring.style.setProperty('--percent',count*25+'%');
 ring.firstElementChild.textContent=count+'/4';preload.querySelector('p').textContent=msg;
}
const priorWarehouseLogin=updateLogin;
updateLogin=function(){
 priorWarehouseLogin();
 warehouseButton.disabled=!state.token;
 warehouseButton.title=state.token?'進入倉庫':'登入後可進入倉庫';
 if(!state.token&&warehouseDialog.open)warehouseDialog.close();
 if(bookSession!==state.token)resetBookCache();
};
updateLogin();
async function warehouseRpc(method,...args){
 if(!state.token)throw Error('請先登入圖庫');
 const session=state.token;
 try{
  const result=await rpc(method,...args,session);
  if(session!==state.token)throw Error('登入已變更，請重新開啟倉庫');
  return result;
 }catch(e){
  if(session===state.token&&/登入已到期|請先輸入編輯密碼/.test(errorText(e))){
   state.token='';sessionStorage.removeItem('hg-token');updateLogin();toast('登入已到期，請重新登入圖庫。');
  }
  throw e;
 }
}
warehouseButton.onclick=async()=>{
 if(!state.token)return;
 const ticket=++entrance;
 warehouseButton.disabled=true;warehouseFrame.hidden=true;preload.hidden=false;preload.querySelector('button').hidden=true;
 warehouseDialog.classList.remove('phoneReady');
 if(!warehouseDialog.open)warehouseDialog.showModal();
 preloadStatus(0,'正在確認登入與商品清單…');
 let count=0,failed=false;
 try{
  await warehouseRpc('apiWarehouseSession');
  if(!state.loaded)await loadCatalog();
  if(!state.loaded)throw Error('商品清單仍在讀取，請稍後再開啟倉庫。');
  if(ticket!==entrance)return;
  preloadStatus(0,'正在載入四倉架位與商品數量…');
  await Promise.all(['A','B','C','D'].map(async wh=>{
   await shelfBook(wh,true);
   if(ticket===entrance&&!failed)preloadStatus(++count,'已載入 '+count+' / 4 倉');
  }));
  if(ticket!==entrance)return;
  preload.hidden=true;warehouseFrame.hidden=false;warehouseFrame.src='warehouse.html';
 }catch(e){failed=true;if(ticket===entrance){preloadStatus(count,errorText(e));preload.querySelector('button').hidden=false}}
 finally{if(ticket===entrance)warehouseButton.disabled=!state.token}
};
preload.querySelector('button').onclick=()=>warehouseButton.onclick();
$('warehouseClose').onclick=()=>warehouseDialog.close();
warehouseDialog.addEventListener('close',()=>{entrance++;warehouseButton.disabled=!state.token;preload.hidden=true;warehouseFrame.src='about:blank'});
const warehousePhotos=new Map(),warehouseLoading=new Set();
let photoProducts=new Map();
function productsForWarehouse(){
 photoProducts=new Map(state.products.map(p=>[p.id,p]));
 return state.products.filter(p=>!p.archived).map(p=>[p.id,p.name,p.barcode||'']);
}
const updateGalleryProduct=updateProduct;
updateProduct=function(product){
 updateGalleryProduct(product);photoProducts.set(product.id,product);
 if(warehouseDialog.open)warehouseFrame.contentWindow.refreshWarehousePhotos?.();
};
function warehousePhoto(id){
 const cover=photoProducts.get(id)?.photos?.[0]?.id;
 if(!cover)return '';
 if(warehousePhotos.has(cover))return warehousePhotos.get(cover);
 if(!warehouseLoading.has(cover)){
  warehouseLoading.add(cover);
  thumb(id,cover).then(data=>{
   warehousePhotos.set(cover,data);
   if(warehousePhotos.size>180)warehousePhotos.delete(warehousePhotos.keys().next().value);
   if(warehouseDialog.open)warehouseFrame.contentWindow.refreshWarehousePhotos?.();
  }).catch(()=>setTimeout(()=>warehouseLoading.delete(cover),30000)).then(()=>{if(warehousePhotos.has(cover))warehouseLoading.delete(cover)});
 }
 return '';
}
async function warehouseScanned(id){
 if(!warehouseDialog.open||!state.token)return;
 const publishing=publishJobs.get(id);
 if(publishing&&['pending','publishing'].includes(publishing.state)&&publishing.edit.photos.length)return;
 const p=await rpc('apiProduct',id);
 if(!warehouseDialog.open||!state.token)return;
 updateProduct(p);
 if(p.photos.length)return;
 toast('這項商品尚無照片，請拍照補充。');
 await openEditor(p);
 if(state.edit?.product.id===id&&$('editor').open)await startCapture();
}
window.mobileWarehouse={
 catalog:productsForWarehouse, photo:warehousePhoto, scanned:warehouseScanned,
 request:async job=>{
  if(!warehouseDialog.open)throw Error('請從圖庫重新開啟倉庫');
  if(job.kind==='read'){
   const since=Number(job.since),result=await shelfBook(job.warehouse,since>0);
   if(since===result.revision){const {book,...meta}=result;return meta}
   return structuredClone(result);
  }
  try{return await warehouseRpc('apiWarehouse',job)}
  finally{invalidateBook(job.warehouse);void shelfBook(job.warehouse,true).catch(()=>{})}
 }
};

// One durable transfer outbox per paired gallery. The request sent on the wire is
// frozen before dispatch so an interrupted acknowledgement can be retried safely.
const outboxKey='hg-transfer-v1:'+window.HUARUI_GALLERY_CONFIG.apiUrl;
function readOutbox(){return JSON.parse(localStorage.getItem(outboxKey)||'[]')}
function editOutbox(edit){
 return navigator.locks.request(outboxKey,()=>{
  const rows=readOutbox(),result=edit(rows);
  localStorage.setItem(outboxKey,JSON.stringify(rows));return result;
 });
}
function notifyWarehouse(){
 if(warehouseDialog.open)warehouseFrame.contentWindow?.drawUploadStatus?.();
}
let sending=false,retryTimer=0;
async function stageTransfer(body,available){
 if(!state.token||!warehouseDialog.open)throw Error('請先登入並開啟倉庫');
 if(!Number.isSafeInteger(body.qty)||body.qty<1||body.qty>999999||body.qty>available)throw Error('來源架位數量不足');
 if(!Number.isInteger(body.revision)||body.revision<1||!Number.isInteger(body.sourceRevision)||body.sourceRevision<1)throw Error('請等候架位載入');
 if(body.source===body.warehouse&&body.origin===body.destination)throw Error('請選擇不同目的架位');
 await editOutbox(rows=>{
  if(rows.every(r=>r.state==='done'))rows.length=0;
  const reserved=rows.filter(r=>['queued','sending','retry'].includes(r.state)&&r.body.source===body.source&&r.body.origin===body.origin&&r.body.sku===body.sku)
   .reduce((n,r)=>n+r.body.qty,0);
  if(body.qty+reserved>available)throw Error('此商品已有待確認轉移，剩餘可排入 '+Math.max(0,available-reserved)+' 件');
  rows.push({body,state:'queued',name:photoProducts.get(body.sku)?.name||body.sku});
 });
 notifyWarehouse();void sendTransfers();
}
function advanceOwnRevision(rows,wh,rev){
 for(const row of rows){
  if(row.state!=='done')continue;
  const b=row.wire;
  if((b.source===wh&&b.sourceRevision===rev)||(b.warehouse===wh&&b.revision===rev))rev++;
 }
 return rev;
}
async function sendTransfers(){
 if(sending||!state.token||!navigator.onLine)return;
 sending=true;
 try{
  await navigator.locks.request(outboxKey+'-sender',{ifAvailable:true},async lock=>{
   if(!lock)return;
   while(state.token&&navigator.onLine){
    const job=await editOutbox(rows=>{
     const i=rows.findIndex(r=>['queued','sending','retry'].includes(r.state));if(i<0)return null;
     const r=rows[i],b=r.body;
     if(r.state==='retry'&&r.after>Date.now())return null;
     if(!r.wire){const prior=rows.slice(0,i);r.wire={...b,revision:advanceOwnRevision(prior,b.warehouse,b.revision),sourceRevision:advanceOwnRevision(prior,b.source,b.sourceRevision)}}
     r.state='sending';return r;
    });
    if(!job)return;
    notifyWarehouse();
    let message='',status='done';
    try{
     const reply=await warehouseRpc('apiWarehouse',{kind:'write',warehouse:job.wire.warehouse,body:job.wire});
     if(reply?.status!=='ok'||!Number.isInteger(reply.revision))throw Error('主機回覆未確認');
    }catch(e){
     message=errorText(e);
     status=/架位已更新|來源架位沒有該商品|登記數量不足|轉移架位或數量無效|數量過大|重複操作識別碼/.test(message)?'rejected':'retry';
    }
    await editOutbox(rows=>{
     const r=rows.find(j=>j.body.request===job.body.request);
     r.state=status;r.message=message;r.after=Date.now()+15000;
    });
    notifyWarehouse();
    if(status!=='retry'){
     for(const wh of new Set([job.body.source,job.body.warehouse])){
      invalidateBook(wh);
      if(warehouseDialog.open)void shelfBook(wh,true).catch(()=>{});
     }
     if(warehouseDialog.open)warehouseFrame.contentWindow?.transferSettled?.(job.body);
    }
    if(status==='retry')return;
   }
  });
 }catch(e){toast('手機轉移佇列無法讀寫：'+errorText(e))}
 finally{
  sending=false;clearTimeout(retryTimer);
  if(readOutbox().some(r=>['queued','sending','retry'].includes(r.state)))retryTimer=setTimeout(sendTransfers,15000);
 }
}
const galleryUploadProgress=backgroundProgress;
backgroundProgress=function(){galleryUploadProgress();notifyWarehouse()};
mobileWarehouse.stageTransfer=stageTransfer;
mobileWarehouse.progress=()=>{
 const rows=readOutbox();
 const photos=[...uploadJobs.values()].filter(j=>!j.edit.cancelled&&j.edit.photos.some(p=>p.id===j.photo.id));
 const pubs=[...publishJobs.values()].filter(j=>!j.edit.cancelled);
 const failed=rows.filter(r=>r.state==='rejected');
 const waiting=rows.find(r=>r.state==='retry');
 const photoError=[...photos,...pubs].find(j=>j.state==='error');
 const photoDone=photos.filter(j=>j.state==='done').length,done=rows.filter(r=>r.state==='done').length;
 const total=photos.length+rows.length,count=photoDone+done;
 const conflict=[...uploadDrafts.values()].find(edit=>edit.conflict&&!edit.cancelled);
 const label=failed.length||conflict?'需核對':photoError?'照片待重試':waiting?'等待重送':!navigator.onLine&&count<total?'離線暫存':
  photos.some(j=>j.state!=='done')?'照片上傳中':pubs.some(j=>j.state!=='done')?'照片確認中':
  rows.some(r=>r.state==='sending')?'轉移傳送中':rows.some(r=>r.state==='queued')?'轉移已暫存':'目前無上傳作業';
 return {label,total,count,photoDone,photos:photos.length,done,transfers:rows.length,
  retry:!!waiting||!!photoError,rows:rows.filter(r=>r.state!=='done'),photoMessage:photoError?.error||(conflict?conflict.product.name+'：照片版本有變動，請開啟商品照片核對草稿。':'')};
};
mobileWarehouse.retryTransfers=async()=>{
 await editOutbox(rows=>{for(const r of rows)if(r.state==='retry')r.after=0});
 retryBackground();void sendTransfers();
};
mobileWarehouse.dismissRejected=async id=>{
 await editOutbox(rows=>{const i=rows.findIndex(r=>r.body.request===id&&r.state==='rejected');if(i>=0)rows.splice(i,1)});
 notifyWarehouse();
};
window.addEventListener('storage',e=>{if(e.key===outboxKey)notifyWarehouse()});
window.addEventListener('online',()=>{notifyWarehouse();void sendTransfers()});
window.addEventListener('offline',notifyWarehouse);
const loginWithTransferQueue=updateLogin;
updateLogin=function(){loginWithTransferQueue();if(state.token)void sendTransfers()};
if(state.token)void sendTransfers();

