/**
 * Theme Switcher - UI for selecting and applying themes
 */

import { THEMES } from '../themes/index.js?v=35';
import { get } from '../core/state.js';

export function initThemeSwitcher(engine) {
  // Get saved theme or default
  const urlTheme = location.hash.match(/theme=([\w-]+)/)?.[1];
  const savedTheme = localStorage.getItem('theme');
  const themeId = urlTheme || savedTheme || 'calm';

  // Apply theme
  const theme = THEMES[themeId] || THEMES.calm;
  applyTheme(theme, engine);

  // Get or create selector
  let select = document.getElementById('theme-select');
  if (!select) {
    select = document.createElement('select');
    select.id = 'theme-select';
    select.style.cssText = 'padding:6px 12px; background:rgba(18,23,34,0.8); color:#E6EEF8; border:1px solid #243041; border-radius:8px; font-size:14px; cursor:pointer;';
  }

  // Populate options
  select.innerHTML = ''; // Clear existing
  Object.values(THEMES).forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = t.name;
    if (t.id === themeId) option.selected = true;
    select.appendChild(option);
  });

  // Handle change
  select.addEventListener('change', () => {
    const selectedTheme = THEMES[select.value] || THEMES.calm;
    applyTheme(selectedTheme, engine);
    localStorage.setItem('theme', selectedTheme.id);
    location.hash = `theme=${selectedTheme.id}`;
    setToggleIconColor(selectedTheme.id);
  });

  // Also create a clickable button for quick theme toggle (icon cycles)
  const allThemes = Object.values(THEMES);
  let currentThemeIdx = allThemes.findIndex(t => t.id === themeId);
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'theme-toggle-btn';
  toggleBtn.className = 'header-btn';
  toggleBtn.innerHTML = '<img id="theme-toggle-icon" src="./wallpaper_24dp_434343_FILL0_wght400_GRAD0_opsz24.svg" alt="wallpaper" width="24" height="24" style="display:inline-block; vertical-align:middle;">';
  toggleBtn.title = 'Переключить тему';
  toggleBtn.style.fontSize = '18px';
  toggleBtn.style.padding = '4px 10px';

  // Insert into container div instead
  const container = document.getElementById('theme-toggle-container');
  if (container) {
    container.appendChild(toggleBtn);
  } else if (select.parentNode) {
    select.parentNode.insertBefore(toggleBtn, select);
  }

  toggleBtn.addEventListener('click', () => {
    // Cycle to next theme
    currentThemeIdx = (currentThemeIdx + 1) % allThemes.length;
    const nextTheme = allThemes[currentThemeIdx];
    select.value = nextTheme.id;
    applyTheme(nextTheme, engine);
    localStorage.setItem('theme', nextTheme.id);
    location.hash = `theme=${nextTheme.id}`;
    toggleBtn.title = `Тема: ${nextTheme.name}`;
    setToggleIconColor(nextTheme.id);
  });

  // Initial icon state
  toggleBtn.title = `Тема: ${allThemes[currentThemeIdx].name}`;
  setToggleIconColor(allThemes[currentThemeIdx].id);
}

function applyTheme(theme, engine) {
  console.log('[ThemeSwitcher] Applying theme:', theme.id);

  // Apply CSS variables
  const root = document.documentElement;
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Mount scene
  engine.mount(theme);
}

// Map theme to CSS filter to tint monochrome SVG icon (now always gray like camera icon)
function setToggleIconColor(themeId) {
  const img = document.getElementById('theme-toggle-icon');
  if (!img) return;
  // Always use gray color (#9AA6B2 / var(--muted)) like camera icon
  img.style.filter = 'brightness(0) saturate(100%) invert(65%) sepia(8%) saturate(443%) hue-rotate(177deg) brightness(94%) contrast(92%)';
}

