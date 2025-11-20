# ИСПРАВЛЕНИЯ #2 - THREE.js доступ

## Проблема
3D сцена всё ещё не видна.

## Причина
Модули импортировали THREE.js из CDN как ES-модуль, в то время как `index-final.html` загружает THREE.js как обычный `<script>` тег, создавая глобальный объект.

## Исправления

### 1. ✅ Изменены импорты THREE во всех модулях

**Файлы:**
- `core/engine.js`
- `scenes/calmScene-complete.js`  
- `scenes/matrixScene.js`

**Было:**
```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
```

**Стало:**
```javascript
if (!window.THREE) {
  throw new Error('THREE.js not loaded. Please ensure THREE.js is loaded before this module.');
}
const THREE = window.THREE;
```

### 2. ✅ Добавлена задержка перед загрузкой модулей

**Файл:** `index-final.html`

Добавлена 100ms задержка после установки `window.THREE`, чтобы убедиться что THREE полностью готов:

```javascript
window.THREE = THREE;
console.log('[Bootstrap] THREE assigned to window.THREE');

// Wait a bit to ensure THREE is fully ready
await new Promise(resolve => setTimeout(resolve, 100));

console.log('[Bootstrap] Loading modules...');
const engineModule = await import('./core/engine.js');
```

## Как проверить

1. Откройте `http://localhost:8000/index-final.html` в браузере
2. Откройте консоль (F12)
3. Ожидаемые логи:
   ```
   [Bootstrap] Starting...
   [Bootstrap] THREE assigned to window.THREE
   [Bootstrap] Loading modules...
   [Bootstrap] Modules loaded
   [Bootstrap] Engine created
   [ThemeSwitcher] Applying theme: calm
   [Engine] Mounting theme: calm
   ```

4. **Если видите ошибку "THREE.js not loaded"**:
   - THREE.js не загрузился к моменту импорта модулей
   - Проверьте что `<script src="...three.min.js"></script>` есть ВЫШЕ модуля

5. **Если всё работает**:
   - Должна быть видна 3D сцена с нодами
   - Кнопки работают
   - Переключение тем работает

## Дополнительные шаги для отладки

Если проблема остаётся, используйте `index-test.html`:

```bash
# Откройте в браузере
http://localhost:8000/index-test.html
```

Эта страница покажет детальную информацию о загрузке модулей и ошибках.

