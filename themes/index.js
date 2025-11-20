/**
 * Scene Registry - Registry of available 3D scene plugins
 * 
 * NOTE: This is NOT for UI themes (dark/light).
 * UI themes are managed by ui/theme-controller.js
 * 
 * This registry is only for 3D scene plugins (calm, etc.)
 */

import { calm } from './calm.js?v=35';

/**
 * Scene plugins registry
 * Maps scene IDs to scene configurations
 */
export const SCENES = {
  calm
};

/**
 * Get scene configuration by ID
 * @param {string} id - Scene ID (e.g., 'calm')
 * @returns {Object} Scene configuration
 */
export function getScene(id) {
  return SCENES[id] || SCENES.calm;
}

/**
 * Get all available scene IDs
 * @returns {Array<string>}
 */
export function getAllSceneIds() {
  return Object.keys(SCENES);
}

/**
 * Legacy: kept for backward compatibility
 * @deprecated Use getScene() instead
 */
export const THEMES = SCENES;

/**
 * Legacy: kept for backward compatibility
 * @deprecated Use getScene() instead
 */
export function getTheme(id) {
  return getScene(id);
}

/**
 * Legacy: kept for backward compatibility
 * @deprecated Use getAllSceneIds() instead
 */
export function getAllThemes() {
  return Object.values(SCENES);
}

