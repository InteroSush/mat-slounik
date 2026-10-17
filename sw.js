/* =====================================================================
   SERVICE WORKER — робіць так, каб сайт працаваў без інтэрнэту.

   Як гэта працуе:
   - Пры першым наведванні захоўваем «шкілет» сайта (html, css, js, індэксы).
   - Скан-старонкі захоўваем у памяць прылады па меры прагляду
     (або ўсе адразу, гл. TOTAL_PAGES ніжэй).
   - Калі інтэрнэту няма, бяром усё з гэтай памяці.
   ===================================================================== */


/* ============================ НАЛАДЫ ============================== */

// Калі змяняеце html/css/js/індэксы і хочаце, каб у людзей абнавілася — павялічце лічбу.
const VERSION = 1;

// Файлы самога сайта (назвы мусяць супадаць з вашымі)
const SHELL_FILES = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'index_ru.json',
    'index_bel.json',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

// Колькі ўсяго старонак-сканаў. Калі паставіць, напрыклад, 230, УСЕ яны спампуюцца
// на прыладу пасля ўсталёўкі (будзе працаваць цалкам без інтэрнэту, але зойме шмат месца).
// 0 — не спампоўваць загадзя, захоўваюцца толькі прагледжаныя старонкі.
const TOTAL_PAGES = 243;

// Папка і пашырэнне сканаў — як у script.js
const IMAGE_FOLDER = '1-png_renders';
const IMAGE_EXTENSION = 'png';

/* ================================================================== */


const SHELL_CACHE = 'slounik-shell-v' + VERSION;  // змяняецца пры абнаўленні
const PAGES_CACHE = 'slounik-pages';              // скан-старонкі (не чысцім пры абнаўленнях)


// 1. УСТАЎКА: захоўваем файлы сайта (і, калі трэба, усе старонкі)
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const shell = await caches.open(SHELL_CACHE);
        // Кожны файл асобна, каб адсутнасць аднаго не зламала ўсё
        await Promise.allSettled(SHELL_FILES.map(file => shell.add(file)));

        if (TOTAL_PAGES > 0) await precacheAllPages();
        await self.skipWaiting();
    })());
});

// Спампоўваем усе старонкі невялікімі групамі па 5
async function precacheAllPages() {
    const cache = await caches.open(PAGES_CACHE);
    for (let start = 1; start <= TOTAL_PAGES; start += 5) {
        const batch = [];
        for (let n = start; n < start + 5 && n <= TOTAL_PAGES; n++) {
            const name = String(n).padStart(3, '0');
            batch.push(cache.add(IMAGE_FOLDER + '/' + name + '.' + IMAGE_EXTENSION));
        }
        await Promise.allSettled(batch);
    }
}


// 2. АКТЫВАЦЫЯ: выдаляем захаваныя файлы ранейшых версій
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter(name => name.startsWith('slounik-shell-') && name !== SHELL_CACHE)
                .map(name => caches.delete(name))
        );
        await self.clients.claim();
    })());
});


// 3. ЗАПЫТЫ: вырашаем, адкуль браць файл
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;   // чужыя сайты не чапаем

    if (url.pathname.includes('/' + IMAGE_FOLDER + '/')) {
        event.respondWith(cacheFirst(request));        // скан-старонкі: спачатку з памяці
    } else {
        event.respondWith(networkFirst(request));      // файлы сайта: спачатку з сеткі (свежае)
    }
});

// Спачатку шукаем у захаваным; калі няма — бяром з сеткі і захоўваем
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(PAGES_CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

// Спачатку спрабуем сетку (каб людзі бачылі абнаўленні); калі інтэрнэту няма — бяром захаванае
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('index.html');  // адкрыццё прыкладання без сеткі
        throw error;
    }
}
