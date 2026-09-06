(() => {
  const root = document.querySelector('[data-ps-acne]');
  if (!root) return;

  const toggle = root.querySelector('[data-acne-routine-toggle]');
  const panels = [...root.querySelectorAll('[data-acne-routine-panel]')];
  if (!toggle || !panels.length) return;

  const buttons = [...toggle.querySelectorAll('button[data-acne-routine]')];

  const activate = (key) => {
    buttons.forEach((btn) => {
      const on = btn.dataset.acneRoutine === key;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      const on = panel.dataset.acneRoutinePanel === key;
      panel.hidden = !on;
    });
  };

  toggle.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-acne-routine]');
    if (!btn) return;
    activate(btn.dataset.acneRoutine);
  });
})();
