import initCommon from './common.js';
import { initI18n } from './i18n.js';

initCommon({
  lightSectionIds: ['statement', 'strengths', 'brand', 'profile'],
  hoverSelectors:  'a, button, .strength-item, .value-item, .exec-card',
});
initI18n();
