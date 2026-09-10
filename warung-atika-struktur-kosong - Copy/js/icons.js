 /* ================================================================
   ICONS — Warung Atika Enterprise
   ================================================================
   Kumpulan SVG Icons (Inline):
   - Tidak pakai emoji
   - Fill currentColor
   - Ukuran fleksibel
   - Stroke width konsisten
   Total: 500+ baris (33+ icons)
   ================================================================ */

'use strict';

// ================================================================
// PART 1: ICON TEMPLATE
// ================================================================

const ICON_TEMPLATE = (path, options = {}) => {
    const size = options.size || 24;
    const strokeWidth = options.strokeWidth || 2;
    const extraClass = options.class || '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="icon ${extraClass}" aria-hidden="true">${path}</svg>`;
};

// ================================================================
// PART 2: ICONS COLLECTION
// ================================================================

const Icons = {
    // ---- Navigation ----
    cashier: ICON_TEMPLATE(`
        <rect x="2" y="10" width="20" height="12" rx="2"/>
        <path d="M6 6v4M18 6v4M8 14h8"/>
    `),

    admin: ICON_TEMPLATE(`
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
    `),

    dashboard: ICON_TEMPLATE(`
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
    `),

    logout: ICON_TEMPLATE(`
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
    `),

    // ---- Actions ----
    add: ICON_TEMPLATE(`
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    `),

    edit: ICON_TEMPLATE(`
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    `),

    delete: ICON_TEMPLATE(`
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
    `),

    save: ICON_TEMPLATE(`
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
    `),

    close: ICON_TEMPLATE(`
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    `),

    check: ICON_TEMPLATE(`
        <polyline points="20 6 9 17 4 12"/>
    `),

    refresh: ICON_TEMPLATE(`
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    `),

    // ---- Search & Filter ----
    search: ICON_TEMPLATE(`
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    `),

    filter: ICON_TEMPLATE(`
        <polygon points="22 3 2 3 10 13 10 21 14 18 14 13 22 3"/>
    `),

    sort: ICON_TEMPLATE(`
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="12" x2="14" y2="12"/>
        <line x1="4" y1="18" x2="18" y2="18"/>
    `),

    // ---- Cart & Checkout ----
    cart: ICON_TEMPLATE(`
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    `),

    checkout: ICON_TEMPLATE(`
        <rect x="1" y="4" width="22" height="16" rx="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
    `),

    // ---- Scanner ----
    scan: ICON_TEMPLATE(`
        <path d="M3 7V5a2 2 0 0 1 2-2h2M3 17v2a2 2 0 0 0 2 2h2M21 7V5a2 2 0 0 0-2-2h-2M21 17v2a2 2 0 0 1-2 2h-2"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
    `),

    barcode: ICON_TEMPLATE(`
        <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14"/>
    `),

    qris: ICON_TEMPLATE(`
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <line x1="14" y1="14" x2="14" y2="21"/>
        <line x1="18" y1="14" x2="18" y2="21"/>
        <line x1="21" y1="14" x2="21" y2="21"/>
        <line x1="14" y1="17.5" x2="21" y2="17.5"/>
    `),

    // ---- Status ----
    warning: ICON_TEMPLATE(`
        <path d="M12 2L2 20h20L12 2z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
    `),

    error: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    `),

    success: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="10"/>
        <polyline points="8 12 11 15 16 9"/>
    `),

    info: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
    `),

    // ---- Communication ----
    sync: ICON_TEMPLATE(`
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
    `),

    online: ICON_TEMPLATE(`
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
    `),

    offline: ICON_TEMPLATE(`
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
    `),

    // ---- Files ----
    download: ICON_TEMPLATE(`
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    `),

    upload: ICON_TEMPLATE(`
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
    `),

    export: ICON_TEMPLATE(`
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    `),

    import: ICON_TEMPLATE(`
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
    `),

    // ---- Navigation UI ----
    menu: ICON_TEMPLATE(`
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
    `),

    more: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
    `),

    chevronLeft: ICON_TEMPLATE(`
        <polyline points="15 18 9 12 15 6"/>
    `),

    chevronRight: ICON_TEMPLATE(`
        <polyline points="9 18 15 12 9 6"/>
    `),

    chevronUp: ICON_TEMPLATE(`
        <polyline points="18 15 12 9 6 15"/>
    `),

    chevronDown: ICON_TEMPLATE(`
        <polyline points="6 9 12 15 18 9"/>
    `),

    arrowLeft: ICON_TEMPLATE(`
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
    `),

    arrowRight: ICON_TEMPLATE(`
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
    `),

    // ---- User & Settings ----
    profile: ICON_TEMPLATE(`
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    `),

    settings: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    `),

    lock: ICON_TEMPLATE(`
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    `),

    unlock: ICON_TEMPLATE(`
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    `),

    // ---- Report ----
    report: ICON_TEMPLATE(`
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
    `),

    chart: ICON_TEMPLATE(`
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
    `),

    // ---- Theme ----
    sun: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    `),

    moon: ICON_TEMPLATE(`
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    `),

    // ---- Misc ----
    plus: ICON_TEMPLATE(`
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    `),

    minus: ICON_TEMPLATE(`
        <line x1="5" y1="12" x2="19" y2="12"/>
    `),

    trash: ICON_TEMPLATE(`
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
    `),

    clock: ICON_TEMPLATE(`
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    `),

    calendar: ICON_TEMPLATE(`
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
    `),

    user: ICON_TEMPLATE(`
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    `),

    package: ICON_TEMPLATE(`
        <path d="M16.5 9.4L7.5 4.21"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
    `),

    money: ICON_TEMPLATE(`
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M6 12h.01M18 12h.01"/>
    `),

    receipt: ICON_TEMPLATE(`
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
        <line x1="8" y1="8" x2="16" y2="8"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="8" y1="16" x2="12" y2="16"/>
    `),

    bell: ICON_TEMPLATE(`
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    `),

    star: ICON_TEMPLATE(`
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    `),

    heart: ICON_TEMPLATE(`
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    `)
};

// ================================================================
// PART 3: ICON RENDERER
// ================================================================

const IconRenderer = {
    // Render icon ke element
    render(iconName, target, options = {}) {
        const svg = Icons[iconName];
        if (!svg) {
            console.warn(`[Icons] Icon "${iconName}" not found`);
            return null;
        }

        // Jika target adalah selector string
        if (typeof target === 'string') {
            const el = document.querySelector(target);
            if (!el) return null;
            el.innerHTML = svg;
            return el;
        }

        // Jika target adalah element
        if (target instanceof HTMLElement) {
            target.innerHTML = svg;
            return target;
        }

        return null;
    },

    // Get icon HTML
    get(iconName, options = {}) {
        let svg = Icons[iconName];
        if (!svg) {
            console.warn(`[Icons] Icon "${iconName}" not found`);
            return '';
        }

        // Custom size
        if (options.size) {
            svg = svg.replace(/width="\d+"/, `width="${options.size}"`)
                     .replace(/height="\d+"/, `height="${options.size}"`);
        }

        // Custom class
        if (options.class) {
            svg = svg.replace('class="icon"', `class="icon ${options.class}"`);
        }

        // Custom color
        if (options.color) {
            svg = svg.replace('stroke="currentColor"', `stroke="${options.color}"`);
        }

        return svg;
    },

    // Check icon exists
    exists(iconName) {
        return !!Icons[iconName];
    },

    // Get all icon names
    getAllNames() {
        return Object.keys(Icons);
    },

    // Count
    count() {
        return Object.keys(Icons).length;
    }
};

// ================================================================
// PART 4: DYNAMIC ICON INJECTION
// ================================================================

const AutoInject = {
    // Auto-inject icons ke element dengan data-icon
    scan() {
        const elements = document.querySelectorAll('[data-icon]');
        let count = 0;
        elements.forEach(el => {
            const iconName = el.getAttribute('data-icon');
            if (Icons[iconName]) {
                // Hanya inject kalau belum ada SVG
                if (!el.querySelector('svg')) {
                    el.insertAdjacentHTML('afterbegin', Icons[iconName]);
                    count++;
                }
            }
        });
        return count;
    },

    // MutationObserver untuk auto-inject saat ada element baru
    observe() {
        if (typeof MutationObserver === 'undefined') return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        // Cek apakah node punya data-icon
                        if (node.hasAttribute && node.hasAttribute('data-icon')) {
                            const iconName = node.getAttribute('data-icon');
                            if (Icons[iconName] && !node.querySelector('svg')) {
                                node.insertAdjacentHTML('afterbegin', Icons[iconName]);
                            }
                        }
                        // Cek descendants
                        if (node.querySelectorAll) {
                            node.querySelectorAll('[data-icon]').forEach(el => {
                                const iconName = el.getAttribute('data-icon');
                                if (Icons[iconName] && !el.querySelector('svg')) {
                                    el.insertAdjacentHTML('afterbegin', Icons[iconName]);
                                }
                            });
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        return observer;
    }
};

// ================================================================
// PART 5: INITIALIZATION
// ================================================================

function initialize() {
    console.log(`🎨 Icons module initialized (${IconRenderer.count()} icons)`);

    // Auto-inject saat DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            AutoInject.scan();
            AutoInject.observe();
        });
    } else {
        AutoInject.scan();
        AutoInject.observe();
    }

    return true;
}

// ================================================================
// PART 6: EXPORT
// ================================================================

const IconsModule = {
    Icons,
    IconRenderer,
    AutoInject,
    initialize,

    // Shortcuts
    get: (name, opts) => IconRenderer.get(name, opts),
    render: (name, target, opts) => IconRenderer.render(name, target, opts)
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Icons = Icons;
    window.IconsModule = IconsModule;
}

console.log('✅ icons.js loaded');

export default IconsModule;
export { Icons, IconRenderer, AutoInject, initialize };

// ================================================================
// END OF ICONS — 500+ BARIS
// ================================================================