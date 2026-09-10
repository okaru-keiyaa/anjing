 /* ================================================================
   PAYMENT — Warung Atika Enterprise
   ================================================================
   Payment engine:
   - Cash payment (kembalian otomatis)
   - QRIS payment (scan/upload)
   - Payment validation
   - Change calculation
   - Rapid cash shortcuts
   - Transaction creation
   - Payment methods registry
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus, State } = Core;
const { Products, Transactions } = DatabaseModule;

// ================================================================
// PART 1: PAYMENT CONSTANTS
// ================================================================

const PAYMENT = {
    methods: {
        CASH: 'cash',
        QRIS: 'qris',
        TRANSFER: 'transfer',
        EWALLET: 'ewallet'
    },
    status: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        SUCCESS: 'success',
        FAILED: 'failed',
        CANCELLED: 'cancelled'
    },
    cashShortcuts: [
        { label: 'Uang Pas', value: 'exact' },
        { label: 'Rp 10.000', value: 10000 },
        { label: 'Rp 20.000', value: 20000 },
        { label: 'Rp 50.000', value: 50000 },
        { label: 'Rp 100.000', value: 100000 }
    ]
};

// ================================================================
// PART 2: VALIDATOR
// ================================================================

const Validator = {
    // Validasi cash received
    validateCash(value) {
        if (value === null || value === undefined || value === '') {
            throw new Error('Uang diterima wajib diisi');
        }
        const parsed = parseFloat(value);
        if (isNaN(parsed) || !isFinite(parsed)) {
            throw new Error('Uang harus berupa angka valid');
        }
        if (parsed < 0) {
            throw new Error('Uang tidak boleh negatif');
        }
        return parsed;
    },

    // Validasi cart tidak kosong
    validateCart(cart) {
        if (!Array.isArray(cart) || cart.length === 0) {
            throw new Error('Keranjang kosong');
        }
        return true;
    },

    // Validasi stock
    validateStock(items) {
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
    },

    // Validasi payment total
    validatePayment(cashReceived, total) {
        if (cashReceived < total) {
            const kurang = total - cashReceived;
            throw new Error(`Uang kurang ${Utils.formatRupiah(kurang)}`);
        }
        return true;
    },

    // Validasi QRIS data
    validateQRIS(data) {
        if (!data) throw new Error('Data QRIS kosong');
        if (typeof data !== 'object') throw new Error('Data QRIS harus object');
        if (!data.merchant) throw new Error('Merchant QRIS tidak valid');
        if (!data.amount && data.amount !== 0) throw new Error('Nominal QRIS tidak valid');
        return true;
    }
};

// ================================================================
// PART 3: CHANGE CALCULATOR
// ================================================================

const Change = {
    // Hitung kembalian
    calculate(cashReceived, total) {
        return cashReceived - total;
    },

    // Format kembalian
    format(change) {
        if (change < 0) {
            return {
                text: `Kurang ${Utils.formatRupiah(Math.abs(change))}`,
                value: change,
                status: 'negative'
            };
        }
        if (change === 0) {
            return {
                text: 'Uang Pas',
                value: 0,
                status: 'exact'
            };
        }
        return {
            text: `Kembali ${Utils.formatRupiah(change)}`,
            value: change,
            status: 'positive'
        };
    },

    // Breakdown kembalian ke pecahan
    breakdown(change) {
        if (change <= 0) return [];
        const denominations = [
            100000, 50000, 20000, 10000, 5000,
            2000, 1000, 500, 200, 100
        ];
        const result = [];
        let remaining = change;
        for (const denom of denominations) {
            if (remaining >= denom) {
                const count = Math.floor(remaining / denom);
                result.push({ denom, count, subtotal: denom * count });
                remaining -= denom * count;
            }
        }
        return result;
    }
};

// ================================================================
// PART 4: CASH PAYMENT
// ================================================================

const CashPayment = {
    // Process cash payment
    process(cashReceived, options = {}) {
        // Validasi cart
        const cart = State.getCart();
        Validator.validateCart(cart);

        // Hitung total
        const total = State.getCartTotal();

        // Validasi cash
        const cash = Validator.validateCash(cashReceived);

        // Validasi cukup
        Validator.validatePayment(cash, total);

        // Validasi stok
        const stockCheck = Validator.validateStock(cart);
        if (!stockCheck.valid) {
            throw new Error(stockCheck.errors.join('\n'));
        }

        // Hitung kembalian
        const change = Change.calculate(cash, total);

        // Buat transaction
        const transaction = {
            id: Utils.generateUUID(),
            timestamp: Date.now(),
            date: Utils.getDateString(),
            time: Utils.formatTime(Date.now()),
            items: Utils.deepClone(cart),
            totalJual: total,
            totalModal: State.getCartModalTotal(),
            netProfit: total - State.getCartModalTotal(),
            itemCount: State.getCartItemCount(),
            metode: PAYMENT.methods.CASH,
            cashReceived: cash,
            change: change,
            status: PAYMENT.status.SUCCESS,
            notes: options.notes || '',
            synced: false
        };

        // Simpan transaksi
        Transactions.add(transaction);
        State.addTransaction(transaction);

        // Decrement stock
        this.decrementStock(cart);

        // Clear cart
        State.clearCart();

        // Emit event
        EventBus.emit('payment:success', transaction);
        EventBus.emit('checkout:success', transaction);

        console.log(`💰 Cash payment: ${transaction.id} — ${Utils.formatRupiah(total)}`);

        return {
            success: true,
            transaction,
            change,
            changeFormatted: Change.format(change)
        };
    },

    // Decrement stock
    decrementStock(items) {
        const products = Products.getAll();
        const lowStockItems = [];
        for (const item of items) {
            const index = products.findIndex(p => p.barcode === item.barcode);
            if (index === -1) continue;
            products[index].stok -= item.kuantitas;
            if (products[index].stok < products[index].minStok) {
                lowStockItems.push(products[index]);
            }
        }
        Products.save(products);
        // Emit low stock event
        for (const item of lowStockItems) {
            EventBus.emit('inventory:lowStock', item);
        }
    }
};

// ================================================================
// PART 5: QRIS PAYMENT
// ================================================================

const QRISPayment = {
    // Process QRIS payment
    process(qrisData, options = {}) {
        // Validasi cart
        const cart = State.getCart();
        Validator.validateCart(cart);

        // Validasi QRIS
        Validator.validateQRIS(qrisData);

        // Hitung total
        const total = State.getCartTotal();

        // Validasi nominal QRIS cocok dengan total
        if (qrisData.amount < total) {
            throw new Error(`Nominal QRIS ${Utils.formatRupiah(qrisData.amount)} kurang dari total ${Utils.formatRupiah(total)}`);
        }

        // Validasi stok
        const stockCheck = Validator.validateStock(cart);
        if (!stockCheck.valid) {
            throw new Error(stockCheck.errors.join('\n'));
        }

        // Buat transaction
        const transaction = {
            id: Utils.generateUUID(),
            timestamp: Date.now(),
            date: Utils.getDateString(),
            time: Utils.formatTime(Date.now()),
            items: Utils.deepClone(cart),
            totalJual: total,
            totalModal: State.getCartModalTotal(),
            netProfit: total - State.getCartModalTotal(),
            itemCount: State.getCartItemCount(),
            metode: PAYMENT.methods.QRIS,
            qrisMerchant: qrisData.merchant,
            qrisAmount: qrisData.amount,
            qrisId: qrisData.id || null,
            status: PAYMENT.status.SUCCESS,
            notes: options.notes || '',
            synced: false
        };

        // Simpan transaksi
        Transactions.add(transaction);
        State.addTransaction(transaction);

        // Decrement stock
        CashPayment.decrementStock(cart);

        // Clear cart
        State.clearCart();

        // Emit event
        EventBus.emit('payment:success', transaction);
        EventBus.emit('checkout:success', transaction);

        console.log(`📱 QRIS payment: ${transaction.id} — ${Utils.formatRupiah(total)} via ${qrisData.merchant}`);

        return {
            success: true,
            transaction
        };
    },

    // Parse QRIS data dari string
    parse(qrString) {
        // QRIS format: standar EMVCo
        // Placeholder — di masa depan, parse dengan library QRIS
        if (!qrString || typeof qrString !== 'string') {
            throw new Error('Data QRIS tidak valid');
        }

        // Contoh parsing sederhana
        const data = {
            id: Utils.generateUUID(),
            merchant: 'BCA',
            amount: 0,
            raw: qrString,
            timestamp: Date.now()
        };

        return data;
    }
};

// ================================================================
// PART 6: CASH SHORTCUTS
// ================================================================

const Shortcuts = {
    // Get relevant shortcuts berdasarkan total
    getRelevant(total) {
        const all = PAYMENT.cashShortcuts;
        const result = [];
        for (const shortcut of all) {
            if (shortcut.value === 'exact') {
                result.push({ ...shortcut, actual: total });
            } else if (shortcut.value >= total) {
                result.push({ ...shortcut, actual: shortcut.value });
            }
        }
        return result;
    },

    // Get uang pas
    getExact(total) {
        return total;
    },

    // Get suggested amounts
    getSuggested(total) {
        const rounded = Math.ceil(total / 5000) * 5000;
        const suggestions = [];
        const candidates = [rounded, 10000, 20000, 50000, 100000];
        for (const amount of candidates) {
            if (amount >= total && !suggestions.includes(amount)) {
                suggestions.push(amount);
            }
        }
        return suggestions.sort((a, b) => a - b);
    }
};

// ================================================================
// PART 7: PAYMENT FACADE (Main API)
// ================================================================

const Payment = {
    // Metadata
    methods: PAYMENT.methods,
    status: PAYMENT.status,

    // Sub-modules
    Validator,
    Change,
    Cash: CashPayment,
    QRIS: QRISPayment,
    Shortcuts,

    // ---- High-level API ----

    // Process payment (auto-detect method)
    process(method, data, options = {}) {
        switch (method) {
            case PAYMENT.methods.CASH:
                return CashPayment.process(data, options);
            case PAYMENT.methods.QRIS:
                return QRISPayment.process(data, options);
            default:
                throw new Error(`Metode pembayaran tidak didukung: ${method}`);
        }
    },

    // Validasi sebelum bayar
    validate(method, data) {
        try {
            const cart = State.getCart();
            Validator.validateCart(cart);
            const total = State.getCartTotal();

            if (method === PAYMENT.methods.CASH) {
                const cash = Validator.validateCash(data);
                Validator.validatePayment(cash, total);
            } else if (method === PAYMENT.methods.QRIS) {
                Validator.validateQRIS(data);
            }

            return { valid: true };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    },

    // Get payment methods available
    getAvailableMethods() {
        return [
            { id: PAYMENT.methods.CASH, name: 'Tunai', icon: '💵' },
            { id: PAYMENT.methods.QRIS, name: 'QRIS', icon: '📱' }
        ];
    },

    // Get method info
    getMethodInfo(method) {
        const methods = this.getAvailableMethods();
        return methods.find(m => m.id === method) || null;
    },

    // Cancel payment
    cancel() {
        EventBus.emit('payment:cancelled', { timestamp: Date.now() });
        console.log('[Payment] Cancelled');
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('💳 Payment module initialized');
    console.log(`   Methods: ${Object.values(PAYMENT.methods).join(', ')}`);
    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const PaymentModule = {
    Payment,
    Validator,
    Change,
    CashPayment,
    QRISPayment,
    Shortcuts,
    PAYMENT,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Payment = Payment;
    window.PaymentModule = PaymentModule;
}

console.log('✅ payment.js loaded');

export default PaymentModule;
export { Payment, Validator, Change, CashPayment, QRISPayment, Shortcuts, initialize };

// ================================================================
// END OF PAYMENT — 500+ BARIS
// ================================================================