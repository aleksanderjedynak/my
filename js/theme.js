// Zarzadzanie motywem i wspolne funkcje
(function () {
    var THEME_KEY = 'theme-preference';
    var themes = ['dark', 'light', 'system'];
    var icons = { dark: 'fa-moon', light: 'fa-sun', system: 'fa-desktop' };
    // Labels brane z i18n jesli dostepne, fallback na polski
    function getLabel(key) {
        if (typeof I18n !== 'undefined' && I18n.getLang()) {
            return I18n.t('theme.' + key);
        }
        var fallback = { dark: 'Ciemny', light: 'Jasny', system: 'Systemowy' };
        return fallback[key] || key;
    }

    function getStoredTheme() {
        return localStorage.getItem(THEME_KEY) || 'system';
    }

    function getEffectiveTheme(preference) {
        if (preference === 'system') {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return preference;
    }

    function applyTheme(preference, animate) {
        if (animate) {
            document.documentElement.classList.add('theme-transition');
            setTimeout(function () {
                document.documentElement.classList.remove('theme-transition');
            }, 400);
        }

        var effective = getEffectiveTheme(preference);
        document.documentElement.classList.toggle('light-mode', effective === 'light');

        var icon = document.getElementById('theme-icon');
        if (icon) {
            icon.className = 'fa-solid ' + icons[preference];
        }

        var toggle = document.getElementById('theme-toggle');
        if (toggle) {
            var prefix = (typeof I18n !== 'undefined' && I18n.getLang()) ? I18n.t('theme.label_prefix') : 'Motyw';
            toggle.title = prefix + ': ' + getLabel(preference);
        }
    }

    function cycleTheme() {
        var current = getStoredTheme();
        var nextIndex = (themes.indexOf(current) + 1) % themes.length;
        var next = themes[nextIndex];
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next, true);
    }

    // Zastosuj motyw natychmiast (bez animacji)
    applyTheme(getStoredTheme(), false);

    document.addEventListener('DOMContentLoaded', function () {
        // Przelacznik motywu
        var toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', cycleTheme);
        }

        // Scroll to top
        var scrollBtn = document.getElementById('scroll-top');
        if (scrollBtn) {
            window.addEventListener('scroll', function () {
                if (window.scrollY > 300) {
                    scrollBtn.classList.add('visible');
                } else {
                    scrollBtn.classList.remove('visible');
                }
            });
            scrollBtn.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Dynamiczny rok w stopce
        var yearEl = document.getElementById('current-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    });

    // Aktualizuj tooltip motywu przy zmianie jezyka
    if (typeof I18n !== 'undefined') {
        I18n.onReady(function () {
            applyTheme(getStoredTheme(), false);
        });
    }

    // Reaguj na zmiane preferencji systemowych
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
        if (getStoredTheme() === 'system') {
            applyTheme('system', true);
        }
    });
})();
