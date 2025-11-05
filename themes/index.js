/**
 * Theme Registry - Registry of all available themes
 */

import { calm } from './calm.js?v=35';
import { matrix } from './matrix.js?v=35';

export const THEMES = {
  calm,
  matrix
};

export function getTheme(id) {
  return THEMES[id] || THEMES.calm;
}

export function getAllThemes() {
  return Object.values(THEMES);
}

