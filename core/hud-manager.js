/**
 * HUD Manager - управление панелями, overlay и навигацией между секциями
 * Extracted from index.html lines 2304-2726
 */

import { NODES_DATA, ABOUT_DATA, LINKS } from '../data/nodes-data-complete.js?v=11';
import { SECTION_NAMES, getSectionId } from './sections.js?v=2';

// Map ABOUT_DATA to format expected by HUD
const ABOUT = {
  title: 'Автор',
  text: ABOUT_DATA.text || '',
  skills: ABOUT_DATA.skills || '',
  contacts: ABOUT_DATA.contacts || '',
  ctas: [
    { label: 'Написать в TG', href: LINKS.tgChat },
    { label: 'Сообщество', href: LINKS.tgCommunity },
    { label: 'Резюме (PDF)', href: LINKS.resume }
  ]
};

export function initHUD(options) {
  const {
    overlay,
    hudObjectIcon,
    hudBigPanel,
    hudSmallPanel,
    hudContainer,
    labelsLayer,
    btnAbout,
    btnLinks,
    btnDemo,
    linksPanel,
    btnLinksClose,
    nodes
  } = options;
  
  // Get HUD backdrop element
  const hudBackdrop = document.getElementById('hud-backdrop');

  // Set up event delegation for HUD panel links (once, not on every render)
  if (hudBigPanel && !hudBigPanel._linkHandlersSetup) {
    // Handle tab navigation links and external links
    hudBigPanel.addEventListener('click', (e) => {
      const tabLink = e.target.closest('.hud-tab-link');
      if (tabLink) {
        e.preventDefault();
        e.stopPropagation();
        const tabIndex = parseInt(tabLink.getAttribute('data-tab-index') || '1');
        const hudButtons = hudSmallPanel.querySelectorAll('button[data-index]');
        if (hudButtons && hudButtons[tabIndex]) {
          hudButtons.forEach(b => b.classList.remove('active-tab'));
          hudButtons[tabIndex].classList.add('active-tab');
          // Trigger tab render by clicking the button
          hudButtons[tabIndex].click();
        }
        return false;
      }
      
      // Ensure external links work properly - stop propagation to prevent overlay from closing
      const externalLink = e.target.closest('a[target="_blank"]');
      if (externalLink && externalLink.href && externalLink.href !== '#' && !externalLink.classList.contains('hud-tab-link')) {
        e.stopPropagation();
      }
    });
    
    // Add hover effects for tab links
    hudBigPanel.addEventListener('mouseenter', (e) => {
      const tabLink = e.target.closest('.hud-tab-link');
      if (tabLink) {
        tabLink.style.borderBottomColor = 'rgba(91,156,255,0.8)';
        tabLink.style.color = '#5B9CFF';
      }
    }, true);
    
    hudBigPanel.addEventListener('mouseleave', (e) => {
      const tabLink = e.target.closest('.hud-tab-link');
      if (tabLink) {
        tabLink.style.borderBottomColor = 'rgba(154,166,178,0.3)';
        tabLink.style.color = '#9AA6B2';
      }
    }, true);
    
    hudBigPanel._linkHandlersSetup = true;
  }

  let activeOverlay = false;
  let currentInfo = [];
  let currentNodeName = '';
  let currentNodeIndex = -1;
  let cleanupScrollRedirect = null;
  // Debounce timer for navigation (shared across all nav buttons)
  let navDebounceTimer = null;
  // Save scroll position when opening HUD
  let savedScrollPosition = 0;

  // Build SECTION_ORDER: explicit order as specified
  const nodesDataKeys = Object.keys(NODES_DATA);
  const basicsKey = nodesDataKeys.find(key => key.includes('Основы UX'));
  const patternsKey = nodesDataKeys.find(key => key.includes('Паттерны взаимодействия'));
  const settingsKey = nodesDataKeys.find(key => key.includes('Настройки ассистента'));
  const promptsKey = nodesDataKeys.find(key => key.includes('Промпты и Сценарии'));
  const efficiencyKey = nodesDataKeys.find(key => key.includes('Операционная эффективность'));
  const securityKey = nodesDataKeys.find(key => key.includes('Безопасность и соответствие'));
  const playbooksKey = nodesDataKeys.find(key => key.includes('Плейбуки и маркетплейс'));
  
  // Order: Basics first, then other sections in specified order, then "Автор" at the end
  const SECTION_ORDER = [
    ...(basicsKey ? [basicsKey] : []),
    ...(patternsKey ? [patternsKey] : []),
    ...(settingsKey ? [settingsKey] : []),
    ...(promptsKey ? [promptsKey] : []),
    ...(efficiencyKey ? [efficiencyKey] : []),
    ...(securityKey ? [securityKey] : []),
    ...(playbooksKey ? [playbooksKey] : []),
    '👤 Автор'  // Автор is last
  ];
  
  console.log('[HUD] SECTION_ORDER initialized:', SECTION_ORDER);
  console.log('[HUD] Total sections:', SECTION_ORDER.length);

  // Rename tab buttons
  (function() {
    const btns = hudSmallPanel.querySelectorAll('button[data-index]');
    if (btns && btns.length >= 3) {
      btns[0].textContent = 'Проблема';
      btns[1].textContent = 'Исследования';
      btns[2].textContent = 'Решения';
    }
  })();

  function renderHudSectionHeader(name) {
    const data = NODES_DATA[name] || {};
    let header = hudSmallPanel.querySelector('.hud-section-header');
    
    if (!header) {
      header = document.createElement('div');
      header.className = 'hud-section-header';
      const titleEl = document.createElement('div');
      titleEl.className = 'hud-section-title';
      const summaryEl = document.createElement('div');
      summaryEl.className = 'hud-section-summary';
      const navEl = document.createElement('div');
      navEl.className = 'hud-section-nav';
      header.appendChild(titleEl);
      header.appendChild(summaryEl);
      header.appendChild(navEl);
      hudSmallPanel.insertBefore(header, hudSmallPanel.firstChild);
    }
    
    // Always recreate navigation buttons to ensure handlers are fresh
    const navEl = header.querySelector('.hud-section-nav');
    if (navEl) {
      navEl.innerHTML = ''; // Clear existing buttons
      
      // Helper function to handle navigation with debounce (uses shared timer)
      const handleNav = (delta, e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        // Debounce to prevent rapid clicks/touches
        if (navDebounceTimer) return;
        navDebounceTimer = setTimeout(() => {
          navDebounceTimer = null;
        }, 300);
        
        try {
          navigateSection(delta);
        } catch (err) {
          console.error('[HUD] Error in navigateSection:', err);
          navDebounceTimer = null; // Reset on error
        }
      };
      
      const prevA = document.createElement('a');
      prevA.href = '#';
      prevA.className = 'hud-nav-link';
      prevA.textContent = '← Предыдущий';
      prevA.style.cursor = 'pointer';
      prevA.style.pointerEvents = 'auto';
      prevA.style.touchAction = 'manipulation'; // Prevents double-tap zoom and allows fast tap
      // Single handler for both click and touch (touch-action handles the rest)
      prevA.addEventListener('click', (e) => handleNav(-1, e), { passive: false });
      
      const nextA = document.createElement('a');
      nextA.href = '#';
      nextA.className = 'hud-nav-link';
      nextA.textContent = 'Следующий →';
      nextA.style.cursor = 'pointer';
      nextA.style.pointerEvents = 'auto';
      nextA.style.touchAction = 'manipulation'; // Prevents double-tap zoom and allows fast tap
      // Single handler for both click and touch (touch-action handles the rest)
      nextA.addEventListener('click', (e) => handleNav(1, e), { passive: false });
      
      navEl.appendChild(prevA);
      navEl.appendChild(nextA);
    }
    
    const titleEl = header.querySelector('.hud-section-title');
    const summaryEl = header.querySelector('.hud-section-summary');
    if (titleEl) titleEl.textContent = name;
    
    const summaryText = (name === '👤 Автор')
      ? ABOUT_DATA.summary
      : (data.summary || '');
    if (summaryEl) summaryEl.textContent = summaryText;

    // Close button
    let closeBtn = header.querySelector('.hud-close-btn');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.className = 'hud-close-btn';
      closeBtn.type = 'button';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideOverlay();
      });
      header.appendChild(closeBtn);
    }
  }

  function navigateSection(delta) {
    console.log('=== [HUD] navigateSection START ===');
    console.log('[HUD] navigateSection called with delta:', delta);
    console.log('[HUD] Current state - index:', currentNodeIndex, 'name:', currentNodeName);
    console.log('[HUD] SECTION_ORDER:', SECTION_ORDER);
    console.log('[HUD] nodes array length:', nodes ? nodes.length : 0);
    
    // Always recalculate index from current name to ensure accuracy
    const currentIdx = SECTION_ORDER.indexOf(currentNodeName);
    if (currentIdx >= 0) {
      currentNodeIndex = currentIdx;
    } else if (currentNodeIndex < 0) {
      currentNodeIndex = 0;
    }
    
    const total = SECTION_ORDER.length;
    let nextIdx = (currentNodeIndex + delta + total) % total;
    let nextName = SECTION_ORDER[nextIdx];
    
    // Special case: if we're on "Автор" (last) and clicking "Next", go to first section
    if (currentNodeName === '👤 Автор' && delta > 0) {
      nextIdx = 0;
      nextName = SECTION_ORDER[0];
    }
    // Special case: if we're on first section and clicking "Previous", go to "Автор" (last)
    if (currentNodeIndex === 0 && delta < 0) {
      nextIdx = total - 1;
      nextName = SECTION_ORDER[nextIdx];
    }
    
    console.log('[HUD] Navigating to index:', nextIdx, 'name:', nextName);
    
    // If target is "Автор", show About panel
    if (nextName === '👤 Автор') {
      console.log('[HUD] Opening About panel');
      showAboutPanel();
    } else {
      // ALWAYS use mock node from NODES_DATA to avoid mismatch with nodes array
      // The nodes array may have different names or order than SECTION_ORDER
      if (NODES_DATA[nextName]) {
        console.log('[HUD] Using NODES_DATA directly (mock node) for:', nextName);
        const mockNode = { name: nextName };
        showOverlay(mockNode);
      } else {
        console.error('[HUD] Section not found in NODES_DATA:', nextName);
        console.error('[HUD] Available sections in NODES_DATA:', Object.keys(NODES_DATA));
      }
    }
  }

  function showOverlay(node) {
    if (!node || !node.name || !NODES_DATA[node.name]) return;
    
    // Close links panel if open
    closeLinksPanel();
    
    const data = NODES_DATA[node.name];
    currentNodeName = node.name;
    currentNodeIndex = SECTION_ORDER.indexOf(currentNodeName);

    // Hide icon placeholder
    if (hudObjectIcon) {
      hudObjectIcon.style.display = 'none';
    }

    const hudButtons = hudSmallPanel.querySelectorAll('button[data-index]');
    if (hudButtons && hudButtons.length >= 3) {
      hudButtons[0].textContent = 'Проблема';
      hudButtons[1].textContent = 'Исследования';
      hudButtons[2].textContent = 'Решения';
      // Clear handler flags when switching to a new section
      hudButtons.forEach(b => b._tabHandlerSet = false);
    }

    function renderTab(idx) {
      hudBigPanel.innerHTML = '';
      
      let content = '';
      if (idx === 0) {
        const problemText = (data.problem || '—').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
        // Add link to "Исследования" tab at the end
        content = problemText + '<br/><a href="#" class="hud-tab-link" data-tab-index="1" style="color: #5B9CFF; text-decoration: none; font-weight: 200 !important; border-bottom: 1px solid rgba(91,156,255,0.3); transition: border-color 0.2s, color 0.2s; cursor: pointer;">Исследования →</a>';
      } else if (idx === 1) {
        // Allow links in solution text - process before escaping
        let solutionText = (data.solution || '—');
        // First escape everything
        solutionText = solutionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Then restore link tags
        solutionText = solutionText
          .replace(/&lt;a\s+href="([^"]*)"\s+target="[^"]*"&gt;/gi, '<a href="$1" target="_blank">')
          .replace(/&lt;\/a&gt;/gi, '</a>')
          .replace(/\n/g, '<br/>');
        // Add link to "Решения" tab at the end
        content = solutionText + '<br/><a href="#" class="hud-tab-link" data-tab-index="2" style="color: #9AA6B2; text-decoration: none; font-weight: 200 !important; border-bottom: 1px solid rgba(154,166,178,0.3); transition: border-color 0.2s, color 0.2s; cursor: pointer;">Решения →</a>';
      } else {
        const html = [];
        html.push((data.ui || '—').replace(/</g, '&lt;').replace(/\n/g, '<br/>'));
        html.push('<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">');
        html.push(`<a target="_blank" href="${data.figma || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Открыть Figma</a>`);
        html.push(`<a target="_blank" href="${LINKS.tgChat || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Написать в TG</a>`);
        html.push(`<a target="_blank" href="${LINKS.tgCommunity || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Сообщество</a>`);
        html.push('</div>');
        content = html.join('');
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';
    }

    // Set up tab button handlers (only once per overlay session, not on every render)
    if (!hudButtons[0]._tabHandlerSet) {
      hudButtons.forEach((btn, idx) => {
        btn.onclick = () => {
          hudButtons.forEach(b => b.classList.remove('active-tab'));
          btn.classList.add('active-tab');
          renderTab(idx);
        };
        btn._tabHandlerSet = true;
      });
    }

    // Show HUD elements
    if (hudObjectIcon) hudObjectIcon.style.display = 'none';
    // Show the HUD container so panels appear centred and responsive
    if (hudContainer) hudContainer.style.display = 'flex';
    hudBigPanel.style.display = 'block';
    hudSmallPanel.style.display = 'flex';
    // Ensure scroll works inside big panel - stop event propagation
    const onBigPanelWheel = (e) => {
      // Allow native scroll inside the panel
      e.stopPropagation();
      // Don't prevent default - let the browser handle scrolling
    };
    hudBigPanel.addEventListener('wheel', onBigPanelWheel, { passive: true });
    // Store handler for cleanup
    if (!hudBigPanel._wheelHandlers) hudBigPanel._wheelHandlers = [];
    hudBigPanel._wheelHandlers.push({ handler: onBigPanelWheel, options: { passive: true } });
    // Render section header (title, summary, nav)
    renderHudSectionHeader(node.name);
    // Activate overlay backdrop
    overlay.classList.add('active');
    activeOverlay = true;
    // Save scroll position before applying position: fixed
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Show HUD backdrop (similar to tour backdrop)
    if (hudBackdrop) hudBackdrop.classList.remove('hidden');
    // Mark HUD active to allow CSS performance optimizations
    document.documentElement.classList.add('hud-active');
    document.body.classList.add('hud-active');
    // Redirect wheel to window on desktop so world scroll never stalls
    installScrollRedirect();
    // Render default tab (problem) and set active
    hudButtons.forEach(b => b.classList.remove('active-tab'));
    if (hudButtons[0]) hudButtons[0].classList.add('active-tab');
    renderTab(0);
  }

  function hideOverlay() {
    overlay.classList.remove('active');
    activeOverlay = false;
    currentNodeName = '';
    currentInfo = [];
    hudObjectIcon.style.display = 'none';
    hudBigPanel.style.display = 'none';
    hudSmallPanel.style.display = 'none';
    if (hudContainer) hudContainer.style.display = 'none';
    // Hide HUD backdrop
    if (hudBackdrop) hudBackdrop.classList.add('hidden');
    // Remove scroll redirection if installed
    if (cleanupScrollRedirect) { cleanupScrollRedirect(); cleanupScrollRedirect = null; }
    // Remove big panel wheel handler
    if (hudBigPanel && hudBigPanel._wheelHandlers) {
      hudBigPanel._wheelHandlers.forEach(({ handler, options }) => {
        hudBigPanel.removeEventListener('wheel', handler, options);
      });
      hudBigPanel._wheelHandlers = [];
    }
    // Remove HUD active marker
    document.documentElement.classList.remove('hud-active');
    document.body.classList.remove('hud-active');
    
    // Restore scroll position after removing position: fixed
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollPosition);
    });
  }

  function showAboutPanel() {
    // Close links panel if open
    closeLinksPanel();
    
    overlay.classList.add('active');
    activeOverlay = true;
    currentNodeName = '👤 Автор';
    // Автор is last in SECTION_ORDER
    currentNodeIndex = SECTION_ORDER.length - 1;
    
    // Hide icon
    if (hudObjectIcon) {
      hudObjectIcon.style.display = 'none';
      hudObjectIcon.innerHTML = '';
    }
    
    // Show HUD container
    if (hudContainer) hudContainer.style.display = 'flex';
    hudBigPanel.style.display = 'block';
    hudSmallPanel.style.display = 'flex';
    
    // Render header
    renderHudSectionHeader('👤 Автор');
    
    // Set tab names for About panel
    const setAboutTabNames = () => {
      const tabs = hudSmallPanel.querySelectorAll('button[data-index]');
      if (tabs.length >= 3) {
        // Use tabs from ABOUT_DATA if available, otherwise use defaults
        const tabNames = (ABOUT_DATA && ABOUT_DATA.tabs && ABOUT_DATA.tabs.length >= 3) 
          ? ABOUT_DATA.tabs 
          : ['Автор', 'Услуги', 'Деятельность'];
        tabs[0].textContent = tabNames[0];
        tabs[1].textContent = tabNames[1];
        tabs[2].textContent = tabNames[2];
      }
    };
    // Set immediately (single call, no multiple timeouts)
    setAboutTabNames();
    
    function renderAboutTab(idx) {
      hudBigPanel.innerHTML = '';
      
      let content = '';
      // Prepare links row (placed at the end for all tabs)
      const linksRow = ABOUT.ctas.map(c => `<a href="${c.href}" target="_blank" class="header-btn" style="text-decoration:none; display:inline-block;">${c.label}</a>`).join('');
      const linksRowWrapped = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">${linksRow}</div>`;
      if (idx === 0) {
        content = ABOUT.text.replace(/</g, '&lt;').replace(/\n/g, '<br/>') + linksRowWrapped;
      } else if (idx === 1) {
        content = ABOUT.skills.replace(/</g, '&lt;').replace(/\n/g, '<br/>') + linksRowWrapped;
      } else {
        // contacts tab shows contacts text + links
        const contactsText = ABOUT.contacts.replace(/</g, '&lt;').replace(/\n/g, '<br/>');
        content = contactsText + linksRowWrapped;
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';
    }
    
    // Attach click handlers for About panel tabs
    const aboutTabs = hudSmallPanel.querySelectorAll('button[data-index]');
    // Clear previous handlers flag to allow re-setup
    aboutTabs.forEach(b => b._aboutTabHandlerSet = false);
    aboutTabs.forEach((b, i) => {
      if (!b._aboutTabHandlerSet) {
        b.onclick = () => {
          aboutTabs.forEach(bb => bb.classList.remove('active-tab'));
          b.classList.add('active-tab');
          renderAboutTab(i);
        };
        b._aboutTabHandlerSet = true;
      }
    });
    
    // Activate first tab
    aboutTabs.forEach(bb => bb.classList.remove('active-tab'));
    if (aboutTabs[0]) aboutTabs[0].classList.add('active-tab');
    renderAboutTab(0);

    // Save scroll position before applying position: fixed
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Show HUD backdrop (similar to tour backdrop)
    if (hudBackdrop) hudBackdrop.classList.remove('hidden');
    // Redirect wheel to window on desktop as well
    installScrollRedirect();
    // Mark HUD active for CSS optimization
    document.documentElement.classList.add('hud-active');
    document.body.classList.add('hud-active');
  }

  function showLinksPanel() {
    // Close any active HUD overlay if open
    if (activeOverlay) {
      hideOverlay();
    }
    
    // Show HUD backdrop (similar to tour backdrop)
    if (hudBackdrop) hudBackdrop.classList.remove('hidden');
    if (linksPanel) linksPanel.style.display = 'block';
    // Mark links-active so grid can stay visible in links mode
    document.documentElement.classList.add('links-active');
    // Install outside-click handler
    try {
      document.addEventListener('click', onDocumentClickOutsideLinks, true);
      document.addEventListener('touchstart', onDocumentClickOutsideLinks, { passive: true, capture: true });
    } catch {}
  }

  function closeLinksPanel() {
    if (linksPanel) linksPanel.style.display = 'none';
    // Hide HUD backdrop if no HUD is active
    if (!activeOverlay && hudBackdrop) hudBackdrop.classList.add('hidden');
    document.documentElement.classList.remove('links-active');
    // Remove outside-click handler
    try {
      document.removeEventListener('click', onDocumentClickOutsideLinks, true);
      document.removeEventListener('touchstart', onDocumentClickOutsideLinks, { capture: true });
    } catch {}
  }

  function onDocumentClickOutsideLinks(e) {
    if (!linksPanel || linksPanel.style.display === 'none') return;
    const target = e.target;
    // Keep panel open if click is inside the panel or on the Links button
    if (linksPanel.contains(target)) return;
    if (btnLinks && (target === btnLinks || (target.closest && target.closest('#btn-links')))) return;
    closeLinksPanel();
  }

  // Header buttons
  if (btnAbout) {
    btnAbout.addEventListener('click', () => {
      closeLinksPanel();
      showAboutPanel();
    });
  }

  if (btnLinks) {
    btnLinks.addEventListener('click', () => {
      // Close any active HUD overlay if open
      if (activeOverlay) {
        hideOverlay();
      }
      showLinksPanel();
    });
  }

  if (btnLinksClose) {
    btnLinksClose.addEventListener('click', () => {
      closeLinksPanel();
      document.documentElement.classList.remove('links-active');
    });
  }

  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      // Find and open "Основы UX для AI" section
      const idx = nodes.findIndex(n => typeof n.name === 'string' && n.name.includes('Основы UX'));
      if (idx >= 0) {
        showOverlay(nodes[idx]);
        // Hide links panel if open
        if (linksPanel && linksPanel.style.display === 'flex') linksPanel.style.display = 'none';
        return;
      }
      // Fallback: open first node
      if (nodes.length > 0) {
        showOverlay(nodes[0]);
      }
    });
  }

  // Links
  const lnkTgChat = document.getElementById('lnk-tg-chat');
  const lnkTgCommunity = document.getElementById('lnk-tg-community');
  const lnkResume = document.getElementById('lnk-resume');
  
  if (lnkTgChat) lnkTgChat.href = LINKS.tgChat;
  if (lnkTgCommunity) lnkTgCommunity.href = LINKS.tgCommunity;
  if (lnkResume) {
    lnkResume.href = LINKS.resume;
    // For PDF files: open in new tab and also trigger download
    if (LINKS.resume.toLowerCase().endsWith('.pdf')) {
      lnkResume.target = '_blank';
      lnkResume.addEventListener('click', (e) => {
        // Open in new tab (default behavior)
        // Also trigger download
        setTimeout(() => {
          const downloadLink = document.createElement('a');
          downloadLink.href = LINKS.resume;
          downloadLink.download = LINKS.resume.split('/').pop() || 'resume.pdf';
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }, 100);
      });
    }
  }

  // Handle clicks outside HUD panels to close HUD (desktop only)
  function onDocumentClickOutsideHUD(e) {
    // Only on desktop - don't interfere with mobile touch interactions
    // Check for desktop: width >= 768px and not a touch device
    const isDesktop = window.innerWidth >= 768 && !('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (!isDesktop) return;
    
    // Only handle left mouse button clicks (button 0)
    // Note: for click events, button might be undefined, so we check for mouse events
    if (e.type === 'mousedown' && e.button !== undefined && e.button !== 0) return;
    
    // Don't close if HUD is not active
    if (!activeOverlay) return;
    
    const target = e.target;
    
    // Don't close if click is inside HUD panels or their children
    if (hudContainer && hudContainer.contains(target)) return;
    if (hudSmallPanel && hudSmallPanel.contains(target)) return;
    if (hudBigPanel && hudBigPanel.contains(target)) return;
    if (hudObjectIcon && hudObjectIcon.contains(target)) return;
    
    // Don't close if click is on header buttons
    if (btnAbout && (target === btnAbout || (target.closest && target.closest('#btn-about')))) return;
    if (btnLinks && (target === btnLinks || (target.closest && target.closest('#btn-links')))) return;
    if (btnDemo && (target === btnDemo || (target.closest && target.closest('#btn-demo')))) return;
    
    // Don't close if click is on links panel
    if (linksPanel && linksPanel.contains(target)) return;
    
    // Don't close if click is on labels (they should open sections)
    if (target.classList && target.classList.contains('label')) return;
    if (target.closest && target.closest('.label')) return;
    
    // Close HUD
    hideOverlay();
  }
  
  // Add click handler for desktop only (use capture phase to catch early)
  document.addEventListener('click', onDocumentClickOutsideHUD, true);

  // Handle ESC key to close HUD or links panel
  function onKeyDown(e) {
    // Close HUD or links panel on ESC key
    if (e.key === 'Escape' || e.keyCode === 27) {
      // First check if links panel is open
      if (linksPanel && linksPanel.style.display !== 'none' && linksPanel.style.display !== '') {
        e.preventDefault();
        e.stopPropagation();
        closeLinksPanel();
      }
      // Then check if HUD overlay is active
      else if (activeOverlay) {
        e.preventDefault();
        e.stopPropagation();
        hideOverlay();
      }
    }
  }
  document.addEventListener('keydown', onKeyDown, true);

  // Label click handler (mirror of 3D picking)
  function onLabelClick(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('label')) return;
    
    const sectionId = target.dataset.sectionId || target.textContent.trim();
    const labelText = target.textContent.trim();
    
    console.log('[HUD] Label clicked - sectionId:', sectionId, 'labelText:', labelText);
    
    // First try to find by sectionId using SECTION_NAMES mapping
    let nodeName = null;
    if (sectionId && SECTION_NAMES[sectionId]) {
      const mappedName = SECTION_NAMES[sectionId];
      // Check if this name exists in NODES_DATA (might have different emoji)
      nodeName = Object.keys(NODES_DATA).find(name => {
        // Remove emojis and compare text
        const nameText = name.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim();
        const mappedText = mappedName.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim();
        return nameText === mappedText || name === mappedName;
      });
      console.log('[HUD] Found by sectionId mapping:', nodeName);
    }
    
    // If not found, try exact match with label text or sectionId
    if (!nodeName) {
      nodeName = Object.keys(NODES_DATA).find(name => 
        name === sectionId || 
        name === labelText ||
        name.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim() === labelText.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim()
      );
      console.log('[HUD] Found by direct match:', nodeName);
    }
    
    // Try to find in nodes array
    if (!nodeName) {
      const node = nodes.find(n => {
        if (!n || !n.name) return false;
        return n.name === sectionId || 
               n.name === labelText ||
               (n.name.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim() === labelText.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim());
      });
      if (node) {
        console.log('[HUD] Found node in array:', node.name);
        showOverlay(node);
        return;
      }
    }
    
    if (nodeName && NODES_DATA[nodeName]) {
      console.log('[HUD] Opening with mock node:', nodeName);
      // Create a mock node object for showOverlay
      const mockNode = { name: nodeName };
      showOverlay(mockNode);
    } else if (sectionId === 'about' || labelText === '👤 Автор' || labelText.includes('Автор')) {
      console.log('[HUD] Opening About panel');
      showAboutPanel();
    } else {
      console.error('[HUD] Could not find section for:', sectionId, 'labelText:', labelText);
    }
  }

  // Attach label click handler
  if (labelsLayer) {
    labelsLayer.addEventListener('click', onLabelClick);
  }

  // Add click handler for logo to open "Автор" section
  const headerLogo = document.querySelector('.header-logo .name');
  if (headerLogo) {
    headerLogo.style.cursor = 'pointer';
    headerLogo.addEventListener('click', () => {
      showAboutPanel();
    });
  }

  // Ensure desktop wheel on HUD forwards to window scroll to keep camera moving
  function installScrollRedirect() {
    // Only on desktop; mobile/tablet rely on container scroll per CSS
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) {
      // Clean up any existing handlers on mobile
      if (cleanupScrollRedirect) {
        cleanupScrollRedirect();
        cleanupScrollRedirect = null;
      }
      return;
    }
    // Clean up existing handlers before adding new ones
    if (cleanupScrollRedirect) {
      cleanupScrollRedirect();
    }
    // Exclude hudContainer and hudBigPanel - they should allow internal scrolling
    const elements = [overlay, hudSmallPanel].filter(Boolean);
    const onWheel = (e) => {
      // Forward delta to window to continue camera scroll
      e.preventDefault();
      window.scrollBy({ top: e.deltaY, behavior: 'auto' });
    };
    elements.forEach(el => el.addEventListener('wheel', onWheel, { passive: false }));
    cleanupScrollRedirect = () => {
      elements.forEach(el => el.removeEventListener('wheel', onWheel));
    };
  }

  function openBasicsSection() {
    // Find and open "Основы UX для AI" section
    const idx = nodes.findIndex(n => typeof n.name === 'string' && n.name.includes('Основы UX'));
    if (idx >= 0) {
      showOverlay(nodes[idx]);
      // Hide links panel if open
      if (linksPanel && linksPanel.style.display === 'flex') linksPanel.style.display = 'none';
      return true;
    }
    // Fallback: open first node
    if (nodes.length > 0) {
      showOverlay(nodes[0]);
      return true;
    }
    return false;
  }

  return {
    showOverlay,
    hideOverlay,
    showAboutPanel,
    showLinksPanel,
    closeLinksPanel,
    openBasicsSection
  };
}


