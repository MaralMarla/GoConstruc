import initCommon from './common.js';
import { initI18n } from './i18n.js';

initCommon({ lightSectionIds: [], hoverSelectors: 'a, button' });
initI18n();

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
