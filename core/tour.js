/**
 * Tour Module - Guided Tour System
 * 
 * PHASE 3: Refactored from index.html into separate module
 * 
 * Responsibilities:
 * - Tour configuration (steps)
 * - Tour state management (startTour, setStep, showTour, hideTour)
 * - Tour reset (tour_reset)
 * - Tour interactives (step 3)
 * 
 * Contract:
 * - Tour does NOT touch theme toggle button (#theme-toggle-btn)
 * - Tour does NOT touch HUD elements
 * - Tour only manages #tour-restart-btn visibility
 */

// Tour steps configuration
export const TOUR_STEPS = {
  1: {
    title: `Владимир Костял. UX-архитектор. 
    Проектировщик интерфейсов для AI-продуктов`,
    sub: 'Проектирую понятные и масштабируемые UX-паттерны для ассистентов, агентных систем и внутренних платформ. Прозрачность ИИ, контроль стоимости и продуктивность команд — в одном дизайне.',
    // SVG paths will be replaced with basePath in setStep function
    text: `<span style="display: inline-flex; align-items: center; gap: 8px;"><img src="__BASE_PATH__/supervisor_account_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="20" height="20" loading="lazy" />  Управляю продуктом и кросс-функциональными командами.</span> <br>
<span style="display: inline-flex; align-items: center; gap: 8px;"><img src="__BASE_PATH__/graph_2_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="20" height="20" loading="lazy" />  Собираю дизайн-системы и шаблоны для быстрого выхода в прод и роста.</span> <br>
<span style="display: inline-flex; align-items: center; gap: 8px;"><img src="__BASE_PATH__/monitoring_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="20" height="20" loading="lazy" />  Настраиваю метрики и дашборды (TTFT↓, cost/request↓, ошибки↓, CSAT/конверсия↑)</span>`,
    actions: [
      { type:'button', primary:true, label:'Кейсы', on:'next' },
      { type:'link', label:'Резюме', href:'./Vladimir_Kostyal_Resume.pdf' },
      { type:'link', label:'UX4AI (PDF гайд)', href:'https://t.me/...' },
      { type:'link', label:'Написать в TG', href:'https://t.me/scrumux' }
    ]
  },
  2: {
    title: 'Контролируемый AI вместо «чёрного ящика»',
    sub: 'Оркестрация ассистентов и агентов в одном интерфейсе: прозрачные решения, управляемые данные, безопасность и метрики. Рабочая система: роли и сценарии, права и бюджеты, единая панель контроля. Управление рисками: где хранятся данные, срок жизни, маскировка PII, аудит событий.',
    // SVG paths will be replaced with basePath in setStep function
    text: '<ul class="tour-list">\n<li><a href="#" target="_blank"><img src="__BASE_PATH__/call_made_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="18" height="18" loading="lazy" /> Почему так? — Live Answer Trace (Figma demo)</a></li>\n<li><a href="#" target="_blank"><img src="__BASE_PATH__/call_made_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="18" height="18" loading="lazy" /> Orchestrator Dashboard (Figma demo)</a></li>\n<li><a href="#" target="_blank"><img src="__BASE_PATH__/call_made_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="" width="18" height="18" loading="lazy" /> Scenario Builder / Playbooks (Figma demo)</a></li>\n</ul>',
    actions: [
      { type:'button', primary:false, label:'Назад', on:'back' },
      { type:'button', primary:true, label:'Далее', on:'next' },
      { type:'link', label:'Написать в TG', href:'https://t.me/scrumux' }
    ]
  },
  3: {
    title: 'От знакомства к исследованиям',
    sub: 'Люди решают за 6–10 секунд — заголовок, первая строка и наличие аргументов (исследование eye-tracking, F/Z-паттерны, «информационный запах»).',
    text: 'Если верить исследованию, первых 2 экранов должно было хватить  для принятия решения. Если нет... ну что же, это не единственная точка входа, а метрики дадут точную картину. Далее углубляемся непосредственно в тему UX для AI. Разбираемся в проблемах и исследуем решения ;)',
    actions: [
      { type:'button', primary:false, label:'Назад', on:'back' },
      { type:'button', primary:true, label:'К обзору', on:'finish' }
    ]
  }
};

// Helper: Sanitize HTML (allow only <br>, <ul>, <li>, <span>, <img>, <a>)
function sanitizeAllowBr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;ul(?:\s+class=\"tour-list\")?\s*&gt;/gi, '<ul class="tour-list">')
    .replace(/&lt;\/ul&gt;/gi, '</ul>')
    .replace(/&lt;li&gt;/gi, '<li>')
    .replace(/&lt;\/li&gt;/gi, '</li>')
    .replace(/&lt;span([^&]*)&gt;/gi, '<span$1>')
    .replace(/&lt;\/span&gt;/gi, '</span>')
    .replace(/&lt;img\s+([^&]*?)(?:\s*\/)?&gt;/gi, '<img $1>')
    .replace(/&lt;a\s+href=\"([^\"]*)\"(?:\s+target=\"[^\"]*\")?\s*&gt;/gi, '<a href="$1" target="_blank">')
    .replace(/&lt;\/a&gt;/gi, '</a>');
}

// Helper: Track analytics metric
function trackMetric(name, data) {
  if (typeof window.analytics !== 'undefined' && typeof window.analytics.track === 'function') {
    window.analytics.track(name, data);
  } else {
    console.info(`[Analytics] ${name}:`, data);
  }
}

// Helper: Create optimized touch/click handler
function createHandler(action, isMobile) {
  let isProcessing = false;
  return (e) => {
    if (isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isProcessing = true;
    e.preventDefault();
    e.stopPropagation();
    action();
    setTimeout(() => { isProcessing = false; }, 50);
  };
}

/**
 * Initialize tour system
 * @param {Object} options - Configuration options
 * @param {boolean} options.tourOff - Tour disabled via ?tour=off
 * @param {boolean} options.tourDone - Tour already completed
 * @returns {Object} Tour API { startTour, setStep, showTour, hideTour, tour_reset }
 */
export function initTour(options = {}) {
  const { tourOff = false, tourDone = false } = options;
  
  // Get base path for resources (SVG icons, PDFs, etc.)
  // This ensures paths work correctly regardless of server root directory
  const basePath = (typeof window !== 'undefined' && window.__UX4AI_BASE_PATH__) || '';
  
  // Get DOM elements
  const overlay = document.getElementById('tour-overlay');
  const titleEl = document.getElementById('tour-title');
  const subEl = document.getElementById('tour-sub');
  const textEl = document.getElementById('tour-text');
  const actionsEl = document.getElementById('tour-actions');
  const interactivesEl = document.getElementById('tour-interactives');
  
  // Handler registry for memory leak prevention (memory optimization)
  // Stores { element, handler, eventType } objects for later cleanup
  const registeredHandlers = [];
  
  /**
   * Register an event handler for later cleanup
   */
  function registerHandler(element, eventType, handler, options) {
    element.addEventListener(eventType, handler, options);
    registeredHandlers.push({ element, eventType, handler, options });
  }
  
  /**
   * Cleanup all registered handlers (memory optimization)
   */
  function cleanupHandlers() {
    while (registeredHandlers.length > 0) {
      const { element, eventType, handler, options } = registeredHandlers.pop();
      try {
        element.removeEventListener(eventType, handler, options);
      } catch (e) {
        // Element might be removed from DOM, ignore
      }
    }
    console.log('[Tour] Cleaned up event handlers');
  }
  
  // Validate required DOM elements
  if (!overlay) {
    console.error('[Tour] CRITICAL: tour-overlay element not found in DOM');
    return null;
  }
  
  if (!titleEl || !subEl || !textEl || !actionsEl) {
    console.error('[Tour] CRITICAL: Required tour elements not found:', {
      title: !!titleEl,
      sub: !!subEl,
      text: !!textEl,
      actions: !!actionsEl
    });
    return null;
  }
  
  // Validate steps configuration
  if (!TOUR_STEPS || !TOUR_STEPS[1]) {
    console.error('[Tour] CRITICAL: Step 1 configuration is missing');
    return null;
  }
  
  let currentStep = 1;
  
  /**
   * Set tour step
   * @param {number} step - Step number (1-3)
   * @returns {boolean} Success
   */
  function setStep(step) {
    const s = TOUR_STEPS[step];
    if (!s) {
      console.warn('[Tour] Missing step config', { step, availableSteps: Object.keys(TOUR_STEPS) });
      // Fallback to step 1
      if (!TOUR_STEPS[1]) {
        console.error('[Tour] CRITICAL: No step 1 config available. Tour cannot start.');
        return false;
      }
      step = 1;
      currentStep = 1;
    } else {
      currentStep = step;
    }
    
    // Validate DOM elements (they should be available from initTour, but check again for safety)
    // PHASE B: Only return false if elements are truly missing (real blocker)
    if (!overlay || !titleEl || !subEl || !textEl || !actionsEl) {
      console.error('[Tour] CRITICAL: DOM elements missing in setStep - cannot update tour content');
      return false;
    }
    
    // Update localStorage (non-blocking)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try { localStorage.setItem('tour_step', String(step)); } catch {}
      });
    } else {
      setTimeout(() => {
        try { localStorage.setItem('tour_step', String(step)); } catch {}
      }, 0);
    }
    
    // Update card class for step 2
    const card = document.querySelector('.tour-card');
    if (card) {
      if (step === 2) {
        card.classList.add('tour-step-2');
      } else {
        card.classList.remove('tour-step-2');
      }
    }
    
    // Update content
    titleEl.textContent = s.title;
    subEl.textContent = s.sub;
    // Replace __BASE_PATH__ placeholder with actual base path
    // CRITICAL: Re-compute basePath on each call to handle late initialization
    let textContent = sanitizeAllowBr(s.text);
    const currentBasePath = (typeof window !== 'undefined' && window.__UX4AI_BASE_PATH__) || '';
    // Log for debugging
    if (!currentBasePath && textContent.includes('__BASE_PATH__')) {
      console.warn('[Tour] Base path is empty! SVG paths may be incorrect. window.__UX4AI_BASE_PATH__:', window.__UX4AI_BASE_PATH__);
    }
    // Replace __BASE_PATH__ with actual base path (empty string if root, or /UX4AI if in subdirectory)
    textContent = textContent.replace(/__BASE_PATH__/g, currentBasePath);
    if (textContent.includes('__BASE_PATH__')) {
      console.error('[Tour] CRITICAL: __BASE_PATH__ placeholder not replaced! Remaining in text:', textContent.substring(0, 100));
    }
    textEl.innerHTML = textContent;
    actionsEl.innerHTML = '';
    
    // Clear and hide interactives by default
    if (interactivesEl) {
      interactivesEl.innerHTML = '';
      interactivesEl.setAttribute('aria-hidden', 'true');
      interactivesEl.classList.remove('loaded');
    }
    
    // Remove existing links container if any (cleanup from previous steps)
    const existingLinksContainer = textEl.parentElement.querySelector('.tour-body-links');
    if (existingLinksContainer) {
      existingLinksContainer.remove();
    }
    
    // All steps: buttons and links go in tour-actions
    {
      // Standard logic for steps 1 and 3 - links styled as links, not buttons
      s.actions.forEach(a => {
        if (a.type === 'link') {
          const link = document.createElement('a');
          link.className = 'btn';
          link.href = a.href;
          const isPdf = a.href.toLowerCase().endsWith('.pdf');
          if (isPdf) {
            link.target = '_blank';
            link.addEventListener('click', (e) => {
              setTimeout(() => {
                const downloadLink = document.createElement('a');
                downloadLink.href = a.href;
                downloadLink.download = a.href.split('/').pop() || 'download.pdf';
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
              }, 100);
            });
          } else {
            link.target = a.href.startsWith('http') ? '_blank' : '_self';
          }
          link.textContent = a.label;
          actionsEl.appendChild(link);
        } else {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn' + (a.primary ? ' btn-primary' : '');
          btn.textContent = a.label;
          
          const isMobile = window.innerWidth <= 767;
          let handler;
          
          if (a.on === 'next') {
            handler = createHandler(() => setStep(Math.min(3, step + 1)), isMobile);
          } else if (a.on === 'back') {
            handler = createHandler(() => setStep(Math.max(1, step - 1)), isMobile);
          } else if (a.on === 'finish') {
            handler = createHandler(() => finishTour(), isMobile);
          }
          
          if (handler) {
            if (isMobile) {
              registerHandler(btn, 'touchstart', handler, { passive: false });
            } else {
              registerHandler(btn, 'click', handler);
            }
          }
          
          actionsEl.appendChild(btn);
        }
      });
    }
    
    // Add "План оптимизации" and "Написать в TG" links for step 3
    if (step === 3) {
      // План оптимизации link
      const planButton = document.createElement('a');
      planButton.href = '/assets/UX4AI_90day_plan.pdf';
      planButton.className = 'btn';
      planButton.setAttribute('download', 'UX4AI_90day_plan.pdf');
      planButton.setAttribute('aria-label', 'Скачать план оптимизации');
      planButton.textContent = 'План оптимизации';
      planButton.target = '_blank';
      
      const isMobilePlan = window.innerWidth <= 767;
      const handlePlanAction = createHandler(() => {
        const downloadLink = document.createElement('a');
        downloadLink.href = '/assets/UX4AI_90day_plan.pdf';
        downloadLink.download = 'UX4AI_90day_plan.pdf';
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        trackMetric('metric_download_plan', { file: 'UX4AI_90day_plan.pdf' });
      }, isMobilePlan);
      
      if (isMobilePlan) {
        registerHandler(planButton, 'touchstart', handlePlanAction, { passive: false });
      } else {
        registerHandler(planButton, 'click', handlePlanAction);
      }
      actionsEl.appendChild(planButton);
      
      // Написать в TG link (last link before Close button)
      const tgLink = document.createElement('a');
      tgLink.href = 'https://t.me/scrumux';
      tgLink.className = 'btn';
      tgLink.target = '_blank';
      tgLink.textContent = 'Написать в TG';
      actionsEl.appendChild(tgLink);
    }
    
    // Add close button (styled as button, not link)
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Закрыть';
    
    const isMobileClose = window.innerWidth <= 767;
    const handleCloseAction = createHandler(() => dismissTour(), isMobileClose);
    
    if (isMobileClose) {
      registerHandler(closeBtn, 'touchstart', handleCloseAction, { passive: false });
    } else {
      registerHandler(closeBtn, 'click', handleCloseAction);
    }
    actionsEl.appendChild(closeBtn);
    
    // Add interactives for step 3
    if (step === 3 && interactivesEl) {
      initTourInteractives(interactivesEl);
    }
    
    // CLEAN ARCHITECTURE: No inline styles - CSS handles all states via :hover, :active
    // Tour buttons and links are styled in main.css
    
    // Update hash
    try { history.replaceState(null, '', `#tour/${step}`); } catch {}
    
    // Scroll tour card to top
    const tourCard = document.querySelector('.tour-card');
    if (tourCard) {
      requestAnimationFrame(() => {
        tourCard.scrollTop = 0;
      });
    }
    
    return true;
  }
  
  /**
   * Show tour overlay
   */
  function showTour() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.removeAttribute('inert');
    // Add tour-active class for CSS targeting (needed for hiding orbit button, etc.)
    document.documentElement.classList.add('tour-active');
    
    // Hide tour restart button (tour manages ONLY this button)
    try {
      const tourRestartBtn = document.getElementById('tour-restart-btn');
      if (tourRestartBtn) {
        tourRestartBtn.style.display = 'none';
      }
    } catch {}
    
    // Scroll tour card to top
    const tourCard = document.querySelector('.tour-card');
    if (tourCard) {
      requestAnimationFrame(() => {
        tourCard.scrollTop = 0;
      });
    }
  }
  
  /**
   * Hide tour overlay
   */
  function hideTour() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    // Remove tour-active class
    document.documentElement.classList.remove('tour-active');
    
    // Cleanup registered event handlers to prevent memory leaks (memory optimization)
    cleanupHandlers();
    
    // Show tour restart button (tour manages ONLY this button)
    try {
      const tourRestartBtn = document.getElementById('tour-restart-btn');
      if (tourRestartBtn) {
        tourRestartBtn.style.display = 'inline-flex';
      }
    } catch {}
  }
  
  /**
   * Finish tour (mark as done)
   */
  function finishTour() {
    hideTour();
    
    // Update localStorage (non-blocking)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try { localStorage.setItem('tour_done', '1'); } catch {}
        try { history.replaceState(null, '', location.pathname + location.search); } catch {}
      });
    } else {
      setTimeout(() => {
        try { localStorage.setItem('tour_done', '1'); } catch {}
        try { history.replaceState(null, '', location.pathname + location.search); } catch {}
      }, 0);
    }
    
    // Open "Основы UX для AI" section in HUD
    try {
      if (window.hud && typeof window.hud.openBasicsSection === 'function') {
        setTimeout(() => {
          window.hud.openBasicsSection();
        }, 300);
      }
    } catch (e) {
      console.warn('[Tour] Could not open basics section:', e);
    }
  }
  
  /**
   * Dismiss tour (close without marking as done)
   */
  function dismissTour() {
    hideTour();
    
    // Open "Основы UX для AI" section in HUD
    try {
      if (window.hud && typeof window.hud.openBasicsSection === 'function') {
        setTimeout(() => {
          window.hud.openBasicsSection();
        }, 300);
      }
    } catch (e) {
      console.warn('[Tour] Could not open basics section:', e);
    }
  }
  
  /**
   * Start tour from specific step
   * PHASE B: Stable start/reset without "stubs" - returns false only when tour is truly impossible to start
   * @param {number} initialStep - Starting step (default: 1)
   * @param {boolean} force - Force start even if tour is disabled via URL parameter (for tour_reset)
   * @returns {boolean} Success
   */
  function startTour(initialStep = 1, force = false) {
    // Validate steps configuration - this is a real blocker
    if (!TOUR_STEPS || !TOUR_STEPS[1]) {
      console.error('[Tour] CRITICAL: Cannot start tour - step 1 config is missing. Tour will not open.');
      console.error('[Tour] Available steps:', TOUR_STEPS ? Object.keys(TOUR_STEPS) : 'steps not defined');
      return false;
    }
    
    // Validate DOM elements - these are real blockers
    if (!overlay) {
      console.error('[Tour] CRITICAL: Cannot start tour - tour-overlay element not found in DOM');
      return false;
    }
    
    if (!titleEl) {
      console.error('[Tour] CRITICAL: Cannot start tour - tour-title element not found in DOM');
      return false;
    }
    
    if (!subEl) {
      console.error('[Tour] CRITICAL: Cannot start tour - tour-sub element not found in DOM');
      return false;
    }
    
    if (!textEl) {
      console.error('[Tour] CRITICAL: Cannot start tour - tour-text element not found in DOM');
      return false;
    }
    
    if (!actionsEl) {
      console.error('[Tour] CRITICAL: Cannot start tour - tour-actions element not found in DOM');
      return false;
    }
    
    // Check if tour is disabled via URL parameter - but allow force start (for tour_reset)
    if (tourOff && !force) {
      console.warn('[Tour] Tour is disabled via ?tour=off parameter. Use force=true to override.');
      return false;
    }
    
    // Normalize step number (fallback to 1 if invalid)
    const normalizedStep = (initialStep && TOUR_STEPS[initialStep]) ? initialStep : 1;
    
    // If starting from beginning (step 1), clear completion flag
    if (normalizedStep === 1) {
      try {
        localStorage.removeItem('tour_done');
      } catch (e) {
        console.warn('[Tour] Could not clear tour_done flag:', e);
      }
    }
    
    // Update localStorage before setting step
    try {
      localStorage.setItem('tour_step', String(normalizedStep));
    } catch (e) {
      console.warn('[Tour] Could not update localStorage:', e);
      // Continue anyway - localStorage is not critical
    }
    
    // CRITICAL: Show overlay BEFORE creating elements to ensure CSS media queries apply
    // This unifies logic for all steps and fixes step 2 button visibility issue
    // When overlay is visible, browser applies media queries immediately to newly created elements
    showTour();
    
    // Set step (will fallback to step 1 if requested step doesn't exist)
    const stepSet = setStep(normalizedStep);
    
    // If setStep failed, hide overlay to prevent empty display
    if (stepSet === false) {
      console.error('[Tour] CRITICAL: setStep failed. Hiding overlay to prevent empty display.');
      hideTour();
      return false;
    }
    
    return true;
  }
  
  /**
   * Reset tour (restart from step 1)
   * PHASE B: Stable reset without page reload - always attempts to start tour
   * Clears all flags and forces tour start even if disabled via URL parameter
   */
  function tour_reset() {
    console.log('analytics: tour_restart_click');
    
    // Clear localStorage flags - user explicitly wants to restart
    try {
      localStorage.removeItem('tour_done');
      localStorage.removeItem('tour_step');
    } catch (e) {
      console.warn('[Tour] Could not clear localStorage:', e);
      // Continue anyway - localStorage is not critical
    }
    
    // Force start tour from step 1 - ignore tourOff flag (user explicitly wants to restart)
    // This ensures tour_reset always works, even if tour was disabled via URL parameter
    const started = startTour(1, true);
    
    if (!started) {
      // Only log error if it's a real blocker (missing DOM elements or config)
      // Don't log if it's just tourOff - we're forcing it anyway
      console.error('[Tour] Failed to restart tour - startTour(1, true) returned false. Check console for detailed error messages.');
      return;
    }
  }
  
  // Initialize tour interactives (step 3) - Thermometer widget
  function initTourInteractives(container) {
    container.innerHTML = '';
    container.setAttribute('aria-hidden', 'false');
    
    // Create skeleton loader
    const skeleton = document.createElement('div');
    skeleton.className = 'tour-interactives-skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-header"></div>
      <div class="skeleton-status"></div>
      <div class="skeleton-interactives">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
      <div class="skeleton-cta"></div>
    `;
    container.appendChild(skeleton);
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'tour-interactives-wrapper';
    wrapper.style.display = 'none';
    
    // Section header
    const sectionHeader = document.createElement('h3');
    sectionHeader.className = 'tour-interactives-header';
    sectionHeader.textContent = 'С чего стоит начать оптимизировать AI-продукт';
    wrapper.appendChild(sectionHeader);
    
    // Interactive A: TTFT → Trust Thermometer
    const interactiveA = document.createElement('div');
    interactiveA.className = 'tour-interactive tour-interactive-a';
    interactiveA.setAttribute('role', 'group');
    interactiveA.setAttribute('aria-label', 'TTFT к доверию');
    
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'thermometer-widget-container';
    
    const widgetDescription = document.createElement('p');
    widgetDescription.className = 'thermometer-widget-description';
    widgetDescription.textContent = 'TTFT формирует доверие. Проверьте сколько времени тратит пользователь продукта на ожидание появления первого токена ответа от модели на экране. Эта одна из основных метрик, которая формирует % удержания пользователей.';
    
    const thermometerContainer = document.createElement('div');
    thermometerContainer.className = 'thermometer-container';
    thermometerContainer.setAttribute('role', 'group');
    thermometerContainer.setAttribute('aria-label', 'Термометр времени ответа');
    thermometerContainer.setAttribute('tabindex', '0');
    
    const readout = document.createElement('div');
    readout.className = 'thermometer-readout';
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    
    const readoutValue = document.createElement('div');
    readoutValue.className = 'readout-value';
    readoutValue.textContent = '95';
    
    const readoutStatus = document.createElement('div');
    readoutStatus.className = 'readout-status';
    readoutStatus.textContent = '% удержания';
    
    readout.appendChild(readoutValue);
    readout.appendChild(readoutStatus);
    
    const readoutPlaceholder = document.createElement('div');
    readoutPlaceholder.className = 'readout-placeholder';
    readoutPlaceholder.textContent = '⚡ «Мгновенный контакт»\nПоток сохранён. \nЭто зона "живого отклика".';
    
    const segmentsContainer = document.createElement('div');
    segmentsContainer.className = 'thermometer-segments-container';
    
    const segments = [
      { ttft: 1, label: '≤1s', zone: 'zone-1' },
      { ttft: 2, label: '2s', zone: 'zone-2' },
      { ttft: 3, label: '3s', zone: 'zone-3' },
      { ttft: 5, label: '5s', zone: 'zone-4' },
      { ttft: 7, label: '≥7s', zone: 'zone-5' }
    ];
    
    segments.forEach((seg) => {
      const segment = document.createElement('button');
      segment.type = 'button';
      segment.className = `thermometer-segment ${seg.zone}`;
      segment.setAttribute('role', 'option');
      segment.setAttribute('aria-selected', 'false');
      segment.setAttribute('data-ttft', seg.ttft);
      segment.setAttribute('aria-label', `Время ответа ${seg.label}`);
      segment.textContent = seg.label;
      segmentsContainer.appendChild(segment);
    });
    
    thermometerContainer.appendChild(readoutPlaceholder);
    thermometerContainer.appendChild(readout);
    thermometerContainer.appendChild(segmentsContainer);
    
    const userFeelingEl = document.createElement('p');
    userFeelingEl.className = 'thermometer-user-feeling';
    userFeelingEl.textContent = 'Взгляд пользователя в фокусе. Есть ощущение совместной работы. Диалог течёт без паузы.';
    thermometerContainer.appendChild(userFeelingEl);
    
    widgetContainer.appendChild(widgetDescription);
    widgetContainer.appendChild(thermometerContainer);
    interactiveA.appendChild(widgetContainer);
    wrapper.appendChild(interactiveA);
    container.appendChild(wrapper);
    
    // Initialize thermometer interaction
    initThermometerInteraction(thermometerContainer, readoutValue, readoutStatus, readoutPlaceholder, userFeelingEl);
    
    // Lazy load: observe when container enters viewport
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            skeleton.style.display = 'none';
            wrapper.style.display = 'block';
            container.classList.add('loaded');
            trackMetric('metric_view', { section: 'tour_card_3' });
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '50px', threshold: 0.1 });
      observer.observe(container);
    } else {
      skeleton.style.display = 'none';
      wrapper.style.display = 'block';
      container.classList.add('loaded');
    }
  }
  
  // Thermometer interaction handler
  function initThermometerInteraction(container, readoutValue, readoutStatus, readoutPlaceholder, userFeelingEl) {
    const segments = container.querySelectorAll('.thermometer-segment');
    let activeIndex = 0;
    
    const widgetData = {
      1: {
        retention: 88,
        displayScore: 95,
        metaphor: '⚡ «Мгновенный контакт»',
        userFeeling: 'Пользователь в фокусе. Есть ощущение совместной работы. Диалог течёт без паузы.',
        uxMeaning: 'Поток сохранён. \nЭто зона "живого отклика".'
      },
      2: {
        retention: 76,
        displayScore: 76,
        metaphor: '👁️ «Внимание ещё здесь»',
        userFeeling: 'Пользователь замечает лёгкую паузу, но ждёт — доверие остаётся.',
        uxMeaning: 'Комфортный UX. \nМозг всё ещё "в диалоге".'
      },
      3: {
        retention: 63,
        displayScore: 63,
        metaphor: '💭 «Начинает отвлекаться»',
        userFeeling: 'Мысль успевает ускользнуть: человек ждёт, но уже смотрит в сторону, доверие падает.',
        uxMeaning: 'Риск потери потока. \nНадо показать, что ответ формируется.'
      },
      5: {
        retention: 40,
        displayScore: 40,
        metaphor: '⏳ «Сомнение»',
        userFeeling: 'Половина пользователей решают — система зависла; ощущение контроля почти исчезает.',
        uxMeaning: 'Критическая зона. \nНужны визуальные признаки активности.'
      },
      7: {
        retention: 16,
        displayScore: 16,
        metaphor: '❌ «Потеря контакта»',
        userFeeling: 'Пользователь уходит мысленно или физически. Сессия воспринимается как сбой.',
        uxMeaning: 'UX-провал. \nПотеря доверия и вовлечённости.'
      }
    };
    
    function updateThermometer(ttft) {
      const data = widgetData[ttft] || widgetData[1];
      
      readoutValue.textContent = data.displayScore;
      readoutStatus.textContent = '% удержания';
      readoutPlaceholder.textContent = `${data.metaphor}\n${data.uxMeaning}`;
      
      if (userFeelingEl) {
        userFeelingEl.textContent = data.userFeeling;
      }
      
      segments.forEach((seg, index) => {
        const isActive = parseInt(seg.dataset.ttft) === ttft;
        seg.classList.toggle('active', isActive);
        seg.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          activeIndex = index;
        }
      });
      
      trackMetric('metric_interact', { 
        widget: 'ttft', 
        valueSec: ttft, 
        trustScore: data.displayScore 
      });
    }
    
    // Click/touch handlers
    let lastTouchTime = 0;
    const TOUCH_DELAY = 300;
    segments.forEach(segment => {
      const ttft = parseInt(segment.dataset.ttft);
      let touchHandled = false;
      
      const handleTouch = (e) => {
        const now = Date.now();
        if (now - lastTouchTime < TOUCH_DELAY) return;
        lastTouchTime = now;
        e.preventDefault();
        e.stopPropagation();
        touchHandled = true;
        updateThermometer(ttft);
        setTimeout(() => { touchHandled = false; }, 300);
      };
      
      const handleClick = (e) => {
        if (touchHandled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        updateThermometer(ttft);
      };
      
      segment.addEventListener('touchend', handleTouch, { passive: false });
      segment.addEventListener('click', handleClick);
    });
    
    // Keyboard support
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) {
          const prevSegment = segments[activeIndex - 1];
          const ttft = parseInt(prevSegment.dataset.ttft);
          updateThermometer(ttft);
          prevSegment.focus();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < segments.length - 1) {
          const nextSegment = segments[activeIndex + 1];
          const ttft = parseInt(nextSegment.dataset.ttft);
          updateThermometer(ttft);
          nextSegment.focus();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        const firstSegment = segments[0];
        const ttft = parseInt(firstSegment.dataset.ttft);
        updateThermometer(ttft);
        firstSegment.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const lastSegment = segments[segments.length - 1];
        const ttft = parseInt(lastSegment.dataset.ttft);
        updateThermometer(ttft);
        lastSegment.focus();
      }
    });
    
    // Initialize with first segment
    updateThermometer(1);
  }
  
  return {
    startTour,
    setStep,
    showTour,
    hideTour,
    tour_reset,
    finishTour,
    dismissTour
  };
}

