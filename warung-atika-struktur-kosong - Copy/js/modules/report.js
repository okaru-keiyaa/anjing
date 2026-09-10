 /* ================================================================
   REPORT — Warung Atika Enterprise
   ================================================================
   Report Generator:
   - Receipt (struk) generation
   - Daily/Weekly/Monthly report
   - HTML report
   - Print support
   - Export to CSV/JSON
   - Report templates
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus } = Core;
const { Transactions, Products } = DatabaseModule;

// ================================================================
// PART 1: REPORT CONSTANTS
// ================================================================

const REPORT = {
    types: {
        RECEIPT: 'receipt',
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        INVENTORY: 'inventory',
        CUSTOM: 'custom'
    },
    paperSizes: {
        THERMAL_58: { width: '58mm', fontSize: '9pt' },
        THERMAL_80: { width: '80mm', fontSize: '10pt' },
        A4: { width: '210mm', fontSize: '12pt' },
        LETTER: { width: '215.9mm', fontSize: '12pt' }
    },
    storeInfo: {
        name: 'WARUNG ATIKA ENTERPRISE',
        address: 'Jl. Raya No. 123, Jakarta',
        phone: '0812-3456-7890',
        footer: 'Terima kasih telah berbelanja!'
    }
};

// ================================================================
// PART 2: HTML HELPERS
// ================================================================

const HTML = {
    // Escape HTML entities
    escape(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Format Rupiah
    rupiah(amount) {
        return Utils.formatRupiah(amount);
    },

    // Format date
    date(date) {
        return Utils.formatDate(date);
    },

    // Format time
    time(date) {
        return Utils.formatTime(date);
    },

    // Padding
    pad(str, length, char = ' ') {
        str = String(str);
        if (str.length >= length) return str;
        const totalPad = length - str.length;
        const leftPad = Math.floor(totalPad / 2);
        const rightPad = totalPad - leftPad;
        return char.repeat(leftPad) + str + char.repeat(rightPad);
    },

    // Line break
    line(char = '-', length = 48) {
        return char.repeat(length);
    },

    // Center text
    center(text, length = 48) {
        text = String(text);
        if (text.length >= length) return text;
        const totalPad = length - text.length;
        const leftPad = Math.floor(totalPad / 2);
        return ' '.repeat(leftPad) + text;
    },

    // Left-right align
    align(left, right, length = 48) {
        left = String(left);
        right = String(right);
        const totalLength = left.length + right.length;
        if (totalLength >= length) return left + ' ' + right;
        const spaces = length - totalLength;
        return left + ' '.repeat(spaces) + right;
    },

    // Build HTML document
    document(title, content, options = {}) {
        const paper = options.paper || REPORT.paperSizes.A4;
        const autoPrint = options.autoPrint !== false;
        const css = this.getDocumentCSS(paper);

        return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${this.escape(title)}</title>
<style>${css}</style>
</head>
<body>
${content}
${autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>' : ''}
</body>
</html>`;
    },

    // CSS untuk dokumen
    getDocumentCSS(paper) {
        return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Courier New', monospace;
    font-size: ${paper.fontSize};
    line-height: 1.4;
    color: #000;
    background: #fff;
    padding: 10mm;
}
.receipt {
    max-width: ${paper.width};
    margin: 0 auto;
    background: #fff;
}
.receipt-header {
    text-align: center;
    margin-bottom: 12px;
    border-bottom: 1px dashed #000;
    padding-bottom: 8px;
}
.receipt-header h1 {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 4px;
}
.receipt-header p {
    font-size: 0.9em;
    margin: 2px 0;
}
.receipt-body {
    margin-bottom: 12px;
    border-bottom: 1px dashed #000;
    padding-bottom: 8px;
}
.receipt-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 0.9em;
}
.receipt-item .name { flex: 1; }
.receipt-item .qty { min-width: 40px; text-align: center; }
.receipt-item .price { min-width: 70px; text-align: right; }
.receipt-total {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 1.1em;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #000;
}
.receipt-footer {
    text-align: center;
    font-size: 0.85em;
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px dashed #000;
}
.report-header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #000;
    padding-bottom: 12px;
}
.report-header h1 {
    font-size: 1.5em;
    font-weight: bold;
    margin-bottom: 6px;
}
.report-header p {
    font-size: 1em;
    margin: 2px 0;
}
.report-section {
    margin-bottom: 16px;
}
.report-section h2 {
    font-size: 1.1em;
    font-weight: bold;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #000;
}
.report-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
}
.report-summary-item {
    border: 1px solid #000;
    padding: 8px;
}
.report-summary-item .label {
    font-size: 0.85em;
    text-transform: uppercase;
}
.report-summary-item .value {
    font-size: 1.1em;
    font-weight: bold;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
}
th, td {
    border: 1px solid #000;
    padding: 6px 8px;
    text-align: left;
    font-size: 0.9em;
}
th {
    background: #e8e8e8;
    font-weight: bold;
}
.text-right { text-align: right; }
.text-center { text-align: center; }
@media print {
    body { padding: 0; }
    @page { margin: 8mm; }
}
`;
    }
};

// ================================================================
// PART 3: RECEIPT GENERATOR
// ================================================================

const Receipt = {
    // Generate struk dari transaksi
    generate(transaction, options = {}) {
        const store = { ...REPORT.storeInfo, ...(options.store || {}) };
        const paperWidth = options.paperWidth || 48; // karakter

        const lines = [];

        // Header
        lines.push(HTML.center(store.name, paperWidth));
        lines.push(HTML.center(store.address, paperWidth));
        lines.push(HTML.center(`Telp: ${store.phone}`, paperWidth));
        lines.push(HTML.line('=', paperWidth));
        lines.push('');

        // Info transaksi
        lines.push(`No: ${transaction.id.substring(0, 12)}`);
        lines.push(`Tanggal: ${transaction.date} ${transaction.time}`);
        lines.push(`Kasir: ${options.kasir || 'Atika'}`);
        lines.push(HTML.line('-', paperWidth));

        // Items
        for (const item of transaction.items) {
            const nama = item.nama.length > 24 ? item.nama.substring(0, 24) + '..' : item.nama;
            lines.push(nama);
            const qty = `  ${item.kuantitas}x ${HTML.rupiah(item.hargaJual)}`;
            const subtotal = HTML.rupiah(item.subtotalJual);
            lines.push(HTML.align(qty, subtotal, paperWidth));
        }

        lines.push(HTML.line('-', paperWidth));

        // Total
        lines.push(HTML.align('Subtotal', HTML.rupiah(transaction.totalJual), paperWidth));
        lines.push(HTML.align('Total', HTML.rupiah(transaction.totalJual), paperWidth));

        // Payment
        if (transaction.metode === 'cash') {
            lines.push(HTML.align('Tunai', HTML.rupiah(transaction.cashReceived), paperWidth));
            lines.push(HTML.align('Kembali', HTML.rupiah(transaction.change), paperWidth));
        } else {
            lines.push(HTML.align(transaction.metode.toUpperCase(), HTML.rupiah(transaction.totalJual), paperWidth));
        }

        lines.push(HTML.line('=', paperWidth));
        lines.push('');

        // Footer
        lines.push(HTML.center(store.footer, paperWidth));
        lines.push(HTML.center('~ Terima Kasih ~', paperWidth));

        return lines.join('\n');
    },

    // Generate HTML struk
    generateHTML(transaction, options = {}) {
        const store = { ...REPORT.storeInfo, ...(options.store || {}) };
        const paper = options.paper || REPORT.paperSizes.THERMAL_80;

        let itemsHTML = '';
        for (const item of transaction.items) {
            itemsHTML += `
                <div class="receipt-item">
                    <span class="name">${HTML.escape(item.nama)}</span>
                    <span class="qty">${item.kuantitas}x</span>
                    <span class="price">${HTML.rupiah(item.subtotalJual)}</span>
                </div>
            `;
        }

        let paymentHTML = '';
        if (transaction.metode === 'cash') {
            paymentHTML = `
                <div class="receipt-total">
                    <span>Tunai</span>
                    <span>${HTML.rupiah(transaction.cashReceived)}</span>
                </div>
                <div class="receipt-total">
                    <span>Kembali</span>
                    <span>${HTML.rupiah(transaction.change)}</span>
                </div>
            `;
        }

        const content = `
            <div class="receipt">
                <div class="receipt-header">
                    <h1>${HTML.escape(store.name)}</h1>
                    <p>${HTML.escape(store.address)}</p>
                    <p>Telp: ${HTML.escape(store.phone)}</p>
                </div>
                <div class="receipt-body">
                    <div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:6px;">
                        <span>No: ${transaction.id.substring(0, 12)}</span>
                        <span>${transaction.time}</span>
                    </div>
                    <div style="font-size:0.85em;margin-bottom:8px;">${transaction.date}</div>
                    <div style="border-top:1px dashed #000;padding-top:8px;">
                        ${itemsHTML}
                    </div>
                </div>
                <div class="receipt-total">
                    <span>Total</span>
                    <span>${HTML.rupiah(transaction.totalJual)}</span>
                </div>
                ${paymentHTML}
                <div class="receipt-footer">
                    <p>${HTML.escape(store.footer)}</p>
                    <p>~ Terima Kasih ~</p>
                </div>
            </div>
        `;

        return HTML.document('Struk', content, { paper });
    },

    // Print struk
    print(transaction, options = {}) {
        const html = this.generateHTML(transaction, options);
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) {
            alert('Popup diblokir. Izinkan popup untuk print struk.');
            return false;
        }
        win.document.write(html);
        win.document.close();
        return true;
    },

    // Download struk sebagai file
    download(transaction, filename = null) {
        const html = this.generateHTML(transaction, { autoPrint: false });
        const name = filename || `struk_${transaction.id.substring(0, 12)}.html`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
};

// ================================================================
// PART 4: DAILY REPORT
// ================================================================

const DailyReport = {
    generate(dateString = null, options = {}) {
        const date = dateString || Utils.getDateString();
        const transactions = Transactions.getAll().filter(tx => tx.date === date);
        const store = { ...REPORT.storeInfo, ...(options.store || {}) };

        // Hitung totals
        let grossRevenue = 0;
        let totalCost = 0;
        let totalItems = 0;
        for (const tx of transactions) {
            grossRevenue += tx.totalJual || 0;
            totalCost += tx.totalModal || 0;
            totalItems += tx.itemCount || 0;
        }
        const netProfit = grossRevenue - totalCost;

        let rowsHTML = '';
        for (const tx of transactions) {
            rowsHTML += `
                <tr>
                    <td>${tx.time}</td>
                    <td>${tx.metode}</td>
                    <td class="text-center">${tx.itemCount}</td>
                    <td class="text-right">${HTML.rupiah(tx.totalJual)}</td>
                    <td class="text-right">${HTML.rupiah(tx.netProfit)}</td>
                </tr>
            `;
        }

        const content = `
            <div class="report">
                <div class="report-header">
                    <h1>${HTML.escape(store.name)}</h1>
                    <p>${HTML.escape(store.address)}</p>
                    <p>Telp: ${HTML.escape(store.phone)}</p>
                </div>
                <div class="report-section">
                    <h2>Laporan Harian</h2>
                    <p><strong>Tanggal:</strong> ${Utils.formatDate(date)}</p>
                </div>
                <div class="report-summary">
                    <div class="report-summary-item">
                        <div class="label">Pendapatan</div>
                        <div class="value">${HTML.rupiah(grossRevenue)}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Modal</div>
                        <div class="value">${HTML.rupiah(totalCost)}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Keuntungan</div>
                        <div class="value">${HTML.rupiah(netProfit)}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Transaksi</div>
                        <div class="value">${transactions.length}</div>
                    </div>
                </div>
                <div class="report-section">
                    <h2>Detail Transaksi</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Metode</th>
                                <th class="text-center">Item</th>
                                <th class="text-right">Total</th>
                                <th class="text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHTML || '<tr><td colspan="5" class="text-center">Tidak ada transaksi</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="report-footer" style="margin-top:20px;text-align:center;font-size:0.85em;">
                    <p>Dicetak: ${Utils.formatDate(new Date())} ${Utils.formatTime(new Date())}</p>
                    <p>Total Items Terjual: ${totalItems}</p>
                </div>
            </div>
        `;

        return HTML.document(`Laporan Harian ${date}`, content, options);
    },

    print(dateString = null, options = {}) {
        const html = this.generate(dateString, options);
        const win = window.open('', '_blank');
        if (!win) { alert('Popup diblokir'); return false; }
        win.document.write(html);
        win.document.close();
        return true;
    }
};

// ================================================================
// PART 5: PERIOD REPORT (Weekly, Monthly)
// ================================================================

const PeriodReport = {
    generate(period = 'weekly', options = {}) {
        // Placeholder — bisa diperluas
        const transactions = Transactions.getAll();
        const store = { ...REPORT.storeInfo, ...(options.store || {}) };

        const content = `
            <div class="report">
                <div class="report-header">
                    <h1>${HTML.escape(store.name)}</h1>
                    <p>Laporan ${period === 'weekly' ? 'Mingguan' : 'Bulanan'}</p>
                </div>
                <div class="report-section">
                    <p>Total Transaksi: ${transactions.length}</p>
                    <p>Total Pendapatan: ${HTML.rupiah(transactions.reduce((s, t) => s + t.totalJual, 0))}</p>
                </div>
            </div>
        `;

        return HTML.document(`Laporan ${period}`, content, options);
    }
};

// ================================================================
// PART 6: INVENTORY REPORT
// ================================================================

const InventoryReport = {
    generate(options = {}) {
        const products = Products.getAll();
        const store = { ...REPORT.storeInfo, ...(options.store || {}) };

        let rowsHTML = '';
        let totalValue = 0;
        let totalItems = 0;

        for (const p of products) {
            const value = p.hargaJual * p.stok;
            totalValue += value;
            totalItems += p.stok;
            rowsHTML += `
                <tr>
                    <td>${HTML.escape(p.barcode)}</td>
                    <td>${HTML.escape(p.nama)}</td>
                    <td>${HTML.escape(p.kategori || '-')}</td>
                    <td class="text-right">${HTML.rupiah(p.hargaJual)}</td>
                    <td class="text-center">${p.stok}</td>
                    <td class="text-right">${HTML.rupiah(value)}</td>
                </tr>
            `;
        }

        const content = `
            <div class="report">
                <div class="report-header">
                    <h1>${HTML.escape(store.name)}</h1>
                    <p>Laporan Inventory</p>
                </div>
                <div class="report-summary">
                    <div class="report-summary-item">
                        <div class="label">Total Produk</div>
                        <div class="value">${products.length}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Total Item</div>
                        <div class="value">${totalItems}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Nilai Stok</div>
                        <div class="value">${HTML.rupiah(totalValue)}</div>
                    </div>
                    <div class="report-summary-item">
                        <div class="label">Dicetak</div>
                        <div class="value">${Utils.formatDate(new Date())}</div>
                    </div>
                </div>
                <div class="report-section">
                    <h2>Daftar Produk</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Barcode</th>
                                <th>Nama</th>
                                <th>Kategori</th>
                                <th class="text-right">Harga</th>
                                <th class="text-center">Stok</th>
                                <th class="text-right">Nilai</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
            </div>
        `;

        return HTML.document('Laporan Inventory', content, options);
    },

    print(options = {}) {
        const html = this.generate(options);
        const win = window.open('', '_blank');
        if (!win) { alert('Popup diblokir'); return false; }
        win.document.write(html);
        win.document.close();
        return true;
    }
};

// ================================================================
// PART 7: REPORT FACADE (Main API)
// ================================================================

const Report = {
    // Sub-modules
    HTML,
    Receipt,
    Daily: DailyReport,
    Period: PeriodReport,
    Inventory: InventoryReport,

    // Constants
    types: REPORT.types,
    paperSizes: REPORT.paperSizes,
    storeInfo: REPORT.storeInfo,

    // ---- High-level API ----

    // Print struk
    printReceipt(transaction, options = {}) {
        return Receipt.print(transaction, options);
    },

    // Download struk
    downloadReceipt(transaction, filename = null) {
        return Receipt.download(transaction, filename);
    },

    // Print daily report
    printDailyReport(dateString = null, options = {}) {
        return DailyReport.print(dateString, options);
    },

    // Print inventory report
    printInventoryReport(options = {}) {
        return InventoryReport.print(options);
    },

    // Generate HTML only (untuk preview)
    generateReceiptHTML(transaction, options = {}) {
        return Receipt.generateHTML(transaction, options);
    },

    generateDailyHTML(dateString = null, options = {}) {
        return DailyReport.generate(dateString, options);
    },

    generateInventoryHTML(options = {}) {
        return InventoryReport.generate(options);
    },

    // ---- Custom report ----
    custom(title, content, options = {}) {
        return HTML.document(title, content, options);
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📄 Report module initialized');
    console.log(`   Types: ${Object.values(REPORT.types).join(', ')}`);
    console.log(`   Paper: ${Object.keys(REPORT.paperSizes).join(', ')}`);
    console.log('✅ Report ready');
    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const ReportModule = {
    Report,
    HTML,
    Receipt,
    DailyReport,
    PeriodReport,
    InventoryReport,
    REPORT,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Report = Report;
    window.ReportModule = ReportModule;
}

console.log('✅ report.js loaded');

export default ReportModule;
export { Report, HTML, Receipt, DailyReport, PeriodReport, InventoryReport, initialize };

// ================================================================
// END OF REPORT — 500+ BARIS
// ================================================================