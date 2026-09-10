 /* ================================================================
   DATABASE — Warung Atika Enterprise
   ================================================================
   Unified Database Access Layer:
   - localStorage wrapper (primary)
   - Supabase abstraction (future)
   - Schema validation
   - Versioning & migration
   - Transaction persistence
   - Inventory persistence
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from './core.js';

const { CONFIG, Utils, EventBus, State } = Core;

// ================================================================
// PART 1: DATABASE CONSTANTS
// ================================================================

const DB = {
    version: 1,
    keys: CONFIG.storage.keys,
    // Table registry
    tables: {
        products: { key: CONFIG.storage.keys.products, default: [] },
        transactions: { key: CONFIG.storage.keys.transactions, default: [] },
        cart: { key: CONFIG.storage.keys.cart, default: [] },
        queue: { key: CONFIG.storage.keys.queue, default: [] },
        settings: { key: CONFIG.storage.keys.settings, default: {} }
    },
    // Supabase config (future)
    supabase: {
        enabled: false,
        url: null,
        key: null,
        client: null
    }
};

// ================================================================
// PART 2: LOW-LEVEL CRUD (localStorage)
// ================================================================

const Storage = {
    // ---- Get ----
    get(key, defaultValue = null) {
        return Utils.storageGet(key, defaultValue);
    },

    // ---- Set ----
    set(key, value) {
        return Utils.storageSet(key, value);
    },

    // ---- Remove ----
    remove(key) {
        return Utils.storageRemove(key);
    },

    // ---- Has ----
    has(key) {
        return localStorage.getItem(key) !== null;
    },

    // ---- Clear All (dengan prefix) ----
    clearAll() {
        const prefix = CONFIG.storage.prefix;
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(k => localStorage.removeItem(k));
        return keys.length;
    },

    // ---- Get All Keys ----
    getAllKeys() {
        const prefix = CONFIG.storage.prefix;
        return Object.keys(localStorage).filter(k => k.startsWith(prefix));
    },

    // ---- Size (bytes) ----
    getSize() {
        let total = 0;
        const prefix = CONFIG.storage.prefix;
        for (const key in localStorage) {
            if (key.startsWith(prefix)) {
                total += (localStorage[key] || '').length;
            }
        }
        return total;
    },

    // ---- Available Space Estimate ----
    getAvailableSpace() {
        // localStorage biasanya 5-10 MB
        const used = this.getSize();
        const limit = 5 * 1024 * 1024; // 5 MB
        return {
            used,
            limit,
            remaining: limit - used,
            percentage: (used / limit) * 100
        };
    }
};

// ================================================================
// PART 3: TABLE OPERATIONS (Generic CRUD)
// ================================================================

const Table = {
    // ---- Insert (tambah row) ----
    insert(tableName, row) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);

        const data = Storage.get(table.key, table.default);
        if (!Array.isArray(data)) throw new Error(`${tableName} bukan array`);

        if (!row.id) row.id = Utils.generateUUID();
        if (!row.createdAt) row.createdAt = Date.now();

        data.push(row);
        Storage.set(table.key, data);
        EventBus.emit(`db:${tableName}:insert`, row);
        return row;
    },

    // ---- Find By ID ----
    findById(tableName, id) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        const data = Storage.get(table.key, table.default);
        return data.find(row => row.id === id) || null;
    },

    // ---- Find By Field ----
    findBy(tableName, field, value) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        const data = Storage.get(table.key, table.default);
        return data.find(row => row[field] === value) || null;
    },

    // ---- Find All ----
    findAll(tableName) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        return Storage.get(table.key, table.default);
    },

    // ---- Filter ----
    filter(tableName, predicate) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        const data = Storage.get(table.key, table.default);
        return data.filter(predicate);
    },

    // ---- Update ----
    update(tableName, id, updates) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        const data = Storage.get(table.key, table.default);
        const index = data.findIndex(row => row.id === id);
        if (index === -1) throw new Error(`Row ${id} tidak ditemukan`);

        data[index] = { ...data[index], ...updates, updatedAt: Date.now() };
        Storage.set(table.key, data);
        EventBus.emit(`db:${tableName}:update`, data[index]);
        return data[index];
    },

    // ---- Delete ----
    delete(tableName, id) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        const data = Storage.get(table.key, table.default);
        const index = data.findIndex(row => row.id === id);
        if (index === -1) throw new Error(`Row ${id} tidak ditemukan`);

        const deleted = data.splice(index, 1)[0];
        Storage.set(table.key, data);
        EventBus.emit(`db:${tableName}:delete`, deleted);
        return deleted;
    },

    // ---- Count ----
    count(tableName) {
        return this.findAll(tableName).length;
    },

    // ---- Clear ----
    clear(tableName) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        Storage.set(table.key, table.default);
        EventBus.emit(`db:${tableName}:clear`, null);
    },

    // ---- Replace All ----
    replaceAll(tableName, rows) {
        const table = DB.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} tidak ada`);
        if (!Array.isArray(rows)) throw new Error('Data harus array');
        Storage.set(table.key, rows);
        EventBus.emit(`db:${tableName}:replace`, rows);
    }
};

// ================================================================
// PART 4: SPECIFIC TABLE OPERATIONS
// ================================================================

const ProductsDB = {
    getAll() {
        return Storage.get(DB.keys.products, []);
    },

    getByBarcode(barcode) {
        return this.getAll().find(p => p.barcode === barcode) || null;
    },

    save(products) {
        if (!Array.isArray(products)) throw new Error('Products harus array');
        Storage.set(DB.keys.products, products);
        EventBus.emit('db:products:saved', products);
    },

    add(product) {
        const products = this.getAll();
        if (products.some(p => p.barcode === product.barcode)) {
            throw new Error(`Barcode ${product.barcode} sudah ada`);
        }
        products.push(product);
        this.save(products);
        return product;
    },

    update(barcode, updates) {
        const products = this.getAll();
        const index = products.findIndex(p => p.barcode === barcode);
        if (index === -1) throw new Error(`Produk ${barcode} tidak ditemukan`);
        products[index] = { ...products[index], ...updates };
        this.save(products);
        return products[index];
    },

    delete(barcode) {
        const products = this.getAll();
        const filtered = products.filter(p => p.barcode !== barcode);
        if (filtered.length === products.length) {
            throw new Error(`Produk ${barcode} tidak ditemukan`);
        }
        this.save(filtered);
        return true;
    },

    count() {
        return this.getAll().length;
    },

    search(keyword) {
        if (!keyword) return this.getAll();
        const lower = keyword.toLowerCase();
        return this.getAll().filter(p =>
            p.nama.toLowerCase().includes(lower) ||
            p.barcode.includes(keyword) ||
            (p.kategori && p.kategori.toLowerCase().includes(lower))
        );
    },

    getLowStock() {
        return this.getAll().filter(p => p.stok < p.minStok);
    },

    getByCategory(kategori) {
        if (!kategori || kategori === 'Semua') return this.getAll();
        return this.getAll().filter(p => p.kategori === kategori);
    }
};

const TransactionsDB = {
    getAll() {
        return Storage.get(DB.keys.transactions, []);
    },

    save(transactions) {
        if (!Array.isArray(transactions)) throw new Error('Transactions harus array');
        Storage.set(DB.keys.transactions, transactions);
        EventBus.emit('db:transactions:saved', transactions);
    },

    add(transaction) {
        const transactions = this.getAll();
        if (!transaction.id) transaction.id = Utils.generateUUID();
        transactions.push(transaction);
        this.save(transactions);
        return transaction;
    },

    getById(id) {
        return this.getAll().find(t => t.id === id) || null;
    },

    getByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return this.getAll().filter(t => t.timestamp >= start && t.timestamp <= end);
    },

    getToday() {
        const today = Utils.getDateString();
        const start = new Date(today).getTime();
        const end = start + (24 * 60 * 60 * 1000);
        return this.getAll().filter(t => t.timestamp >= start && t.timestamp < end);
    },

    count() {
        return this.getAll().length;
    },

    clear() {
        Storage.set(DB.keys.transactions, []);
    }
};

const CartDB = {
    get() {
        return Storage.get(DB.keys.cart, []);
    },

    save(cart) {
        if (!Array.isArray(cart)) throw new Error('Cart harus array');
        Storage.set(DB.keys.cart, cart);
        EventBus.emit('db:cart:saved', cart);
    },

    clear() {
        Storage.set(DB.keys.cart, []);
    }
};

const SettingsDB = {
    get() {
        return Storage.get(DB.keys.settings, {});
    },

    getByKey(key, defaultValue = null) {
        const settings = this.get();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    },

    save(settings) {
        if (typeof settings !== 'object') throw new Error('Settings harus object');
        Storage.set(DB.keys.settings, settings);
        EventBus.emit('db:settings:saved', settings);
    },

    set(key, value) {
        const settings = this.get();
        settings[key] = value;
        this.save(settings);
        return settings;
    }
};

const QueueDB = {
    getAll() {
        return Storage.get(DB.keys.queue, []);
    },

    save(queue) {
        if (!Array.isArray(queue)) throw new Error('Queue harus array');
        Storage.set(DB.keys.queue, queue);
    },

    add(item) {
        const queue = this.getAll();
        if (!item.id) item.id = Utils.generateUUID();
        queue.push({
            ...item,
            queuedAt: Date.now(),
            retries: 0,
            status: 'pending'
        });
        this.save(queue);
        return item;
    },

    remove(id) {
        const queue = this.getAll().filter(item => item.id !== id);
        this.save(queue);
    },

    update(id, updates) {
        const queue = this.getAll();
        const index = queue.findIndex(item => item.id === id);
        if (index === -1) return null;
        queue[index] = { ...queue[index], ...updates };
        this.save(queue);
        return queue[index];
    },

    count() {
        return this.getAll().length;
    },

    clear() {
        this.save([]);
    }
};

// ================================================================
// PART 5: BATCH OPERATIONS
// ================================================================

const Batch = {
    // Export semua data (untuk backup)
    exportAll() {
        return {
            version: DB.version,
            exportedAt: Date.now(),
            products: ProductsDB.getAll(),
            transactions: TransactionsDB.getAll(),
            cart: CartDB.get(),
            settings: SettingsDB.get(),
            queue: QueueDB.getAll()
        };
    },

    // Import data (dari backup)
    importAll(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data backup tidak valid');
        }
        if (data.products) ProductsDB.save(data.products);
        if (data.transactions) TransactionsDB.save(data.transactions);
        if (data.cart) CartDB.save(data.cart);
        if (data.settings) SettingsDB.save(data.settings);
        if (data.queue) QueueDB.save(data.queue);
        EventBus.emit('db:imported', data);
    },

    // Clear semua data
    clearAll() {
        ProductsDB.save([]);
        TransactionsDB.save([]);
        CartDB.save([]);
        SettingsDB.save({});
        QueueDB.save([]);
        EventBus.emit('db:cleared', null);
    },

    // Sync semua data dari state ke storage
    syncFromState() {
        const state = State.exportState();
        ProductsDB.save(state.products);
        TransactionsDB.save(state.transactions);
        CartDB.save(state.cart);
        SettingsDB.save(state.settings);
    },

    // Sync semua data dari storage ke state
    syncToState() {
        State.loadFromDatabase({
            products: ProductsDB.getAll(),
            transactions: TransactionsDB.getAll(),
            cart: CartDB.get(),
            settings: SettingsDB.get()
        });
    }
};

// ================================================================
// PART 6: MIGRATION
// ================================================================

const Migration = {
    currentVersion: DB.version,

    // Cek versi schema
    getSchemaVersion() {
        return Storage.get(DB.keys.schemaVersion, 0);
    },

    // Set versi schema
    setSchemaVersion(version) {
        Storage.set(DB.keys.schemaVersion, version);
    },

    // Migrasi dari versi lama
    migrate(fromVersion) {
        console.log(`🔄 Migrasi dari v${fromVersion} ke v${this.currentVersion}`);
        // Placeholder untuk migrasi ke depan
        // Contoh:
        // if (fromVersion < 2) { ... }
        this.setSchemaVersion(this.currentVersion);
    },

    // Check & migrate jika perlu
    check() {
        const version = this.getSchemaVersion();
        if (version === 0) {
            // Fresh install
            this.setSchemaVersion(this.currentVersion);
            return { action: 'init', version: this.currentVersion };
        }
        if (version < this.currentVersion) {
            this.migrate(version);
            return { action: 'migrate', from: version, to: this.currentVersion };
        }
        return { action: 'none', version };
    }
};

// ================================================================
// PART 7: SUPABASE ABSTRACTION (Future)
// ================================================================

const SupabaseBridge = {
    enabled: false,
    client: null,

    // Initialize Supabase
    async init(url, key) {
        if (!url || !key) {
            console.warn('[Supabase] URL/Key tidak ada, skip');
            return false;
        }
        // Placeholder: di masa depan, import supabase-js
        // this.client = supabase.createClient(url, key);
        this.enabled = true;
        console.log('[Supabase] Bridge ready (placeholder)');
        return true;
    },

    // Push data ke Supabase
    async push(tableName, data) {
        if (!this.enabled) return { success: false, reason: 'disabled' };
        console.log(`[Supabase] Push to ${tableName}:`, data);
        // Placeholder
        return { success: true, simulated: true };
    },

    // Pull data dari Supabase
    async pull(tableName) {
        if (!this.enabled) return { success: false, reason: 'disabled' };
        console.log(`[Supabase] Pull from ${tableName}`);
        // Placeholder
        return { success: true, data: [] };
    },

    // Enable/disable
    setEnabled(enabled) {
        this.enabled = !!enabled;
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('🗄️ Database module initialized');

    // Check schema version
    const check = Migration.check();
    if (check.action === 'init') {
        console.log('🆕 Fresh install — no migration needed');
    } else if (check.action === 'migrate') {
        console.log(`🔄 Migrated from v${check.from} to v${check.to}`);
    }

    // Sync dari storage ke state
    Batch.syncToState();

    console.log('✅ Database ready');
    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const DatabaseModule = {
    // Low-level
    Storage,
    Table,

    // High-level tables
    Products: ProductsDB,
    Transactions: TransactionsDB,
    Cart: CartDB,
    Settings: SettingsDB,
    Queue: QueueDB,

    // Batch ops
    Batch,

    // Migration
    Migration,

    // Supabase
    Supabase: SupabaseBridge,

    // Init
    initialize,

    // Metadata
    version: DB.version,
    keys: DB.keys
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.DatabaseModule = DatabaseModule;
}

console.log('✅ database.js loaded');

export default DatabaseModule;
export { DatabaseModule };
export { ProductsDB, TransactionsDB, CartDB, SettingsDB, QueueDB, Batch, Migration, SupabaseBridge, Storage, Table };

// ================================================================
// END OF DATABASE — 500+ BARIS
// ================================================================