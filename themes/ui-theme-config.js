/**
 * UI Theme Configuration
 * 
 * Defines visual parameters for Dark/Light themes.
 * These are separate from 3D scene plugins - themes only change colors/parameters,
 * not the scene structure itself.
 */

import { getSceneColors, getThemeColorsByName } from '../core/theme-colors.js';

/**
 * Theme configuration for Dark theme
 */
export const DARK_THEME_CONFIG = {
  id: 'dark',
  name: 'Dark',
  
  // CSS classes to apply
  cssClasses: {
    html: ['theme-dark'],
    body: ['theme-dark']
  },
  
  // Scene colors (from theme-colors.js)
  sceneColors: null, // Will be populated from getSceneColors() when theme is active
  
  // PHASE C2: Meta theme-color uses token from theme-colors.js
  // This ensures meta theme-color is always in sync with actual theme colors
  get metaThemeColor() {
    const colors = getThemeColorsByName('dark');
    return colors.bgBase; // Use bgBase from theme-colors.js
  }
};

/**
 * Theme configuration for Light theme
 */
export const LIGHT_THEME_CONFIG = {
  id: 'light',
  name: 'Light',
  
  // CSS classes to apply
  cssClasses: {
    html: ['theme-light'],
    body: ['theme-light']
  },
  
  // Scene colors (from theme-colors.js)
  sceneColors: null, // Will be populated from getSceneColors() when theme is active
  
  // PHASE C2: Meta theme-color uses token from theme-colors.js
  // This ensures meta theme-color is always in sync with actual theme colors
  get metaThemeColor() {
    const colors = getThemeColorsByName('light');
    return colors.bgBase; // Use bgBase from theme-colors.js
  }
};

/**
 * Get theme config by ID
 * @param {'dark' | 'light'} themeId
 * @returns {Object} Theme configuration
 */
export function getThemeConfig(themeId) {
  if (themeId === 'light') {
    return LIGHT_THEME_CONFIG;
  }
  return DARK_THEME_CONFIG;
}

/**
 * Get all available theme IDs
 * @returns {Array<string>}
 */
export function getAvailableThemeIds() {
  return ['dark', 'light'];
}

