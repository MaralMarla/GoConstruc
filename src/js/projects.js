import initCommon from './common.js';
import { initI18n } from './i18n.js';

initCommon({
  lightSectionIds:   ['overview', 'project-02', 'project-03'],
  darkOverrideIds:   ['cta'],
  bodyCursorDarkClass: 'on-dark',
});
initI18n();
