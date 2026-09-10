/* ================================================================
   ADMIN VIEW — FORM INLINE (NO MODAL)
   ================================================================ */

'use strict';

export class AdminView {
    constructor() {
        this.container = null;
        this.unsubscribeFns = [];
        this.eventsBound = false;
    }

    mount(container) {
        this.container = container;
        this.render();
        this.subscribeToState();
        this.bindEvents();
        this.renderDashboard();
        this.renderInventory();
        console.log('📊 AdminView mounted');
    }

    activate() {
        this.renderDashboard();
        this.renderInventory();
    }

    deactivate() {}

    destroy() {
        for (const fn of this.unsubscribeFns) {
            try { fn(); } catch (_) {}
        }
        this.unsubscribeFns = [];
        this.eventsBound = false;
        if (this.container) this.container.innerHTML = '';
    }

    render() {
        this.container.innerHTML = `
            <div style="padding: 24px; max-width: 1440px; margin: 0 auto;">

                <!-- DASHBOARD CARDS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="padding: 20px; background: #fff; border: 1px solid #e5e0d8; border-radius: 12px; border-left: 4px solid #2d4a3e;">
                        <div style="font-size: 12px; color: #8a8278; text-transform: uppercase; font-weight: 600;">Total Pendapatan</div>
                        <div style="font-size: 24px; font-weight: 700; margin-top: 8px;" id="totalRevenue">Rp 0</div>
                    </div>
                    <div style="padding: 20px; background: #fff; border: 1px solid #e5e0d8; border-radius: 12px; border-left: 4px solid #27ae60;">
                        <div style="font-size: 12px; color: #8a8278; text-transform: uppercase; font-weight: 600;">Total Transaksi</div>
                        <div style="font-size: 24px; font-weight: 700; margin-top: 8px;" id="totalTransactions">0</div>
                    </div>
                    <div style="padding: 20px; background: #fff; border: 1px solid #e5e0d8; border-radius: 12px; border-left: 4px solid #2d7a9e;">
                        <div style="font-size: 12px; color: #8a8278; text-transform: uppercase; font-weight: 600;">Keuntungan</div>
                        <div style="font-size: 24px; font-weight: 700; margin-top: 8px;" id="totalProfit">Rp 0</div>
                    </div>
                    <div style="padding: 20px; background: #fff; border: 1px solid #e5e0d8; border-radius: 12px; border-left: 4px solid #f39c12;">
                        <div style="font-size: 12px; color: #8a8278; text-transform: uppercase; font-weight: 600;">Low Stock</div>
                        <div style="font-size: 24px; font-weight: 700; margin-top: 8px;" id="lowStockCount">0</div>
                    </div>
                </div>

                <!-- FORM TAMBAH PRODUK — SELALU TERLIHAT -->
                <div style="padding: 24px; background: #fff; border: 1px solid #e5e0d8; border-radius: 12px; margin-bottom: 24px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700;">➕ Tambah Produk Baru</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Nama Produk *</label>
                            <input type="text" id="inputNama" placeholder="Contoh: Indomie Goreng" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Barcode (auto jika kosong)</label>
                            <input type="text" id="inputBarcode" placeholder="ATIKA000001" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Kategori *</label>
                            <select id="inputKategori" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;">
                                <option value="Makanan">Makanan</option>
                                <option value="Minuman">Minuman</option>
                                <option value="Snack">Snack</option>
                                <option value="Rokok">Rokok</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Harga Jual *</label>
                            <input type="number" id="inputHargaJual" placeholder="0" min="0" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Harga Modal *</label>
                            <input type="number" id="inputHargaModal" placeholder="0" min="0" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Stok Awal *</label>
                            <input type="number" id="inputStok" placeholder="0" min="0" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:13px;font-weight:600;color:#5a524a;">Min Stok</label>
                            <input type="number" id="inputMinStok" placeholder="5" min="0" value="5" style="padding:10px 14px;font-size:15px;border:1.5px solid #e5e0d8;border-radius:8px;background:#f8f6f3;font-family:inherit;box-sizing:border-box;" />
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end;">
                        <button id="btnResetForm" type="button" style="padding:12px 24px;font-size:14px;font-weight:600;background:transparent;color:#1c1a18;border:1.5px solid #e5e0d8;border-radius:8px;cursor:pointer;min-height:44px;">Reset</button>
                        <button id="btnSaveProduct" type="button" style="padding:12px 24px;font-size:14px;font-weight:600;background:#2d4a3e;color:#fff;border:none;border-radius:8px;cursor:pointer;min-height:44px;">💾 Simpan Produk</button>
                    </div>
                </div>

                <!-- INVENTORY TABLE -->
                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">📋 Inventory <span id="inventoryCount" style="font-size:14px;font-weight:400;color:#8a8278;">(0 produk)</span></h2>
                <div style="background:#fff;border:1px solid #e5e0d8;border-radius:12px;overflow:hidden;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8f6f3;">
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Barcode</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Nama</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Kategori</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Harga Jual</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Stok</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Status</th>
                                <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#8a8278;border-bottom:2px solid #e5e0d8;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody">
                            <tr><td colspan="7" style="text-align:center;padding:20px;color:#8a8278;">Memuat...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (this.eventsBound) return;
        this.eventsBound = true;

        const c = this.container;

        const saveBtn = c.querySelector('#btnSaveProduct');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveProduct());

        const resetBtn = c.querySelector('#btnResetForm');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetForm());

        // Auto-generate barcode on load
        setTimeout(() => this.resetForm(), 100);
    }

    resetForm() {
        const c = this.container;
        const nama = c.querySelector('#inputNama');
        const barcode = c.querySelector('#inputBarcode');
        const kategori = c.querySelector('#inputKategori');
        const hargaJual = c.querySelector('#inputHargaJual');
        const hargaModal = c.querySelector('#inputHargaModal');
        const stok = c.querySelector('#inputStok');
        const minStok = c.querySelector('#inputMinStok');

        if (nama) nama.value = '';
        if (barcode) barcode.value = window.Product ? window.Product.generateBarcode() : '';
        if (kategori) kategori.value = 'Makanan';
        if (hargaJual) hargaJual.value = '';
        if (hargaModal) hargaModal.value = '';
        if (stok) stok.value = '';
        if (minStok) minStok.value = '5';

        if (nama) nama.focus();
    }

    saveProduct() {
        const c = this.container;
        const nama = c.querySelector('#inputNama').value.trim();
        const barcode = c.querySelector('#inputBarcode').value.trim();
        const kategori = c.querySelector('#inputKategori').value;
        const hargaJual = parseFloat(c.querySelector('#inputHargaJual').value);
        const hargaModal = parseFloat(c.querySelector('#inputHargaModal').value);
        const stok = parseInt(c.querySelector('#inputStok').value);
        const minStok = parseInt(c.querySelector('#inputMinStok').value) || 5;

        if (!nama) { alert('Nama produk wajib diisi'); return; }
        if (!hargaJual || hargaJual <= 0) { alert('Harga jual wajib diisi'); return; }
        if (!hargaModal || hargaModal <= 0) { alert('Harga modal wajib diisi'); return; }
        if (isNaN(stok) || stok < 0) { alert('Stok wajib diisi'); return; }

        if (!window.Product) {
            alert('Modul Product belum tersedia');
            return;
        }

        const product = {
            barcode: barcode || window.Product.generateBarcode(),
            nama,
            kategori,
            hargaJual,
            hargaModal,
            stok,
            minStok
        };

        const result = window.Product.add(product);
        if (result.success) {
            alert('✅ Produk "' + nama + '" berhasil ditambahkan!');
            this.resetForm();
            this.renderInventory();
            this.renderDashboard();
        } else {
            alert('❌ ' + result.error);
        }
    }

    renderDashboard() {
        if (!this.container) return;
        const transactions = window.Database?.Transactions?.getAll() || [];
        let revenue = 0, profit = 0;
        for (const tx of transactions) {
            revenue += tx.totalJual || 0;
            profit += tx.netProfit || 0;
        }
        const lowStock = window.Product ? window.Product.getLowStock() : [];

        const setText = (id, val) => {
            const el = this.container.querySelector(id);
            if (el) el.textContent = val;
        };

        setText('#totalRevenue', 'Rp ' + revenue.toLocaleString('id-ID'));
        setText('#totalTransactions', transactions.length);
        setText('#totalProfit', 'Rp ' + profit.toLocaleString('id-ID'));
        setText('#lowStockCount', lowStock.length);
    }

    renderInventory() {
        if (!this.container) return;
        const tbody = this.container.querySelector('#inventoryBody');
        if (!tbody) return;

        const products = window.Product ? window.Product.getAll() : [];
        const countEl = this.container.querySelector('#inventoryCount');
        if (countEl) countEl.textContent = '(' + products.length + ' produk)';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#8a8278;">Belum ada produk</td></tr>';
            return;
        }

        let html = '';
        for (const p of products) {
            const isLow = p.stok < p.minStok;
            const isOut = p.stok <= 0;
            const status = isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman';
            const bgColor = isOut ? '#fdedec' : isLow ? '#fef9e7' : '#eafaf1';
            const textColor = isOut ? '#922b21' : isLow ? '#b9770e' : '#1e8449';

            html += '<tr style="border-bottom:1px solid #f0ede8;">';
            html += '<td style="padding:12px 16px;"><code style="font-family:monospace;font-size:12px;padding:3px 8px;background:#f0ede8;border-radius:6px;">' + p.barcode + '</code></td>';
            html += '<td style="padding:12px 16px;"><strong>' + p.nama + '</strong></td>';
            html += '<td style="padding:12px 16px;">' + (p.kategori || '-') + '</td>';
            html += '<td style="padding:12px 16px;">Rp ' + p.hargaJual.toLocaleString('id-ID') + '</td>';
            html += '<td style="padding:12px 16px;">' + p.stok + '</td>';
            html += '<td style="padding:12px 16px;"><span style="display:inline-block;padding:4px 10px;font-size:12px;font-weight:600;border-radius:9999px;background:' + bgColor + ';color:' + textColor + ';">' + status + '</span></td>';
            html += '<td style="padding:12px 16px;">';
            html += '<button class="btn-edit" data-barcode="' + p.barcode + '" type="button" style="width:36px;height:36px;border-radius:8px;background:transparent;border:1px solid #e5e0d8;cursor:pointer;margin-right:6px;">✏️</button>';
            html += '<button class="btn-delete" data-barcode="' + p.barcode + '" type="button" style="width:36px;height:36px;border-radius:8px;background:transparent;border:1px solid #e5e0d8;cursor:pointer;">🗑️</button>';
            html += '</td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;

        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editProduct(btn.dataset.barcode));
        });
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteProduct(btn.dataset.barcode));
        });
    }

    editProduct(barcode) {
        const product = window.Product?.getByBarcode(barcode);
        if (!product) { alert('Produk tidak ditemukan'); return; }

        const newNama = prompt('Nama produk:', product.nama);
        if (newNama === null) return;

        const newHargaJual = prompt('Harga jual:', product.hargaJual);
        if (newHargaJual === null) return;

        const newStok = prompt('Stok:', product.stok);
        if (newStok === null) return;

        const updates = {
            nama: newNama.trim(),
            hargaJual: parseFloat(newHargaJual),
            stok: parseInt(newStok)
        };

        const result = window.Product.update(barcode, updates);
        if (result.success) {
            alert('✅ Produk diupdate!');
            this.renderInventory();
        } else {
            alert('❌ ' + result.error);
        }
    }

    deleteProduct(barcode) {
        const product = window.Product?.getByBarcode(barcode);
        if (!product) return;

        if (!confirm('Hapus produk "' + product.nama + '"?')) return;

        const result = window.Product.delete(barcode);
        if (result.success) {
            alert('✅ Produk dihapus!');
            this.renderInventory();
            this.renderDashboard();
        } else {
            alert('❌ ' + result.error);
        }
    }

    subscribeToState() {
        if (window.State) {
            const unsub1 = window.State.subscribe('products:updated', () => {
                this.renderInventory();
            });
            const unsub2 = window.State.subscribe('transaction:added', () => {
                this.renderDashboard();
            });
            this.unsubscribeFns.push(unsub1, unsub2);
        }
    }
}

export default AdminView;