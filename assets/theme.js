
(()=>{
  const q=(s,c=document)=>c.querySelector(s), qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const body=document.body;
  function toggleOverlay(open){q('[data-drawer-backdrop]')?.classList.toggle('is-open',open);body.classList.toggle('no-scroll',open)}
  function openDrawer(sel){q(sel)?.classList.add('is-open');toggleOverlay(true)}
  function closeDrawers(){qa('.cart-drawer,.mobile-nav').forEach(x=>x.classList.remove('is-open'));toggleOverlay(false)}
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-tab]');
    if(tab){const root=tab.closest('[data-tabs-root]');qa('[data-tab]',root).forEach(x=>x.classList.toggle('active',x===tab));qa('[data-panel]',root).forEach(x=>x.hidden=x.dataset.panel!==tab.dataset.tab);return;}
    if(e.target.closest('[data-mobile-menu-open]')){openDrawer('[data-mobile-nav]');return;}
    if(e.target.closest('[data-cart-open]')){
      e.preventDefault();
      const openThemeCart=()=>openDrawer('[data-cart-drawer]');
      if(window.PurityTheme?.shopfloEnabled&&window.PurityTheme?.shopfloUseFloCart&&window.PurityShopflo?.openCartWhenReady){
        window.PurityShopflo.openCartWhenReady(4500).then((opened)=>{if(!opened)openThemeCart();});
        return;
      }
      if(window.PurityShopflo?.cart?.())return;
      openThemeCart();
      return;
    }
    if(e.target.closest('[data-drawer-close]')||e.target.matches('[data-drawer-backdrop]')){closeDrawers();return;}
    const cbtn=e.target.closest('[data-carousel-dir]');if(cbtn){const carousel=cbtn.closest('[data-carousel]');const viewport=q('[data-carousel-viewport]',carousel);const dir=cbtn.dataset.carouselDir==='next'?1:-1;viewport?.scrollBy({left:viewport.clientWidth*.82*dir,behavior:'smooth'});return;}
    const qty=e.target.closest('[data-qty]');if(qty){const wrap=qty.closest('.quantity');const input=q('input',wrap);input.value=Math.max(1,(parseInt(input.value)||1)+(qty.dataset.qty==='plus'?1:-1));return;}
    const sw=e.target.closest('[data-card-swatch]');if(sw){e.preventDefault();const card=sw.closest('.product-card');qa('[data-card-swatch]',card).forEach(x=>x.classList.remove('is-active'));sw.classList.add('is-active');const img=q('.product-card__primary',card);if(img&&sw.dataset.image)img.src=sw.dataset.image;return;}
  });
  async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const fetchOpts = controller ? { ...options, signal: controller.signal } : options;
      const res = await fetch(url, fetchOpts);
      if (timeout) clearTimeout(timeout);
      if (!res.ok) throw new Error('Network error. Please try again.');
      return res;
    } catch (err) {
      if (timeout) clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
      }
      throw err;
    }
  }

  async function refreshCart(open=true){
    try {
      const r=await fetchWithTimeout('/cart.js', { headers: { Accept: 'application/json' } }, 5000);
      const cart=await r.json();
      qa('[data-cart-count]').forEach(el=>{
        el.textContent=cart.item_count;
        el.classList.toggle('is-hidden', !cart.item_count);
        if(cart.item_count) el.removeAttribute('hidden');
        else el.setAttribute('hidden','');
      });
      const bodyEl=q('[data-cart-body]'), subtotal=q('[data-cart-subtotal]');
      if(subtotal) subtotal.textContent=money(cart.total_price);
      if(bodyEl){
        bodyEl.innerHTML=cart.item_count?cart.items.map((i,idx)=>`
          <div class="cart-item" data-line="${idx+1}">
            <img src="${i.image||''}" alt="${(i.title||'').replace(/"/g,'&quot;')}">
            <div class="cart-item__main">
              <a class="cart-item__title" href="${i.url}">${i.product_title}</a>
              ${i.variant_title&&i.variant_title!=='Default Title'?`<div class="cart-item__variant">${i.variant_title}</div>`:''}
              <div class="cart-item__unit-price">${money(i.final_price)}</div>
              <div class="cart-item__controls">
                <div class="cart-item__quantity">
                  <button type="button" class="cart-item__qty-btn" data-cart-qty="minus" data-line="${idx+1}" aria-label="Decrease quantity">−</button>
                  <span class="cart-item__qty-val" data-cart-qty-val>${i.quantity}</span>
                  <button type="button" class="cart-item__qty-btn" data-cart-qty="plus" data-line="${idx+1}" aria-label="Increase quantity">+</button>
                </div>
                <button class="cart-item__remove" type="button" data-cart-remove="${idx+1}" aria-label="Remove item">Remove</button>
              </div>
            </div>
            <strong class="cart-item__line-price">${money(i.final_line_price)}</strong>
          </div>
        `).join(''):`<div class="cart-empty"><h3>Your cart is empty</h3><p class="muted">Discover something made for your routine.</p></div>`;
      }
      if(open){
        const openThemeCart=()=>openDrawer('[data-cart-drawer]');
        if(window.PurityTheme?.shopfloEnabled&&window.PurityTheme?.shopfloUseFloCart&&window.PurityShopflo?.openCartWhenReady){
          window.PurityShopflo.openCartWhenReady(4500).then((opened)=>{if(!opened)openThemeCart();});
          return;
        }
        if(window.PurityShopflo?.cart?.())return;
        openThemeCart();
      }
    } catch(e) {
      console.error(e);
    }
  }
  function money(cents){try{return new Intl.NumberFormat(undefined,{style:'currency',currency:window.Shopify?.currency?.active||'USD'}).format(cents/100)}catch(e){return (cents/100).toFixed(2)}}
  document.addEventListener('submit',async e=>{
    const form=e.target.closest('form[action*="/cart/add"]'); if(!form)return; e.preventDefault();
    const btn=q('[type="submit"]',form); if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='Adding…'}
    try{
      const fd=new FormData(form);
      await fetchWithTimeout('/cart/add.js',{method:'POST',body:fd,headers:{Accept:'application/json'}}, 6000);
      await refreshCart(true);
    }catch(err){
      showToast(err.message||'Unable to add this item. Please try again.');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Add to cart'}
    }
  });
  document.addEventListener('click',async e=>{
    const qtyBtn=e.target.closest('[data-cart-qty]');
    if(qtyBtn){
      const line=Number(qtyBtn.dataset.line);
      const isPlus=qtyBtn.dataset.cartQty==='plus';
      const wrap=qtyBtn.closest('.cart-item__quantity');
      const valEl=wrap?wrap.querySelector('[data-cart-qty-val]'):null;
      const currentVal=valEl?parseInt(valEl.textContent)||1:1;
      const newQty=isPlus?currentVal+1:currentVal-1;
      if(wrap)wrap.style.opacity='0.4';
      try{
        await fetchWithTimeout('/cart/change.js',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({line:line,quantity:newQty})
        }, 6000);
        await refreshCart(false);
      }catch(err){
        showToast(err.message||'Unable to update cart.');
      }finally{
        if(wrap)wrap.style.opacity='1';
      }
      return;
    }
    const pageQtyBtn=e.target.closest('[data-cart-page-qty]');
    if(pageQtyBtn){
      const line=Number(pageQtyBtn.dataset.line);
      const isPlus=pageQtyBtn.dataset.cartPageQty==='plus';
      const wrap=pageQtyBtn.closest('.cart-item__quantity');
      const valEl=wrap?wrap.querySelector('[data-cart-page-qty-val]'):null;
      const currentVal=valEl?parseInt(valEl.textContent)||1:1;
      const newQty=isPlus?currentVal+1:currentVal-1;
      if(wrap)wrap.style.opacity='0.4';
      try{
        await fetchWithTimeout('/cart/change.js',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({line:line,quantity:newQty})
        }, 6000);
        window.location.reload();
      }catch(err){
        showToast(err.message||'Unable to update cart.');
        if(wrap)wrap.style.opacity='1';
      }
      return;
    }
    const rem=e.target.closest('[data-cart-remove]');
    if(!rem)return;
    const line=Number(rem.dataset.cartRemove);
    const itemEl=rem.closest('.cart-item');
    if(itemEl)itemEl.style.opacity='0.4';
    try{
      await fetchWithTimeout('/cart/change.js',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({line:line,quantity:0})
      }, 6000);
      await refreshCart(false);
    }catch(err){
      showToast(err.message||'Unable to remove item.');
      if(itemEl)itemEl.style.opacity='1';
    }
  });
  document.addEventListener('click',e=>{
    const checkout=e.target.closest('[data-shopflo-checkout], #checkout2');
    if(!checkout)return;
    e.preventDefault();
    if(typeof window.handleFloCheckoutBtn === 'function'){window.handleFloCheckoutBtn();return;}
    if(window.PurityShopflo?.checkout){window.PurityShopflo.checkout();return;}
    const shop=window.PurityTheme?.shopUrl||(window.Shopify?.shop?`https://${window.Shopify.shop}`:'');
    window.location.assign(`${shop}/checkout`);
  });
  function showToast(msg){const t=q('[data-toast]');if(!t)return;t.textContent=msg;t.classList.add('is-show');setTimeout(()=>t.classList.remove('is-show'),2400)}
  qa('[data-product-form]').forEach(form=>{
    const updateVariant=()=>{
      const data=JSON.parse(q('[data-product-json]',form)?.textContent||'{}');
      const options=[];
      qa('[data-option-index]:checked',form).forEach(el=>options[Number(el.dataset.optionIndex)]=el.value);
      qa('[data-option-select]',form).forEach(el=>options[Number(el.dataset.optionSelect)]=el.value);
      const variant=(data.variants||[]).find(v=>v.options.every((o,i)=>o===options[i]));
      if(!variant)return;
      const id=q('[name="id"]',form);if(id)id.value=variant.id;
      const price=q('[data-product-price]',form);if(price)price.textContent=money(variant.price);
      const submit=q('[type="submit"]',form);if(submit)submit.disabled=!variant.available;
      history.replaceState({},'',`${location.pathname}?variant=${variant.id}`);
      form.dispatchEvent(new CustomEvent('product:variant-change',{bubbles:true,detail:{variant}}));
    };
    qa('[data-option-index], [data-option-select]',form).forEach(input=>input.addEventListener('change',updateVariant));
  });
  const sticky=q('[data-sticky-atc]'), productForm=q('[data-main-product-form]');
  if(sticky&&productForm&&'IntersectionObserver'in window){new IntersectionObserver(([entry])=>sticky.classList.toggle('is-visible',!entry.isIntersecting),{threshold:.1}).observe(productForm)}
})();

(()=>{
  const q=(s,c=document)=>c.querySelector(s), qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const cfg=window.PurityTheme||{};

  // Page loader.
  const loader=q('[data-page-loader]');
  const hideLoader=()=>loader?.classList.add('is-hidden');
  if(document.readyState==='complete') hideLoader(); else window.addEventListener('load',hideLoader,{once:true});
  setTimeout(hideLoader,2200);

  // Scroll reveal applied to Shopify section wrappers without requiring every section to duplicate markup.
  const revealTargets=qa('.section-wrapper,.shopify-section > .section,.product-card,.card').filter((el,i)=>i<180);
  revealTargets.forEach(el=>el.setAttribute('data-reveal',''));
  if(cfg.scrollAnimation!=='disable' && 'IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
    revealTargets.forEach(el=>io.observe(el));
  } else revealTargets.forEach(el=>el.classList.add('is-visible'));

  // Slider with autoplay, dots, drag-like swipe and pause on hover/focus.
  qa('[data-slider]').forEach(root=>{
    const track=q('[data-slider-track]',root), slides=qa('[data-slider-slide]',root), dots=q('[data-slider-dots]',root);
    if(!track||slides.length<1)return;
    let index=0,timer=null,startX=null;
    const go=n=>{index=(n+slides.length)%slides.length;track.style.transform=`translate3d(${-index*100}%,0,0)`;qa('button',dots).forEach((d,i)=>d.classList.toggle('active',i===index))};
    if(dots){slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Go to slide ${i+1}`);b.addEventListener('click',()=>{go(i);restart()});dots.appendChild(b)});}
    q('[data-slider-prev]',root)?.addEventListener('click',()=>{go(index-1);restart()});q('[data-slider-next]',root)?.addEventListener('click',()=>{go(index+1);restart()});
    const play=()=>{if(root.dataset.autoplay==='true'&&slides.length>1)timer=setInterval(()=>go(index+1),Number(root.dataset.interval)||5000)};
    const stop=()=>{clearInterval(timer);timer=null}; const restart=()=>{stop();play()};
    root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',play);root.addEventListener('focusin',stop);root.addEventListener('focusout',play);
    root.addEventListener('pointerdown',e=>startX=e.clientX);root.addEventListener('pointerup',e=>{if(startX===null)return;const d=e.clientX-startX;if(Math.abs(d)>45)go(index+(d<0?1:-1));startX=null;restart()});
    go(0);play();
  });

  // Product finder range changes collection tabs.
  qa('[data-tabs-root]').forEach(root=>{const range=q('[data-finder-range]',root);if(!range)return;const tabs=qa('[data-tab]',root);range.addEventListener('input',()=>tabs[Number(range.value)]?.click());tabs.forEach((t,i)=>t.addEventListener('click',()=>range.value=i));});

  // Sticky shoppable video: only the actively playing/first eligible video becomes mini-player after it leaves viewport.
  const stickyMedia=qa('[data-sticky-video]');
  if(stickyMedia.length && 'IntersectionObserver' in window){
    const sio=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('is-sticky-video',!entry.isIntersecting && entry.boundingClientRect.top<0)}),{threshold:.05});
    stickyMedia.forEach(el=>sio.observe(el));
  }

  // Bundle builder with min/max rules and multi-item AJAX cart add.
  qa('[data-bundle]').forEach(root=>{
    const items=qa('[data-bundle-item]',root),btn=q('[data-bundle-add]',root),count=q('[data-bundle-count]',root),min=Number(root.dataset.min)||1,max=Number(root.dataset.max)||99;
    const update=changed=>{let selected=items.filter(i=>i.checked);if(selected.length>max&&changed){changed.checked=false;selected=items.filter(i=>i.checked)};if(count)count.textContent=`${selected.length} selected`;if(btn)btn.disabled=selected.length<min||selected.length>max;items.forEach(i=>{if(!i.checked)i.disabled=selected.length>=max;});};
    items.forEach(i=>i.addEventListener('change',()=>update(i)));update();
    btn?.addEventListener('click',async()=>{const selected=items.filter(i=>i.checked);if(selected.length<min)return;btn.disabled=true;const old=btn.textContent;btn.textContent='Adding…';try{const res=await fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({items:selected.map(i=>({id:Number(i.value),quantity:1}))})});if(!res.ok)throw new Error('Cart add failed');const discount=root.dataset.discount;if(discount){await fetch(`/discount/${encodeURIComponent(discount)}`,{redirect:'manual'}).catch(()=>{});} if(typeof window.fetch==='function'){document.querySelector('[data-cart-open]')?.click();setTimeout(()=>location.reload(),350);} }catch(e){console.error(e);btn.textContent='Try again';setTimeout(()=>btn.textContent=old,1500)}finally{btn.disabled=false;btn.textContent=old}});
  });
})();


(()=>{
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const money=c=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:window.Shopify?.currency?.active||'USD'}).format((Number(c)||0)/100)}catch(e){return ((Number(c)||0)/100).toFixed(2)}};

  // Mobile filter drawer.
  const filter=q('[data-filter-drawer]'), filterBackdrop=q('.filter-drawer-backdrop');
  const closeFilter=()=>{filter?.classList.remove('is-open');filterBackdrop?.classList.remove('is-open');document.body.classList.remove('no-scroll')};
  document.addEventListener('click',e=>{if(e.target.closest('[data-filter-open]')){filter?.classList.add('is-open');filterBackdrop?.classList.add('is-open');document.body.classList.add('no-scroll')}if(e.target.closest('[data-filter-close]'))closeFilter()});

  // Free shipping progress in the drawer.
  const updateShipping=cart=>{const root=q('[data-shipping-progress]');if(!root)return;const threshold=Number(root.dataset.threshold)||0,msg=q('[data-shipping-message]',root),bar=q('[data-shipping-bar]',root);if(!threshold)return;const remaining=Math.max(0,threshold-cart.total_price);if(msg)msg.innerHTML=remaining>0?`You're <strong>${money(remaining)}</strong> away from free shipping`:`You've unlocked <strong>free shipping</strong>`;if(bar)bar.style.width=`${Math.min(100,(cart.total_price/threshold)*100)}%`};
  fetch('/cart.js').then(r=>r.json()).then(updateShipping).catch(()=>{});
  document.addEventListener('submit',e=>{const form=e.target.closest('[data-discount-form]');if(!form)return;e.preventDefault();const code=q('[data-discount-code]',form)?.value.trim();if(code)location.href=`/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(location.pathname+location.search)}`});

  // Keep shipping progress in sync after AJAX cart operations by observing count changes.
  const count=q('[data-cart-count]');if(count&&'MutationObserver'in window)new MutationObserver(()=>fetch('/cart.js').then(r=>r.json()).then(updateShipping).catch(()=>{})).observe(count,{childList:true,subtree:true,characterData:true});

  // Quick shop modal generated from product JSON embedded in card data attributes.
  const modal=q('[data-quick-shop-modal]');let quickProduct=null;
  const renderQuickVariant=()=>{if(!quickProduct||!modal)return;const selected=qa('[data-quick-option]:checked',modal).map(i=>i.value);const variant=(quickProduct.variants||[]).find(v=>v.options.every((o,i)=>o===selected[i]))||quickProduct.variants?.[0];if(!variant)return;q('[data-quick-shop-id]',modal).value=variant.id;q('[data-quick-shop-price]',modal).textContent=money(variant.price);const btn=q('[data-quick-shop-form] [type=submit]',modal);if(btn){btn.disabled=!variant.available;btn.textContent=variant.available?'Add to cart':'Sold out'}if(variant.featured_image?.src)q('[data-quick-shop-image]',modal).src=variant.featured_image.src};
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-quick-shop]');if(btn&&modal){try{quickProduct=JSON.parse(btn.dataset.productJson);q('[data-quick-shop-title]',modal).textContent=btn.dataset.productTitle;q('[data-quick-shop-image]',modal).src=btn.dataset.productImage||'';q('[data-quick-shop-link]',modal).href=btn.dataset.productUrl;const opts=q('[data-quick-shop-options]',modal);opts.innerHTML=(quickProduct.options||[]).map((name,oi)=>`<fieldset class="quick-shop-option"><legend>${name}</legend><div class="quick-shop-option__values">${[...new Set(quickProduct.variants.map(v=>v.options[oi]))].map((val,vi)=>`<label><input type="radio" data-quick-option name="quick-option-${oi}" value="${String(val).replace(/"/g,'&quot;')}" ${vi===0?'checked':''}><span>${val}</span></label>`).join('')}</div></fieldset>`).join('');renderQuickVariant();modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll')}catch(err){console.error(err)}}if(e.target.closest('[data-quick-shop-close]')&&modal){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll')}});
  document.addEventListener('change',e=>{if(e.target.matches('[data-quick-option]'))renderQuickVariant()});

  // Product media lightbox with next/previous navigation.
  const lb=q('[data-media-lightbox]');let lbImages=[],lbIndex=0;
  const showLb=()=>{if(!lb||!lbImages.length)return;q('[data-lightbox-image]',lb).src=lbImages[lbIndex];lb.classList.add('is-open');lb.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll')};
  document.addEventListener('click',e=>{const zoom=e.target.closest('[data-media-zoom]');if(zoom){lbImages=qa('[data-product-media] img').map(i=>i.currentSrc||i.src).filter(Boolean);lbIndex=Math.max(0,qa('[data-product-media]').indexOf(zoom.closest('[data-product-media]')));showLb()}if(e.target.closest('[data-lightbox-close]')){lb?.classList.remove('is-open');lb?.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll')}if(e.target.closest('[data-lightbox-prev]')){lbIndex=(lbIndex-1+lbImages.length)%lbImages.length;showLb()}if(e.target.closest('[data-lightbox-next]')){lbIndex=(lbIndex+1)%lbImages.length;showLb()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){modal?.classList.remove('is-open');lb?.classList.remove('is-open');closeFilter();document.body.classList.remove('no-scroll')}if(lb?.classList.contains('is-open')&&e.key==='ArrowRight'){lbIndex=(lbIndex+1)%lbImages.length;showLb()}if(lb?.classList.contains('is-open')&&e.key==='ArrowLeft'){lbIndex=(lbIndex-1+lbImages.length)%lbImages.length;showLb()}});

  // Interactive before/after comparison.
  qa('[data-before-after]').forEach(root=>{const range=q('[data-before-range]',root),layer=q('[data-before-layer]',root),line=q('[data-before-line]',root);const update=()=>{const v=Number(range.value);layer.style.clipPath=`inset(0 ${100-v}% 0 0)`;line.style.left=`${v}%`};range?.addEventListener('input',update);update()});

  // Mobile product media: pagination dots synchronized with horizontal scroll.
  qa('.product-media').forEach(media=>{const items=qa('[data-product-media]',media);if(items.length<2)return;const dots=document.createElement('div');dots.className='mobile-media-dots';items.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Go to media ${i+1}`);if(i===0)b.classList.add('active');b.addEventListener('click',()=>items[i].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));dots.appendChild(b)});media.after(dots);let ticking=false;media.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const center=media.scrollLeft+media.clientWidth/2;let best=0,dist=Infinity;items.forEach((it,i)=>{const c=it.offsetLeft+it.offsetWidth/2,d=Math.abs(c-center);if(d<dist){dist=d;best=i}});qa('button',dots).forEach((b,i)=>b.classList.toggle('active',i===best));ticking=false})})});
})();


(()=>{
 const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
 // Rotating announcement messages.
 qa('[data-announcement-slider]').forEach(root=>{const slides=qa('[data-announcement-slide]',root),dots=qa('[data-announcement-dot]',root);if(slides.length<2)return;let i=0,t=null;const go=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,x)=>s.classList.toggle('is-active',x===i));dots.forEach((d,x)=>d.classList.toggle('active',x===i))};const play=()=>{clearInterval(t);t=setInterval(()=>go(i+1),Number(root.dataset.speed)||5000)};dots.forEach((d,x)=>d.addEventListener('click',()=>{go(x);play()}));root.addEventListener('mouseenter',()=>clearInterval(t));root.addEventListener('mouseleave',play);play()});
 // Search overlay + Shopify predictive search endpoint.
 const overlay=q('[data-search-overlay]'),input=q('[data-predictive-input]'),results=q('[data-predictive-results]');let searchTimer,controller;
 const close=()=>{overlay?.classList.remove('is-open');overlay?.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll')};
 document.addEventListener('click',e=>{if(e.target.closest('[data-search-open]')){overlay?.classList.add('is-open');overlay?.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');setTimeout(()=>input?.focus(),180)}if(e.target.closest('[data-search-close]'))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('is-open'))close()});
 // Lightweight wishlist persistence on this browser.
 let saved=[];try{saved=JSON.parse(localStorage.getItem('purity-wishlist')||'[]')}catch(e){}
 const sync=()=>qa('[data-wishlist]').forEach(b=>{const on=saved.includes(b.dataset.productHandle);b.classList.toggle('is-saved',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${on?'Remove':'Save'} ${b.dataset.productHandle.replace(/-/g,' ')}`)});sync();
 document.addEventListener('click',e=>{const b=e.target.closest('[data-wishlist]');if(!b)return;const h=b.dataset.productHandle;saved=saved.includes(h)?saved.filter(x=>x!==h):[...saved,h];localStorage.setItem('purity-wishlist',JSON.stringify(saved));sync()});
 // Mobile footer menus collapse by default, desktop stays open.
 const footerMenus=qa('.footer-menu');const setFooter=()=>footerMenus.forEach(d=>{if(innerWidth<750)d.removeAttribute('open');else d.setAttribute('open','')});setFooter();addEventListener('resize',setFooter,{passive:true});
})();


(()=>{
 const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
 // Smart sticky header: remain visible near top, hide on downward scroll, reveal on upward scroll.
 const header=q('[data-site-header]');let lastY=scrollY;
 const onScroll=()=>{if(!header)return;const y=scrollY;header.classList.toggle('is-scrolled',y>16);if(header.classList.contains('site-header-wrap--sticky')){header.classList.toggle('is-hidden',y>140&&y>lastY+4);if(y<lastY-4)header.classList.remove('is-hidden')}lastY=y};addEventListener('scroll',onScroll,{passive:true});onScroll();
 // Announcement arrows + swipe.
 qa('[data-announcement-slider]').forEach(root=>{const slides=qa('[data-announcement-slide]',root),dots=qa('[data-announcement-dot]',root);if(slides.length<2)return;const current=()=>Math.max(0,slides.findIndex(s=>s.classList.contains('is-active')));const go=n=>{const i=(n+slides.length)%slides.length;slides.forEach((s,x)=>s.classList.toggle('is-active',x===i));dots.forEach((d,x)=>d.classList.toggle('active',x===i))};q('[data-announcement-prev]',root)?.addEventListener('click',()=>go(current()-1));q('[data-announcement-next]',root)?.addEventListener('click',()=>go(current()+1));let sx=null;root.addEventListener('pointerdown',e=>sx=e.clientX);root.addEventListener('pointerup',e=>{if(sx===null)return;const d=e.clientX-sx;if(Math.abs(d)>35)go(current()+(d<0?1:-1));sx=null})});
 // Product-card video only plays for a deliberate desktop hover; touch never autoplays.
 if(matchMedia('(hover:hover) and (pointer:fine)').matches){qa('.product-card').forEach(card=>{const v=q('.product-card__hover-video video',card);if(!v)return;card.addEventListener('mouseenter',()=>v.play().catch(()=>{}));card.addEventListener('mouseleave',()=>{v.pause();v.currentTime=0})})}
 // Product gallery thumbnails and conservative video autoplay-on-visible.
 qa('[data-product-gallery]').forEach(gallery=>{const media=qa('[data-product-media]',gallery),shell=gallery.closest('.product-gallery,.pdp-gallery')||gallery,thumbs=qa('[data-product-thumb]',shell);thumbs.forEach((t,i)=>t.addEventListener('click',()=>media[i]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})));if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>entries.forEach(e=>{const v=q('video',e.target);if(!v)return;if(e.isIntersecting&&e.intersectionRatio>.65){v.muted=true;v.play().catch(()=>{})}else v.pause()}),{threshold:[.1,.65]});media.forEach(m=>{if(q('video',m))io.observe(m)})}const sync=()=>{const center=gallery.scrollLeft+gallery.clientWidth/2;let best=0,dist=Infinity;media.forEach((m,i)=>{const d=Math.abs((m.offsetLeft+m.offsetWidth/2)-center);if(d<dist){dist=d;best=i}});thumbs.forEach((t,i)=>t.classList.toggle('is-active',i===best))};gallery.addEventListener('scroll',sync,{passive:true});thumbs[0]?.classList.add('is-active')});
 // Upgrade predictive search to products + collections + articles + pages.
 const input=q('[data-predictive-input]'),results=q('[data-predictive-results]');if(input&&results){let timer,controller;input.addEventListener('input',()=>{clearTimeout(timer);const term=input.value.trim();if(term.length<2)return;timer=setTimeout(async()=>{try{controller?.abort();controller=new AbortController();const url=`/search/suggest.json?q=${encodeURIComponent(term)}&resources[type]=product,collection,article,page&resources[limit]=6&resources[options][unavailable_products]=last`;const r=await fetch(url,{signal:controller.signal});const d=await r.json(),rr=d?.resources?.results||{},products=rr.products||[],collections=rr.collections||[],articles=rr.articles||[],pages=rr.pages||[];const links=(title,items)=>items.length?`<div class="predictive-group"><h4>${title}</h4>${items.slice(0,5).map(x=>`<a href="${x.url}">${x.title}</a>`).join('')}</div>`:'';const prod=products.length?`<div><div class="section-head section-head--compact"><h3>Products</h3><a class="predictive-view-all" href="/search?q=${encodeURIComponent(term)}">View all</a></div><div class="predictive-grid predictive-grid--compact">${products.map(p=>`<a class="predictive-item" href="${p.url}">${p.image?`<img src="${p.image}" alt="" loading="lazy">`:''}<strong>${p.title}</strong><span>${p.price||''}</span></a>`).join('')}</div></div>`:'';results.innerHTML=(products.length+collections.length+articles.length+pages.length)?`<div class="predictive-layout"><div class="predictive-groups">${links('Collections',collections)}${links('Articles',articles)}${links('Pages',pages)}</div>${prod}</div>`:`<div class="predictive-search-empty"><h3>No results</h3><p class="muted">Try a different search.</p></div>`}catch(err){if(err.name!=='AbortError')console.error(err)}},190)})}
})();
