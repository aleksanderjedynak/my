// Logika strony bloga
// Routing: blog.html = lista postow, blog.html?post=<slug> = widok posta

// --- KONFIGURACJA ---
// Zmien na URL swojego Cloudflare Workera po deployu
const WORKER_URL = 'https://blog-api.aleksanderjedynak.workers.dev';
// --- KONIEC KONFIGURACJI ---

const blogContent = document.getElementById('blog-content');

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const postSlug = params.get('post');

    if (postSlug) {
        loadPost(postSlug);
    } else {
        loadPostsList();
    }
});

// --- Widok listy postow ---

let currentCursor = null;

async function loadPostsList(cursor = null) {
    if (!cursor) {
        showLoader();
    }

    try {
        const url = new URL(`${WORKER_URL}/posts`);
        url.searchParams.set('page_size', '12');
        if (cursor) url.searchParams.set('start_cursor', cursor);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!cursor) {
            renderPostsListHeader();
        }

        renderPostCards(data.posts, !cursor);
        currentCursor = data.next_cursor;

        if (data.has_more) {
            renderLoadMoreButton();
        } else {
            removeLoadMoreButton();
        }
    } catch (err) {
        console.error('Blad ladowania postow:', err);
        showError('Nie udalo sie zaladowac postow. Sprawdz polaczenie z internetem.');
    }
}

function renderPostsListHeader() {
    blogContent.innerHTML = `
        <div class="text-center mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold mb-4">
                <span class="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Blog</span>
            </h2>
            <p class="text-slate-400 max-w-2xl mx-auto">Artykuly o programowaniu, technologiach i nie tylko.</p>
        </div>
        <div id="posts-grid" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        <div id="load-more-container" class="flex justify-center mt-12"></div>
    `;
}

function renderPostCards(posts, replace = false) {
    const grid = document.getElementById('posts-grid');
    if (!grid) return;

    const cardsHtml = posts.map(post => renderPostCard(post)).join('');

    if (replace) {
        grid.innerHTML = cardsHtml;
    } else {
        grid.insertAdjacentHTML('beforeend', cardsHtml);
    }
}

function renderPostCard(post) {
    const date = post.date
        ? new Date(post.date).toLocaleDateString('pl-PL', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
        : '';

    const tags = post.tags.map(t =>
        `<span class="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">${escapeHtml(t)}</span>`
    ).join('');

    const cover = post.cover
        ? `<div class="h-48 overflow-hidden">
            <img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
           </div>`
        : `<div class="h-2 bg-gradient-to-r from-blue-500 to-violet-500"></div>`;

    return `
        <a href="blog.html?post=${encodeURIComponent(post.slug)}" class="group block bg-slate-900/50 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            ${cover}
            <div class="p-6">
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    ${tags}
                </div>
                <h3 class="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">
                    ${escapeHtml(post.title)}
                </h3>
                <p class="text-slate-400 text-sm mb-4 line-clamp-2">${escapeHtml(post.description)}</p>
                <time class="text-slate-500 text-xs">${date}</time>
            </div>
        </a>`;
}

function renderLoadMoreButton() {
    const container = document.getElementById('load-more-container');
    if (!container) return;

    container.innerHTML = `
        <button id="load-more-btn" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors duration-300 border border-slate-700">
            Zaladuj wiecej
        </button>
    `;

    document.getElementById('load-more-btn').addEventListener('click', () => {
        const btn = document.getElementById('load-more-btn');
        btn.innerHTML = '<div class="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>';
        btn.disabled = true;
        loadPostsList(currentCursor);
    });
}

function removeLoadMoreButton() {
    const container = document.getElementById('load-more-container');
    if (container) container.innerHTML = '';
}

// --- Widok posta ---

async function loadPost(slug) {
    showLoader();

    try {
        const res = await fetch(`${WORKER_URL}/posts/${encodeURIComponent(slug)}`);
        if (!res.ok) {
            if (res.status === 404) {
                showError('Post nie zostal znaleziony.');
                return;
            }
            throw new Error(`HTTP ${res.status}`);
        }

        const post = await res.json();
        const renderer = new NotionRenderer();
        const contentHtml = renderer.render(post.blocks);

        renderPostView(post, contentHtml);

        // Zaktualizuj tytul strony
        document.title = `${post.title} - Blog - Aleksander Jedynak`;

    } catch (err) {
        console.error('Blad ladowania posta:', err);
        showError('Nie udalo sie zaladowac posta.');
    }
}

function renderPostView(post, contentHtml) {
    const date = post.date
        ? new Date(post.date).toLocaleDateString('pl-PL', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
        : '';

    const tags = post.tags.map(t =>
        `<span class="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-xs">${escapeHtml(t)}</span>`
    ).join('');

    blogContent.innerHTML = `
        <article class="max-w-3xl mx-auto">
            <a href="blog.html" class="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-300 mb-8 group">
                <i class="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300"></i>
                Wszystkie posty
            </a>

            ${post.cover ? `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" class="w-full rounded-xl mb-8 max-h-96 object-cover">` : ''}

            <header class="mb-12">
                <h1 class="text-3xl sm:text-4xl font-bold mb-4 leading-tight">${escapeHtml(post.title)}</h1>
                <div class="flex items-center gap-4 text-slate-400 text-sm flex-wrap">
                    ${date ? `<time class="flex items-center gap-1.5"><i class="fa-regular fa-calendar"></i> ${date}</time>` : ''}
                    ${tags}
                </div>
            </header>

            <div class="notion-content">
                ${contentHtml}
            </div>

            <div class="mt-16 pt-8 border-t border-slate-800">
                <a href="blog.html" class="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-300 group">
                    <i class="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300"></i>
                    Powrot do wszystkich postow
                </a>
            </div>
        </article>`;
}

// --- Helpery ---

function showLoader() {
    blogContent.innerHTML = `
        <div class="text-center py-20">
            <div class="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-slate-400 mt-4">Ladowanie...</p>
        </div>`;
}

function showError(message) {
    blogContent.innerHTML = `
        <div class="text-center py-20">
            <i class="fa-solid fa-circle-exclamation text-4xl text-red-500 mb-4"></i>
            <p class="text-slate-400">${escapeHtml(message)}</p>
            <a href="blog.html" class="inline-block mt-6 text-blue-400 hover:text-blue-300 transition-colors">
                Powrot do bloga
            </a>
        </div>`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
