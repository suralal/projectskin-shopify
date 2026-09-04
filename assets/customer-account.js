(() => {
  const root = document.querySelector('[data-customer-account]');
  if (!root) return;

  const loginPanel = root.querySelector('[data-login-panel]');
  const recoverPanel = root.querySelector('[data-recover-panel]');

  const setRecoveryState = (showRecovery) => {
    if (!loginPanel || !recoverPanel) return;
    loginPanel.hidden = showRecovery;
    recoverPanel.hidden = !showRecovery;
    const target = showRecovery
      ? recoverPanel.querySelector('input')
      : loginPanel.querySelector('input');
    target?.focus();
  };

  root.querySelectorAll('[data-recover-open]').forEach((button) => {
    button.addEventListener('click', () => setRecoveryState(true));
  });

  root.querySelectorAll('[data-recover-close]').forEach((button) => {
    button.addEventListener('click', () => setRecoveryState(false));
  });

  if (window.location.hash === '#recover') setRecoveryState(true);

  const populateProvinces = (countrySelect, provinceSelect, provinceWrap) => {
    if (!countrySelect || !provinceSelect || !provinceWrap) return;
    if (!countrySelect.dataset.ready && countrySelect.dataset.default) {
      countrySelect.value = countrySelect.dataset.default;
      countrySelect.dataset.ready = 'true';
    }
    const option = countrySelect.options[countrySelect.selectedIndex];
    let provinces = [];

    try {
      provinces = JSON.parse(option?.dataset.provinces || '[]');
    } catch (_error) {
      provinces = [];
    }

    provinceSelect.innerHTML = '';
    provinces.forEach(([value, label]) => {
      const provinceOption = document.createElement('option');
      provinceOption.value = value;
      provinceOption.textContent = label;
      provinceSelect.appendChild(provinceOption);
    });

    provinceWrap.hidden = provinces.length === 0;
    const defaultProvince = provinceSelect.dataset.default;
    if (defaultProvince) provinceSelect.value = defaultProvince;
  };

  root.querySelectorAll('[data-address-country]').forEach((countrySelect) => {
    const form = countrySelect.closest('form');
    const provinceSelect = form?.querySelector('[data-address-province]');
    const provinceWrap = provinceSelect?.closest('[data-province-wrap]');
    populateProvinces(countrySelect, provinceSelect, provinceWrap);
    countrySelect.addEventListener('change', () => {
      populateProvinces(countrySelect, provinceSelect, provinceWrap);
    });
  });

  root.querySelectorAll('[data-address-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.addressToggle);
      if (!target) return;
      const willOpen = target.hidden;
      root.querySelectorAll('[data-address-form]').forEach((form) => {
        form.hidden = true;
      });
      target.hidden = !willOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) target.querySelector('input')?.focus();
    });
  });

  root.querySelectorAll('[data-address-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = button.closest('[data-address-form]');
      if (form) form.hidden = true;
    });
  });

  root.querySelectorAll('[data-address-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const message = button.dataset.confirm || 'Delete this address?';
      if (!window.confirm(message)) return;
      const form = document.createElement('form');
      form.method = 'post';
      form.action = button.dataset.addressDelete;
      form.innerHTML = '<input type="hidden" name="_method" value="delete">';
      document.body.appendChild(form);
      form.submit();
    });
  });
})();
