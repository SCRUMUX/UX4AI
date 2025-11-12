/**
 * Camera navigation: scroll-based and orbit mode
 * Extracted from index.html lines 1720-2626
 */

import * as THREE from 'three';

let targets = [];
let controls = [];
let rollAmplitudes = [];
let cycleHeight = 0;
let orbitMode = false;
let isOrbitDragging = false;
let orbitDragMoved = false;
let suppressLabelClick = false;
let orbitTheta = 0;
let orbitPhi = Math.PI / 2;
let orbitRadius = 6.5;

// Reset navigation state
export function resetNavigationState() {
  orbitMode = false;
  isOrbitDragging = false;
  orbitDragMoved = false;
  suppressLabelClick = false;
  targets = [];
  controls = [];
  rollAmplitudes = [];
  cycleHeight = 0;
}

function navDisabled() { 
  // Disable navigation when HUD is active
  return document.documentElement.classList.contains('hud-active') || 
         document.body.classList.contains('hud-active');
}

const ORBIT_MIN_RADIUS = 1.6;
const ORBIT_MAX_RADIUS = 12.0;
const ORBIT_ROTATE_SPEED = 0.006;
const ORBIT_ZOOM_SPEED = 0.0025;
const ORBIT_ZOOM_SPEED_PINCH = 0.004; // mobile pinch

export function initNavigation(camera, nodes, modeBanner, canvas) {
  console.log('[Navigation] Initializing global navigation system');
  const listeners = [];
  function on(target, type, handler, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, handler, options);
    listeners.push(() => {
      try { target.removeEventListener(type, handler, options); } catch {}
    });
  }
  function computeTargets() {
    targets = nodes.map(node => {
      const dir = node.position.clone().normalize();
      const camOffset = dir.clone().multiplyScalar(2.0);
      return { pos: node.position.clone().add(camOffset), lookAt: node.position.clone() };
    });
    controls = [];
    rollAmplitudes = [];
    const n = targets.length;
    for (let i = 0; i < n; i++) {
      const start = targets[i].pos;
      const end = targets[(i + 1) % n].pos;
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const cross = start.clone().cross(end).normalize();
      const dist = start.distanceTo(end);
      const control = mid.clone().add(cross.multiplyScalar(dist * 0.3));
      controls.push(control);
      rollAmplitudes.push((i % 2 === 0 ? 1 : -1) * 0.3);
    }
  }

  computeTargets();

  function setBodyHeight() {
    // Обычный скролл: одна петля + высота окна, чтобы хвост не срывался
    cycleHeight = window.innerHeight * targets.length;
    document.body.style.height = (cycleHeight + window.innerHeight) + 'px';
  }
  
  setBodyHeight();
  // Обновляем высоту на ресайз (debounce)
  {
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setBodyHeight();
      }, 150);
    };
    on(window, 'resize', onResize, { passive: true });
  }
  
  // Больше не вмешиваемся в браузерный скролл (никаких scrollTo в обработчике)
  // window.addEventListener('scroll', () => { /* no-op */ }, { passive: true });

  // Easing
  function ease(t) {
    if (t < 0.5) {
      return 4 * t * t * t;
    }
    const f = 2 * t - 2;
    return 1 + (f * f * f) / 2;
  }

  function updateCameraFromScroll() {
    if (navDisabled()) return;
    if (orbitMode) return;
    if (!targets.length) return;
    const total = targets.length;
    // Зацикливание только на фактических границах, чтобы не "перескакивать" разделы
    const yRaw = window.scrollY;
    if (cycleHeight > 0) {
      const EPS = 1;
      if (yRaw <= 0) {
        window.scrollTo(0, cycleHeight - EPS);
      } else if (yRaw >= cycleHeight) {
        window.scrollTo(0, EPS);
      }
    }
    // Используем виртуальную позицию прокрутки (mod), чтобы камера не замирала на краях
    const yClamped = Math.max(0, Math.min(window.scrollY, cycleHeight));
    const yVirtual = (cycleHeight > 0) ? ((yClamped % cycleHeight) + cycleHeight) % cycleHeight : 0;
    const progress = (cycleHeight === 0) ? 0 : (yVirtual / cycleHeight);
    const segFloat = progress * total;
    const idx = Math.floor(segFloat);
    const t = segFloat - idx;
    const nextIdx = (idx + 1) % total;
    const start = targets[idx];
    const end = targets[nextIdx];
    const control = controls[idx];
    const et = ease(t);
    const omt = 1 - et;

    const p = new THREE.Vector3();
    p.copy(start.pos).multiplyScalar(omt * omt)
      .add(control.clone().multiplyScalar(2 * omt * et))
      .add(end.pos.clone().multiplyScalar(et * et));

    const look = new THREE.Vector3().copy(start.lookAt).lerp(end.lookAt, et);

    // Zoom in near nodes, out between
    const nearFov = 35;
    const farFov = 75;
    const zoomFactor = Math.sin(Math.PI * et);
    camera.fov = nearFov + (farFov - nearFov) * zoomFactor;
    camera.updateProjectionMatrix();

    camera.position.copy(p);
    camera.lookAt(look);

    const rollAmp = rollAmplitudes[idx];
    const rollAngle = rollAmp * Math.sin(Math.PI * et);
    camera.up.set(0, 1, 0);
    camera.updateMatrixWorld();
    camera.rotateZ(rollAngle);
  }

  function enterOrbitMode() {
    if (orbitMode) return;
    console.log('[Navigation] ENTERING ORBIT MODE');
    orbitMode = true;
    const pos = camera.position.clone();
    orbitRadius = Math.max(ORBIT_MIN_RADIUS, Math.min(ORBIT_MAX_RADIUS, pos.length()));
    orbitTheta = Math.atan2(pos.z, pos.x);
    const rXY = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    orbitPhi = Math.atan2(rXY, pos.y);
    if (modeBanner) {
      modeBanner.style.display = 'block';
      console.log('[Navigation] Banner displayed');
    } else {
      console.warn('[Navigation] mode-banner not found!');
    }
    // Prevent page scroll/zoom gestures while orbiting (mobile)
    try {
      if (document && document.documentElement) {
        document.documentElement.classList.add('orbit-active');
      }
    } catch {}
  }

  function exitOrbitMode() {
    if (!orbitMode) return;
    orbitMode = false;
    isOrbitDragging = false;
    if (modeBanner) modeBanner.style.display = 'none';
    // Не трогаем позицию скролла при выходе из орбиты
    try {
      if (document && document.documentElement) {
        document.documentElement.classList.remove('orbit-active');
      }
    } catch {}
  }

  function clampOrbit() {
    const EPS = 0.001;
    orbitPhi = Math.max(EPS, Math.min(Math.PI - EPS, orbitPhi));
    orbitRadius = Math.max(ORBIT_MIN_RADIUS, Math.min(ORBIT_MAX_RADIUS, orbitRadius));
  }

  function updateCameraFromOrbit() {
    if (navDisabled()) return;
    clampOrbit();
    const sinPhi = Math.sin(orbitPhi);
    const cosPhi = Math.cos(orbitPhi);
    const cosTheta = Math.cos(orbitTheta);
    const sinTheta = Math.sin(orbitTheta);
    const x = orbitRadius * sinPhi * cosTheta;
    const y = orbitRadius * cosPhi;
    const z = orbitRadius * sinPhi * sinTheta;
    camera.position.set(x, y, z);
    camera.up.set(0, 1, 0);
    
    // Slightly offset center of rotation to create parallax effect
    const offsetTime = performance.now() * 0.00015;
    const centerOffset = new THREE.Vector3(
      Math.sin(offsetTime) * 0.8,
      Math.cos(offsetTime * 0.7) * 0.5,
      Math.cos(offsetTime * 1.2) * 0.6
    );
    
    camera.lookAt(centerOffset);
    camera.updateProjectionMatrix();
  }

  // Orbit mode input handling
  let isMouseDown = false;
  let lastX = 0;
  let lastY = 0;
  let orbitPending = false;
  let orbitStartTimer = null;
  const ORBIT_ACTIVATE_DELAY_MS = 180;
  const ORBIT_MOVE_SLOP = 4;

  console.log('[Navigation] Canvas parameter:', canvas);
  console.log('[Navigation] Canvas type:', typeof canvas);
  
  if (canvas) {
    console.log('[Navigation] Canvas found, attaching orbit handlers');
    console.log('[Navigation] Canvas style:', window.getComputedStyle(canvas));
    console.log('[Navigation] Adding mousedown listener to canvas');
    const onMouseDown = (e) => {
      if (navDisabled()) return;
      console.log('[Navigation] mousedown event fired, button:', e.button);
      if (e.button !== 0) {
        console.log('[Navigation] Button is not left mouse button (0), ignoring');
        return;
      }
      console.log('[Navigation] mousedown detected on LEFT button');
      isMouseDown = true;
      orbitPending = true;
      orbitDragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      clearTimeout(orbitStartTimer);
      orbitStartTimer = setTimeout(() => {
        if (isMouseDown && orbitPending) {
          console.log('[Navigation] Entering orbit mode (timer)');
          enterOrbitMode();
          isOrbitDragging = true;
        }
      }, ORBIT_ACTIVATE_DELAY_MS);
    };
    on(canvas, 'mousedown', onMouseDown);

    const onMouseMove = (e) => {
      if (navDisabled()) return;
      if (!isMouseDown) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (orbitPending && (Math.abs(dx) + Math.abs(dy) > ORBIT_MOVE_SLOP)) {
        console.log('[Navigation] Entering orbit mode (movement)');
        enterOrbitMode();
        isOrbitDragging = true;
      }
      if (!orbitMode || !isOrbitDragging) return;
      if (!orbitDragMoved && (Math.abs(dx) + Math.abs(dy) > 2)) {
        orbitDragMoved = true;
        suppressLabelClick = true;
      }
      orbitTheta -= dx * ORBIT_ROTATE_SPEED;
      orbitPhi -= dy * ORBIT_ROTATE_SPEED;
    };
    on(window, 'mousemove', onMouseMove);

    const onMouseUp = () => {
      if (navDisabled()) return;
      isMouseDown = false;
      orbitPending = false;
      clearTimeout(orbitStartTimer);
      isOrbitDragging = false;
      setTimeout(() => {
        suppressLabelClick = false;
        orbitDragMoved = false;
      }, 0);
    };
    on(window, 'mouseup', onMouseUp);

    const onWheel = (e) => {
      if (navDisabled()) return;
      if (!orbitMode) return;
      e.preventDefault();
      orbitRadius += e.deltaY * ORBIT_ZOOM_SPEED;
      updateCameraFromOrbit();
    };
    on(canvas, 'wheel', onWheel, { passive: false });

    // --- Touch support for mobile orbit ---
    let touchActive = false;
    let touchId = null;
    let pinchActive = false;
    let pinchStartDist = 0;
    const getTouch = (e) => {
      if (touchId == null) return e.touches[0];
      for (let i=0;i<e.touches.length;i++) if (e.touches[i].identifier === touchId) return e.touches[i];
      return e.touches[0];
    };
    const onTouchStart = (e) => {
      if (navDisabled()) return;
      if (!e.touches || e.touches.length === 0) return;
      // Two-finger pinch starts zoom interaction only if already in orbit mode
      if (e.touches.length === 2) {
        pinchActive = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy) || 1;
        return;
      }
      // Single-finger: do NOT enter orbit automatically on mobile
      const t = e.touches[0];
      touchId = t.identifier;
      touchActive = true;
      orbitDragMoved = false;
      lastX = t.clientX;
      lastY = t.clientY;
      // Only allow rotation if already in orbitMode (toggled via button)
      isOrbitDragging = !!orbitMode;
    };
    const onTouchMove = (e) => {
      if (navDisabled()) return;
      // Pinch zoom
      if (pinchActive && e.touches && e.touches.length === 2) {
        if (!orbitMode) return; // zoom acts only in orbit mode
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy) || 1;
        const delta = dist - pinchStartDist;
        pinchStartDist = dist;
        orbitRadius -= delta * ORBIT_ZOOM_SPEED_PINCH;
        updateCameraFromOrbit();
        try { e.preventDefault(); } catch {}
        return;
      }
      // One-finger rotate when already in orbit
      if (!touchActive) return;
      const t = getTouch(e);
      if (!t) return;
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      lastX = t.clientX;
      lastY = t.clientY;
      if (!orbitMode || !isOrbitDragging) return;
      if (!orbitDragMoved && (Math.abs(dx) + Math.abs(dy) > 2)) {
        orbitDragMoved = true;
        suppressLabelClick = true;
      }
      orbitTheta -= dx * ORBIT_ROTATE_SPEED;
      orbitPhi -= dy * ORBIT_ROTATE_SPEED;
      try { e.preventDefault(); } catch {}
    };
    const onTouchEnd = () => {
      if (navDisabled()) return;
      touchActive = false;
      touchId = null;
      clearTimeout(orbitStartTimer);
      isOrbitDragging = false;
      pinchActive = false;
      setTimeout(() => {
        suppressLabelClick = false;
        orbitDragMoved = false;
      }, 0);
    };
    on(canvas, 'touchstart', onTouchStart, { passive: false });
    on(canvas, 'touchmove', onTouchMove, { passive: false });
    on(canvas, 'touchend', onTouchEnd, { passive: false });
    on(canvas, 'touchcancel', onTouchEnd, { passive: false });
  }

  // Track pressed keys
  const keysPressed = {};
  const onKeyDown = (e) => {
    if (navDisabled()) return;
    if (e.key === 'Escape') {
      exitOrbitMode();
      return;
    }
    
    if (orbitMode) {
      if (e.key === 'w' || e.key === 'W') keysPressed.w = true;
      if (e.key === 's' || e.key === 'S') keysPressed.s = true;
      if (e.key === 'a' || e.key === 'A') keysPressed.a = true;
      if (e.key === 'd' || e.key === 'D') keysPressed.d = true;
      if (e.key === 'q' || e.key === 'Q') keysPressed.q = true;
      if (e.key === 'e' || e.key === 'E') keysPressed.e = true;
      return;
    }
    
    if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      navigateToNextNode();
    }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      navigateToPreviousNode();
    }
  };
  on(window, 'keydown', onKeyDown);
  const onKeyUp = (e) => {
    if (navDisabled()) return;
    if (e.key === 'w' || e.key === 'W') keysPressed.w = false;
    if (e.key === 's' || e.key === 'S') keysPressed.s = false;
    if (e.key === 'a' || e.key === 'A') keysPressed.a = false;
    if (e.key === 'd' || e.key === 'D') keysPressed.d = false;
    if (e.key === 'q' || e.key === 'Q') keysPressed.q = false;
    if (e.key === 'e' || e.key === 'E') keysPressed.e = false;
  };
  on(window, 'keyup', onKeyUp);
  
  // WASD camera movement
  function updateWASDNavigation() {
    if (!orbitMode) return;
    
    const speed = 0.05;
    const rotateSpeed = 0.02;
    
    if (keysPressed.w) orbitPhi -= rotateSpeed;
    if (keysPressed.s) orbitPhi += rotateSpeed;
    if (keysPressed.a) orbitTheta -= rotateSpeed;
    if (keysPressed.d) orbitTheta += rotateSpeed;
    if (keysPressed.q) orbitRadius += speed;
    if (keysPressed.e) orbitRadius -= speed;
    
    if (Object.values(keysPressed).some(v => v)) {
      updateCameraFromOrbit();
    }
  }
  
  // Start WASD update loop
  function wasdLoop() {
    if (!navDisabled() && orbitMode) {
      updateWASDNavigation();
    }
    requestAnimationFrame(wasdLoop);
  }
  wasdLoop();
  
  function navigateToNextNode() {
    if (!targets.length) return;
    const currentY = window.scrollY;
    const segment = cycleHeight / targets.length;
    const target = Math.min(cycleHeight, currentY + segment);
    window.scrollTo(0, target);
  }
  
  function navigateToPreviousNode() {
    if (!targets.length) return;
    const currentY = window.scrollY;
    const segment = cycleHeight / targets.length;
    const target = Math.max(0, currentY - segment);
    window.scrollTo(0, target);
  }

  // Mobile orbit toggle - show for Calm scene (global navigation)
  console.log('[Navigation] Setting up mobile orbit toggle for global navigation');
  const orbitContainer = document.getElementById('mobile-orbit-toggle');
  if (orbitContainer) {
    orbitContainer.style.display = 'flex';
    // Mark as controlled by global navigation
    orbitContainer.dataset.controller = 'global';
  }
  
  const mobileToggleBtn = document.getElementById('toggle-orbit-btn');
  if (mobileToggleBtn) {
    mobileToggleBtn.style.display = 'flex';
    // Mark as controlled by global navigation
    mobileToggleBtn.dataset.controller = 'global';
    
    const onBtnClick = () => {
      if (orbitMode) {
        exitOrbitMode();
        mobileToggleBtn.classList.remove('active');
      } else {
        enterOrbitMode();
        mobileToggleBtn.classList.add('active');
      }
    };
    on(mobileToggleBtn, 'click', onBtnClick);
    
    // Track mode changes
    const originalEnter = enterOrbitMode;
    const originalExit = exitOrbitMode;
    enterOrbitMode = function() {
      originalEnter();
      if (mobileToggleBtn) mobileToggleBtn.classList.add('active');
    };
    exitOrbitMode = function() {
      originalExit();
      if (mobileToggleBtn) mobileToggleBtn.classList.remove('active');
    };
  }

  function dispose() {
    console.log('[Navigation] Disposing global navigation system');
    // Exit orbit mode if active
    if (orbitMode) exitOrbitMode();
    
    // remove all listeners
    for (const off of listeners) { try { off(); } catch {} }
    // hide banner
    if (modeBanner) modeBanner.style.display = 'none';
    // reset button state and remove global controller marks
    if (mobileToggleBtn) {
      mobileToggleBtn.classList.remove('active');
      delete mobileToggleBtn.dataset.controller;
    }
    const orbitContainer = document.getElementById('mobile-orbit-toggle');
    if (orbitContainer) {
      orbitContainer.style.display = 'none';
      delete orbitContainer.dataset.controller;
    }
    // restore body height
    if (typeof document !== 'undefined' && document.body && document.body.style) {
      document.body.style.height = '';
      document.body.style.overflow = '';
      if (document.documentElement) {
        document.documentElement.style.overflow = '';
      }
    }
    // reset internal state
    resetNavigationState();
  }

  return {
    updateCameraFromScroll,
    updateCameraFromOrbit,
    get orbitMode() { return orbitMode; },
    get suppressLabelClick() { return suppressLabelClick; },
    enterOrbitMode,
    exitOrbitMode,
    dispose
  };
}


