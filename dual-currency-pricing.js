/* BIG BROTHER — Products Editor Dual Currency Pricing V1 */
(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const khr=v=>'៛'+Math.round(n(v)).toLocaleString('en-US');

  function fieldAfter(sourceId,newId,label){
    if(byId(newId))return;
    const source=byId(sourceId);
    const holder=source?.closest('.field');
    if(!holder)return;
    const field=document.createElement('div');
    field.className='field';
    field.innerHTML='<label>'+label+'</label><input id="'+newId+'" type="number" min="0" step="100" value="0"><small>Independent KHR selling price. No automatic exchange-rate conversion.</small>';
    holder.insertAdjacentElement('afterend',field);
  }

  function installFields(){
    fieldAfter('aPrice','aPriceKHR','Default Price KHR *');
    fieldAfter('dPrice','dPriceKHR','Default Price KHR *');
  }

  function findHeaderIndex(table,label){
    const ths=[...(table?.querySelectorAll('thead th')||[])];
    return ths.findIndex(th=>String(th.textContent||'').trim()===label);
  }

  function ensureHeaderAfter(table,label,newLabel,marker){
    if(!table||table.querySelector('th[data-bb-col="'+marker+'"]'))return;
    const idx=findHeaderIndex(table,label);
    const row=table.querySelector('thead tr');
    if(idx<0||!row)return;
    const th=document.createElement('th');
    th.dataset.bbCol=marker;
    th.textContent=newLabel;
    row.children[idx].insertAdjacentElement('afterend',th);
  }

  function enhanceProductTable(){
    const body=byId('productTableBody');
    const table=body?.closest('table');
    if(!body||!table)return;
    ensureHeaderAfter(table,'Default Price USD','Default Price KHR','default-khr');
    const usdIdx=findHeaderIndex(table,'Default Price USD');
    if(usdIdx<0)return;
    [...body.rows].forEach(row=>{
      if(row.querySelector('[data-bb-cell="default-khr"]'))return;
      const code=String(row.cells[0]?.textContent||'').trim();
      const product=(typeof state!=='undefined'&&Array.isArray(state.products))?state.products.find(p=>String(p.code||'').trim()===code):null;
      const td=row.insertCell(usdIdx+1);
      td.dataset.bbCell='default-khr';
      td.className='money-khr';
      td.textContent=khr(product?.khrPrice??product?.priceKHR??0);
    });
  }

  function enhanceCustomerPriceTable(){
    const body=byId('customerPriceBody');
    const table=body?.closest('table');
    if(!body||!table)return;
    ensureHeaderAfter(table,'Customer Price USD','Default Price KHR','default-khr');
    ensureHeaderAfter(table,'Default Price KHR','Customer Price KHR','customer-khr');
    const defaultIdx=findHeaderIndex(table,'Default Price KHR');
    const customerIdx=findHeaderIndex(table,'Customer Price KHR');
    [...body.rows].forEach((row,index)=>{
      if(row.querySelector('[data-bb-cell="default-khr"]'))return;
      const item=(typeof state!=='undefined'&&Array.isArray(state.customerPrices))?state.customerPrices[index]:null;
      const tdDefault=row.insertCell(defaultIdx);
      tdDefault.dataset.bbCell='default-khr';
      tdDefault.className='money-khr';
      tdDefault.textContent=khr(item?.defaultPriceKHR??0);
      const tdCustomer=row.insertCell(customerIdx);
      tdCustomer.dataset.bbCell='customer-khr';
      tdCustomer.className='money-khr';
      tdCustomer.textContent=khr(item?.customerPriceKHR??0);
    });
  }

  function wrapGlobals(){
    if(typeof apiPost==='function'&&!apiPost.__bbDualCurrency){
      const base=apiPost;
      const wrapped=async function(action,payload){
        if(String(action||'')==='saveProduct'&&payload&&typeof payload==='object'){
          const editing=!!String(payload.originalProductCode||'').trim();
          const input=byId(editing?'dPriceKHR':'aPriceKHR');
          payload.khrPrice=input?input.value:'0';
          payload.priceKHR=payload.khrPrice;
        }
        return base(action,payload);
      };
      wrapped.__bbDualCurrency=true;
      apiPost=wrapped;
    }

    if(typeof resetAddForm==='function'&&!resetAddForm.__bbDualCurrency){
      const base=resetAddForm;
      const wrapped=function(){const r=base.apply(this,arguments);if(byId('aPriceKHR'))byId('aPriceKHR').value='0';return r;};
      wrapped.__bbDualCurrency=true;
      resetAddForm=wrapped;
    }

    if(typeof fillProductDetail==='function'&&!fillProductDetail.__bbDualCurrency){
      const base=fillProductDetail;
      const wrapped=function(product){const r=base.apply(this,arguments);installFields();if(byId('dPriceKHR'))byId('dPriceKHR').value=n(product?.khrPrice??product?.priceKHR??0);return r;};
      wrapped.__bbDualCurrency=true;
      fillProductDetail=wrapped;
    }

    if(typeof renderProductTable==='function'&&!renderProductTable.__bbDualCurrency){
      const base=renderProductTable;
      const wrapped=function(){const r=base.apply(this,arguments);enhanceProductTable();return r;};
      wrapped.__bbDualCurrency=true;
      renderProductTable=wrapped;
    }

    if(typeof renderCustomerPrices==='function'&&!renderCustomerPrices.__bbDualCurrency){
      const base=renderCustomerPrices;
      const wrapped=function(){const r=base.apply(this,arguments);enhanceCustomerPriceTable();return r;};
      wrapped.__bbDualCurrency=true;
      renderCustomerPrices=wrapped;
    }
  }

  installFields();
  wrapGlobals();
  setTimeout(()=>{
    installFields();
    try{if(typeof renderProductTable==='function')renderProductTable();}catch(_){}
    try{if(typeof state!=='undefined'&&state.selected&&typeof fillProductDetail==='function')fillProductDetail(state.selected);}catch(_){}
    try{if(typeof state!=='undefined'&&state.customerPrices?.length&&typeof renderCustomerPrices==='function')renderCustomerPrices();}catch(_){}
  },0);
})();
