/**
 * initCommon — shared init for all pages.
 *
 * @param {object} opts
 * @param {string[]} opts.lightSectionIds   - section IDs with light background
 * @param {string[]} opts.darkOverrideIds   - section IDs that force dark nav regardless
 * @param {string|null} opts.bodyCursorLightClass - body class toggled when nav theme is 'light'
 * @param {string|null} opts.bodyCursorDarkClass  - body class toggled when nav theme is 'dark'
 * @param {string} opts.hoverSelectors      - extra selectors for cursor hover
 */
export default function initCommon({
  lightSectionIds    = [],
  darkOverrideIds    = [],
  bodyCursorLightClass = null,
  bodyCursorDarkClass  = null,
  hoverSelectors     = 'a, button',
} = {}) {

  /* ─── CURSOR ─── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  if (dot && ring) {
    let mx = -100, my = -100, rx = -100, ry = -100;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
    });

    (function animRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    document.querySelectorAll(hoverSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => { dot.classList.add('hover');    ring.classList.add('hover');    });
      el.addEventListener('mouseleave', () => { dot.classList.remove('hover'); ring.classList.remove('hover'); });
    });

    document.addEventListener('mouseleave', () => { dot.style.opacity  = '0'; ring.style.opacity  = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity  = '1'; ring.style.opacity  = '1'; });
  }

  /* ─── NAV ─── */
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const drawer = document.getElementById('nav-drawer');

  if (nav) {
    let lastY = 0, rafPending = false;

    function getNavTheme() {
      const nb = nav.getBoundingClientRect().bottom;
      for (const id of darkOverrideIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= nb && r.bottom > 0) return 'dark';
      }
      for (const id of lightSectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= nb && r.bottom > 0) return 'light';
      }
      return 'dark';
    }

    function updateNav() {
      const y      = window.scrollY;
      const scrolled = y > 80;
      const theme  = getNavTheme();

      nav.classList.toggle('nav--scrolled-dark',  scrolled && theme === 'dark');
      nav.classList.toggle('nav--scrolled-light', scrolled && theme === 'light');
      if (!scrolled) nav.classList.remove('nav--scrolled-dark', 'nav--scrolled-light');

      if (bodyCursorLightClass) document.body.classList.toggle(bodyCursorLightClass, theme === 'light');
      if (bodyCursorDarkClass)  document.body.classList.toggle(bodyCursorDarkClass,  theme === 'dark');

      if (y > lastY && y > window.innerHeight * 0.5) {
        nav.classList.add('nav--hidden');
      } else {
        nav.classList.remove('nav--hidden');
      }
      lastY = y;
      rafPending = false;
    }

    window.addEventListener('scroll', () => {
      if (!rafPending) { rafPending = true; requestAnimationFrame(updateNav); }
    }, { passive: true });
    updateNav();
  }

  /* ─── HAMBURGER / DRAWER ─── */
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        drawer.classList.remove('is-open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  /* ─── SCROLL REVEAL ─── */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  /* ─── SMOOTH SCROLL ─── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href   = a.getAttribute('href');
      const id     = href.slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (id) history.pushState(null, '', href);
    });
  });

  /* ─── HASH ON LOAD ─── */
  (function handleHashOnLoad() {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (!target) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      )
    );
  })();

  /* ─── VIDEO OPTIMIZATION ─── */
  const vobs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause();
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('video').forEach(v => vobs.observe(v));
}
