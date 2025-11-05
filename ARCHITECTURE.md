# Архитектура Theme Engine + Scene Plugins

Проект следует модульной архитектуре из ТЗ: переключение темы = переключение 3D‑сцены, при стабильном HUD и общей UX‑логике.

## Структура
```
/core
  engine.js        # Renderer, камера, сцена, цикл, resize, mount/dispose
  hud-manager.js   # HUD: панели/навигация/overlay (эквивалент hud.js из ТЗ)
  picking.js       # Raycaster + клики по 3D-объектам
  labels.js        # Проекция 3D-точек в экранные координаты
  state.js         # Простая шина событий
  sections.js      # Единый перечень секций (источник истины)
  navigation.js    # Скролл-навигация камеры и орбит-режим
/ui
  themeSwitcher.js # Селектор тем: localStorage + URL hash
/themes
  index.js         # Реестр тем (calm, matrix)
  calm.js          # Описание Calm: cssVars + config + sceneFactory
  matrix.js        # Описание Matrix: cssVars + config + sceneFactory
/scenes
  calmScene-complete.js  # Плагин Calm (полная версия)
  matrixScene.js         # Плагин Matrix
/styles
  variables.css    # CSS Custom Properties (:root --bg, --text, ...)
  main.css         # Базовые стили HUD/панелей/кнопок
index.html              # Bootstrap (ES-модули, основной entry)
```

## Контракты
- SceneModule: `mount(ctx) -> { raycastTargets, getLabelAnchors, update, resize, dispose }`
- Theme: `{ id, name, cssVars, config, sceneFactory }`
- Реестр тем: `export const THEMES = { calm, matrix }`

## Переключение тем
`/ui/themeSwitcher.js` применяет `cssVars`, вызывает `engine.mount(theme)`, сохраняет выбор в `localStorage` и `location.hash`.

## Валидация якорей
После монтирования сцены выполняется проверка: `getLabelAnchors()` должен вернуть все секции из `/core/sections.js`.

## Стили
`/styles/variables.css` содержит CSS‑переменные тем. `/styles/main.css` — базовые стили HUD, использующие переменные.

## Примечание по названиям
В коде HUD реализован как `hud-manager.js`; это эквивалент `hud.js`, указанного в ТЗ.

