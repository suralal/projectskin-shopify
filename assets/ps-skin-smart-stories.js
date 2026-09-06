(() => {
  const reducedMotion = () =>
    window.PurityTheme?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observeReveal = (root) => {
    const nodes = root.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    nodes.forEach((n) => io.observe(n));
  };

  const CITIES = [
    {
      c: 'Delhi',
      uv: 8.4,
      hum: 41,
      pm: 112,
      water: 340,
      swing: 88,
      h: 'Dry air + heavy pollution — your barrier works overtime.',
      p: 'Low humidity pulls water out faster than you replace it. Particulate crosses the barrier and burns through your antioxidant reserve — why SPF alone is not enough here.',
      chips: ['Barrier support', 'Gentle cleanse', 'Daily SPF', 'Antioxidant treat'],
    },
    {
      c: 'Jaipur',
      uv: 9.3,
      hum: 33,
      pm: 95,
      water: 460,
      swing: 82,
      h: 'The toughest combo on this map.',
      p: 'Very dry, very hard water, high particulate. Every wash can strip further — moisturiser is not optional, and cleanser choice matters more than actives.',
      chips: ['Hard-water mindful cleanse', 'Rich moisturise', 'High UV protect', 'Barrier repair'],
    },
    {
      c: 'Kolkata',
      uv: 8.2,
      hum: 76,
      pm: 88,
      water: 180,
      swing: 68,
      h: 'Humid and polluted at once — rare, and rough on pores.',
      p: 'Sweat and particulate sit on skin for hours. Congestion here is often environmental, not just hormonal — which is why your Mumbai friend’s routine may not translate.',
      chips: ['Congestion care', 'Lightweight moisturise', 'Thorough cleanse', 'Daily SPF'],
    },
    {
      c: 'Mumbai',
      uv: 9.1,
      hum: 79,
      pm: 48,
      water: 130,
      swing: 55,
      h: 'High humidity thins sebum — monsoon congestion is real.',
      p: 'Above ~75% humidity, oil spreads instead of sitting in pores. Treat + protect still matter; heavy creams often make things worse in monsoon.',
      chips: ['Oil-aware treat', 'Light gel moisturise', 'UV every day', 'Non-stripping cleanse'],
    },
    {
      c: 'Hyderabad',
      uv: 9.0,
      hum: 54,
      pm: 52,
      water: 300,
      swing: 62,
      h: 'Nothing extreme — which is why it gets ignored.',
      p: 'Moderate hardness and particulate still degrade the barrier quietly. Consistency beats intensity; don’t wait for a flare-up to fix the basics.',
      chips: ['Steady four-step', 'Barrier basics', 'SPF habit', 'Measured actives'],
    },
    {
      c: 'Bengaluru',
      uv: 9.0,
      hum: 60,
      pm: 38,
      water: 250,
      swing: 45,
      h: 'Moderate on paper. Volatile in practice.',
      p: 'Dry office AC to humid evenings in one day — your barrier never settles. A stable four-step routine matters more than chasing new actives every month.',
      chips: ['Stable moisturise', 'AC + outdoor buffer', 'Daily protect', 'Simple sequence'],
    },
    {
      c: 'Chennai',
      uv: 9.8,
      hum: 74,
      pm: 42,
      water: 410,
      swing: 48,
      h: 'Hard water + year-round UV — double stress every wash.',
      p: 'Calcium and magnesium bind to surfactants and leave residue that disrupts lipids. Pair a gentle cleanse with daily photoprotection — texture is the long game here.',
      chips: ['Hard-water cleanse', 'Texture support', 'UVA-forward SPF', 'Lipid restore'],
    },
    {
      c: 'Kochi',
      uv: 9.2,
      hum: 83,
      pm: 24,
      water: 95,
      swing: 32,
      h: 'Clean air and soft water — but UV never clocks out.',
      p: 'Environmental factors are on your side except photoprotection. UV stays high nearly year-round; skipping SPF is the fastest way to undo good treat steps.',
      chips: ['SPF non-negotiable', 'Humidity-light moisturise', 'Gentle cleanse', 'Tone support'],
    },
  ];

  const SEASON_MOD = {
    live: { uv: 1, hum: 1, pm: 1, water: 1, swing: 1 },
    annual: { uv: 1, hum: 1, pm: 1, water: 1, swing: 1 },
    monsoon: { uv: 0.93, hum: 1.2, pm: 0.82, water: 0.98, swing: 0.72 },
    winter: { uv: 0.9, hum: 0.78, pm: 1.18, water: 1.02, swing: 1.15 },
  };

  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

  const axisLoad = {
    uv: (c) => clamp((c.uv - 5) / 7),
    pm: (c) => clamp(c.pm / 130),
    hum: (c) => clamp(Math.abs(c.hum - 57) / 43),
    water: (c) => clamp(c.water / 480),
    swing: (c) => clamp(c.swing / 100),
  };

  const axisLabel = {
    uv: (c) => c.uv.toFixed(1),
    pm: (c) => `${Math.round(c.pm)} µg/m³`,
    hum: (c) => `${Math.round(c.hum)}%`,
    water: (c) => `${Math.round(c.water)} ppm`,
    swing: (c) => `${Math.round(c.swing)}`,
  };

  class PsStoryConsult extends HTMLElement {
    connectedCallback() {
      this.classList.add('is-ready');
      observeReveal(this);
      this.panels = [...this.querySelectorAll('[data-sc-panel]')];
      this.buttons = [...this.querySelectorAll('[data-sc-jump]')];
      this.progress = this.querySelector('[data-sc-progress]');
      this.index = 0;
      this.buttons.forEach((btn) => {
        btn.addEventListener('click', () => this.go(Number(btn.dataset.scJump)));
      });
      this.querySelector('[data-sc-start]')?.addEventListener('click', () => {
        this.querySelector('[data-sc-nav]')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        this.go(0);
      });
      this.updateProgress();
    }

    go(i) {
      if (!this.panels[i]) return;
      this.index = i;
      this.panels.forEach((p, idx) => p.classList.toggle('is-active', idx === i));
      this.buttons.forEach((b, idx) => b.classList.toggle('is-active', idx === i));
      this.updateProgress();
    }

    updateProgress() {
      if (!this.progress || !this.panels.length) return;
      const pct = ((this.index + 1) / this.panels.length) * 100;
      this.progress.style.width = `${pct}%`;
    }
  }

  class PsStoryClimate extends HTMLElement {
    connectedCallback() {
      observeReveal(this);
      this.city = 'Delhi';
      this.season = 'annual';
      this.copy = this.querySelector('.ps-scl__story-copy');
      this.cityLabel = this.querySelector('[data-scl-city-label]');
      this.headline = this.querySelector('[data-scl-headline]');
      this.body = this.querySelector('[data-scl-body]');
      this.chips = this.querySelector('[data-scl-chips]');
      this.meters = [...this.querySelectorAll('.ps-scl__meter')];

      this.querySelectorAll('[data-city]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.city = btn.dataset.city;
          this.querySelectorAll('[data-city]').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          this.render();
        });
      });

      this.querySelectorAll('[data-season]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.season = btn.dataset.season;
          this.querySelectorAll('[data-season]').forEach((b) => b.classList.toggle('is-active', b === btn));
          this.render();
        });
      });

      this.render();
    }

    cityData() {
      const base = CITIES.find((x) => x.c === this.city) || CITIES[0];
      const liveData = window.PsClimate?.getCachedLiveData?.();
      const live = liveData?.[base.c.toLowerCase()];
      if (live && (this.season === 'live' || !SEASON_MOD[this.season])) {
        return {
          ...base,
          uv: live.uv,
          hum: live.hum,
          pm: live.pm,
          water: live.water,
          swing: live.swing,
        };
      }
      const mod = SEASON_MOD[this.season] || SEASON_MOD.annual;
      return {
        ...base,
        uv: base.uv * mod.uv,
        hum: base.hum * mod.hum,
        pm: base.pm * mod.pm,
        water: base.water * mod.water,
        swing: base.swing * mod.swing,
      };
    }

    render() {
      const data = this.cityData();
      if (this.copy) {
        this.copy.classList.remove('is-swap');
        void this.copy.offsetWidth;
        this.copy.classList.add('is-swap');
      }
      if (this.cityLabel) this.cityLabel.textContent = data.c;
      if (this.headline) this.headline.textContent = data.h;
      if (this.body) this.body.textContent = data.p;

      this.meters.forEach((meter) => {
        const axis = meter.dataset.axis;
        const bar = meter.querySelector('[data-scl-bar]');
        const val = meter.querySelector('[data-scl-val]');
        const load = axisLoad[axis]?.(data) ?? 0;
        if (bar) bar.style.width = `${Math.round(load * 100)}%`;
        if (val) val.textContent = axisLabel[axis]?.(data) ?? '—';
      });

      if (this.chips) {
        this.chips.innerHTML = '';
        data.chips.forEach((chip, i) => {
          const el = document.createElement('span');
          el.className = 'ps-scl__chip';
          el.style.animationDelay = `${80 + i * 70}ms`;
          el.textContent = chip;
          this.chips.appendChild(el);
        });
      }

      try {
        localStorage.setItem(
          'ps-climate-profile-v1',
          JSON.stringify({ city: data.c, season: this.season, savedAt: Date.now() })
        );
      } catch (_) {
        /* ignore */
      }
    }
  }

  const ROUTINE_COPY = {
    oil: {
      title: 'Oil-aware, not oil-obsessed.',
      story:
        'You asked for less shine without stripping. The sequence keeps cleanse gentle, treat focused on oil and pores, moisturise light, and SPF non-negotiable.',
    },
    congestion: {
      title: 'Clear the path, then protect it.',
      story:
        'Congestion often starts with residue and climate — not “dirty skin.” Cleanse thoroughly, treat with honesty, moisturise lightly, protect daily.',
    },
    marks: {
      title: 'Tone is a long game.',
      story:
        'Marks fade with consistent treat + daily UVA protection. This sequence keeps the barrier calm so niacinamide can do its work.',
    },
    barrier: {
      title: 'Repair first. Then refine.',
      story:
        'When skin feels tight or reactive, intensity is the wrong instinct. Soft cleanse, measured treat, calming moisturise, faithful SPF.',
    },
  };

  const CLIMATE_NOTE = {
    dry: 'Your environment leans dry — moisturise is structural, not optional.',
    humid: 'Humidity is high — keep moisturise light and treat congestion-aware.',
    polluted: 'Particulate load is high — cleanse and antioxidant support matter more.',
    mixed: 'Your day swings — a stable four-step beats chasing new products.',
  };

  class PsStoryRoutine extends HTMLElement {
    connectedCallback() {
      observeReveal(this);
      this.state = { concern: null, climate: null, pace: null };
      this.order = ['concern', 'climate', 'pace', 'result'];
      this.step = -1; // intro
      this.hero = this.querySelector('[data-sr-screen="intro"]');
      this.shell = this.querySelector('[data-sr-shell]');
      this.progress = this.querySelector('[data-sr-progress]');
      this.stepLabel = this.querySelector('[data-sr-step-label]');
      this.back = this.querySelector('[data-sr-back]');

      this.querySelector('[data-sr-begin]')?.addEventListener('click', () => this.openQuiz());
      this.querySelector('[data-sr-restart]')?.addEventListener('click', () => this.restart());
      this.back?.addEventListener('click', () => this.prev());

      this.querySelectorAll('[data-sr-options]').forEach((group) => {
        const key = group.dataset.srOptions;
        group.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', () => {
            group.querySelectorAll('button').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            this.state[key] = btn.dataset.value;
            window.setTimeout(() => this.next(), reducedMotion() ? 0 : 220);
          });
        });
      });
    }

    openQuiz() {
      this.hero?.classList.add('is-hidden');
      this.shell?.classList.remove('is-hidden');
      this.step = 0;
      this.showStep();
    }

    restart() {
      this.state = { concern: null, climate: null, pace: null };
      this.querySelectorAll('[data-sr-options] button').forEach((b) => b.classList.remove('is-selected'));
      this.step = 0;
      this.showStep();
    }

    next() {
      if (this.step < this.order.length - 1) {
        this.step += 1;
        this.showStep();
      }
    }

    prev() {
      if (this.step <= 0) {
        this.shell?.classList.add('is-hidden');
        this.hero?.classList.remove('is-hidden');
        this.step = -1;
        return;
      }
      this.step -= 1;
      this.showStep();
    }

    showStep() {
      const name = this.order[this.step];
      this.querySelectorAll('.ps-sr__screen').forEach((screen) => {
        const match = screen.dataset.srScreen === name;
        screen.hidden = !match;
        screen.classList.toggle('is-show', match && name === 'result');
      });

      const quizSteps = 3;
      const atResult = name === 'result';
      if (this.stepLabel) {
        this.stepLabel.textContent = atResult ? 'Your plan' : `Question ${this.step + 1} of ${quizSteps}`;
      }
      if (this.progress) {
        const pct = atResult ? 100 : ((this.step + 1) / quizSteps) * 100;
        this.progress.style.width = `${pct}%`;
      }
      if (this.back) this.back.hidden = this.step < 0;

      if (atResult) this.renderResult();
    }

    renderResult() {
      const concern = this.state.concern || 'barrier';
      const climate = this.state.climate || 'mixed';
      const pace = this.state.pace || 'core';
      const pack = ROUTINE_COPY[concern] || ROUTINE_COPY.barrier;
      const title = this.querySelector('[data-sr-result-title]');
      const story = this.querySelector('[data-sr-result-story]');
      if (title) title.textContent = pack.title;

      let paceLine = 'A clear four-step keeps the barrier honest without overload.';
      if (pace === 'minimal') paceLine = 'You chose minimal — start with cleanse + protect, then add treat when ready.';
      if (pace === 'focused') paceLine = 'You chose focused care — keep the four steps, and add Clear Seal only on active spots.';

      if (story) {
        story.textContent = `${pack.story} ${CLIMATE_NOTE[climate] || ''} ${paceLine}`;
      }

      const steps = this.querySelector('[data-sr-steps]');
      if (steps) {
        steps.querySelectorAll('li').forEach((li) => {
          li.style.animation = 'none';
          void li.offsetWidth;
          li.style.animation = '';
        });
      }
    }
  }

  if (!customElements.get('ps-story-consult')) customElements.define('ps-story-consult', PsStoryConsult);
  if (!customElements.get('ps-story-climate')) customElements.define('ps-story-climate', PsStoryClimate);
  if (!customElements.get('ps-story-routine')) customElements.define('ps-story-routine', PsStoryRoutine);
})();
