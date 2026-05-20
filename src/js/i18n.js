import LANGS from '../data/translations.json';

export function initI18n() {
  function applyLang(lang) {
    document.documentElement.lang = lang === 'jp' ? 'ja' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (LANGS[lang]?.[key] !== undefined) el.innerHTML = LANGS[lang][key];
    });
    ['lang-btn', 'lang-btn-drawer'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.querySelectorAll('[data-l]').forEach(span => {
        span.classList.toggle('is-active', span.getAttribute('data-l') === lang);
      });
    });
    localStorage.setItem('gc-lang', lang);
  }

  let currentLang = localStorage.getItem('gc-lang') || 'en';
  applyLang(currentLang);

  ['lang-btn', 'lang-btn-drawer'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'jp' : 'en';
      applyLang(currentLang);
    });
  });
}
