/**
 * Preloader Module - UX4AI
 * 
 * Manages preloader animation and lifecycle.
 * Refactored from iframe-based implementation to inline module.
 */

const tStroke = 1200;
const tFill = 700;
const tGlitch = 900;   // окно глитча
const gap = 160;

const LINES = [
  "Собрал приколный загрузчик...",
  "Что бы проверять ваше терпение со вкусом...)",
  "..ой ладно просто шучу )",
  "пошел смотреть че там так долго рил",
  "говорят это все из-за рептилоидов",
  "тааак.... а теперь что случилось!?!?",
  "исполняю знаменитый танец с бубном",
  "стучу нотуом по деревянной голове...",
  "делаю тройное сальто назад",
  "трах тибидох... и .... пое-е-хали!!!"
];

let overlay = null;
let mainText = null;
let shadowText = null;
let gGroup = null;
let gC = null;
let gM = null;
let turb = null;
let streamList = null;
let hideCallback = null;

/**
 * Initialize preloader
 * @param {Function} onHide - Callback to call when preloader should be hidden (from external control)
 */
export function initPreloader(onHide = null) {
  const root = document.documentElement;
  const body = document.body;
  
  overlay = document.getElementById('preloader-overlay');
  if (!overlay) {
    console.error('[Preloader] Preloader overlay not found in DOM');
    console.error('[Preloader] DOM ready state:', document.readyState);
    return;
  }
  
  console.log('[Preloader] Overlay found, checking elements...');
  
  // Get SVG elements
  mainText = overlay.querySelector('#main');
  shadowText = overlay.querySelector('#shadow');
  gGroup = overlay.querySelector('#glitchGroup');
  gC = overlay.querySelector('#gC');
  gM = overlay.querySelector('#gM');
  turb = overlay.querySelector('#turb');
  streamList = overlay.querySelector('#streamList');
  
  const missingElements = [];
  if (!mainText) missingElements.push('#main');
  if (!shadowText) missingElements.push('#shadow');
  if (!gGroup) missingElements.push('#glitchGroup');
  if (!gC) missingElements.push('#gC');
  if (!gM) missingElements.push('#gM');
  if (!turb) missingElements.push('#turb');
  if (!streamList) missingElements.push('#streamList');
  
  if (missingElements.length > 0) {
    console.error('[Preloader] Missing elements:', missingElements);
    console.error('[Preloader] Overlay HTML:', overlay.innerHTML.substring(0, 200));
    return;
  }
  
  console.log('[Preloader] All elements found successfully');
  
  // Store hide callback
  hideCallback = onHide;
  
  // Lock scroll
  root.classList.add('ux4ai-preload-lock');
  body.classList.add('ux4ai-preload-lock');
  
  // Ensure overlay is visible (remove hidden class if present)
  overlay.classList.remove('hidden');
  
  // Start animation loop
  console.log('[Preloader] Starting animation loop...');
  loopLogo(() => {
    console.log('[Preloader] First animation cycle completed, starting streaming lines...');
    streamAllLines();
  }).catch(err => {
    console.error('[Preloader] Animation loop error:', err);
  });
  
  // CRITICAL: Timeout fallback - if preloader is visible for more than 5 seconds, force hide
  setTimeout(() => {
    if (overlay && !overlay.classList.contains('hidden')) {
      console.warn('[Preloader] Timeout fallback: preloader visible for more than 5 seconds, forcing hide');
      hidePreloader();
    }
  }, 5000);
  
  console.log('[Preloader] Initialized successfully');
}

/**
 * Hide preloader with fade-out animation
 * CRITICAL: Always removes ux4ai-preload-lock and cleans up inline styles
 */
export function hidePreloader() {
  const root = document.documentElement;
  const body = document.body;
  
  // CRITICAL: Always remove preload lock, even if overlay is missing
  try {
    root.classList.remove('ux4ai-preload-lock');
    body.classList.remove('ux4ai-preload-lock');
  } catch (e) {
    console.warn('[Preloader] Error removing preload lock:', e);
  }
  
  if (!overlay) {
    console.warn('[Preloader] Cannot hide: overlay not found');
    return;
  }
  
  if (overlay.classList.contains('hidden')) {
    // Already hidden, but ensure cleanup
    // Remove inline styles if any
    try {
      overlay.style.cssText = '';
    } catch (e) {
      console.warn('[Preloader] Error clearing inline styles:', e);
    }
    // Ensure removal from DOM
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        try {
          overlay.remove();
        } catch (e) {
          console.warn('[Preloader] Error removing overlay from DOM:', e);
        }
      }
    }, 100);
    return;
  }
  
  // Add hidden class (CSS handles fade-out)
  overlay.classList.add('hidden');
  
  // Remove inline styles after hiding
  setTimeout(() => {
    if (overlay) {
      try {
        overlay.style.cssText = '';
      } catch (e) {
        console.warn('[Preloader] Error clearing inline styles:', e);
      }
    }
  }, 50);
  
  // Remove from DOM after animation
  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      try {
        overlay.remove();
        console.log('[Preloader] Overlay removed from DOM');
      } catch (e) {
        console.warn('[Preloader] Error removing overlay from DOM:', e);
      }
    }
  }, 700);
  
  console.log('[Preloader] Hidden');
  
  // Call external hide callback if provided
  if (hideCallback && typeof hideCallback === 'function') {
    try {
      hideCallback();
    } catch (e) {
      console.warn('[Preloader] Error calling hide callback:', e);
    }
  }
}

/* ====== LOGO ANIMATIONS */
function animateStroke(el) {
  if (!el) return null;
  el.style.strokeDasharray = 1800;
  el.style.strokeDashoffset = 1800;
  return el.animate([
    { strokeDashoffset: 1800 },
    { strokeDashoffset: 0 }
  ], { duration: tStroke, easing: 'ease', fill: 'forwards' });
}

function animateFill(el) {
  if (!el) return null;
  const a = el.animate([
    { fill: 'transparent', strokeWidth: 3 },
    { fill: 'url(#grad)', strokeWidth: 2 }
  ], { duration: tFill, easing: 'ease', fill: 'forwards' });
  return a;
}

function resetSVG() {
  if (!mainText || !shadowText) return;
  
  [mainText, shadowText].forEach(el => {
    if (el) {
      el.getAnimations().forEach(a => a.cancel());
      el.style.strokeDashoffset = 1800;
      el.style.strokeWidth = 3;
      el.style.fill = 'transparent';
    }
  });
  
  if (gC) gC.removeAttribute('transform');
  if (gM) gM.removeAttribute('transform');
  if (gGroup) gGroup.setAttribute('opacity', '0');
}

function runOutlineNoiseGlitch() {
  if (!gGroup || !gC || !gM || !turb) {
    return Promise.resolve();
  }
  
  gGroup.setAttribute('opacity', '1');
  let rafId = null;
  const t0 = performance.now();
  
  function tick() {
    const t = performance.now() - t0;
    // каналовые сдвиги (только translate, чтобы размер не менялся)
    const cx = Math.round(Math.sin(t / 18) * 6);
    const cy = Math.round(Math.cos(t / 22) * 5);
    const mx = Math.round(Math.sin(t / 20 + 1.2) * 7);
    const my = Math.round(Math.cos(t / 24 + 0.7) * 5);
    
    if (gC) gC.setAttribute('transform', `translate(${cx},${cy})`);
    if (gM) gM.setAttribute('transform', `translate(${mx},${my})`);
    
    // живая анимация шума: меняем seed и чуть baseFrequency
    const bf = 0.010 + (Math.sin(t / 300) + 1) * 0.004; // 0.01..0.018
    if (turb) {
      turb.setAttribute('baseFrequency', bf.toFixed(3));
      turb.setAttribute('seed', Math.floor(t / 60) % 100 + 1);
    }
    
    if (t < tGlitch) {
      rafId = requestAnimationFrame(tick);
    }
  }
  
  rafId = requestAnimationFrame(tick);
  
  return new Promise(res => {
    setTimeout(() => {
      if (rafId) cancelAnimationFrame(rafId);
      res();
    }, tGlitch);
  });
}

function endGlitch() {
  if (gGroup) gGroup.setAttribute('opacity', '0');
  if (gC) gC.removeAttribute('transform');
  if (gM) gM.removeAttribute('transform');
}

async function loopLogo(onFirstCycleEnd) {
  let first = true;
  while (true) {
    // Check if preloader was hidden
    if (!overlay || overlay.classList.contains('hidden')) {
      break;
    }
    
    resetSVG();
    
    const shadowAnim = animateStroke(shadowText);
    const mainAnim = animateStroke(mainText);
    
    if (shadowAnim && mainAnim) {
      await Promise.all([shadowAnim.finished, mainAnim.finished]);
    }
    
    const fillAnim = animateFill(mainText);
    if (fillAnim) {
      await fillAnim.finished;
    }
    
    await runOutlineNoiseGlitch();
    endGlitch();
    
    if (first && typeof onFirstCycleEnd === 'function') {
      first = false;
      onFirstCycleEnd();
    }
    
    await new Promise(r => setTimeout(r, gap));
  }
}

/* ====== STREAMING LINES */
async function typeLine(text, li) {
  const span = document.createElement('span');
  span.className = 'text';
  const tail = li.querySelector('.tail');
  if (tail) {
    li.insertBefore(span, tail);
  } else {
    li.appendChild(span);
  }

  const charDelay = Math.max(40, Math.min(120, Math.floor(3000 / Math.max(6, text.length)))); // ~3с
  for (let i = 0; i < text.length; i++) {
    span.textContent += text[i];
    await new Promise(r => setTimeout(r, charDelay));
  }
}

function makeTailSpinner() {
  const tail = document.createElement('span');
  tail.className = 'tail';
  const sp = document.createElement('span');
  sp.className = 'spinner';
  tail.appendChild(sp);
  return tail;
}

function makeTailOk() {
  const tail = document.createElement('span');
  tail.className = 'tail';
  const ok = document.createElement('span');
  ok.className = 'ok';
  ok.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  tail.appendChild(ok);
  return tail;
}

async function streamAllLines() {
  if (!streamList) return;
  
  for (let i = 0; i < LINES.length; i++) {
    // Check if preloader was hidden
    if (!overlay || overlay.classList.contains('hidden')) {
      break;
    }
    
    const li = document.createElement('li');
    li.innerHTML = '<span class="mono">#' + String(i + 1).padStart(2, '0') + '</span>';
    li.appendChild(makeTailSpinner());
    streamList.appendChild(li);
    streamList.scrollTop = streamList.scrollHeight;

    await typeLine(LINES[i], li);

    await new Promise(r => setTimeout(r, 2000)); // 2с спиннер
    const tail = li.querySelector('.tail');
    if (tail) {
      tail.replaceWith(makeTailOk());
    }
  }
}

