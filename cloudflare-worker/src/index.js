// Cloudflare Worker - Proxy API do Notion dla bloga
// Endpoints:
//   GET /posts              - lista opublikowanych postow
//   GET /posts/:slugOrId    - pelna tresc posta (metadane + bloki)

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '';

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return corsResponse(env, origin, 204);
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Sprawdz cache
        const cacheKey = new Request(url.toString(), request);
        const cache = caches.default;
        let cached = await cache.match(cacheKey);
        if (cached) return cached;

        try {
            let data;

            if (path === '/posts' && request.method === 'GET') {
                data = await handleListPosts(url, env);
            } else if (path.startsWith('/posts/') && request.method === 'GET') {
                const slugOrId = decodeURIComponent(path.replace('/posts/', ''));
                data = await handleGetPost(slugOrId, env);
            } else {
                return corsResponse(env, origin, 404, { error: 'Not Found' });
            }

            const response = jsonResponse(env, origin, 200, data);

            // Zapisz do cache (non-blocking)
            ctx.waitUntil(cache.put(cacheKey, response.clone()));

            return response;
        } catch (err) {
            console.error('Worker error:', err);
            return corsResponse(env, origin, 500, { error: 'Internal Server Error' });
        }
    }
};

// --- Handlery endpointow ---

async function handleListPosts(url, env) {
    const startCursor = url.searchParams.get('start_cursor');
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '12', 10), 100);

    const body = {
        filter: {
            property: 'Published',
            checkbox: { equals: true }
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: pageSize,
    };
    if (startCursor) body.start_cursor = startCursor;

    const res = await notionFetch(
        'POST',
        `/databases/${env.NOTION_DATABASE_ID}/query`,
        body,
        env
    );
    const json = await res.json();

    if (!res.ok || !json.results) {
        console.error('Notion API error:', JSON.stringify(json));
        throw new Error(json.message || 'Notion API error');
    }

    const posts = json.results.map(page => mapPageToPost(page));

    return {
        posts,
        has_more: json.has_more,
        next_cursor: json.next_cursor || null,
    };
}

async function handleGetPost(slugOrId, env) {
    let pageId = slugOrId;

    // Jesli to nie UUID - szukaj po slugu
    if (!isUUID(slugOrId)) {
        const queryBody = {
            filter: {
                and: [
                    { property: 'Slug', rich_text: { equals: slugOrId } },
                    { property: 'Published', checkbox: { equals: true } },
                ]
            },
            page_size: 1,
        };
        const res = await notionFetch(
            'POST',
            `/databases/${env.NOTION_DATABASE_ID}/query`,
            queryBody,
            env
        );
        const data = await res.json();
        if (data.results.length === 0) {
            throw new NotFoundError('Post nie znaleziony');
        }
        pageId = data.results[0].id;
    }

    // Pobierz metadane + bloki rownolegle
    const [pageRes, blocks] = await Promise.all([
        notionFetch('GET', `/pages/${pageId}`, null, env),
        fetchAllBlocks(pageId, env),
    ]);

    const page = await pageRes.json();
    if (page.object === 'error') {
        throw new NotFoundError('Post nie znaleziony');
    }

    const post = mapPageToPost(page);
    post.blocks = blocks;

    return post;
}

// --- Notion API helpers ---

async function notionFetch(method, path, body, env) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${env.NOTION_API_TOKEN}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${NOTION_API}${path}`, options);
    return response;
}

async function fetchAllBlocks(blockId, env, depth = 0) {
    if (depth > 3) return [];

    let allBlocks = [];
    let startCursor = null;
    let hasMore = true;

    // Paginacja - Notion max 100 blokow na request
    while (hasMore) {
        let url = `/blocks/${blockId}/children?page_size=100`;
        if (startCursor) url += `&start_cursor=${startCursor}`;

        const res = await notionFetch('GET', url, null, env);
        const data = await res.json();

        if (!data.results) break;

        // Rekurencyjnie pobierz dzieci
        for (const block of data.results) {
            if (block.has_children) {
                block.children = await fetchAllBlocks(block.id, env, depth + 1);
            }
        }

        allBlocks = allBlocks.concat(data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return allBlocks;
}

// --- Mapowanie danych ---

function mapPageToPost(page) {
    const props = page.properties;
    return {
        id: page.id,
        title: extractTitle(props.Title),
        date: props.Date?.date?.start || null,
        description: extractRichText(props.Description),
        tags: props.Tags?.multi_select?.map(t => t.name) || [],
        cover: props.Cover?.url || page.cover?.external?.url || null,
        slug: extractRichText(props.Slug) || page.id,
    };
}

function extractTitle(titleProp) {
    if (!titleProp?.title?.length) return 'Bez tytulu';
    return titleProp.title.map(t => t.plain_text).join('');
}

function extractRichText(rtProp) {
    if (!rtProp?.rich_text?.length) return '';
    return rtProp.rich_text.map(t => t.plain_text).join('');
}

function isUUID(str) {
    return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(str);
}

// --- Response helpers ---

function isOriginAllowed(origin, env) {
    if (!origin) return false;
    const allowed = env.ALLOWED_ORIGIN || '*';
    if (allowed === '*') return true;
    if (origin === allowed) return true;
    // Localhost zawsze dozwolony w dev
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    return false;
}

function corsHeaders(env, origin) {
    const allowed = env.ALLOWED_ORIGIN || '*';
    // Jesli wildcard - zwroc *
    // Jesli origin pasuje - zwroc ten origin (dynamiczny CORS)
    let allowOrigin = allowed;
    if (allowed !== '*' && isOriginAllowed(origin, env)) {
        allowOrigin = origin;
    }
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
    };
}

function jsonResponse(env, origin, status, data) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${env.CACHE_TTL || 300}`,
            ...corsHeaders(env, origin),
        },
    });
}

function corsResponse(env, origin, status, data = null) {
    return new Response(data ? JSON.stringify(data) : null, {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(env, origin),
        },
    });
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
