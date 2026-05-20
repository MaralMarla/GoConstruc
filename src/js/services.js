import initCommon from './common.js';
import { initI18n } from './i18n.js';
import { initServices3D } from './services-3d.js';

initCommon({ lightSectionIds: [], hoverSelectors: 'a, button' });
initI18n();
initServices3D();
