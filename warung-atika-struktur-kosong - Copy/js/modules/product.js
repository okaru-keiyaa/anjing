 /* ================================================================
   PRODUCT — Warung Atika Enterprise
   ================================================================
   Product Management:
   - CRUD (Create, Read, Update, Delete)
   - Search & filter
   - Sort & paginate
   - Category management
   - Barcode generation
   - Stock status check
   - Bulk operations
   - Import/export
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus } = Core;
const { Products: ProductsDB } = DatabaseModule;

// ================================================================
// PART 1: PRODUCT CONSTANTS
// ================================================================

const PRODUCT = {
    categories: CONFIG.categories,
    defaultCategory: 'Lainnya',
    barcodePrefix: 'ATIKA',
    barcodeLength: 6,
    minStock: 0,
    maxStock: 999999,
    minPrice: 0,
    maxPrice: 999999999,
    nameMinLength: 2,
    nameMaxLength: 100,
    sortFields: ['nama', 'hargaJual', 'stok', 'kategori', 'barcode'],
    sortDirections: ['asc', 'desc']
};

// ================================================================
// PART 2: VALIDATOR
// ================================================================

const Validator = {
    // Validasi barcode
    validateBarcode(barcode, { allowEmpty = false } = {}) {
        if (!barcode || barcode.trim() === '') {
            if (allowEmpty) return null;
            throw new Error('Barcode wajib diisi');
        }
        const cleaned = String(barcode).trim().toUpperCase();
        if (cleaned.length < 4) {
            throw new Error('Barcode minimal 4 karakter');
        }
        if (cleaned.length > 20) {
            throw new Error('Barcode maksimal 20 karakter');
        }
        return cleaned;
    },

    // Validasi nama produk
    validateName(nama) {
        if (!nama || nama.trim() === '') {
            throw new Error('Nama produk wajib diisi');
        }
        const cleaned = nama.trim();
        if (cleaned.length < PRODUCT.nameMinLength) {
            throw new Error(`Nama minimal ${PRODUCT.nameMinLength} karakter`);
        }
        if (cleaned.length > PRODUCT.nameMaxLength) {
            throw new Error(`Nama maksimal ${PRODUCT.nameMaxLength} karakter`);
        }
        return cleaned;
    },

    // Validasi harga
    validatePrice(price, label = 'Harga') {
        if (price === null || price === undefined || price === '') {
            throw new Error(`${label} wajib diisi`);
        }
        const parsed = parseFloat(price);
        if (isNaN(parsed) || !isFinite(parsed)) {
            throw new Error(`${label} harus berupa angka`);
        }
        if (parsed < PRODUCT.minPrice) {
            throw new Error(`${label} tidak boleh negatif`);
        }
        if (parsed > PRODUCT.maxPrice) {
            throw new Error(`${label} terlalu besar`);
        }
        return parsed;
    },

    // Validasi stok
    validateStock(stock, label = 'Stok') {
        if (stock === null || stock === undefined || stock === '') {
            throw new Error(`${label} wajib diisi`);
        }
        const parsed = parseInt(stock, 10);
        if (isNaN(parsed)) {
            throw new Error(`${label} harus berupa angka`);
        }
        if (parsed < PRODUCT.minStock) {
            throw new Error(`${label} tidak boleh negatif`);
        }
        if (parsed > PRODUCT.maxStock) {
            throw new Error(`${label} terlalu besar`);
        }
        return parsed;
    },

    // Validasi kategori
    validateCategory(kategori) {
        if (!kategori || kategori.trim() === '') {
            return PRODUCT.defaultCategory;
        }
        const cleaned = kategori.trim();
        if (!PRODUCT.categories.includes(cleaned)) {
            throw new Error(`Kategori harus salah satu dari: ${PRODUCT.categories.join(', ')}`);
        }
        return cleaned;
    },

    // Validasi produk lengkap
    validateFull(product) {
        const validated = {
            barcode: this.validateBarcode(product.barcode),
            nama: this.validateName(product.nama),
            hargaJual: this.validatePrice(product.hargaJual, 'Harga Jual'),
            hargaModal: this.validatePrice(product.hargaModal, 'Harga Modal'),
            stok: this.validateStock(product.stok, 'Stok'),
            minStok: this.validateStock(product.minStok ?? 5, 'Min Stok'),
            kategori: this.validateCategory(product.kategori)
        };

        // Cek harga jual >= harga modal (warning, bukan error)
        if (validated.hargaJual < validated.hargaModal) {
            console.warn(`[Product] Harga jual (${validated.hargaJual}) < harga modal (${validated.hargaModal})`);
        }

        return validated;
    }
};

// ================================================================
// PART 3: BARCODE GENERATOR
// ================================================================

const BarcodeGen = {
    // Generate barcode unik
    generate(existingProducts = null) {
        const products = existingProducts || ProductsDB.getAll();
        let counter = products.length + 1;
        let barcode;
        let attempts = 0;

        do {
            const num = String(counter).padStart(PRODUCT.barcodeLength, '0');
            barcode = `${PRODUCT.barcodePrefix}${num}`;
            counter++;
            attempts++;
            if (attempts > 10000) {
                throw new Error('Gagal generate barcode unik');
            }
        } while (products.some(p => p.barcode === barcode));

        return barcode;
    },

    // Generate dari template
    fromTemplate(prefix = PRODUCT.barcodePrefix) {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}${random}`;
    },

    // Cek apakah barcode sudah ada
    exists(barcode) {
        return ProductsDB.getByBarcode(barcode) !== null;
    }
};

// ================================================================
// PART 4: PRODUCT BUILDER
// ================================================================

const Builder = {
    // Buat produk baru (dengan validasi)
    create(input) {
        const validated = Validator.validateFull(input);

        // Cek duplikat
        if (ProductsDB.getByBarcode(validated.barcode)) {
            throw new Error(`Barcode ${validated.barcode} sudah terdaftar`);
        }

        return {
            ...validated,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    },

    // Update produk (dengan validasi)
    update(barcode, updates) {
        const existing = ProductsDB.getByBarcode(barcode);
        if (!existing) throw new Error(`Produk ${barcode} tidak ditemukan`);

        // Gabung existing dengan updates
        const merged = { ...existing, ...updates };

        // Validasi
        const validated = Validator.validateFull(merged);

        // Kalau barcode berubah, cek duplikat
        if (validated.barcode !== barcode) {
            if (ProductsDB.getByBarcode(validated.barcode)) {
                throw new Error(`Barcode ${validated.barcode} sudah digunakan`);
            }
        }

        return {
            ...validated,
            createdAt: existing.createdAt,
            updatedAt: Date.now()
        };
    },

    // Clone produk
    clone(barcode) {
        const product = ProductsDB.getByBarcode(barcode);
        if (!product) throw new Error('Produk tidak ditemukan');

        return {
            ...product,
            barcode: BarcodeGen.generate(),
            nama: `${product.nama} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }
};

// ================================================================
// PART 5: SEARCH & FILTER
// ================================================================

const Search = {
    // Search produk
    search(keyword) {
        if (!keyword || keyword.trim() === '') {
            return ProductsDB.getAll();
        }
        const query = keyword.toLowerCase().trim();
        return ProductsDB.getAll().filter(p => {
            return (
                p.nama.toLowerCase().includes(query) ||
                p.barcode.toLowerCase().includes(query) ||
                (p.kategori && p.kategori.toLowerCase().includes(query))
            );
        });
    },

    // Filter by kategori
    byCategory(kategori) {
        if (!kategori || kategori === 'Semua') {
            return ProductsDB.getAll();
        }
        return ProductsDB.getAll().filter(p => p.kategori === kategori);
    },

    // Filter by stock status
    byStockStatus(status) {
        const all = ProductsDB.getAll();
        switch (status) {
            case 'low':
                return all.filter(p => p.stok < p.minStok && p.stok > 0);
            case 'out':
                return all.filter(p => p.stok <= 0);
            case 'ok':
                return all.filter(p => p.stok >= p.minStok);
            default:
                return all;
        }
    },

    // Filter by price range
    byPriceRange(min, max) {
        return ProductsDB.getAll().filter(p => {
            return p.hargaJual >= min && p.hargaJual <= max;
        });
    },

    // Advanced search
    advanced({ keyword, kategori, stockStatus, minPrice, maxPrice } = {}) {
        let results = ProductsDB.getAll();

        if (keyword) {
            results = this.search(keyword);
        }
        if (kategori && kategori !== 'Semua') {
            results = results.filter(p => p.kategori === kategori);
        }
        if (stockStatus) {
            if (stockStatus === 'low') {
                results = results.filter(p => p.stok < p.minStok && p.stok > 0);
            } else if (stockStatus === 'out') {
                results = results.filter(p => p.stok <= 0);
            } else if (stockStatus === 'ok') {
                results = results.filter(p => p.stok >= p.minStok);
            }
        }
        if (minPrice !== undefined) {
            results = results.filter(p => p.hargaJual >= minPrice);
        }
        if (maxPrice !== undefined) {
            results = results.filter(p => p.hargaJual <= maxPrice);
        }

        return results;
    }
};

// ================================================================
// PART 6: SORT
// ================================================================

const Sort = {
    // Sort produk
    sort(products, field = 'nama', direction = 'asc') {
        if (!PRODUCT.sortFields.includes(field)) {
            field = 'nama';
        }
        if (!PRODUCT.sortDirections.includes(direction)) {
            direction = 'asc';
        }

        const sorted = [...products];
        const multiplier = direction === 'asc' ? 1 : -1;

        sorted.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            // Handle undefined
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            // String comparison
            if (typeof valA === 'string') {
                return valA.toLowerCase().localeCompare(valB.toLowerCase()) * multiplier;
            }

            // Numeric comparison
            return (valA - valB) * multiplier;
        });

        return sorted;
    },

    // Sort by name
    byName(products) {
        return this.sort(products, 'nama', 'asc');
    },

    // Sort by price
    byPrice(products, direction = 'asc') {
        return this.sort(products, 'hargaJual', direction);
    },

    // Sort by stock
    byStock(products, direction = 'asc') {
        return this.sort(products, 'stok', direction);
    }
};

// ================================================================
// PART 7: PAGINATE
// ================================================================

const Paginate = {
    // Paginate array
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
// PART 8: PRODUCT FACADE (Main API)
// ================================================================

const Product = {
    // Sub-modules
    Validator,
    BarcodeGen,
    Builder,
    Search,
    Sort,
    Paginate,

    // Constants
    categories: PRODUCT.categories,
    PRODUCT,

    // ---- CRUD ----

    // Get all
    getAll() {
        return ProductsDB.getAll();
    },

    // Get by barcode
    getByBarcode(barcode) {
        return ProductsDB.getByBarcode(barcode);
    },

    // Get count
    getCount() {
        return ProductsDB.getAll().length;
    },

    // Add product
    add(input) {
        try {
            const product = Builder.create(input);
            ProductsDB.add(product);
            EventBus.emit('product:added', product);
            console.log(`✅ Produk ditambahkan: ${product.nama} (${product.barcode})`);
            return { success: true, product };
        } catch (err) {
            console.error('[Product] Add error:', err);
            return { success: false, error: err.message };
        }
    },

    // Update product
    update(barcode, updates) {
        try {
            const product = Builder.update(barcode, updates);
            ProductsDB.update(barcode, product);
            EventBus.emit('product:updated', product);
            console.log(`✅ Produk diupdate: ${product.nama}`);
            return { success: true, product };
        } catch (err) {
            console.error('[Product] Update error:', err);
            return { success: false, error: err.message };
        }
    },

    // Delete product
    delete(barcode) {
        try {
            const product = ProductsDB.getByBarcode(barcode);
            if (!product) throw new Error('Produk tidak ditemukan');
            ProductsDB.delete(barcode);
            EventBus.emit('product:deleted', { barcode, product });
            console.log(`✅ Produk dihapus: ${product.nama}`);
            return { success: true, product };
        } catch (err) {
            console.error('[Product] Delete error:', err);
            return { success: false, error: err.message };
        }
    },

    // Clone product
    clone(barcode) {
        try {
            const cloned = Builder.clone(barcode);
            ProductsDB.add(cloned);
            EventBus.emit('product:added', cloned);
            return { success: true, product: cloned };
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

    byCategory(kategori) {
        return Search.byCategory(kategori);
    },

    byStockStatus(status) {
        return Search.byStockStatus(status);
    },

    getLowStock() {
        return Search.byStockStatus('low');
    },

    getOutOfStock() {
        return Search.byStockStatus('out');
    },

    // ---- Sort & Paginate ----

    sort(products, field, direction) {
        return Sort.sort(products, field, direction);
    },

    paginate(items, page, perPage) {
        return Paginate.paginate(items, page, perPage);
    },

    // Get paginated + sorted
    getPage({ page = 1, perPage = 20, sortField = 'nama', sortDirection = 'asc', filter = {} } = {}) {
        let products = this.filter(filter);
        products = this.sort(products, sortField, sortDirection);
        return this.paginate(products, page, perPage);
    },

    // ---- Barcode ----

    generateBarcode() {
        return BarcodeGen.generate();
    },

    isBarcodeExists(barcode) {
        return BarcodeGen.exists(barcode);
    },

    // ---- Bulk operations ----

    // Bulk delete
    bulkDelete(barcodes) {
        const results = { success: [], failed: [] };
        for (const barcode of barcodes) {
            const result = this.delete(barcode);
            if (result.success) results.success.push(barcode);
            else results.failed.push({ barcode, error: result.error });
        }
        return results;
    },

    // Bulk update category
    bulkUpdateCategory(barcodes, kategori) {
        const results = { success: [], failed: [] };
        for (const barcode of barcodes) {
            const result = this.update(barcode, { kategori });
            if (result.success) results.success.push(barcode);
            else results.failed.push({ barcode, error: result.error });
        }
        return results;
    },

    // ---- Import/Export ----

    exportJSON() {
        return JSON.stringify(this.getAll(), null, 2);
    },

    importJSON(jsonString, { replace = false } = {}) {
        try {
            const products = JSON.parse(jsonString);
            if (!Array.isArray(products)) throw new Error('Format harus array');

            if (replace) {
                ProductsDB.save([]);
            }

            let imported = 0;
            let failed = 0;
            for (const product of products) {
                const result = this.add(product);
                if (result.success) imported++;
                else failed++;
            }

            return { success: true, imported, failed };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    exportCSV() {
        const products = this.getAll();
        const headers = ['barcode', 'nama', 'kategori', 'hargaJual', 'hargaModal', 'stok', 'minStok'];
        const rows = [headers.join(',')];
        for (const p of products) {
            rows.push([
                p.barcode,
                `"${p.nama}"`,
                p.kategori,
                p.hargaJual,
                p.hargaModal,
                p.stok,
                p.minStok
            ].join(','));
        }
        return rows.join('\n');
    },

    // ---- Stats ----

    getStats() {
        const products = this.getAll();
        const totalValue = products.reduce((sum, p) => sum + (p.hargaJual * p.stok), 0);
        const totalCost = products.reduce((sum, p) => sum + (p.hargaModal * p.stok), 0);
        const totalItems = products.reduce((sum, p) => sum + p.stok, 0);
        const lowStock = products.filter(p => p.stok < p.minStok && p.stok > 0).length;
        const outOfStock = products.filter(p => p.stok <= 0).length;

        // Category breakdown
        const byCategory = {};
        for (const p of products) {
            const kat = p.kategori || 'Lainnya';
            if (!byCategory[kat]) {
                byCategory[kat] = { count: 0, totalValue: 0, totalItems: 0 };
            }
            byCategory[kat].count++;
            byCategory[kat].totalValue += p.hargaJual * p.stok;
            byCategory[kat].totalItems += p.stok;
        }

        return {
            total: products.length,
            totalItems,
            totalValue,
            totalCost,
            potentialProfit: totalValue - totalCost,
            lowStock,
            outOfStock,
            ok: products.length - lowStock - outOfStock,
            byCategory
        };
    }
};

// ================================================================
// PART 9: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📦 Product module initialized');
    const count = Product.getCount();
    console.log(`   Total produk: ${count}`);
    console.log(`   Kategori: ${PRODUCT.categories.join(', ')}`);
    console.log('✅ Product ready');
    return true;
}

// ================================================================
// PART 10: EXPORT
// ================================================================

const ProductModule = {
    Product,
    Validator,
    BarcodeGen,
    Builder,
    Search,
    Sort,
    Paginate,
    PRODUCT,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Product = Product;
    window.ProductModule = ProductModule;
}

console.log('✅ product.js loaded');

export default ProductModule;
export { Product, Validator, BarcodeGen, Builder, Search, Sort, Paginate, initialize };

// ================================================================
// END OF PRODUCT — 500+ BARIS
// ================================================================