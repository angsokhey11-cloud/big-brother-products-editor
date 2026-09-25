
/* BIG BROTHER — Product Selling Units Editor V1 */
(function(){
'use strict';

const $=id=>document.getElementById(id);
const clean=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};

let data=null;
let editingId=0;
let loadingCode='';
let loadedCode='';
let watchTimer=null;

function notify(message,error=false){
  try{
    if(typeof toast==='function'){toast(message,error);return;}
  }catch(_){}
  let el=$('bbSellingUnitToast');
  if(!el){
    el=document.createElement('div');
    el.id='bbSellingUnitToast';
    el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:999999;background:#17457a;color:#fff;padding:10px 14px;border-radius:10px;font:800 11px Arial;box-shadow:0 8px 25px rgba(0,0,0,.18)';
    document.body.appendChild(el);
  }
  el.style.background=error?'#b42318':'#17457a';
  el.textContent=message;
  el.hidden=false;
  clearTimeout(notify._t);
  notify._t=setTimeout(()=>el.hidden=true,2600);
}

function ensureStyle(){
  if($('bbSellingUnitStyle'))return;
  const s=document.createElement('style');
  s.id='bbSellingUnitStyle';
  s.textContent=[
    '#bbSellingUnitSection .bb-su-note{margin:0 0 12px;padding:10px 12px;border-radius:9px;background:#eef6ff;color:#47627f;font-size:11px;font-weight:700;line-height:1.45}',
    '#bbSellingUnitSection .bb-su-form{display:grid;grid-template-columns:1.35fr 1fr 1fr 1fr auto;gap:9px;align-items:end;padding:12px;border:1px solid #dce7f3;border-radius:10px;background:#fbfdff;margin-bottom:12px}',
    '#bbSellingUnitSection .bb-su-field label{display:block;margin-bottom:5px;color:#53677d;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.3px}',
    '#bbSellingUnitSection .bb-su-field input,#bbSellingUnitSection .bb-su-field select{width:100%;min-height:38px;border:1px solid #cfdbea;border-radius:8px;padding:7px 9px;background:#fff;color:#243b58;font:700 11px Arial;box-sizing:border-box}',
    '#bbSellingUnitSection .bb-su-actions{display:flex;gap:6px}',
    '#bbSellingUnitSection .bb-su-save,#bbSellingUnitSection .bb-su-cancel{min-height:38px;border:0;border-radius:8px;padding:0 12px;font:900 10px Arial;cursor:pointer}',
    '#bbSellingUnitSection .bb-su-save{background:#245fae;color:#fff}',
    '#bbSellingUnitSection .bb-su-cancel{background:#e8eef5;color:#36516f}',
    '#bbSellingUnitSection .bb-su-row-btn{border:0;border-radius:7px;padding:6px 9px;margin-right:4px;font:900 9px Arial;cursor:pointer}',
    '#bbSellingUnitSection .bb-su-edit{background:#eaf3ff;color:#245fae}',
    '#bbSellingUnitSection .bb-su-remove{background:#fff0ee;color:#b42318}',
    '#bbSellingUnitSection .bb-su-scope{font-size:9px;font-weight:900}',
    '#bbSellingUnitSection .bb-su-convert{font-weight:900;color:#17457a}',
    '#bbSellingUnitSection .bb-su-empty{text-align:center;padding:20px;color:#7a8ba0;font-size:11px;font-weight:700}',
    '@media(max-width:900px){#bbSellingUnitSection .bb-su-form{grid-template-columns:1fr 1fr}#bbSellingUnitSection .bb-su-actions{grid-column:1/-1}#bbSellingUnitSection .bb-su-save,#bbSellingUnitSection .bb-su-cancel{flex:1}}',
    '@media(max-width:600px){#bbSellingUnitSection .bb-su-form{grid-template-columns:1fr}#bbSellingUnitSection .bb-su-actions{grid-column:auto}#bbSellingUnitSection .table-wrap{overflow-x:auto}#bbSellingUnitSection table{min-width:650px}}'
  ].join('');
  document.head.appendChild(s);
}

function ensureSection(){
  let section=$('bbSellingUnitSection');
  if(section)return section;

  const card=$('productDetailCard');
  if(!card)return null;

  const sections=card.querySelectorAll(':scope > .section');
  if(!sections.length)return null;

  section=document.createElement('div');
  section.className='section';
  section.id='bbSellingUnitSection';
  section.innerHTML=
    '<div class="section-title">'+
      '<span>Product Selling Units</span>'+
      '<span class="badge blue" id="bbSellingUnitCount">0 Units</span>'+
    '</div>'+
    '<div class="bb-su-note">Stock stays in the product\'s base unit. Add custom selling units such as Box, Batch, Tray, Pack or Case and define how many base units each one contains.</div>'+
    '<div class="bb-su-form" id="bbSellingUnitForm">'+
      '<div class="bb-su-field"><label>Apply To</label><select id="bbSellingUnitTarget"></select></div>'+
      '<div class="bb-su-field"><label>Selling Unit Name</label><input id="bbSellingUnitName" placeholder="e.g. Box, Batch, Tray"></div>'+
      '<div class="bb-su-field"><label>Contains</label><input id="bbSellingUnitQty" type="number" min="0.000001" step="0.000001" inputmode="decimal" placeholder="12"></div>'+
      '<div class="bb-su-field"><label>Base Unit</label><input id="bbSellingUnitBase" readonly></div>'+
      '<div class="bb-su-actions"><button type="button" class="bb-su-save" id="bbSellingUnitSave">Add Unit</button><button type="button" class="bb-su-cancel" id="bbSellingUnitCancel" hidden>Cancel</button></div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 8px">'+
      '<strong style="font-size:11px;color:#173f77">Existing Selling Units</strong>'+
      '<button type="button" class="bb-su-row-btn bb-su-edit" id="bbSellingUnitRefresh">Refresh</button>'+
    '</div>'+
    '<div class="table-wrap"><table><thead><tr><th>Apply To</th><th>Selling Unit</th><th>Conversion</th><th>Status</th><th>Action</th></tr></thead><tbody id="bbSellingUnitBody"><tr><td colspan="5" class="bb-su-empty">Select a product to load selling units.</td></tr></tbody></table></div>';

  sections[0].insertAdjacentElement('afterend',section);

  $('bbSellingUnitTarget').addEventListener('change',syncBaseUnit);
  $('bbSellingUnitSave').addEventListener('click',saveUnit);
  $('bbSellingUnitCancel').addEventListener('click',resetForm);
  $('bbSellingUnitRefresh').addEventListener('click',()=>load(clean($('dCode')?.value),true));

  return section;
}

function fallbackProduct(){
  return {
    productCode:clean(data?.product?.productCode||$('dCode')?.value),
    productName:clean(data?.product?.productName||$('dName')?.value||$('detailTitle')?.textContent||'Selected Product'),
    baseUnit:clean(data?.product?.baseUnit||$('dUnit')?.value||'Unit')
  };
}

function targetOptions(){
  const product=fallbackProduct();
  const groups=Array.isArray(data?.groups)?data.groups:[];
  const list=[];
  if(product.productCode){
    list.push({
      value:'PRODUCT|'+product.productCode,
      label:(product.productName||product.productCode)+' (This Product)',
      baseUnit:product.baseUnit||'Unit'
    });
  }
  groups.forEach(g=>{
    if(!clean(g.groupCode))return;
    list.push({
      value:'GROUP|'+clean(g.groupCode),
      label:(clean(g.groupName)||clean(g.groupCode))+' (Product Group)',
      baseUnit:product.baseUnit||'Unit'
    });
  });
  return list;
}

function populateTarget(){
  const select=$('bbSellingUnitTarget');
  if(!select)return;
  const current=select.value;
  const options=targetOptions();
  select.innerHTML=options.length
    ?options.map(x=>'<option value="'+esc(x.value)+'">'+esc(x.label)+'</option>').join('')
    :'<option value="">Select a product first</option>';
  if(options.some(x=>x.value===current))select.value=current;
  syncBaseUnit();
}

function syncBaseUnit(){
  const select=$('bbSellingUnitTarget');
  const current=targetOptions().find(x=>x.value===select?.value);
  if($('bbSellingUnitBase'))$('bbSellingUnitBase').value=current?.baseUnit||fallbackProduct().baseUnit||'Unit';
}

function fmt(v){
  const n=num(v);
  if(Number.isInteger(n))return String(n);
  return String(Number(n.toFixed(6)));
}

function render(){
  ensureSection();
  populateTarget();

  const units=Array.isArray(data?.units)?data.units:[];
  $('bbSellingUnitCount').textContent=units.filter(x=>x.active!==false).length+' Active';

  const body=$('bbSellingUnitBody');
  if(!body)return;

  if(!units.length){
    body.innerHTML='<tr><td colspan="5" class="bb-su-empty">No custom selling units yet.</td></tr>';
    return;
  }

  body.innerHTML=units.map(item=>{
    const active=item.active!==false;
    return '<tr>'+
      '<td><span class="bb-su-scope">'+esc(item.targetType==='GROUP'?'GROUP':'PRODUCT')+'</span><br><small>'+esc(item.targetName||item.targetCode||'—')+'</small></td>'+
      '<td><strong>'+esc(item.sellingUnitName||'—')+'</strong></td>'+
      '<td class="bb-su-convert">1 '+esc(item.sellingUnitName||'Unit')+' = '+esc(fmt(item.baseQty))+' '+esc(item.baseUnitName||'Unit')+'</td>'+
      '<td>'+(active?'<span class="badge green">Active</span>':'<span class="badge red">Inactive</span>')+'</td>'+
      '<td><button type="button" class="bb-su-row-btn bb-su-edit" data-edit="'+(Number(item.sellingUnitId)||0)+'">Edit</button>'+
      (active?'<button type="button" class="bb-su-row-btn bb-su-remove" data-remove="'+(Number(item.sellingUnitId)||0)+'">Remove</button>':'')+
      '</td>'+
    '</tr>';
  }).join('');

  body.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>editUnit(Number(btn.dataset.edit)));
  body.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>removeUnit(Number(btn.dataset.remove)));
}

function resetForm(){
  editingId=0;
  if($('bbSellingUnitName'))$('bbSellingUnitName').value='';
  if($('bbSellingUnitQty'))$('bbSellingUnitQty').value='';
  if($('bbSellingUnitSave'))$('bbSellingUnitSave').textContent='Add Unit';
  if($('bbSellingUnitCancel'))$('bbSellingUnitCancel').hidden=true;
  populateTarget();
}

function editUnit(id){
  const item=(data?.units||[]).find(x=>Number(x.sellingUnitId)===Number(id));
  if(!item)return;
  editingId=Number(id);
  const target=item.targetType+'|'+item.targetCode;
  if([...$('bbSellingUnitTarget').options].some(x=>x.value===target))$('bbSellingUnitTarget').value=target;
  $('bbSellingUnitName').value=clean(item.sellingUnitName);
  $('bbSellingUnitQty').value=fmt(item.baseQty);
  $('bbSellingUnitBase').value=clean(item.baseUnitName)||clean(data?.product?.baseUnit)||'Unit';
  $('bbSellingUnitSave').textContent='Save Unit';
  $('bbSellingUnitCancel').hidden=false;
  $('bbSellingUnitName').focus();
}

async function load(productCode,force=false){
  const code=clean(productCode||$('dCode')?.value);
  ensureSection();
  populateTarget();

  if(!code){
    const body=$('bbSellingUnitBody');
    if(body)body.innerHTML='<tr><td colspan="5" class="bb-su-empty">Select a product to load selling units.</td></tr>';
    return false;
  }

  if(!force && loadedCode===code && data?.product?.productCode===code){
    render();
    return true;
  }
  if(loadingCode===code)return false;
  loadingCode=code;

  const body=$('bbSellingUnitBody');
  if(body)body.innerHTML='<tr><td colspan="5" class="bb-su-empty">Loading existing selling units…</td></tr>';

  try{
    if(!window.BBProductsAdapter?.apiGet){
      throw new Error('Products Editor database adapter is not ready.');
    }

    const result=await window.BBProductsAdapter.apiGet('productSellingUnitDetail',{productCode:code});
    if(clean($('dCode')?.value)!==code)return false;

    data=result||{};
    loadedCode=code;
    render();
    resetForm();
    return true;
  }catch(error){
    data={
      product:{
        productCode:code,
        productName:clean($('dName')?.value||$('detailTitle')?.textContent||code),
        baseUnit:clean($('dUnit')?.value||'Unit')
      },
      groups:[],
      units:[]
    };
    populateTarget();
    const message=clean(error?.message||error)||'Unknown database error';
    if(body)body.innerHTML='<tr><td colspan="5" class="bb-su-empty">Could not load existing setup: '+esc(message)+'</td></tr>';
    notify(message,true);
    return false;
  }finally{
    if(loadingCode===code)loadingCode='';
  }
}

async function saveUnit(){
  const code=clean($('dCode')?.value);
  if(!code)return notify('Please open a Product first.',true);

  if(!data || clean(data?.product?.productCode)!==code){
    const ready=await load(code,true);
    if(!ready)return;
  }

  const target=clean($('bbSellingUnitTarget')?.value).split('|');
  const name=clean($('bbSellingUnitName')?.value);
  const qty=num($('bbSellingUnitQty')?.value);
  const base=clean($('bbSellingUnitBase')?.value)||'Unit';

  if(target.length<2||!target[1])return notify('Please choose where this selling unit applies.',true);
  if(!name)return notify('Selling Unit Name is required.',true);
  if(!(qty>0))return notify('Conversion quantity must be greater than zero.',true);

  const btn=$('bbSellingUnitSave');
  btn.disabled=true;
  const oldText=btn.textContent;
  btn.textContent='Saving…';

  try{
    await window.BBProductsAdapter.apiPost('saveProductSellingUnit',{
      sellingUnitId:editingId||null,
      targetType:target[0],
      targetCode:target.slice(1).join('|'),
      sellingUnitName:name,
      baseUnitName:base,
      baseQty:qty,
      sortOrder:10,
      active:true
    });
    notify(editingId?'Selling unit updated.':'Selling unit added.');
    loadedCode='';
    await load(clean($('dCode')?.value),true);
  }catch(error){
    notify(error?.message||error,true);
  }finally{
    btn.disabled=false;
    btn.textContent=oldText;
  }
}

async function removeUnit(id){
  const item=(data?.units||[]).find(x=>Number(x.sellingUnitId)===Number(id));
  if(!item)return;
  if(!confirm('Remove '+clean(item.sellingUnitName)+' from selling units?'))return;

  try{
    await window.BBProductsAdapter.apiPost('deleteProductSellingUnit',{sellingUnitId:id});
    notify('Selling unit removed.');
    await load(clean($('dCode')?.value));
  }catch(error){
    notify(error?.message||error,true);
  }
}

function install(){
  ensureStyle();
  ensureSection();

  const originalOpen=window.openProductDetail;
  if(typeof originalOpen==='function'&&!originalOpen.__bbSellingUnitWrapped){
    const wrapped=async function(productCode){
      const result=await originalOpen.apply(this,arguments);
      setTimeout(()=>load(productCode),0);
      return result;
    };
    wrapped.__bbSellingUnitWrapped=true;
    window.openProductDetail=wrapped;
  }

  const originalClose=window.closeProductDetail;
  if(typeof originalClose==='function'&&!originalClose.__bbSellingUnitWrapped){
    const wrapped=function(){
      data=null;editingId=0;loadingCode='';loadedCode='';
      return originalClose.apply(this,arguments);
    };
    wrapped.__bbSellingUnitWrapped=true;
    window.closeProductDetail=wrapped;
  }

  function watchSelectedProduct(){
    const card=$('productDetailCard');
    const code=clean($('dCode')?.value);
    populateTarget();

    if(!card || card.classList.contains('hidden') || !code)return;
    if(code!==loadedCode && code!==loadingCode)load(code,true);
  }

  clearInterval(watchTimer);
  watchTimer=setInterval(watchSelectedProduct,350);
  watchSelectedProduct();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

window.BBProductSellingUnitsEditor={load,render,resetForm};
})();
