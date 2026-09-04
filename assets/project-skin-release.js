(() => {
  const setupPlatform = (platform) => {
    const tabs = [...platform.querySelectorAll('[data-psr-platform-tab]')];
    const panels = [...platform.querySelectorAll('[data-psr-platform-panel]')];

    const activate = (tab, focus = false) => {
      tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      panels.forEach((panel) => {
        panel.hidden = panel.id !== tab.getAttribute('aria-controls');
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        activate(next, true);
      });
    });
  };

  const setupRoutine = (routine) => {
    const steps = [...routine.querySelectorAll('[data-routine-step]')];
    const progress = routine.querySelector('[data-routine-progress]');

    const update = () => {
      const complete = steps.filter((step) => step.classList.contains('is-complete')).length;
      if (progress) progress.textContent = `${complete} of ${steps.length} steps complete today`;
    };

    steps.forEach((step) => {
      step.addEventListener('click', () => {
        step.classList.toggle('is-complete');
        step.setAttribute('aria-pressed', String(step.classList.contains('is-complete')));
        update();
      });
    });
    update();
  };

  const setupRoutineBundle = (bundle) => {
    if (bundle.dataset.routineReady === 'true') return;
    bundle.dataset.routineReady = 'true';
    const products = [...bundle.querySelectorAll('[data-routine-product]')];
    const hotspots = [...bundle.querySelectorAll('[data-routine-hotspot]')];
    const addButton = bundle.querySelector('[data-routine-add]');
    const total = bundle.querySelector('[data-routine-total]');
    const status = bundle.querySelector('[data-routine-status]');
    const currency = window.Shopify?.currency?.active || 'INR';
    const formatMoney = (cents) => new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format((Number(cents) || 0) / 100);

    const activate = (index) => {
      products.forEach((product) => product.classList.toggle('is-active', product.dataset.routineProduct === String(index)));
      hotspots.forEach((hotspot) => hotspot.classList.toggle('is-active', hotspot.dataset.routineHotspot === String(index)));
    };

    products.forEach((product) => {
      const index = product.dataset.routineProduct;
      product.addEventListener('mouseenter', () => activate(index));
      product.addEventListener('focusin', () => activate(index));
      product.querySelector('[data-routine-variant]')?.addEventListener('change', (event) => {
        const option = event.currentTarget.selectedOptions[0];
        const item = product.querySelector('[data-routine-item]');
        const price = product.querySelector('[data-routine-price]');
        if (item) {
          item.value = option.value;
          item.dataset.price = option.dataset.price;
        }
        if (price) price.textContent = formatMoney(option.dataset.price);
        const nextTotal = [...bundle.querySelectorAll('[data-routine-item]:checked')].reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
        if (total && nextTotal > 0) total.textContent = formatMoney(nextTotal);
      });
    });

    hotspots.forEach((hotspot) => {
      hotspot.addEventListener('mouseenter', () => activate(hotspot.dataset.routineHotspot));
      hotspot.addEventListener('focus', () => activate(hotspot.dataset.routineHotspot));
      hotspot.addEventListener('click', () => {
        const product = products.find((item) => item.dataset.routineProduct === hotspot.dataset.routineHotspot);
        activate(hotspot.dataset.routineHotspot);
        if (window.matchMedia('(max-width: 800px)').matches) product?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        product?.querySelector('a')?.focus({ preventScroll: true });
      });
    });

    addButton?.addEventListener('click', async () => {
      const items = [...bundle.querySelectorAll('[data-routine-item]:checked')].map((input) => ({
        id: Number(input.value),
        quantity: 1
      }));
      if (!items.length) return;
      const previous = addButton.innerHTML;
      addButton.disabled = true;
      addButton.textContent = 'Adding your routine...';
      if (status) status.textContent = '';
      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error('Unable to add routine');
        if (status) status.textContent = 'Your complete routine is in the bag.';
        document.querySelector('[data-cart-open]')?.click();
        setTimeout(() => window.location.reload(), 420);
      } catch (error) {
        console.error(error);
        addButton.disabled = false;
        addButton.innerHTML = previous;
        if (status) status.textContent = 'We could not add the routine. Please try again.';
      }
    });
  };

  document.querySelectorAll('[data-psr-platform]').forEach(setupPlatform);
  document.querySelectorAll('[data-routine-demo]').forEach(setupRoutine);
  document.querySelectorAll('[data-psr-routine-bundle]').forEach(setupRoutineBundle);
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-psr-routine-bundle]').forEach(setupRoutineBundle);
  });
})();
