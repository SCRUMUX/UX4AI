# ИСПРАВЛЕНИЯ #3 - Решена проблема с ранним импортом THREE

## Проблема
Страница не открывается - вероятно из-за того что модули импортируются до того как `window.THREE` установлен.

## Решение
Использование ленивой инициализации через функцию `getTHREE()`

### Изменения в модулях

**В файлах:**
- `core/engine.js`
- `scenes/calmScene-complete.js`
- `scenes/matrixScene.js`

**Было:**
```javascript
const THREE = window.THREE; // Ошибка если window.THREE еще не установлен
```

**Стало:**
```javascript
function getTHREE() {
  if (!window.THREE) {
    throw new Error('THREE.js not loaded. Please ensure THREE.js is loaded before this module.');
  }
  return window.THREE;
}

export function someFactory(config) {
  const THREE = getTHREE(); // Получаем THREE когда функция вызывается
  // ...
}
```

### Как это работает

1. Модули импортируются **до** того как `window.THREE` установлен
2. Функция `getTHREE()` определяется, но **не вызывается** сразу
3. Функция factory `calmSceneCompleteFactory()` получает THREE через `getTHREE()` **при вызове**, когда `window.THREE` уже установлен
4. Это гарантирует что THREE доступен когда он нужен

### Проверка

1. Откройте `http://localhost:8000/index-final.html`
2. В консоли должен быть:
   ```
   [Bootstrap] Starting...
   [Bootstrap] THREE assigned to window.THREE
   [Bootstrap] Loading modules...
   [Bootstrap] Modules loaded, creating engine...
   [Bootstrap] Engine created
   [ThemeSwitcher] Applying theme: calm
   [Engine] Mounting theme: calm
   ```

3. **Ожидаемый результат:**
   - ✅ 3D сцена видна (ноды, бэкграунд эффекты)
   - ✅ Кнопки работают
   - ✅ Переключение тем работает

### Если всё ещё не работает

Откройте консоль браузера (F12) и покажите:
- Какие логи появляются
- Какие ошибки (красные сообщения)

