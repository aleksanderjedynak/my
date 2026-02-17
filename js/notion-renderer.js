// Renderer blokow Notion API -> HTML
// Konwertuje drzewo blokow JSON z Notion API na string HTML
// z klasami CSS zgodnymi z blog.css

class NotionRenderer {
    // Glowna metoda - renderuje tablice blokow do HTML
    render(blocks) {
        if (!blocks || blocks.length === 0) return '';

        let html = '';
        let i = 0;

        while (i < blocks.length) {
            const block = blocks[i];

            // Grupowanie list items (Notion zwraca je jako osobne bloki)
            if (block.type === 'bulleted_list_item') {
                const items = [];
                while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
                    items.push(blocks[i]);
                    i++;
                }
                html += this.renderBulletedList(items);
                continue;
            }

            if (block.type === 'numbered_list_item') {
                const items = [];
                while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
                    items.push(blocks[i]);
                    i++;
                }
                html += this.renderNumberedList(items);
                continue;
            }

            html += this.renderBlock(block);
            i++;
        }

        return html;
    }

    // Renderuje pojedynczy blok na podstawie typu
    renderBlock(block) {
        const type = block.type;
        const data = block[type];

        switch (type) {
            case 'paragraph':
                return this.renderParagraph(data, block);
            case 'heading_1':
                return this.renderHeading(data, 1, block);
            case 'heading_2':
                return this.renderHeading(data, 2, block);
            case 'heading_3':
                return this.renderHeading(data, 3, block);
            case 'code':
                return this.renderCode(data);
            case 'quote':
                return this.renderQuote(data, block);
            case 'callout':
                return this.renderCallout(data, block);
            case 'image':
                return this.renderImage(data);
            case 'video':
                return this.renderVideo(data);
            case 'embed':
                return this.renderEmbed(data);
            case 'divider':
                return '<hr class="notion-divider">';
            case 'toggle':
                return this.renderToggle(data, block);
            case 'to_do':
                return this.renderToDo(data, block);
            case 'bookmark':
                return this.renderBookmark(data);
            case 'table':
                return this.renderTable(data, block);
            case 'column_list':
                return this.renderColumnList(block);
            case 'column':
                return this.renderColumn(block);
            case 'equation':
                return this.renderEquation(data);
            case 'table_of_contents':
                return '';
            default:
                return '';
        }
    }

    // --- Rich Text ---

    renderRichText(richTextArray) {
        if (!richTextArray || richTextArray.length === 0) return '';

        return richTextArray.map(rt => {
            if (rt.type === 'equation') {
                return `<span class="notion-equation">${this.escapeHtml(rt.equation.expression)}</span>`;
            }

            let text = this.escapeHtml(rt.plain_text);

            // Zamien nowe linie na <br>
            text = text.replace(/\n/g, '<br>');

            // Link
            if (rt.href) {
                text = `<a href="${this.escapeHtml(rt.href)}" target="_blank" rel="noopener noreferrer" class="notion-link">${text}</a>`;
            }

            // Annotations
            const ann = rt.annotations;
            if (ann.code) text = `<code class="notion-inline-code">${text}</code>`;
            if (ann.bold) text = `<strong>${text}</strong>`;
            if (ann.italic) text = `<em>${text}</em>`;
            if (ann.underline) text = `<u>${text}</u>`;
            if (ann.strikethrough) text = `<s>${text}</s>`;

            // Kolory
            if (ann.color && ann.color !== 'default') {
                text = `<span class="notion-color-${ann.color}">${text}</span>`;
            }

            return text;
        }).join('');
    }

    // --- Bloki ---

    renderParagraph(data, block) {
        const text = this.renderRichText(data.rich_text);
        const colorClass = this.getColorClass(data.color);
        const children = block.children ? this.render(block.children) : '';

        if (!text && !children) {
            return '<p class="notion-paragraph">&nbsp;</p>';
        }

        return `<p class="notion-paragraph${colorClass}">${text}</p>${children}`;
    }

    renderHeading(data, level, block) {
        const text = this.renderRichText(data.rich_text);
        const colorClass = this.getColorClass(data.color);
        const id = this.slugify(data.rich_text);

        // Toggle heading
        if (data.is_toggleable && block.children) {
            return `<details class="notion-toggle-heading">
                <summary><h${level} id="${id}" class="notion-h${level}${colorClass}">${text}</h${level}></summary>
                <div class="notion-toggle-content">${this.render(block.children)}</div>
            </details>`;
        }

        return `<h${level} id="${id}" class="notion-h${level}${colorClass}">${text}</h${level}>`;
    }

    renderBulletedList(items) {
        const lis = items.map(item => {
            const data = item.bulleted_list_item;
            let content = this.renderRichText(data.rich_text);
            if (item.children && item.children.length > 0) {
                content += this.render(item.children);
            }
            const colorClass = this.getColorClass(data.color);
            return `<li class="notion-list-item${colorClass}">${content}</li>`;
        }).join('');
        return `<ul class="notion-bulleted-list">${lis}</ul>`;
    }

    renderNumberedList(items) {
        const lis = items.map(item => {
            const data = item.numbered_list_item;
            let content = this.renderRichText(data.rich_text);
            if (item.children && item.children.length > 0) {
                content += this.render(item.children);
            }
            const colorClass = this.getColorClass(data.color);
            return `<li class="notion-list-item${colorClass}">${content}</li>`;
        }).join('');
        return `<ol class="notion-numbered-list">${lis}</ol>`;
    }

    renderCode(data) {
        // Uzyj plain_text zeby uniknac podwojnego escapowania
        const codeText = data.rich_text.map(rt => rt.plain_text).join('');
        const escaped = this.escapeHtml(codeText);
        const language = data.language || 'plain text';
        const caption = data.caption ? this.renderRichText(data.caption) : '';

        return `<div class="notion-code-block">
            <div class="notion-code-header">
                <span class="notion-code-language">${this.escapeHtml(language)}</span>
                <button class="notion-code-copy" onclick="navigator.clipboard.writeText(this.closest('.notion-code-block').querySelector('code').textContent).then(()=>{this.innerHTML='<i class=\\'fa-solid fa-check\\'></i>';setTimeout(()=>{this.innerHTML='<i class=\\'fa-regular fa-copy\\'></i>'},2000)})">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
            <pre><code class="language-${this.escapeHtml(language)}">${escaped}</code></pre>
            ${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}
        </div>`;
    }

    renderQuote(data, block) {
        const text = this.renderRichText(data.rich_text);
        const colorClass = this.getColorClass(data.color);
        const children = block.children ? this.render(block.children) : '';

        return `<blockquote class="notion-quote${colorClass}">
            <p>${text}</p>
            ${children}
        </blockquote>`;
    }

    renderCallout(data, block) {
        let icon = '';
        if (data.icon) {
            if (data.icon.type === 'emoji') {
                icon = `<span class="notion-callout-icon">${data.icon.emoji}</span>`;
            } else if (data.icon.type === 'external') {
                icon = `<img src="${this.escapeHtml(data.icon.external.url)}" class="notion-callout-icon-img" alt="">`;
            }
        }

        const text = this.renderRichText(data.rich_text);
        const bgClass = data.color && data.color !== 'default'
            ? ` notion-bg-${data.color}`
            : ' notion-bg-default';
        const children = block.children ? this.render(block.children) : '';

        return `<div class="notion-callout${bgClass}">
            ${icon}
            <div class="notion-callout-content">
                <p>${text}</p>
                ${children}
            </div>
        </div>`;
    }

    renderImage(data) {
        const url = data.type === 'external'
            ? data.external.url
            : data.file?.url || '';
        const caption = data.caption ? this.renderRichText(data.caption) : '';

        return `<figure class="notion-image">
            <img src="${this.escapeHtml(url)}" alt="${caption ? this.stripHtml(caption) : ''}" loading="lazy">
            ${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}
        </figure>`;
    }

    renderVideo(data) {
        const url = data.type === 'external'
            ? data.external.url
            : data.file?.url || '';
        const caption = data.caption ? this.renderRichText(data.caption) : '';

        // YouTube / Vimeo embed
        const youtubeId = this.extractYoutubeId(url);
        if (youtubeId) {
            return `<figure class="notion-video">
                <div class="notion-video-embed">
                    <iframe src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allowfullscreen loading="lazy"></iframe>
                </div>
                ${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}
            </figure>`;
        }

        return `<figure class="notion-video">
            <video src="${this.escapeHtml(url)}" controls preload="metadata"></video>
            ${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}
        </figure>`;
    }

    renderEmbed(data) {
        const url = data.url || '';
        const caption = data.caption ? this.renderRichText(data.caption) : '';

        return `<figure class="notion-embed">
            <iframe src="${this.escapeHtml(url)}" frameborder="0" loading="lazy" class="notion-embed-iframe"></iframe>
            ${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}
        </figure>`;
    }

    renderToggle(data, block) {
        const summary = this.renderRichText(data.rich_text);
        const colorClass = this.getColorClass(data.color);
        const children = block.children ? this.render(block.children) : '';

        return `<details class="notion-toggle">
            <summary class="notion-toggle-summary${colorClass}">${summary}</summary>
            <div class="notion-toggle-content">${children}</div>
        </details>`;
    }

    renderToDo(data, block) {
        const text = this.renderRichText(data.rich_text);
        const checked = data.checked;
        const colorClass = this.getColorClass(data.color);
        const children = block.children ? this.render(block.children) : '';

        return `<div class="notion-todo${colorClass}">
            <input type="checkbox" class="notion-todo-checkbox" ${checked ? 'checked' : ''} disabled>
            <span class="${checked ? 'notion-todo-checked' : ''}">${text}</span>
            ${children}
        </div>`;
    }

    renderBookmark(data) {
        const url = data.url || '';
        const caption = data.caption ? this.renderRichText(data.caption) : '';

        return `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="notion-bookmark">
            <span class="notion-bookmark-url">${this.escapeHtml(url)}</span>
            ${caption ? `<span class="notion-bookmark-caption">${caption}</span>` : ''}
        </a>`;
    }

    renderTable(data, block) {
        if (!block.children || block.children.length === 0) return '';

        const hasColumnHeader = data.has_column_header;
        const hasRowHeader = data.has_row_header;

        const rows = block.children.map((row, rowIndex) => {
            if (row.type !== 'table_row') return '';

            const cells = row.table_row.cells.map((cell, colIndex) => {
                const content = this.renderRichText(cell);
                const isHeader = (rowIndex === 0 && hasColumnHeader) || (colIndex === 0 && hasRowHeader);
                const tag = isHeader ? 'th' : 'td';
                return `<${tag} class="notion-table-cell">${content}</${tag}>`;
            }).join('');

            return `<tr>${cells}</tr>`;
        }).join('');

        return `<div class="notion-table-wrapper">
            <table class="notion-table">${rows}</table>
        </div>`;
    }

    renderColumnList(block) {
        if (!block.children || block.children.length === 0) return '';

        const columns = block.children.map(col => {
            if (col.type !== 'column') return '';
            const content = col.children ? this.render(col.children) : '';
            return `<div class="notion-column">${content}</div>`;
        }).join('');

        return `<div class="notion-columns">${columns}</div>`;
    }

    renderColumn(block) {
        const content = block.children ? this.render(block.children) : '';
        return `<div class="notion-column">${content}</div>`;
    }

    renderEquation(data) {
        return `<div class="notion-equation-block">${this.escapeHtml(data.expression)}</div>`;
    }

    // --- Helpers ---

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    getColorClass(color) {
        if (!color || color === 'default') return '';
        return ` notion-color-${color}`;
    }

    slugify(richTextArray) {
        if (!richTextArray || richTextArray.length === 0) return '';
        const text = richTextArray.map(rt => rt.plain_text).join('');
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    extractYoutubeId(url) {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }
}
