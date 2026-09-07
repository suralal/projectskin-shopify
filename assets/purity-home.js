(() => {
  const reducedMotion = () => window.PurityTheme?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

  class PuritySlider extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.track = this.querySelector('[data-ps-track]');
      this.slides = [...this.querySelectorAll('[data-ps-slide]')];
      this.dots = [...this.querySelectorAll('[data-ps-dot]')];
      this.index = 0;
      this.timer = null;
      this.startX = null;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.querySelector('[data-ps-prev]')?.addEventListener('click', () => this.go(this.index - 1, true), { signal });
      this.querySelector('[data-ps-next]')?.addEventListener('click', () => this.go(this.index + 1, true), { signal });
      this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.go(index, true), { signal }));
      this.addEventListener('pointerdown', (event) => { this.startX = event.clientX; }, { signal });
      this.addEventListener('pointerup', (event) => {
        if (this.startX === null) return;
        const distance = event.clientX - this.startX;
        if (Math.abs(distance) > 45) this.go(this.index + (distance < 0 ? 1 : -1), true);
        this.startX = null;
      }, { signal });
      this.addEventListener('mouseenter', () => this.stop(), { signal });
      this.addEventListener('mouseleave', () => this.play(), { signal });
      this.addEventListener('focusin', () => this.stop(), { signal });
      this.addEventListener('focusout', () => this.play(), { signal });
      this.go(0);
      this.play();
      if (this.classList.contains('ps-promo-banner__slider')) {
        this.syncPromoBoardHeight();
        window.addEventListener('resize', () => this.syncPromoBoardHeight(), { signal, passive: true });
      }
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.stop();
      this.initialized = false;
    }

    go(nextIndex, restart = false) {
      if (!this.track || !this.slides.length) return;
      this.index = (nextIndex + this.slides.length) % this.slides.length;
      this.track.style.transform = `translate3d(${-this.index * 100}%, 0, 0)`;
      this.slides.forEach((slide, index) => {
        slide.toggleAttribute('inert', index !== this.index);
        slide.setAttribute('aria-hidden', String(index !== this.index));
      });
      if (this.classList.contains('ps-hero-slider') || this.classList.contains('ps-promo-banner__slider')) {
        const activeSlide = this.slides[this.index];
        const palette = activeSlide?.dataset.heroPalette || 'neutral';
        this.dataset.activeTone = activeSlide?.dataset.heroTone || 'light';
        this.dataset.activePalette = palette;
        const hero = this.closest('.ps-hero, .ps-promo-banner');
        if (hero) hero.dataset.activePalette = palette;
        if (this.dataset.adaptivePalette === 'true') {
          document.querySelectorAll('[data-follow-hero-palette="true"]').forEach((section) => {
            section.dataset.activePalette = palette;
          });
        }
      }
      this.dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === this.index);
        dot.setAttribute('aria-current', index === this.index ? 'true' : 'false');
      });
      if (this.classList.contains('ps-promo-banner__slider')) {
        this.syncPromoBoardHeight();
      }
      if (restart) {
        this.stop();
        this.play();
      }
    }

    syncPromoBoardHeight() {
      const board = this.querySelector('.ps-promo-banner__board');
      if (!board) return;
      if (window.innerWidth <= 989) {
        board.style.height = '';
        return;
      }

      const active = this.slides[this.index] || this.slides[0];
      const img = active?.querySelector('.ps-promo-banner__media img');
      if (!img) return;

      const applyNatural = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const width = board.clientWidth || img.clientWidth;
        if (!width) return;
        const height = Math.round(width * (img.naturalHeight / img.naturalWidth));
        board.style.height = `${height}px`;
      };

      if (img.complete && img.naturalWidth) {
        applyNatural();
      } else {
        img.addEventListener('load', applyNatural, { once: true });
      }
    }

    play() {
      if (reducedMotion() || this.dataset.autoplay !== 'true' || this.slides.length < 2 || this.timer) return;
      this.timer = setInterval(() => this.go(this.index + 1), Number(this.dataset.interval) || 5000);
    }

    stop() {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  class PurityTabs extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.tabs = [...this.querySelectorAll('[role="tab"]')];
      this.panels = [...this.querySelectorAll('[role="tabpanel"]')];
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => this.select(index), { signal });
        tab.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
          if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.tabs.length - 1;
          this.select(next, true);
        }, { signal });
      });
      const initial = Math.max(0, this.tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
      this.select(initial);
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.initialized = false;
    }

    select(selected, focus = false) {
      this.tabs.forEach((tab, index) => {
        const active = index === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        tab.classList.toggle('is-active', active);
      });
      this.panels.forEach((panel, index) => {
        const active = index === selected;
        panel.hidden = !active;
        if (active) requestAnimationFrame(() => panel.querySelectorAll('purity-product-carousel').forEach((carousel) => carousel.reset()));
      });
      if (focus) this.tabs[selected]?.focus();
      this.dispatchEvent(new CustomEvent('purity:tab-change', { bubbles: true, detail: { index: selected } }));
    }
  }

  class PurityProductCarousel extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.viewport = this.querySelector('[data-product-carousel-viewport]');
      this.track = this.querySelector('[data-product-carousel-track]');
      this.previousButton = this.querySelector('[data-product-carousel-prev]');
      this.nextButton = this.querySelector('[data-product-carousel-next]');
      if (!this.viewport || !this.track) return;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.previousButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.move(-1);
      }, { signal });
      this.nextButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.move(1);
      }, { signal });
      this.viewport.addEventListener('scroll', () => this.queueUpdate(), { passive: true, signal });
      this.addEventListener('pointerover', () => {
        this.classList.add('is-hovered');
      }, { signal });
      this.addEventListener('pointerout', (event) => {
        if (!this.contains(event.relatedTarget)) this.classList.remove('is-hovered');
      }, { signal });
      this.resizeObserver = new ResizeObserver(() => this.queueUpdate());
      this.resizeObserver.observe(this.viewport);
      this.queueUpdate();
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.resizeObserver?.disconnect();
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.initialized = false;
    }

    move(direction) {
      const firstCard = this.track.firstElementChild;
      if (!firstCard) return;
      const gap = Number.parseFloat(getComputedStyle(this.track).columnGap) || 0;
      const distance = firstCard.getBoundingClientRect().width + gap;
      this.viewport.scrollBy({ left: direction * distance, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    reset() {
      if (!this.viewport) return;
      this.viewport.scrollTo({ left: 0, behavior: 'auto' });
      this.queueUpdate();
    }

    queueUpdate() {
      if (this.animationFrame) return;
      this.animationFrame = requestAnimationFrame(() => {
        this.animationFrame = null;
        this.update();
      });
    }

    update() {
      if (!this.viewport) return;
      const maximum = Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
      const canScroll = maximum > 2;
      if (this.previousButton) {
        this.previousButton.hidden = !canScroll;
        this.previousButton.disabled = !canScroll || this.viewport.scrollLeft <= 2;
      }
      if (this.nextButton) {
        this.nextButton.hidden = !canScroll;
        this.nextButton.disabled = !canScroll || this.viewport.scrollLeft >= maximum - 2;
      }
    }
  }

  class PurityScrollScatter extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.cards = [...this.querySelectorAll('[data-ps-scatter-card]')];
      this.head = this.querySelector('[data-ps-scatter-head]');
      this.lead = this.querySelector('[data-ps-scatter-lead]');
      this.cta = this.querySelector('[data-ps-scatter-cta]');
      this.glow = this.querySelector('[data-ps-scatter-glow]');
      this.veil = this.querySelector('[data-ps-scatter-veil]');
      this.render = this.render.bind(this);

      if (reducedMotion() || this.classList.contains('ps-scatter--compact')) {
        this.renderReducedMotion();
        return;
      }

      this.render();
    }

    disconnectedCallback() {
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.initialized = false;
    }

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    lerp(start, end, progress) {
      return start + ((end - start) * progress);
    }

    ease(progress) {
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - (Math.pow(-2 * progress + 2, 3) / 2);
    }

    progress() {
      const total = this.offsetHeight - innerHeight;
      return total <= 0 ? 1 : this.clamp(-this.getBoundingClientRect().top / total, 0, 1);
    }

    render() {
      const progress = this.progress();
      const easedProgress = this.ease(progress);
      const viewportWidth = innerWidth;
      const viewportHeight = innerHeight;
      const endOverflow = viewportWidth <= 800 ? 1.2 : 1;

      this.cards.forEach((card) => {
        const data = card.dataset;
        const startX = Number(data.sx) * Math.min(viewportWidth, card.offsetWidth * 4.2);
        const endX = Number(data.fx) * viewportWidth * endOverflow;
        const x = this.lerp(startX, endX, easedProgress);
        const y = this.lerp(Number(data.sy), Number(data.fy) * endOverflow, easedProgress) * viewportHeight;
        const rotation = this.lerp(Number(data.sr), Number(data.fr), easedProgress);
        const endScale = Number(data.fs) * (viewportWidth < 576 ? 0.78 : 1);
        const scale = this.lerp(Number(data.ss), endScale, easedProgress);
        card.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      });

      this.renderContent(progress, viewportWidth);
      this.animationFrame = requestAnimationFrame(this.render);
    }

    renderContent(progress, viewportWidth) {
      if (this.head) {
        const headProgress = this.clamp(progress / 0.22, 0, 1);
        const headOffset = this.clamp(viewportWidth * 0.08, 32, 100);
        this.head.style.transform = `translateY(${this.lerp(-headOffset, 0, headProgress).toFixed(1)}px)`;
      }

      if (this.veil) {
        const veilProgress = this.clamp((progress - 0.08) / 0.24, 0, 1);
        this.veil.style.opacity = veilProgress.toFixed(3);
        this.veil.style.transform = `scale(${this.lerp(0.96, 1, veilProgress).toFixed(3)})`;
      }

      if (this.lead) {
        const leadProgress = this.clamp((progress - 0.42) / 0.22, 0, 1);
        this.lead.style.opacity = leadProgress.toFixed(3);
        this.lead.style.transform = `translateY(${this.lerp(14, 0, leadProgress).toFixed(1)}px)`;
      }

      if (this.cta) {
        const ctaProgress = this.clamp((progress - 0.56) / 0.22, 0, 1);
        this.cta.style.opacity = ctaProgress.toFixed(3);
        this.cta.style.transform = `translateY(${this.lerp(14, 0, ctaProgress).toFixed(1)}px)`;
      }

      if (this.glow) {
        const easedProgress = this.ease(progress);
        this.glow.style.opacity = (0.4 + easedProgress * 0.4).toFixed(2);
        this.glow.style.transform = `translate(-50%, -50%) scale(${(1 + easedProgress * 0.5).toFixed(3)})`;
      }
    }

    renderReducedMotion() {
      const viewportWidth = innerWidth;
      const viewportHeight = innerHeight;
      const endOverflow = viewportWidth <= 800 ? 1.2 : 1;

      this.cards.forEach((card) => {
        const data = card.dataset;
        const x = Number(data.fx) * viewportWidth * endOverflow;
        const y = Number(data.fy) * viewportHeight * endOverflow;
        card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${Number(data.fs)})`;
      });

      if (this.head) this.head.style.transform = 'translateY(0)';
      if (this.veil) {
        this.veil.style.opacity = '1';
        this.veil.style.transform = 'scale(1)';
      }
      if (this.lead) {
        this.lead.style.opacity = '1';
        this.lead.style.transform = 'translateY(0)';
      }
      if (this.cta) {
        this.cta.style.opacity = '1';
        this.cta.style.transform = 'translateY(0)';
      }
      if (this.glow) {
        this.glow.style.opacity = '0.8';
        this.glow.style.transform = 'translate(-50%, -50%) scale(1.5)';
      }
    }
  }

  class PurityQuiz extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.querySelectorAll('[data-quiz-option]').forEach((option) => {
        option.addEventListener('click', () => {
          this.querySelectorAll('[data-quiz-option]').forEach((item) => item.classList.remove('is-selected'));
          option.classList.add('is-selected');
          const result = this.querySelector('[data-quiz-result]');
          if (result) result.textContent = option.dataset.quizResult || result.dataset.defaultText || '';
        }, { signal });
      });
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.initialized = false;
    }
  }

  class PurityResultSpotlight extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.abortController = new AbortController();
      this.index = 0;
      this.tabs = [...this.querySelectorAll('[data-result-tab]')];
      this.images = [...this.querySelectorAll('[data-result-image]')];
      this.featureSets = [...this.querySelectorAll('[data-result-features]')];
      this.eyebrowEl = this.querySelector('[data-result-eyebrow]');
      this.headingPrefixEl = this.querySelector('[data-result-heading-prefix]');
      this.highlightTextEl = this.querySelector('[data-result-highlight-text]');
      this.highlightPath = this.querySelector('.ps-result__highlight path');
      this.descriptionEl = this.querySelector('[data-result-description]');
      this.ctaEl = this.querySelector('[data-result-cta]');
      this.bindTabs();
      this.setupReveal();
      addEventListener('resize', () => this.setupReveal(), {
        signal: this.abortController.signal,
        passive: true
      });
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.abortController?.abort();
      this.initialized = false;
    }

    bindTabs() {
      if (this.tabs.length < 2) return;
      const { signal } = this.abortController;

      this.tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const next = Number(tab.dataset.resultIndex || 0);
          this.select(next);
        }, { signal });

        tab.addEventListener('keydown', (event) => {
          const key = event.key;
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
          event.preventDefault();
          let next = this.index;
          if (key === 'ArrowLeft') next = (this.index - 1 + this.tabs.length) % this.tabs.length;
          if (key === 'ArrowRight') next = (this.index + 1) % this.tabs.length;
          if (key === 'Home') next = 0;
          if (key === 'End') next = this.tabs.length - 1;
          this.select(next, { focus: true });
        }, { signal });
      });
    }

    select(nextIndex, { focus = false } = {}) {
      if (nextIndex === this.index || nextIndex < 0 || nextIndex >= this.tabs.length) return;
      this.index = nextIndex;
      const tab = this.tabs[nextIndex];

      this.tabs.forEach((item, i) => {
        const active = i === nextIndex;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });

      this.images.forEach((slide, i) => {
        const active = i === nextIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });

      this.featureSets.forEach((set, i) => {
        const active = i === nextIndex;
        set.classList.toggle('is-active', active);
        set.toggleAttribute('hidden', !active);
      });

      this.updateCopy(tab);
      this.replayMotion();
      if (focus) tab.focus();
    }

    updateCopy(tab) {
      if (!tab) return;
      const eyebrow = tab.dataset.eyebrow || '';
      const heading = tab.dataset.heading || '';
      const highlight = tab.dataset.highlight || '';
      const description = tab.dataset.description || '';
      const ctaLabel = tab.dataset.ctaLabel || '';
      const ctaHref = tab.dataset.ctaHref || '';

      if (this.eyebrowEl) {
        this.eyebrowEl.textContent = eyebrow;
        this.eyebrowEl.toggleAttribute('hidden', !eyebrow);
      }

      if (this.headingPrefixEl) {
        const prefix = highlight && heading.includes(highlight)
          ? heading.replace(highlight, '').trim()
          : heading;
        this.headingPrefixEl.textContent = prefix ? `${prefix} ` : '';
      }

      if (this.highlightTextEl) {
        this.highlightTextEl.textContent = highlight || '';
      }

      if (this.descriptionEl) {
        this.descriptionEl.innerHTML = description ? `<p>${description}</p>` : '';
        this.descriptionEl.toggleAttribute('hidden', !description);
      }

      if (this.ctaEl) {
        if (ctaLabel) this.ctaEl.textContent = ctaLabel;
        if (ctaHref) this.ctaEl.setAttribute('href', ctaHref);
      }
    }

    replayMotion() {
      if (reducedMotion()) {
        this.classList.add('is-visible');
        return;
      }

      this.classList.remove('is-visible');
      if (this.highlightPath) {
        this.highlightPath.style.transition = 'none';
        this.highlightPath.style.strokeDashoffset = '260';
      }

      requestAnimationFrame(() => {
        if (this.highlightPath) {
          this.highlightPath.style.transition = '';
          this.highlightPath.style.strokeDashoffset = '';
        }
        this.classList.add('is-visible');
      });
    }

    setupReveal() {
      this.observer?.disconnect();
      if (reducedMotion() || window.Shopify?.designMode) {
        this.classList.add('is-visible');
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2)) return;
        this.classList.add('is-visible');
        this.observer.disconnect();
      }, { threshold: [0.2] });
      this.observer.observe(this);
    }
  }

  class PurityVideoRail extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector('video');
          if (!video) return;
          if (entry.isIntersecting && entry.intersectionRatio > 0.65 && !reducedMotion()) {
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { threshold: [0.1, 0.65] });
      this.querySelectorAll('[data-video-card]').forEach((card) => this.observer.observe(card));
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      this.initialized = false;
    }
  }

  class PurityRoutineBuilder extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.triggers = [...this.querySelectorAll('[data-routine-trigger]')];
      this.cards = [...this.querySelectorAll('[data-routine-card]')];
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      this.triggers.forEach((trigger, index) => {
        trigger.addEventListener('click', () => this.select(index, true), { signal });
        trigger.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === 'ArrowLeft') next = (index - 1 + this.triggers.length) % this.triggers.length;
          if (event.key === 'ArrowRight') next = (index + 1) % this.triggers.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.triggers.length - 1;
          this.select(next, true, true);
        }, { signal });
      });

      this.cards.forEach((card, index) => {
        card.addEventListener('pointerenter', () => this.select(index), { signal });
        card.addEventListener('focusin', () => this.select(index), { signal });
      });
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.initialized = false;
    }

    select(index, scroll = false, focus = false) {
      this.triggers.forEach((trigger, triggerIndex) => {
        const active = triggerIndex === index;
        trigger.classList.toggle('is-active', active);
        trigger.setAttribute('aria-pressed', String(active));
      });
      this.cards.forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === index));
      if (focus) this.triggers[index]?.focus();
      if (scroll && matchMedia('(max-width: 800px)').matches) {
        this.cards[index]?.scrollIntoView({
          behavior: reducedMotion() ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'start'
        });
      }
    }
  }

  class PurityIngredientExplorer extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.viewport = this.querySelector('[data-ingredient-viewport]');
      this.track = this.querySelector('[data-ingredient-track]');
      this.cards = [...this.querySelectorAll('.ps-ingredient')];
      this.triggers = [...this.querySelectorAll('[data-ingredient-trigger]')];
      this.previousButton = this.querySelector('[data-ingredient-prev]');
      this.nextButton = this.querySelector('[data-ingredient-next]');
      this.progress = this.querySelector('[data-ingredient-progress]');
      this.detail = this.querySelector('[data-ingredient-detail]');
      this.counterCurrent = this.querySelector('[data-ingredient-counter-current]');
      this.counterTotal = this.querySelector('[data-ingredient-counter-total]');
      this.activeIndex = 0;
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      if (this.counterTotal) this.counterTotal.textContent = String(this.triggers.length);

      this.previousButton?.addEventListener('click', () => this.move(-1), { signal });
      this.nextButton?.addEventListener('click', () => this.move(1), { signal });
      this.viewport?.addEventListener('scroll', () => this.queueUpdate(), { passive: true, signal });

      this.triggers.forEach((trigger, index) => {
        trigger.addEventListener('click', () => this.select(index, true), { signal });
        trigger.addEventListener('focus', () => this.select(index), { signal });
        trigger.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
          if (event.key === 'ArrowRight') next = Math.min(this.triggers.length - 1, index + 1);
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.triggers.length - 1;
          this.select(next, true, true);
        }, { signal });
      });

      this.resizeObserver = new ResizeObserver(() => this.queueUpdate());
      if (this.viewport) this.resizeObserver.observe(this.viewport);
      this.select(Math.max(0, this.triggers.findIndex((trigger) => trigger.getAttribute('aria-pressed') === 'true')));
      this.queueUpdate();
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.resizeObserver?.disconnect();
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      if (this.detailTimer) clearTimeout(this.detailTimer);
      this.initialized = false;
    }

    move(direction) {
      const next = Math.min(this.triggers.length - 1, Math.max(0, this.activeIndex + direction));
      if (next === this.activeIndex) return;
      this.select(next, true);
    }

    select(index, scroll = false, focus = false) {
      const trigger = this.triggers[index];
      if (!trigger) return;
      this.activeIndex = index;
      this.triggers.forEach((item, itemIndex) => item.setAttribute('aria-pressed', String(itemIndex === index)));
      this.cards.forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === index));
      if (this.counterCurrent) this.counterCurrent.textContent = String(index + 1);

      const fields = {
        role: trigger.dataset.ingredientRole,
        type: trigger.dataset.ingredientType,
        marker: trigger.dataset.ingredientMarker,
        title: trigger.dataset.ingredientTitle,
        summary: trigger.dataset.ingredientSummary,
        body: trigger.dataset.ingredientDetails
      };
      Object.entries(fields).forEach(([field, value]) => {
        const target = this.querySelector(`[data-ingredient-detail-${field}]`);
        if (target) target.textContent = value || '';
      });

      if (this.detail && !reducedMotion()) {
        this.detail.classList.remove('is-changing');
        requestAnimationFrame(() => this.detail?.classList.add('is-changing'));
        clearTimeout(this.detailTimer);
        this.detailTimer = setTimeout(() => this.detail?.classList.remove('is-changing'), 280);
      }
      if (scroll) {
        this.cards[index]?.scrollIntoView({
          behavior: reducedMotion() ? 'auto' : 'smooth',
          block: 'nearest',
          inline: index === 0 ? 'start' : 'nearest'
        });
      }
      if (focus) trigger.focus();
      this.queueUpdate();
    }

    queueUpdate() {
      if (this.animationFrame) return;
      this.animationFrame = requestAnimationFrame(() => {
        this.animationFrame = null;
        this.update();
      });
    }

    update() {
      if (!this.viewport) return;
      const maximum = Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
      const canScroll = maximum > 2;
      if (this.previousButton) this.previousButton.disabled = this.activeIndex <= 0;
      if (this.nextButton) this.nextButton.disabled = this.activeIndex >= this.triggers.length - 1;
      if (!this.progress) return;
      const thumbWidth = canScroll ? Math.max(18, (this.viewport.clientWidth / this.viewport.scrollWidth) * 100) : 100;
      const left = canScroll ? (this.viewport.scrollLeft / maximum) * (100 - thumbWidth) : 0;
      this.progress.style.width = `${thumbWidth}%`;
      this.progress.style.left = `${left}%`;
    }
  }

  class PurityCardGallery extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.slides = [...this.querySelectorAll('[data-card-gallery-slide]')];
      if (this.slides.length < 2) return;
      this.initialized = true;
      this.index = Math.max(0, this.slides.findIndex((slide) => slide.classList.contains('is-active')));
      if (this.index < 0) this.index = 0;
      this.previousButton = this.querySelector('[data-card-gallery-prev]');
      this.nextButton = this.querySelector('[data-card-gallery-next]');
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      // Slides past the first ship without a src. Pull them in on intent so the
      // card costs one image on load instead of up to ten.
      const hydrateNeighbours = () => {
        this.hydrate(this.index + 1);
        this.hydrate(this.index - 1);
      };
      this.addEventListener('pointerenter', hydrateNeighbours, { once: true, signal });
      this.addEventListener('focusin', hydrateNeighbours, { once: true, signal });
      this.addEventListener('touchstart', hydrateNeighbours, { once: true, passive: true, signal });

      this.previousButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.goTo(this.index - 1);
      }, { signal });
      this.nextButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.goTo(this.index + 1);
      }, { signal });

      let touchStartX = 0;
      let touchStartY = 0;
      this.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true, signal });
      this.addEventListener('touchend', (event) => {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) < 36 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        this.goTo(this.index + (deltaX < 0 ? 1 : -1));
      }, { passive: true, signal });

      this.render();
    }

    disconnectedCallback() {
      this.abortController?.abort();
      this.initialized = false;
    }

    hydrate(index) {
      const total = this.slides?.length;
      if (!total) return;
      const slide = this.slides[((index % total) + total) % total];
      if (!slide || slide.dataset.hydrated === 'true') return;
      slide.dataset.hydrated = 'true';
      if (slide.dataset.sizes) slide.sizes = slide.dataset.sizes;
      if (slide.dataset.srcset) slide.srcset = slide.dataset.srcset;
      if (slide.dataset.src) slide.src = slide.dataset.src;
    }

    goTo(nextIndex) {
      const total = this.slides.length;
      if (!total) return;
      const wrapped = ((nextIndex % total) + total) % total;
      if (wrapped === this.index) return;
      this.index = wrapped;
      this.hydrate(this.index);
      this.hydrate(this.index + 1);
      this.render();
    }

    render() {
      this.hydrate(this.index);
      this.slides.forEach((slide, index) => {
        const active = index === this.index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
    }
  }

  class PsFormulaEarn extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      const catalogNode = this.querySelector('[data-earn-catalog]');
      try {
        this.catalog = JSON.parse(catalogNode?.textContent || '[]');
      } catch (_error) {
        this.catalog = [];
      }
      this.tabs = [...this.querySelectorAll('[data-earn-tab]')];
      this.mol = this.querySelector('[data-earn-mol]');
      this.cap = this.querySelector('[data-earn-cap]');
      this.nameEl = this.querySelector('[data-earn-name]');
      this.inciEl = this.querySelector('[data-earn-inci]');
      this.mechEl = this.querySelector('[data-earn-mech]');
      this.noteEl = this.querySelector('[data-earn-note]');
      this.bandEl = this.querySelector('[data-earn-band]');
      this.markEl = this.querySelector('[data-earn-mark]');
      this.bandLabel = this.querySelector('[data-earn-band-label]');
      this.axMid = this.querySelector('[data-earn-ax-mid]');
      this.axMax = this.querySelector('[data-earn-ax-max]');
      this.inEl = this.querySelector('[data-earn-in]');
      this.panel = this.querySelector('[data-earn-panel]');

      this.tabs.forEach((tab) => {
        tab.addEventListener('click', () => this.select(Number(tab.dataset.index || 0)));
        tab.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let next = Number(tab.dataset.index || 0);
          if (event.key === 'ArrowLeft') next = Math.max(0, next - 1);
          if (event.key === 'ArrowRight') next = Math.min(this.tabs.length - 1, next + 1);
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.tabs.length - 1;
          this.select(next, true);
        });
      });

      this.select(0);
    }

    molecules() {
      return {
        niacinamide: {
          atoms: [[76, 60, ''], [44, 79, 'N'], [44, 117, ''], [76, 136, ''], [108, 117, ''], [108, 79, ''], [140, 60, ''], [140, 26, 'O'], [172, 79, 'N']],
          bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1], [5, 6, 1], [6, 7, 2], [6, 8, 1]]
        },
        salicylic: {
          atoms: [[76, 64, ''], [44, 83, ''], [44, 121, ''], [76, 140, ''], [108, 121, ''], [108, 83, ''], [76, 26, 'O'], [140, 64, ''], [140, 26, 'O'], [172, 83, 'O']],
          bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1], [0, 6, 1], [5, 7, 1], [7, 8, 2], [7, 9, 1]]
        },
        zinc: {
          atoms: [[62, 104, 'Zn'], [118, 74, 'N'], [150, 52, ''], [178, 74, ''], [168, 110, ''], [130, 110, ''], [196, 46, 'O'], [110, 140, 'O']],
          bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 1, 1], [3, 6, 2], [0, 7, 1], [5, 7, 1]]
        },
        glycolic: {
          atoms: [[48, 112, 'O'], [86, 90, ''], [124, 112, ''], [124, 152, 'O'], [162, 90, 'O']],
          bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]]
        },
        ceramides: {
          atoms: [[34, 84, 'O'], [62, 106, ''], [62, 146, 'N'], [92, 84, ''], [122, 106, ''], [152, 84, ''], [182, 106, ''], [92, 168, ''], [122, 146, ''], [152, 168, '']],
          bonds: [[0, 1, 2], [1, 2, 1], [1, 3, 1], [3, 4, 1], [4, 5, 1], [5, 6, 1], [2, 7, 1], [7, 8, 1], [8, 9, 1]]
        },
        tinosorb: {
          atoms: [[110, 84, 'N'], [142, 66, ''], [174, 84, 'N'], [174, 120, ''], [142, 138, 'N'], [110, 120, ''], [142, 28, ''], [206, 66, ''], [142, 176, ''], [78, 66, 'O'], [206, 138, 'O']],
          bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1], [1, 6, 1], [2, 7, 1], [4, 8, 1], [5, 9, 1], [3, 10, 1]]
        }
      };
    }

    select(index, focus = false) {
      const item = this.catalog[index];
      if (!item) return;
      this.tabs.forEach((tab, tabIndex) => {
        tab.setAttribute('aria-selected', String(tabIndex === index));
      });
      if (this.panel && this.tabs[index]) {
        this.panel.setAttribute('aria-labelledby', this.tabs[index].id);
      }
      if (focus) this.tabs[index]?.focus();

      this.nameEl && (this.nameEl.textContent = item.name || '');
      this.inciEl && (this.inciEl.textContent = item.inci || '');
      this.mechEl && (this.mechEl.textContent = item.mechanism || '');
      this.noteEl && (this.noteEl.textContent = item.note || '');
      this.cap && (this.cap.textContent = item.caption || '');

      const dose = Number(item.dose) || 0;
      const bandMin = Number(item.bandMin) || 0;
      const bandMax = Number(item.bandMax) || 0;
      const scaleMax = Math.max(Number(item.scaleMax) || 10, bandMax, dose, 1);
      if (this.bandEl) {
        this.bandEl.style.left = `${(bandMin / scaleMax) * 100}%`;
        this.bandEl.style.width = `${Math.max(0, ((bandMax - bandMin) / scaleMax) * 100)}%`;
      }
      if (this.markEl) {
        this.markEl.style.left = `${(dose / scaleMax) * 100}%`;
        this.markEl.dataset.v = `${dose}%`;
      }
      if (this.bandLabel) this.bandLabel.textContent = `Evidence range ${bandMin}–${bandMax}%`;
      if (this.axMid) this.axMid.textContent = `${scaleMax / 2}%`;
      if (this.axMax) this.axMax.textContent = `${scaleMax}%`;

      const products = String(item.products || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      if (this.inEl) {
        this.inEl.innerHTML = products.length
          ? `<b>Formulated into</b>${products.map((name) => `<span>${name}</span>`).join('')}`
          : '';
      }

      this.renderMolecule(item.molecule || 'niacinamide');
    }

    renderMolecule(key) {
      if (!this.mol) return;
      const schema = this.molecules()[key] || this.molecules().niacinamide;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.mol.innerHTML = '';
      schema.bonds.forEach((bond, bondIndex) => {
        const a = schema.atoms[bond[0]];
        const c = schema.atoms[bond[1]];
        const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const offset = bond[2] === 2 ? 2.6 : 0;
        const copies = bond[2] === 2 ? 2 : 1;
        for (let copy = 0; copy < copies; copy += 1) {
          const shift = copy ? offset : -offset;
          const angle = Math.atan2(c[1] - a[1], c[0] - a[0]);
          const dx = Math.sin(angle) * shift;
          const dy = -Math.cos(angle) * shift;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('class', 'bond');
          line.setAttribute('x1', String(a[0] + dx));
          line.setAttribute('y1', String(a[1] + dy));
          line.setAttribute('x2', String(c[0] + dx));
          line.setAttribute('y2', String(c[1] + dy));
          line.style.setProperty('--L', String(length));
          if (!reduce) line.style.animationDelay = `${bondIndex * 0.05}s`;
          this.mol.appendChild(line);
        }
      });
      schema.atoms.forEach((atom, atomIndex) => {
        if (!atom[2]) return;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'atom');
        group.style.transformOrigin = `${atom[0]}px ${atom[1]}px`;
        if (!reduce) group.style.animationDelay = `${0.25 + atomIndex * 0.05}s`;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(atom[0]));
        circle.setAttribute('cy', String(atom[1]));
        circle.setAttribute('r', '11');
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(atom[0]));
        text.setAttribute('y', String(atom[1]));
        text.textContent = atom[2];
        group.appendChild(circle);
        group.appendChild(text);
        this.mol.appendChild(group);
      });
    }
  }

  if (!customElements.get('purity-slider')) customElements.define('purity-slider', PuritySlider);
  if (!customElements.get('purity-tabs')) customElements.define('purity-tabs', PurityTabs);
  if (!customElements.get('purity-product-carousel')) customElements.define('purity-product-carousel', PurityProductCarousel);
  if (!customElements.get('purity-card-gallery')) customElements.define('purity-card-gallery', PurityCardGallery);
  if (!customElements.get('purity-scroll-scatter')) customElements.define('purity-scroll-scatter', PurityScrollScatter);
  if (!customElements.get('purity-result-spotlight')) customElements.define('purity-result-spotlight', PurityResultSpotlight);
  if (!customElements.get('purity-quiz')) customElements.define('purity-quiz', PurityQuiz);
  if (!customElements.get('purity-video-rail')) customElements.define('purity-video-rail', PurityVideoRail);
  if (!customElements.get('purity-routine-builder')) customElements.define('purity-routine-builder', PurityRoutineBuilder);
  if (!customElements.get('purity-ingredient-explorer')) customElements.define('purity-ingredient-explorer', PurityIngredientExplorer);
  if (!customElements.get('ps-formula-earn')) customElements.define('ps-formula-earn', PsFormulaEarn);

  const initMegaMenus = (scope = document) => {
    scope.querySelectorAll('[data-mega-menu-item]:not([data-mega-ready])').forEach((item) => {
      const trigger = item.querySelector('[data-mega-trigger]');
      const panel = item.querySelector('[data-mega-panel]');
      if (!trigger || !panel) return;

      item.dataset.megaReady = 'true';
      let closeTimer = null;

      const open = () => {
        clearTimeout(closeTimer);
        document.querySelectorAll('[data-mega-menu-item].is-open').forEach((openItem) => {
          if (openItem === item) return;
          openItem.classList.remove('is-open');
          openItem.querySelector('[data-mega-trigger]')?.setAttribute('aria-expanded', 'false');
          openItem.querySelector('[data-mega-panel]')?.setAttribute('aria-hidden', 'true');
        });
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');
        panel.querySelectorAll('purity-product-carousel').forEach((carousel) => {
          if (typeof carousel.queueUpdate === 'function') carousel.queueUpdate();
        });
      };

      const close = () => {
        clearTimeout(closeTimer);
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
      };

      const scheduleClose = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(close, 130);
      };

      item.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        open();
      });
      item.addEventListener('pointerleave', (event) => {
        if (event.pointerType === 'touch') return;
        scheduleClose();
      });
      item.addEventListener('focusin', open);
      item.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!item.contains(document.activeElement)) scheduleClose();
        });
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        close();
        trigger.focus();
      });
    });
  };

  initMegaMenus();
  document.addEventListener('shopify:section:load', (event) => initMegaMenus(event.target));

  // Instagram strip: the reels ship with no source and no autoplay. Attach the
  // file and start playback only when the strip is actually on screen, and stop
  // again when it leaves. The section sits at the foot of the page, so most
  // visits never download the video at all.
  const initGramVideos = (scope = document) => {
    const videos = [...scope.querySelectorAll('[data-gram-video]:not([data-gram-ready])')];
    if (!videos.length) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduceMotion?.matches) {
      // Posters already render; leave them as stills.
      videos.forEach((video) => { video.dataset.gramReady = 'true'; });
      return;
    }

    const load = (video) => {
      if (video.dataset.gramLoaded === 'true') return;
      video.dataset.gramLoaded = 'true';
      const source = document.createElement('source');
      source.src = video.dataset.src;
      source.type = 'video/mp4';
      video.appendChild(source);
      video.load();
    };

    if (!('IntersectionObserver' in window)) {
      videos.forEach((video) => {
        video.dataset.gramReady = 'true';
        load(video);
        video.play?.().catch(() => {});
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          load(video);
          video.play?.().catch(() => {});
        } else if (video.dataset.gramLoaded === 'true') {
          video.pause?.();
        }
      });
    }, { rootMargin: '200px 0px' });

    videos.forEach((video) => {
      video.dataset.gramReady = 'true';
      observer.observe(video);
    });
  };

  initGramVideos();
  document.addEventListener('shopify:section:load', (event) => initGramVideos(event.target));
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-mega-menu-item]')) return;
    document.querySelectorAll('[data-mega-menu-item].is-open').forEach((item) => {
      item.classList.remove('is-open');
      item.querySelector('[data-mega-trigger]')?.setAttribute('aria-expanded', 'false');
      item.querySelector('[data-mega-panel]')?.setAttribute('aria-hidden', 'true');
    });
  });

  document.addEventListener('shopify:block:select', (event) => {
    const megaItem = event.target.closest('[data-mega-menu-item]');
    if (megaItem) {
      megaItem.classList.add('is-open');
      megaItem.querySelector('[data-mega-trigger]')?.setAttribute('aria-expanded', 'true');
      megaItem.querySelector('[data-mega-panel]')?.setAttribute('aria-hidden', 'false');
    }
    const slide = event.target.closest('[data-ps-slide]');
    if (!slide) return;
    const slider = slide.closest('purity-slider');
    const index = slider ? [...slider.querySelectorAll('[data-ps-slide]')].indexOf(slide) : -1;
    if (index >= 0) slider.go(index, true);
  });

  const searchResults = document.querySelector('[data-predictive-results]');
  const searchInput = document.querySelector('[data-predictive-input]');
  if (searchResults && searchInput) {
    const initialSearchContent = searchResults.innerHTML;
    searchInput.addEventListener('input', () => {
      if (!searchInput.value.trim()) searchResults.innerHTML = initialSearchContent;
    });
  }

  const wishlistButton = document.querySelector('[data-wishlist-summary]');
  const wishlistPopover = document.querySelector('[data-wishlist-popover]');
  const wishlistItems = document.querySelector('[data-wishlist-items]');
  const wishlistCount = document.querySelector('[data-wishlist-count]');
  const readWishlist = () => {
    try {
      const value = JSON.parse(localStorage.getItem('purity-wishlist') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const renderWishlist = () => {
    const items = readWishlist();
    if (wishlistCount) {
      wishlistCount.textContent = String(items.length);
      wishlistCount.hidden = items.length === 0;
    }
    if (!wishlistItems) return;
    wishlistItems.innerHTML = items.length
      ? items.map((handle) => {
        const label = handle.replace(/-/g, ' ');
        return `<a href="/products/${encodeURIComponent(handle)}"><span>${label}</span><span aria-hidden="true">→</span></a>`;
      }).join('')
      : '<p class="site-wishlist-popover__empty">Products you save will appear here.</p>';
  };
  const closeWishlist = () => {
    wishlistPopover?.classList.remove('is-open');
    wishlistPopover?.setAttribute('aria-hidden', 'true');
    wishlistButton?.setAttribute('aria-expanded', 'false');
  };
  wishlistButton?.addEventListener('click', () => {
    const open = !wishlistPopover?.classList.contains('is-open');
    wishlistPopover?.classList.toggle('is-open', open);
    wishlistPopover?.setAttribute('aria-hidden', String(!open));
    wishlistButton.setAttribute('aria-expanded', String(open));
    if (open) renderWishlist();
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-wishlist-close]')) closeWishlist();
    if (event.target.closest('[data-wishlist]')) setTimeout(renderWishlist);
    if (
      wishlistPopover?.classList.contains('is-open')
      && !event.target.closest('[data-wishlist-popover]')
      && !event.target.closest('[data-wishlist-summary]')
    ) closeWishlist();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeWishlist();
  });
  renderWishlist();

  const backToTop = document.querySelector('[data-back-to-top]');
  const syncBackToTop = () => backToTop?.classList.toggle('is-visible', scrollY > innerHeight * 0.8);
  backToTop?.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  });
  addEventListener('scroll', syncBackToTop, { passive: true });
  syncBackToTop();

  const gramVideos = [...document.querySelectorAll('.ps-gram__video')];
  if (gramVideos.length) {
    const syncGramVideos = (play) => {
      gramVideos.forEach((video) => {
        video.muted = true;
        video.playsInline = true;
        if (!play || reducedMotion()) {
          video.pause();
          return;
        }
        const attempt = video.play();
        if (attempt?.catch) attempt.catch(() => {});
      });
    };
    syncGramVideos(true);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;
          if (entry.isIntersecting && !reducedMotion()) {
            video.muted = true;
            const attempt = video.play();
            if (attempt?.catch) attempt.catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { rootMargin: '80px 0px', threshold: 0.15 });
      gramVideos.forEach((video) => observer.observe(video));
    }
  }

  // Get Skin Smart Mobile Track Dots Controller
  const smartRail = document.querySelector('[data-smart-rail]');
  if (smartRail) {
    const track = smartRail.querySelector('.ps-smart__track');
    const cards = [...smartRail.querySelectorAll('.ps-smart__card')];
    const dots = [...smartRail.querySelectorAll('[data-smart-dot]')];

    if (track && cards.length && dots.length) {
      let scrollTimeout;
      const syncActiveDot = () => {
        const trackLeft = track.scrollLeft;
        const trackWidth = track.clientWidth;
        let activeIdx = 0;
        let minDiff = Infinity;
        cards.forEach((card, idx) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const viewportCenter = trackLeft + trackWidth / 2;
          const diff = Math.abs(cardCenter - viewportCenter);
          if (diff < minDiff) {
            minDiff = diff;
            activeIdx = idx;
          }
        });
        dots.forEach((dot, idx) => {
          dot.classList.toggle('is-active', idx === activeIdx);
          dot.setAttribute('aria-current', idx === activeIdx ? 'true' : 'false');
        });
      };

      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(syncActiveDot, 50);
      }, { passive: true });

      dots.forEach((dot) => {
        dot.addEventListener('click', () => {
          const idx = Number(dot.dataset.smartDot);
          const targetCard = cards[idx];
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
      });
    }
  }

  // Home Reviews Write Review Trigger
  document.addEventListener('click', (event) => {
    const writeTrigger = event.target.closest('[data-write-review-trigger]');
    if (!writeTrigger || window.location.pathname.includes('/products/')) return;
    event.preventDefault();

    const productId = writeTrigger.getAttribute('data-product-id') || '15430705676659';
    const fallbackUrl = writeTrigger.getAttribute('data-fallback-url') || ('https://api.judge.me/storefront_reviews/new?shop_domain=' + encodeURIComponent((window.Shopify && window.Shopify.shop) || 'q9wi15-80.myshopify.com') + '&platform=shopify&product_id=' + encodeURIComponent(productId));

    if (window.jdgm && window.jdgm._WriteReviewModal && window.jdgm.$ && typeof window.jdgm.$ === 'function' && productId) {
      try {
        if (window.jdgmSettings) {
          window.jdgmSettings.enable_review_videos = false;
          window.jdgmSettings.modal_write_review_flow = true;
          window.jdgmSettings.review_form_button_color = '#111827';
          window.jdgmSettings.review_form_button_text_color = '#ffffff';
        }
        document.querySelectorAll('.jdgm-review-widget-modal.jdgm-write-review-modal').forEach((m) => m.remove());
        const modal = new window.jdgm._WriteReviewModal(window.jdgm.$);
        modal.setup('jdgm-review-widget-modal', productId).then((ok) => {
          if (ok) modal.showModalPage();
        }).catch(() => {
          if (fallbackUrl) window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        });
        return;
      } catch (e) {}
    }
    if (fallbackUrl) window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
  });
})();
