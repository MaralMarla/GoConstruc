import initCommon from './common.js';
import { initI18n } from './i18n.js';
import { initServices3D } from './services-3d.js';
import { initEarthScene } from './earth-scene.js';

/* Page loader */
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('hidden');
  }, 200);
});

initCommon({
  lightSectionIds: ['vision', 'projects'],
  hoverSelectors:  'a, button, .service-card, .future-tag',
});

initServices3D();
initEarthScene();
initI18n();

/* Partner form — Formspree endpoint (replace YOUR_FORM_ID at formspree.io) */
const FORM_ENDPOINT = 'https://formspree.io/f/xgoqvvrq';

const partnerForm   = document.getElementById('partner-form');
const partnerSubmit = document.getElementById('partner-submit');
const partnerStatus = document.getElementById('partner-status');

if (partnerForm) {
  partnerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const lang = localStorage.getItem('gc-lang') || 'en';
    const LANGS = await fetch('/src/data/translations.json').then(r => r.json());
    const t = (key) => LANGS[lang]?.[key] ?? LANGS['en'][key];

    const data = {
      name:    partnerForm.elements['name'].value.trim(),
      email:   partnerForm.elements['email'].value.trim(),
      project: partnerForm.elements['project'].value.trim(),
    };

    if (!data.name || !data.email) return;

    partnerSubmit.disabled = true;
    partnerSubmit.querySelector('span').textContent = t('partner.sending');
    partnerStatus.textContent = '';
    partnerStatus.className = 'partner-form__status';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        partnerStatus.textContent = t('partner.success');
        partnerForm.reset();
        partnerSubmit.querySelector('span').textContent = t('partner.submit');
      } else {
        throw new Error('non-ok');
      }
    } catch {
      partnerStatus.textContent = t('partner.error');
      partnerStatus.classList.add('partner-form__status--error');
      partnerSubmit.querySelector('span').textContent = t('partner.submit');
    } finally {
      partnerSubmit.disabled = false;
    }
  });
}

/* Active nav link based on scroll position */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav__link');

if (sections.length && navLinks.length) {
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(l =>
          l.classList.toggle('active', l.getAttribute('href') === `#${id}`)
        );
      }
    });
  }, { threshold: 0.35, rootMargin: `-72px 0px 0px 0px` });
  sections.forEach(s => secObs.observe(s));
}
