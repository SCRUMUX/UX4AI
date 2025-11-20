/**
 * Theme Switcher - UI for selecting and applying themes
 * 
 * REFACTORED: Now uses unified theme-controller.js
 * This module only handles UI (button/select) and delegates to applyThemeById()
 */

import { applyThemeById, getCurrentThemeId, setEngine } from './theme-controller.js';

/**
 * Initialize theme switcher UI
 * 
 * PHASE T2: Thin wrapper - delegates theme management to theme-controller
 * 
 * This function:
 * 1. Sets up engine reference in theme controller (for scene color updates)
 * 2. Mounts the scene ONCE (calm scene only)
 * 3. Does NOT manage theme initialization (that's done in bootstrap via initTheme())
 * 4. Does NOT create theme toggle button (that's done in hud-manager.js)
 * 
 * @param {Object} engine - Engine instance
 */
export function initThemeSwitcher(engine) {
  console.log('[ThemeSwitcher] Initializing (thin wrapper mode)...');
  
  // Set engine reference in theme controller (for scene color updates on theme change)
  setEngine(engine);
  
  // NOTE: UI theme (dark/light) is already initialized in bootstrap via initTheme()
  // We only mount the scene here - always calm, regardless of localStorage/hash
  // Scene colors will be updated automatically by theme-controller when theme changes
  
  // Mount scene ONCE with calm scene plugin
  // Scene is independent of UI theme - it will read colors from getSceneColors()
  // IMPORTANT: We must await scene mounting to ensure it completes
  mountCalmScene(engine).then(() => {
    console.log('[ThemeSwitcher] Calm scene mounted successfully');
  }).catch(e => {
    console.error('[ThemeSwitcher] Failed to mount calm scene:', e);
  });
  
  console.log('[ThemeSwitcher] Initialized (thin wrapper)');
}

/**
 * Mount calm scene (only scene plugin available)
 * This is called ONCE during initialization
 * @param {Object} engine - Engine instance
 */
async function mountCalmScene(engine) {
  console.log('[ThemeSwitcher] Mounting calm scene...');
  
  try {
    // Import calm scene config from themes directory
    // Use relative path from ui/ directory to themes/ directory
    const { calm } = await import('../themes/calm.js?v=1');
    
    // Mount scene with calm config
    await engine.mount(calm);
    console.log('[ThemeSwitcher] Calm scene mounted');
  } catch (e) {
    console.error('[ThemeSwitcher] Failed to mount calm scene:', e);
  }
}

/**
 * Toggle theme (dark <-> light)
 * Called by theme toggle button
 * 
 * PHASE T2: Theme switching enabled - delegates to theme-controller
 * 
 * @param {Object} options - Options for theme application
 */
export function toggleTheme(options = {}) {
  const currentThemeId = getCurrentThemeId();
  const newThemeId = currentThemeId === 'dark' ? 'light' : 'dark';
  
  console.log('[ThemeSwitcher] Toggling theme:', currentThemeId, '->', newThemeId);
  
  // Delegate to theme-controller (single source of truth)
  applyThemeById(newThemeId, {
    saveToStorage: true,
    updateHash: false,
    reload: false, // No reload - theme changes should be instant
    ...options
  });
}

/**
 * Apply specific theme by ID
 * 
 * PHASE T2: Theme switching enabled - delegates to theme-controller
 * 
 * @param {'dark' | 'light'} themeId
 * @param {Object} options
 */
export function switchToTheme(themeId, options = {}) {
  console.log('[ThemeSwitcher] Switching to theme:', themeId);
  
  // Delegate to theme-controller (single source of truth)
  applyThemeById(themeId, {
    saveToStorage: true,
    updateHash: false,
    reload: false, // No reload - theme changes should be instant
    ...options
  });
}
