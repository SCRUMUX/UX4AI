# Система тем UX4AI

**Версия:** Фаза 4 — финализация и контроль качества  
**Дата создания:** 2024  
**Последнее обновление:** Фаза 4 — обновлено: актуальная структура, одна сцена

---

## ⚠️ ВАЖНО: Единственный источник архитектуры тем

**Этот документ (`THEME-SYSTEM.md`) — единственный источник архитектуры системы тем.**

**Связанные документы:**
- **[docs/COLOR_MAP.md](docs/COLOR_MAP.md)** — документация всех цветовых токенов
- **[THEME-CUSTOMIZATION-GUIDE.md](THEME-CUSTOMIZATION-GUIDE.md)** — руководство по настройке тем
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — общая архитектура проекта

**Legacy файлы:**
- `THEME-ARCHITECTURE.md` — устарел, информация перенесена сюда

---

## Обзор

Проект использует единую систему тем для всех компонентов (UI и 3D сцена). Все цвета определены через семантические токены, что позволяет легко переключаться между Dark и Light темами.

## Структура

### 1. Модуль цветов (`core/theme-colors.js`)

**Единый источник всех цветов в проекте** (UI + 3D сцена). Содержит:
- **PALETTE**: базовая палитра цветов (используется как референс)
- **darkTheme**: семантические токены для темной темы (UI)
- **lightTheme**: семантические токены для светлой темы (UI)
- **getSceneColors()**: цвета для 3D-сцены (зависят от текущей UI-темы)

**Важно**: В этом файле допускается использование прямых цветов (#xxxxxx). Во всех остальных местах проекта — нет.

**Использование:**
```javascript
import { getThemeColors, getSceneColors, toThreeColor } from './core/theme-colors.js';

// Получить цвета текущей UI-темы
const colors = getThemeColors(); // darkTheme или lightTheme

// Получить цвета 3D-сцены (зависят от текущей UI-темы)
const sceneColors = getSceneColors();
```

### 2. Конфигурация тем (`themes/ui-theme-config.js`)

**Конфигурации Dark/Light тем.** Содержит:
- **DARK_THEME_CONFIG**: конфигурация темной темы (CSS-классы, meta-теги)
- **LIGHT_THEME_CONFIG**: конфигурация светлой темы (CSS-классы, meta-теги)
- **getThemeConfig()**: получение конфигурации по ID темы

**Использование:**
```javascript
import { getThemeConfig } from './themes/ui-theme-config.js';

const config = getThemeConfig('dark');
// { id: 'dark', name: 'Dark', cssClasses: {...}, metaThemeColor: '...' }
```

### 3. Контроллер тем (`ui/theme-controller.js`)

**Единая точка применения тем.** Содержит:
- **applyThemeById()**: единственный способ изменить тему
- **getCurrentThemeId()**: получить текущую тему
- **setEngine()**: установить ссылку на engine (для обновления 3D-сцены)
- **setScenePlugin()**: установить ссылку на scene plugin

**Использование:**
```javascript
import { applyThemeById, getCurrentThemeId } from './ui/theme-controller.js';

// Применить тему
applyThemeById('light', { saveToStorage: true });

// Получить текущую тему
const currentTheme = getCurrentThemeId(); // 'dark' | 'light'
```

### 4. CSS переменные (`styles/tokens.css`)

**CSS-переменные для всех UI-компонентов.** Маппятся на токены из `core/theme-colors.js`:
- `:root` — значения по умолчанию (Dark theme)
- `:root.theme-light` — переопределения для Light theme

**Использование:**
```css
.my-element {
  background: var(--Color/Dark/Background/Primary);
  color: var(--Color/Light/Text/Primary);
}
```

### 5. Переключение темы

**Механизм переключения:**
1. Пользователь нажимает кнопку "Тема" (создаётся в `core/hud-manager.js`)
2. Вызывается `toggleTheme()` из `ui/themeSwitcher.js`
3. Вызывается `applyThemeById()` из `ui/theme-controller.js`
4. Применяются CSS-классы `theme-dark` / `theme-light` на `<html>` и `<body>`
5. CSS-переменные автоматически обновляются (через `styles/tokens.css`)
6. 3D-сцена обновляет цвета через `getSceneColors()` (зависит от текущей UI-темы)
7. Сохраняется в `localStorage` для восстановления после перезагрузки

## Использование

### В JavaScript

```javascript
import { getThemeColors, getSceneColors, toThreeColor } from './core/theme-colors.js';

// Получить цвета текущей темы
const colors = getThemeColors();
const bgColor = colors.bgBase; // '#0B0F14' или '#FFFFFF'

// Получить цвета 3D сцены
const sceneColors = getSceneColors();
const sceneBg = sceneColors.background;

// Конвертировать в THREE.Color
const threeColor = toThreeColor(sceneBg);
```

### В CSS

```css
/* Используйте CSS переменные */
.my-element {
  background: var(--bg-base);
  color: var(--text-primary);
  border: 1px solid var(--border-base);
}

/* Для компонентов */
.tour-card {
  background: var(--tour-card-bg);
  color: var(--tour-text);
}

.hud-panel {
  background: var(--hud-panel-bg);
  color: var(--hud-text);
}
```

### В HTML (inline styles)

```html
<!-- НЕ ДЕЛАЙТЕ ТАК -->
<div style="background: #0B0F14; color: #E6EEF8;">

<!-- ДЕЛАЙТЕ ТАК -->
<div style="background: var(--bg-base); color: var(--text-primary);">
```

## Семантические токены

### UI токены

- `bgBase`, `bgSecondary`, `bgTertiary`, `bgMuted` — фоны
- `surface1`, `surface2`, `surface3`, `surfacePanel`, `surfacePanelMobile` — поверхности
- `textPrimary`, `textSecondary`, `textTertiary`, `textMuted`, `textOnAccent` — текст
- `accentPrimary`, `accentPrimaryHover`, `accentPrimaryActive` — акценты
- `borderBase`, `borderSubtle`, `borderAccent` — границы
- `stateHoverBackground`, `stateActiveBackground`, `stateSelectedBackground` — состояния

### 3D Scene токены

- `sceneBg`, `sceneSpace`, `sceneCore` — основные цвета сцены
- `sceneGrid`, `sceneAccent` — сетка и акценты
- `sceneStarNear`, `sceneStarFar` — звезды
- `sceneMist` — туман
- `sceneBeamBase`, `sceneBeamLine`, `sceneBeamInner`, `sceneBeamOuter`, `sceneBeamA`, `sceneBeamB` — лучи
- `scenePulse`, `scenePulseB` — пульсации
- `sceneWire` — проволочная сетка
- `sceneLightHemi`, `sceneLightHemiGround`, `sceneLightDir` — освещение

## Добавление новых цветов

1. Добавьте цвет в `PALETTE` в `core/theme-colors.js`
2. Добавьте семантический токен в `darkTheme` и `lightTheme`
3. Если нужно, добавьте CSS переменную в `styles/tokens.css`
4. Используйте токен в коде (не прямой цвет!)

## Правила

✅ **МОЖНО**:
- Использовать прямые цвета только в `core/theme-colors.js`
- Использовать CSS переменные везде
- Использовать `getThemeColors()` и `getSceneColors()` в JS

❌ **НЕЛЬЗЯ**:
- Использовать прямые цвета (#xxxxxx, rgb(), rgba()) вне `theme-colors.js`
- Дублировать логику тем
- Создавать "локальные" темы для компонентов

## Проверка

Чтобы убедиться, что нет жестких цветов:

```bash
# Найти все жесткие цвета в JS (кроме theme-colors.js)
grep -r "#[0-9A-Fa-f]\{3,6\}" --include="*.js" --exclude="theme-colors.js" .

# Найти все жесткие цвета в CSS (кроме tokens.css)
grep -r "#[0-9A-Fa-f]\{3,6\}" --include="*.css" --exclude="tokens.css" .
```

## Миграция существующего кода

Если вы видите жестко заданный цвет:

1. Определите его семантическую роль (фон? текст? акцент?)
2. Найдите подходящий токен в `theme-colors.js` или создайте новый
3. Замените прямой цвет на токен:
   - В JS: `getThemeColors().tokenName`
   - В CSS: `var(--token-name)`
   - В HTML: `var(--token-name)`

## Поддержка

При возникновении проблем:
1. Проверьте, что класс `theme-light` / `theme-dark` установлен на `<html>` и `<body>`
2. Проверьте, что CSS переменные определены в `tokens.css`
3. Проверьте консоль браузера на ошибки
4. Убедитесь, что `theme-colors.js` загружен до использования

