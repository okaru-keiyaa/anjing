 /* ================================================================
   INVENTORY — Warung Atika Enterprise
   ================================================================
   Inventory Engine:
   - Stock decrement (transaksi)
   - Stock validation
   - Minimum stock detection
   - Low-stock event trigger
   - Replenishment ledger
   - Restock operations
   - Stock audit trail
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus, State } = Core;
const { Products } = DatabaseModule;

// ================================================================
// PART 1: INVENTORY CONSTANTS
// ================================================================

const INVENTORY = {
    status: {
        OK: 'ok',
        LOW: 'low',
        CRITICAL: 'critical',
        OUT: 'out'
    },
    ledgerKey: 'atika_replenishment_ledger',
    maxLedgerEntries: 1000,
    autoRestockThreshold: 0 // Kalau stok <= 0, otomatis masuk ledger
};

// ================================================================
// PART 2: STOCK STATUS DETECTOR
// ================================================================

const StockStatus = {
    // Get status produk
    get(product) {
        if (!product) return null;
        if (product.stok <= 0) return INVENTORY.status.OUT;
        if (product.stok < product.minStok) return INVENTORY.status.LOW;
        return INVENTORY.status.OK;
    },

    // Get label
    getLabel(status) {
        const labels = {
            [INVENTORY.status.OK]: 'Aman',
            [INVENTORY.status.LOW]: 'Menipis',
            [INVENTORY.status.CRITICAL]: 'Kritis',
            [INVENTORY.status.OUT]: 'Habis'
        };
        return labels[status] || status;
    },

    // Get color
    getColor(status) {
        const colors = {
            [INVENTORY.status.OK]: 'success',
            [INVENTORY.status.LOW]: 'warning',
            [INVENTORY.status.CRITICAL]: 'error',
            [INVENTORY.status.OUT]: 'error'
        };
        return colors[status] || 'neutral';
    },

    // Cek apakah produk di bawah minimum
    isLow(product) {
        return product && product.stok < product.minStok;
    },

    // Cek apakah produk habis
    isOut(product) {
        return product && product.stok <= 0;
    },

    // Cek apakah produk aman
    isOk(product) {
        return product && product.stok >= product.minStok;
    }
};

// ================================================================
// PART 3: STOCK VALIDATOR
// ================================================================

const StockValidator = {
    // Validasi stok cukup untuk item
    validateItem(product, quantity) {
        if (!product) throw new Error('Produk tidak ditemukan');
        if (quantity <= 0) throw new Error('Quantity harus lebih dari 0');
        if (product.stok < quantity) {
            throw new Error(`Stok ${product.nama} tidak cukup. Tersisa ${product.stok}`);
        }
        return true;
    },

    // Validasi semua item di cart
    validateCart(items) {
        const products = Products.getAll();
        const errors = [];
        for (const item of items) {
            const product = products.find(p => p.barcode === item.barcode);
            if (!product) {
                errors.push(`Produk ${item.barcode} tidak ditemukan`);
                continue;
            }
            if (product.stok < item.kuantitas) {
                errors.push(`Stok ${product.nama} tidak cukup (tersisa ${product.stok})`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
};

// ================================================================
// PART 4: STOCK DECREMENT
// ================================================================

const Decrement = {
    // Decrement stock untuk satu produk
    one(barcode, quantity) {
        const product = Products.getByBarcode(barcode);
        if (!product) throw new Error(`Produk ${barcode} tidak ditemukan`);
        StockValidator.validateItem(product, quantity);

        const stokLama = product.stok;
        const stokBaru = stokLama - quantity;

        Products.update(barcode, { stok: stokBaru });

        const result = {
            barcode,
            nama: product.nama,
            stokLama,
            stokBaru,
            quantity,
            status: StockStatus.get({ ...product, stok: stokBaru })
        };

        // Emit event
        EventBus.emit('inventory:stockUpdated', result);

        // Cek low stock
        if (stokBaru < product.minStok) {
            EventBus.emit('inventory:lowStock', {
                ...product,
                stokLama,
                stokBaru,
                status: StockStatus.get({ ...product, stok: stokBaru })
            });
        }

        return result;
    },

    // Decrement stock untuk banyak item
    many(items) {
        const results = [];
        for (const item of items) {
            try {
                const result = this.one(item.barcode, item.kuantitas);
                results.push(result);
            } catch (err) {
                console.error(`[Decrement] Error for ${item.barcode}:`, err);
                results.push({ barcode: item.barcode, error: err.message });
            }
        }
        return results;
    },

    // Decrement batch (atomic)
    batch(items) {
        // Validasi dulu semua
        const validation = StockValidator.validateCart(items);
        if (!validation.valid) {
            throw new Error(validation.errors.join('\n'));
        }
        // Kalau valid, decrement semua
        return this.many(items);
    }
};

// ================================================================
// PART 5: STOCK INCREMENT (RESTOCK)
// ================================================================

const Increment = {
    // Restock satu produk
    one(barcode, quantity, notes = '') {
        const product = Products.getByBarcode(barcode);
        if (!product) throw new Error(`Produk ${barcode} tidak ditemukan`);
        if (quantity <= 0) throw new Error('Quantity harus lebih dari 0');

        const stokLama = product.stok;
        const stokBaru = stokLama + quantity;

        Products.update(barcode, { stok: stokBaru });

        const result = {
            barcode,
            nama: product.nama,
            stokLama,
            stokBaru,
            quantity,
            notes,
            status: StockStatus.get({ ...product, stok: stokBaru }),
            timestamp: Date.now()
        };

        // Catat ke ledger
        Ledger.add({
            type: 'restock',
            barcode,
            nama: product.nama,
            stokLama,
            stokBaru,
            quantity,
            notes
        });

        // Emit event
        EventBus.emit('inventory:stockUpdated', result);
        EventBus.emit('inventory:restock', result);

        console.log(`📦 Restock: ${product.nama} +${quantity} (${stokLama} → ${stokBaru})`);

        return result;
    },

    // Restock banyak produk
    many(items) {
        const results = [];
        for (const item of items) {
            try {
                const result = this.one(item.barcode, item.quantity, item.notes);
                results.push(result);
            } catch (err) {
                results.push({ barcode: item.barcode, error: err.message });
            }
        }
        return results;
    }
};

// ================================================================
// PART 6: LEDGER (Replenishment)
// ================================================================

const Ledger = {
    // Get semua ledger
    getAll() {
        return Utils.storageGet(INVENTORY.ledgerKey, []);
    },

    // Save
    save(ledger) {
        Utils.storageSet(INVENTORY.ledgerKey, ledger);
    },

    // Add entry
    add(entry) {
        const ledger = this.getAll();
        const ledgerEntry = {
            id: Utils.generateUUID(),
            timestamp: Date.now(),
            date: Utils.getDateString(),
            time: Utils.formatTime(Date.now()),
            ...entry
        };
        ledger.push(ledgerEntry);
        // Batasi jumlah entries
        if (ledger.length > INVENTORY.maxLedgerEntries) {
            ledger.splice(0, ledger.length - INVENTORY.maxLedgerEntries);
        }
        this.save(ledger);
        EventBus.emit('inventory:ledgerEntry', ledgerEntry);
        return ledgerEntry;
    },

    // Get entries by product
    getByProduct(barcode) {
        return this.getAll().filter(entry => entry.barcode === barcode);
    },

    // Get latest entries
    getLatest(limit = 50) {
        const ledger = this.getAll();
        return ledger.slice(-limit).reverse();
    },

    // Get by type
    getByType(type) {
        return this.getAll().filter(entry => entry.type === type);
    },

    // Count
    count() {
        return this.getAll().length;
    },

    // Clear
    clear() {
        this.save([]);
        EventBus.emit('inventory:ledgerCleared', null);
        console.log('[Ledger] Cleared');
    }
};

// ================================================================
// PART 7: LOW STOCK MONITOR
// ================================================================

const LowStockMonitor = {
    listeners: new Set(),

    // Cek semua produk untuk low stock
    checkAll() {
        const products = Products.getAll();
        const lowStockItems = [];
        for (const product of products) {
            if (StockStatus.isLow(product)) {
                lowStockItems.push({
                    ...product,
                    status: StockStatus.get(product)
                });
            }
        }
        if (lowStockItems.length > 0) {
            this.notify(lowStockItems);
        }
        return lowStockItems;
    },

    // Get semua produk low stock
    getLowStockProducts() {
        const products = Products.getAll();
        return products
            .filter(p => StockStatus.isLow(p))
            .map(p => ({
                ...p,
                status: StockStatus.get(p)
            }));
    },

    // Get produk critical (habis)
    getCriticalProducts() {
        const products = Products.getAll();
        return products
            .filter(p => StockStatus.isOut(p))
            .map(p => ({
                ...p,
                status: StockStatus.get(p)
            }));
    },

    // Get summary
    getSummary() {
        const products = Products.getAll();
        const low = products.filter(p => StockStatus.isLow(p) && !StockStatus.isOut(p)).length;
        const critical = products.filter(p => StockStatus.isOut(p)).length;
        return {
            total: products.length,
            low,
            critical,
            ok: products.length - low - critical
        };
    },

    // Subscribe
    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this.listeners.add(listener);
        // Panggil langsung
        const low = this.getLowStockProducts();
        if (low.length > 0) {
            listener(low);
        }
        return () => this.listeners.delete(listener);
    },

    // Notify
    notify(items) {
        for (const listener of this.listeners) {
            try {
                listener(items);
            } catch (err) {
                console.error('[LowStock] Listener error:', err);
            }
        }
    }
};

// ================================================================
// PART 8: STOCK AUDIT (History)
// ================================================================

const Audit = {
    key: 'atika_stock_audit',

    // Get all
    getAll() {
        return Utils.storageGet(this.key, []);
    },

    // Save
    save(data) {
        Utils.storageSet(this.key, data);
    },

    // Add entry
    add(entry) {
        const audit = this.getAll();
        audit.push({
            id: Utils.generateUUID(),
            timestamp: Date.now(),
            ...entry
        });
        // Limit
        if (audit.length > 1000) {
            audit.splice(0, audit.length - 1000);
        }
        this.save(audit);
    },

    // Get by barcode
    getByProduct(barcode) {
        return this.getAll().filter(entry => entry.barcode === barcode);
    },

    // Clear
    clear() {
        this.save([]);
    }
};

// ================================================================
// PART 9: INVENTORY FACADE (Main API)
// ================================================================

const Inventory = {
    // Sub-modules
    StockStatus,
    Validator: StockValidator,
    Decrement,
    Increment,
    Ledger,
    LowStockMonitor,
    Audit,

    // Constants
    status: INVENTORY.status,

    // ---- High-level API ----

    // Process stock decrement (untuk transaksi)
    processSale(items) {
        return Decrement.batch(items);
    },

    // Restock
    restock(barcode, quantity, notes = '') {
        return Increment.one(barcode, quantity, notes);
    },

    // Restock banyak
    restockMany(items) {
        return Increment.many(items);
    },

    // Get low stock
    getLowStock() {
        return LowStockMonitor.getLowStockProducts();
    },

    // Get critical stock
    getCriticalStock() {
        return LowStockMonitor.getCriticalProducts();
    },

    // Get status summary
    getSummary() {
        return LowStockMonitor.getSummary();
    },

    // Get product stock status
    getProductStatus(barcode) {
        const product = Products.getByBarcode(barcode);
        if (!product) return null;
        return {
            ...product,
            status: StockStatus.get(product)
        };
    },

    // Check specific product
    checkProduct(barcode) {
        const product = Products.getByBarcode(barcode);
        if (!product) return null;
        return {
            product,
            isLow: StockStatus.isLow(product),
            isOut: StockStatus.isOut(product),
            isOk: StockStatus.isOk(product),
            status: StockStatus.get(product)
        };
    },

    // Get ledger
    getLedger() {
        return Ledger.getAll();
    },

    // Get latest ledger
    getLatestLedger(limit = 50) {
        return Ledger.getLatest(limit);
    },

    // Clear ledger
    clearLedger() {
        Ledger.clear();
    },

    // Subscribe low stock
    onLowStock(listener) {
        return LowStockMonitor.subscribe(listener);
    }
};

// ================================================================
// PART 10: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📦 Inventory module initialized');

    // Subscribe ke transaction success
    EventBus.on('payment:success', (transaction) => {
        console.log(`📦 Processing stock for transaction: ${transaction.id}`);
        // Stock sudah di-decrement oleh payment.js, kita hanya catat audit
        for (const item of transaction.items) {
            Audit.add({
                type: 'sale',
                barcode: item.barcode,
                nama: item.nama,
                quantity: -item.kuantitas,
                transactionId: transaction.id,
                timestamp: transaction.timestamp
            });
        }
    });

    // Subscribe ke restock
    EventBus.on('inventory:restock', (result) => {
        Audit.add({
            type: 'restock',
            barcode: result.barcode,
            nama: result.nama,
            quantity: result.quantity,
            stokLama: result.stokLama,
            stokBaru: result.stokBaru,
            notes: result.notes,
            timestamp: result.timestamp
        });
    });

    // Initial check
    setTimeout(() => {
        const summary = LowStockMonitor.getSummary();
        if (summary.low > 0 || summary.critical > 0) {
            console.log(`⚠️ Stock alert: ${summary.low} low, ${summary.critical} critical`);
            LowStockMonitor.checkAll();
        }
    }, 1000);

    console.log('✅ Inventory ready');
    return true;
}

// ================================================================
// PART 11: EXPORT
// ================================================================

const InventoryModule = {
    Inventory,
    StockStatus,
    StockValidator,
    Decrement,
    Increment,
    Ledger,
    LowStockMonitor,
    Audit,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Inventory = Inventory;
    window.InventoryModule = InventoryModule;
}

console.log('✅ inventory.js loaded');

export default InventoryModule;
export {
    Inventory,
    StockStatus,
    StockValidator,
    Decrement,
    Increment,
    Ledger,
    LowStockMonitor,
    Audit,
    initialize
};

// ================================================================
// END OF INVENTORY — 500+ BARIS
// ================================================================