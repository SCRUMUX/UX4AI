# Архитектура системы тем UX4AI

> **⚠️ LEGACY: Этот файл устарел. Актуальная информация находится в [`THEME-SYSTEM.md`](THEME-SYSTEM.md) и [`docs/COLOR_MAP.md`](docs/COLOR_MAP.md)**

## ⚠️ Статус: Legacy / Архив

**Дата устаревания:** Фаза 5  
**Причина:** Информация дублируется в `THEME-SYSTEM.md` и `docs/COLOR_MAP.md`

**Актуальные документы:**
- **[THEME-SYSTEM.md](THEME-SYSTEM.md)** — архитектура системы тем (единственный источник)
- **[docs/COLOR_MAP.md](docs/COLOR_MAP.md)** — документация всех цветовых токенов
- **[THEME-CUSTOMIZATION-GUIDE.md](THEME-CUSTOMIZATION-GUIDE.md)** — руководство по настройке тем

**Актуальные модули:**
- **`core/theme-colors.js`** — единый источник всех цветов (UI + 3D сцена)
- **`themes/ui-theme-config.js`** — конфигурации Dark/Light тем
- **`ui/theme-controller.js`** — единая точка применения тем
- **`styles/tokens.css`** — CSS-переменные для UI (маппятся на токены из `core/theme-colors.js`)

---

## Обзор (Legacy)

Проект использует единую, централизованную систему управления темами, где:
- **UI темы** (dark/light) управляются отдельно от **3D сцен**
- **Тур и демо** не вмешиваются в тему
- Все изменения темы проходят через одну точку: `ui/theme-controller.js`

## Ключевые принципы

1. **Один источник правды**: `core/state.js` → `activeThemeId` ('dark' | 'light')
2. **Одна точка применения**: `ui/theme-controller.js` → `applyThemeById()`
3. **Разделение ответственности**: тема ≠ сцена ≠ режим тура/демо

## Структура

### 1. Глобальное состояние (`core/state.js`)

```javascript
state = {
  activeThemeId: 'dark' | 'light',  // UI тема
  activeSceneId: 'calm',             // 3D сцена (всегда calm)
  // ... другие состояния
}
```

### 2. Конфигурация UI тем (`themes/ui-theme-config.js`)

Определяет параметры для dark/light тем:
- CSS классы для применения
- Meta theme-color для мобильных браузеров
- Ссылки на цвета сцены (через `core/theme-colors.js`)

### 3. Контроллер тем (`ui/theme-controller.js`)

**ЕДИНСТВЕННОЕ место**, где темы применяются:

```javascript
applyThemeById(themeId, options)
```

Эта функция:
1. Обновляет `activeThemeId` в state
2. Применяет CSS классы (`.theme-light` / `.theme-dark`)
3. Обновляет meta теги
4. Обновляет фон 3D сцены
5. Сохраняет в localStorage
6. Может перезагрузить страницу (опционально)

### 4. Переключатель тем (`ui/themeSwitcher.js`)

UI-обертка над theme-controller:
- `initThemeSwitcher()` - инициализация (вызывается один раз)
- `toggleTheme()` - переключение dark ↔ light
- `switchToTheme()` - переключение на конкретную тему

**Важно**: Не создает кнопку темы (это делает `core/hud-manager.js`)

### 5. Конфигурация сцены (`themes/calm.js`)

Это **НЕ UI тема**, а конфигурация 3D сцены:
- Содержит `sceneFactory` (calmSceneCompleteFactory)
- Содержит конфиг сцены (но цвета читаются из `getSceneColors()`)
- Используется для `engine.mount()`

### 6. Реестр сцен (`themes/index.js`)

Реестр 3D сцен (не UI тем):
- `SCENES.calm` - единственная доступная сцена
- Legacy: `THEMES` для обратной совместимости

## Последовательность инициализации

```
1. Bootstrap (index.html)
   ├─ initTheme() - читает тему из localStorage/hash, применяет CSS классы
   ├─ createEngine() - создает engine
   ├─ setEngine() - регистрирует engine в theme-controller
   └─ initThemeSwitcher() - монтирует сцену ОДИН РАЗ

2. initThemeSwitcher()
   ├─ setEngine() - устанавливает engine в theme-controller
   ├─ initTheme() - применяет тему (если еще не применена)
   └─ mountCalmScene() - монтирует calm сцену ОДИН РАЗ

3. Сцена при монтировании
   └─ Читает цвета из getSceneColors() (который учитывает текущую UI тему)
```

## Правила использования

### ✅ МОЖНО

**Для изменения темы:**
- Использовать `applyThemeById()` из `theme-controller.js`
- Использовать `toggleTheme()` из `themeSwitcher.js`
- Читать текущую тему через `getCurrentThemeId()`

**Для тура/демо:**
- Добавлять/убирать классы `tour-active`
- Управлять HUD/панелями
- Управлять камерой
- Ставить паузу рендера

### ❌ НЕЛЬЗЯ

**Тур/демо НЕ должны:**
- Вызывать `applyThemeById()`, `applyTheme()`, `toggleTheme()`
- Менять `activeThemeId` в state
- Вызывать `engine.mount()` заново
- Менять CSS классы `.theme-light` / `.theme-dark`
- Сохранять тему в localStorage (кроме сохранения перед reload)

**Нигде НЕ должно быть:**
- Прямых манипуляций с `.theme-light` / `.theme-dark` (кроме `theme-controller.js`)
- Прямых вызовов `localStorage.setItem('colorTheme', ...)` (кроме `theme-controller.js`)
- Вызовов `engine.mount()` при переключении темы (сцена монтируется один раз)

## Переключение темы

**Единственный способ:**

```javascript
// Через themeSwitcher (рекомендуется)
import { toggleTheme } from './ui/themeSwitcher.js';
toggleTheme();

// Или напрямую через theme-controller
import { applyThemeById } from './ui/theme-controller.js';
applyThemeById('light', { reload: true });
```

**Что происходит:**
1. `applyThemeById()` обновляет state
2. Применяет CSS классы
3. Обновляет meta теги
4. Обновляет фон 3D сцены
5. Сохраняет в localStorage
6. Перезагружает страницу (если `reload: true`)

**После перезагрузки:**
- `initTheme()` читает тему из localStorage
- Применяет CSS классы
- Сцена уже смонтирована, но цвета обновляются через `getSceneColors()`

## Тур и демо

**Тур:**
- Управляет только `tour-active` классом
- Не трогает тему
- При рестарте не меняет тему
- При рестарте не вызывает `engine.mount()`

**Демо (кнопка "Демо"):**
- Открывает HUD с секцией "Основы UX для AI"
- Не трогает тему
- Не вызывает `engine.mount()`

## Проверки

После изменений убедитесь:

1. ✅ Переключение темы меняет все компоненты (UI + 3D сцена)
2. ✅ Тур не меняет тему при старте/перезапуске
3. ✅ Кнопка "Демо" не меняет тему
4. ✅ После перезагрузки применяется сохраненная тема
5. ✅ Сцена монтируется только один раз при инициализации
6. ✅ Все изменения темы идут через `applyThemeById()`

## Файлы

- `core/state.js` - глобальное состояние (`activeThemeId`)
- `ui/theme-controller.js` - единая точка применения темы
- `ui/themeSwitcher.js` - UI обертка для переключения
- `themes/ui-theme-config.js` - конфигурация UI тем
- `themes/calm.js` - конфигурация 3D сцены (не UI тема!)
- `themes/index.js` - реестр сцен (не UI тем!)
- `core/theme-colors.js` - цвета для UI и 3D сцены
- `core/hud-manager.js` - создает кнопку темы, использует `toggleTheme()`

