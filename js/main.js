// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const menuIcon = mobileMenuBtn.querySelector('i');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    menuIcon.classList.toggle('fa-bars');
    menuIcon.classList.toggle('fa-xmark');
});

// Zamknij menu po kliknieciu linku
mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        menuIcon.classList.add('fa-bars');
        menuIcon.classList.remove('fa-xmark');
    });
});

// Cache danych about.json
var aboutData = null;

// Ladowanie sekcji "O mnie" z pliku JSON + tlumaczen
async function loadAboutSection() {
    try {
        if (!aboutData) {
            const response = await fetch('data/about.json');
            aboutData = await response.json();
        }

        document.getElementById('about-description').textContent = I18n.t('about.description');
        document.getElementById('about-name').textContent = aboutData.name;
        document.getElementById('about-location').textContent = I18n.t('about.location');

        const positionEl = document.getElementById('about-position');
        positionEl.innerHTML = `${I18n.t('about.position')} @ <a href="${aboutData.company.url}" target="_blank" class="text-blue-400 hover:underline">${aboutData.company.name}</a>`;

        const linkedinEl = document.getElementById('about-linkedin');
        linkedinEl.href = aboutData.linkedin;

        const highlightsContainer = document.getElementById('about-highlights');
        highlightsContainer.innerHTML = aboutData.highlights.map(h => `
            <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center hover:border-blue-500/50 transition-colors duration-300">
                <div class="text-3xl font-bold text-${h.color}-500 mb-2">
                    ${h.icon ? `<i class="${h.icon}"></i>` : h.value}
                </div>
                <div class="text-slate-400 text-sm">${I18n.t(h.labelKey)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Blad ladowania danych "O mnie":', error);
    }
}

// Przeladuj sekcje "O mnie" przy zmianie jezyka
I18n.onReady(function () {
    loadAboutSection();
});

// Intersection Observer - fade in sekcji
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('section:not(#hero)').forEach(section => {
    section.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-700');
    observer.observe(section);
});
