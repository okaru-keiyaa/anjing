 /* ================================================================
   CASHIER VIEW — Warung Atika Enterprise
   ================================================================
   View Controller untuk halaman Kasir
   - Render produk
   - Render cart
   - Handle barcode scan
   - Handle checkout
   Total: 500+ baris
   ================================================================ */

'use strict';

export class CashierView {
    constructor() {
        this.container = null;
        this.unsubscribeFns = [];
        this.currentCategory = 'Semua';
        this.isProcessing = false;
    }

    // ============================================================
    // LIFECYCLE
    // ============================================================

    mount(container) {
        this.container = container;
        this.render();
        this.bindEvents();
        this.subscribeToState();
        this.renderProducts();
        this.renderCart();
        console.log('🏪 CashierView mounted');
    }

    activate() {
        this.renderProducts();
        this.renderCart();
        console.log('🏪 CashierView activated');
    }

    deactivate() {
        console.log('🏪 CashierView deactivated');
    }

    destroy() {
        // Unsubscribe semua
        for (const fn of this.unsubscribeFns) {
            try { fn(); } catch (_) {}
        }
        this.unsubscribeFns = [];
        if (this.container) this.container.innerHTML = '';
        console.log('🏪 CashierView destroyed');
    }

    // ============================================================
    // RENDER
    // ============================================================

    render() {
        this.container.innerHTML = `
            <div class="cashier-container">
                <div class="products-column">
                    <div class="product-input-area">
                        <input type="text" id="barcodeInput" 
                            placeholder="Cari produk atau scan barcode..." 
                            autofocus autocomplete="off" />
                        <button class="btn btn-primary scan-btn" id="scanBtn">Scan</button>
                    </div>

                    <div class="category-filter" id="categoryFilter">
                        <button class="active" data-cat="Semua">Semua</button>
                        <button data-cat="Makanan">Makanan</button>
                        <button data-cat="Minuman">Minuman</button>
                        <button data-cat="Snack">Snack</button>
                        <button data-cat="Rokok">Rokok</button>
                        <button data-cat="Lainnya">Lainnya</button>
                    </div>

                    <div class="product-grid" id="productGrid">
                        <div class="empty-state">
                            <p>Memuat produk...</p>
                        </div>
                    </div>
                </div>

                <div class="cart-column">
                    <div class="cart-panel">
                        <div class="cart-header">
                            <h3>Keranjang</h3>
                            <span class="cart-count" id="cartCount">0 item</span>
                            <button class="cart-clear" id="clearCartBtn">✕</button>
                        </div>

                        <div class="cart-items" id="cartItems">
                            <div class="cart-empty">
                                <p class="empty-text">Keranjang kosong</p>
                            </div>
                        </div>

                        <div class="checkout-area">
                            <div class="totals">
                                <div class="total-item">
                                    <span class="label">Subtotal</span>
                                    <span class="value" id="subtotal">Rp 0</span>
                                </div>
                                <div class="total-item total-grand">
                                    <span class="label">Total</span>
                                    <span class="value" id="total">Rp 0</span>
                                </div>
                                <div class="total-item">
                                    <span class="label">Item</span>
                                    <span class="value" id="itemCount">0</span>
                                </div>
                            </div>

                            <div class="cash-input-group">
                                <label for="cashInput">Uang Diterima</label>
                                <div class="cash-input-row">
                                    <input type="number" id="cashInput" placeholder="0" />
                                    <span class="change-display" id="changeDisplay">Rp 0</span>
                                </div>
                            </div>

                            <div class="cash-shortcuts" id="cashShortcuts">
                                <button class="cash-exact" data-value="exact">Uang Pas</button>
                                <button data-value="10000">10.000</button>
                                <button data-value="20000">20.000</button>
                                <button data-value="50000">50.000</button>
                                <button data-value="100000">100.000</button>
                            </div>

                            <div class="checkout-actions">
                                <button class="btn btn-secondary" id="cancelBtn">Batal</button>
                                <button class="btn btn-success btn-checkout" id="checkoutBtn" disabled>Bayar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // RENDER PRODUCTS
    // ============================================================

    renderProducts() {
        const grid = this.container.querySelector('#productGrid');
        if (!grid) return;

        const products = window.Product ? window.Product.getAll() : [];
        const filtered = this.currentCategory === 'Semua'
            ? products
            : products.filter(p => p.kategori === this.currentCategory);

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>Tidak ada produk</p></div>';
            return;
        }

        let html = '';
        for (const p of filtered) {
            const isLow = p.stok < p.minStok;
            html += `
                <div class="product-item ${isLow ? 'low-stock' : ''}" 
                     data-barcode="${p.barcode}"
                     role="button"
                     tabindex="0">
                    <span class="product-name">${p.nama}</span>
                    <span class="product-price">Rp ${p.hargaJual.toLocaleString('id-ID')}</span>
                    <span class="product-stock ${isLow ? 'low' : ''}">Stok: ${p.stok}</span>
                </div>
            `;
        }
        grid.innerHTML = html;

        // Event listener
        grid.querySelectorAll('.product-item').forEach(el => {
            el.addEventListener('click', () => {
                this.addToCart(el.dataset.barcode);
            });
        });
    }

    // ============================================================
    // RENDER CART
    // ============================================================

    renderCart() {
        const container = this.container.querySelector('#cartItems');
        const countEl = this.container.querySelector('#cartCount');
        if (!container) return;

        const cart = window.State ? window.State.getCart() : [];

        if (cart.length === 0) {
            container.innerHTML = '<div class="cart-empty"><p class="empty-text">Keranjang kosong</p></div>';
            if (countEl) countEl.textContent = '0 item';
            this.updateTotals();
            return;
        }

        let html = '';
        for (const item of cart) {
            html += `
                <div class="cart-item" data-barcode="${item.barcode}">
                    <span class="item-name">${item.nama}</span>
                    <div class="item-qty">
                        <button class="qty-minus" data-barcode="${item.barcode}">−</button>
                        <span class="qty-number">${item.kuantitas}</span>
                        <button class="qty-plus" data-barcode="${item.barcode}">+</button>
                    </div>
                    <span class="item-subtotal">Rp ${item.subtotalJual.toLocaleString('id-ID')}</span>
                    <button class="item-remove" data-barcode="${item.barcode}">✕</button>
                </div>
            `;
        }
        container.innerHTML = html;

        const totalCount = cart.reduce((s, i) => s + i.kuantitas, 0);
        if (countEl) countEl.textContent = `${totalCount} item`;

        // Event listeners
        container.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => this.updateQty(btn.dataset.barcode, -1));
        });
        container.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => this.updateQty(btn.dataset.barcode, 1));
        });
        container.querySelectorAll('.item-remove').forEach(btn => {
            btn.addEventListener('click', () => this.removeItem(btn.dataset.barcode));
        });

        this.updateTotals();
    }

    // ============================================================
    // UPDATE TOTALS
    // ============================================================

    updateTotals() {
        const total = window.State ? window.State.getCartTotal() : 0;
        const itemCount = window.State ? window.State.getCartItemCount() : 0;

        const subtotalEl = this.container.querySelector('#subtotal');
        const totalEl = this.container.querySelector('#total');
        const itemCountEl = this.container.querySelector('#itemCount');
        const checkoutBtn = this.container.querySelector('#checkoutBtn');

        if (subtotalEl) subtotalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
        if (totalEl) totalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
        if (itemCountEl) itemCountEl.textContent = itemCount;
        if (checkoutBtn) checkoutBtn.disabled = itemCount === 0;
    }

    // ============================================================
    // CART ACTIONS
    // ============================================================

    addToCart(barcode) {
        try {
            if (window.State) {
                window.State.addToCart(barcode);
                if (window.Audio) window.Audio.beep();
                const input = this.container.querySelector('#barcodeInput');
                if (input) { input.value = ''; input.focus(); }
            }
        } catch (err) {
            alert(err.message);
        }
    }

    updateQty(barcode, delta) {
        try {
            if (window.State) window.State.updateQuantity(barcode, delta);
        } catch (err) {
            alert(err.message);
        }
    }

    removeItem(barcode) {
        if (window.State) window.State.removeFromCart(barcode);
    }

    clearCart() {
        if (window.State) window.State.clearCart();
    }

    // ============================================================
    // CHECKOUT
    // ============================================================

    async processCheckout() {
        if (this.isProcessing) return;

        const cashInput = this.container.querySelector('#cashInput');
        const cash = parseFloat(cashInput?.value) || 0;
        const total = window.State ? window.State.getCartTotal() : 0;

        if (cash < total) {
            alert('Uang kurang!');
            return;
        }

        this.isProcessing = true;

        try {
            const cart = window.State.getCart();
            const transaction = {
                id: this.generateId(),
                timestamp: Date.now(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('id-ID'),
                items: cart,
                totalJual: total,
                totalModal: window.State.getCartModalTotal(),
                netProfit: total - window.State.getCartModalTotal(),
                itemCount: window.State.getCartItemCount(),
                metode: 'cash',
                cashReceived: cash,
                change: cash - total,
                status: 'success'
            };

            // Save transaction
            if (window.Database?.Transactions) {
                window.Database.Transactions.add(transaction);
            }

            // Decrement stock
            if (window.Inventory) {
                window.Inventory.processSale(cart);
            }

            // Clear cart
            window.State.clearCart();

            if (window.Audio) window.Audio.success();

            alert(`✅ Transaksi berhasil!\nKembalian: Rp ${(cash - total).toLocaleString('id-ID')}`);

            if (cashInput) cashInput.value = '';
            this.updateChange();
        } catch (err) {
            alert(`❌ Gagal: ${err.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    generateId() {
        return 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    // ============================================================
    // CHANGE CALCULATOR
    // ============================================================

    updateChange() {
        const cashInput = this.container.querySelector('#cashInput');
        const changeEl = this.container.querySelector('#changeDisplay');
        if (!cashInput || !changeEl) return;

        const cash = parseFloat(cashInput.value) || 0;
        const total = window.State ? window.State.getCartTotal() : 0;
        const change = cash - total;

        if (cash === 0) {
            changeEl.textContent = 'Rp 0';
            changeEl.className = 'change-display';
        } else if (change >= 0) {
            changeEl.textContent = `Kembali Rp ${change.toLocaleString('id-ID')}`;
            changeEl.className = 'change-display positive';
        } else {
            changeEl.textContent = `Kurang Rp ${Math.abs(change).toLocaleString('id-ID')}`;
            changeEl.className = 'change-display negative';
        }
    }

    // ============================================================
    // EVENTS
    // ============================================================

    bindEvents() {
        const c = this.container;

        // Barcode input
        const barcodeInput = c.querySelector('#barcodeInput');
        if (barcodeInput) {
            barcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = barcodeInput.value.trim();
                    if (val) this.addToCart(val);
                }
            });
        }

        // Scan button
        const scanBtn = c.querySelector('#scanBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                const barcode = prompt('Masukkan barcode:');
                if (barcode) this.addToCart(barcode);
            });
        }

        // Category filter
        const catFilter = c.querySelector('#categoryFilter');
        if (catFilter) {
            catFilter.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                catFilter.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
                this.renderProducts();
            });
        }

        // Clear cart
        const clearBtn = c.querySelector('#clearCartBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (window.State.getCart().length === 0) return;
                if (confirm('Kosongkan keranjang?')) this.clearCart();
            });
        }

        // Cash input
        const cashInput = c.querySelector('#cashInput');
        if (cashInput) {
            cashInput.addEventListener('input', () => this.updateChange());
        }

        // Cash shortcuts
        const shortcuts = c.querySelector('#cashShortcuts');
        if (shortcuts) {
            shortcuts.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const val = btn.dataset.value;
                let amount = 0;
                if (val === 'exact') {
                    amount = window.State.getCartTotal();
                } else {
                    amount = parseInt(val);
                }
                if (cashInput) {
                    cashInput.value = amount;
                    this.updateChange();
                }
            });
        }

        // Cancel
        const cancelBtn = c.querySelector('#cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (window.State.getCart().length === 0) return;
                if (confirm('Batalkan transaksi?')) {
                    this.clearCart();
                    if (cashInput) cashInput.value = '';
                    this.updateChange();
                }
            });
        }

        // Checkout
        const checkoutBtn = c.querySelector('#checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.processCheckout());
        }
    }

    // ============================================================
    // SUBSCRIBE
    // ============================================================

    subscribeToState() {
        if (window.State) {
            const unsub1 = window.State.subscribe('cart:updated', () => {
                this.renderCart();
            });
            const unsub2 = window.State.subscribe('products:updated', () => {
                this.renderProducts();
            });
            this.unsubscribeFns.push(unsub1, unsub2);
        }
    }
}

export default CashierView;