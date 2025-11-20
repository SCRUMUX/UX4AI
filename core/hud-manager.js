/**
 * HUD Manager - управление панелями, overlay и навигацией между секциями
 * Extracted from index.html lines 2304-2726
 */

import { NODES_DATA, ABOUT_DATA, LINKS } from '../data/nodes-data-complete.js?v=20';
import { SECTION_NAMES, getSectionId } from './sections.js?v=2';
import { on } from './state.js';
// PHASE C2: Import theme-colors for fallback values
import { getThemeColors } from './theme-colors.js';

// Map ABOUT_DATA to format expected by HUD - lazy initialization to ensure ABOUT_DATA and LINKS are loaded
function getABOUT() {
  return {
    title: 'Автор',
    text: ABOUT_DATA?.text || '',
    skills: ABOUT_DATA?.skills || '',
    contacts: ABOUT_DATA?.contacts || '',
    ctas: [
      { label: 'Написать в TG', href: LINKS?.tgChat || '#' },
      { label: 'Сообщество', href: LINKS?.tgCommunity || '#' },
      { label: 'Резюме (PDF)', href: LINKS?.resume || '#' }
    ]
  };
}

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
    nodes = [] // Default to empty array if not provided
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
          
          // Scroll to top when clicking tab links (Исследования →, Решения →)
          // This ensures the new tab content appears from the top on all devices
          // Use triple RAF to ensure content is fully rendered and layout is complete
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
                if (isMobile && hudContainer) {
                  hudContainer.scrollTop = 0;
                } else if (hudBigPanel) {
                  // On desktop: use both scrollTop and scrollTo for maximum reliability
                  if (hudBigPanel.scrollHeight > hudBigPanel.clientHeight) {
                    hudBigPanel.scrollTop = 0;
                  }
                  hudBigPanel.scrollTo({ top: 0, behavior: 'auto' });
                }
              });
            });
          });
        }
        return false;
      }
      
      // Ensure external links work properly - stop propagation to prevent overlay from closing
      const externalLink = e.target.closest('a[target="_blank"]');
      if (externalLink && externalLink.href && externalLink.href !== '#' && !externalLink.classList.contains('hud-tab-link')) {
        e.stopPropagation();
      }
    });
    
    // PHASE C2: Add hover effects for tab links (using CSS variables with theme-colors fallback)
    hudBigPanel.addEventListener('mouseenter', (e) => {
      const tabLink = e.target.closest('.hud-tab-link');
      if (tabLink) {
        // PHASE C2: Get colors from CSS variables, fallback to theme-colors.js (not hardcoded hex)
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || 
                            getComputedStyle(document.documentElement).getPropertyValue('--Color/Accent/Primary').trim();
        const accentHover = getComputedStyle(document.documentElement).getPropertyValue('--Color/Accent/Hover').trim() || accentColor;
        // PHASE C2: Fallback to theme-colors.js if CSS variables not available
        const themeColors = getThemeColors();
        tabLink.style.borderBottomColor = accentHover || themeColors.accentPrimaryHover || themeColors.accentPrimary;
        tabLink.style.color = accentColor || themeColors.accentPrimary;
      }
    }, true);
    
    hudBigPanel.addEventListener('mouseleave', (e) => {
      const tabLink = e.target.closest('.hud-tab-link');
      if (tabLink) {
        // PHASE C2: Get colors from CSS variables, fallback to theme-colors.js (not hardcoded hex)
        const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() ||
                          getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Text/Muted').trim();
        const borderSubtle = getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Border/Subtle').trim() ||
                            getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Border/Base').trim();
        // PHASE C2: Fallback to theme-colors.js if CSS variables not available
        const themeColors = getThemeColors();
        tabLink.style.borderBottomColor = borderSubtle || themeColors.borderSubtle || themeColors.borderBase;
        tabLink.style.color = mutedColor || themeColors.textMuted;
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
    
    const summaryText = data.summary || '';
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

  // Universal helper function to process text with headings and subheadings
  // Works for all sections: extracts first non-empty line as h2 heading, processes ##/### as h3/h4 subheadings
  // Must be defined at module level to be accessible from both showOverlay and showAboutPanel
  function processTextWithSubheadings(text, allowLinks = false) {
      if (!text || typeof text !== 'string') {
        return { headingHtml: '', bodyText: '' };
      }
      
      const lines = text.split('\n');
      let heading = '';
      let bodyText = '';
      
      // Find first non-empty line as heading
      let headingIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i]?.trim();
        if (trimmed) {
          heading = trimmed;
          headingIndex = i;
          break;
        }
      }
      
      // If heading found, rest is body; otherwise all text is body
      if (headingIndex >= 0) {
        bodyText = lines.slice(headingIndex + 1).join('\n');
      } else {
        bodyText = text;
      }
      
      // Clean up leading/trailing empty lines in body
      bodyText = bodyText.replace(/^\n+/, '').replace(/\n+$/, '');
      
      // Don't return early if bodyText is empty - let it process anyway
      // Empty bodyText is valid (e.g., if there's only a heading)
      
      // Process subheadings: ## for h3, ### for h4 (before escaping)
      bodyText = bodyText.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
      bodyText = bodyText.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
      
      if (allowLinks) {
        // Split by heading tags to preserve them
        const parts = bodyText.split(/(<h[34]>.*?<\/h[34]>)/g);
        bodyText = parts.map(part => {
          // If it's a heading tag, keep it as is
          if (/^<h[34]>/.test(part)) {
            return part;
          }
          // Otherwise, escape and process links
          let processed = part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          // Restore link tags
          processed = processed
            .replace(/&lt;a\s+href="([^"]*)"\s+target="[^"]*"&gt;/gi, '<a href="$1" target="_blank">')
            .replace(/&lt;\/a&gt;/gi, '</a>');
          return processed;
        }).join('');
        bodyText = bodyText.replace(/\n/g, '<br/>');
      } else {
        // Split by heading tags to preserve them
        const parts = bodyText.split(/(<h[34]>.*?<\/h[34]>)/g);
        bodyText = parts.map(part => {
          // If it's a heading tag, keep it as is
          if (/^<h[34]>/.test(part)) {
            return part;
          }
          // Otherwise, escape HTML
          return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }).join('');
        // Replace newlines with <br/> but preserve them in heading tags
        bodyText = bodyText.replace(/\n/g, '<br/>');
      }
      
      // Remove only the first <br/> immediately after heading tags (to eliminate spacing between heading and text)
      // But keep other <br/> for paragraph spacing
      bodyText = bodyText.replace(/(<\/h[34]>)<br\/>/gi, '$1');
      
      // Convert double <br/> to paragraph breaks (wrap each paragraph in <p>)
      // Split by double <br/> or more
      const parts = bodyText.split(/(<br\/>\s*){2,}/gi);
      bodyText = parts.map(part => {
        const trimmed = part.trim();
        // If it's a heading tag, return as is
        if (/^<h[34]>/.test(trimmed)) {
          return trimmed;
        }
        // If empty, skip
        if (!trimmed) {
          return '';
        }
        // Replace single <br/> with spaces within paragraph, then wrap in <p>
        const paragraphContent = trimmed.replace(/<br\/>/gi, ' ');
        return `<p>${paragraphContent}</p>`;
      }).filter(p => p).join('');
      
      // Ensure bodyText is not empty - if it is, something went wrong
      if (!bodyText || bodyText.trim() === '') {
        console.warn('[HUD] processTextWithSubheadings: bodyText is empty after processing', { text, heading, headingIndex });
      }
      
      // Create heading HTML only if heading exists
      const headingHtml = heading ? `<h2>${heading.replace(/</g, '&lt;').replace(/&/g, '&amp;')}</h2>` : '';
      return { headingHtml, bodyText };
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
      // Use custom tabs if available (for "Автор" node), otherwise use default tabs
      if (data.customTabs && Array.isArray(data.customTabs) && data.customTabs.length >= 3) {
        hudButtons[0].textContent = data.customTabs[0];
        hudButtons[1].textContent = data.customTabs[1];
        hudButtons[2].textContent = data.customTabs[2];
      } else {
        hudButtons[0].textContent = 'Проблема';
        hudButtons[1].textContent = 'Исследования';
        hudButtons[2].textContent = 'Решения';
      }
      // Clear handler flags when switching to a new section
      hudButtons.forEach(b => b._tabHandlerSet = false);
    }

    function renderTab(idx) {
      hudBigPanel.innerHTML = '';
      
      let content = '';
      
      // Check if this is the "Автор" node with custom tabs
      const isAboutNode = data.customTabs && Array.isArray(data.customTabs) && data.customTabs.length >= 3;
      
      if (isAboutNode) {
        // Special rendering for "Автор" node
        if (idx === 0) {
          let problemText = (data.problem || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(problemText, false);
          // Prepare links row (placed at the end for all tabs)
          const linksRow = getABOUT().ctas.map(c => `<a href="${c.href}" target="_blank" class="header-btn" style="text-decoration:none; display:inline-block;">${c.label}</a>`).join('');
          const linksRowWrapped = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">${linksRow}</div>`;
          content = headingHtml + bodyText + linksRowWrapped;
        } else if (idx === 1) {
          let solutionText = (data.solution || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(solutionText, false);
          // Prepare links row
          const linksRow = getABOUT().ctas.map(c => `<a href="${c.href}" target="_blank" class="header-btn" style="text-decoration:none; display:inline-block;">${c.label}</a>`).join('');
          const linksRowWrapped = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">${linksRow}</div>`;
          content = headingHtml + bodyText + linksRowWrapped;
        } else {
          let uiText = (data.ui || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(uiText, false);
          // Prepare links row
          const linksRow = getABOUT().ctas.map(c => `<a href="${c.href}" target="_blank" class="header-btn" style="text-decoration:none; display:inline-block;">${c.label}</a>`).join('');
          const linksRowWrapped = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">${linksRow}</div>`;
          content = headingHtml + bodyText + linksRowWrapped;
        }
      } else {
        // Standard rendering for other nodes
        if (idx === 0) {
          let problemText = (data.problem || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(problemText, false);
          // PHASE C2: Add link to "Исследования" tab at the end
          // Use CSS variables with theme-colors fallback (not hardcoded hex)
          const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
                             getComputedStyle(document.documentElement).getPropertyValue('--Color/Accent/Primary').trim() ||
                             getThemeColors().accentPrimary;
          const accentBorder = getComputedStyle(document.documentElement).getPropertyValue('--Color/State/Hover/Background').trim() ||
                              getThemeColors().stateHoverBackground;
          content = headingHtml + bodyText + `<br/><a href="#" class="hud-tab-link" data-tab-index="1" style="color: ${accentColor}; text-decoration: none; font-weight: 200 !important; border-bottom: 1px solid ${accentBorder}; transition: border-color 0.2s, color 0.2s; cursor: pointer;">Исследования →</a>`;
        } else if (idx === 1) {
          // Allow links in solution text
          let solutionText = (data.solution || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(solutionText, true);
          // Add link to "Решения" tab at the end
          // Use CSS variables for theme support
          // PHASE C2: Use CSS variables with theme-colors fallback (not hardcoded hex)
          const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() ||
                            getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Text/Muted').trim() ||
                            getThemeColors().textMuted;
          const borderSubtle = getComputedStyle(document.documentElement).getPropertyValue('--Color/Dark/Border/Subtle').trim() ||
                              getComputedStyle(document.documentElement).getPropertyValue('--Color/Light/Border/Base').trim() ||
                              getThemeColors().borderSubtle || getThemeColors().borderBase;
          content = headingHtml + bodyText + `<br/><a href="#" class="hud-tab-link" data-tab-index="2" style="color: ${mutedColor}; text-decoration: none; font-weight: 200 !important; border-bottom: 1px solid ${borderSubtle}; transition: border-color 0.2s, color 0.2s; cursor: pointer;">Решения →</a>`;
        } else {
          const html = [];
          let uiText = (data.ui || '—');
          const { headingHtml, bodyText } = processTextWithSubheadings(uiText, false);
          html.push(headingHtml + bodyText);
          html.push('<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">');
          html.push(`<a target="_blank" href="${data.figma || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Открыть Figma</a>`);
          html.push(`<a target="_blank" href="${LINKS.tgChat || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Написать в TG</a>`);
          html.push(`<a target="_blank" href="${LINKS.tgCommunity || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Сообщество</a>`);
          html.push('</div>');
          content = html.join('');
        }
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';

      // Scroll to top when switching tabs (mobile, tablet, and desktop)
      // Use triple RAF to ensure content is fully rendered and layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
            if (isMobile && hudContainer) {
              // On mobile/tablet: scroll container
              hudContainer.scrollTop = 0;
            } else if (hudBigPanel) {
              // On desktop: use both scrollTop and scrollTo for maximum reliability
              // Check if element has scrollable content
              if (hudBigPanel.scrollHeight > hudBigPanel.clientHeight) {
                hudBigPanel.scrollTop = 0;
              }
              // Also use scrollTo as fallback
              hudBigPanel.scrollTo({ top: 0, behavior: 'auto' });
            }
          });
        });
      });
    }

    // Set up tab button handlers (only once per overlay session, not on every render)
    if (!hudButtons[0]._tabHandlerSet) {
      hudButtons.forEach((btn, idx) => {
        btn.onclick = () => {
          hudButtons.forEach(b => b.classList.remove('active-tab'));
          btn.classList.add('active-tab');
          renderTab(idx);
          
          // Ensure scroll happens after render (triple RAF for maximum reliability)
          // This ensures buttons (Проблема, Исследования, Решения) always scroll to top
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
                if (isMobile && hudContainer) {
                  hudContainer.scrollTop = 0;
                } else if (hudBigPanel) {
                  // On desktop: use both scrollTop and scrollTo for maximum reliability
                  if (hudBigPanel.scrollHeight > hudBigPanel.clientHeight) {
                    hudBigPanel.scrollTop = 0;
                  }
                  hudBigPanel.scrollTo({ top: 0, behavior: 'auto' });
                }
              });
            });
          });
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

    // Scroll to top when opening overlay (mobile and desktop)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
    if (isMobile && hudContainer) {
      requestAnimationFrame(() => {
        hudContainer.scrollTop = 0;
      });
    } else if (!isMobile && hudBigPanel) {
      requestAnimationFrame(() => {
        hudBigPanel.scrollTop = 0;
      });
    }
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
    
    // Mark HUD active to enable grid overlay and base lines
    document.documentElement.classList.add('hud-active');
    document.body.classList.add('hud-active');
    
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
      const about = getABOUT();
      const linksRow = about.ctas.map(c => `<a href="${c.href}" target="_blank" class="header-btn" style="text-decoration:none; display:inline-block;">${c.label}</a>`).join('');
      const linksRowWrapped = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">${linksRow}</div>`;
      
      if (idx === 0) {
        const { headingHtml, bodyText } = processTextWithSubheadings(about.text || '', false);
        content = headingHtml + bodyText + linksRowWrapped;
        console.log('[HUD] About tab 0:', { hasText: !!about.text, textLength: about.text?.length, headingHtml, bodyTextLength: bodyText?.length, contentLength: content.length });
      } else if (idx === 1) {
        const { headingHtml, bodyText } = processTextWithSubheadings(about.skills || '', false);
        content = headingHtml + bodyText + linksRowWrapped;
        console.log('[HUD] About tab 1:', { hasSkills: !!about.skills, skillsLength: about.skills?.length, headingHtml, bodyTextLength: bodyText?.length, contentLength: content.length });
      } else {
        // contacts tab shows contacts text + links
        const { headingHtml, bodyText } = processTextWithSubheadings(about.contacts || '', false);
        content = headingHtml + bodyText + linksRowWrapped;
        console.log('[HUD] About tab 2:', { hasContacts: !!about.contacts, contactsLength: about.contacts?.length, headingHtml, bodyTextLength: bodyText?.length, contentLength: content.length });
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';
      
      // Scroll to top when switching About tabs (mobile and desktop)
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
      if (isMobile && hudContainer) {
        requestAnimationFrame(() => {
          hudContainer.scrollTop = 0;
        });
      } else if (!isMobile && hudBigPanel) {
        requestAnimationFrame(() => {
          hudBigPanel.scrollTop = 0;
        });
      }
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

    // Scroll to top when opening About panel (mobile and desktop)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 767;
    if (isMobile && hudContainer) {
      requestAnimationFrame(() => {
        hudContainer.scrollTop = 0;
      });
    } else if (!isMobile && hudBigPanel) {
      requestAnimationFrame(() => {
        hudBigPanel.scrollTop = 0;
      });
    }

    // Save scroll position before applying position: fixed
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Show HUD backdrop (similar to tour backdrop)
    if (hudBackdrop) hudBackdrop.classList.remove('hidden');
    // Redirect wheel to window on desktop so world scroll never stalls
    installScrollRedirect();
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

  // PHASE 3B: Setup Demo button handler with protection against tour interference
  if (btnDemo) {
    // Mark button to prevent tour from modifying it
    btnDemo.setAttribute('data-protected', 'true');
    btnDemo.setAttribute('data-button-type', 'demo');
    
    // Remove any existing handlers to prevent duplicates
    // Store reference to our handler so we can check if it's still attached
    const demoClickHandler = () => {
      // Get nodes from engine if available (scene may not be mounted yet)
      let availableNodes = nodes;
      if ((!availableNodes || availableNodes.length === 0) && typeof window !== 'undefined' && window._engine) {
        try {
          // Try to get nodes from engine's current plugin
          const plugin = window._engine.currentPlugin || window._calmPlugin;
          if (plugin && plugin.nodes) {
            availableNodes = plugin.nodes;
            console.log('[HUD] Got nodes from engine plugin:', availableNodes.length);
          }
        } catch (e) {
          console.warn('[HUD] Could not get nodes from engine:', e);
        }
      }
      
      // Find and open "Основы UX для AI" section
      if (availableNodes && availableNodes.length > 0) {
        const idx = availableNodes.findIndex(n => {
          const name = n.userData?.name || n.name || '';
          return typeof name === 'string' && name.includes('Основы UX');
        });
        if (idx >= 0) {
          showOverlay(availableNodes[idx]);
          // Hide links panel if open
          if (linksPanel && linksPanel.style.display === 'flex') linksPanel.style.display = 'none';
          return;
        }
        // Fallback: open first node
        showOverlay(availableNodes[0]);
      } else {
        console.warn('[HUD] No nodes available for Demo button');
      }
    };
    
    // Remove any existing onclick handlers
    btnDemo.onclick = null;
    
    // Add our handler
    btnDemo.addEventListener('click', demoClickHandler, { capture: false, once: false });
    
    // Store handler reference for verification
    btnDemo._demoClickHandler = demoClickHandler;
    
    // PHASE 3B: Protect button from tour interference
    // Verify handler is still attached after delays (in case tour removes it)
    [500, 1000, 2000].forEach(delay => {
      setTimeout(() => {
        const btn = document.getElementById('btn-demo');
        if (btn && !btn._demoClickHandler) {
          console.warn('[HUD] Demo button handler was removed, reattaching...');
          btn.addEventListener('click', demoClickHandler, { capture: false, once: false });
          btn._demoClickHandler = demoClickHandler;
        }
      }, delay);
    });
  }
  
  // ===== ФАЗА B: Theme Toggle Button - ЖЁСТКИЙ КОНТРАКТ ВЛАДЕНИЯ =====
  // OWNER: HUD Manager (core/hud-manager.js) - ЕДИНСТВЕННЫЙ владелец #theme-toggle-btn
  // КОНТРАКТ:
  //   - Создаётся ТОЛЬКО здесь (createThemeToggleButton)
  //   - Управляется ТОЛЬКО через ensureThemeButton() и setupThemeToggleButton()
  //   - Живёт в #theme-toggle-container или #site-header (по единому правилу)
  //   - Вся логика тем (toggle, title, состояние) идёт через HUD → ThemeSwitcher → ThemeController
  //
  // ЖЁСТКИЕ ЗАПРЕТЫ ДЛЯ ДРУГИХ МОДУЛЕЙ:
  //   - Bootstrap НЕ может искать #theme-toggle-btn через getElementById/querySelector
  //   - Bootstrap НЕ может менять display/visibility/opacity/pointer-events напрямую
  //   - Bootstrap НЕ может перемещать или удалять кнопку
  //   - Тур НЕ может искать #theme-toggle-btn в любом месте кода
  //   - Тур НЕ может менять ей стили или перемещать
  //
  // РАЗРЕШЁННОЕ ВЗАИМОДЕЙСТВИЕ:
  //   - Bootstrap и тур могут вызывать window.hud.ensureThemeButton() для стабилизации
  //   - Это единственный способ "self-healing" после каких-то сценариев
  //
  // РЕЗУЛЬТАТ: Больше нет ситуации, когда три модуля одновременно "чинят" одну и ту же кнопку.
  const createThemeToggleButton = () => {
    // PHASE TT1: Check if button already exists (idempotent creation)
    let themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      console.log('[HUD] Theme toggle button already exists (PHASE TT1: isolated check)');
      return themeToggleBtn;
    }
    
    // ФАЗА A: Логирование создания кнопки
    const parentId = (document.getElementById('theme-toggle-container') || document.getElementById('site-header'))?.id || 'unknown';
    console.log('[HUD][ThemeButton] created', { parent: parentId, time: Date.now() });
    
    console.log('[HUD] Creating theme toggle button (PHASE TT1: isolated creation)...');
    themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = 'theme-toggle-btn';
    themeToggleBtn.className = 'header-btn';
    themeToggleBtn.textContent = 'Тема';
    themeToggleBtn.type = 'button'; // Prevent form submission
    themeToggleBtn.setAttribute('aria-label', 'Переключить тему (временно отключено)');
    themeToggleBtn.title = 'Тема (временно отключено в dev baseline)';
    themeToggleBtn.style.cursor = 'pointer';
    themeToggleBtn.style.pointerEvents = 'auto';
    themeToggleBtn.style.zIndex = '2001';
    themeToggleBtn.style.position = 'relative';
    
    // PHASE TT1: Insert theme toggle button into theme-toggle-container
    // CRITICAL: This button must NEVER be removed by other code (tour, bootstrap, etc.)
    // CRITICAL: Does NOT touch #tour-restart-btn or any other children
    const themeToggleContainer = document.getElementById('theme-toggle-container');
    if (themeToggleContainer) {
      // PHASE TT1: Check if button already exists in container
      const existingBtn = document.getElementById('theme-toggle-btn');
      if (existingBtn && existingBtn.parentNode === themeToggleContainer) {
        console.log('[HUD] Theme toggle button already in container (PHASE TT1: isolated check)');
        // Ensure it's visible and has handlers
        existingBtn.style.display = 'inline-flex';
        existingBtn.style.visibility = 'visible';
        existingBtn.style.opacity = '1';
        existingBtn.style.pointerEvents = 'auto';
        return existingBtn;
      }
      // PHASE TT1: Only remove from old location if it's NOT in theme-toggle-container
      // CRITICAL: Only touches theme-toggle-btn, never touches tour-restart-btn or other children
      if (existingBtn && existingBtn.parentNode && existingBtn.parentNode !== themeToggleContainer) {
        console.log('[HUD] Moving theme toggle button from', existingBtn.parentNode.id || 'unknown', 'to container (PHASE TT1: isolated move)');
        existingBtn.parentNode.removeChild(existingBtn);
      }
      // PHASE TT1: Append ONLY theme-toggle-btn to container
      // CRITICAL: Does NOT remove, clear, or touch other children (e.g., tour-restart-btn)
      themeToggleContainer.appendChild(themeToggleBtn);
      themeToggleBtn.style.display = 'inline-flex';
      themeToggleBtn.style.visibility = 'visible';
      themeToggleBtn.style.opacity = '1';
      themeToggleBtn.style.pointerEvents = 'auto';
      // Mark button as protected from removal
      themeToggleBtn.setAttribute('data-protected', 'true');
      console.log('[HUD] Theme toggle button created and added to container (PHASE TT1: isolated creation)');
    } else {
      console.warn('[HUD] theme-toggle-container not found, appending to header');
      const header = document.getElementById('site-header');
      if (header) {
        // PHASE TT1: Check if button already exists in header
        const existingBtn = document.getElementById('theme-toggle-btn');
        if (existingBtn && existingBtn.parentNode === header) {
          console.log('[HUD] Theme toggle button already in header (PHASE TT1: isolated check)');
          // Ensure it's visible
          existingBtn.style.display = 'inline-flex';
          existingBtn.style.visibility = 'visible';
          existingBtn.style.opacity = '1';
          existingBtn.style.pointerEvents = 'auto';
          return existingBtn;
        }
        // PHASE TT1: Only remove from old location if it's NOT in header
        // CRITICAL: Only touches theme-toggle-btn, never touches tour-restart-btn
        if (existingBtn && existingBtn.parentNode && existingBtn.parentNode !== header) {
          console.log('[HUD] Moving theme toggle button from', existingBtn.parentNode.id || 'unknown', 'to header (PHASE TT1: isolated move)');
          existingBtn.parentNode.removeChild(existingBtn);
        }
        header.appendChild(themeToggleBtn);
        themeToggleBtn.style.display = 'inline-flex';
        themeToggleBtn.style.visibility = 'visible';
        themeToggleBtn.style.opacity = '1';
        themeToggleBtn.style.pointerEvents = 'auto';
        // Mark button as protected from removal
        themeToggleBtn.setAttribute('data-protected', 'true');
        console.log('[HUD] Theme toggle button added to header (PHASE TT1: isolated creation)');
      } else {
        console.error('[HUD] Neither theme-toggle-container nor site-header found!');
        return null;
      }
    }
    
    return themeToggleBtn;
  };
  
  // PHASE H1: Setup function for button - declared as function declaration for hoisting
  // This ensures it's available when called from setTimeout callbacks and other async contexts
  // Function declaration is hoisted, so it's available throughout the entire initHUD scope
  function setupThemeToggleButton(btn) {
  
    // PHASE B: Update button title using global getCurrentThemeId (NO dynamic imports)
    const updateButtonTitle = () => {
      try {
        // Use global getCurrentThemeId function (exposed by bootstrap in index.html)
        // NO dynamic imports - only use window.getCurrentThemeId
        if (typeof window.getCurrentThemeId === 'function') {
          const currentThemeId = window.getCurrentThemeId();
          if (currentThemeId === 'light') {
            btn.title = 'Тема: Light (нажмите для Dark)';
          } else {
            btn.title = 'Тема: Dark (нажмите для Light)';
          }
        } else {
          console.warn('[HUD] window.getCurrentThemeId function not found (should be exposed by bootstrap)');
          btn.title = 'Тема';
        }
      } catch (e) {
        console.warn('[HUD] Could not get current theme for button title:', e);
        btn.title = 'Тема';
      }
    };
    
    // Set initial title - use global function (NO dynamic imports)
    // Retry if function not yet available (bootstrap may still be loading)
    updateButtonTitle();
    if (typeof window.getCurrentThemeId !== 'function') {
      setTimeout(() => {
        updateButtonTitle();
        if (typeof window.getCurrentThemeId !== 'function') {
          console.warn('[HUD] window.getCurrentThemeId not available after retry');
        }
      }, 500);
    }
    
    // Function to toggle theme - Uses global window.toggleTheme (NO dynamic imports)
    const toggleTheme = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Prevent double-click
      if (btn._toggling) {
        console.log('[HUD] Theme toggle already in progress, ignoring');
        return;
      }
      btn._toggling = true;
      
      // Use global toggleTheme function (exposed by bootstrap in index.html)
      // NO dynamic imports - only use window.toggleTheme
      if (typeof window.toggleTheme === 'function') {
        try {
          window.toggleTheme();
          
          // Update button title after theme change
          setTimeout(() => {
            updateButtonTitle();
            btn._toggling = false;
          }, 100);
        } catch (err) {
          console.error('[HUD] Error calling window.toggleTheme:', err);
          btn._toggling = false;
        }
      } else {
        // Function not available - retry once after a short delay
        console.warn('[HUD] window.toggleTheme not yet available, retrying in 100ms...');
        setTimeout(() => {
          if (typeof window.toggleTheme === 'function') {
            try {
              window.toggleTheme();
              setTimeout(() => {
                updateButtonTitle();
                btn._toggling = false;
              }, 100);
            } catch (err) {
              console.error('[HUD] Error calling window.toggleTheme after retry:', err);
              btn._toggling = false;
            }
          } else {
            console.error('[HUD] window.toggleTheme function not found after retry. Bootstrap may have failed to load theme modules.');
            btn._toggling = false;
          }
        }, 100);
      }
    };
  
    // Remove all existing event listeners by removing and re-adding them
    // Don't clone - just remove old listeners and add new ones
    const oldOnClick = btn.onclick;
    const oldClickListeners = btn._clickListeners || [];
    oldClickListeners.forEach(listener => {
      btn.removeEventListener('click', listener);
    });
    btn.onclick = null;
    
    // Clear any existing flag
    btn._themeToggleSetup = true;
    
    // Add click handler (primary)
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleTheme(e);
    };
    btn.onclick = clickHandler;
    btn.addEventListener('click', clickHandler, { capture: false, once: false });
    
    // Store reference for cleanup
    btn._clickListeners = [clickHandler];
    
    // PHASE T2: Subscribe to theme changes to update button title
    // Note: 'on' is already imported at the top of the file
    try {
      const unsubscribeThemeChanged = on('themeChanged', () => {
        // Update button title when theme changes (from any source)
        updateButtonTitle();
      });
      // Store unsubscribe function for cleanup (if needed in future)
      btn._themeChangedUnsubscribe = unsubscribeThemeChanged;
    } catch (e) {
      console.warn('[HUD] Could not subscribe to theme changes:', e);
    }
    
    // Also handle mousedown for immediate feedback (but don't trigger toggle twice)
    let mousedownHandled = false;
    btn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 0 && !mousedownHandled) { // Left mouse button only
        mousedownHandled = true;
        setTimeout(() => { mousedownHandled = false; }, 100);
        // Don't call toggleTheme here - let click handle it
      }
    }, { capture: false });
    
    // Touch support for mobile
    let touchStartTime = 0;
    let touchStartPos = null;
    btn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      touchStartTime = Date.now();
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { capture: false, passive: true });
    
    btn.addEventListener('touchend', (e) => {
      e.stopPropagation();
      const touchDuration = Date.now() - touchStartTime;
      const touchEndPos = e.changedTouches[0];
      const touchDistance = touchStartPos ? 
        Math.sqrt(Math.pow(touchEndPos.clientX - touchStartPos.x, 2) + Math.pow(touchEndPos.clientY - touchStartPos.y, 2)) : 0;
      
      if (touchDuration < 300 && touchDistance < 10) { // Quick tap, not a swipe
        e.preventDefault();
        toggleTheme(e);
      }
    }, { capture: false });
    
    // Ensure button is always visible and clickable
    // CRITICAL: These styles must be set to prevent button from disappearing
    btn.style.display = 'inline-flex';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '2001';
    btn.style.position = 'relative';
    
    // Mark button as protected - other code should not remove it
    btn.setAttribute('data-protected', 'true');
    btn.setAttribute('data-button-type', 'theme-toggle');
    
    // PHASE B2: No MutationObserver - button is owned by hud-manager only
    // Other modules should not remove this button. If they do, it's a bug that should be fixed.
    // We trust that the button will remain in the DOM once created.
    
    console.log('[HUD] Theme toggle button setup complete');
    
    // Debug: verify button is clickable
    setTimeout(() => {
      const btn = document.getElementById('theme-toggle-btn');
      if (btn) {
        console.log('[HUD] Theme button verification:', {
          exists: !!btn,
          visible: btn.offsetParent !== null,
          display: getComputedStyle(btn).display,
          pointerEvents: getComputedStyle(btn).pointerEvents,
          zIndex: getComputedStyle(btn).zIndex
        });
      } else {
        console.error('[HUD] Theme button not found after setup!');
      }
    }, 500);
  }
  
  // PHASE B2: Simplified button lifecycle - create once, setup handlers idempotently
  // Button is owned by hud-manager only, no recreation, no MutationObserver
  
  // Idempotent function to ensure button exists and has handlers
  function ensureThemeButton() {
    let btn = document.getElementById('theme-toggle-btn');
    
    // Create button if it doesn't exist
    if (!btn) {
      btn = createThemeToggleButton();
      if (!btn) {
        console.error('[HUD] Failed to create theme toggle button');
        return null;
      }
    }
    
    // Ensure button is in correct container
    const container = document.getElementById('theme-toggle-container') || document.getElementById('site-header');
    if (container && btn.parentNode !== container) {
      // Move to correct container if needed
      if (btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
      container.appendChild(btn);
    }
    
    // Ensure visibility
    btn.style.display = 'inline-flex';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    
    // Setup handlers idempotently (only if not already set up)
    if (!btn._themeToggleSetup) {
      setupThemeToggleButton(btn);
    }
    
    // ФАЗА A: Логирование результата ensureThemeButton
    console.log('[HUD][ThemeButton] ensureThemeButton result', {
      exists: !!btn,
      parent: btn && btn.parentNode && btn.parentNode.id,
      display: btn && btn.style.display,
      visibility: btn && btn.style.visibility
    });
    
    return btn;
  }
  
  // Create/setup button once
  let themeToggleBtn = ensureThemeButton();
  
  // If container wasn't ready, retry once after a short delay
  if (!themeToggleBtn && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        themeToggleBtn = ensureThemeButton();
        if (themeToggleBtn) {
          console.log('[HUD] Theme toggle button created after DOMContentLoaded');
        }
      }, 100);
    }, { once: true });
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
    
    // Try to find node name in NODES_DATA
    // First try direct match, then try by sectionId mapping
    let foundNodeName = nodeName;
    if (!foundNodeName || !NODES_DATA[foundNodeName]) {
      // Try to find by sectionId
      if (sectionId && SECTION_NAMES[sectionId]) {
        const mappedName = SECTION_NAMES[sectionId];
        foundNodeName = Object.keys(NODES_DATA).find(n => n === mappedName);
      }
    }
    
    if (foundNodeName && NODES_DATA[foundNodeName]) {
      console.log('[HUD] Opening with mock node:', foundNodeName);
      // Create a mock node object for showOverlay
      const mockNode = { name: foundNodeName };
      showOverlay(mockNode);
    } else {
      console.error('[HUD] Could not find section for:', sectionId, 'labelText:', labelText, 'nodeName:', nodeName);
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

  // Handle 3D node selection events (from picking.js)
  on('nodeSelected', ({ name, object }) => {
    console.log('[HUD] Node selected from 3D scene:', name, 'object:', object);
    console.log('[HUD] Object userData:', object?.userData);
    
    // Get sectionId and nodeName from object for more reliable checking
    const sectionId = object?.userData?.sectionId;
    const objectNodeName = object?.userData?.name;
    
    // Try to find node by sectionId mapping
    let foundNodeName = null;
    const searchName = sectionId || name;
    if (SECTION_NAMES[searchName]) {
      const mappedName = SECTION_NAMES[searchName];
      foundNodeName = Object.keys(NODES_DATA).find(n => {
        const nameText = n.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim();
        const mappedText = mappedName.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim();
        return nameText === mappedText || n === mappedName;
      });
    }
    
    // If not found, try direct match
    if (!foundNodeName) {
      foundNodeName = Object.keys(NODES_DATA).find(n => 
        n === name || 
        n === sectionId ||
        n.replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim() === (name || '').replace(/[▶️👤🧩⚙️📋📊🛡️🧭🤝]/g, '').trim()
      );
    }
    
    // Try to find in nodes array
    if (!foundNodeName && object) {
      const node = nodes.find(n => {
        if (!n || !n.name) return false;
        return n.name === name || 
               n.name === sectionId ||
               (n.userData && (n.userData.sectionId === name || n.userData.sectionId === sectionId || n.userData.name === name));
      });
      if (node) {
        console.log('[HUD] Found node in array:', node.name);
        showOverlay(node);
        return;
      }
    }
    
    // Open overlay if found
    if (foundNodeName && NODES_DATA[foundNodeName]) {
      console.log('[HUD] Opening with mock node:', foundNodeName);
      const mockNode = { name: foundNodeName };
      showOverlay(mockNode);
    } else {
      console.warn('[HUD] Could not find section for node:', name, 'sectionId:', sectionId, 'objectNodeName:', objectNodeName);
    }
  });

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
    openBasicsSection,
    // ФАЗА B: Экспорт ensureThemeButton для стабилизации кнопки темы
    ensureThemeButton
  };
}


