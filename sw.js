/**
 * Service Worker для UX4AI.PRO
 * С версионированием, умным кешированием и поддержкой обновлений
 */

// Версия билда - обновлять при каждом деплое
const BUILD_VERSION = '1.0.0';
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
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/tokens.css',
  '/styles/main.css',
  '/styles/variables.css',
  '/favicon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Ресурсы для кеширования по требованию (по паттерну)
const CACHE_PATTERNS = {
  static: /\.(js|css|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot)$/i,
  data: /\/data\/.*\.js$/i,
  core: /\/core\/.*\.js$/i,
  scenes: /\/scenes\/.*\.js$/i,
  themes: /\/themes\/.*\.js$/i,
  utils: /\/utils\/.*\.js$/i
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
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Немедленная активация нового SW
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
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
  if (url.origin !== location.origin) {
    return;
  }
  
  // Игнорировать аналитику и внешние ресурсы
  if (url.pathname.includes('/watch/') || url.pathname.includes('/metrika/')) {
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
 */
function getStrategy(url) {
  // HTML - всегда network-first
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return 'network-first';
  }
  
  // Статические ресурсы - cache-first
  if (CACHE_PATTERNS.static.test(url.pathname)) {
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
  const cachedResponse = await caches.match(request);
  
  // Проверить возраст кеша
  if (cachedResponse) {
    const dateHeader = cachedResponse.headers.get('date');
    if (dateHeader) {
      const cacheAge = Date.now() - new Date(dateHeader).getTime();
      
      // Если кеш старый - обновить в фоне
      if (cacheAge > MAX_CACHE_AGE) {
        console.log('[SW] Cache is old, updating:', request.url);
        fetchAndCache(request);
      }
    }
    
    return cachedResponse;
  }
  
  // Если нет в кеше - запросить из сети
  return fetchAndCache(request);
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
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);
    throw error;
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

