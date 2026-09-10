 /* ================================================================
   EVENT BUS — Warung Atika Enterprise
   ================================================================
   Sistem komunikasi antar modul (Pub/Sub):
   - Publish/Subscribe pattern
   - Wildcard events (*)
   - Event history
   - Once listener
   - Priority listeners
   - Async support
   Total: 400+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: EVENT BUS CONSTANTS
// ================================================================

const EVENT_BUS = {
    maxHistory: 100,
    wildcard: '*',
    defaultPriority: 0,
    highPriority: 10,
    lowPriority: -10
};

// ================================================================
// PART 2: EVENT BUS CORE
// ================================================================

const EventBus = (function() {
    // Private state
    let listeners = new Map();     // eventName -> Map(id -> listenerObj)
    let history = [];              // event history
    let idCounter = 0;             // untuk generate listener ID

    // ---- Generate ID ----
    function generateId() {
        idCounter++;
        return `listener_${idCounter}_${Date.now()}`;
    }

    // ---- Get or create listener map for event ----
    function getListeners(eventName) {
        if (!listeners.has(eventName)) {
            listeners.set(eventName, new Map());
        }
        return listeners.get(eventName);
    }

    // ---- Subscribe ----
    function on(eventName, listener, options = {}) {
        if (typeof listener !== 'function') {
            console.warn('[EventBus] Listener harus function');
            return () => {};
        }

        const id = generateId();
        const listenerObj = {
            id,
            fn: listener,
            priority: options.priority || EVENT_BUS.defaultPriority,
            once: options.once || false,
            context: options.context || null,
            createdAt: Date.now(),
            callCount: 0
        };

        const eventListeners = getListeners(eventName);
        eventListeners.set(id, listenerObj);

        // Return unsubscribe function
        return () => off(eventName, id);
    }

    // ---- Subscribe once ----
    function once(eventName, listener, options = {}) {
        return on(eventName, listener, { ...options, once: true });
    }

    // ---- Subscribe dengan priority tinggi ----
    function onHigh(eventName, listener) {
        return on(eventName, listener, { priority: EVENT_BUS.highPriority });
    }

    // ---- Subscribe dengan priority rendah ----
    function onLow(eventName, listener) {
        return on(eventName, listener, { priority: EVENT_BUS.lowPriority });
    }

    // ---- Unsubscribe ----
    function off(eventName, listenerOrId) {
        const eventListeners = listeners.get(eventName);
        if (!eventListeners) return false;

        let id = null;
        if (typeof listenerOrId === 'string') {
            id = listenerOrId;
        } else {
            // Cari berdasarkan function reference
            for (const [listenerId, obj] of eventListeners) {
                if (obj.fn === listenerOrId) {
                    id = listenerId;
                    break;
                }
            }
        }

        if (!id) return false;
        const result = eventListeners.delete(id);
        if (eventListeners.size === 0) {
            listeners.delete(eventName);
        }
        return result;
    }

    // ---- Unsubscribe semua untuk event ----
    function offAll(eventName) {
        if (eventName) {
            return listeners.delete(eventName);
        }
        listeners.clear();
        return true;
    }

    // ---- Emit event ----
    function emit(eventName, data = null) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now()
        };

        // Simpan ke history
        addToHistory(event);

        // Ambil listener untuk event ini
        const eventListeners = listeners.get(eventName);
        // Ambil wildcard listeners
        const wildcardListeners = listeners.get(EVENT_BUS.wildcard);

        // Gabungkan & urutkan berdasarkan priority
        const allListeners = [];
        if (eventListeners) {
            allListeners.push(...Array.from(eventListeners.values()));
        }
        if (wildcardListeners) {
            allListeners.push(...Array.from(wildcardListeners.values()));
        }

        // Sort by priority (tinggi dulu)
        allListeners.sort((a, b) => b.priority - a.priority);

        // Panggil semua listener
        let calledCount = 0;
        for (const obj of allListeners) {
            try {
                obj.fn.call(obj.context, data, event);
                obj.callCount++;
                calledCount++;

                // Hapus jika once
                if (obj.once) {
                    const targetEvent = eventListeners && eventListeners.has(obj.id)
                        ? eventName
                        : EVENT_BUS.wildcard;
                    off(targetEvent, obj.id);
                }
            } catch (err) {
                console.error(`[EventBus] Error in listener for "${eventName}":`, err);
            }
        }

        return calledCount;
    }

    // ---- Emit async (tidak blocking) ----
    function emitAsync(eventName, data = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const calledCount = emit(eventName, data);
                resolve(calledCount);
            }, 0);
        });
    }

    // ---- Add to history ----
    function addToHistory(event) {
        history.push(event);
        if (history.length > EVENT_BUS.maxHistory) {
            history.shift();
        }
    }

    // ---- Get history ----
    function getHistory(eventName = null) {
        if (eventName) {
            return history.filter(e => e.name === eventName);
        }
        return [...history];
    }

    // ---- Clear history ----
    function clearHistory() {
        history = [];
    }

    // ---- Count listeners ----
    function countListeners(eventName = null) {
        if (eventName) {
            const eventListeners = listeners.get(eventName);
            return eventListeners ? eventListeners.size : 0;
        }
        let total = 0;
        for (const map of listeners.values()) {
            total += map.size;
        }
        return total;
    }

    // ---- Get all event names ----
    function getEventNames() {
        return Array.from(listeners.keys());
    }

    // ---- Has listener ----
    function hasListener(eventName, listener) {
        const eventListeners = listeners.get(eventName);
        if (!eventListeners) return false;
        for (const obj of eventListeners.values()) {
            if (obj.fn === listener) return true;
        }
        return false;
    }

    // ---- Wait for event (Promise) ----
    function waitFor(eventName, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timer = null;
            const unsubscribe = once(eventName, (data, event) => {
                if (timer) clearTimeout(timer);
                resolve({ data, event });
            });

            if (timeout > 0) {
                timer = setTimeout(() => {
                    unsubscribe();
                    reject(new Error(`Timeout waiting for "${eventName}"`));
                }, timeout);
            }
        });
    }

    // ---- Reset ----
    function reset() {
        listeners.clear();
        history = [];
        idCounter = 0;
    }

    // ---- Debug info ----
    function debug() {
        const info = {
            totalListeners: countListeners(),
            events: {},
            historySize: history.length
        };
        for (const [eventName, map] of listeners) {
            info.events[eventName] = map.size;
        }
        return info;
    }

    // ---- Public API ----
    return {
        on,
        once,
        onHigh,
        onLow,
        off,
        offAll,
        emit,
        emitAsync,
        getHistory,
        clearHistory,
        countListeners,
        getEventNames,
        hasListener,
        waitFor,
        reset,
        debug,

        // Metadata
        get size() { return countListeners(); },
        get events() { return getEventNames(); },
        get history() { return getHistory(); }
    };
})();

// ================================================================
// PART 3: COMMON EVENTS REGISTRY
// ================================================================

const Events = {
    // ---- App Lifecycle ----
    APP_READY: 'app:ready',
    APP_LOADING: 'app:loading',
    APP_ERROR: 'app:error',

    // ---- State ----
    STATE_CHANGED: 'state:changed',
    STATE_LOADED: 'state:loaded',
    STATE_RESET: 'state:reset',

    // ---- Products ----
    PRODUCTS_UPDATED: 'products:updated',
    PRODUCT_ADDED: 'product:added',
    PRODUCT_UPDATED: 'product:updated',
    PRODUCT_DELETED: 'product:deleted',

    // ---- Cart ----
    CART_UPDATED: 'cart:updated',
    CART_CLEARED: 'cart:cleared',
    CART_ITEM_ADDED: 'cart:itemAdded',
    CART_ITEM_REMOVED: 'cart:itemRemoved',

    // ---- Transactions ----
    TRANSACTION_ADDED: 'transaction:added',
    TRANSACTIONS_UPDATED: 'transactions:updated',
    CHECKOUT_SUCCESS: 'checkout:success',
    CHECKOUT_FAILED: 'checkout:failed',

    // ---- Inventory ----
    INVENTORY_LOW_STOCK: 'inventory:lowStock',
    INVENTORY_STOCK_UPDATED: 'inventory:stockUpdated',
    INVENTORY_RESTOCK: 'inventory:restock',

    // ---- Auth ----
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_PIN_SET: 'auth:pinSet',
    AUTH_PIN_FAILED: 'auth:pinFailed',
    AUTH_LOCKED: 'auth:locked',
    AUTH_UNLOCKED: 'auth:unlocked',

    // ---- Theme ----
    THEME_CHANGED: 'theme:changed',
    MODE_CHANGED: 'mode:changed',

    // ---- Network ----
    NETWORK_ONLINE: 'network:online',
    NETWORK_OFFLINE: 'network:offline',

    // ---- Sync ----
    SYNC_STARTED: 'sync:started',
    SYNC_COMPLETED: 'sync:completed',
    SYNC_FAILED: 'sync:failed',
    SYNC_QUEUED: 'sync:queued',

    // ---- UI ----
    MODAL_OPEN: 'ui:modalOpen',
    MODAL_CLOSE: 'ui:modalClose',
    TOAST_SHOW: 'ui:toastShow',
    TOAST_HIDE: 'ui:toastHide',

    // ---- Navigation ----
    ROUTE_CHANGED: 'route:changed',
    ROUTE_ENTER: 'route:enter',
    ROUTE_LEAVE: 'route:leave',

    // ---- Keyboard ----
    KEY_ENTER: 'key:enter',
    KEY_ESCAPE: 'key:escape',
    KEY_F1: 'key:f1',
    KEY_F2: 'key:f2'
};

// ================================================================
// PART 4: EVENT HELPERS (Convenience)
// ================================================================

const EventHelpers = {
    // Emit dengan delay
    emitDelayed(eventName, data, delay = 0) {
        setTimeout(() => EventBus.emit(eventName, data), delay);
    },

    // Emit sekali saja (tidak emit lagi kalau sudah pernah)
    emitOnce(eventName, data) {
        const key = `emitted_${eventName}`;
        if (sessionStorage.getItem(key)) return false;
        sessionStorage.setItem(key, '1');
        return EventBus.emit(eventName, data);
    },

    // Batch emit (untuk performa)
    batch(events) {
        if (!Array.isArray(events)) return;
        for (const { name, data } of events) {
            EventBus.emit(name, data);
        }
    },

    // Chain emit (emit setelah event lain selesai)
    chain(firstEvent, secondEvent, transform) {
        return EventBus.once(firstEvent, (data) => {
            const newData = typeof transform === 'function' ? transform(data) : data;
            EventBus.emit(secondEvent, newData);
        });
    },

    // Debug mode — log semua event
    enableDebugLogging() {
        const originalEmit = EventBus.emit;
        EventBus.emit = function(eventName, data) {
            console.log(`[EventBus] 🔔 ${eventName}`, data);
            return originalEmit.call(this, eventName, data);
        };
        console.log('[EventBus] Debug logging enabled');
    }
};

// ================================================================
// PART 5: INITIALIZATION
// ================================================================

function initialize() {
    console.log('📢 Event Bus initialized');
    console.log(`   Total events registered: ${Object.keys(Events).length}`);
    return true;
}

// ================================================================
// PART 6: EXPORT
// ================================================================

const EventBusModule = {
    // Main
    EventBus,
    bus: EventBus,

    // Constants
    Events,
    EVENT_BUS,

    // Helpers
    Helpers: EventHelpers,

    // Shortcut functions
    on: (event, listener, options) => EventBus.on(event, listener, options),
    off: (event, listener) => EventBus.off(event, listener),
    emit: (event, data) => EventBus.emit(event, data),
    once: (event, listener, options) => EventBus.once(event, listener, options),
    waitFor: (event, timeout) => EventBus.waitFor(event, timeout),

    // Init
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.EventBusModule = EventBusModule;
    window.Events = Events;
    // Note: window.EventBus sudah di-set di core.js
}

console.log('✅ event-bus.js loaded');

export default EventBusModule;
export { EventBus, Events, EVENT_BUS, EventHelpers, initialize };

// ================================================================
// END OF EVENT BUS — 400+ BARIS
// ================================================================