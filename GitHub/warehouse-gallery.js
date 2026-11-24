'use strict';
const warehouseDialog=$('warehouseDialog'), warehouseFrame=$('warehouseFrame'), warehouseButton=$('warehouseButton');
const priorWarehouseLogin=updateLogin;
updateLogin=function(){
 priorWarehouseLogin();
 warehouseButton.disabled=!state.token;
 warehouseButton.title=state.token?'進入倉庫':'登入後可進入倉庫';
 if(!state.token&&warehouseDialog.open)warehouseDialog.close();
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
 warehouseButton.disabled=true;
 try{
  await warehouseRpc('apiWarehouseSession');
  if(!state.loaded)await loadCatalog();
  if(!state.loaded)throw Error('商品清單仍在讀取，請稍後再開啟倉庫。');
  warehouseDialog.showModal();
  warehouseFrame.src='warehouse.html';
 }catch(e){toast(errorText(e))}
 finally{warehouseButton.disabled=!state.token}
};
$('warehouseClose').onclick=()=>warehouseDialog.close();
warehouseDialog.addEventListener('close',()=>{warehouseFrame.src='about:blank'});
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
 request:job=>{
  if(!warehouseDialog.open)throw Error('請從圖庫重新開啟倉庫');
  return warehouseRpc('apiWarehouse',job);
 }
};

