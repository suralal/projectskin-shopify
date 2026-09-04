// Replace this value before connecting the pixel in Shopify Admin.
const GTM_CONTAINER_ID = 'GTM-XXXXXXX';

window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }

gtag('consent', 'update', {
  ad_storage: 'granted',
  analytics_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});

(function (windowObject, documentObject, tagName, layerName, containerId) {
  windowObject[layerName].push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const firstScript = documentObject.getElementsByTagName(tagName)[0];
  const script = documentObject.createElement(tagName);
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  firstScript.parentNode.insertBefore(script, firstScript);
})(window, document, 'script', 'dataLayer', GTM_CONTAINER_ID);

function itemFromVariant(variant, quantity = 1) {
  if (!variant) return null;
  return {
    item_id: String(variant.id || ''),
    item_name: variant.product?.title || variant.title || '',
    item_brand: variant.product?.vendor || '',
    item_category: variant.product?.type || '',
    item_variant: variant.title || '',
    price: Number(variant.price?.amount || variant.price || 0),
    quantity: Number(quantity || 1)
  };
}

function itemFromLine(line) {
  if (!line) return null;
  const item = itemFromVariant(line.merchandise || line.variant, line.quantity);
  if (item && line.finalLinePrice?.amount && line.quantity) {
    item.price = Number(line.finalLinePrice.amount) / Number(line.quantity);
  }
  return item;
}

function checkoutPayload(checkout) {
  const items = (checkout?.lineItems || []).map(itemFromLine).filter(Boolean);
  return {
    currency: checkout?.currencyCode,
    value: Number(checkout?.totalPrice?.amount || 0),
    items
  };
}

function pushEcommerce(eventName, ecommerce) {
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event: eventName, ecommerce });
}

analytics.subscribe('page_viewed', (event) => {
  window.dataLayer.push({
    event: 'page_view',
    page_location: event.context.window.location.href,
    page_title: event.context.document.title
  });
});

analytics.subscribe('product_viewed', (event) => {
  const item = itemFromVariant(event.data?.productVariant);
  if (item) pushEcommerce('view_item', { currency: event.data.productVariant.price?.currencyCode, value: item.price, items: [item] });
});

analytics.subscribe('collection_viewed', (event) => {
  const items = (event.data?.collection?.productVariants || []).map(itemFromVariant).filter(Boolean);
  pushEcommerce('view_item_list', { item_list_name: event.data?.collection?.title, items });
});

analytics.subscribe('product_added_to_cart', (event) => {
  const line = event.data?.cartLine;
  const item = itemFromLine(line);
  if (item) pushEcommerce('add_to_cart', { currency: line.cost?.totalAmount?.currencyCode, value: Number(line.cost?.totalAmount?.amount || 0), items: [item] });
});

analytics.subscribe('product_removed_from_cart', (event) => {
  const line = event.data?.cartLine;
  const item = itemFromLine(line);
  if (item) pushEcommerce('remove_from_cart', { currency: line.cost?.totalAmount?.currencyCode, value: Number(line.cost?.totalAmount?.amount || 0), items: [item] });
});

analytics.subscribe('cart_viewed', (event) => {
  const cart = event.data?.cart;
  const items = (cart?.lines || []).map(itemFromLine).filter(Boolean);
  pushEcommerce('view_cart', { currency: cart?.cost?.totalAmount?.currencyCode, value: Number(cart?.cost?.totalAmount?.amount || 0), items });
});

analytics.subscribe('checkout_started', (event) => {
  pushEcommerce('begin_checkout', checkoutPayload(event.data?.checkout));
});

analytics.subscribe('checkout_address_info_submitted', (event) => {
  pushEcommerce('add_shipping_info', checkoutPayload(event.data?.checkout));
});

analytics.subscribe('payment_info_submitted', (event) => {
  pushEcommerce('add_payment_info', checkoutPayload(event.data?.checkout));
});

analytics.subscribe('checkout_completed', (event) => {
  const checkout = event.data?.checkout;
  const payload = checkoutPayload(checkout);
  payload.transaction_id = String(checkout?.order?.id || checkout?.token || event.id);
  payload.tax = Number(checkout?.totalTax?.amount || 0);
  payload.shipping = Number(checkout?.shippingLine?.price?.amount || 0);
  pushEcommerce('purchase', payload);
});

analytics.subscribe('search_submitted', (event) => {
  window.dataLayer.push({ event: 'search', search_term: event.data?.searchResult?.query || '' });
});
