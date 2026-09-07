(() => {
  const q = (selector, context = document) => context.querySelector(selector);
  const qa = (selector, context = document) => [...context.querySelectorAll(selector)];

  const scrollRail = (rail, direction) => {
    if (!rail) return;
    rail.scrollBy({ left: rail.clientWidth * 0.72 * direction, behavior: 'smooth' });
  };

  const initProduct = (root) => {
    if (!root || root.dataset.pdpReady === 'true') return;
    root.dataset.pdpReady = 'true';

    qa('[data-pdp-swatches] input', root).forEach((input) => {
      input.addEventListener('change', () => {
        const label = q('[data-pdp-swatch-label]', root);
        const stickyVariant = q('.pdp-sticky-atc__variant', root);
        if (label) label.textContent = input.value;
        if (stickyVariant) stickyVariant.textContent = input.value;
      });
    });

    qa('[data-pdp-purchase]', root).forEach((purchase) => {
      const frequency = q('[data-pdp-frequency]', purchase);
      const select = q('select[name="selling_plan"]', frequency);
      qa('input[type="radio"]', purchase).forEach((radio) => {
        radio.addEventListener('change', () => {
          qa('.pdp-purchase__option', purchase).forEach((option) => {
            option.classList.toggle('is-active', q('input', option)?.checked === true);
          });
          const subscribing = radio.checked && radio.value === 'subscribe';
          if (frequency) frequency.hidden = !subscribing;
          if (select) select.disabled = !subscribing;
        });
      });
      if (select) select.disabled = true;
    });

    q('[data-pdp-buy-now]', root)?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const form = button.closest('form');
      if (!form) return;

      // Prefer Shopflo Buy Now when the bridge is available (live Project Skin flow).
      if (typeof window.handleFloBuyNowBtn === 'function') {
        window.handleFloBuyNowBtn(event);
        return;
      }
      if (window.PurityShopflo?.buyNow?.(event)) return;
      if (window.PurityShopflo?.floActive?.() && typeof window.handleFloBuyNowBtn === 'function') {
        window.handleFloBuyNowBtn(event);
        return;
      }

      button.disabled = true;
      const previous = button.textContent;
      button.textContent = 'Preparing checkout...';
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), 6000) : null;
      try {
        const fetchOpts = { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } };
        if (controller) fetchOpts.signal = controller.signal;
        const response = await fetch('/cart/add.js', fetchOpts);
        if (timeout) clearTimeout(timeout);
        if (!response.ok) throw new Error('Unable to prepare checkout');
        const shop = window.PurityTheme?.shopUrl || (window.Shopify?.shop ? `https://${window.Shopify.shop}` : '');
        window.location.assign(`${shop}/checkout`);
      } catch (error) {
        if (timeout) clearTimeout(timeout);
        console.error(error);
        button.textContent = 'Please try again';
        setTimeout(() => { button.textContent = previous; button.disabled = false; }, 1400);
      }
    });

    qa('[data-pdp-action-dir]', root).forEach((button) => {
      button.addEventListener('click', () => scrollRail(q('[data-pdp-action-rail]', root), button.dataset.pdpActionDir === 'next' ? 1 : -1));
    });
    qa('[data-pdp-pair-dir]', root).forEach((button) => {
      button.addEventListener('click', () => scrollRail(q('[data-pdp-pair-rail]', root), button.dataset.pdpPairDir === 'next' ? 1 : -1));
    });

    const videoDialog = q('[data-pdp-video-dialog]', root);
    const dialogVideo = q('[data-pdp-dialog-video]', videoDialog);
    qa('[data-pdp-video-open]', root).forEach((button) => {
      button.addEventListener('click', () => {
        const url = button.dataset.videoUrl;
        if (!videoDialog || !dialogVideo || !url) return;
        dialogVideo.src = url;
        videoDialog.showModal();
        dialogVideo.play().catch(() => {});
      });
    });
    q('[data-pdp-video-close]', root)?.addEventListener('click', () => {
      dialogVideo?.pause();
      if (dialogVideo) dialogVideo.removeAttribute('src');
      videoDialog?.close();
    });
    videoDialog?.addEventListener('click', (event) => {
      if (event.target !== videoDialog) return;
      dialogVideo?.pause();
      videoDialog.close();
    });

    const questionDialog = q('[data-pdp-question-dialog]', root);
    q('[data-pdp-question-open]', root)?.addEventListener('click', () => questionDialog?.showModal());
    q('[data-pdp-question-close]', root)?.addEventListener('click', () => questionDialog?.close());
    questionDialog?.addEventListener('click', (event) => {
      if (event.target === questionDialog) questionDialog.close();
    });

    const thumbnailGallery = q('[data-thumbnail-gallery]', root);
    if (thumbnailGallery) {
      const track = q('[data-thumbnail-track]', thumbnailGallery);
      const stage = q('[data-thumbnail-stage]', thumbnailGallery);
      const thumbs = qa('[data-thumbnail-index]', thumbnailGallery);
      const slides = qa('[data-thumbnail-slide]', thumbnailGallery);
      const counter = q('[data-thumbnail-counter]', thumbnailGallery);
      let activeIndex = 0;
      let pointerStart = null;

      const selectMedia = (nextIndex, focusThumbnail = false) => {
        if (!slides.length) return;
        activeIndex = (nextIndex + slides.length) % slides.length;
        if (track) track.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;
        slides.forEach((slide, index) => {
          const active = index === activeIndex;
          slide.classList.toggle('is-active', active);
          slide.setAttribute('aria-hidden', active ? 'false' : 'true');
          const video = q('video', slide);
          if (video && !active) video.pause();
        });
        thumbs.forEach((thumb, index) => {
          const active = index === activeIndex;
          thumb.classList.toggle('is-active', active);
          thumb.setAttribute('aria-current', active ? 'true' : 'false');
          if (active) {
            const rail = thumb.parentElement;
            if (rail && rail.scrollWidth > rail.clientWidth) {
              rail.scrollTo({ left: thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2, behavior: 'smooth' });
            }
            if (rail && rail.scrollHeight > rail.clientHeight) {
              rail.scrollTo({ top: thumb.offsetTop - (rail.clientHeight - thumb.offsetHeight) / 2, behavior: 'smooth' });
            }
          }
        });
        if (counter) counter.textContent = `${activeIndex + 1}/${slides.length}`;
        if (focusThumbnail) thumbs[activeIndex]?.focus();
      };

      thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => selectMedia(index)));
      qa('[data-thumbnail-dir]', thumbnailGallery).forEach((button) => {
        button.addEventListener('click', () => selectMedia(activeIndex + (button.dataset.thumbnailDir === 'next' ? 1 : -1)));
      });
      stage?.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        selectMedia(activeIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
      });
      stage?.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        pointerStart = { x: event.clientX, y: event.clientY };
      });
      stage?.addEventListener('pointerup', (event) => {
        if (!pointerStart) return;
        const deltaX = event.clientX - pointerStart.x;
        const deltaY = event.clientY - pointerStart.y;
        pointerStart = null;
        if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;
        selectMedia(activeIndex + (deltaX < 0 ? 1 : -1));
      });
      stage?.addEventListener('pointercancel', () => { pointerStart = null; });
      root.addEventListener('product:variant-change', (event) => {
        const mediaId = event.detail?.variant?.featured_media?.id || event.detail?.variant?.featured_image?.id;
        if (!mediaId) return;
        const mediaIndex = slides.findIndex((slide) => Number(slide.dataset.mediaId) === Number(mediaId));
        if (mediaIndex >= 0) selectMedia(mediaIndex);
      });
      selectMedia(0);

      // PhD Beauty inspired scroll setup:
      // Keeps left product gallery visible and locks scroll to the right info column until it reaches bottom,
      // completely eliminating empty white space on the left side during scroll.
      const info = q('.pdp-info', root);
      if (stage && info) {
        const thumbsRail = q('.pdp-thumbnail-gallery__thumbs', thumbnailGallery);

        const syncHeights = () => {
          if (window.innerWidth >= 900) {
            const stageH = stage.offsetHeight;
            if (stageH > 200) {
              info.style.height = `${stageH}px`;
              info.style.maxHeight = `${stageH}px`;
              if (thumbsRail) {
                thumbsRail.style.maxHeight = `${stageH}px`;
              }
            }
          } else {
            info.style.height = '';
            info.style.maxHeight = '';
            if (thumbsRail) {
              thumbsRail.style.maxHeight = '';
            }
          }
        };

        syncHeights();
        window.addEventListener('resize', syncHeights);
        if (window.ResizeObserver) {
          const ro = new ResizeObserver(() => syncHeights());
          ro.observe(stage);
        }

        let isAnchorJump = false;
        root.querySelectorAll('a[href^="#"]').forEach((link) => {
          link.addEventListener('click', () => {
            isAnchorJump = true;
            setTimeout(() => { isAnchorJump = false; }, 800);
          });
        });

        const isContainerAtTop = () => info.scrollTop <= 6;
        const isContainerAtBottom = () => (info.scrollHeight - info.scrollTop - info.clientHeight) <= 24;

        let isScrollLocked = false;
        let lastScrollTop = window.pageYOffset || 0;

        const handleScroll = () => {
          if (window.innerWidth < 900 || isScrollLocked || isAnchorJump) return;
          const currentScrollTop = window.pageYOffset || 0;
          const isScrollingDown = currentScrollTop > lastScrollTop;
          const isScrollingUp = currentScrollTop < lastScrollTop;

          if (currentScrollTop <= 60 && isScrollingDown && !isContainerAtBottom()) {
            window.scrollTo(0, 0);
            info.scrollTop += (currentScrollTop || 30);
            isScrollLocked = true;
            setTimeout(() => { isScrollLocked = false; }, 140);
          } else if (currentScrollTop <= 20 && isScrollingUp && !isContainerAtTop()) {
            window.scrollTo(0, 0);
            info.scrollTop -= Math.abs(currentScrollTop || 30);
            isScrollLocked = true;
            setTimeout(() => { isScrollLocked = false; }, 140);
          }
          lastScrollTop = currentScrollTop;
        };

        const handleWheel = (event) => {
          if (window.innerWidth < 900 || isAnchorJump) return;
          if (thumbsRail && event.target instanceof Node && thumbsRail.contains(event.target)) return;

          const atPageTop = window.pageYOffset <= 30;

          if (event.deltaY > 0) {
            if (atPageTop && !isContainerAtBottom()) {
              event.preventDefault();
              info.scrollTop += event.deltaY;
            }
          } else if (event.deltaY < 0) {
            if (atPageTop && !isContainerAtTop()) {
              event.preventDefault();
              info.scrollTop += event.deltaY;
            }
          }
        };

        window.addEventListener('scroll', handleScroll, { passive: false });
        window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
      }
    }

    root.addEventListener('product:variant-change', (event) => {
      const variant = event.detail?.variant;
      if (!variant) return;
      const formattedPrice = money(variant.price);
      const stickyId = q('.pdp-sticky-atc input[name="id"]', root);
      const stickyPrice = q('.pdp-sticky-atc__product span', root);
      const stickyVariant = q('.pdp-sticky-atc__variant', root);
      const stickySubmit = q('.pdp-sticky-atc .pdp-atc', root);
      const mainSubmit = q('[data-product-submit]', root);
      if (stickyId) stickyId.value = variant.id;
      if (stickyPrice) stickyPrice.textContent = formattedPrice;
      if (stickyVariant) stickyVariant.textContent = variant.title;
      if (stickySubmit) {
        stickySubmit.disabled = !variant.available;
        stickySubmit.textContent = variant.available ? `Add to cart - ${formattedPrice}` : 'Sold out';
      }
      if (mainSubmit) mainSubmit.textContent = variant.available ? `${mainSubmit.dataset.addLabel} - ${formattedPrice}` : 'Sold out';
    });

    const gallery = q('.pdp-gallery', root);
    const media = qa('[data-product-media]', gallery);
    if (gallery && !thumbnailGallery && media.length > 1 && matchMedia('(max-width: 899px)').matches) {
      const dots = document.createElement('div');
      dots.className = 'pdp-gallery-dots';
      media.forEach((item, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `View product image ${index + 1}`);
        dot.classList.toggle('is-active', index === 0);
        dot.addEventListener('click', () => item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }));
        dots.appendChild(dot);
      });
      gallery.after(dots);
      let queued = false;
      gallery.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          const center = gallery.scrollLeft + gallery.clientWidth / 2;
          let active = 0;
          let closest = Infinity;
          media.forEach((item, index) => {
            const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
            if (distance < closest) {
              closest = distance;
              active = index;
            }
          });
          qa('button', dots).forEach((dot, index) => dot.classList.toggle('is-active', index === active));
          queued = false;
        });
      }, { passive: true });
    }
  };

  const initShare = (context = document) => {
    qa('[data-copy-link]', context).forEach((button) => {
      if (button.dataset.pdpReady === 'true') return;
      button.dataset.pdpReady = 'true';
      button.addEventListener('click', async () => {
        const url = button.getAttribute('data-copy-url') || window.location.href;
        try {
          await navigator.clipboard.writeText(url);
        } catch (error) {
          const input = document.createElement('input');
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          input.remove();
        }
        const feedback = q('[data-copy-feedback]', button);
        if (!feedback) return;
        feedback.hidden = false;
        window.clearTimeout(button._copyTimer);
        button._copyTimer = window.setTimeout(() => {
          feedback.hidden = true;
        }, 1600);
      });
    });
  };

  const initActives = (context = document) => {
    qa('[data-pdp-actives]', context).forEach((section) => {
      if (section.dataset.pdpReady === 'true') return;
      section.dataset.pdpReady = 'true';
      const dialog = q('[data-active-dialog]', section);
      if (!dialog) return;
      const title = q('[data-active-dialog-title]', dialog);
      const benefit = q('[data-active-dialog-benefit]', dialog);
      const body = q('[data-active-dialog-body]', dialog);
      const close = () => dialog.close();

      q('[data-active-close]', dialog)?.addEventListener('click', close);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) close();
      });

      qa('[data-active-open]', section).forEach((tile) => {
        tile.addEventListener('click', () => {
          if (title) title.textContent = tile.getAttribute('data-active-title') || '';
          if (benefit) benefit.textContent = tile.getAttribute('data-active-benefit') || '';
          if (body) body.innerHTML = q('[data-active-content]', tile)?.innerHTML || '';
          dialog.showModal();
        });
      });
    });

    qa('a[href="#ProductIngredients"]', context).forEach((link) => {
      if (link.dataset.pdpReady === 'true') return;
      link.dataset.pdpReady = 'true';
      link.addEventListener('click', () => {
        const root = q('#ProductIngredients');
        if (!root) return;
        const details = [...root.querySelectorAll('details')].find((item) =>
          (item.querySelector('summary')?.textContent || '').toLowerCase().includes('full ingredients')
        );
        if (details) details.open = true;
      });
    });
  };

  let isReviewModalOpening = false;
  const triggerJudgemeWriteReview = (triggerEl) => {
    if (isReviewModalOpening) return;
    isReviewModalOpening = true;
    setTimeout(() => { isReviewModalOpening = false; }, 800);

    const root = document.getElementById('judgeme_product_reviews') || document.querySelector('.jdgm-review-widget');
    let productId = triggerEl ? triggerEl.getAttribute('data-product-id') : null;
    if (!productId && root) {
      productId = root.getAttribute('data-product-id') || root.getAttribute('data-id');
    }
    const fallbackUrl = triggerEl ? triggerEl.getAttribute('data-fallback-url') : (productId ? ('https://api.judge.me/storefront_reviews/new?shop_domain=' + encodeURIComponent((window.Shopify && window.Shopify.shop) || 'q9wi15-80.myshopify.com') + '&platform=shopify&product_id=' + encodeURIComponent(productId)) : null);

    // Smooth scroll to the reviews section
    const scrollTarget = document.getElementById('PdpReviews') || root;
    if (scrollTarget) {
      const topOffset = scrollTarget.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }

    const tryOpenModal = () => {
      if (window.jdgm && window.jdgm._WriteReviewModal && window.jdgm.$ && typeof window.jdgm.$ === 'function' && productId) {
        try {
          // Configure single-view compact theme and disable multi-step verification friction
          if (window.jdgmSettings) {
            window.jdgmSettings.review_form_theme = 'compact';
            window.jdgmSettings.require_verification_before_submit = false;
            window.jdgmSettings.modal_write_review_flow = true;
            window.jdgmSettings.review_form_button_color = '#111827';
            window.jdgmSettings.review_form_button_text_color = '#ffffff';
          }
          document.querySelectorAll('.jdgm-review-widget-modal.jdgm-write-review-modal').forEach((m) => m.remove());
          const modal = new window.jdgm._WriteReviewModal(window.jdgm.$);
          modal.setup('jdgm-review-widget-modal', productId, { isPreVerified: true }).then((ok) => {
            if (ok) {
              modal.showModalPage(2);
            }
          }).catch((err) => {
            console.warn('[Judge.me] Modal setup error:', err);
          });
          return true;
        } catch (err) {
          console.warn('[Judge.me] Error invoking _WriteReviewModal:', err);
        }
      }
      return false;
    };

    if (tryOpenModal()) return;

    // Check if native Judge.me review trigger button is in DOM
    const nativeBtn = document.querySelector('.jdgm-write-rev-link, [data-testid="write-review-button"], .jm-action-buttons__button');
    if (nativeBtn && nativeBtn !== triggerEl) {
      nativeBtn.click();
      return;
    }

    // Classic openForm API
    if (window.jdgm && typeof window.jdgm.openForm === 'function' && root && window.jdgm.$) {
      try {
        window.jdgm.openForm(window.jdgm.$(root));
        return;
      } catch (e) {}
    }

    // Hash fallback
    try {
      if (window.location.hash !== '#judgeme') history.pushState(null, '', '#judgeme');
    } catch (e) {}

    // Polling retry in case Judge.me scripts are still initializing
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryOpenModal()) {
        clearInterval(interval);
        return;
      }
      const btn = document.querySelector('.jdgm-write-rev-link, [data-testid="write-review-button"]');
      if (btn) {
        clearInterval(interval);
        btn.click();
        return;
      }
      if (attempts >= 10) {
        clearInterval(interval);
        if (fallbackUrl) window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    }, 200);
  };

  window.triggerJudgemeWriteReview = triggerJudgemeWriteReview;

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-write-review-trigger], .pdp-reviews-fallback__write, .pdp-reviews__write-trigger-btn, a[href="#judgeme_product_reviews"], a[href="#judgeme"]');
    if (!trigger) return;
    event.preventDefault();
    triggerJudgemeWriteReview(trigger);
  });

  const autoConsolidateReviews = () => {
    const root = document.getElementById('judgeme_product_reviews');
    if (!root) return;
    const hasReviews = root.querySelector('.jdgm-rev') || (root.dataset.numberOfReviews && parseInt(root.dataset.numberOfReviews, 10) > 0);
    if (hasReviews) {
      document.querySelectorAll('.pdp-reviews-fallback, .pdp-reviews-judgeme__verified').forEach((el) => {
        el.style.setProperty('display', 'none', 'important');
      });
      root.classList.remove('jdgm-widget--with-fallback');
    }
  };

  const initReviews = (context = document) => {
    autoConsolidateReviews();

    const root = document.getElementById('judgeme_product_reviews');
    if (root && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        autoConsolidateReviews();
      });
      observer.observe(root, { childList: true, subtree: true });
    }

    if (window.location.hash === '#judgeme_product_reviews' || window.location.hash === '#judgeme') {
      window.setTimeout(() => {
        triggerJudgemeWriteReview(document.querySelector('[data-write-review-trigger]'));
      }, 600);
    }
  };

  const init = (context = document) => {
    qa('[data-pdp-root]', context).forEach(initProduct);
    initShare(context);
    initActives(context);
    initReviews(context);
  };

  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
