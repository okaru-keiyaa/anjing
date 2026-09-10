 /* ================================================================
   ANALYTICS — Warung Atika Enterprise
   ================================================================
   Analytics Engine berbasis Transaction Ledger:
   - Daily report
   - Weekly report
   - Monthly report
   - Yearly report
   - Profit calculation
   - Top products
   - Payment method breakdown
   - Hourly analysis
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';
import DatabaseModule from '../core/database.js';

const { CONFIG, Utils, EventBus } = Core;
const { Transactions, Products } = DatabaseModule;

// ================================================================
// PART 1: ANALYTICS CONSTANTS
// ================================================================

const ANALYTICS = {
    periods: {
        TODAY: 'today',
        YESTERDAY: 'yesterday',
        WEEK: 'week',
        MONTH: 'month',
        YEAR: 'year',
        ALL: 'all',
        CUSTOM: 'custom'
    },
    topProductsLimit: 10,
    maxTransactionsPerReport: 1000
};

// ================================================================
// PART 2: DATE HELPERS
// ================================================================

const DateHelper = {
    // Start of day
    startOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // End of day
    endOfDay(date = new Date()) {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    },

    // Start of week (Monday)
    startOfWeek(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    },

    // End of week
    endOfWeek(date = new Date()) {
        const d = new Date(date);
        const start = this.startOfWeek(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    },

    // Start of month
    startOfMonth(date = new Date()) {
        const d = new Date(date);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // End of month
    endOfMonth(date = new Date()) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
        return d;
    },

    // Start of year
    startOfYear(date = new Date()) {
        const d = new Date(date);
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // End of year
    endOfYear(date = new Date()) {
        const d = new Date(date);
        d.setMonth(11, 31);
        d.setHours(23, 59, 59, 999);
        return d;
    },

    // Get date range for period
    getRange(period, reference = new Date()) {
        switch (period) {
            case ANALYTICS.periods.TODAY:
                return { start: this.startOfDay(reference), end: this.endOfDay(reference) };
            case ANALYTICS.periods.YESTERDAY:
                const yesterday = new Date(reference);
                yesterday.setDate(yesterday.getDate() - 1);
                return { start: this.startOfDay(yesterday), end: this.endOfDay(yesterday) };
            case ANALYTICS.periods.WEEK:
                return { start: this.startOfWeek(reference), end: this.endOfWeek(reference) };
            case ANALYTICS.periods.MONTH:
                return { start: this.startOfMonth(reference), end: this.endOfMonth(reference) };
            case ANALYTICS.periods.YEAR:
                return { start: this.startOfYear(reference), end: this.endOfYear(reference) };
            case ANALYTICS.periods.ALL:
                return { start: new Date(0), end: new Date() };
            default:
                return { start: this.startOfDay(reference), end: this.endOfDay(reference) };
        }
    },

    // Format range
    formatRange(start, end) {
        return {
            start: Utils.formatDate(start),
            end: Utils.formatDate(end),
            startISO: Utils.getDateString(start),
            endISO: Utils.getDateString(end)
        };
    }
};

// ================================================================
// PART 3: TRANSACTION FILTER
// ================================================================

const Filter = {
    // Filter by date range
    byDateRange(transactions, start, end) {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        return transactions.filter(t => {
            const time = t.timestamp || new Date(t.date).getTime();
            return time >= startTime && time <= endTime;
        });
    },

    // Filter by payment method
    byMethod(transactions, method) {
        if (!method) return transactions;
        return transactions.filter(t => t.metode === method);
    },

    // Filter by date string
    byDate(transactions, dateString) {
        return transactions.filter(t => t.date === dateString);
    }
};

// ================================================================
// PART 4: CALCULATOR (Core Calculation)
// ================================================================

const Calculator = {
    // Hitung totals dari transactions
    totals(transactions) {
        let grossRevenue = 0;
        let totalCost = 0;
        let totalItems = 0;
        let transactionCount = transactions.length;

        for (const tx of transactions) {
            grossRevenue += tx.totalJual || 0;
            totalCost += tx.totalModal || 0;
            totalItems += tx.itemCount || tx.items?.length || 0;
        }

        const netProfit = grossRevenue - totalCost;
        const avgTransaction = transactionCount > 0 ? grossRevenue / transactionCount : 0;

        return {
            grossRevenue,
            totalCost,
            netProfit,
            totalItems,
            transactionCount,
            avgTransaction
        };
    },

    // Hitung profit margin
    profitMargin(grossRevenue, netProfit) {
        if (grossRevenue === 0) return 0;
        return (netProfit / grossRevenue) * 100;
    },

    // Breakdown per payment method
    byMethod(transactions) {
        const breakdown = {};
        for (const tx of transactions) {
            const method = tx.metode || 'cash';
            if (!breakdown[method]) {
                breakdown[method] = {
                    method,
                    count: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0
                };
            }
            breakdown[method].count++;
            breakdown[method].revenue += tx.totalJual || 0;
            breakdown[method].cost += tx.totalModal || 0;
            breakdown[method].profit += tx.netProfit || 0;
        }
        return Object.values(breakdown);
    },

    // Breakdown per hour
    byHour(transactions) {
        const hours = {};
        for (let i = 0; i < 24; i++) {
            hours[i] = { hour: i, count: 0, revenue: 0 };
        }
        for (const tx of transactions) {
            const hour = new Date(tx.timestamp).getHours();
            hours[hour].count++;
            hours[hour].revenue += tx.totalJual || 0;
        }
        return Object.values(hours);
    },

    // Top products
    topProducts(transactions, limit = 10) {
        const productStats = {};
        for (const tx of transactions) {
            if (!tx.items) continue;
            for (const item of tx.items) {
                if (!productStats[item.barcode]) {
                    productStats[item.barcode] = {
                        barcode: item.barcode,
                        nama: item.nama,
                        totalTerjual: 0,
                        totalRevenue: 0,
                        totalProfit: 0
                    };
                }
                productStats[item.barcode].totalTerjual += item.kuantitas || 0;
                productStats[item.barcode].totalRevenue += item.subtotalJual || 0;
                productStats[item.barcode].totalProfit += (item.subtotalJual - item.subtotalModal) || 0;
            }
        }
        return Object.values(productStats)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    },

    // Breakdown per category
    byCategory(transactions) {
        const categoryStats = {};
        for (const tx of transactions) {
            if (!tx.items) continue;
            for (const item of tx.items) {
                const product = Products.getByBarcode(item.barcode);
                const kategori = product?.kategori || 'Lainnya';
                if (!categoryStats[kategori]) {
                    categoryStats[kategori] = {
                        kategori,
                        totalTerjual: 0,
                        totalRevenue: 0
                    };
                }
                categoryStats[kategori].totalTerjual += item.kuantitas || 0;
                categoryStats[kategori].totalRevenue += item.subtotalJual || 0;
            }
        }
        return Object.values(categoryStats)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
};

// ================================================================
// PART 5: REPORT GENERATOR
// ================================================================

const Report = {
    // Generate report untuk periode tertentu
    generate(period = ANALYTICS.periods.TODAY, options = {}) {
        const reference = options.reference ? new Date(options.reference) : new Date();
        const range = DateHelper.getRange(period, reference);

        // Ambil semua transaksi
        const allTransactions = Transactions.getAll();

        // Filter berdasarkan range
        const transactions = Filter.byDateRange(allTransactions, range.start, range.end);

        // Hitung totals
        const totals = Calculator.totals(transactions);

        // Breakdown
        const byMethod = Calculator.byMethod(transactions);
        const byHour = Calculator.byHour(transactions);
        const byCategory = Calculator.byCategory(transactions);
        const topProducts = Calculator.topProducts(transactions, ANALYTICS.topProductsLimit);

        // Profit margin
        const profitMargin = Calculator.profitMargin(totals.grossRevenue, totals.netProfit);

        return {
            period,
            range: DateHelper.formatRange(range.start, range.end),
            ...totals,
            profitMargin,
            byMethod,
            byHour,
            byCategory,
            topProducts,
            transactions,
            generatedAt: Date.now()
        };
    },

    // Daily report
    daily(dateString = null) {
        const date = dateString ? new Date(dateString) : new Date();
        const start = DateHelper.startOfDay(date);
        const end = DateHelper.endOfDay(date);

        const allTransactions = Transactions.getAll();
        const transactions = Filter.byDateRange(allTransactions, start, end);

        const totals = Calculator.totals(transactions);

        return {
            date: Utils.getDateString(date),
            dateFormatted: Utils.formatDate(date),
            ...totals,
            byHour: Calculator.byHour(transactions),
            byMethod: Calculator.byMethod(transactions),
            topProducts: Calculator.topProducts(transactions, 5),
            transactions,
            generatedAt: Date.now()
        };
    },

    // Weekly report
    weekly(reference = new Date()) {
        const start = DateHelper.startOfWeek(reference);
        const end = DateHelper.endOfWeek(reference);

        const allTransactions = Transactions.getAll();
        const transactions = Filter.byDateRange(allTransactions, start, end);
        const totals = Calculator.totals(transactions);

        // Daily breakdown
        const dailyBreakdown = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(day.getDate() + i);
            const dayStart = DateHelper.startOfDay(day);
            const dayEnd = DateHelper.endOfDay(day);
            const dayTx = Filter.byDateRange(allTransactions, dayStart, dayEnd);
            const dayTotals = Calculator.totals(dayTx);
            dailyBreakdown.push({
                date: Utils.getDateString(day),
                dayName: day.toLocaleDateString('id-ID', { weekday: 'long' }),
                ...dayTotals
            });
        }

        return {
            startDate: Utils.getDateString(start),
            endDate: Utils.getDateString(end),
            startFormatted: Utils.formatDate(start),
            endFormatted: Utils.formatDate(end),
            ...totals,
            dailyBreakdown,
            byMethod: Calculator.byMethod(transactions),
            topProducts: Calculator.topProducts(transactions, 10),
            transactions,
            generatedAt: Date.now()
        };
    },

    // Monthly report
    monthly(reference = new Date()) {
        const start = DateHelper.startOfMonth(reference);
        const end = DateHelper.endOfMonth(reference);

        const allTransactions = Transactions.getAll();
        const transactions = Filter.byDateRange(allTransactions, start, end);
        const totals = Calculator.totals(transactions);

        // Daily breakdown
        const dailyBreakdown = [];
        const daysInMonth = end.getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(start.getFullYear(), start.getMonth(), day);
            const dayStart = DateHelper.startOfDay(date);
            const dayEnd = DateHelper.endOfDay(date);
            const dayTx = Filter.byDateRange(allTransactions, dayStart, dayEnd);
            if (dayTx.length > 0) {
                const dayTotals = Calculator.totals(dayTx);
                dailyBreakdown.push({
                    date: Utils.getDateString(date),
                    day: day,
                    ...dayTotals
                });
            }
        }

        // Weekly breakdown
        const weeklyBreakdown = [];
        let weekStart = new Date(start);
        while (weekStart <= end) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (weekEnd > end) weekEnd.setTime(end.getTime());
            const weekTx = Filter.byDateRange(allTransactions, weekStart, weekEnd);
            if (weekTx.length > 0) {
                const weekTotals = Calculator.totals(weekTx);
                weeklyBreakdown.push({
                    weekLabel: `Minggu ${weeklyBreakdown.length + 1}`,
                    startDate: Utils.getDateString(weekStart),
                    endDate: Utils.getDateString(weekEnd),
                    ...weekTotals
                });
            }
            weekStart.setDate(weekStart.getDate() + 7);
        }

        const monthName = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        return {
            month: Utils.getDateString(start).substring(0, 7),
            monthName,
            startDate: Utils.getDateString(start),
            endDate: Utils.getDateString(end),
            ...totals,
            dailyBreakdown,
            weeklyBreakdown,
            byMethod: Calculator.byMethod(transactions),
            byCategory: Calculator.byCategory(transactions),
            topProducts: Calculator.topProducts(transactions, 10),
            transactions,
            generatedAt: Date.now()
        };
    },

    // Yearly report
    yearly(reference = new Date()) {
        const start = DateHelper.startOfYear(reference);
        const end = DateHelper.endOfYear(reference);

        const allTransactions = Transactions.getAll();
        const transactions = Filter.byDateRange(allTransactions, start, end);
        const totals = Calculator.totals(transactions);

        // Monthly breakdown
        const monthlyBreakdown = [];
        for (let month = 0; month < 12; month++) {
            const monthStart = new Date(start.getFullYear(), month, 1);
            const monthEnd = new Date(start.getFullYear(), month + 1, 0, 23, 59, 59, 999);
            const monthTx = Filter.byDateRange(allTransactions, monthStart, monthEnd);
            const monthTotals = Calculator.totals(monthTx);
            monthlyBreakdown.push({
                month: month + 1,
                monthName: monthStart.toLocaleDateString('id-ID', { month: 'long' }),
                ...monthTotals
            });
        }

        return {
            year: start.getFullYear(),
            startDate: Utils.getDateString(start),
            endDate: Utils.getDateString(end),
            ...totals,
            monthlyBreakdown,
            byMethod: Calculator.byMethod(transactions),
            topProducts: Calculator.topProducts(transactions, 20),
            transactions,
            generatedAt: Date.now()
        };
    },

    // Summary all-time
    summary() {
        const transactions = Transactions.getAll();
        const totals = Calculator.totals(transactions);

        // First and last transaction
        const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
        const firstTransaction = sorted[0] || null;
        const lastTransaction = sorted[sorted.length - 1] || null;

        // Top products all time
        const topProducts = Calculator.topProducts(transactions, 10);

        return {
            ...totals,
            firstTransaction,
            lastTransaction,
            topProducts,
            byMethod: Calculator.byMethod(transactions),
            byCategory: Calculator.byCategory(transactions),
            generatedAt: Date.now()
        };
    }
};

// ================================================================
// PART 6: TREND ANALYZER
// ================================================================

const Trend = {
    // Bandingkan 2 periode
    compare(current, previous) {
        const revenueChange = this.calculateChange(current.grossRevenue, previous.grossRevenue);
        const profitChange = this.calculateChange(current.netProfit, previous.netProfit);
        const transactionChange = this.calculateChange(current.transactionCount, previous.transactionCount);
        const avgChange = this.calculateChange(current.avgTransaction, previous.avgTransaction);

        return {
            revenue: revenueChange,
            profit: profitChange,
            transaction: transactionChange,
            average: avgChange
        };
    },

    // Hitung persentase perubahan
    calculateChange(current, previous) {
        if (previous === 0) {
            if (current === 0) return { value: 0, percentage: 0, direction: 'flat' };
            return { value: current, percentage: 100, direction: 'up' };
        }
        const diff = current - previous;
        const percentage = (diff / previous) * 100;
        return {
            value: diff,
            percentage: Math.round(percentage * 10) / 10,
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        };
    },

    // Get daily comparison
    dailyComparison(dateString = null) {
        const date = dateString ? new Date(dateString) : new Date();
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);

        const current = Report.daily(Utils.getDateString(date));
        const previous = Report.daily(Utils.getDateString(yesterday));

        return {
            current,
            previous,
            comparison: this.compare(current, previous)
        };
    }
};

// ================================================================
// PART 7: ANALYTICS FACADE (Main API)
// ================================================================

const Analytics = {
    // Sub-modules
    DateHelper,
    Filter,
    Calculator,
    Report,
    Trend,

    // Constants
    periods: ANALYTICS.periods,

    // ---- High-level API ----

    // Get report by period
    getReport(period = 'today', options = {}) {
        return Report.generate(period, options);
    },

    // Daily
    getDailyReport(dateString = null) {
        return Report.daily(dateString);
    },

    // Weekly
    getWeeklyReport(reference = null) {
        return Report.weekly(reference ? new Date(reference) : new Date());
    },

    // Monthly
    getMonthlyReport(reference = null) {
        return Report.monthly(reference ? new Date(reference) : new Date());
    },

    // Yearly
    getYearlyReport(reference = null) {
        return Report.yearly(reference ? new Date(reference) : new Date());
    },

    // Summary
    getSummary() {
        return Report.summary();
    },

    // Trends
    getDailyTrend(dateString = null) {
        return Trend.dailyComparison(dateString);
    },

    // Get totals only
    getTotals(period = 'today') {
        const report = Report.generate(period);
        return {
            grossRevenue: report.grossRevenue,
            totalCost: report.totalCost,
            netProfit: report.netProfit,
            transactionCount: report.transactionCount,
            totalItems: report.totalItems,
            avgTransaction: report.avgTransaction
        };
    },

    // Get top products
    getTopProducts(limit = 10, period = 'all') {
        if (period === 'all') {
            return Calculator.topProducts(Transactions.getAll(), limit);
        }
        const report = Report.generate(period);
        return Calculator.topProducts(report.transactions, limit);
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📊 Analytics module initialized');

    // Subscribe ke transaction baru
    EventBus.on('payment:success', (transaction) => {
        console.log(`📊 Analytics updated for: ${transaction.id}`);
    });

    console.log('✅ Analytics ready');
    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const AnalyticsModule = {
    Analytics,
    DateHelper,
    Filter,
    Calculator,
    Report,
    Trend,
    ANALYTICS,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Analytics = Analytics;
    window.AnalyticsModule = AnalyticsModule;
}

console.log('✅ analytics.js loaded');

export default AnalyticsModule;
export { Analytics, DateHelper, Filter, Calculator, Report, Trend, initialize };

// ================================================================
// END OF ANALYTICS — 500+ BARIS
// ================================================================