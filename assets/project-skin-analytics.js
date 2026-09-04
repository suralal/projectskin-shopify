(function () {
  'use strict';

  var configNode = document.getElementById('ProjectSkinAnalyticsConfig');
  if (!configNode) return;

  var config;
  try {
    config = JSON.parse(configNode.textContent || '{}');
  } catch (error) {
    console.error('[Project Skin analytics] Invalid configuration.', error);
    return;
  }

  var mode = config.mode || 'shopify';
  var page = config.page || {};
  var currency = page.currency || 'USD';
  configNode.dataset.analyticsMode = mode;
  configNode.dataset.analyticsStatus = 'initializing';
  var ready = mode === 'shopify';
  var initialized = false;
  var initialEventsSent = false;
  var lastCheckoutAt = 0;
  var cartState = normalizeCart(page.cart || {});
  var nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  function debug(label, payload) {
    if (config.debug) console.info('[Project Skin analytics] ' + label, payload || '');
  }

  function validGa4Id(value) {
    return /^G-[A-Z0-9]+$/i.test(value || '');
  }

  function validGtmId(value) {
    return /^GTM-[A-Z0-9]+$/i.test(value || '');
  }

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function moneyFromCents(value) {
    return Math.round(number(value)) / 100;
  }

  function cleanItem(item) {
    if (!item) return null;
    return {
      item_id: String(item.item_id || item.variant_id || item.id || ''),
      item_name: item.item_name || item.product_title || item.title || '',
      item_brand: item.item_brand || item.vendor || '',
      item_category: item.item_category || item.product_type || '',
      item_variant: item.item_variant || item.variant_title || '',
      price: number(item.price),
      quantity: Math.max(1, number(item.quantity) || 1)
    };
  }

  function itemFromShopify(item) {
    if (!item) return null;
    return cleanItem({
      item_id: item.variant_id || item.id,
      item_name: item.product_title || item.title,
      item_brand: item.vendor,
      item_category: item.product_type,
      item_variant: item.variant_title,
      price: moneyFromCents(item.final_price != null ? item.final_price : item.price),
      quantity: item.quantity
    });
  }

  function normalizeCart(cart) {
    var items = Array.isArray(cart.items) ? cart.items.map(function (item) {
      if (item.item_name) return Object.assign(cleanItem(item), { item_key: item.item_key || '' });
      return Object.assign(itemFromShopify(item), { item_key: item.key || '' });
    }).filter(Boolean) : [];
    var value = cart.total_price != null ? moneyFromCents(cart.total_price) : number(cart.value);
    return { value: value, items: items };
  }

  function ecommercePayload(items, value) {
    return {
      currency: currency,
      value: value == null ? items.reduce(function (sum, item) {
        return sum + number(item.price) * number(item.quantity);
      }, 0) : number(value),
      items: items.map(cleanItem).filter(Boolean)
    };
  }

  function publishShopifyCustomEvent(name, parameters) {
    if (!window.Shopify || !Shopify.analytics || typeof Shopify.analytics.publish !== 'function') return;
    try {
      Shopify.analytics.publish('project_skin_' + name, parameters || {});
    } catch (error) {
      debug('Custom event publish failed', error);
    }
  }

  function send(name, parameters, options) {
    var opts = options || {};
    if (mode === 'shopify') {
      if (!opts.standard) publishShopifyCustomEvent(name, parameters);
      debug((opts.standard ? 'Shopify standard event: ' : 'Shopify custom event: ') + name, parameters);
      return;
    }
    if (!ready) return;

    var payload = Object.assign({}, parameters || {});
    if (config.debug) payload.debug_mode = true;

    if (mode === 'ga4') {
      window.gtag('event', name, payload);
    } else if (mode === 'gtm') {
      if (payload.items) {
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({ event: name, ecommerce: payload });
      } else {
        window.dataLayer.push(Object.assign({ event: name }, payload));
      }
    }
    debug('Sent ' + name, payload);
  }

  function updateConsent(analyticsAllowed, marketingAllowed) {
    window.gtag('consent', 'update', {
      analytics_storage: analyticsAllowed ? 'granted' : 'denied',
      ad_storage: marketingAllowed ? 'granted' : 'denied',
      ad_user_data: marketingAllowed ? 'granted' : 'denied',
      ad_personalization: marketingAllowed ? 'granted' : 'denied'
    });
  }

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    var script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function initializeProvider() {
    if (initialized) return;

    if (mode === 'ga4') {
      if (!validGa4Id(config.ga4MeasurementId)) {
        debug('GA4 is inactive because the measurement ID is missing or invalid.');
        return;
      }
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.ga4MeasurementId), 'ProjectSkinGtag');
      window.gtag('js', new Date());
      window.gtag('config', config.ga4MeasurementId, { send_page_view: false });
    } else if (mode === 'gtm') {
      if (!validGtmId(config.gtmContainerId)) {
        debug('GTM is inactive because the container ID is missing or invalid.');
        return;
      }
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      loadScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(config.gtmContainerId), 'ProjectSkinGtm');
    }

    initialized = true;
    ready = true;
    sendInitialEvents();
  }

  function consentValues() {
    var privacy = window.Shopify && Shopify.customerPrivacy;
    if (!privacy) return null;
    return {
      analytics: typeof privacy.analyticsProcessingAllowed === 'function' && privacy.analyticsProcessingAllowed(),
      marketing: typeof privacy.marketingAllowed === 'function' && privacy.marketingAllowed()
    };
  }

  function applyCustomerPrivacy() {
    var values = consentValues();
    if (!values) return;
    updateConsent(values.analytics, values.marketing);
    ready = values.analytics && initialized;
    if (values.analytics) initializeProvider();
    debug('Consent updated', values);
  }

  function initializePrivacy() {
    document.addEventListener('visitorConsentCollected', applyCustomerPrivacy);
    if (window.Shopify && typeof Shopify.loadFeatures === 'function') {
      Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], function (error) {
        if (error) {
          debug('Customer Privacy API could not be loaded.', error);
          return;
        }
        applyCustomerPrivacy();
      });
    } else {
      debug('Customer Privacy API is unavailable; external analytics remains disabled.');
    }
  }

  function itemFromCard(card) {
    if (!card) return null;
    return cleanItem({
      item_id: card.dataset.itemId,
      item_name: card.dataset.itemName,
      item_brand: card.dataset.itemBrand,
      item_category: card.dataset.itemCategory,
      item_variant: card.dataset.itemVariant,
      price: card.dataset.itemPrice,
      quantity: 1
    });
  }

  function visibleProductItems() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-analytics-product-card]'), 0, 24)
      .map(itemFromCard)
      .filter(Boolean);
  }

  function listName() {
    if (page.collectionTitle) return page.collectionTitle;
    if (page.type === 'search') return 'Search results';
    return page.title || 'Storefront products';
  }

  function sendInitialEvents() {
    if (initialEventsSent || !ready) return;
    initialEventsSent = true;

    send('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search
    }, { standard: true });

    if (page.product) {
      send('view_item', ecommercePayload([page.product]), { standard: true });
    }
    if (page.type === 'cart' && cartState.items.length) {
      send('view_cart', ecommercePayload(cartState.items, cartState.value), { standard: true });
    }
    if (page.type === 'search' && page.searchTerm) {
      send('search', { search_term: page.searchTerm }, { standard: true });
      send('view_search_results', { search_term: page.searchTerm }, { standard: true });
    }

    var listedItems = visibleProductItems();
    if (listedItems.length && page.type !== 'product') {
      var list = ecommercePayload(listedItems);
      list.item_list_name = listName();
      send('view_item_list', list, { standard: true });
    }

    var accountEvent = sessionStorage.getItem('projectSkinAccountEvent');
    if (accountEvent && page.customerLoggedIn) {
      sessionStorage.removeItem('projectSkinAccountEvent');
      send(accountEvent, { method: 'Shopify customer account' }, { standard: false });
    }
  }

  function mergeAddedItems(items) {
    items.forEach(function (added) {
      var existing = cartState.items.find(function (item) { return item.item_id === added.item_id; });
      if (existing) existing.quantity += added.quantity;
      else cartState.items.push(added);
      cartState.value += added.price * added.quantity;
    });
  }

  function removedItems(previous, next) {
    return previous.items.reduce(function (removed, beforeItem) {
      var afterItem = next.items.find(function (item) {
        return (beforeItem.item_key && item.item_key === beforeItem.item_key) || item.item_id === beforeItem.item_id;
      });
      var difference = beforeItem.quantity - (afterItem ? afterItem.quantity : 0);
      if (difference > 0) removed.push(Object.assign({}, beforeItem, { quantity: difference }));
      return removed;
    }, []);
  }

  function handleCartResponse(path, response, previousCart) {
    response.clone().json().then(function (data) {
      if (path.indexOf('/cart/add') !== -1) {
        var sourceItems = Array.isArray(data.items) ? data.items : [data];
        var added = sourceItems.map(itemFromShopify).filter(Boolean);
        if (added.length) {
          mergeAddedItems(added);
          send('add_to_cart', ecommercePayload(added), { standard: true });
        }
        return;
      }

      if (path.indexOf('/cart/change') !== -1 || path.indexOf('/cart/update') !== -1) {
        var nextCart = normalizeCart(data);
        var removed = removedItems(previousCart, nextCart);
        cartState = nextCart;
        if (removed.length) send('remove_from_cart', ecommercePayload(removed), { standard: true });
      }
    }).catch(function (error) {
      debug('Cart response could not be measured.', error);
    });
  }

  if (nativeFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      var parsedUrl;
      try { parsedUrl = new URL(url, window.location.origin); } catch (error) { parsedUrl = null; }
      var path = parsedUrl ? parsedUrl.pathname : '';
      var previousCart = { value: cartState.value, items: cartState.items.map(function (item) { return Object.assign({}, item); }) };
      return nativeFetch(input, init).then(function (response) {
        if (response.ok && (/\/cart\/(add|change|update)\.js$/.test(path))) {
          handleCartResponse(path, response, previousCart);
        }
        return response;
      });
    };
  } else {
    debug('Fetch instrumentation is unavailable in this browser.');
  }

  document.addEventListener('click', function (event) {
    var cardLink = event.target.closest('[data-analytics-product-card] a[href*="/products/"]');
    if (cardLink) {
      var cardItem = itemFromCard(cardLink.closest('[data-analytics-product-card]'));
      if (cardItem) {
        var selection = ecommercePayload([cardItem]);
        selection.item_list_name = listName();
        send('select_item', selection, { standard: true });
      }
    }

    if (event.target.closest('[data-account-entry-open]')) {
      send('account_panel_open', { page_path: window.location.pathname }, { standard: false });
    }
    if (event.target.closest('[data-search-open]')) {
      send('search_panel_open', { page_path: window.location.pathname }, { standard: false });
    }

    var routineTrigger = event.target.closest('[data-routine-trigger], [data-routine-step]');
    if (routineTrigger) {
      send('routine_step_selected', { step_name: (routineTrigger.textContent || '').trim() }, { standard: false });
    }

    var checkout = event.target.closest('[name="checkout"], [data-shopflo-checkout], a[href*="/checkout"]');
    if (checkout && Date.now() - lastCheckoutAt > 1500) {
      lastCheckoutAt = Date.now();
      send('begin_checkout', ecommercePayload(cartState.items, cartState.value), { standard: true });
    }

    var removeLink = event.target.closest('a[href*="/cart/change"]');
    if (removeLink && !removeLink.matches('[data-cart-remove]')) {
      var removeUrl = new URL(removeLink.href, window.location.origin);
      var line = number(removeUrl.searchParams.get('line'));
      var quantity = number(removeUrl.searchParams.get('quantity'));
      if (line > 0 && quantity === 0 && cartState.items[line - 1]) {
        send('remove_from_cart', ecommercePayload([cartState.items[line - 1]]), { standard: true });
      }
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    var action = form.getAttribute('action') || '';

    if (action.indexOf('/account/login') !== -1) {
      sessionStorage.setItem('projectSkinAccountEvent', 'login');
    } else if (action === '/account' || action.indexOf('/account?') === 0) {
      sessionStorage.setItem('projectSkinAccountEvent', 'sign_up');
    }

    if (action.indexOf('/contact') !== -1 && form.querySelector('[name="contact[email]"]')) {
      send('generate_lead', { lead_source: 'storefront_form', form_name: form.id || 'contact' }, { standard: false });
    }
  });

  window.ProjectSkinAnalytics = {
    track: function (name, parameters) { send(name, parameters, { standard: false }); },
    status: function () {
      return { mode: mode, ready: ready, initialized: initialized, debug: Boolean(config.debug) };
    }
  };

  configNode.dataset.analyticsStatus = 'active';

  if (mode === 'shopify') {
    sendInitialEvents();
  } else {
    initializePrivacy();
  }
})();
