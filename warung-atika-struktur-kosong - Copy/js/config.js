 /* ================================================================
   CONFIG — Warung Atika Enterprise
   ================================================================
   Konfigurasi Global:
   - App info
   - Storage keys
   - Auth settings
   - Theme settings
   - Currency settings
   - API endpoints
   - Feature flags
   Total: 400+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: MAIN CONFIG
// ================================================================

const CONFIG = {
    // ---- App Info ----
    app: {
        name: 'Warung Atika Enterprise',
        shortName: 'Warung Atika',
        version: '1.0.0',
        description: 'Point of Sale System untuk Warung Atika',
        author: 'Warung Atika',
        year: new Date().getFullYear()
    },

    // ---- Store Info ----
    store: {
        name: 'WARUNG ATIKA ENTERPRISE',
        address: 'Jl. Raya No. 123, Jakarta',
        phone: '0812-3456-7890',
        email: 'info@warungatika.com',
        footer: 'Terima kasih telah berbelanja!'
    },

    // ---- Storage Keys ----
    storage: {
        prefix: 'atika_',
        keys: {
            products: 'atika_products',
            transactions: 'atika_transactions',
            cart: 'atika_cart',
            queue: 'atika_queue',
            settings: 'atika_settings',
            pinHash: 'atika_pin_hash',
            pinSet: 'atika_pin_set',
            attempts: 'atika_attempts',
            lockUntil: 'atika_lock_until',
            session: 'atika_session',
            theme: 'atika_theme',
            mode: 'atika_mode',
            deviceId: 'atika_device_id',
            replenishmentLedger: 'atika_replenishment_ledger',
            stockAudit: 'atika_stock_audit',
            schemaVersion: 'atika_schema_version'
        },
        schemaVersion: 1
    },

    // ---- Auth Settings ----
    auth: {
        salt: 'warung_atika_salt_2024',
        maxAttempts: 3,
        lockDuration: 30000,       // 30 detik
        sessionDuration: 24 * 60 * 60 * 1000, // 24 jam
        pinMinLength: 4,
        pinMaxLength: 6
    },

    // ---- Theme Settings ----
    theme: {
        defaultTheme: 'light',
        defaultMode: 'genz',
        themes: ['light', 'dark'],
        modes: ['lansia', 'genz']
    },

    // ---- Currency Settings ----
    currency: {
        locale: 'id-ID',
        code: 'IDR',
        symbol: 'Rp',
        decimals: 0
    },

    // ---- Product Settings ----
    product: {
        categories: ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Lainnya'],
        defaultCategory: 'Lainnya',
        barcodePrefix: 'ATIKA',
        barcodeLength: 6,
        minStockDefault: 5,
        maxStockDefault: 999999
    },

    // ---- Cart Settings ----
    cart: {
        maxItems: 100,
        maxQuantityPerItem: 999,
        minQuantity: 1
    },

    // ---- Sync Settings ----
    sync: {
        enabled: true,
        maxRetries: 3,
        baseRetryDelay: 1000,     // 1 detik
        maxRetryDelay: 60000,     // 60 detik
        syncInterval: 15000,      // 15 detik
        healthCheckInterval: 5000,// 5 detik
        requestTimeout: 10000     // 10 detik
    },

    // ---- API Settings ----
    api: {
        baseUrl: '',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    },

    // ---- Supabase Settings ----
    supabase: {
        enabled: false,
        url: '',
        key: ''
    },

    // ---- Payment Settings ----
    payment: {
        methods: ['cash', 'qris'],
        defaultMethod: 'cash',
        cashShortcuts: [
            { label: 'Uang Pas', value: 'exact' },
            { label: 'Rp 10.000', value: 10000 },
            { label: 'Rp 20.000', value: 20000 },
            { label: 'Rp 50.000', value: 50000 },
            { label: 'Rp 100.000', value: 100000 }
        ]
    },

    // ---- QRIS Settings ----
    qris: {
        enabled: true,
        merchantName: 'BCA',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSize: 5 * 1024 * 1024
    },

    // ---- Print Settings ----
    print: {
        paperSizes: {
            thermal58: { width: '58mm', fontSize: '9pt' },
            thermal80: { width: '80mm', fontSize: '10pt' },
            a4: { width: '210mm', fontSize: '12pt' }
        },
        defaultPaper: 'thermal80',
        autoPrint: true
    },

    // ---- Audio Settings ----
    audio: {
        enabled: true,
        volume: 0.5,
        beepFrequency: 1200,
        warningFrequency: 800,
        successFrequency: 1600,
        errorFrequency: 400
    },

    // ---- UI Settings ----
    ui: {
        animationsEnabled: true,
        toastDuration: 3000,
        modalTransition: 300,
        routeTransition: 500,
        debounceDelay: 300,
        throttleInterval: 300
    },

    // ---- Pagination ----
    pagination: {
        defaultPerPage: 20,
        perPageOptions: [10, 20, 50, 100],
        maxPerPage: 100
    },

    // ---- Analytics Settings ----
    analytics: {
        enabled: true,
        topProductsLimit: 10,
        maxTransactionsPerReport: 1000
    },

    // ---- Feature Flags ----
    features: {
        offlineMode: true,
        qrisPayment: true,
        barcodeScanner: true,
        printReceipt: true,
        multiDevice: false,
        cloudSync: false,
        autoBackup: false,
        darkMode: true,
        lansiaMode: true,
        genzMode: true,
        excelExport: false,
        pdfExport: false
    },

    // ---- Environment ----
    env: {
        isDevelopment: typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1'),
        isProduction: typeof window !== 'undefined' && 
            window.location.protocol === 'https:',
        isFile: typeof window !== 'undefined' && 
            window.location.protocol === 'file:',
        isOnline: typeof navigator !== 'undefined' && navigator.onLine
    },

    // ---- Debug ----
    debug: {
        enabled: true,
        logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error' | 'none'
        logToConsole: true,
        logToStorage: false,
        showErrors: true
    }
};

// ================================================================
// PART 2: CONFIG VALIDATION
// ================================================================

const ConfigValidator = {
    // Validasi config
    validate(config) {
        const errors = [];

        // Cek app info
        if (!config.app.name) errors.push('App name wajib diisi');
        if (!config.app.version) errors.push('App version wajib diisi');

        // Cek auth
        if (config.auth.maxAttempts < 1) errors.push('maxAttempts minimal 1');
        if (config.auth.lockDuration < 1000) errors.push('lockDuration minimal 1000ms');

        // Cek theme
        if (!config.theme.themes.includes(config.theme.defaultTheme)) {
            errors.push('defaultTheme tidak valid');
        }
        if (!config.theme.modes.includes(config.theme.defaultMode)) {
            errors.push('defaultMode tidak valid');
        }

        // Cek categories
        if (!Array.isArray(config.product.categories) || config.product.categories.length === 0) {
            errors.push('categories wajib array dan tidak kosong');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    // Fix config (fallback ke default kalau invalid)
    fix(config) {
        const defaults = this.getDefaults();

        // Fix theme
        if (!config.theme.themes.includes(config.theme.defaultTheme)) {
            config.theme.defaultTheme = defaults.theme.defaultTheme;
        }
        if (!config.theme.modes.includes(config.theme.defaultMode)) {
            config.theme.defaultMode = defaults.theme.defaultMode;
        }

        // Fix categories
        if (!Array.isArray(config.product.categories) || config.product.categories.length === 0) {
            config.product.categories = defaults.product.categories;
        }

        return config;
    },

    // Get default config
    getDefaults() {
        return {
            theme: {
                defaultTheme: 'light',
                defaultMode: 'genz'
            },
            product: {
                categories: ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Lainnya']
            }
        };
    }
};

// ================================================================
// PART 3: ENVIRONMENT DETECTOR
// ================================================================

const EnvDetector = {
    // Cek environment
    getInfo() {
        if (typeof window === 'undefined') {
            return {
                isDevelopment: false,
                isProduction: false,
                isFile: false,
                isOnline: false,
                hostname: 'unknown',
                protocol: 'unknown'
            };
        }

        return {
            isDevelopment: window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1',
            isProduction: window.location.protocol === 'https:',
            isFile: window.location.protocol === 'file:',
            isOnline: navigator.onLine,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
        };
    },

    // Cek browser support
    getBrowserSupport() {
        if (typeof window === 'undefined') return {};

        return {
            localStorage: (() => {
                try {
                    localStorage.setItem('__test__', '1');
                    localStorage.removeItem('__test__');
                    return true;
                } catch (_) {
                    return false;
                }
            })(),
            sessionStorage: (() => {
                try {
                    sessionStorage.setItem('__test__', '1');
                    sessionStorage.removeItem('__test__');
                    return true;
                } catch (_) {
                    return false;
                }
            })(),
            crypto: !!(window.crypto && window.crypto.subtle),
            mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            notifications: 'Notification' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            fileReader: typeof FileReader !== 'undefined',
            blob: typeof Blob !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            promise: typeof Promise !== 'undefined',
            intersectionObserver: 'IntersectionObserver' in window,
            resizeObserver: 'ResizeObserver' in window,
            matchMedia: typeof window.matchMedia !== 'undefined'
        };
    }
};

// ================================================================
// PART 4: CONFIG MANAGER (Runtime)
// ================================================================

const ConfigManager = {
    current: null,

    // Init
    init() {
        // Clone default config
        this.current = JSON.parse(JSON.stringify(CONFIG));

        // Load dari localStorage (kalau ada override)
        try {
            const saved = localStorage.getItem('atika_config');
            if (saved) {
                const overrides = JSON.parse(saved);
                this.current = this.merge(this.current, overrides);
            }
        } catch (_) {
            // Ignore
        }

        // Validasi
        const validation = ConfigValidator.validate(this.current);
        if (!validation.valid) {
            console.warn('[Config] Validation errors:', validation.errors);
            this.current = ConfigValidator.fix(this.current);
        }

        // Update env
        this.current.env = EnvDetector.getInfo();

        console.log('⚙️ Config loaded:', this.current.app.name, 'v' + this.current.app.version);
        return this.current;
    },

    // Get config
    get(key = null) {
        if (!this.current) this.init();
        if (key === null) return this.current;

        // Support nested key: "app.name"
        const parts = key.split('.');
        let value = this.current;
        for (const part of parts) {
            if (value === undefined || value === null) return undefined;
            value = value[part];
        }
        return value;
    },

    // Set config (runtime)
    set(key, value) {
        if (!this.current) this.init();
        const parts = key.split('.');
        let target = this.current;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
    },

    // Save config (persist)
    save() {
        if (!this.current) return false;
        try {
            localStorage.setItem('atika_config', JSON.stringify(this.current));
            return true;
        } catch (_) {
            return false;
        }
    },

    // Reset config
    reset() {
        try {
            localStorage.removeItem('atika_config');
        } catch (_) {}
        return this.init();
    },

    // Merge objek (deep)
    merge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.merge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
};

// ================================================================
// PART 5: FEATURE FLAGS
// ================================================================

const Features = {
    // Cek apakah fitur aktif
    isEnabled(featureName) {
        const config = ConfigManager.get('features');
        return config && config[featureName] === true;
    },

    // Enable fitur
    enable(featureName) {
        ConfigManager.set(`features.${featureName}`, true);
    },

    // Disable fitur
    disable(featureName) {
        ConfigManager.set(`features.${featureName}`, false);
    },

    // Get semua fitur
    getAll() {
        return ConfigManager.get('features') || {};
    },

    // Cek banyak fitur sekaligus
    check(features) {
        const result = {};
        for (const f of features) {
            result[f] = this.isEnabled(f);
        }
        return result;
    }
};

// ================================================================
// PART 6: DEBUG LOGGER
// ================================================================

const Logger = {
    // Log level
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        none: 4
    },

    // Cek apakah level aktif
    shouldLog(level) {
        const config = ConfigManager.get('debug');
        if (!config || !config.enabled) return false;
        const currentLevel = this.levels[config.logLevel] ?? 1;
        const messageLevel = this.levels[level] ?? 1;
        return messageLevel >= currentLevel;
    },

    // Log
    log(level, ...args) {
        if (!this.shouldLog(level)) return;
        const config = ConfigManager.get('debug');
        if (!config.logToConsole) return;

        const prefix = `[${level.toUpperCase()}]`;
        switch (level) {
            case 'debug':
                console.debug(prefix, ...args);
                break;
            case 'info':
                console.info(prefix, ...args);
                break;
            case 'warn':
                console.warn(prefix, ...args);
                break;
            case 'error':
                console.error(prefix, ...args);
                break;
        }
    },

    debug(...args) { this.log('debug', ...args); },
    info(...args) { this.log('info', ...args); },
    warn(...args) { this.log('warn', ...args); },
    error(...args) { this.log('error', ...args); }
};

// ================================================================
// PART 7: INITIALIZATION
// ================================================================

function initialize() {
    ConfigManager.init();
    console.log('✅ config.js loaded');
    return ConfigManager.current;
}

// ================================================================
// PART 8: EXPORT
// ================================================================

const ConfigModule = {
    CONFIG,
    ConfigManager,
    ConfigValidator,
    EnvDetector,
    Features,
    Logger,
    initialize,

    // Shortcuts
    get: (key) => ConfigManager.get(key),
    set: (key, val) => ConfigManager.set(key, val),
    save: () => ConfigManager.save(),
    reset: () => ConfigManager.reset()
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.ConfigManager = ConfigManager;
    window.ConfigModule = ConfigModule;
    window.Features = Features;
    window.Logger = Logger;
}

console.log('✅ config.js loaded');

export default ConfigModule;
export { CONFIG, ConfigManager, ConfigValidator, EnvDetector, Features, Logger, initialize };

// ================================================================
// END OF CONFIG — 400+ BARIS
// ================================================================