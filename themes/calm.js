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
  // ALL colors are read from CSS tokens via getSceneColors() in the scene plugin
  config: {
    // Background will be read from getSceneColors().background
    background: null,
    
    // Colors are NO LONGER hardcoded here - they come from CSS tokens
    // See styles/tokens.css for --Scene/Node/* variables
    colors: {
      nodePalette: null,    // Will use getSceneColors().nodePalette from CSS
      impulseColor: null    // Will use getSceneColors().impulseColor from CSS
    },
    speeds: {
      swirl: 0.6
    }
  },
  
  // Scene factory - creates the 3D scene plugin
  sceneFactory: calmSceneCompleteFactory
};

