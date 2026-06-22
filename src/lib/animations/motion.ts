import { browser } from '$app/environment';
import type { Action } from 'svelte/action';

type GsapContext = {
  gsap: any;
  ScrollTrigger: any;
};

type RevealOptions = {
  delay?: number;
  duration?: number;
  ease?: string;
  once?: boolean;
  start?: string;
  y?: number;
};

type StaggerOptions = RevealOptions & {
  selector?: string;
  stagger?: number;
};

type CounterOptions = {
  decimals?: number;
  duration?: number;
  formatter?: (value: number) => string;
  from?: number;
  prefix?: string;
  start?: string;
  suffix?: string;
  value?: number;
};

let gsapContext: Promise<GsapContext | null> | null = null;

export function prefersReducedMotion() {
  return browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setFinalVisible(node: HTMLElement) {
  node.style.opacity = '1';
  node.style.transform = 'none';
  node.style.visibility = 'visible';
}

// ── Lightweight CSS reveals (WOW.js-style) ────────────────────────────────
// Pure IntersectionObserver + GPU transitions (transform + opacity). No async
// library load, no blur — instant and smooth, fires the moment it scrolls in.
const REVEAL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function observeOnce(node: HTMLElement, onEnter: () => void) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        onEnter();
        io.disconnect();
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );
  io.observe(node);
  return () => io.disconnect();
}

function hideEl(el: HTMLElement, y: number, duration: number, delay: number) {
  el.style.opacity = '0';
  el.style.transform = `translate3d(0, ${y}px, 0)`;
  el.style.transition = `opacity ${duration}s ${REVEAL_EASE} ${delay}s, transform ${duration}s ${REVEAL_EASE} ${delay}s`;
  el.style.willChange = 'opacity, transform';
}

function showEl(el: HTMLElement) {
  el.style.opacity = '1';
  el.style.transform = 'translate3d(0, 0, 0)';
  const clear = () => {
    el.style.willChange = '';
    el.removeEventListener('transitionend', clear);
  };
  el.addEventListener('transitionend', clear);
}

export function setupGsap() {
  if (!browser) {
    return Promise.resolve(null);
  }

  if (!gsapContext) {
    gsapContext = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, scrollTriggerModule]) => {
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

        gsap.registerPlugin(ScrollTrigger);

        return { gsap, ScrollTrigger };
      }
    );
  }

  return gsapContext;
}

export function initSmoothScrolling() {
  // Native, free scrolling — no smooth-scroll inertia (it made the page feel
  // "stuck"/laggy behind the wheel). Scroll reveals (IntersectionObserver) and
  // the hero parallax (ScrollTrigger) both work fine on native scroll.
  if (browser) {
    document.documentElement.classList.remove('lenis');
  }
  return () => {};
}

function withMotion(node: HTMLElement, setup: (context: GsapContext) => () => void) {
  let cleanup = () => {};
  let destroyed = false;

  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return { destroy: cleanup };
  }

  void setupGsap().then((context) => {
    if (!context || destroyed) return;
    cleanup = setup(context);
  });

  return {
    destroy() {
      destroyed = true;
      cleanup();
    }
  };
}

export const fadeUpOnScroll: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }
  hideEl(node, params.y ?? 20, params.duration ?? 0.6, params.delay ?? 0);
  const stop = observeOnce(node, () => showEl(node));
  return { destroy: stop };
};

export const staggeredCardReveal: Action<HTMLElement, StaggerOptions | undefined> = (node, params = {}) => {
  const targets = (
    params.selector ? Array.from(node.querySelectorAll<HTMLElement>(params.selector)) : (Array.from(node.children) as HTMLElement[])
  );

  if (!browser || prefersReducedMotion()) {
    targets.forEach(setFinalVisible);
    return {};
  }
  if (!targets.length) return {};

  const y = params.y ?? 20;
  const duration = params.duration ?? 0.6;
  const stagger = params.stagger ?? 0.07;
  const base = params.delay ?? 0;
  targets.forEach((el, i) => hideEl(el, y, duration, base + i * stagger));
  const stop = observeOnce(node, () => targets.forEach(showEl));
  return { destroy: stop };
};

export const heroImageParallax: Action<HTMLElement, { amount?: number } | undefined> = (node, params = {}) => {
  return withMotion(node, ({ gsap }) => {
    const amount = params.amount ?? 5;
    // Promote to its own GPU layer so the scrubbed transform composites instead of
    // repainting/re-decoding the image each frame (the "image reloading" effect).
    node.style.willChange = 'transform';
    node.style.backfaceVisibility = 'hidden';
    const tween = gsap.fromTo(
      node,
      { scale: 1.12, yPercent: -amount },
      {
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          end: 'bottom top',
          invalidateOnRefresh: true,
          scrub: 0.6,
          start: 'top top',
          trigger: node.parentElement ?? node
        },
        yPercent: amount
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      node.style.willChange = '';
    };
  });
};

export const sectionReveal: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }
  hideEl(node, params.y ?? 16, params.duration ?? 0.6, params.delay ?? 0);
  const stop = observeOnce(node, () => showEl(node));
  return { destroy: stop };
};

export const numberCounter: Action<HTMLElement, CounterOptions | undefined> = (node, params = {}) => {
  const value = params.value ?? Number(node.textContent?.replace(/[^\d.-]/g, '') || 0);
  const decimals = params.decimals ?? 0;
  const format =
    params.formatter ??
    ((current: number) => `${params.prefix ?? ''}${current.toFixed(decimals)}${params.suffix ?? ''}`);

  if (!browser || prefersReducedMotion()) {
    node.textContent = format(value);
    return {};
  }

  return withMotion(node, ({ gsap }) => {
    const state = { value: params.from ?? 0 };
    const tween = gsap.to(state, {
      duration: params.duration ?? 1,
      ease: 'power1.out',
      onUpdate: () => {
        node.textContent = format(state.value);
      },
      scrollTrigger: {
        once: true,
        start: params.start ?? 'top 90%',
        trigger: node
      },
      value
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  });
};

// 3D cursor tilt (vanilla-tilt style) for cards. Pure transforms, no library.
export const tilt: Action<HTMLElement, { max?: number; scale?: number; glare?: boolean } | undefined> = (node, params = {}) => {
  if (!browser || prefersReducedMotion()) return {};

  const max = params.max ?? 7;
  const scale = params.scale ?? 1.02;
  let raf = 0;

  node.style.transformStyle = 'preserve-3d';
  node.style.willChange = 'transform';

  const onMove = (event: MouseEvent) => {
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      node.style.transition = 'transform 0.08s ease-out';
      node.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) scale(${scale})`;
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(raf);
    node.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    node.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  node.addEventListener('mousemove', onMove);
  node.addEventListener('mouseleave', onLeave);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    }
  };
};

// Cinematic heading reveal — words rise + de-blur in sequence on scroll.
export const revealHeading: Action<HTMLElement, { stagger?: number; y?: number; start?: string } | undefined> = (node, params = {}) => {
  const text = (node.textContent ?? '').trim();
  if (!text) return {};

  if (!browser || prefersReducedMotion()) {
    setFinalVisible(node);
    return {};
  }

  // Split into per-character spans (kept word-safe so words never break across
  // lines), then animate each char in with a stagger — Travelik's "text-anime".
  const esc = (c: string) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c);
  node.setAttribute('aria-label', text);
  node.innerHTML = text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const chars = Array.from(part)
        .map((c) => `<span class="reveal-char" style="display:inline-block;will-change:transform,opacity">${esc(c)}</span>`)
        .join('');
      return `<span style="display:inline-block;white-space:nowrap">${chars}</span>`;
    })
    .join('');

  const chars = Array.from(node.querySelectorAll<HTMLElement>('.reveal-char'));
  const stagger = params.stagger ?? 0.025;
  const ease = 'cubic-bezier(0.34, 1.4, 0.64, 1)'; // slight Back-style overshoot
  chars.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(0.4em)';
    el.style.transition = `opacity 0.5s ease ${(i * stagger).toFixed(3)}s, transform 0.7s ${ease} ${(i * stagger).toFixed(3)}s`;
  });
  const stop = observeOnce(node, () => {
    chars.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
  });
  return { destroy: stop };
};

export const navbarEntrance: Action<HTMLElement, RevealOptions | undefined> = (node, params = {}) => {
  return withMotion(node, ({ gsap }) => {
    const tween = gsap.fromTo(
      node,
      { autoAlpha: 0, y: params.y ?? -12 },
      {
        autoAlpha: 1,
        delay: params.delay ?? 0.04,
        duration: params.duration ?? 0.5,
        ease: params.ease ?? 'power2.out',
        y: 0
      }
    );

    return () => tween.kill();
  });
};
