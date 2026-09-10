 /* ================================================================
   THEME — Warung Atika Enterprise
   ================================================================
   Sistem Tema & Mode:
   - Theme: light / dark
   - Mode: lansia / genz
   - Auto-detect system preference
   - Persistence (localStorage)
   - Smooth transition
   - Event subscription
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from './core.js';

const { CONFIG, Utils, EventBus } = Core;

// ================================================================
// PART 1: THEME CONSTANTS
// ================================================================

const THEME = {
    themes: {
        light: {
            name: 'Light',
            icon: '☀️',
            bg: '#f4f2ef',
            text: '#1c1a18'
        },
        dark: {
            name: 'Dark',
            icon: '🌙',
            bg: '#0f0d0b',
            text: '#ece8e2'
        }
    },
    modes: {
        lansia: {
            name: 'Lansia',
            icon: '👴',
            description: 'Tampilan besar dan mudah dibaca'
        },
        genz: {
            name: 'Gen Z',
            icon: '⚡',
            description: 'Tampilan compact dan cepat'
        }
    },
    defaultTheme: CONFIG.theme.defaultTheme,
    defaultMode: CONFIG.theme.defaultMode,
    storage: {
        theme: CONFIG.storage.keys.theme,
        mode: CONFIG.storage.keys.mode
    },
    transitionDuration: 300
};

// ================================================================
// PART 2: THEME CORE STATE
// ================================================================

const ThemeState = {
    currentTheme: THEME.defaultTheme,
    currentMode: THEME.defaultMode,
    systemPrefersDark: false,
    listeners: new Set()
};

// ================================================================
// PART 3: SYSTEM PREFERENCE DETECTOR
// ================================================================

const SystemDetector = {
    mediaQuery: null,

    // Cek apakah system prefer dark
    prefersDark() {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },

    // Cek apakah system prefers reduced motion
    prefersReducedMotion() {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    // Listen perubahan system preference
    listen(callback) {
        if (typeof window === 'undefined') return;
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', (e) => {
            ThemeState.systemPrefersDark = e.matches;
            if (typeof callback === 'function') {
                callback(e.matches);
            }
        });
    },

    // Get system info
    getInfo() {
        return {
            prefersDark: this.prefersDark(),
            prefersReducedMotion: this.prefersReducedMotion(),
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
            language: typeof navigator !== 'undefined' ? navigator.language : 'id-ID'
        };
    }
};

// ================================================================
// PART 4: STORAGE MANAGER
// ================================================================

const ThemeStorage = {
    // Simpan theme
    saveTheme(theme) {
        Utils.storageSet(THEME.storage.theme, theme);
    },

    // Simpan mode
    saveMode(mode) {
        Utils.storageSet(THEME.storage.mode, mode);
    },

    // Load theme dari storage
    loadTheme() {
        const saved = Utils.storageGet(THEME.storage.theme, null);
        if (saved && THEME.themes[saved]) return saved;
        return null;
    },

    // Load mode dari storage
    loadMode() {
        const saved = Utils.storageGet(THEME.storage.mode, null);
        if (saved && THEME.modes[saved]) return saved;
        return null;
    },

    // Clear
    clear() {
        Utils.storageRemove(THEME.storage.theme);
        Utils.storageRemove(THEME.storage.mode);
    },

    // Get preferences
    getPreferences() {
        return {
            theme: this.loadTheme(),
            mode: this.loadMode()
        };
    }
};

// ================================================================
// PART 5: DOM APPPLIER
// ================================================================

const DOMApplier = {
    // Apply ke document
    apply(theme, mode) {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;

        // Set attribute
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-mode', mode);

        // Update meta theme-color
        this.updateMetaThemeColor(theme);

        // Update system color scheme
        root.style.colorScheme = theme;

        console.log(`🎨 Theme: ${theme} | Mode: ${mode}`);
    },

    // Update meta theme-color (untuk PWA / mobile browser)
    updateMetaThemeColor(theme) {
        if (typeof document === 'undefined') return;

        let metaTag = document.querySelector('meta[name="theme-color"]');
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'theme-color';
            document.head.appendChild(metaTag);
        }

        const color = THEME.themes[theme]?.bg || '#ffffff';
        metaTag.content = color;
    },

    // Get current DOM attributes
    getCurrentAttributes() {
        if (typeof document === 'undefined') return { theme: null, mode: null };
        const root = document.documentElement;
        return {
            theme: root.getAttribute('data-theme'),
            mode: root.getAttribute('data-mode')
        };
    },

    // Sync dari DOM ke state (kalau DOM diubah manual)
    syncFromDOM() {
        const attrs = this.getCurrentAttributes();
        if (attrs.theme && THEME.themes[attrs.theme]) {
            ThemeState.currentTheme = attrs.theme;
        }
        if (attrs.mode && THEME.modes[attrs.mode]) {
            ThemeState.currentMode = attrs.mode;
        }
    }
};

// ================================================================
// PART 6: LISTENERS MANAGER
// ================================================================

const Listeners = {
    // Subscribe perubahan
    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        ThemeState.listeners.add(listener);
        // Panggil langsung dengan state saat ini
        listener({
            theme: ThemeState.currentTheme,
            mode: ThemeState.currentMode
        });
        return () => this.unsubscribe(listener);
    },

    // Unsubscribe
    unsubscribe(listener) {
        ThemeState.listeners.delete(listener);
    },

    // Notify semua listener
    notify() {
        const state = {
            theme: ThemeState.currentTheme,
            mode: ThemeState.currentMode
        };
        for (const listener of ThemeState.listeners) {
            try {
                listener(state);
            } catch (err) {
                console.error('[Theme] Listener error:', err);
            }
        }
    },

    // Clear all
    clear() {
        ThemeState.listeners.clear();
    },

    // Count
    count() {
        return ThemeState.listeners.size;
    }
};

// ================================================================
// PART 7: THEME CONTROLLER (Main API)
// ================================================================

const ThemeController = {
    // ---- Load dari storage ----
    load() {
        const savedTheme = ThemeStorage.loadTheme();
        const savedMode = ThemeStorage.loadMode();

        if (savedTheme) {
            ThemeState.currentTheme = savedTheme;
        } else {
            // Auto-detect dari system
            ThemeState.systemPrefersDark = SystemDetector.prefersDark();
            ThemeState.currentTheme = ThemeState.systemPrefersDark ? 'dark' : THEME.defaultTheme;
        }

        if (savedMode) {
            ThemeState.currentMode = savedMode;
        } else {
            ThemeState.currentMode = THEME.defaultMode;
        }

        console.log(`[Theme] Loaded: ${ThemeState.currentTheme} + ${ThemeState.currentMode}`);
        return {
            theme: ThemeState.currentTheme,
            mode: ThemeState.currentMode
        };
    },

    // ---- Apply ke DOM ----
    apply() {
        DOMApplier.apply(ThemeState.currentTheme, ThemeState.currentMode);
        Listeners.notify();
        EventBus.emit('theme:changed', {
            theme: ThemeState.currentTheme,
            mode: ThemeState.currentMode
        });
    },

    // ---- Initialize ----
    init() {
        this.load();
        this.apply();
        // Listen perubahan system preference
        SystemDetector.listen((prefersDark) => {
            // Hanya auto-switch kalau belum ada preferensi tersimpan
            if (!ThemeStorage.loadTheme()) {
                this.setTheme(prefersDark ? 'dark' : 'light');
            }
        });
        console.log('[Theme] Initialized');
    },

    // ---- Set Theme ----
    setTheme(theme) {
        if (!THEME.themes[theme]) {
            console.warn(`[Theme] Unknown theme: ${theme}`);
            return false;
        }
        if (ThemeState.currentTheme === theme) return true;

        ThemeState.currentTheme = theme;
        ThemeStorage.saveTheme(theme);
        this.apply();
        console.log(`[Theme] Theme set: ${theme}`);
        return true;
    },

    // ---- Set Mode ----
    setMode(mode) {
        if (!THEME.modes[mode]) {
            console.warn(`[Theme] Unknown mode: ${mode}`);
            return false;
        }
        if (ThemeState.currentMode === mode) return true;

        ThemeState.currentMode = mode;
        ThemeStorage.saveMode(mode);
        this.apply();
        console.log(`[Theme] Mode set: ${mode}`);
        return true;
    },

    // ---- Toggle Theme ----
    toggleTheme() {
        const newTheme = ThemeState.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    },

    // ---- Toggle Mode ----
    toggleMode() {
        const newMode = ThemeState.currentMode === 'genz' ? 'lansia' : 'genz';
        this.setMode(newMode);
        return newMode;
    },

    // ---- Getter ----
    getTheme() {
        return ThemeState.currentTheme;
    },

    getMode() {
        return ThemeState.currentMode;
    },

    getCurrent() {
        return {
            theme: ThemeState.currentTheme,
            mode: ThemeState.currentMode
        };
    },

    getThemeInfo() {
        return THEME.themes[ThemeState.currentTheme] || null;
    },

    getModeInfo() {
        return THEME.modes[ThemeState.currentMode] || null;
    },

    isDark() {
        return ThemeState.currentTheme === 'dark';
    },

    isLight() {
        return ThemeState.currentTheme === 'light';
    },

    isLansia() {
        return ThemeState.currentMode === 'lansia';
    },

    isGenz() {
        return ThemeState.currentMode === 'genz';
    },

    // ---- Reset ----
    reset() {
        ThemeState.currentTheme = THEME.defaultTheme;
        ThemeState.currentMode = THEME.defaultMode;
        ThemeStorage.clear();
        this.apply();
        console.log('[Theme] Reset to default');
    },

    // ---- Available options ----
    getAvailableThemes() {
        return Object.keys(THEME.themes).map(key => ({
            id: key,
            ...THEME.themes[key]
        }));
    },

    getAvailableModes() {
        return Object.keys(THEME.modes).map(key => ({
            id: key,
            ...THEME.modes[key]
        }));
    }
};

// ================================================================
// PART 8: KEYBOARD SHORTCUTS
// ================================================================

function setupKeyboardShortcuts() {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + T → Toggle Theme
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            ThemeController.toggleTheme();
        }
        // Ctrl + Shift + M → Toggle Mode
        if (e.ctrlKey && e.shiftKey && e.key === 'M') {
            e.preventDefault();
            ThemeController.toggleMode();
        }
    });

    console.log('[Theme] Keyboard shortcuts ready (Ctrl+Shift+T, Ctrl+Shift+M)');
}

// ================================================================
// PART 9: AUTO APPLY ON LOAD
// ================================================================

function autoApply() {
    if (typeof document === 'undefined') return;
    // Load & apply saat DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ThemeController.init();
            setupKeyboardShortcuts();
        });
    } else {
        ThemeController.init();
        setupKeyboardShortcuts();
    }
}

// ================================================================
// PART 10: EXPORT
// ================================================================

const ThemeModule = {
    // Controller
    ThemeController,
    controller: ThemeController,

    // Sub-modules (untuk advanced usage)
    State: ThemeState,
    Storage: ThemeStorage,
    DOM: DOMApplier,
    Listeners,
    System: SystemDetector,

    // Constants
    THEMES: THEME.themes,
    MODES: THEME.modes,

    // Shortcut functions (untuk kemudahan)
    setTheme: (t) => ThemeController.setTheme(t),
    setMode: (m) => ThemeController.setMode(m),
    toggleTheme: () => ThemeController.toggleTheme(),
    toggleMode: () => ThemeController.toggleMode(),
    getCurrent: () => ThemeController.getCurrent(),
    subscribe: (fn) => Listeners.subscribe(fn),

    // Init
    init: () => ThemeController.init(),
    autoApply
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Theme = ThemeController;
    window.ThemeModule = ThemeModule;
}

console.log('✅ theme.js loaded');

export default ThemeModule;
export { ThemeController, ThemeState, ThemeStorage, DOMApplier, Listeners, SystemDetector };

// ================================================================
// END OF THEME — 500+ BARIS
// ================================================================