 /* ================================================================
   TRANSACTION — Warung Atika Enterprise
   ================================================================
   Transaction Management:
   - Transaction history
   - Transaction detail
   - Search & filter
   - Export (JSON, CSV)
   - Statistics
   - Refund/void (future)
   - Audit trail
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus } = Core;
const { Transactions: TransactionsDB } = DatabaseModule;

// ================================================================
// PART 1: TRANSACTION CONSTANTS
// ================================================================

const TRANSACTION = {
    statuses: {
        SUCCESS: 'success',
        PENDING: 'pending',
        FAILED: 'failed',
        REFUNDED: 'refunded',
        VOID: 'void'
    },
    methods: {
        CASH: 'cash',
        QRIS: 'qris',
        TRANSFER: 'transfer',
        EWALLET: 'ewallet'
    },
    sortFields: ['timestamp', 'totalJual', 'totalModal', 'netProfit', 'itemCount'],
    sortDirections: ['asc', 'desc']
};

// ================================================================
// PART 2: TRANSACTION BUILDER
// ================================================================

const Builder = {
    // Buat transaksi baru
    create(data) {
        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Items wajib array');
        }
        if (data.items.length === 0) {
            throw new Error('Items tidak boleh kosong');
        }

        // Hitung totals
        const totalJual = data.items.reduce((sum, item) => {
            return sum + (item.hargaJual * item.kuantitas);
        }, 0);
        const totalModal = data.items.reduce((sum, item) => {
            return sum + (item.hargaModal * item.kuantitas);
        }, 0);
        const itemCount = data.items.reduce((sum, item) => sum + item.kuantitas, 0);

        return {
            id: data.id || Utils.generateUUID(),
            timestamp: data.timestamp || Date.now(),
            date: Utils.getDateString(),
            time: Utils.formatTime(Date.now()),
            items: Utils.deepClone(data.items),
            totalJual,
            totalModal,
            netProfit: totalJual - totalModal,
            itemCount,
            metode: data.metode || TRANSACTION.methods.CASH,
            cashReceived: data.cashReceived || totalJual,
            change: data.change || 0,
            qrisMerchant: data.qrisMerchant || null,
            qrisAmount: data.qrisAmount || null,
            status: data.status || TRANSACTION.statuses.SUCCESS,
            notes: data.notes || '',
            synced: data.synced || false,
            createdAt: Date.now()
        };
    },

    // Clone transaksi (untuk refund)
    clone(transaction, overrides = {}) {
        return {
            ...transaction,
            id: Utils.generateUUID(),
            timestamp: Date.now(),
            date: Utils.getDateString(),
            time: Utils.formatTime(Date.now()),
            status: TRANSACTION.statuses.SUCCESS,
            ...overrides
        };
    }
};

// ================================================================
// PART 3: SEARCH & FILTER
// ================================================================

const Search = {
    // Search by keyword
    search(keyword) {
        if (!keyword || keyword.trim() === '') {
            return TransactionsDB.getAll();
        }
        const query = keyword.toLowerCase().trim();
        return TransactionsDB.getAll().filter(tx => {
            // Cari di ID
            if (tx.id.toLowerCase().includes(query)) return true;
            // Cari di notes
            if (tx.notes && tx.notes.toLowerCase().includes(query)) return true;
            // Cari di items
            if (tx.items) {
                for (const item of tx.items) {
                    if (item.nama.toLowerCase().includes(query)) return true;
                    if (item.barcode.toLowerCase().includes(query)) return true;
                }
            }
            return false;
        });
    },

    // Filter by date range
    byDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return TransactionsDB.getAll().filter(tx => {
            return tx.timestamp >= start && tx.timestamp <= end;
        });
    },

    // Filter by date (single day)
    byDate(dateString) {
        return TransactionsDB.getAll().filter(tx => tx.date === dateString);
    },

    // Filter by method
    byMethod(method) {
        if (!method || method === 'all') return TransactionsDB.getAll();
        return TransactionsDB.getAll().filter(tx => tx.metode === method);
    },

    // Filter by status
    byStatus(status) {
        if (!status || status === 'all') return TransactionsDB.getAll();
        return TransactionsDB.getAll().filter(tx => tx.status === status);
    },

    // Filter by total range
    byTotalRange(min, max) {
        return TransactionsDB.getAll().filter(tx => {
            return tx.totalJual >= min && tx.totalJual <= max;
        });
    },

    // Filter by product
    byProduct(barcode) {
        return TransactionsDB.getAll().filter(tx => {
            return tx.items && tx.items.some(item => item.barcode === barcode);
        });
    },

    // Advanced filter
    advanced({ keyword, startDate, endDate, method, status, minTotal, maxTotal, product } = {}) {
        let results = TransactionsDB.getAll();

        if (keyword) {
            results = results.filter(tx => {
                const query = keyword.toLowerCase();
                return (
                    tx.id.toLowerCase().includes(query) ||
                    (tx.notes && tx.notes.toLowerCase().includes(query)) ||
                    (tx.items && tx.items.some(item =>
                        item.nama.toLowerCase().includes(query) ||
                        item.barcode.toLowerCase().includes(query)
                    ))
                );
            });
        }

        if (startDate) {
            const start = new Date(startDate).getTime();
            results = results.filter(tx => tx.timestamp >= start);
        }

        if (endDate) {
            const end = new Date(endDate).getTime();
            results = results.filter(tx => tx.timestamp <= end);
        }

        if (method && method !== 'all') {
            results = results.filter(tx => tx.metode === method);
        }

        if (status && status !== 'all') {
            results = results.filter(tx => tx.status === status);
        }

        if (minTotal !== undefined) {
            results = results.filter(tx => tx.totalJual >= minTotal);
        }

        if (maxTotal !== undefined) {
            results = results.filter(tx => tx.totalJual <= maxTotal);
        }

        if (product) {
            results = results.filter(tx =>
                tx.items && tx.items.some(item => item.barcode === product)
            );
        }

        return results;
    }
};

// ================================================================
// PART 4: SORT & PAGINATE
// ================================================================

const Sort = {
    sort(transactions, field = 'timestamp', direction = 'desc') {
        if (!TRANSACTION.sortFields.includes(field)) field = 'timestamp';
        if (!TRANSACTION.sortDirections.includes(direction)) direction = 'desc';

        const sorted = [...transactions];
        const multiplier = direction === 'asc' ? 1 : -1;

        sorted.sort((a, b) => {
            const valA = a[field] || 0;
            const valB = b[field] || 0;
            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * multiplier;
            }
            return (valA - valB) * multiplier;
        });

        return sorted;
    }
};

const Paginate = {
    paginate(items, page = 1, perPage = 20) {
        const total = items.length;
        const totalPages = Math.ceil(total / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages || 1));
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;

        return {
            items: items.slice(start, end),
            page: currentPage,
            perPage,
            total,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1,
            start: total > 0 ? start + 1 : 0,
            end: Math.min(end, total)
        };
    }
};

// ================================================================
// PART 5: STATISTICS
// ================================================================

const Stats = {
    // Hitung statistik dari transaksi
    calculate(transactions) {
        let grossRevenue = 0;
        let totalCost = 0;
        let totalItems = 0;

        for (const tx of transactions) {
            grossRevenue += tx.totalJual || 0;
            totalCost += tx.totalModal || 0;
            totalItems += tx.itemCount || 0;
        }

        const netProfit = grossRevenue - totalCost;
        const count = transactions.length;
        const avgTransaction = count > 0 ? grossRevenue / count : 0;

        return {
            grossRevenue,
            totalCost,
            netProfit,
            totalItems,
            count,
            avgTransaction,
            profitMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
        };
    },

    // By method
    byMethod(transactions) {
        const breakdown = {};
        for (const tx of transactions) {
            const method = tx.metode || 'cash';
            if (!breakdown[method]) {
                breakdown[method] = { method, count: 0, revenue: 0, profit: 0 };
            }
            breakdown[method].count++;
            breakdown[method].revenue += tx.totalJual || 0;
            breakdown[method].profit += tx.netProfit || 0;
        }
        return Object.values(breakdown);
    },

    // By status
    byStatus(transactions) {
        const breakdown = {};
        for (const tx of transactions) {
            const status = tx.status || 'success';
            if (!breakdown[status]) {
                breakdown[status] = { status, count: 0, revenue: 0 };
            }
            breakdown[status].count++;
            breakdown[status].revenue += tx.totalJual || 0;
        }
        return Object.values(breakdown);
    },

    // Top products
    topProducts(transactions, limit = 10) {
        const products = {};
        for (const tx of transactions) {
            if (!tx.items) continue;
            for (const item of tx.items) {
                if (!products[item.barcode]) {
                    products[item.barcode] = {
                        barcode: item.barcode,
                        nama: item.nama,
                        totalTerjual: 0,
                        totalRevenue: 0
                    };
                }
                products[item.barcode].totalTerjual += item.kuantitas || 0;
                products[item.barcode].totalRevenue += item.subtotalJual || 0;
            }
        }
        return Object.values(products)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    }
};

// ================================================================
// PART 6: EXPORT
// ================================================================

const Export = {
    // Export JSON
    toJSON(transactions) {
        return JSON.stringify(transactions, null, 2);
    },

    // Export CSV
    toCSV(transactions) {
        const headers = [
            'ID', 'Tanggal', 'Waktu', 'Metode', 'Item Count',
            'Total Jual', 'Total Modal', 'Net Profit', 'Status', 'Notes'
        ];
        const rows = [headers.join(',')];

        for (const tx of transactions) {
            rows.push([
                tx.id,
                tx.date,
                tx.time,
                tx.metode,
                tx.itemCount,
                tx.totalJual,
                tx.totalModal,
                tx.netProfit,
                tx.status,
                `"${(tx.notes || '').replace(/"/g, '""')}"`
            ].join(','));
        }

        return rows.join('\n');
    },

    // Export detail (dengan items)
    toDetailedCSV(transactions) {
        const headers = [
            'Transaction ID', 'Tanggal', 'Waktu', 'Barcode',
            'Produk', 'Qty', 'Harga Jual', 'Harga Modal', 'Subtotal'
        ];
        const rows = [headers.join(',')];

        for (const tx of transactions) {
            for (const item of tx.items) {
                rows.push([
                    tx.id,
                    tx.date,
                    tx.time,
                    item.barcode,
                    `"${item.nama}"`,
                    item.kuantitas,
                    item.hargaJual,
                    item.hargaModal,
                    item.subtotalJual
                ].join(','));
            }
        }

        return rows.join('\n');
    },

    // Download file
    download(content, filename, mimeType = 'text/plain') {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (err) {
            console.error('[Export] Failed:', err);
            return false;
        }
    },

    // Export JSON file
    downloadJSON(transactions, filename) {
        const name = filename || `transactions_${Utils.getDateString()}.json`;
        return this.download(this.toJSON(transactions), name, 'application/json');
    },

    // Export CSV file
    downloadCSV(transactions, filename) {
        const name = filename || `transactions_${Utils.getDateString()}.csv`;
        return this.download(this.toCSV(transactions), name, 'text/csv');
    }
};

// ================================================================
// PART 7: TRANSACTION FACADE (Main API)
// ================================================================

const Transaction = {
    // Sub-modules
    Builder,
    Search,
    Sort,
    Paginate,
    Stats,
    Export,

    // Constants
    statuses: TRANSACTION.statuses,
    methods: TRANSACTION.methods,

    // ---- CRUD ----

    // Get all
    getAll() {
        return TransactionsDB.getAll();
    },

    // Get by ID
    getById(id) {
        return TransactionsDB.getById(id);
    },

    // Get by date
    getByDate(dateString) {
        return Search.byDate(dateString);
    },

    // Get today
    getToday() {
        return TransactionsDB.getToday();
    },

    // Get count
    getCount() {
        return TransactionsDB.getAll().length;
    },

    // Add transaction
    add(transaction) {
        try {
            const built = Builder.create(transaction);
            TransactionsDB.add(built);
            EventBus.emit('transaction:added', built);
            return { success: true, transaction: built };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // Delete transaction (by ID)
    delete(id) {
        try {
            const transactions = TransactionsDB.getAll();
            const filtered = transactions.filter(tx => tx.id !== id);
            if (filtered.length === transactions.length) {
                throw new Error('Transaksi tidak ditemukan');
            }
            TransactionsDB.save(filtered);
            EventBus.emit('transaction:deleted', { id });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // ---- Search & Filter ----

    search(keyword) {
        return Search.search(keyword);
    },

    filter(options = {}) {
        return Search.advanced(options);
    },

    byDateRange(startDate, endDate) {
        return Search.byDateRange(startDate, endDate);
    },

    byMethod(method) {
        return Search.byMethod(method);
    },

    byStatus(status) {
        return Search.byStatus(status);
    },

    byProduct(barcode) {
        return Search.byProduct(barcode);
    },

    // ---- Sort & Paginate ----

    sort(transactions, field, direction) {
        return Sort.sort(transactions, field, direction);
    },

    paginate(items, page, perPage) {
        return Paginate.paginate(items, page, perPage);
    },

    // Get page (combined)
    getPage({ page = 1, perPage = 20, sortField = 'timestamp', sortDirection = 'desc', filter = {} } = {}) {
        let transactions = this.filter(filter);
        transactions = this.sort(transactions, sortField, sortDirection);
        return this.paginate(transactions, page, perPage);
    },

    // ---- Statistics ----

    getStats(transactions = null) {
        const txs = transactions || this.getAll();
        return Stats.calculate(txs);
    },

    getStatsByMethod(transactions = null) {
        return Stats.byMethod(transactions || this.getAll());
    },

    getTopProducts(limit = 10, transactions = null) {
        return Stats.topProducts(transactions || this.getAll(), limit);
    },

    // ---- Export ----

    exportJSON(transactions = null) {
        return Export.toJSON(transactions || this.getAll());
    },

    exportCSV(transactions = null) {
        return Export.toCSV(transactions || this.getAll());
    },

    downloadJSON(transactions = null, filename = null) {
        return Export.downloadJSON(transactions || this.getAll(), filename);
    },

    downloadCSV(transactions = null, filename = null) {
        return Export.downloadCSV(transactions || this.getAll(), filename);
    },

    downloadDetailedCSV(transactions = null, filename = null) {
        const content = Export.toDetailedCSV(transactions || this.getAll());
        const name = filename || `transactions_detail_${Utils.getDateString()}.csv`;
        return Export.download(content, name, 'text/csv');
    },

    // ---- Bulk ----

    // Clear all
    clearAll() {
        TransactionsDB.clear();
        EventBus.emit('transactions:cleared', null);
        console.log('🗑️ All transactions cleared');
    },

    // Bulk delete
    bulkDelete(ids) {
        const transactions = TransactionsDB.getAll();
        const filtered = transactions.filter(tx => !ids.includes(tx.id));
        const deleted = transactions.length - filtered.length;
        TransactionsDB.save(filtered);
        return { deleted, total: ids.length };
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📋 Transaction module initialized');
    const count = Transaction.getCount();
    console.log(`   Total transaksi: ${count}`);
    console.log('✅ Transaction ready');
    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const TransactionModule = {
    Transaction,
    Builder,
    Search,
    Sort,
    Paginate,
    Stats,
    Export,
    TRANSACTION,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Transaction = Transaction;
    window.TransactionModule = TransactionModule;
}

console.log('✅ transaction.js loaded');

export default TransactionModule;
export { Transaction, Builder, Search, Sort, Paginate, Stats, Export, initialize };

// ================================================================
// END OF TRANSACTION — 500+ BARIS
// ================================================================