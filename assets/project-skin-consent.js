(function () {
  'use strict';

  var configNode = document.getElementById('ProjectSkinConsentConfig');
  if (!configNode) return;

  var config;
  try {
    config = JSON.parse(configNode.textContent || '{}');
  } catch (error) {
    document.documentElement.classList.remove('ps-consent-enhanced');
    return;
  }

  var loadedAt = null;
  var delay = Math.max(0, Number(config.delay) || 0);

  function setText(element, value) {
    if (element && value) element.textContent = value;
  }

  function updateMessage(banner) {
    var body = banner.querySelector('.shopify-pc__banner__body');
    if (!body || !config.body) return;

    var copy = body.querySelector('p');
    if (!copy || copy.dataset.psConsentCopy === 'true') return;

    var policyLink = copy.querySelector('.shopify-pc__banner__body-policy-link, a');
    copy.textContent = config.body + ' ';
    if (policyLink) copy.appendChild(policyLink);
    copy.dataset.psConsentCopy = 'true';
  }

  // Shopify renders these nodes with an id and no class, so match either.
  function find(banner, name) {
    return banner.querySelector('#shopify-pc__banner__' + name + ', .shopify-pc__banner__' + name);
  }

  function personalize(banner) {
    if (banner.dataset.psConsentPersonalized === 'true') return;

    setText(find(banner, 'body-title'), config.heading);
    setText(find(banner, 'btn-accept'), config.acceptLabel);
    setText(find(banner, 'btn-decline'), config.declineLabel);
    setText(find(banner, 'btn-manage-prefs'), config.manageLabel);
    updateMessage(banner);
    banner.dataset.psConsentPersonalized = 'true';
  }

  function reveal(banner) {
    personalize(banner);
    banner.dataset.psConsentReady = 'true';
  }

  function schedule(banner) {
    if (!banner || banner.dataset.psConsentScheduled === 'true') return;
    banner.dataset.psConsentScheduled = 'true';
    personalize(banner);

    var elapsed = loadedAt === null ? 0 : Date.now() - loadedAt;
    window.setTimeout(function () {
      reveal(banner);
    }, Math.max(0, delay - elapsed));
  }

  function findBanner() {
    schedule(document.getElementById('shopify-pc__banner'));
  }

  function begin() {
    loadedAt = Date.now();
    findBanner();

    var observer = new MutationObserver(findBanner);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
})();
