/* =====================================================================
   МАТЭМАТЫЧНЫ СЛОЎНІК — логіка сайта

   Як усё працуе (коратка):
   1. Пры запуску загружаем два файлы-індэксы (рускі і беларускі).
   2. Калі карыстальнік уводзіць слова, шукаем яго ў патрэбным індэксе
      і атрымліваем нумар старонкі.
   3. Па гэтым нумары паказваем карцінку  pages/<нумар>.png .

   Файл падзелены на разделы:
     1. НАЛАДЫ                — тут можна нешта змяніць
     2. ЭЛЕМЕНТЫ І СТАН       — што мы памятаем падчас працы
     3. ДАПАМОЖНЫЯ ФУНКЦЫІ
     4. ЗАГРУЗКА ІНДЭКСАЎ
     5. ПОШУК
     6. АДЛЮСТРАВАННЕ
     7. ПАДЗЕІ (кнопкі, клавіятура)
     8. ТЭМА (светлая / цёмная)
     9. ЗАПУСК
   ===================================================================== */


/* =====================================================================
   1. НАЛАДЫ — змяняйце толькі гэты блок
   ===================================================================== */

const IMAGE_FOLDER = 'pages';           // папка са сканамі (pages/010.png)
const IMAGE_EXTENSION = 'webp';          // пашырэнне сканаў
const RUSSIAN_INDEX_FILE = 'index_ru.json';    // рускі індэкс (першыя словы старонак)
const BELARUSIAN_INDEX_FILE = 'index_bel.json'; // беларускі індэкс (усе словы)

// Нумар апошняга файла са сканам, напрыклад 230. Калі не ведаеце — пакіньце null.
const LAST_PAGE = 241;

// Якая старонка паказваецца на пачатку, пакуль у полі пошуку пуста (нумар файла).
// Напрыклад, 1 — першая старонка, 9 — пачатак слоўніка. Калі нічога паказваць не трэба — null.
const START_PAGE = 9;

// Калі знойдзена не тая старонка (напрыклад, на 2 бокі) — змяняйце гэтую лічбу.
// Адкрываецца файл з нумарам:  (нумар з індэкса) + FILE_OFFSET
// Прыклад: слова ў індэксе на 85, а на самай справе яно на 087.png → FILE_OFFSET = 2
const FILE_OFFSET = 0;

// Тычыцца толькі подпісу «Старонка N» над сканам, на выбар файла не ўплывае.
// Подпіс:  (нумар файла) + LABEL_OFFSET
// Прыклад: на файле 085.png надрукаваны нумар 83 → LABEL_OFFSET = -2
const LABEL_OFFSET = 0;

// true — пад полем пошуку дадаткова пішацца, які файл адкрыўся (для праверкі зруху)
const SHOW_DEBUG_INFO = false;


/* =====================================================================
   2. ЭЛЕМЕНТЫ І СТАН
   ===================================================================== */

// Элементы старонкі, з якімі мы працуем (id бярэм з index.html)
const el = {
    searchInput:   document.getElementById('q'),
    hint:          document.getElementById('hint'),
    suggestions:   document.getElementById('chips'),
    nav:           document.getElementById('nav'),
    prevButton:    document.getElementById('prev'),
    nextButton:    document.getElementById('next'),
    pageLabel:     document.getElementById('pn'),
    pages:         document.getElementById('pages'),
    emptyMessage:  document.getElementById('empty'),
    errorBox:      document.getElementById('error'),
    themeButton:   document.getElementById('theme'),
    zoomOverlay:   document.getElementById('zoom'),
    zoomImage:     document.querySelector('#zoom img'),
};

// Рэжымы і лічбы, якія змяняюцца падчас працы
let searchLanguage = 'ru';   // 'ru' або 'be' — у якім індэксе шукаем
let pagesMode = loadSetting('mode') || (window.innerWidth < 760 ? '1' : '2');  // '1' або '2' старонкі
let pageShift = 0;           // на колькі старонак чалавек пагартаў ад знойдзенай (0 = знойдзеная)

// Індэксы (запаўняюцца пасля загрузкі)
let russianEntries = [];     // [{ key, original, page }, ...] — па парадку старонак
let belarusianPages = {};    // { слова: нумар_старонкі }
let belarusianWords = [];    // усе беларускія словы па алфавіце (для падказак)

// Параўнанне радкоў па алфавіце (улічвае ё, ў, і г.д.)
const russianCollator = new Intl.Collator('ru');
const belarusianCollator = new Intl.Collator('be');


/* =====================================================================
   3. ДАПАМОЖНЫЯ ФУНКЦЫІ
   ===================================================================== */

// Захаванне налад у браўзеры (у try/catch, бо часам браўзер гэта забараняе)
function loadSetting(name) {
    try { return localStorage.getItem(name); } catch (e) { return null; }
}
function saveSetting(name, value) {
    try { localStorage.setItem(name, value); } catch (e) { /* нічога страшнага */ }
}

// Прывядзенне запыту да адзінага выгляду, каб параўноўваць «яблыкі з яблыкамі»:
// ніжні рэгістр, без націскаў, без лішніх прабелаў
function normalizeRussian(text) {
    return text
        .toLowerCase()
        .replace(/[\u0300\u0301]/g, '')      // націскі
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeBelarusian(text) {
    return text
        .toLowerCase()
        .normalize('NFC')
        .replace(/[\u0300\u0301]/g, '')      // націскі
        .replace(/[’ʼ`´]/g, "'")            // розныя апострафы → адзін
        .replace(/\s+/g, ' ')
        .trim();
}

// Значэнне з індэкса ("9", 9 або [9, 10]) → нумар файла (лік)
function indexValueToFileNumber(value) {
    if (Array.isArray(value)) value = value[0];
    const number = parseInt(value, 10);
    if (isNaN(number)) return null;
    return number + FILE_OFFSET;
}

// 9 → "009"  (так называюцца файлы)
function padNumber(number) {
    return String(number).padStart(3, '0');
}

// 9 → "pages/009.png"
function imagePath(fileNumber) {
    return IMAGE_FOLDER + '/' + padNumber(fileNumber) + '.' + IMAGE_EXTENSION;
}

// Нумар, які пішам у подпісе над старонкай
function labelNumber(fileNumber) {
    return fileNumber + LABEL_OFFSET;
}


/* =====================================================================
   4. ЗАГРУЗКА ІНДЭКСАЎ
   ===================================================================== */

async function fetchJson(fileName) {
    const response = await fetch(fileName);
    if (!response.ok) throw new Error(fileName);
    return response.json();
}

async function loadIndexes() {
    try {
        const [russianData, belarusianData] = await Promise.all([
            fetchJson(RUSSIAN_INDEX_FILE),
            fetchJson(BELARUSIAN_INDEX_FILE),
        ]);
        buildRussianIndex(russianData);
        buildBelarusianIndex(belarusianData);
        markActiveButton('modeSeg', 'm', pagesMode);
        refresh({ resetShift: true });
    } catch (error) {
        el.errorBox.classList.remove('hidden');
        el.errorBox.textContent =
            'Не ўдалося загрузіць індэксы (' + error.message + '). ' +
            'Адкрывайце сайт праз вэб-сервер, а не двойчым клікам па файле ' +
            '(напрыклад, у тэчцы сайта: python -m http.server).';
    }
}

// Рускі індэкс: складаем спіс і сартуем па нумары старонкі.
// Так парадак супадае з парадкам у слоўніку, а на яго абапіраецца бінарны пошук.
function buildRussianIndex(data) {
    russianEntries = [];

    for (const word in data) {
        const page = indexValueToFileNumber(data[word]);
        if (page === null) continue;
        russianEntries.push({ key: normalizeRussian(word), original: word, page: page });
    }
    russianEntries.sort((a, b) => a.page - b.page);

    // Праверка: ці ідуць словы па алфавіце. Калі не — у кансолі (F12) будзе папярэджанне,
    // і тады, хутчэй за ўсё, у індэксе памылка (напрыклад, ад распазнавання тэксту).
    for (let i = 1; i < russianEntries.length; i++) {
        const before = russianEntries[i - 1].key;
        const after = russianEntries[i].key;
        if (russianCollator.compare(before, after) > 0) {
            console.warn('Парадак рускага індэкса парушаны каля: "' + before + '" → "' + after + '"');
        }
    }
}

// Беларускі індэкс: слоўнік «слова → старонка» + спіс слоў па алфавіце
function buildBelarusianIndex(data) {
    belarusianPages = {};

    for (const word in data) {
        const page = indexValueToFileNumber(data[word]);
        if (page !== null) belarusianPages[normalizeBelarusian(word)] = page;
    }
    belarusianWords = Object.keys(belarusianPages).sort(belarusianCollator.compare);
}


/* =====================================================================
   5. ПОШУК

   Абедзве функцыі вяртаюць аб'ект:
     page              — нумар файла для паказу (або null, калі нічога не знойдзена)
     hint              — тэкст пад полем пошуку
     maybeOnNextPage   — true, калі слова можа быць на наступнай старонцы
     suggestions       — спіс слоў-падказак (толькі для беларускага пошуку)
   А калі поле пустое, вяртаюць null.
   ===================================================================== */

// РУСКІ пошук.
// У індэксе толькі ПЕРШЫЯ словы кожнай старонкі. Таму шукаем апошняе першае слова,
// якое па алфавіце не пазней за запыт — на яго старонцы слова і павінна быць.
// Гэта бінарны пошук: кожным крокам адкідаем палову спіса.
function searchRussian(rawQuery) {
    const query = normalizeRussian(rawQuery);
    if (!query) return null;

    let low = 0;
    let high = russianEntries.length - 1;
    let foundIndex = -1;

    while (low <= high) {
        const middle = (low + high) >> 1;
        if (russianCollator.compare(russianEntries[middle].key, query) <= 0) {
            foundIndex = middle;   // гэты падыходзіць, паглядзім, ці няма бліжэй
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    if (foundIndex < 0) foundIndex = 0;   // запыт раней за ўсё, што ёсць — паказваем пачатак

    const entry = russianEntries[foundIndex];
    const nextEntry = russianEntries[foundIndex + 1];
    const isExactMatch = entry.key === query;

    // Напрыклад, запыт «вект», а наступная старонка пачынаецца са слова «вектор»:
    // слова магло трапіць на наступную старонку
    const nextStartsWithQuery = !isExactMatch && nextEntry && nextEntry.key.startsWith(query);

    let hint;
    if (isExactMatch) {
        hint = '<strong>«' + entry.original + '»</strong> — першае слова на старонцы ' +
               labelNumber(entry.page) + '.';
    } else {
        const nextText = nextEntry ? nextEntry.original : 'канец слоўніка';
        hint = 'Слова ляжыць па алфавіце паміж <strong>«' + entry.original +
               '»</strong> і <strong>«' + nextText + '»</strong>.';
    }

    return {
        page: entry.page,
        hint: hint,
        maybeOnNextPage: nextStartsWithQuery,
        suggestions: [],
    };
}

// БЕЛАРУСКІ пошук.
// У індэксе ўсе словы, таму шукаем проста па слоўніку.
// Калі дакладнага слова няма — прапануем словы, якія пачынаюцца з уведзенага.
function searchBelarusian(rawQuery) {
    const query = normalizeBelarusian(rawQuery);
    if (!query) return null;

    // 1) дакладнае супадзенне
    if (belarusianPages[query] !== undefined) {
        const page = belarusianPages[query];
        return {
            page: page,
            hint: '<strong>«' + query + '»</strong> — старонка ' + labelNumber(page) + '.',
            maybeOnNextPage: false,
            suggestions: [],
        };
    }

    // 2) словы, якія пачынаюцца з запыту
    const similarWords = belarusianWords.filter(word => word.startsWith(query)).slice(0, 10);
    if (similarWords.length > 0) {
        return {
            page: belarusianPages[similarWords[0]],
            hint: 'Дакладнага супадзення няма. Паказана старонка для <strong>«' + similarWords[0] + '»</strong>.',
            maybeOnNextPage: false,
            suggestions: similarWords,
        };
    }

    // 3) нічога не знойдзена
    return {
        page: null,
        hint: 'Такога слова ў індэксе няма. Праверце напісанне.',
        maybeOnNextPage: false,
        suggestions: [],
    };
}


/* =====================================================================
   6. АДЛЮСТРАВАННЕ

   refresh() — галоўная функцыя. Яна КОЖНЫ РАЗ ЗНОЎ:
     - чытае тэкст з поля,
     - шукае яго ў індэксе,
     - малюе старонкі.
   Нічога не «запамінаецца» паміж выклікамі, таму нумар старонкі і карцінка
   заўсёды ідуць з аднаго і таго ж нумара і разысціся не могуць.
   (Адзінае, што памятаецца — pageShift, зрух пры гартанні ← →.)
   ===================================================================== */

// HTML адной старонкі: подпіс зверху + карцінка.
//   isFound   — падсвятліць рамкай (гэта знойдзеная старонка)
//   noteText  — надпіс справа ад подпісу (можа быць пустым)
//   noteIsLink — зрабіць надпіс націскальнай спасылкай
function buildPageHtml(fileNumber, isFound, noteText, noteIsLink) {
    if (fileNumber < 1) return '';
    if (LAST_PAGE && fileNumber > LAST_PAGE) return '';

    let note = '';
    if (noteText) {
        note = noteIsLink
            ? '<a href="#" class="more">' + noteText + '</a>'
            : '<span>' + noteText + '</span>';
    }

    const title = 'Старонка ' + labelNumber(fileNumber);
    return '' +
        '<figure class="' + (isFound ? 'hit' : '') + '">' +
            '<figcaption><span>' + title + '</span>' + note + '</figcaption>' +
            '<div class="img">' +
                '<img src="' + imagePath(fileNumber) + '" alt="' + title + '" data-file="' + fileNumber + '">' +
            '</div>' +
        '</figure>';
}

// Падсказка і спіс падказак пад полем пошуку
function renderHintAndSuggestions(result) {
    let hintHtml = result ? result.hint : '';
    if (SHOW_DEBUG_INFO && result && result.page) {
        hintHtml += ' <small>[файл ' + padNumber(result.page) + '.' + IMAGE_EXTENSION + ']</small>';
    }
    el.hint.innerHTML = hintHtml;

    const words = result ? result.suggestions : [];
    el.suggestions.innerHTML = words.map(word => '<button>' + word + '</button>').join('');
    el.suggestions.classList.toggle('hidden', words.length === 0);

    // Націск на падказку ставіць слова ў поле і шукае нанова
    el.suggestions.querySelectorAll('button').forEach(button => {
        button.onclick = () => {
            el.searchInput.value = button.textContent;
            refresh({ resetShift: true });
        };
    });
}

// Малюем старонкі
function renderPages(result) {
    const showTwo = (pagesMode === '2');
    const hasPage = Boolean(result && result.page);

    el.pages.className = 'pages ' + (showTwo ? 'two' : '');
    el.emptyMessage.classList.toggle('hidden', hasPage);
    el.nav.classList.toggle('hidden', !hasPage);

    if (!hasPage) {
        el.pages.innerHTML = '';
        return;
    }

    // Якая старонка стаіць першай: знойдзеная + зрух ад гартання (у межах 1…LAST_PAGE)
    let firstPage = result.page + pageShift;
    firstPage = Math.max(1, firstPage);
    if (LAST_PAGE) firstPage = Math.min(LAST_PAGE, firstPage);
    pageShift = firstPage - result.page;

    const firstIsFound = (pageShift === 0) && !result.isStartPage;

    if (showTwo) {
        // Дзве старонкі: першая (знойдзеная) і наступная справа
        el.pages.innerHTML =
            buildPageHtml(firstPage, firstIsFound, firstIsFound ? 'знойдзена' : '', false) +
            buildPageHtml(firstPage + 1, false, '', false);
        el.pageLabel.textContent = labelNumber(firstPage) + ' – ' + labelNumber(firstPage + 1);
    } else {
        // Адна старонка. Калі слова можа быць на наступнай — пішам над старонкай надпіс-спасылку.
        const showNote = firstIsFound && result.maybeOnNextPage;
        el.pages.innerHTML = buildPageHtml(
            firstPage, firstIsFound,
            showNote ? 'магчыма, слова на наступнай старонцы →' : '',
            true
        );
        el.pageLabel.textContent = String(labelNumber(firstPage));
    }

    // Кнопкі «Назад» / «Далей»
    el.prevButton.disabled = (firstPage <= 1);
    const lastShown = showTwo ? firstPage + 1 : firstPage;
    el.nextButton.disabled = Boolean(LAST_PAGE) && lastShown >= LAST_PAGE;

    attachPageEvents();
    preloadNeighbours(firstPage, showTwo);
}

// Падзеі на толькі што намаляваных старонках
function attachPageEvents() {
    el.pages.querySelectorAll('img').forEach(image => {
        // Няма файла — паказваем тэкст замест карцінкі
        image.onerror = () => {
            image.parentNode.innerHTML =
                'Файла ' + padNumber(image.dataset.file) + '.' + IMAGE_EXTENSION + ' няма';
        };
        // Націск — павелічэнне
        image.onclick = () => {
            el.zoomImage.src = image.src;
            el.zoomOverlay.classList.remove('hidden');
        };
    });

    // Надпіс «магчыма, на наступнай →» — гэта проста гартанне на 1 далей
    el.pages.querySelectorAll('.more').forEach(link => {
        link.onclick = event => {
            event.preventDefault();
            pageShift += 1;
            refresh({ resetShift: false });
        };
    });
}

// Загадзя загружаем суседнія карцінкі, каб гартанне было імгненным
function preloadNeighbours(firstPage, showTwo) {
    const previous = firstPage - 1;
    const next = firstPage + (showTwo ? 2 : 1);
    [previous, next].forEach(number => {
        if (number > 0) new Image().src = imagePath(number);
    });
}

// Абнаўляе ўсё. resetShift: true — гэта новы пошук (скідваем зрух гартання),
// false — проста пагарталі ці змянілі рэжым (зрух пакідаем).
function refresh(options) {
    if (options.resetShift) pageShift = 0;

    const query = el.searchInput.value;
    let result = null;
    if (query.trim()) {
        result = (searchLanguage === 'ru') ? searchRussian(query) : searchBelarusian(query);
    } else if (START_PAGE) {
        // Поле пустое — паказваем стартавую старонку (без пазнакі «знойдзена»)
        result = { page: START_PAGE, hint: '', maybeOnNextPage: false, suggestions: [], isStartPage: true };
    }

    renderHintAndSuggestions(result);
    renderPages(result);
}


/* =====================================================================
   7. ПАДЗЕІ (кнопкі, клавіятура)
   ===================================================================== */

// Падсвятляе актыўную кнопку ў групе: containerId — id групы, attribute — назва data-атрыбута
function markActiveButton(containerId, attribute, activeValue) {
    document.querySelectorAll('#' + containerId + ' button').forEach(button => {
        button.classList.toggle('on', button.dataset[attribute] === activeValue);
    });
}

// Увод тэксту → новы пошук
el.searchInput.addEventListener('input', () => refresh({ resetShift: true }));

// Выбар мовы (Руская / Беларуская)
document.querySelectorAll('#langSeg button').forEach(button => {
    button.onclick = () => {
        searchLanguage = button.dataset.l;
        markActiveButton('langSeg', 'l', searchLanguage);
        refresh({ resetShift: true });
        el.searchInput.focus();
    };
});

// Выбар «Адна старонка» / «Дзве старонкі» (запамінаецца)
document.querySelectorAll('#modeSeg button').forEach(button => {
    button.onclick = () => {
        pagesMode = button.dataset.m;
        saveSetting('mode', pagesMode);
        markActiveButton('modeSeg', 'm', pagesMode);
        refresh({ resetShift: false });
    };
});

// Гартанне
el.prevButton.onclick = () => { pageShift -= 1; refresh({ resetShift: false }); };
el.nextButton.onclick = () => { pageShift += 1; refresh({ resetShift: false }); };

// Закрыццё павелічэння націскам
el.zoomOverlay.onclick = () => el.zoomOverlay.classList.add('hidden');

// Клавіятура: Esc закрывае павелічэнне, стрэлкі гартаюць (калі не ўводзім тэкст)
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') el.zoomOverlay.classList.add('hidden');

    const typingInField = (event.target.tagName === 'INPUT');
    const nothingShown = el.nav.classList.contains('hidden');
    if (typingInField || nothingShown) return;

    if (event.key === 'ArrowLeft' && !el.prevButton.disabled) el.prevButton.click();
    if (event.key === 'ArrowRight' && !el.nextButton.disabled) el.nextButton.click();
});


/* =====================================================================
   8. ТЭМА (светлая / цёмная)
   Па змаўчанні — як у наладах прылады; выбар запамінаецца.
   Самі колеры ляжаць у style.css.
   ===================================================================== */

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    el.themeButton.textContent = (theme === 'dark') ? '☀ Светлая' : '☾ Цёмная';
}

const deviceIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(loadSetting('theme') || (deviceIsDark ? 'dark' : 'light'));

el.themeButton.onclick = () => {
    const current = document.documentElement.dataset.theme;
    const next = (current === 'dark') ? 'light' : 'dark';
    saveSetting('theme', next);
    applyTheme(next);
};


/* =====================================================================
   9. ЗАПУСК
   ===================================================================== */

markActiveButton('modeSeg', 'm', pagesMode);
loadIndexes();
