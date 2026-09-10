 /* ================================================================
   CORE — Warung Atika Enterprise
   ================================================================
   Otak aplikasi: state, database, auth, theme, event bus, config
   Total: 800+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: CONFIG
// ================================================================

const CONFIG = {
    app: {
        name: 'Warung Atika Enterprise',
        version: '1.0.0',
        description: 'Point of Sale System'
    },
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
            schemaVersion: 'atika_schema_version'
        },
        schemaVersion: 1
    },
    auth: {
        salt: 'warung_atika_salt_2024',
        maxAttempts: 3,
        lockDuration: 30000
    },
    theme: {
        defaultTheme: 'light',
        defaultMode: 'genz',
        themes: ['light', 'dark'],
        modes: ['lansia', 'genz']
    },
    currency: {
        locale: 'id-ID',
        code: 'IDR',
        symbol: 'Rp'
    },
    categories: ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Lainnya']
};

// ================================================================
// PART 2: UTILITY HELPERS
// ================================================================

const Utils = {
    // Safe localStorage get
    storageGet(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (_) {
            return defaultValue;
        }
    },

    // Safe localStorage set
    storageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (_) {
            return false;
        }
    },

    // Safe localStorage remove
    storageRemove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (_) {
            return false;
        }
    },

    // Generate UUID v4
    generateUUID() {
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Format Rupiah
    formatRupiah(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return 'Rp 0';
        }
        return new Intl.NumberFormat(CONFIG.currency.locale, {
            style: 'currency',
            currency: CONFIG.currency.code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Format date
    formatDate(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    // Format time
    formatTime(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // Get date string YYYY-MM-DD
    getDateString(date = new Date()) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Hash SHA-256
    async hashSHA256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Deep clone
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    },

    // Debounce
    debounce(fn, delay = 300) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // Throttle
    throttle(fn, interval = 300) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= interval) {
                lastCall = now;
                fn.apply(this, args);
            }
        };
    }
};

// ================================================================
// PART 3: EVENT BUS (Pub/Sub)
// ================================================================

const EventBus = {
    events: new Map(),

    // Subscribe
    on(eventName, listener) {
        if (typeof listener !== 'function') {
            console.warn('[EventBus] Listener harus function');
            return () => {};
        }
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        this.events.get(eventName).add(listener);
        return () => this.off(eventName, listener);
    },

    // Subscribe once
    once(eventName, listener) {
        const wrapper = (...args) => {
            listener(...args);
            this.off(eventName, wrapper);
        };
        return this.on(eventName, wrapper);
    },

    // Unsubscribe
    off(eventName, listener) {
        const listeners = this.events.get(eventName);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.events.delete(eventName);
            }
        }
    },

    // Emit event
    emit(eventName, data = null) {
        const listeners = this.events.get(eventName);
        if (listeners) {
            const snapshot = Array.from(listeners);
            for (const listener of snapshot) {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`[EventBus] Error in ${eventName}:`, err);
                }
            }
        }
    },

    // Clear all
    clear() {
        this.events.clear();
    },

    // Count listeners
    count(eventName) {
        const listeners = this.events.get(eventName);
        return listeners ? listeners.size : 0;
    }
};

// ================================================================
// PART 4: STATE MANAGEMENT
// ================================================================

const State = (function() {
    // Private state
    let products = [];
    let cart = [];
    let transactions = [];
    let settings = {};

    // Private subscribers
    const subscribers = new Map();

    // ---- Subscribe ----
    function subscribe(eventType, listener) {
        if (typeof listener !== 'function') return () => {};
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, new Set());
        }
        subscribers.get(eventType).add(listener);
        return () => {
            const listeners = subscribers.get(eventType);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    subscribers.delete(eventType);
                }
            }
        };
    }

    // ---- Notify ----
    function notify(eventType, data = null) {
        const listeners = subscribers.get(eventType);
        if (listeners) {
            const snapshot = Array.from(listeners);
            for (const listener of snapshot) {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`[State] Subscriber error ${eventType}:`, err);
                }
            }
        }
        // Also emit via EventBus
        EventBus.emit(`state:${eventType}`, data);
    }

    // ---- Products ----
    function getProducts() {
        return Utils.deepClone(products);
    }

    function getProductByBarcode(barcode) {
        const product = products.find(p => p.barcode === barcode);
        return product ? Utils.deepClone(product) : null;
    }

    function setProducts(newProducts) {
        if (!Array.isArray(newProducts)) throw new Error('Products harus array');
        products = Utils.deepClone(newProducts);
        notify('products:updated', products);
        notify('changed', { type: 'products' });
    }

    function addProduct(product) {
        if (!product.barcode || !product.nama) {
            throw new Error('Barcode dan nama wajib diisi');
        }
        if (products.some(p => p.barcode === product.barcode)) {
            throw new Error(`Barcode ${product.barcode} sudah ada`);
        }
        const newProduct = Utils.deepClone(product);
        products.push(newProduct);
        notify('products:updated', products);
        notify('product:added', newProduct);
    }

    function updateProduct(product) {
        if (!product.barcode) throw new Error('Barcode wajib diisi');
        const index = products.findIndex(p => p.barcode === product.barcode);
        if (index === -1) throw new Error('Produk tidak ditemukan');
        products[index] = Utils.deepClone(product);
        notify('products:updated', products);
        notify('product:updated', products[index]);
    }

    function deleteProduct(barcode) {
        const index = products.findIndex(p => p.barcode === barcode);
        if (index === -1) throw new Error('Produk tidak ditemukan');
        const deleted = products[index];
        products.splice(index, 1);
        notify('products:updated', products);
        notify('product:deleted', deleted);
    }

    // ---- Cart ----
    function getCart() {
        return Utils.deepClone(cart);
    }

    function getCartTotal() {
        return cart.reduce((sum, item) => sum + (item.hargaJual * item.kuantitas), 0);
    }

    function getCartModalTotal() {
        return cart.reduce((sum, item) => sum + (item.hargaModal * item.kuantitas), 0);
    }

    function getCartItemCount() {
        return cart.reduce((sum, item) => sum + item.kuantitas, 0);
    }

    function addToCart(barcode, quantity = 1) {
        const product = products.find(p => p.barcode === barcode);
        if (!product) throw new Error(`Produk ${barcode} tidak ditemukan`);
        if (product.stok < quantity) {
            throw new Error(`Stok tidak cukup. Tersisa ${product.stok}`);
        }

        const existing = cart.find(item => item.barcode === barcode);
        if (existing) {
            const newQty = existing.kuantitas + quantity;
            if (product.stok < newQty) {
                throw new Error(`Stok tidak cukup. Tersisa ${product.stok}`);
            }
            existing.kuantitas = newQty;
            existing.subtotalJual = existing.hargaJual * newQty;
            existing.subtotalModal = existing.hargaModal * newQty;
        } else {
            cart.push({
                barcode: product.barcode,
                nama: product.nama,
                hargaJual: product.hargaJual,
                hargaModal: product.hargaModal,
                kuantitas: quantity,
                subtotalJual: product.hargaJual * quantity,
                subtotalModal: product.hargaModal * quantity
            });
        }
        notify('cart:updated', cart);
        notify('changed', { type: 'cart' });
    }

    function updateQuantity(barcode, delta) {
        const item = cart.find(item => item.barcode === barcode);
        if (!item) throw new Error('Item tidak ditemukan');
        const newQty = item.kuantitas + delta;
        if (newQty < 1) {
            removeFromCart(barcode);
            return;
        }
        const product = products.find(p => p.barcode === barcode);
        if (product && product.stok < newQty) {
            throw new Error(`Stok tidak cukup. Tersisa ${product.stok}`);
        }
        item.kuantitas = newQty;
        item.subtotalJual = item.hargaJual * newQty;
        item.subtotalModal = item.hargaModal * newQty;
        notify('cart:updated', cart);
        notify('changed', { type: 'cart' });
    }

    function removeFromCart(barcode) {
        const index = cart.findIndex(item => item.barcode === barcode);
        if (index === -1) throw new Error('Item tidak ditemukan');
        cart.splice(index, 1);
        notify('cart:updated', cart);
        notify('changed', { type: 'cart' });
    }

    function clearCart() {
        cart = [];
        notify('cart:updated', cart);
        notify('cart:cleared', null);
        notify('changed', { type: 'cart' });
    }

    // ---- Transactions ----
    function getTransactions() {
        return Utils.deepClone(transactions);
    }

    function addTransaction(transaction) {
        if (!transaction.id || !transaction.items) {
            throw new Error('Transaksi harus punya id dan items');
        }
        const newTx = Utils.deepClone(transaction);
        transactions.push(newTx);
        notify('transaction:added', newTx);
        notify('transactions:updated', transactions);
        notify('changed', { type: 'transactions' });
    }

    function setTransactions(newTx) {
        if (!Array.isArray(newTx)) throw new Error('Transactions harus array');
        transactions = Utils.deepClone(newTx);
        notify('transactions:updated', transactions);
        notify('changed', { type: 'transactions' });
    }

    // ---- Settings ----
    function getSetting(key, defaultValue = null) {
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    function getSettings() {
        return Utils.deepClone(settings);
    }

    function setSetting(key, value) {
        settings[key] = value;
        notify('settings:updated', settings);
        notify('changed', { type: 'settings' });
    }

    function setSettings(newSettings) {
        if (typeof newSettings !== 'object' || newSettings === null) {
            throw new Error('Settings harus object');
        }
        settings = Utils.deepClone(newSettings);
        notify('settings:updated', settings);
        notify('changed', { type: 'settings' });
    }

    // ---- Load/Export ----
    function loadFromDatabase(data = {}) {
        if (data.products) products = Utils.deepClone(data.products);
        if (data.cart) cart = Utils.deepClone(data.cart);
        if (data.transactions) transactions = Utils.deepClone(data.transactions);
        if (data.settings) settings = Utils.deepClone(data.settings);
        notify('loaded', { products, cart, transactions, settings });
        notify('products:updated', products);
        notify('cart:updated', cart);
        notify('transactions:updated', transactions);
        notify('settings:updated', settings);
    }

    function exportState() {
        return {
            products: Utils.deepClone(products),
            cart: Utils.deepClone(cart),
            transactions: Utils.deepClone(transactions),
            settings: Utils.deepClone(settings)
        };
    }

    function reset() {
        products = [];
        cart = [];
        transactions = [];
        settings = {};
        notify('reset', null);
        notify('products:updated', products);
        notify('cart:updated', cart);
        notify('transactions:updated', transactions);
        notify('settings:updated', settings);
    }

    // ---- Public API ----
    return {
        subscribe,
        getProducts,
        getProductByBarcode,
        setProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        getCart,
        getCartTotal,
        getCartModalTotal,
        getCartItemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTransactions,
        addTransaction,
        setTransactions,
        getSetting,
        getSettings,
        setSetting,
        setSettings,
        loadFromDatabase,
        exportState,
        reset
    };
})();

// ================================================================
// PART 5: DATABASE (localStorage wrapper)
// ================================================================

const Database = (function() {
    let initialized = false;

    // Seed data
    const SEED_PRODUCTS = [
        { barcode: 'ATIKA000001', nama: 'Indomie Goreng', hargaJual: 3500, hargaModal: 2800, stok: 50, minStok: 10, kategori: 'Makanan' },
        { barcode: 'ATIKA000002', nama: 'Aqua 600ml', hargaJual: 3000, hargaModal: 2200, stok: 40, minStok: 8, kategori: 'Minuman' },
        { barcode: 'ATIKA000003', nama: 'Chitato 68g', hargaJual: 8000, hargaModal: 6500, stok: 30, minStok: 5, kategori: 'Snack' },
        { barcode: 'ATIKA000004', nama: 'Sampoerna Mild 12', hargaJual: 22000, hargaModal: 19500, stok: 25, minStok: 10, kategori: 'Rokok' },
        { barcode: 'ATIKA000005', nama: 'Teh Botol Sosro 350ml', hargaJual: 4500, hargaModal: 3500, stok: 35, minStok: 7, kategori: 'Minuman' },
        { barcode: 'ATIKA000006', nama: 'Roti Tawar Sari Roti', hargaJual: 12000, hargaModal: 9500, stok: 15, minStok: 3, kategori: 'Makanan' },
        { barcode: 'ATIKA000007', nama: 'Pocari Sweat 500ml', hargaJual: 7000, hargaModal: 5500, stok: 20, minStok: 5, kategori: 'Minuman' },
        { barcode: 'ATIKA000008', nama: 'Oreo 133g', hargaJual: 10000, hargaModal: 8200, stok: 25, minStok: 5, kategori: 'Snack' },
        { barcode: 'ATIKA000009', nama: 'Dunhill 12', hargaJual: 28000, hargaModal: 25000, stok: 20, minStok: 8, kategori: 'Rokok' },
        { barcode: 'ATIKA000010', nama: 'Mie Sedap Goreng', hargaJual: 3000, hargaModal: 2300, stok: 45, minStok: 10, kategori: 'Makanan' }
    ];

    function initialize() {
        if (initialized) return;
        const version = Utils.storageGet(CONFIG.storage.keys.schemaVersion, 0);
        if (version === 0) {
            seedDatabase();
            console.log('📦 Database seeded');
        }
        loadAllToState();
        initialized = true;
        console.log('📦 Database initialized');
    }

    function seedDatabase() {
        Utils.storageSet(CONFIG.storage.keys.products, SEED_PRODUCTS);
        Utils.storageSet(CONFIG.storage.keys.transactions, []);
        Utils.storageSet(CONFIG.storage.keys.cart, []);
        Utils.storageSet(CONFIG.storage.keys.queue, []);
        Utils.storageSet(CONFIG.storage.keys.settings, {});
        Utils.storageSet(CONFIG.storage.keys.schemaVersion, CONFIG.storage.schemaVersion);
    }

    function loadAllToState() {
        const products = Utils.storageGet(CONFIG.storage.keys.products, []);
        const transactions = Utils.storageGet(CONFIG.storage.keys.transactions, []);
        const cart = Utils.storageGet(CONFIG.storage.keys.cart, []);
        const settings = Utils.storageGet(CONFIG.storage.keys.settings, {});
        State.loadFromDatabase({ products, transactions, cart, settings });
        console.log(`📊 Loaded: ${products.length} produk, ${transactions.length} transaksi`);
    }

    function saveProducts(products) {
        Utils.storageSet(CONFIG.storage.keys.products, products);
    }

    function saveTransactions(transactions) {
        Utils.storageSet(CONFIG.storage.keys.transactions, transactions);
    }

    function saveCart(cart) {
        Utils.storageSet(CONFIG.storage.keys.cart, cart);
    }

    function saveSettings(settings) {
        Utils.storageSet(CONFIG.storage.keys.settings, settings);
    }

    function saveAll() {
        const state = State.exportState();
        saveProducts(state.products);
        saveTransactions(state.transactions);
        saveCart(state.cart);
        saveSettings(state.settings);
    }

    function getQueue() {
        return Utils.storageGet(CONFIG.storage.keys.queue, []);
    }

    function updateQueue(queue) {
        Utils.storageSet(CONFIG.storage.keys.queue, queue);
    }

    function addToQueue(item) {
        const queue = getQueue();
        queue.push({ ...item, queuedAt: Date.now(), retries: 0 });
        updateQueue(queue);
    }

    function removeFromQueue(id) {
        const queue = getQueue().filter(item => item.id !== id);
        updateQueue(queue);
    }

    function exportAll() {
        return {
            products: Utils.storageGet(CONFIG.storage.keys.products, []),
            transactions: Utils.storageGet(CONFIG.storage.keys.transactions, []),
            cart: Utils.storageGet(CONFIG.storage.keys.cart, []),
            queue: Utils.storageGet(CONFIG.storage.keys.queue, []),
            settings: Utils.storageGet(CONFIG.storage.keys.settings, {}),
            schemaVersion: Utils.storageGet(CONFIG.storage.keys.schemaVersion, 0)
        };
    }

    function clearAll() {
        Object.values(CONFIG.storage.keys).forEach(key => {
            Utils.storageRemove(key);
        });
        Utils.storageSet(CONFIG.storage.keys.schemaVersion, CONFIG.storage.schemaVersion);
        State.reset();
        console.log('🗑️ Database cleared');
    }

    function resetAll() {
        Object.values(CONFIG.storage.keys).forEach(key => {
            Utils.storageRemove(key);
        });
        seedDatabase();
        loadAllToState();
        console.log('🗑️ Database reset');
    }

    return {
        initialize,
        saveProducts,
        saveTransactions,
        saveCart,
        saveSettings,
        saveAll,
        getQueue,
        updateQueue,
        addToQueue,
        removeFromQueue,
        exportAll,
        clearAll,
        resetAll,
        loadAllToState
    };
})();

// ================================================================
// PART 6: THEME MANAGER
// ================================================================

const ThemeManager = (function() {
    let currentTheme = CONFIG.theme.defaultTheme;
    let currentMode = CONFIG.theme.defaultMode;

    function load() {
        const saved = Utils.storageGet(CONFIG.storage.keys.theme, null);
        const savedMode = Utils.storageGet(CONFIG.storage.keys.mode, null);
        if (saved && CONFIG.theme.themes.includes(saved)) currentTheme = saved;
        if (savedMode && CONFIG.theme.modes.includes(savedMode)) currentMode = savedMode;
    }

    function apply() {
        const root = document.documentElement;
        root.setAttribute('data-theme', currentTheme);
        root.setAttribute('data-mode', currentMode);
        EventBus.emit('theme:changed', { theme: currentTheme, mode: currentMode });
    }

    function setTheme(theme) {
        if (!CONFIG.theme.themes.includes(theme)) return;
        currentTheme = theme;
        Utils.storageSet(CONFIG.storage.keys.theme, theme);
        apply();
    }

    function setMode(mode) {
        if (!CONFIG.theme.modes.includes(mode)) return;
        currentMode = mode;
        Utils.storageSet(CONFIG.storage.keys.mode, mode);
        apply();
    }

    function toggleTheme() {
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
        return currentTheme;
    }

    function toggleMode() {
        setMode(currentMode === 'genz' ? 'lansia' : 'genz');
        return currentMode;
    }

    function getTheme() { return currentTheme; }
    function getMode() { return currentMode; }
    function getCurrent() { return { theme: currentTheme, mode: currentMode }; }

    return {
        load,
        apply,
        setTheme,
        setMode,
        toggleTheme,
        toggleMode,
        getTheme,
        getMode,
        getCurrent
    };
})();

// ================================================================
// PART 7: AUTH (PIN authentication)
// ================================================================

const Auth = (function() {
    let attempts = 0;
    let lockUntil = null;

    function loadState() {
        attempts = Utils.storageGet(CONFIG.storage.keys.attempts, 0);
        lockUntil = Utils.storageGet(CONFIG.storage.keys.lockUntil, null);
        if (lockUntil && Date.now() > lockUntil) resetAttempts();
    }

    function saveAttempts() {
        Utils.storageSet(CONFIG.storage.keys.attempts, attempts);
    }

    function saveLock() {
        Utils.storageSet(CONFIG.storage.keys.lockUntil, lockUntil);
    }

    function resetAttempts() {
        attempts = 0;
        lockUntil = null;
        Utils.storageRemove(CONFIG.storage.keys.attempts);
        Utils.storageRemove(CONFIG.storage.keys.lockUntil);
    }

    function isLocked() {
        return lockUntil && Date.now() < lockUntil;
    }

    function getLockRemaining() {
        return lockUntil ? Math.max(0, lockUntil - Date.now()) : 0;
    }

    async function setPIN(pin) {
        if (!pin || pin.length < 4 || pin.length > 6) {
            throw new Error('PIN harus 4-6 digit');
        }
        if (!/^\d+$/.test(pin)) {
            throw new Error('PIN hanya angka');
        }
        const hash = await Utils.hashSHA256(pin + CONFIG.auth.salt);
        Utils.storageSet(CONFIG.storage.keys.pinHash, hash);
        Utils.storageSet(CONFIG.storage.keys.pinSet, true);
        resetAttempts();
    }

    async function verifyPIN(pin) {
        if (isLocked()) {
            const remaining = Math.ceil(getLockRemaining() / 1000);
            throw new Error(`Terkunci. Coba lagi dalam ${remaining} detik`);
        }

        const storedHash = Utils.storageGet(CONFIG.storage.keys.pinHash, null);
        if (!storedHash) throw new Error('PIN belum diset');

        const enteredHash = await Utils.hashSHA256(pin + CONFIG.auth.salt);

        if (storedHash === enteredHash) {
            resetAttempts();
            return { success: true };
        }

        attempts++;
        saveAttempts();

        if (attempts >= CONFIG.auth.maxAttempts) {
            lockUntil = Date.now() + CONFIG.auth.lockDuration;
            saveLock();
            throw new Error(`Terlalu banyak percobaan. Terkunci ${CONFIG.auth.lockDuration / 1000} detik`);
        }

        const remaining = CONFIG.auth.maxAttempts - attempts;
        throw new Error(`PIN salah. Sisa: ${remaining}`);
    }

    function isPINSet() {
        return Utils.storageGet(CONFIG.storage.keys.pinSet, false) === true;
    }

    function createSession() {
        const session = {
            id: Utils.generateUUID(),
            authenticated: true,
            loginTime: Date.now()
        };
        Utils.storageSet(CONFIG.storage.keys.session, session);
        return session;
    }

    function getSession() {
        return Utils.storageGet(CONFIG.storage.keys.session, null);
    }

    function isAuthenticated() {
        const session = getSession();
        return session && session.authenticated === true;
    }

    function logout() {
        Utils.storageRemove(CONFIG.storage.keys.session);
        window.location.href = 'login.html';
    }

    function getAttempts() { return attempts; }
    function getRemainingAttempts() { return Math.max(0, CONFIG.auth.maxAttempts - attempts); }

    return {
        loadState,
        setPIN,
        verifyPIN,
        isPINSet,
        createSession,
        getSession,
        isAuthenticated,
        logout,
        isLocked,
        getLockRemaining,
        getAttempts,
        getRemainingAttempts,
        resetAttempts
    };
})();

// ================================================================
// PART 8: AUTO-SAVE SUBSCRIPTION
// ================================================================

State.subscribe('changed', () => {
    try {
        Database.saveAll();
    } catch (err) {
        console.error('[AutoSave] Failed:', err);
    }
});

State.subscribe('cart:updated', (cart) => {
    try { Database.saveCart(cart); } catch (_) {}
});

State.subscribe('transaction:added', () => {
    try { Database.saveTransactions(State.getTransactions()); } catch (_) {}
});

// ================================================================
// PART 9: EXPORT (Global API)
// ================================================================

const Core = {
    CONFIG,
    Utils,
    EventBus,
    State,
    Database,
    ThemeManager,
    Auth
};

// Expose ke window (untuk debugging & modul lain)
if (typeof window !== 'undefined') {
    window.Core = Core;
    window.CONFIG = CONFIG;
    window.Utils = Utils;
    window.EventBus = EventBus;
    window.State = State;
    window.Database = Database;
    window.ThemeManager = ThemeManager;
    window.Auth = Auth;
}

console.log('✅ Core.js loaded — Warung Atika Enterprise v' + CONFIG.app.version);

// ================================================================
// END OF CORE — 800+ BARIS
// ================================================================
// ================================================================
// EXPORT
// ================================================================

const CoreModule = {
    CONFIG,
    Utils,
    EventBus,
    State,
    Database,
    ThemeManager,
    Auth
};

export default CoreModule;
export { CONFIG, Utils, EventBus, State, Database, ThemeManager, Auth };