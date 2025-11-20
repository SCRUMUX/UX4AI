# ФАЗА 3 – Рефакторинг тура

**Дата:** 2024  
**Статус:** ✅ Модуль создан, требуется интеграция в index.html

---

## Выполнено

### 3.1. Упрощение реализации ✅

1. **Создан модуль `core/tour.js`**
   - Вынесена вся логика тура из `index.html`
   - Конфигурация шагов (`TOUR_STEPS`)
   - Функции: `startTour()`, `setStep()`, `showTour()`, `hideTour()`, `tour_reset()`
   - Интерактивы (термометр для шага 3)

2. **Упрощена реализация `startTour()`**
   - ✅ Одна реализация (без дублирующих "минимальных" вариантов)
   - ✅ Ранний возврат при отключённом/завершённом туре
   - ✅ Комплексная валидация:
     - Проверка наличия шага 1
     - Проверка всех необходимых DOM элементов
     - Детальное логирование причин неудачи
   - ✅ Возвращает `false` при неудаче с конкретной причиной в консоли

### 3.2. Взаимодействие с темой и HUD ✅

1. **Тур не трогает переключение темы**
   - ✅ Тур не ищет `#theme-toggle-btn` напрямую
   - ✅ Тур не изменяет стили кнопки темы
   - ✅ Тур не перемещает кнопку темы

2. **Тур не трогает HUD**
   - ✅ Тур управляет только `#tour-restart-btn` (видимость)
   - ✅ Тур может вызывать `window.hud.ensureThemeButton()` для стабилизации

3. **Экспортируемые функции**
   - ✅ `tour_reset()` — перезапуск тура
   - ✅ `showTour()` — показать тур
   - ✅ `hideTour()` — скрыть тур
   - ✅ `setStep()` — установить шаг
   - ✅ `startTour()` — запустить тур

4. **Перезапуск тура (`tour_reset`)**
   - ✅ Сбрасывает шаги в localStorage
   - ✅ Вызывает `startTour(1)`
   - ✅ **Убрана перезагрузка страницы** (`location.reload()`)

### 3.3. Тестирование стабильности ✅

1. **Обновлён `TESTING-CHECKLIST.md`**
   - ✅ Добавлены сценарии для проверки тура:
     - Запуск страницы
     - Перезапуск туров на разных шагах
     - Смена тем до/после тура
     - Открытие HUD во время тура
   - ✅ Проверка, что кнопка "Перезапустить тур" всегда работает
   - ✅ Проверка, что `startTour()` возвращает `true` при наличии шагов

---

## Требуется интеграция

### Интеграция модуля тура в index.html

**Текущее состояние:**
- Модуль `core/tour.js` создан и готов к использованию
- Логика тура всё ещё в `index.html` (IIFE `initGuidedTour()`)

**Необходимые изменения:**

1. **Добавить импорт модуля в bootstrap секцию:**
```javascript
const { initTour, TOUR_STEPS } = await import('./core/tour.js?v=1');
```

2. **Заменить IIFE `initGuidedTour()` на использование модуля:**
```javascript
// ===== Guided Tour (PHASE 3: Using tour module) =====
(function initGuidedTour() {
  const params = new URLSearchParams(location.search);
  const tourOff = params.get('tour') === 'off';
  if (params.get('tour') === 'reset') {
    try { 
      localStorage.removeItem('tour_done'); 
      localStorage.removeItem('tour_step'); 
    } catch {}
  }
  const done = (typeof localStorage !== 'undefined') ? localStorage.getItem('tour_done') : null;
  const tourDone = done === '1';
  
  // Initialize tour module
  const tour = initTour({ tourOff, tourDone });
  
  if (!tour) {
    console.error('[Tour] Failed to initialize tour module');
    // Export placeholder functions
    window.tour_reset = function() {
      console.warn('[Tour] Tour module not initialized');
    };
    window.showTour = function() {
      console.warn('[Tour] Tour module not initialized');
    };
    window.hideTour = function() {
      console.warn('[Tour] Tour module not initialized');
    };
    window.setTourStep = function() {
      console.warn('[Tour] Tour module not initialized');
      return false;
    };
    return;
  }
  
  // Export tour API
  window.tour_reset = tour.tour_reset;
  window.showTour = tour.showTour;
  window.hideTour = tour.hideTour;
  window.setTourStep = tour.setStep;
  
  // Export steps for fallback (if needed)
  try {
    window.tourSteps = TOUR_STEPS;
  } catch (e) {
    console.warn('[Tour] Could not export tourSteps:', e);
  }
  
  // Setup close button handler
  try {
    const closeBtn = document.getElementById('tour-close');
    if (closeBtn) {
      let closeBtnProcessing = false;
      const isMobileCloseBtn = window.innerWidth <= 767;
      const handleCloseBtnAction = (e) => {
        if (closeBtnProcessing) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        closeBtnProcessing = true;
        e.preventDefault();
        e.stopPropagation();
        tour.dismissTour();
        setTimeout(() => { closeBtnProcessing = false; }, 50);
      };
      if (isMobileCloseBtn) {
        closeBtn.addEventListener('touchstart', handleCloseBtnAction, { passive: false });
      } else {
        closeBtn.addEventListener('click', handleCloseBtnAction);
      }
      closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tour.dismissTour();
        }
      });
    }
  } catch (e) {
    console.warn('[Tour] Could not setup close button:', e);
  }
  
  // Setup ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('tour-overlay')?.classList.contains('hidden')) {
      tour.dismissTour();
    }
  });
  
  // Auto-start tour if not disabled/completed
  const tryShow = () => {
    const preHidden = !document.getElementById('preloader-overlay') || 
                      document.getElementById('preloader-overlay').classList.contains('hidden');
    if (!preHidden) {
      setTimeout(tryShow, 120);
      return;
    }
    const step = Number((typeof localStorage !== 'undefined' && localStorage.getItem('tour_step')) || '1') || 1;
    console.log('analytics: tour_start');
    const started = tour.startTour(step);
    if (!started) {
      console.error('[Tour] Failed to start tour on page load - step 1 config may be missing');
    }
  };
  
  tryShow();
})();
```

3. **Удалить старый код тура:**
   - Удалить весь IIFE `initGuidedTour()` (строки ~2800-3870)
   - Удалить функции: `initTourInteractives()`, `initThermometerInteraction()`, `sanitizeAllowBr()`, `trackMetric()`
   - Удалить конфигурацию шагов (она теперь в модуле)

---

## Проверка после интеграции

1. **Запустить страницу:**
   - [ ] Тур запускается автоматически (если не завершён)
   - [ ] В консоли нет ошибок `[Tour] CRITICAL:`

2. **Перезапустить тур:**
   - [ ] Кнопка "Перезапустить тур" работает
   - [ ] Нет перезагрузки страницы
   - [ ] `startTour(1)` возвращает `true`

3. **Проверить взаимодействие:**
   - [ ] Кнопка темы работает во время тура
   - [ ] HUD открывается во время тура
   - [ ] Нет конфликтов между туром и HUD

---

## Следующие шаги

1. Интегрировать модуль тура в `index.html`
2. Удалить старый код тура из `index.html`
3. Протестировать все сценарии из `TESTING-CHECKLIST.md`

