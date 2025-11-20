/**
 * Calm Scene Configuration
 * 
 * This is NOT a UI theme - it's a 3D scene plugin configuration.
 * UI themes (dark/light) are separate and defined in themes/ui-theme-config.js
 * 
 * Scene colors are read from core/theme-colors.js based on current UI theme.
 */

import { calmSceneCompleteFactory } from '../scenes/calmScene-complete.js?v=101';

/**
 * Calm scene configuration
 * This is used by engine.mount() to initialize the 3D scene
 * 
 * Note: Scene colors are NOT hardcoded here - they come from getSceneColors()
 * which reads the current UI theme (dark/light) from DOM/state
 */
export const calm = {
  id: 'calm',
  name: 'Calm',
  
  // Legacy: kept for compatibility with engine.mount() signature
  // But CSS vars are now managed by CSS classes (.theme-light, .theme-dark)
  cssVars: {},
  
  // Scene configuration
  // Colors will be read from getSceneColors() in the scene plugin itself
  config: {
    // Background will be overridden by getSceneColors() based on current UI theme
    background: null, // Will use getSceneColors().background
    
    // Node palette (same for both themes)
    colors: {
      nodePalette: [
        '#5B9CFF', '#22C55E', '#F59E0B', '#EF4444',
        '#8B5CF6', '#14B8A6', '#E11D48', '#A3E635'
      ],
      impulseColor: null // Will use getSceneColors().impulseColor
    },
    speeds: {
      swirl: 0.6
    }
  },
  
  // Scene factory - creates the 3D scene plugin
  sceneFactory: calmSceneCompleteFactory
};

