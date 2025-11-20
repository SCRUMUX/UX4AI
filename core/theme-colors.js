/**
 * Эталонная система тем для UX4AI
 * 
 * ФАЗА 2: Нормализованная модель тем
 * 
 * Единый источник всех цветов в проекте (UI + 3D сцена).
 * Структура соответствует COLOR_MAP.md:
 * 1. Базовая палитра (нейтральные, акценты, статусы)
 * 2. Семантические роли интерфейса (фон, панели, текст, интерактив, состояния)
 * 3. 3D-пакет (фон сцены, сетка/орбиты, базовая сфера, динамические эффекты)
 * 
 * Использование:
 * - В JS: import { getThemeColors } from './core/theme-colors.js'; const colors = getThemeColors();
 * - В CSS: используйте CSS переменные из styles/tokens.css (они маппятся на эти токены)
 * 
 * Классификация токенов:
 * - ✅ Статические: значения строго заданы темой, не изменяются во время выполнения
 * - 🔄 Динамические (база): используются как база для динамических эффектов
 * - 📊 Динамический выбор: палитра статических цветов, из которой выбирается цвет динамически
 */

/**
 * Базовые цвета палитры (используются как референс, не напрямую)
 * 
 * Структура соответствует разделу 1 COLOR_MAP.md:
 * - 1.1 Нейтральные цвета
 * - 1.2 Акцентные цвета
 * - 1.3 Статусные цвета (требуется добавление)
 */
const PALETTE = {
  // PHASE C3: Dark theme base - tuned to match UI tokens
  darkBg: '#0D1117',
  darkBgSecondary: '#161B22',
  darkBgTertiary: '#0F1419',
  darkSurface: '#161B22',
  darkSurfaceElevated: 'rgba(22, 27, 34, 0.65)',
  darkSurfaceGhost: 'rgba(22, 27, 34, 0.18)',
  darkSurfacePanel: 'rgba(22, 27, 34, 0.40)',
  darkSurfacePanelMobile: 'rgba(22, 27, 34, 0.55)',
  darkSurfaceOverlay: 'rgba(7, 10, 15, 0.65)',
  
  // PHASE C3: Light theme base - tuned to match UI tokens
  lightBg: '#FAFBFC',
  lightBgMuted: '#F6F8FA',
  lightSurface1: '#FFFFFF',
  lightSurface2: '#F6F8FA',
  lightSurface3: '#F0F3F6',
  lightSurfacePanel: 'rgba(255, 255, 255, 0.95)',
  lightSurfacePanelMobile: 'rgba(246, 248, 250, 0.95)',
  
  // PHASE C3: Text colors - tuned to match UI tokens
  // Dark theme uses light text
  textLightPrimary: '#F0F6FC',
  textLightSecondary: '#D4E4F7',
  textLightTertiary: '#A5B4C6',
  textLightMuted: '#8B98A5',
  
  // Light theme uses dark text
  textDarkBase: '#1F2328',
  textDarkMuted: '#656D76',
  textOnBrand: '#FFFFFF',
  
  // PHASE C3: Accent/Brand - tuned to match UI tokens
  accentPrimary: '#58A6FF',
  accentPrimaryHover: '#4493E6',
  accentPrimaryActive: '#3582D4',
  accentPrimaryPressed: '#2E71C2',
  
  // PHASE C3: Borders - tuned to match UI tokens
  borderDark: '#30363D',
  borderDarkSubtle: 'rgba(48, 54, 61, 0.5)',
  borderLight: '#D8DEE4',
  
  // PHASE C3: States - tuned to match UI tokens
  stateHoverBg: 'rgba(88, 166, 255, 0.10)',
  stateActiveBg: 'rgba(88, 166, 255, 0.18)',
  stateSelectedBg: 'rgba(88, 166, 255, 0.14)',
  stateHoverSurface: 'rgba(48, 54, 61, 0.95)',
  
  // PHASE C3: Effects - tuned to match UI tokens
  effectGlow: 'rgba(88, 166, 255, 0.45)',
  effectShadowSoft: 'rgba(0, 0, 0, 0.28)',
  effectShadowMedium: 'rgba(0, 0, 0, 0.48)',
  
  // PHASE C3: 3D Scene colors (Dark theme) - tuned for harmony with UI, softer glow
  sceneDarkBg: '#0D1117', // Matches UI background
  sceneDarkSpace: '#1A2332', // Slightly brighter space for depth
  sceneDarkCore: '#4A9EFF', // Softer core, less "burning"
  sceneDarkGrid: '#8B98A5', // Matches muted text
  sceneDarkAccent: '#58A6FF', // Matches UI accent
  sceneDarkStarNear: '#58A6FF', // Consistent with accent
  sceneDarkStarFar: '#6B7A8A', // Softer far stars
  sceneDarkMist: '#9FC5F0', // Softer mist
  sceneDarkBeamBase: '#6BB0FF', // Softer beams
  sceneDarkBeamLine: '#B8D9FF', // Less bright line
  sceneDarkBeamInner: '#9FC5F0', // Softer inner
  sceneDarkBeamOuter: '#5BA3FF', // Consistent outer
  sceneDarkBeamA: '#7BC8FF', // Balanced beam A
  sceneDarkBeamB: '#9BC5FF', // Balanced beam B
  sceneDarkPulse: '#2E5F8A', // Softer pulse
  sceneDarkPulseB: '#3E7AB5', // Softer pulse B
  sceneDarkWire: '#F0F6FC', // Matches primary text
  sceneDarkLightHemi: '#B8D4FF', // Softer hemisphere light
  sceneDarkLightHemiGround: '#0F1419', // Matches tertiary background
  
  // PHASE C3: 3D Scene colors (Light theme) - tuned for harmony with UI, visible but not harsh
  sceneLightBg: '#E6ECF5', // Matches UI background
  sceneLightSpace: '#D5DFEB', // Slightly darker space for depth
  sceneLightCore: '#4493E6', // Softer core, matches hover color
  sceneLightGrid: '#A0A9B8', // Matches muted text
  sceneLightAccent: '#58A6FF', // Matches UI accent
  sceneLightStarNear: '#58A6FF', // Consistent with accent
  sceneLightStarFar: '#8B98A5', // Visible but not too bright
  sceneLightMist: '#A8D0FF', // Softer mist
  sceneLightBeamBase: '#58A6FF', // Matches accent
  sceneLightBeamLine: '#B8D9FF', // Softer line
  sceneLightBeamInner: '#A8D0FF', // Balanced inner
  sceneLightBeamOuter: '#4493E6', // Consistent outer
  sceneLightBeamA: '#6BB0FF', // Balanced beam A
  sceneLightBeamB: '#8BC5FF', // Balanced beam B
  sceneLightPulse: '#3582D4', // Softer pulse
  sceneLightPulseB: '#4493E6', // Softer pulse B
  sceneLightWire: '#1F2328', // Matches primary text
  sceneLightLightHemi: '#E6F2FF', // Soft hemisphere light
  sceneLightLightHemiGround: '#F6F8FA', // Matches muted background
  
  // PHASE C3: Node palette - tuned for better visibility and harmony
  nodeColors: [
    '#58A6FF', // blue - matches accent
    '#2DD4BF', // green - softer, more visible
    '#F59E0B', // orange - good contrast
    '#F87171', // red - softer, less harsh
    '#A78BFA', // purple - softer
    '#14B8A6', // teal - good visibility
    '#F472B6', // pink - softer
    '#84CC16'  // lime - softer, less neon
  ]
};

/**
 * Семантические токены для Dark Theme
 * 
 * Структура соответствует COLOR_MAP.md:
 * - Раздел 1: Базовая палитра
 * - Раздел 2: Семантические роли интерфейса
 * - Раздел 3: 3D-пакет
 * 
 * Все токены статические (✅), кроме помеченных как база для динамики (🔄)
 */
const darkTheme = {
  // ===== 1. Базовая палитра =====
  
  // 1.1 Нейтральные цвета (✅ Статические)
  bgBase: PALETTE.darkBg,                    // Основной фон страницы
  bgSecondary: PALETTE.darkBgSecondary,       // Вторичный фон
  bgTertiary: PALETTE.darkBgTertiary,         // Третичный фон
  bgMuted: PALETTE.darkBgSecondary,           // Приглушённый фон
  
  // 1.2 Акцентные цвета (✅ Статические)
  accentPrimary: PALETTE.accentPrimary,        // Основной акцент
  accentPrimaryHover: PALETTE.accentPrimaryHover,    // Акцент при наведении
  accentPrimaryActive: PALETTE.accentPrimaryActive,   // Акцент при нажатии
  accentPrimaryPressed: PALETTE.accentPrimaryPressed,  // Акцент при нажатии (pressed)
  
  // 1.3 Статусные цвета (⚠️ Требуется добавление)
  // statusSuccess, statusWarning, statusError, statusInfo - будут добавлены в будущем
  
  // ===== 2. Семантические роли интерфейса =====
  
  // 2.1 Фон страницы (✅ Статические)
  // bgBase уже определен выше
  
  // 2.2 Поверхности (✅ Статические)
  surface1: PALETTE.darkSurface,              // Базовая поверхность
  surface2: PALETTE.darkSurfaceElevated,        // Приподнятая поверхность
  surface3: PALETTE.darkSurfaceGhost,          // Полупрозрачная поверхность
  surfacePanel: PALETTE.darkSurfacePanel,      // Панель (десктоп)
  surfacePanelMobile: PALETTE.darkSurfacePanelMobile, // Панель (мобильные)
  surfaceOverlay: PALETTE.darkSurfaceOverlay,   // Оверлей
  
  // 2.3 Текст (✅ Статические)
  textPrimary: PALETTE.textLightPrimary,       // Основной текст
  textSecondary: PALETTE.textLightSecondary,    // Вторичный текст
  textTertiary: PALETTE.textLightTertiary,     // Третичный текст
  textMuted: PALETTE.textLightMuted,            // Приглушённый текст
  textOnAccent: PALETTE.textOnBrand,           // Текст на акцентном фоне
  
  // 2.4 Интерактив (✅ Статические)
  stateHoverBackground: PALETTE.stateHoverBg,  // Фон при наведении
  stateActiveBackground: PALETTE.stateActiveBg, // Фон при нажатии
  stateSelectedBackground: PALETTE.stateSelectedBg, // Фон выбранного элемента
  stateHoverSurface: PALETTE.stateHoverSurface, // Поверхность при наведении
  
  // 2.5 Состояния (⚠️ Требуется добавление)
  // statusSuccess, statusWarning, statusError, statusInfo - будут добавлены в будущем
  
  // Границы (✅ Статические)
  borderBase: PALETTE.borderDark,              // Основная граница
  borderSubtle: PALETTE.borderDarkSubtle,      // Приглушённая граница
  borderAccent: PALETTE.accentPrimary,          // Акцентная граница
  
  // Эффекты (✅ Статические)
  effectGlow: PALETTE.effectGlow,               // Свечение
  effectShadowSoft: PALETTE.effectShadowSoft,   // Мягкая тень
  effectShadowMedium: PALETTE.effectShadowMedium, // Средняя тень
  
  // ===== 3. 3D-пакет =====
  
  // 3.1 Фон сцены (✅ Статический)
  sceneBg: PALETTE.sceneDarkBg,                // Фон 3D-сцены
  
  // 3.2 Сетка/Орбиты (✅ Статические)
  sceneGrid: PALETTE.sceneDarkGrid,             // Цвет сетки
  sceneSpace: PALETTE.sceneDarkSpace,           // Фоновое пространство сцены
  
  // 3.3 Базовая сфера (✅ Статический)
  sceneCore: PALETTE.sceneDarkCore,             // Цвет центральной сферы
  
  // 3.4 Диапазон для динамических эффектов
  sceneAccent: PALETTE.sceneDarkAccent,         // Базовый акцентный цвет сцены (✅ Статический)
  impulseColor: PALETTE.accentPrimary,          // Цвет импульсов (🔄 База для динамики)
  
  // Лучи и связи (✅ Статические)
  sceneBeamBase: PALETTE.sceneDarkBeamBase,    // Базовый цвет лучей
  sceneBeamLine: PALETTE.sceneDarkBeamLine,    // Цвет линий лучей
  sceneBeamInner: PALETTE.sceneDarkBeamInner,  // Внутренний цвет лучей
  sceneBeamOuter: PALETTE.sceneDarkBeamOuter,  // Внешний цвет лучей
  sceneBeamA: PALETTE.sceneDarkBeamA,          // Цвет луча A
  sceneBeamB: PALETTE.sceneDarkBeamB,          // Цвет луча B
  
  // Пульсации и вспышки (🔄 База для динамики)
  scenePulse: PALETTE.sceneDarkPulse,          // Цвет пульсации (базовый)
  scenePulseB: PALETTE.sceneDarkPulseB,        // Цвет пульсации B
  
  // Звёзды и туман (✅ Статические)
  sceneStarNear: PALETTE.sceneDarkStarNear,    // Цвет ближних звёзд
  sceneStarFar: PALETTE.sceneDarkStarFar,      // Цвет дальних звёзд
  sceneMist: PALETTE.sceneDarkMist,            // Цвет тумана
  
  // Освещение (✅ Статические)
  sceneLightHemi: PALETTE.sceneDarkLightHemi,  // Цвет полусферического света
  sceneLightHemiGround: PALETTE.sceneDarkLightHemiGround, // Цвет земли полусферического света
  sceneLightDir: '#F0F6FC',                    // Цвет направленного света (совпадает с textPrimary)
  
  // Палитра узлов (📊 Динамический выбор из статической палитры)
  nodePalette: PALETTE.nodeColors              // Массив из 8 статических цветов
};

/**
 * Семантические токены для Light Theme
 * 
 * Структура соответствует COLOR_MAP.md (аналогично darkTheme):
 * - Раздел 1: Базовая палитра
 * - Раздел 2: Семантические роли интерфейса
 * - Раздел 3: 3D-пакет
 * 
 * Все токены статические (✅), кроме помеченных как база для динамики (🔄)
 */
const lightTheme = {
  // ===== 1. Базовая палитра =====
  
  // 1.1 Нейтральные цвета (✅ Статические)
  bgBase: PALETTE.lightBg,                     // Основной фон страницы
  bgSecondary: PALETTE.lightBgMuted,           // Вторичный фон
  bgTertiary: PALETTE.lightSurface1,            // Третичный фон
  bgMuted: PALETTE.lightBgMuted,                // Приглушённый фон
  
  // 1.2 Акцентные цвета (✅ Статические)
  accentPrimary: PALETTE.accentPrimary,         // Основной акцент
  accentPrimaryHover: PALETTE.accentPrimaryHover,       // Акцент при наведении
  accentPrimaryActive: PALETTE.accentPrimaryActive,      // Акцент при нажатии
  accentPrimaryPressed: PALETTE.accentPrimaryPressed,     // Акцент при нажатии (pressed)
  
  // 1.3 Статусные цвета (⚠️ Требуется добавление)
  // statusSuccess, statusWarning, statusError, statusInfo - будут добавлены в будущем
  
  // ===== 2. Семантические роли интерфейса =====
  
  // 2.1 Фон страницы (✅ Статические)
  // bgBase уже определен выше
  
  // 2.2 Поверхности (✅ Статические)
  surface1: PALETTE.lightSurface1,             // Поверхность 1
  surface2: PALETTE.lightSurface2,             // Поверхность 2
  surface3: PALETTE.lightSurface3,              // Поверхность 3
  surfacePanel: PALETTE.lightSurfacePanel,      // Панель (десктоп)
  surfacePanelMobile: PALETTE.lightSurfacePanelMobile, // Панель (мобильные)
  surfaceOverlay: 'rgba(0, 0, 0, 0.3)',        // Оверлей
  
  // 2.3 Текст (✅ Статические)
  textPrimary: PALETTE.textDarkBase,           // Основной текст
  textSecondary: PALETTE.textDarkBase,         // Вторичный текст (совпадает с primary в светлой теме)
  textTertiary: PALETTE.textDarkMuted,         // Третичный текст
  textMuted: PALETTE.textDarkMuted,            // Приглушённый текст
  textOnAccent: PALETTE.textOnBrand,           // Текст на акцентном фоне
  
  // 2.4 Интерактив (✅ Статические)
  stateHoverBackground: 'rgba(91, 156, 255, 0.08)',  // Фон при наведении
  stateActiveBackground: 'rgba(91, 156, 255, 0.12)',  // Фон при нажатии
  stateSelectedBackground: 'rgba(91, 156, 255, 0.10)', // Фон выбранного элемента
  stateHoverSurface: 'rgba(247, 248, 250, 0.95)',     // Поверхность при наведении
  
  // 2.5 Состояния (⚠️ Требуется добавление)
  // statusSuccess, statusWarning, statusError, statusInfo - будут добавлены в будущем
  
  // Границы (✅ Статические)
  borderBase: PALETTE.borderLight,              // Основная граница
  borderSubtle: 'rgba(229, 231, 235, 0.6)',    // Приглушённая граница
  borderAccent: PALETTE.accentPrimary,          // Акцентная граница
  
  // Эффекты (✅ Статические)
  effectGlow: 'rgba(91, 156, 255, 0.3)',       // Свечение
  effectShadowSoft: 'rgba(0, 0, 0, 0.08)',     // Мягкая тень
  effectShadowMedium: 'rgba(0, 0, 0, 0.12)',   // Средняя тень
  
  // ===== 3. 3D-пакет =====
  
  // 3.1 Фон сцены (✅ Статический)
  sceneBg: PALETTE.sceneLightBg,                // Фон 3D-сцены
  
  // 3.2 Сетка/Орбиты (✅ Статические)
  sceneGrid: PALETTE.sceneLightGrid,            // Цвет сетки
  sceneSpace: PALETTE.sceneLightSpace,          // Фоновое пространство сцены
  
  // 3.3 Базовая сфера (✅ Статический)
  sceneCore: PALETTE.sceneLightCore,            // Цвет центральной сферы
  
  // 3.4 Диапазон для динамических эффектов
  sceneAccent: PALETTE.sceneLightAccent,        // Базовый акцентный цвет сцены (✅ Статический)
  impulseColor: PALETTE.accentPrimary,          // Цвет импульсов (🔄 База для динамики)
  
  // Лучи и связи (✅ Статические)
  sceneBeamBase: PALETTE.sceneLightBeamBase,    // Базовый цвет лучей
  sceneBeamLine: PALETTE.sceneLightBeamLine,    // Цвет линий лучей
  sceneBeamInner: PALETTE.sceneLightBeamInner,  // Внутренний цвет лучей
  sceneBeamOuter: PALETTE.sceneLightBeamOuter, // Внешний цвет лучей
  sceneBeamA: PALETTE.sceneLightBeamA,         // Цвет луча A
  sceneBeamB: PALETTE.sceneLightBeamB,          // Цвет луча B
  
  // Пульсации и вспышки (🔄 База для динамики)
  scenePulse: PALETTE.sceneLightPulse,          // Цвет пульсации (базовый)
  scenePulseB: PALETTE.sceneLightPulseB,        // Цвет пульсации B
  
  // Звёзды и туман (✅ Статические)
  sceneStarNear: PALETTE.sceneLightStarNear,    // Цвет ближних звёзд
  sceneStarFar: PALETTE.sceneLightStarFar,      // Цвет дальних звёзд
  sceneMist: PALETTE.sceneLightMist,            // Цвет тумана
  
  // Освещение (✅ Статические)
  sceneLightHemi: PALETTE.sceneLightLightHemi,  // Цвет полусферического света
  sceneLightHemiGround: PALETTE.sceneLightLightHemiGround, // Цвет земли полусферического света
  sceneLightDir: '#1F2328',                     // Цвет направленного света (совпадает с textPrimary)
  
  // Палитра узлов (📊 Динамический выбор из статической палитры)
  nodePalette: PALETTE.nodeColors               // Массив из 8 статических цветов
};

/**
 * Определяет текущую тему (dark/light)
 * @returns {'dark' | 'light'}
 */
export function getCurrentTheme() {
  if (typeof document === 'undefined') return 'dark';
  const isLight = document.documentElement.classList.contains('theme-light') ||
                  document.body.classList.contains('theme-light');
  return isLight ? 'light' : 'dark';
}

/**
 * Получает цвета текущей темы
 * @returns {Object} Объект с семантическими токенами цветов
 */
export function getThemeColors() {
  const theme = getCurrentTheme();
  return theme === 'light' ? lightTheme : darkTheme;
}

/**
 * Получает цвета конкретной темы
 * @param {'dark' | 'light'} themeName
 * @returns {Object} Объект с семантическими токенами цветов
 */
export function getThemeColorsByName(themeName) {
  return themeName === 'light' ? lightTheme : darkTheme;
}

/**
 * Конвертирует hex/rgb строку в THREE.Color
 * @param {string} colorString - hex (#xxxxxx) или rgb/rgba строка
 * @returns {THREE.Color}
 */
export function toThreeColor(colorString) {
  if (typeof THREE === 'undefined') {
    throw new Error('THREE is not loaded. Import THREE.js first.');
  }
  return new THREE.Color(colorString);
}

/**
 * Получает цвета 3D сцены для текущей темы
 * @returns {Object} Объект с цветами для 3D сцены
 */
export function getSceneColors() {
  const colors = getThemeColors();
  return {
    background: colors.sceneBg,
    space: colors.sceneSpace,
    core: colors.sceneCore,
    grid: colors.sceneGrid,
    accent: colors.sceneAccent,
    starNear: colors.sceneStarNear,
    starFar: colors.sceneStarFar,
    mist: colors.sceneMist,
    beamBase: colors.sceneBeamBase,
    beamLine: colors.sceneBeamLine,
    beamInner: colors.sceneBeamInner,
    beamOuter: colors.sceneBeamOuter,
    beamA: colors.sceneBeamA,
    beamB: colors.sceneBeamB,
    pulse: colors.scenePulse,
    pulseB: colors.scenePulseB,
    wire: colors.sceneWire,
    lightHemi: colors.sceneLightHemi,
    lightHemiGround: colors.sceneLightHemiGround,
    lightDir: colors.sceneLightDir,
    nodePalette: colors.nodePalette,
    impulseColor: colors.impulseColor
  };
}

// Экспорт для прямого доступа к темам (если нужно)
export { darkTheme, lightTheme, PALETTE };

