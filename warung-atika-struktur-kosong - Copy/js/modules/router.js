 /* ================================================================
   ROUTER — Warung Atika Enterprise
   ================================================================
   SPA Router:
   - history.pushState()
   - popstate handling
   - Route registry
   - Dynamic view mounting
   - Lifecycle (enter, mount, active, leave, cleanup)
   - View caching
   - Transition animation
   - Race condition prevention
   Total: 500+ baris
   ================================================================ */

'use strict';

import Core from '../core/core.js';

const { CONFIG, Utils, EventBus } = Core;

// ================================================================
// PART 1: ROUTER CONSTANTS
// ================================================================

const ROUTER = {
    transitionDuration: 500,
    defaultRoute: '/',
    notFoundRoute: '/404',
    animation: {
        enter: 'enter',
        exit: 'exit',
        active: 'active'
    }
};

// ================================================================
// PART 2: ROUTE REGISTRY
// ================================================================

const Registry = {
    routes: new Map(),

    // Register route
    register(path, config) {
        if (!path || typeof path !== 'string') {
            throw new Error('Path wajib string');
        }
        const normalized = this.normalize(path);
        this.routes.set(normalized, {
            path: normalized,
            title: config.title || 'Warung Atika',
            controller: config.controller || null,
            cache: config.cache || false,
            requiresAuth: config.requiresAuth !== false,
            beforeEnter: config.beforeEnter || null,
            afterLeave: config.afterLeave || null
        });
        console.log(`[Router] Route registered: ${normalized}`);
        return this;
    },

    // Register multiple routes
    registerMany(routes) {
        for (const [path, config] of Object.entries(routes)) {
            this.register(path, config);
        }
        return this;
    },

    // Get route
    get(path) {
        const normalized = this.normalize(path);
        return this.routes.get(normalized) || null;
    },

    // Has route
    has(path) {
        return this.routes.has(this.normalize(path));
    },

    // Get all routes
    getAll() {
        return Array.from(this.routes.values());
    },

    // Remove route
    remove(path) {
        return this.routes.delete(this.normalize(path));
    },

    // Clear all
    clear() {
        this.routes.clear();
    },

    // Normalize path
    normalize(path) {
        if (!path) return '/';
        let normalized = String(path).trim();
        // Hapus trailing slash
        normalized = normalized.replace(/\/+$/, '');
        // Tambahkan leading slash
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized || '/';
    }
};

// ================================================================
// PART 3: ROUTE CACHE
// ================================================================

const Cache = {
    views: new Map(),
    maxSize: 5,

    // Get cached view
    get(path) {
        const normalized = Registry.normalize(path);
        const cached = this.views.get(normalized);
        if (cached) {
            cached.lastAccess = Date.now();
        }
        return cached || null;
    },

    // Set cached view
    set(path, view, controller) {
        const normalized = Registry.normalize(path);
        this.views.set(normalized, {
            path: normalized,
            view,
            controller,
            createdAt: Date.now(),
            lastAccess: Date.now()
        });
        // Evict kalau terlalu banyak
        this.evict();
    },

    // Remove cached view
    remove(path) {
        const normalized = Registry.normalize(path);
        const cached = this.views.get(normalized);
        if (cached && cached.controller && typeof cached.controller.destroy === 'function') {
            try { cached.controller.destroy(); } catch (err) { /* ignore */ }
        }
        return this.views.delete(normalized);
    },

    // Evict oldest
    evict() {
        if (this.views.size <= this.maxSize) return;
        // Cari yang paling lama diakses
        let oldest = null;
        let oldestTime = Infinity;
        for (const [path, cached] of this.views) {
            if (cached.lastAccess < oldestTime) {
                oldestTime = cached.lastAccess;
                oldest = path;
            }
        }
        if (oldest) {
            this.remove(oldest);
            console.log(`[Router] Cache evicted: ${oldest}`);
        }
    },

    // Clear all
    clear() {
        for (const path of Array.from(this.views.keys())) {
            this.remove(path);
        }
        this.views.clear();
    },

    // Has
    has(path) {
        return this.views.has(Registry.normalize(path));
    },

    // Count
    size() {
        return this.views.size;
    }
};

// ================================================================
// PART 4: TRANSITION QUEUE (Race condition prevention)
// ================================================================

const Queue = {
    queue: [],
    isTransitioning: false,

    // Enqueue transition
    enqueue(transition) {
        this.queue.push(transition);
        if (!this.isTransitioning) {
            this.process();
        }
    },

    // Process next
    async process() {
        if (this.queue.length === 0) {
            this.isTransitioning = false;
            return;
        }
        this.isTransitioning = true;
        const next = this.queue.shift();
        try {
            await next.fn();
        } catch (err) {
            console.error('[Router] Transition error:', err);
        }
        if (next.resolve) next.resolve();
        await this.process();
    },

    // Clear
    clear() {
        this.queue = [];
        this.isTransitioning = false;
    }
};

// ================================================================
// PART 5: ROUTER CORE
// ================================================================

const RouterCore = (function() {
    // Private state
    let container = null;
    let currentRoute = null;
    let currentPath = null;
    let isInitialized = false;

    // ---- Initialize ----
    function initialize(config) {
        if (isInitialized) {
            console.warn('[Router] Already initialized');
            return;
        }

        container = config.container;
        if (!container) {
            throw new Error('Router container wajib ada');
        }

        // Register routes
        if (config.routes) {
            Registry.registerMany(config.routes);
        }

        // Listen popstate
        window.addEventListener('popstate', (e) => {
            const path = e.state?.path || window.location.pathname;
            navigate(path, { replace: true, silent: false });
        });

        // Handle internal link clicks
        document.addEventListener('click', handleLinkClick);

        isInitialized = true;
        console.log('🧭 Router initialized');
        console.log(`   Container: ${container.tagName}.${container.className}`);
        console.log(`   Routes: ${Registry.getAll().length}`);
    }

    // ---- Navigate ----
    function navigate(path, options = {}) {
        return new Promise((resolve) => {
            const normalized = Registry.normalize(path);

            // Enqueue transition (cegah race condition)
            Queue.enqueue({
                fn: () => executeTransition(normalized, options),
                resolve
            });
        });
    }

    // ---- Execute transition ----
    async function executeTransition(path, options = {}) {
        const route = Registry.get(path);

        // Kalau route tidak ada, redirect ke default
        if (!route) {
            console.warn(`[Router] Route not found: ${path}, redirecting to ${ROUTER.defaultRoute}`);
            return navigate(ROUTER.defaultRoute, { replace: true });
        }

        // Cek auth
        if (route.requiresAuth && typeof window.Auth !== 'undefined') {
            if (!window.Auth.isAuthenticated()) {
                console.log('[Router] Auth required, redirect to login');
                window.location.href = 'login.html';
                return;
            }
        }

        // Before Enter hook
        if (typeof route.beforeEnter === 'function') {
            const allow = await route.beforeEnter(currentPath, path);
            if (allow === false) return;
        }

        // Update title
        if (route.title) {
            document.title = `${route.title} — Warung Atika`;
        }

        // Update history
        if (!options.silent) {
            const url = path === '/' ? './' : path;
            if (options.replace) {
                history.replaceState({ path }, '', url);
            } else {
                history.pushState({ path }, '', url);
            }
        }

        // Lifecycle: LEAVE current view
        if (currentRoute) {
            const oldController = currentRoute.controller;
            if (oldController && typeof oldController.deactivate === 'function') {
                try { oldController.deactivate(); } catch (err) { /* ignore */ }
            }
            EventBus.emit('route:leave', { path: currentPath });
        }

        // Lifecycle: CLEANUP (kalau tidak di-cache)
        if (currentRoute && !currentRoute.cache) {
            destroyCurrentView();
        } else if (currentRoute && currentRoute.view) {
            // Sembunyikan view lama (untuk cached)
            currentRoute.view.style.display = 'none';
        }

        // Create / get view
        let view = null;
        let controller = null;

        // Cek cache dulu
        if (route.cache && Cache.has(path)) {
            const cached = Cache.get(path);
            view = cached.view;
            controller = cached.controller;
            console.log(`[Router] Using cached view: ${path}`);
        } else {
            // Create new view
            try {
                view = document.createElement('div');
                view.className = 'route-view ' + ROUTER.animation.enter;
                view.dataset.route = path;

                // Load controller
                if (typeof route.controller === 'function') {
                    const result = route.controller();
                    if (result && typeof result.then === 'function') {
                        // Dynamic import (Promise)
                        const module = await result;
                        const ControllerClass = module.default || module;
                        controller = new ControllerClass();
                    } else if (typeof result === 'function') {
                        // Factory function
                        controller = result();
                    } else if (result && typeof result.mount === 'function') {
                        // Langsung instance
                        controller = result;
                    }
                }

                // Mount controller
                if (controller && typeof controller.mount === 'function') {
                    controller.mount(view);
                }

                // Cache kalau perlu
                if (route.cache) {
                    Cache.set(path, view, controller);
                }
            } catch (err) {
                console.error('[Router] Failed to load controller:', err);
                view = document.createElement('div');
                view.className = 'route-view ' + ROUTER.animation.enter;
                view.innerHTML = `
                    <div style="padding:40px;text-align:center;">
                        <h2 style="color:var(--color-error);margin-bottom:16px;">⚠️ Gagal Memuat Halaman</h2>
                        <p style="color:var(--text-muted);margin-bottom:16px;">${err.message}</p>
                        <button onclick="location.reload()" class="btn btn-primary">Refresh</button>
                    </div>
                `;
            }
        }

        // Animasi exit view lama
        if (currentRoute && currentRoute.view && currentRoute.view.parentNode) {
            const oldView = currentRoute.view;
            oldView.classList.remove(ROUTER.animation.active);
            oldView.classList.add(ROUTER.animation.exit);
            await waitTransition(oldView);
            oldView.style.display = 'none';
        }

        // Tampilkan view baru
        view.style.display = '';
        view.classList.remove(ROUTER.animation.enter, ROUTER.animation.exit);
        view.classList.add(ROUTER.animation.enter);

        // Append ke container
        container.appendChild(view);

        // Force reflow untuk animasi
        void view.offsetWidth;

        // Trigger animasi enter
        view.classList.remove(ROUTER.animation.enter);
        view.classList.add(ROUTER.animation.active);

        // Activate controller
        if (controller && typeof controller.activate === 'function') {
            try { controller.activate(); } catch (err) { /* ignore */ }
        }

        // Update state
        currentRoute = {
            path,
            route,
            view,
            controller,
            cache: route.cache
        };
        currentPath = path;

        // Emit event
        EventBus.emit('route:enter', { path, route });
        EventBus.emit('route:changed', { path, route });

        await waitTransition(view);

        console.log(`🧭 Navigated to: ${path}`);
    }

    // ---- Destroy current view ----
    function destroyCurrentView() {
        if (!currentRoute) return;
        const { view, controller } = currentRoute;

        // Destroy controller
        if (controller && typeof controller.destroy === 'function') {
            try { controller.destroy(); } catch (err) { /* ignore */ }
        }

        // Remove view dari DOM
        if (view && view.parentNode) {
            view.parentNode.removeChild(view);
        }

        currentRoute = null;
    }

    // ---- Handle link clicks ----
    function handleLinkClick(e) {
        // Cari anchor terdekat
        const link = e.target.closest('a[data-router]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//')) return;
        if (link.target === '_blank') return;
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        e.preventDefault();
        navigate(href);
    }

    // ---- Wait transition ----
    function waitTransition(element) {
        return new Promise((resolve) => {
            setTimeout(resolve, ROUTER.transitionDuration);
        });
    }

    // ---- Getters ----
    function getCurrentRoute() {
        return currentRoute;
    }

    function getCurrentPath() {
        return currentPath;
    }

    function getContainer() {
        return container;
    }

    function isReady() {
        return isInitialized;
    }

    // ---- Back / Forward ----
    function back() {
        history.back();
    }

    function forward() {
        history.forward();
    }

    // ---- Reload current ----
    function reload() {
        if (currentPath) {
            navigate(currentPath, { replace: true });
        }
    }

    // ---- Destroy ----
    function destroy() {
        // Cleanup current view
        destroyCurrentView();
        // Clear cache
        Cache.clear();
        // Clear queue
        Queue.clear();
        // Remove event listeners
        document.removeEventListener('click', handleLinkClick);
        isInitialized = false;
        console.log('🧭 Router destroyed');
    }

    // ---- Public API ----
    return {
        initialize,
        navigate,
        back,
        forward,
        reload,
        destroy,
        getCurrentRoute,
        getCurrentPath,
        getContainer,
        isReady
    };
})();

// ================================================================
// PART 6: KEYBOARD SHORTCUTS
// ================================================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Alt + Left → Back
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            RouterCore.back();
        }
        // Alt + Right → Forward
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            RouterCore.forward();
        }
        // Ctrl + R → Reload view (bukan browser)
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            RouterCore.reload();
        }
    });
}

// ================================================================
// PART 7: INITIALIZATION
// ================================================================

function initialize(config) {
    RouterCore.initialize(config);
    setupKeyboardShortcuts();
    console.log('✅ Router ready');
    return RouterCore;
}

// ================================================================
// PART 8: EXPORT
// ================================================================

const RouterModule = {
    // Main
    Router: RouterCore,
    router: RouterCore,

    // Sub-modules
    Registry,
    Cache,
    Queue,

    // Constants
    ROUTER,

    // Shortcuts
    navigate: (path, opts) => RouterCore.navigate(path, opts),
    back: () => RouterCore.back(),
    forward: () => RouterCore.forward(),
    reload: () => RouterCore.reload(),
    getCurrentPath: () => RouterCore.getCurrentPath(),
    getCurrentRoute: () => RouterCore.getCurrentRoute(),

    // Init
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Router = RouterCore;
    window.RouterModule = RouterModule;
}

console.log('✅ router.js loaded');

export default RouterModule;
export { RouterCore, Registry, Cache, Queue, initialize };

// ================================================================
// END OF ROUTER — 500+ BARIS
// ================================================================