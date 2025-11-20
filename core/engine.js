/**
 * Core engine: Renderer, Camera, Scene, and animation loop
 * Manages scene mounting, disposal, and theme switching
 */

// THREE.js will be imported via importmap
import * as THREE from 'three';

import { initPicking, setTargets, updateCamera as updatePickingCamera } from './picking.js';
import { initLabels, setAnchorsGetter, updatePositions, clearLabels } from './labels.js';
import { validateAnchors } from './sections.js';
import { emit } from './state.js';
import { initNavigation, resetNavigationState } from './navigation.js?v=35';
import { initHUD } from './hud-manager.js';
// PHASE C2: Import theme-colors for fallback values
import { getThemeColors } from './theme-colors.js';

export function createEngine({ canvasParent, labelsElement }) {
  // THREE.js setup
  // Mobile optimizations: reduce quality for better performance
  const isMobile = window.innerWidth <= 767;
  const renderer = new THREE.WebGLRenderer({ 
    antialias: !isMobile, // Disable antialiasing on mobile
    alpha: false,
    powerPreference: isMobile ? 'low-power' : 'high-performance'
  });
  // Reduce pixel ratio on mobile for better performance
  const maxPixelRatio = isMobile ? 1 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  // Disable shadows on mobile for better performance
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  canvasParent.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 1.2, 12);

  const scene = new THREE.Scene();
  // Use CSS variable for scene background (theme-aware)
  // Engine does NOT read theme from localStorage or classes - it relies on CSS variables
  // CSS variables are set by theme-controller.js, which is the single source of truth
  let sceneBg = getComputedStyle(document.documentElement).getPropertyValue('--scene-bg').trim();
  if (!sceneBg || sceneBg === '') {
    // PHASE C2: Fallback to theme-colors.js instead of hardcoded hex
    // This should rarely happen, as theme-controller initializes theme before engine creation
    console.warn('[Engine] --scene-bg CSS variable not available, using theme-colors.js fallback');
    const themeColors = getThemeColors();
    sceneBg = themeColors.bgBase; // Use bgBase from theme-colors.js
  }
  scene.background = new THREE.Color(sceneBg);

  // Initialize systems
  initPicking(renderer, camera);
  initLabels(labelsElement);

  let currentPlugin = null;
  let animationFrameId = null;
  let lastTime = 0;
  let navigation = null;
  let hud = null;
  let gridDebug = null;

  async function mount(sceneConfig) {
    // sceneConfig is a scene plugin configuration (e.g., calm), NOT a UI theme
    console.log('[Engine] Mounting scene:', sceneConfig.id);

    // Dispose previous scene
    if (navigation && typeof navigation.dispose === 'function') {
      try { navigation.dispose(); } catch (e) { console.warn('[Engine] nav.dispose error', e); }
      navigation = null;
    }
    if (currentPlugin) {
      console.log('[Engine] Disposing previous scene');
      if (currentPlugin.dispose) {
        currentPlugin.dispose();
      }
      scene.clear();
      clearLabels();
    }

    // Reset navigation state when switching scenes to prevent state leakage
    resetNavigationState();

    // Create new scene from scene factory
    try {
      const sceneModule = sceneConfig.sceneFactory(sceneConfig.config);
      const result = sceneModule.mount({
        scene,
        camera,
        renderer,
        theme: sceneConfig // Pass scene config for compatibility
      });

      // Validate anchors
      const anchors = result.getLabelAnchors();
      validateAnchors(anchors);

      // Register with systems
      setTargets(result.raycastTargets);
      setAnchorsGetter(result.getLabelAnchors);

      // Store plugin
      currentPlugin = result;
      // Expose plugin globally for UI grid synchronization and HUD access
      try {
        if (typeof window !== 'undefined') {
          if (sceneConfig && sceneConfig.id === 'calm') {
            window._calmPlugin = result;
          }
          // Also expose as currentPlugin for easier access
          window._engine = window._engine || {};
          window._engine.currentPlugin = result;
        }
      } catch (_) {}
      
      console.log('[Engine] Scene mounted:', {
        nodesCount: result.nodes?.length || 0,
        anchorsCount: anchors.length,
        targetsCount: result.raycastTargets?.length || 0
      });
      
      // Initialize navigation and HUD after scene is mounted
      console.log('[Engine] Calling initNavigationAndHUD with', result.nodes?.length || 0, 'nodes');
      if (result.nodes && result.nodes.length > 0) {
        console.log('[Engine] 🔍 Nodes order BEFORE initNavigation:', result.nodes.map(n => n.userData?.sectionId || n.name || 'unknown').join(', '));
      }
      try {
        // Reset document body height before initializing navigation
        if (!(result?.driveOnly)) {
          if (typeof document !== 'undefined' && document.body && document.body.style) {
            document.body.style.height = '';
            document.documentElement && (document.documentElement.scrollTop = 0);
            window.scrollTo(0, 0);
          }
        }
        initNavigationAndHUD(result.nodes || []);
        console.log('[Engine] Navigation and HUD initialized successfully');
      } catch (err) {
        console.error('[Engine] Failed to init navigation/HUD:', err);
      }

      // Update scene background to match current theme (in case it changed)
      // Scene colors are read from getSceneColors() which respects current UI theme
      // This is critical: scene must have correct background color for current theme
      try {
        // Force reflow to ensure theme classes are applied
        if (typeof document !== 'undefined') {
          document.documentElement.offsetHeight;
        }
        
        // Import theme-colors from same directory (core/)
        const { getSceneColors } = await import('./theme-colors.js');
        const sceneColors = getSceneColors();
        const sceneBg = sceneColors.background;
        
        if (scene.background) {
          scene.background = new THREE.Color(sceneBg);
          console.log('[Engine] Scene background updated to match theme:', sceneBg, 'for scene:', sceneConfig.id);
        } else {
          console.warn('[Engine] scene.background is null');
        }
      } catch (e) {
        console.warn('[Engine] Could not update scene background after mount:', e);
        // Fallback: read from CSS variable only (no theme class checking)
        try {
          const sceneBg = getComputedStyle(document.documentElement).getPropertyValue('--scene-bg').trim();
          if (sceneBg && scene.background) {
            scene.background = new THREE.Color(sceneBg);
            console.log('[Engine] Fallback: scene background set from CSS variable:', sceneBg);
          } else {
            console.warn('[Engine] Fallback: --scene-bg CSS variable not available');
          }
        } catch (e2) {
          console.warn('[Engine] Fallback scene background update also failed:', e2);
        }
      }

      emit('themeMounted', { themeId: sceneConfig.id }); // Legacy event name, but sceneId would be more accurate

      // Start animation if not running
      // CRITICAL: Animation must start after scene is mounted
      if (!animationFrameId) {
        console.log('[Engine] Starting animation loop...');
        startAnimation();
        console.log('[Engine] Animation loop started, animationFrameId:', animationFrameId);
      } else {
        console.log('[Engine] Animation already running, animationFrameId:', animationFrameId);
      }

      return result;
    } catch (error) {
      console.error('[Engine] Failed to mount theme:', error);
      throw error;
    }
  }

  function startAnimation() {
    console.log('[Engine] startAnimation() called');
    if (animationFrameId) {
      console.warn('[Engine] Animation already running, canceling previous frame');
      cancelAnimationFrame(animationFrameId);
    }
    
    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      // Pause 3D rendering only when tour is active on mobile devices
      // This improves mobile performance while keeping desktop and HUD functionality intact
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
      const tourActive = typeof document !== 'undefined' && 
        (document.body.classList.contains('tour-active') || 
         document.documentElement.classList.contains('tour-active'));
      
      // Only pause rendering on mobile when tour is active
      // Desktop: always render (even in tour/HUD)
      // Mobile: pause only in tour mode, continue in HUD and normal mode
      const shouldRender = !(isMobile && tourActive);

      const now = performance.now();
      const t = now / 1000;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Lazy create grid debug if requested
      try {
        if (!gridDebug && typeof window !== 'undefined') {
          const q = new URLSearchParams(window.location.search);
          if (q.get('griddebug') === '1') {
            gridDebug = document.createElement('div');
            // PHASE C2: Use CSS variables with theme-colors fallback (not hardcoded hex)
            const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() ||
                             getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Text/Muted').trim() ||
                             getThemeColors().textMuted;
            const bgOverlay = getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Surface/Overlay').trim() ||
                             getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Surface/2').trim() ||
                             getThemeColors().surfaceOverlay;
            const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() ||
                               getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Border/Default').trim() ||
                               getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Border/Base').trim() ||
                               getThemeColors().borderBase;
            gridDebug.style.cssText = `position:fixed;bottom:8px;left:8px;z-index:4000;font:12px/1.4 ui-sans-serif,system-ui; color:${textMuted}; background:${bgOverlay}; padding:6px 8px; border:1px solid ${borderColor}; border-radius:6px;`;
            document.body.appendChild(gridDebug);
          }
        }
      } catch(_) {}

      // Sync CSS HUD grid pulse with engine time
      try {
        const root = document.documentElement;
        if (root && root.style) {
          // Prefer scene-provided core pulse (sync with central sphere)
          const corePulse = (typeof window !== 'undefined' && typeof window._corePulse === 'number')
            ? window._corePulse
            : (0.5 + 0.5 * Math.sin(t * 0.9));
          // Soft breathing derived from corePulse
          const op = 0.60 + 0.40 * corePulse; // заметнее дыхание 0.6..1.0
          // Hue wobble заметнее
          const hue = 18 * (corePulse - 0.5);
          // Slow phase scroll for dashed pattern and shimmer
          const phase = ((t * 24) % 24).toFixed(2) + 'px';
          const shimmerH = ((t * -6 * 10) % 220) + '%';
          const shimmerV = ((t * -6 * 10) % 220) + '%';
          root.style.setProperty('--grid-opacity', op.toFixed(3));
          root.style.setProperty('--grid-hue', hue.toFixed(2) + 'deg');
          const sat = (1.0 + 0.4 * corePulse).toFixed(2);
          root.style.setProperty('--grid-sat', sat);
          // direct color drive for dashed paint
          // Stronger visible colour cycling (HSV→RGBapprox)
          const H = ( (corePulse * 360) % 360 );
          const S = 0.85; const V = 1.0;
          const C = V*S; const X = C*(1-Math.abs(((H/60)%2)-1)); const m = V-C;
          let r=0,g=0,b=0; const hSeg = Math.floor(H/60);
          if (hSeg===0){r=C;g=X;b=0;} else if (hSeg===1){r=X;g=C;b=0;} else if (hSeg===2){r=0;g=C;b=X;} else if (hSeg===3){r=0;g=X;b=C;} else if (hSeg===4){r=X;g=0;b=C;} else {r=C;g=0;b=X;}
          const R = Math.round((r+m)*255), G = Math.round((g+m)*255), B = Math.round((b+m)*255);
          // Theme-aware grid opacity: softer in light theme
          // PHASE C3.2: Even softer grid in light theme for better visibility
          const isLightTheme = document.documentElement.classList.contains('theme-light') ||
                               document.body.classList.contains('theme-light');
          let baseAlpha = 0.18;
          let pulseAlpha = 0.32;
          if (isLightTheme) {
            baseAlpha = 0.06;
            pulseAlpha = 0.12;
          }
          const a = (baseAlpha + pulseAlpha * corePulse).toFixed(3);
          const col = `rgba(${R}, ${G}, ${B}, ${a})`;
          root.style.setProperty('--grid-color', col);
          root.style.setProperty('--phase', phase);
          root.style.setProperty('--shimmerH', shimmerH);
          root.style.setProperty('--shimmerV', shimmerV);

          // Fallback: directly apply to grid lines to ensure visibility
          const overlayEl = document.getElementById('grid-overlay');
          if (overlayEl && overlayEl.children && overlayEl.children.length) {
            for (let i = 0; i < overlayEl.children.length; i++) {
              const lineEl = overlayEl.children[i];
              if (!lineEl || !lineEl.style) continue;
              lineEl.style.opacity = op.toFixed(3);
              lineEl.style.filter = `hue-rotate(${hue.toFixed(2)}deg) saturate(${sat})`;
              // drive dash paint colour directly to bypass cascade issues
              lineEl.style.setProperty('--c', col);
              // Also rebuild repeating-gradient explicitly to ensure re-render
              const dashStr = lineEl.style.getPropertyValue('--dash') || '10px';
              const gapStr  = lineEl.style.getPropertyValue('--gap')  || '8px';
              const dash = parseFloat(dashStr) || 10;
              const gap  = parseFloat(gapStr)  || 8;
              const isH = lineEl.classList && lineEl.classList.contains('h');
              if (isH) {
                lineEl.style.backgroundImage = `repeating-linear-gradient(90deg, ${col} 0 ${dash}px, rgba(255,255,255,0) ${dash}px ${dash+gap}px)`;
                lineEl.style.backgroundPosition = `${phase} 0`;
                lineEl.style.backgroundSize = `${dash+gap}px 100%`;
              } else {
                lineEl.style.backgroundImage = `repeating-linear-gradient(180deg, ${col} 0 ${dash}px, rgba(255,255,255,0) ${dash}px ${dash+gap}px)`;
                lineEl.style.backgroundPosition = `0 ${phase}`;
                lineEl.style.backgroundSize = `100% ${dash+gap}px`;
              }
              // Fallback solid background to confirm colour change (overridden by gradient but ensures paint)
              lineEl.style.backgroundColor = col;
              // Boost visibility via dynamic glow synced to pulse
              const glowA = (0.15 + 0.45 * corePulse).toFixed(3);
              const glowB = (0.10 + 0.30 * corePulse).toFixed(3);
              lineEl.style.boxShadow = `0 0 6px rgba(92,182,255,${glowA}), 0 0 16px rgba(92,182,255,${glowB})`;
              // Force composition: toggle blend mode and thickness at peaks
              lineEl.style.mixBlendMode = (corePulse > 0.65 ? 'normal' : 'screen');
              if (isH) {
                lineEl.style.height = (corePulse > 0.8 ? '2px' : '1px');
              } else {
                lineEl.style.width  = (corePulse > 0.8 ? '2px' : '1px');
              }
              if (lineEl.classList && lineEl.classList.contains('h')) {
                lineEl.style.backgroundPosition = `${phase} 0`;
              } else {
                lineEl.style.backgroundPosition = `0 ${phase}`;
              }
            }
            if (gridDebug) {
              gridDebug.textContent = `lines:${overlayEl.children.length} pulse:${corePulse.toFixed(3)} op:${op.toFixed(2)} hue:${hue.toFixed(1)} sat:${sat}`;
            }
          }
        }
      } catch (_) {}

      // Skip 3D updates and rendering when tour is active on mobile to improve performance
      if (shouldRender) {
        // Update camera navigation (skip for drive-only scenes)
        if (navigation && !(currentPlugin?.driveOnly)) {
          navigation.updateCameraFromScroll();
          if (navigation.orbitMode) {
            navigation.updateCameraFromOrbit();
          }
        }

        // Update scene plugin (CRITICAL: this updates scene animations)
        if (currentPlugin && currentPlugin.update) {
          try {
            currentPlugin.update(t, dt);
          } catch (e) {
            console.error('[Engine] Error in plugin.update:', e);
          }
        } else if (!currentPlugin) {
          // Log warning only once per second to avoid spam
          const logKey = 'noPluginWarning';
          if (!window[logKey] || Date.now() - window[logKey] > 1000) {
            console.warn('[Engine] No currentPlugin available for update');
            window[logKey] = Date.now();
          }
        }

        // Determine active camera (scene may provide its own)
        const activeCamera = (currentPlugin && typeof currentPlugin.getActiveCamera === 'function')
          ? currentPlugin.getActiveCamera() || camera
          : camera;

        // Update label positions with active camera
        updatePositions(activeCamera, renderer);

        // Render (CRITICAL: this actually draws the scene)
        try {
          renderer.render(scene, activeCamera);
        } catch (e) {
          console.error('[Engine] Error in renderer.render:', e);
        }
      }
    }

    lastTime = performance.now();
    animate();
  }

  // Toggle grid debug overlay with Alt+G
  try {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        if (!gridDebug) {
          gridDebug = document.createElement('div');
          // PHASE C2: Use CSS variables with theme-colors fallback (not hardcoded hex)
          const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() ||
                           getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Text/Muted').trim() ||
                           getThemeColors().textMuted;
          const bgOverlay = getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Surface/Overlay').trim() ||
                           getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Surface/2').trim() ||
                           getThemeColors().surfaceOverlay;
          const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() ||
                             getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Border/Default').trim() ||
                             getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Border/Base').trim() ||
                             getThemeColors().borderBase;
          gridDebug.style.cssText = `position:fixed;bottom:8px;left:8px;z-index:4000;font:12px/1.4 ui-sans-serif,system-ui; color:${textMuted}; background:${bgOverlay}; padding:6px 8px; border:1px solid ${borderColor}; border-radius:6px;`;
          document.body.appendChild(gridDebug);
        } else {
          const visible = gridDebug.style.display !== 'none';
          gridDebug.style.display = visible ? 'none' : 'block';
        }
      }
    }, { passive: true });
  } catch(_) {}

  function initNavigationAndHUD(nodes) {
    console.log('[Engine] initNavigationAndHUD called with', nodes?.length || 0, 'nodes');
    const modeBanner = document.getElementById('mode-banner');
    console.log('[Engine] Initializing navigation with canvas:', renderer.domElement);
    console.log('[Engine] Mode banner:', modeBanner);
    // Always dispose any previous navigation before creating a new one
    if (navigation && typeof navigation.dispose === 'function') {
      try { navigation.dispose(); } catch {}
      navigation = null;
    }
    // Skip navigation init for drive-only scenes
    if (!(currentPlugin?.driveOnly)) {
      navigation = initNavigation(camera, nodes, modeBanner, renderer.domElement);
      console.log('[Engine] Navigation initialized:', navigation);
    } else {
      navigation = null;
      // Don't hide mode-banner here - let drive-only scenes manage it themselves
      console.log('[Engine] Global navigation disabled for drive-only scene (scene manages its own navigation)');
    }

    // Ensure picking/labels use the correct camera after mount
    const activeCamera = (currentPlugin && typeof currentPlugin.getActiveCamera === 'function')
      ? currentPlugin.getActiveCamera() || camera
      : camera;
    updatePickingCamera(activeCamera);
    
    // Only initialize HUD if it hasn't been initialized yet
    // HUD may have been initialized early in bootstrap, but without nodes
    if (!hud) {
      // ФАЗА A: Логирование перед инициализацией HUD
      console.log('[Bootstrap] Before initHUD');
      console.log('[Engine] Initializing HUD with', nodes?.length || 0, 'nodes');
      hud = initHUD({
        overlay: document.getElementById('overlay'),
        hudObjectIcon: document.getElementById('hud-object-icon'),
        hudBigPanel: document.getElementById('hud-big-panel'),
        hudSmallPanel: document.getElementById('hud-small-panel'),
        hudContainer: document.getElementById('hud-container'),
        labelsLayer: labelsElement,
        btnAbout: document.getElementById('btn-about'),
        btnLinks: document.getElementById('btn-links'),
        btnDemo: document.getElementById('btn-demo'),
        linksPanel: document.getElementById('links-panel'),
        btnLinksClose: document.getElementById('btn-links-close'),
        nodes: nodes || []
      });
      // ФАЗА A: Логирование после инициализации HUD
      console.log('[Bootstrap] After initHUD', { hudApiKeys: hud && Object.keys(hud || {}) });
      // Expose HUD globally for tour integration and other modules
      try {
        if (typeof window !== 'undefined') {
          window._hud = hud;
          // ФАЗА B: Сохранить ensureThemeButton для стабилизации кнопки темы
          if (hud && typeof hud.ensureThemeButton === 'function') {
            if (!window.hud) window.hud = {};
            window.hud.ensureThemeButton = hud.ensureThemeButton;
            console.log('[Bootstrap] ensureThemeButton saved to window.hud.ensureThemeButton');
          }
        }
      } catch (_) {}
    } else {
      // HUD already exists (initialized early), but nodes are now available
      // Update HUD's internal nodes reference if possible
      console.log('[Engine] HUD already initialized, nodes available:', nodes?.length || 0);
      // HUD will get nodes from engine plugin when needed (see btnDemo handler in hud-manager.js)
    }
  }

  function resize(width, height) {
    // Adjust active camera (scene-provided or engine camera)
    const activeCamera = (currentPlugin && typeof currentPlugin.getActiveCamera === 'function')
      ? currentPlugin.getActiveCamera() || camera
      : camera;
    if (activeCamera) {
      activeCamera.aspect = width / height;
      activeCamera.updateProjectionMatrix();
    }
    renderer.setSize(width, height);
    updatePickingCamera(activeCamera || camera);

    if (currentPlugin && currentPlugin.resize) {
      currentPlugin.resize(width, height);
    }
  }

  function dispose() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (currentPlugin && currentPlugin.dispose) {
      currentPlugin.dispose();
    }

    scene.clear();
    renderer.dispose();
    clearLabels();
  }

  // Event system
  const eventListeners = {};
  
  function on(event, callback) {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
  }

  // Expose API
  const engineAPI = {
    renderer,
    camera,
    scene,
    mount: async (theme) => {
      const result = await mount(theme);
      // Trigger event
      if (eventListeners.themeMounted) {
        eventListeners.themeMounted.forEach(fn => fn({ themeId: theme.id }));
      }
      return result;
    },
    resize,
    dispose,
    on,
    get currentPlugin() { return currentPlugin; },
    initNavigationAndHUD
  };

  return engineAPI;
}
