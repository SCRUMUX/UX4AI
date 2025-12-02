/**
 * Theme Controller - Single source of truth for theme application
 * 
 * This is the ONLY place where themes should be applied.
 * All theme switching must go through applyThemeById().
 */

import { set, get, emit } from '../core/state.js';
import { getThemeConfig } from '../themes/ui-theme-config.js';
import { getSceneColors } from '../core/theme-colors.js';

let currentEngine = null;
let currentScenePlugin = null;

/**
 * Set engine reference (called once during initialization)
 * @param {Object} engine - Engine instance
 */
export function setEngine(engine) {
  currentEngine = engine;
}

/**
 * Set scene plugin reference (called after scene is mounted)
 * @param {Object} plugin - Scene plugin instance
 */
export function setScenePlugin(plugin) {
  currentScenePlugin = plugin;
}

/**
 * Apply theme by ID - THE ONLY WAY to change themes
 * 
 * This function:
 * 1. Updates global state (activeThemeId)
 * 2. Applies CSS classes to HTML/Body
 * 3. Updates meta theme-color tags
 * 4. Updates 3D scene colors (if scene is already mounted)
 * 5. Saves to localStorage
 * 
 * @param {'dark' | 'light'} themeId - Theme to apply
 * @param {Object} options - Optional settings
 * @param {boolean} options.saveToStorage - Save to localStorage (default: true)
 * @param {boolean} options.updateHash - Update URL hash (default: false)
 * @param {boolean} options.reload - Reload page after applying (default: false)
 */
export function applyThemeById(themeId, options = {}) {
  const {
    saveToStorage = true,
    updateHash = false,
    reload = false
  } = options;
  
  // Validate theme ID
  if (themeId !== 'dark' && themeId !== 'light') {
    console.warn('[ThemeController] Invalid themeId:', themeId, 'using dark');
    themeId = 'dark';
  }
  
  console.log('[ThemeController] Applying theme:', themeId);
  
  // 1. Update global state
  set('activeThemeId', themeId);
  
  // 2. Get theme config
  const themeConfig = getThemeConfig(themeId);
  
  // 3. Apply CSS classes to HTML and Body
  // Remove all theme classes first
  document.documentElement.classList.remove('theme-dark', 'theme-light');
  document.body.classList.remove('theme-dark', 'theme-light');
  
  // Add new theme classes
  themeConfig.cssClasses.html.forEach(cls => {
    document.documentElement.classList.add(cls);
  });
  themeConfig.cssClasses.body.forEach(cls => {
    document.body.classList.add(cls);
  });
  
  // Verify classes were applied
  const htmlHasCorrectTheme = themeConfig.cssClasses.html.some(cls => 
    document.documentElement.classList.contains(cls)
  );
  const bodyHasCorrectTheme = themeConfig.cssClasses.body.some(cls => 
    document.body.classList.contains(cls)
  );
  
  if (!htmlHasCorrectTheme || !bodyHasCorrectTheme) {
    console.error('[ThemeController] Failed to apply theme classes:', {
      themeId,
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      expectedHtml: themeConfig.cssClasses.html,
      expectedBody: themeConfig.cssClasses.body
    });
  }
  
  // 4. Update meta theme-color tags for mobile browsers
  const metaThemeColor = document.getElementById('meta-theme-color');
  const metaNavButton = document.getElementById('meta-navbutton-color');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeConfig.metaThemeColor);
  }
  if (metaNavButton) {
    metaNavButton.setAttribute('content', themeConfig.metaThemeColor);
  }
  
  // 5. Force CSS recalculation
  document.documentElement.offsetHeight; // Force reflow
  
  // ФАЗА B: Стабилизация кнопки темы после применения темы (до сохранения в localStorage)
  try {
    if (typeof window !== 'undefined' && window.hud && typeof window.hud.ensureThemeButton === 'function') {
      window.hud.ensureThemeButton();
    }
  } catch (e) {
    console.warn('[ThemeController] Could not call ensureThemeButton:', e);
  }
  
  // 6. Update 3D scene background and lights if engine is already initialized
  // This is critical: scene background and lights must match current theme
  if (currentEngine && currentEngine.scene) {
    try {
      // Force reflow to ensure CSS classes are applied
      document.documentElement.offsetHeight;
      
      // Read colors after theme classes are applied
      const sceneColors = getSceneColors(); // This reads current theme from DOM
      const sceneBg = sceneColors.background;
      
      const THREE = window.THREE || globalThis.THREE;
      if (THREE && THREE.Color) {
        // Update scene background
        if (currentEngine.scene.background) {
          currentEngine.scene.background = new THREE.Color(sceneBg);
          console.log('[ThemeController] Updated 3D scene background:', sceneBg, 'for theme:', themeId);
        }
        
        // Update lights if they exist
        currentEngine.scene.children.forEach(child => {
          if (child instanceof THREE.HemisphereLight) {
            child.color = new THREE.Color(sceneColors.lightHemi);
            child.groundColor = new THREE.Color(sceneColors.lightHemiGround);
            child.needsUpdate = true;
          } else if (child instanceof THREE.DirectionalLight) {
            child.color = new THREE.Color(sceneColors.lightDir);
            child.needsUpdate = true;
          }
        });
      } else {
        console.warn('[ThemeController] THREE.Color not available');
      }
    } catch (e) {
      console.warn('[ThemeController] Could not update scene background/lights:', e);
    }
  }
  
  // 7. Update scene plugin colors if plugin supports it
  // Note: Scene plugin materials will read colors from getSceneColors() on next render
  // Critical materials (background, lights) are updated above
  
  // 8. Save to localStorage
  if (saveToStorage) {
    try {
      localStorage.setItem('colorTheme', themeId);
    } catch (e) {
      console.warn('[ThemeController] Could not save theme to localStorage:', e);
    }
  }
  
  // 9. Update URL hash if requested
  if (updateHash) {
    try {
      const currentHash = location.hash.replace(/[?&]theme=[^&]*/g, '');
      const newHash = currentHash ? `${currentHash}&theme=${themeId}` : `#theme=${themeId}`;
      history.replaceState(null, '', newHash);
    } catch (e) {
      console.warn('[ThemeController] Could not update URL hash:', e);
    }
  }
  
  // 10. Emit theme changed event
  try {
    emit('themeChanged', { themeId, themeConfig });
  } catch (e) {
    console.warn('[ThemeController] Could not emit themeChanged event:', e);
  }
  
  console.log('[ThemeController] Theme applied successfully:', themeId);
  
  // 11. Reload page if requested (for complete reinitialization)
  // PHASE T2: reload is disabled by default - theme changes should be instant
  // Reload should only be used in exceptional cases (e.g., manual override)
  if (reload) {
    console.log('[ThemeController] Reloading page to ensure all components use correct theme...');
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

/**
 * Get current theme ID
 * Reads from state first, then falls back to DOM classes
 * @returns {'dark' | 'light'}
 */
export function getCurrentThemeId() {
  // Try state first
  const stateTheme = get('activeThemeId');
  if (stateTheme === 'dark' || stateTheme === 'light') {
    return stateTheme;
  }
  
  // Fallback: read from DOM (more reliable after page reload)
  if (typeof document !== 'undefined') {
    const isLight = document.documentElement.classList.contains('theme-light') ||
                    document.body.classList.contains('theme-light');
    return isLight ? 'light' : 'dark';
  }
  
  return 'dark';
}

/**
 * Initialize theme on app startup
 * Reads theme from localStorage/URL hash and applies it
 * Note: engine should be set separately via setEngine() before calling this
 */
export function initTheme() {
  // Read theme from localStorage or URL hash
  let themeId = 'dark'; // default
  
  try {
    // Try localStorage first
    const savedTheme = localStorage.getItem('colorTheme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      themeId = savedTheme;
      console.log('[ThemeController] Read theme from localStorage:', themeId);
    }
    
    // Override with URL hash if present
    const hashMatch = location.hash.match(/[?&]theme=([^&]*)/);
    if (hashMatch && (hashMatch[1] === 'light' || hashMatch[1] === 'dark')) {
      themeId = hashMatch[1];
      console.log('[ThemeController] Override theme from URL hash:', themeId);
    }
  } catch (e) {
    console.warn('[ThemeController] Could not read theme from storage/hash:', e);
  }
  
  console.log('[ThemeController] Initializing theme:', themeId);
  
  // Apply theme (without reload, without hash update)
  applyThemeById(themeId, {
    saveToStorage: false, // Don't save again, we just read it
    updateHash: false,
    reload: false
  });
  
  // DIAGNOSTIC: Verify theme classes were applied
  const htmlHasTheme = document.documentElement.classList.contains('theme-dark') || 
                       document.documentElement.classList.contains('theme-light');
  const bodyHasTheme = document.body.classList.contains('theme-dark') || 
                       document.body.classList.contains('theme-light');
  
  if (!htmlHasTheme || !bodyHasTheme) {
    console.warn('[ThemeController] Theme classes may not have been applied correctly:', {
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      expectedTheme: themeId
    });
  } else {
    console.log('[ThemeController] Theme classes verified:', {
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className
    });
  }
  
  return themeId;
}

