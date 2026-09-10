 /* ================================================================
   WORKER — Warung Atika Enterprise
   ================================================================
   Web Worker untuk background task:
   - Background sync (offline queue)
   - Heavy computation (analytics)
   - Data processing
   - Cache warming
   
   Note: File ini berjalan di Worker thread, bukan main thread.
   Tidak bisa akses DOM atau window.
   Total: 400+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: WORKER CONSTANTS
// ================================================================

const WORKER = {
    name: 'WarungAtika-Worker',
    version: '1.0.0',
    messageTypes: {
        INIT: 'init',
        SYNC: 'sync',
        SYNC_QUEUE: 'syncQueue',
        ANALYZE: 'analyze',
        PROCESS: 'process',
        PING: 'ping',
        PONG: 'pong',
        STATUS: 'status',
        ERROR: 'error',
        RESULT: 'result'
    },
    syncInterval: 15000,
    maxRetries: 3,
    baseRetryDelay: 1000,
    maxRetryDelay: 60000
};

// ================================================================
// PART 2: WORKER STATE
// ================================================================

const State = {
    initialized: false,
    isSyncing: false,
    syncTimer: null,
    lastSync: null,
    syncCount: 0,
    failCount: 0,
    errorLog: []
};

// ================================================================
// PART 3: MESSAGE HANDLER
// ================================================================

const MessageHandler = {
    // Send message ke main thread
    send(type, data = null) {
        try {
            self.postMessage({
                type,
                data,
                timestamp: Date.now(),
                worker: WORKER.name
            });
        } catch (err) {
            console.error('[Worker] Send failed:', err);
        }
    },

    // Send error
    sendError(error, context = '') {
        const errorInfo = {
            message: error?.message || String(error),
            stack: error?.stack || null,
            context,
            timestamp: Date.now()
        };
        State.errorLog.push(errorInfo);
        if (State.errorLog.length > 100) State.errorLog.shift();
        this.send(WORKER.messageTypes.ERROR, errorInfo);
    },

    // Send status
    sendStatus() {
        this.send(WORKER.messageTypes.STATUS, {
            initialized: State.initialized,
            isSyncing: State.isSyncing,
            lastSync: State.lastSync,
            syncCount: State.syncCount,
            failCount: State.failCount,
            errorCount: State.errorLog.length
        });
    }
};

// ================================================================
// PART 4: SYNC TASK
// ================================================================

const SyncTask = {
    // Process sync queue
    async process(queue) {
        if (State.isSyncing) {
            return { success: false, reason: 'already_syncing' };
        }
        if (!Array.isArray(queue) || queue.length === 0) {
            return { success: true, reason: 'empty', processed: 0 };
        }

        State.isSyncing = true;
        const results = {
            total: queue.length,
            success: 0,
            failed: 0,
            items: []
        };

        for (const item of queue) {
            try {
                const result = await this.syncItem(item);
                if (result.success) {
                    results.success++;
                    results.items.push({ id: item.id, status: 'success' });
                } else {
                    results.failed++;
                    results.items.push({
                        id: item.id,
                        status: 'failed',
                        error: result.error,
                        retries: (item.retries || 0) + 1
                    });
                }
            } catch (err) {
                results.failed++;
                results.items.push({
                    id: item.id,
                    status: 'error',
                    error: err.message
                });
            }
        }

        State.isSyncing = false;
        State.lastSync = Date.now();
        State.syncCount += results.success;
        State.failCount += results.failed;

        MessageHandler.send(WORKER.messageTypes.RESULT, {
            action: 'sync',
            ...results
        });

        return { success: true, results };
    },

    // Sync single item
    async syncItem(item) {
        // Simulasi network delay (di production: fetch ke server)
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

        // Simulasi 5% fail rate
        if (Math.random() < 0.05) {
            throw new Error('Simulated sync failure');
        }

        return { success: true };
    }
};

// ================================================================
// PART 5: ANALYTICS TASK
// ================================================================

const AnalyticsTask = {
    // Analyze transactions (heavy computation)
    analyze(transactions, options = {}) {
        if (!Array.isArray(transactions)) {
            return { success: false, error: 'Invalid transactions' };
        }

        const startTime = Date.now();

        try {
            // Calculate totals
            let grossRevenue = 0;
            let totalCost = 0;
            let itemCount = 0;

            for (const tx of transactions) {
                grossRevenue += tx.totalJual || 0;
                totalCost += tx.totalModal || 0;
                itemCount += tx.itemCount || 0;
            }

            const netProfit = grossRevenue - totalCost;
            const avgTransaction = transactions.length > 0 ? grossRevenue / transactions.length : 0;

            // Top products
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

            const topProducts = Object.values(products)
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, options.topLimit || 10);

            // Payment method breakdown
            const byMethod = {};
            for (const tx of transactions) {
                const method = tx.metode || 'cash';
                if (!byMethod[method]) {
                    byMethod[method] = { count: 0, revenue: 0 };
                }
                byMethod[method].count++;
                byMethod[method].revenue += tx.totalJual || 0;
            }

            const duration = Date.now() - startTime;

            return {
                success: true,
                data: {
                    grossRevenue,
                    totalCost,
                    netProfit,
                    itemCount,
                    transactionCount: transactions.length,
                    avgTransaction,
                    topProducts,
                    byMethod: Object.values(byMethod),
                    duration
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

// ================================================================
// PART 6: PROCESSING TASK
// ================================================================

const ProcessingTask = {
    // Process large data (batch)
    processData(data, operation = 'sort') {
        if (!Array.isArray(data)) {
            return { success: false, error: 'Invalid data' };
        }

        const startTime = Date.now();

        try {
            let result;
            switch (operation) {
                case 'sort':
                    result = [...data].sort((a, b) => {
                        const valA = a.nama || '';
                        const valB = b.nama || '';
                        return valA.localeCompare(valB);
                    });
                    break;
                case 'unique':
                    result = [...new Set(data.map(item => JSON.stringify(item)))].map(s => JSON.parse(s));
                    break;
                case 'group':
                    result = data.reduce((acc, item) => {
                        const key = item.kategori || 'Lainnya';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(item);
                        return acc;
                    }, {});
                    break;
                case 'stats':
                    result = {
                        count: data.length,
                        sum: data.reduce((s, item) => s + (item.hargaJual || 0), 0),
                        avg: data.length > 0
                            ? data.reduce((s, item) => s + (item.hargaJual || 0), 0) / data.length
                            : 0
                    };
                    break;
                default:
                    result = data;
            }

            return {
                success: true,
                data: result,
                duration: Date.now() - startTime
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

// ================================================================
// PART 7: WORKER CONTROLLER
// ================================================================

const Controller = {
    // Init
    init(config = {}) {
        if (State.initialized) return;
        State.initialized = true;

        // Set config
        if (config.syncInterval) WORKER.syncInterval = config.syncInterval;
        if (config.maxRetries) WORKER.maxRetries = config.maxRetries;

        // Start periodic sync
        this.startPeriodicSync();

        MessageHandler.send(WORKER.messageTypes.INIT, {
            name: WORKER.name,
            version: WORKER.version,
            timestamp: Date.now()
        });

        console.log(`[Worker] ${WORKER.name} v${WORKER.version} initialized`);
    },

    // Start periodic sync
    startPeriodicSync() {
        if (State.syncTimer) clearInterval(State.syncTimer);
        State.syncTimer = setInterval(() => {
            MessageHandler.send(WORKER.messageTypes.SYNC, {
                reason: 'periodic'
            });
        }, WORKER.syncInterval);
    },

    // Stop periodic sync
    stopPeriodicSync() {
        if (State.syncTimer) {
            clearInterval(State.syncTimer);
            State.syncTimer = null;
        }
    },

    // Handle message dari main thread
    async handleMessage(event) {
        const { type, data } = event.data || {};

        try {
            switch (type) {
                case WORKER.messageTypes.INIT:
                    this.init(data);
                    break;

                case WORKER.messageTypes.SYNC_QUEUE:
                    const syncResult = await SyncTask.process(data.queue || []);
                    MessageHandler.send(WORKER.messageTypes.RESULT, {
                        action: 'syncQueue',
                        ...syncResult
                    });
                    break;

                case WORKER.messageTypes.ANALYZE:
                    const analyzeResult = AnalyticsTask.analyze(data.transactions || [], data.options || {});
                    MessageHandler.send(WORKER.messageTypes.RESULT, {
                        action: 'analyze',
                        ...analyzeResult
                    });
                    break;

                case WORKER.messageTypes.PROCESS:
                    const processResult = ProcessingTask.processData(
                        data.data || [],
                        data.operation
                    );
                    MessageHandler.send(WORKER.messageTypes.RESULT, {
                        action: 'process',
                        ...processResult
                    });
                    break;

                case WORKER.messageTypes.PING:
                    MessageHandler.send(WORKER.messageTypes.PONG, {
                        timestamp: Date.now()
                    });
                    break;

                case WORKER.messageTypes.STATUS:
                    MessageHandler.sendStatus();
                    break;

                default:
                    console.warn(`[Worker] Unknown message type: ${type}`);
            }
        } catch (err) {
            MessageHandler.sendError(err, `handleMessage(${type})`);
        }
    },

    // Reset
    reset() {
        this.stopPeriodicSync();
        State.initialized = false;
        State.isSyncing = false;
        State.lastSync = null;
        State.syncCount = 0;
        State.failCount = 0;
        State.errorLog = [];
        MessageHandler.send(WORKER.messageTypes.STATUS, { reset: true });
    }
};

// ================================================================
// PART 8: EVENT LISTENERS
// ================================================================

self.addEventListener('message', (event) => {
    Controller.handleMessage(event);
});

self.addEventListener('error', (event) => {
    MessageHandler.sendError(event.error || new Error(event.message), 'worker:error');
});

self.addEventListener('unhandledrejection', (event) => {
    MessageHandler.sendError(event.reason, 'worker:promise');
});

// ================================================================
// PART 9: AUTO-START
// ================================================================

// Auto-init saat worker pertama kali load
Controller.init();

console.log(`[Worker] ${WORKER.name} v${WORKER.version} loaded`);

// ================================================================
// PART 10: EXPORT (untuk main thread import)
// ================================================================

// Karena ini worker file, kita tidak export modul ES6
// Tapi kita bisa define kelas wrapper untuk digunakan di main thread

if (typeof window !== 'undefined') {
    // Ini tidak akan jalan (worker tidak punya window)
    // Tapi kalau file ini di-load di main thread, ini fallback
    window.WorkerModule = {
        WORKER,
        State,
        Controller
    };
}

// ================================================================
// END OF WORKER — 400+ BARIS
// ================================================================