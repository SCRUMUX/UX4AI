/**
 * HUD Manager - управление панелями, overlay и навигацией между секциями
 * Extracted from index.html lines 2304-2726
 */

import { NODES_DATA, ABOUT_DATA, LINKS } from '../data/nodes-data-complete.js?v=2';
import { SECTION_NAMES, getSectionId } from './sections.js?v=2';

// Map ABOUT_DATA to format expected by HUD
const ABOUT = {
  title: 'Обо мне',
  text: ABOUT_DATA.text || '',
  skills: ABOUT_DATA.skills || '',
  ctas: [
    { label: 'Написать в Telegram', href: LINKS.tgChat },
    { label: 'Перейти в сообщество', href: LINKS.tgCommunity },
    { label: 'Открыть резюме (PDF)', href: LINKS.resume }
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

  let activeOverlay = false;
  let currentInfo = [];
  let currentNodeName = '';
  let currentNodeIndex = -1;
  let cleanupScrollRedirect = null;

  const SECTION_ORDER = ['👤 Обо мне', ...Object.keys(NODES_DATA)];

  // Rename tab buttons
  (function() {
    const btns = hudSmallPanel.querySelectorAll('button[data-index]');
    if (btns && btns.length >= 3) {
      btns[0].textContent = 'Проблема';
      btns[1].textContent = 'Решение';
      btns[2].textContent = 'Интерфейс';
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
      const prevA = document.createElement('a');
      prevA.href = '#';
      prevA.textContent = '← Предыдущий';
      prevA.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSection(-1);
      });
      const nextA = document.createElement('a');
      nextA.href = '#';
      nextA.textContent = 'Следующий →';
      nextA.addEventListener('click', (e) => {
        e.preventDefault();
        navigateSection(1);
      });
      navEl.appendChild(prevA);
      navEl.appendChild(nextA);
      header.appendChild(titleEl);
      header.appendChild(summaryEl);
      header.appendChild(navEl);
      hudSmallPanel.insertBefore(header, hudSmallPanel.firstChild);
    }
    
    const titleEl = header.querySelector('.hud-section-title');
    const summaryEl = header.querySelector('.hud-section-summary');
    if (titleEl) titleEl.textContent = name;
    
    const summaryText = (name === '👤 Обо мне')
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
    if (currentNodeIndex < 0) {
      currentNodeIndex = Math.max(0, SECTION_ORDER.indexOf(currentNodeName));
    }
    const total = SECTION_ORDER.length;
    const nextIdx = (currentNodeIndex + delta + total) % total;
    const nextName = SECTION_ORDER[nextIdx];
    
    // If clicking next from last node, go to "Обо мне"
    if (nextName === '👤 Обо мне') {
      showAboutPanel();
    } else {
      const nodeIdx = nodes.findIndex(n => n.name === nextName);
      if (nodeIdx >= 0) {
        showOverlay(nodes[nodeIdx]);
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

    function renderTab(idx) {
      hudBigPanel.innerHTML = '';
      
      let content = '';
      if (idx === 0) {
        content = (data.problem || '—').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
      } else if (idx === 1) {
        content = (data.solution || '—').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
      } else {
        const html = [];
        html.push((data.ui || '—').replace(/</g, '&lt;').replace(/\n/g, '<br/>'));
        html.push('<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:20px;">');
        html.push(`<a target="_blank" href="${data.figma || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Открыть макет Figma</a>`);
        html.push(`<a target="_blank" href="${LINKS.tgChat || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Написать в Telegram</a>`);
        html.push(`<a target="_blank" href="${LINKS.tgCommunity || '#'}" class="header-btn" style="text-decoration:none; display:inline-block;">Перейти в сообщество</a>`);
        html.push('</div>');
        content = html.join('');
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';
    }

    const hudButtons = hudSmallPanel.querySelectorAll('button[data-index]');
    if (hudButtons && hudButtons.length >= 3) {
      hudButtons[0].textContent = 'Проблема';
      hudButtons[1].textContent = 'Решение';
      hudButtons[2].textContent = 'Интерфейс';
    }

    hudButtons.forEach((btn, idx) => {
      btn.onclick = () => {
        hudButtons.forEach(b => b.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        renderTab(idx);
      };
    });

    // Show HUD elements
    if (hudObjectIcon) hudObjectIcon.style.display = 'none';
    // Show the HUD container so panels appear centred and responsive
    if (hudContainer) hudContainer.style.display = 'flex';
    hudBigPanel.style.display = 'block';
    hudSmallPanel.style.display = 'flex';
    // Render section header (title, summary, nav)
    renderHudSectionHeader(node.name);
    // Activate overlay backdrop
    overlay.classList.add('active');
    activeOverlay = true;
    // Mark HUD active to allow CSS performance optimizations
    document.documentElement.classList.add('hud-active');
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
    // Remove scroll redirection if installed
    if (cleanupScrollRedirect) { cleanupScrollRedirect(); cleanupScrollRedirect = null; }
    // Remove HUD active marker
    document.documentElement.classList.remove('hud-active');
  }

  function showAboutPanel() {
    // Close links panel if open
    closeLinksPanel();
    
    overlay.classList.add('active');
    activeOverlay = true;
    currentNodeName = '👤 Обо мне';
    currentNodeIndex = 0;
    
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
    renderHudSectionHeader('👤 Обо мне');
    
    // Set tab names for About panel
    const tabs = hudSmallPanel.querySelectorAll('button[data-index]');
    if (tabs.length >= 3) {
      tabs[0].textContent = 'Обо мне';
      tabs[1].textContent = 'Навыки';
      tabs[2].textContent = 'Контакты';
    }
    
    function renderAboutTab(idx) {
      hudBigPanel.innerHTML = '';
      
      let content = '';
      if (idx === 0) {
        content = ABOUT.text.replace(/</g, '&lt;').replace(/\n/g, '<br/>');
      } else if (idx === 1) {
        content = ABOUT.skills.replace(/</g, '&lt;').replace(/\n/g, '<br/>');
      } else {
        // contacts
        content = ABOUT.ctas.map(c => `<p><a href="${c.href}" target="_blank" style="color:#9cd3ff">${c.label}</a></p>`).join('');
      }
      
      hudBigPanel.innerHTML = '<div style="white-space:pre-line; padding-bottom:24px;">' + content + '</div>';
    }
    
    // Attach click handlers
    const aboutTabs = hudSmallPanel.querySelectorAll('button[data-index]');
    aboutTabs.forEach((b, i) => {
      b.onclick = () => {
        aboutTabs.forEach(bb => bb.classList.remove('active-tab'));
        b.classList.add('active-tab');
        renderAboutTab(i);
      };
    });
    
    // Activate first tab
    aboutTabs.forEach(bb => bb.classList.remove('active-tab'));
    if (aboutTabs[0]) aboutTabs[0].classList.add('active-tab');
    renderAboutTab(0);

    // Redirect wheel to window on desktop as well
    installScrollRedirect();
    // Mark HUD active for CSS optimization
    document.documentElement.classList.add('hud-active');
  }

  function showLinksPanel() {
    // Close any active HUD overlay if open
    if (activeOverlay) {
      hideOverlay();
    }
    
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
  if (lnkResume) lnkResume.href = LINKS.resume;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideOverlay();
  });

  // Label click handler (mirror of 3D picking)
  function onLabelClick(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('label')) return;
    
    const sectionId = target.dataset.sectionId || target.textContent.trim();
    
    // Find corresponding node in NODES_DATA
    const nodeName = Object.keys(NODES_DATA).find(name => name === sectionId || name === target.textContent.trim());
    
    if (nodeName && NODES_DATA[nodeName]) {
      // Create a mock node object for showOverlay
      const mockNode = { name: nodeName };
      showOverlay(mockNode);
    } else if (sectionId === 'about' || target.textContent.trim() === '👤 Обо мне') {
      showAboutPanel();
    }
  }

  // Attach label click handler
  if (labelsLayer) {
    labelsLayer.addEventListener('click', onLabelClick);
  }

  // Add click handler for logo to open "Обо мне" section
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
    if (!isDesktop) return;
    const elements = [overlay, hudContainer, hudBigPanel, hudSmallPanel].filter(Boolean);
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

  return {
    showOverlay,
    hideOverlay,
    showAboutPanel,
    showLinksPanel,
    closeLinksPanel
  };
}


