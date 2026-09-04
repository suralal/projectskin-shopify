(function () {
  function setupAccountEntry(root) {
    var panel = root.querySelector('[data-account-entry]');
    var trigger = root.querySelector('[data-account-entry-open]');

    if (!panel || !trigger || panel.dataset.ready === 'true') return;
    panel.dataset.ready = 'true';

    // Keep the fixed drawer outside the sticky header's backdrop-filter stacking context.
    document.body.appendChild(panel);

    var closeButtons = panel.querySelectorAll('[data-account-entry-close]');
    var firstFocusable = panel.querySelector('.customer-entry__close');

    function openPanel(event) {
      if (event) event.preventDefault();
      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('customer-entry-open');
      window.requestAnimationFrame(function () {
        panel.classList.add('is-open');
        if (firstFocusable) firstFocusable.focus();
      });
    }

    function closePanel() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('customer-entry-open');
      window.setTimeout(function () {
        panel.hidden = true;
      }, 260);
      trigger.focus();
    }

    trigger.addEventListener('click', openPanel);
    closeButtons.forEach(function (button) {
      button.addEventListener('click', closePanel);
    });
    panel.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closePanel();
    });
  }

  function init() {
    document.querySelectorAll('[data-site-header]').forEach(setupAccountEntry);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', init);
})();
