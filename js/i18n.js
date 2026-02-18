// Modul i18n - obsluga dwujezycznosci PL/EN
var I18n = (function () {
    var LANG_KEY = 'lang-preference';
    var DEFAULT_LANG = 'pl';
    var SUPPORTED = ['pl', 'en'];

    var currentLang = null;
    var translations = {};
    var onReadyCallbacks = [];

    function getSavedLang() {
        var saved = localStorage.getItem(LANG_KEY);
        return SUPPORTED.indexOf(saved) !== -1 ? saved : DEFAULT_LANG;
    }

    function saveLang(lang) {
        localStorage.setItem(LANG_KEY, lang);
    }

    // Pobranie tlumaczenia po kluczu z kropkami (np. "nav.about")
    function t(key) {
        var parts = key.split('.');
        var result = translations;
        for (var i = 0; i < parts.length; i++) {
            if (result == null) return key;
            result = result[parts[i]];
        }
        return result != null ? result : key;
    }

    function applyTranslations() {
        // textContent
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.dataset.i18n);
        });

        // innerHTML (elementy z linkami/formatowaniem)
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            el.innerHTML = t(el.dataset.i18nHtml);
        });

        // Atrybuty (title, aria-label) - klucz z data-i18n-key, data-i18n lub data-i18n-html
        document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
            var key = el.dataset.i18nKey || el.dataset.i18n || el.dataset.i18nHtml;
            if (!key) return;
            var attrs = el.dataset.i18nAttr.split(',');
            var value = t(key);
            attrs.forEach(function (attr) {
                el.setAttribute(attr.trim(), value);
            });
        });

        // Meta i title
        updateMeta();

        // Przycisk jezyka
        updateLangButton();

        // Pokaz strone (anti-FOUC)
        document.documentElement.style.visibility = '';
    }

    function updateMeta() {
        var page = document.body.dataset.page || 'index';
        document.title = t('meta.' + page + '_title');
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = t('meta.' + page + '_description');
    }

    function updateLangButton() {
        var btn = document.getElementById('lang-toggle');
        if (!btn) return;
        var nextLang = currentLang === 'pl' ? 'EN' : 'PL';
        var span = btn.querySelector('span');
        if (span) span.textContent = nextLang;
        btn.title = currentLang === 'pl' ? 'English' : 'Polski';
    }

    async function loadLang(lang) {
        var response = await fetch('i18n/' + lang + '.json');
        translations = await response.json();
        currentLang = lang;
        document.documentElement.lang = lang;
        applyTranslations();
        onReadyCallbacks.forEach(function (cb) { cb(lang); });
    }

    async function switchTo(lang) {
        if (SUPPORTED.indexOf(lang) === -1) return;
        saveLang(lang);
        await loadLang(lang);
    }

    function toggle() {
        var next = currentLang === 'pl' ? 'en' : 'pl';
        return switchTo(next);
    }

    // Callback wykonywany po zaladowaniu/zmianie tlumaczen
    function onReady(cb) {
        onReadyCallbacks.push(cb);
        if (currentLang) cb(currentLang);
    }

    function getLang() {
        return currentLang;
    }

    async function init() {
        await loadLang(getSavedLang());

        // Obsluga przycisku jezyka
        var langBtn = document.getElementById('lang-toggle');
        if (langBtn) {
            langBtn.addEventListener('click', function () {
                toggle();
            });
        }
    }

    return { t: t, init: init, switchTo: switchTo, toggle: toggle, onReady: onReady, getLang: getLang };
})();
