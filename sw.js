/**
 * Service Worker для UX4AI.PRO
 * С версионированием, умным кешированием и поддержкой обновлений
 */

// Версия билда - обновлять при каждом деплое
// Phase: preloader refactored to inline HTML, script moved to HEAD for early execution
const BUILD_VERSION = '1.13.3'; // Add tour-active class for orbit button hiding
const CACHE_NAME = `ux4ai-v${BUILD_VERSION}`;

// Стратегии кеширования
const CACHE_STRATEGY = {
  // HTML - всегда свежий
  HTML: 'network-first',
  // Статика - кеш на 7 дней
  STATIC: 'cache-first',
  // API/данные - сеть, fallback кеш
  DYNAMIC: 'network-first'
};

// Ресурсы для предварительного кеширования
// ФАЗА B: Обновлено - использование относительных путей для корректной работы при разном корне сервера
// Service Worker автоматически разрешает пути относительно своего scope
const PRECACHE_URLS = [
  './',                        // Корень (index.html)
  './index.html',
  './styles/tokens.css',        // Основные CSS-токены
  './styles/main.css',          // Основные стили
  './favicon.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png'
  // Preloader removed: now inline HTML in index.html, no longer a separate file
];

// Ресурсы для кеширования по требованию (по паттерну)
// ФАЗА 4: Обновлено - финализация, актуальная структура проекта
const CACHE_PATTERNS = {
  // Статические файлы (изображения, шрифты, SVG)
  static: /\.(js|css|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot|pdf|html)$/i,
  // Модули данных
  data: /\/data\/.*\.js$/i,
  // Ядро 3D-движка
  core: /\/core\/.*\.js$/i,
  // 3D-сцены
  scenes: /\/scenes\/.*\.js$/i,
  // Конфигурации тем (только JS, не CSS)
  themes: /\/themes\/.*\.js$/i,
  // UI контроллеры
  ui: /\/ui\/.*\.js$/i
  // ФАЗА 5: Удалён паттерн utils - каталог utils/ больше не существует
};

// Максимальный возраст кеша (7 дней)
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Установка Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', BUILD_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources');
        // PHASE B: Use relative paths - SW will resolve them relative to its location
        // This ensures preloader and other resources are cached correctly regardless of server root
        // Service Worker location determines the base path for relative URLs
        const swLocation = self.location;
        const baseUrl = new URL(swLocation.pathname.replace(/\/[^\/]*$/, '/'), swLocation.origin);
        console.log('[SW] Base URL for precaching:', baseUrl.href);
        
        return cache.addAll(PRECACHE_URLS.map(url => {
          // Convert relative paths to absolute paths relative to SW directory
          const absoluteUrl = new URL(url, baseUrl.href);
          console.log('[SW] Precaching:', url, '->', absoluteUrl.href);
          return absoluteUrl.href;
        }));
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Немедленная активация нового SW
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
        // Don't fail installation if some resources can't be cached
        // This allows SW to work even if some precache URLs are unavailable
        console.warn('[SW] Some resources failed to precache, but continuing installation');
        return self.skipWaiting();
      })
  );
});

/**
 * Активация Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', BUILD_VERSION);
  
  event.waitUntil(
    // Очистка старых кешей
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('ux4ai-') && cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        // Немедленный контроль всех клиентов
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

/**
 * Перехват запросов
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Игнорировать запросы не к нашему домену
  // PHASE B: Use self.location.origin for Service Worker context
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Игнорировать аналитику и внешние ресурсы
  if (url.pathname.includes('/watch/') || url.pathname.includes('/metrika/')) {
    return;
  }
  
  // Игнорировать запросы к старому прелоадеру (больше не используется)
  // Preloader is now inline in index.html, no separate file needed
  if (url.pathname.includes('ux4ai-preloader-loop-outline-noise') && 
      !url.pathname.endsWith('.html')) {
    // Return 404 to prevent errors in console
    event.respondWith(new Response('', { status: 404, statusText: 'Not Found' }));
    return;
  }
  
  // Определить стратегию кеширования
  const strategy = getStrategy(url);
  
  event.respondWith(
    strategy === 'network-first'
      ? networkFirst(request)
      : cacheFirst(request)
  );
});

/**
 * Определить стратегию кеширования для URL
 * ФАЗА 4: Обновлено - финализация, актуальная структура проекта
 */
function getStrategy(url) {
  // HTML - всегда network-first (для получения актуальных версий)
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return 'network-first';
  }
  
  // CSS файлы - network-first для получения актуальных версий
  // Это гарантирует, что новые версии CSS применяются сразу, даже при версионировании
  if (url.pathname.endsWith('.css')) {
    return 'network-first';
  }
  
  // SVG - network-first (чтобы ошибки загрузки не блокировали приложение)
  // Это позволяет браузеру самому обработать ошибки загрузки SVG
  if (url.pathname.endsWith('.svg')) {
    return 'network-first';
  }
  
  // Статические ресурсы - cache-first (изображения, PDF, шрифты, но не SVG и не CSS)
  if (CACHE_PATTERNS.static.test(url.pathname)) {
    return 'cache-first';
  }
  
  // JS модули (core, scenes, themes, ui, data) - cache-first (версионируются через query params)
  if (CACHE_PATTERNS.core.test(url.pathname) ||
      CACHE_PATTERNS.scenes.test(url.pathname) ||
      CACHE_PATTERNS.themes.test(url.pathname) ||
      CACHE_PATTERNS.ui.test(url.pathname) ||
      CACHE_PATTERNS.data.test(url.pathname)) {
    return 'cache-first';
  }
  
  // По умолчанию - network-first
  return 'network-first';
}

/**
 * Стратегия: сеть первой (с fallback на кеш)
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Кешировать успешные ответы
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Если нет в кеше - вернуть offline страницу для HTML
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Оффлайн — UX4AI</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              font-family: system-ui, sans-serif;
              background: #0B0F14;
              color: #E6EEF8;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            h1 { color: #CFE8FF; margin: 0 0 16px 0; }
            p { color: #9AA6B2; line-height: 1.5; }
            button {
              margin-top: 24px;
              padding: 12px 24px;
              background: #5B9CFF;
              color: #fff;
              border: none;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div>
            <h1>Нет подключения к интернету</h1>
            <p>Проверьте подключение и попробуйте снова.</p>
            <button onclick="location.reload()">Обновить страницу</button>
          </div>
        </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }
    
    throw error;
  }
}

/**
 * Стратегия: кеш первым (с fallback на сеть)
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    // Проверить возраст кеша
    if (cachedResponse) {
      const dateHeader = cachedResponse.headers.get('date');
      if (dateHeader) {
        const cacheAge = Date.now() - new Date(dateHeader).getTime();
        
        // Если кеш старый - обновить в фоне (не блокируя ответ)
        if (cacheAge > MAX_CACHE_AGE) {
          console.log('[SW] Cache is old, updating in background:', request.url);
          fetchAndCache(request).catch(() => {
            // Ignore background update errors
          });
        }
      }
      
      return cachedResponse;
    }
    
    // Если нет в кеше - запросить из сети
    try {
      return await fetchAndCache(request);
    } catch (error) {
      // Если сеть недоступна и кеша нет - вернуть 404 для статики
      // Это лучше, чем бросить ошибку, которая может сломать загрузку
      console.warn('[SW] Resource not available (cache miss + network fail):', request.url);
      return new Response('', { 
        status: 404, 
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    // Fallback: вернуть 404 вместо ошибки
    // Это предотвращает "Failed to fetch" ошибки в консоли
    console.warn('[SW] cacheFirst failed for:', request.url, error.message);
    return new Response('', { 
      status: 404, 
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Запросить из сети и закешировать
 */
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    } else if (networkResponse && networkResponse.status !== 200) {
      // Don't cache non-200 responses, but don't throw error either
      console.warn('[SW] Non-200 response for:', request.url, networkResponse.status);
      return networkResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Don't throw error - let the request fail gracefully
    // This allows the app to work even if SW can't fetch some resources
    console.warn('[SW] Fetch failed (non-critical):', request.url, error.message);
    // Return a rejected promise so the caller can handle it
    return Promise.reject(error);
  }
}

/**
 * Обработка сообщений от клиента
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: BUILD_VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing cache');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded, version:', BUILD_VERSION);

