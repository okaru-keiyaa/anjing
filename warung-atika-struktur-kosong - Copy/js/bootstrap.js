/* ================================================================
   AUTO-IMPORT SEMUA MODUL
   ================================================================ */

// Config
import './config.js';

// Core
import './core/core.js';
import './core/database.js';
import './core/auth.js';
import './core/theme.js';
import './core/offline-sync.js';
import './core/event-bus.js';

// Modules
import './modules/router.js';
import './modules/payment.js';
import './modules/inventory.js';
import './modules/analytics.js';
import './modules/barcode.js';
import './modules/cart.js';
import './modules/product.js';
import './modules/transaction.js';
import './modules/report.js';
import './modules/qr-reader.js';

// Root
import './icons.js';
import './audio.js';
// import './worker.js';  // ← worker.js tidak di-import (khusus worker thread)
// 
/* ================================================================
   BOOTSTRAP — Warung Atika Enterprise
   ================================================================
   INDUK PENGGERAK APLIKASI
   
   Fungsi:
   - Menghidupkan aplikasi saat pertama load
   - Memanggil semua modul (config, core, database, auth, dll)
   - Menyambungkan semua organ tubuh
   - Menghilangkan loading screen
   - Setup routes
   - Handle global errors
   - Register service worker
   Total: 500+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: BOOTSTRAP CONSTANTS
// ================================================================

const BOOTSTRAP = {
    appName: 'Warung Atika Enterprise',
    version: '1.0.0',
    loadingElementId: 'app-loading',
    appElementId: 'app',
    routeContainerId: 'routeContainer',
    maxBootTime: 10000, // 10 detik timeout
    retryAttempts: 3
};

// ================================================================
// PART 2: LOADING SCREEN CONTROLLER
// ================================================================

const LoadingScreen = {
    // Sembunyikan loading screen
    hide() {
        const loading = document.getElementById(BOOTSTRAP.loadingElementId);
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }
    },

    // Tampilkan loading screen
    show() {
        const loading = document.getElementById(BOOTSTRAP.loadingElementId);
        if (loading) {
            loading.style.display = 'flex';
            loading.style.opacity = '1';
        }
    },

    // Update pesan loading
    setMessage(message) {
        const loading = document.getElementById(BOOTSTRAP.loadingElementId);
        if (loading) {
            const p = loading.querySelector('p');
            if (p) p.textContent = message;
        }
    },

    // Tampilkan error di loading screen
    showError(message) {
        const loading = document.getElementById(BOOTSTRAP.loadingElementId);
        if (loading) {
            loading.innerHTML = `
                <div style="text-align:center;padding:40px;max-width:500px;">
                    <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                    <h2 style="color:#c0392b;margin-bottom:16px;font-size:20px;">Gagal Memuat Aplikasi</h2>
                    <p style="color:#5a524a;margin-bottom:24px;line-height:1.6;">${message}</p>
                    <button onclick="location.reload()" style="
                        padding:12px 24px;
                        background:#2d4a3e;
                        color:#fff;
                        border:none;
                        border-radius:10px;
                        font-size:16px;
                        font-weight:600;
                        cursor:pointer;
                        font-family:inherit;
                    ">Refresh Halaman</button>
                </div>
            `;
        }
    }
};

// ================================================================
// PART 3: APP SHOW CONTROLLER
// ================================================================

const AppController = {
    // Tampilkan app shell
    show() {
        const app = document.getElementById(BOOTSTRAP.appElementId);
        if (app) {
            app.style.display = 'flex';
            // Trigger reflow
            void app.offsetWidth;
            app.style.opacity = '1';
        }
    },

    // Sembunyikan app shell
    hide() {
        const app = document.getElementById(BOOTSTRAP.appElementId);
        if (app) {
            app.style.display = 'none';
        }
    }
};

// ================================================================
// PART 4: ERROR HANDLER
// ================================================================

const ErrorHandler = {
    // Setup global error handler
    setup() {
        // Uncaught errors
        window.addEventListener('error', (event) => {
            console.error('[Global Error]', event.error || event.message);
            this.report(event.error || new Error(event.message), 'uncaught');
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Unhandled Promise]', event.reason);
            this.report(event.reason, 'promise');
        });
    },

    // Report error
    report(error, source = 'unknown') {
        const errorInfo = {
            message: error?.message || String(error),
            stack: error?.stack || null,
            source,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Save ke localStorage (max 50 errors)
        try {
            const key = 'atika_errors';
            const errors = JSON.parse(localStorage.getItem(key) || '[]');
            errors.push(errorInfo);
            if (errors.length > 50) errors.shift();
            localStorage.setItem(key, JSON.stringify(errors));
        } catch (_) {
            // Ignore
        }

        // Emit event
        if (typeof window.EventBus !== 'undefined' && window.EventBus.emit) {
            window.EventBus.emit('app:error', errorInfo);
        }
    },

    // Get error log
    getLog() {
        try {
            return JSON.parse(localStorage.getItem('atika_errors') || '[]');
        } catch (_) {
            return [];
        }
    },

    // Clear error log
    clear() {
        try {
            localStorage.removeItem('atika_errors');
        } catch (_) {}
    }
};

// ================================================================
// PART 5: DEPENDENCY CHECKER
// ================================================================

const DependencyChecker = {
    // Cek apakah semua modul sudah di-load
    check() {
        const required = [
            { name: 'Core', obj: window.Core, critical: true },
            { name: 'ConfigModule', obj: window.ConfigModule, critical: true },
            { name: 'State', obj: window.State, critical: false },
            { name: 'Database', obj: window.Database, critical: false },
            { name: 'Auth', obj: window.Auth, critical: false },
            { name: 'Theme', obj: window.Theme, critical: false },
            { name: 'OfflineSync', obj: window.OfflineSync, critical: false },
            { name: 'Router', obj: window.Router, critical: false }
        ];

        const missing = [];
        const loaded = [];

        for (const dep of required) {
            if (dep.obj) {
                loaded.push(dep.name);
            } else {
                missing.push({ name: dep.name, critical: dep.critical });
            }
        }

        return {
            allLoaded: missing.filter(m => m.critical).length === 0,
            loaded,
            missing,
            criticalMissing: missing.filter(m => m.critical)
        };
    },

    // Log status
    logStatus() {
        const status = this.check();
        console.log('📦 Dependency check:');
        console.log(`   Loaded: ${status.loaded.join(', ') || '(none)'}`);
        if (status.missing.length > 0) {
            console.warn(`   Missing: ${status.missing.map(m => m.name).join(', ')}`);
        }
        return status;
    }
};

// ================================================================
// PART 6: ROUTE SETUP
// ================================================================

const RouteSetup = {
    // Setup routes
    setup() {
        if (typeof window.Router === 'undefined') {
            console.warn('[Bootstrap] Router belum tersedia, skip route setup');
            return false;
        }

        const container = document.getElementById(BOOTSTRAP.routeContainerId);
        if (!container) {
            console.warn('[Bootstrap] Route container tidak ditemukan');
            return false;
        }

        try {
            // Initialize router
            window.Router.initialize({
                container: container,
                routes: {
                    '/': {
                        title: 'Kasir',
                        controller: () => import('./views/cashier.js').then(m => m.CashierView || m.default),
                        cache: false,
                        requiresAuth: true
                    },
                    '/admin': {
                        title: 'Admin',
                        controller: () => import('./views/admin.js').then(m => m.AdminView || m.default),
                        cache: false,
                        requiresAuth: true
                    },
                    '/settings': {
                        title: 'Pengaturan',
                        controller: () => import('./views/settings.js').then(m => m.SettingsView || m.default),
                        cache: true,
                        requiresAuth: true
                    },
                    '/profile': {
                        title: 'Profil',
                        controller: () => import('./views/profile.js').then(m => m.ProfileView || m.default),
                        cache: true,
                        requiresAuth: true
                    }
                }
            });

            console.log('🧭 Routes registered');
            return true;
        } catch (err) {
            console.error('[Bootstrap] Route setup failed:', err);
            return false;
        }
    },

    // Navigate to initial route
    navigateInitial() {
        if (typeof window.Router === 'undefined') return;

        // Cek path dari URL
        const path = window.location.pathname === '/admin.html' ? '/admin' : '/';

        setTimeout(() => {
            window.Router.navigate(path);
            console.log(`🧭 Navigating to: ${path}`);
        }, 100);
    }
};

// ================================================================
// PART 7: UI BINDINGS
// ================================================================

const UIBindings = {
    // Setup UI event listeners
    setup() {
        // ---- Topbar buttons ----
        this.setupTopbarButtons();

        // ---- Keyboard shortcuts ----
        this.setupKeyboardShortcuts();

        // ---- Status bar ----
        this.setupStatusBar();

        console.log('🎛️ UI bindings ready');
    },

    setupTopbarButtons() {
        // Mode toggle
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', () => {
                if (window.Theme) {
                    const newMode = window.Theme.toggleMode();
                    this.updateModeUI(newMode);
                }
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (window.Theme) {
                    const newTheme = window.Theme.toggleTheme();
                    this.updateThemeUI(newTheme);
                }
            });
        }

        // Kasir button
        const navKasir = document.getElementById('navKasir');
        if (navKasir) {
            navKasir.addEventListener('click', () => {
                if (window.Router) window.Router.navigate('/');
                const sidebar = document.getElementById('appSidebar');
                if (sidebar) sidebar.classList.remove('visible');
            });
        }

        // Admin button
        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) {
            navAdmin.addEventListener('click', () => {
                if (window.Router) window.Router.navigate('/admin');
                const sidebar = document.getElementById('appSidebar');
                if (sidebar) sidebar.classList.add('visible');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Yakin ingin logout?')) {
                    if (window.Auth) window.Auth.logout();
                    else window.location.href = 'login.html';
                }
            });
        }
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+1 → Kasir
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                if (window.Router) window.Router.navigate('/');
            }
            // Ctrl+2 → Admin
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                if (window.Router) window.Router.navigate('/admin');
            }
            // Escape → Close sidebar
            if (e.key === 'Escape') {
                const sidebar = document.getElementById('appSidebar');
                if (sidebar) sidebar.classList.remove('visible');
            }
        });
    },

    setupStatusBar() {
        // Clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);

        // Sync status
        if (window.OfflineSync) {
            window.OfflineSync.subscribe((status) => {
                this.updateSyncStatus(status);
            });
        } else {
            this.updateSyncStatus({ status: 'idle', isOnline: navigator.onLine });
        }

        // Cart count
        if (window.State) {
            window.State.subscribe('cart:updated', () => {
                this.updateCartCount();
            });
            this.updateCartCount();
        }
    },

    updateClock() {
        const el = document.getElementById('statusTime');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    updateSyncStatus(status) {
        const dot = document.getElementById('syncDot');
        const label = document.getElementById('syncLabel');
        if (!dot || !label) return;

        dot.className = 'dot';
        const s = status.status || 'idle';

        if (s === 'online' || s === 'idle') {
            dot.classList.add('online');
            label.textContent = 'Online';
        } else if (s === 'syncing') {
            dot.classList.add('syncing');
            label.textContent = 'Sinkronisasi...';
        } else if (s === 'pending') {
            dot.classList.add('offline');
            label.textContent = 'Menunggu sync';
        } else if (s === 'error') {
            dot.classList.add('error');
            label.textContent = 'Error sync';
        } else {
            dot.classList.add('offline');
            label.textContent = 'Offline';
        }
    },

    updateCartCount() {
        const el = document.getElementById('statusCartCount');
        if (!el) return;
        if (window.State) {
            const count = window.State.getCartItemCount();
            el.textContent = `${count} item`;
        }
    },

    updateModeUI(mode) {
        const icon = document.getElementById('modeIcon');
        const label = document.getElementById('modeLabel');
        if (icon) icon.textContent = mode === 'genz' ? '⚡' : '👴';
        if (label) label.textContent = mode === 'genz' ? 'Gen Z' : 'Lansia';
    },

    updateThemeUI(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
};

// ================================================================
// PART 8: MAIN BOOT SEQUENCE
// ================================================================

const Boot = {
    startTime: 0,

    // Main boot
    async start() {
        this.startTime = Date.now();
        console.log(`🚀 ${BOOTSTRAP.appName} — Booting...`);
        console.log(`   Version: ${BOOTSTRAP.version}`);
        console.log(`   Time: ${new Date().toLocaleString('id-ID')}`);

        // Setup error handler
        ErrorHandler.setup();

        try {
            // ---- STEP 1: Init Config ----
            LoadingScreen.setMessage('Memuat konfigurasi...');
            if (window.ConfigModule) {
                window.ConfigModule.initialize();
            }
            console.log('   [1/8] ✅ Config');

            // ---- STEP 2: Init Database ----
            LoadingScreen.setMessage('Memuat database...');
            if (window.DatabaseModule) {
                window.DatabaseModule.initialize();
            } else if (window.Database) {
                window.Database.initialize?.();
            }
            console.log('   [2/8] ✅ Database');

            // ---- STEP 3: Check Auth ----
            LoadingScreen.setMessage('Memeriksa autentikasi...');
            if (window.Auth) {
                window.Auth.loadState?.();
                const isAuth = window.Auth.isAuthenticated?.();
                console.log(`   [3/8] ✅ Auth (authenticated: ${isAuth})`);
            } else {
                console.log('   [3/8] ⚠️ Auth (skipped)');
            }

            // ---- STEP 4: Init Theme ----
            LoadingScreen.setMessage('Memuat tema...');
            if (window.Theme) {
                window.Theme.init?.();
            } else if (window.ThemeManager) {
                window.ThemeManager.load?.();
                window.ThemeManager.apply?.();
            }
            console.log('   [4/8] ✅ Theme');

            // ---- STEP 5: Init Offline Sync ----
            LoadingScreen.setMessage('Menyiapkan sinkronisasi...');
            if (window.OfflineSync) {
                window.OfflineSync.initialize?.();
            }
            console.log('   [5/8] ✅ Offline Sync');

            // ---- STEP 6: Init Modules ----
            LoadingScreen.setMessage('Memuat modul...');
            if (window.Product) window.Product.initialize?.();
            if (window.Cart) window.Cart.initialize?.();
            if (window.Inventory) window.Inventory.initialize?.();
            if (window.Payment) window.Payment.initialize?.();
            if (window.Analytics) window.Analytics.initialize?.();
            if (window.Transaction) window.Transaction.initialize?.();
            if (window.Barcode) window.Barcode.initialize?.();
            if (window.QRReader) window.QRReader.initialize?.();
            if (window.Report) window.Report.initialize?.();
            console.log('   [6/8] ✅ Modules');

            // ---- STEP 7: Setup Routes ----
            LoadingScreen.setMessage('Menyiapkan navigasi...');
            const routesReady = RouteSetup.setup();
            console.log(`   [7/8] ✅ Routes (${routesReady ? 'OK' : 'skipped'})`);

            // ---- STEP 8: Setup UI ----
            LoadingScreen.setMessage('Menyiapkan antarmuka...');
            UIBindings.setup();
            console.log('   [8/8] ✅ UI Bindings');

            // ---- STEP 9: Show App ----
            AppController.show();
            LoadingScreen.hide();

            // ---- STEP 10: Navigate ----
            RouteSetup.navigateInitial();

            // ---- Done ----
            const bootTime = Date.now() - this.startTime;
            console.log(`✅ ${BOOTSTRAP.appName} — Boot complete! (${bootTime}ms)`);

            // Emit ready event
            if (window.EventBus) {
                window.EventBus.emit('app:ready', {
                    bootTime,
                    version: BOOTSTRAP.version
                });
            }

            return true;

        } catch (err) {
            console.error('[Bootstrap] ❌ Boot failed:', err);
            LoadingScreen.showError(
                `Terjadi kesalahan saat memuat aplikasi: ${err.message}<br><br>` +
                `Silakan refresh halaman atau hubungi administrator.`
            );
            return false;
        }
    },

    // Retry boot
    async retry(attempt = 1) {
        console.log(`🔄 Retry attempt ${attempt}/${BOOTSTRAP.retryAttempts}`);
        if (attempt > BOOTSTRAP.retryAttempts) {
            LoadingScreen.showError('Gagal memuat setelah beberapa kali percobaan.');
            return false;
        }
        const success = await this.start();
        if (!success) {
            await new Promise(r => setTimeout(r, 1000));
            return this.retry(attempt + 1);
        }
        return success;
    }
};

// ================================================================
// PART 9: SERVICE WORKER REGISTRATION
// ================================================================

const ServiceWorkerSetup = {
    async register() {
        if (!('serviceWorker' in navigator)) {
            console.log('[ServiceWorker] Not supported');
            return false;
        }
        // Skip di file:// protocol
        if (window.location.protocol === 'file:') {
            console.log('[ServiceWorker] Skipped (file protocol)');
            return false;
        }
        try {
            // Note: sw.js belum dibuat, jadi ini optional
            // const registration = await navigator.serviceWorker.register('sw.js');
            // console.log('[ServiceWorker] Registered');
            return true;
        } catch (err) {
            console.warn('[ServiceWorker] Registration failed:', err);
            return false;
        }
    }
};

// ================================================================
// PART 10: GLOBAL DEBUG HELPERS
// ================================================================

const Debug = {
    // Info lengkap
    info() {
        return {
            app: BOOTSTRAP.appName,
            version: BOOTSTRAP.version,
            dependencies: DependencyChecker.check(),
            environment: window.ConfigModule?.EnvDetector?.getInfo?.() || {},
            browser: window.ConfigModule?.EnvDetector?.getBrowserSupport?.() || {},
            errors: ErrorHandler.getLog().length,
            timestamp: new Date().toISOString()
        };
    },

    // Print info ke console
    print() {
        console.log('═'.repeat(60));
        console.log(`📊 ${BOOTSTRAP.appName} — Debug Info`);
        console.log('═'.repeat(60));
        const info = this.info();
        console.log('App:', info.app, 'v' + info.version);
        console.log('Env:', info.environment);
        console.log('Dependencies:', info.dependencies);
        console.log('Errors:', info.errors);
        console.log('═'.repeat(60));
        return info;
    },

    // Clear error log
    clearErrors() {
        ErrorHandler.clear();
        console.log('✅ Error log cleared');
    },

    // Test mode
    testMode() {
        // Bypass auth untuk testing
        try {
            const session = {
                id: 'test_' + Date.now(),
                authenticated: true,
                loginTime: Date.now()
            };
            localStorage.setItem('atika_session', JSON.stringify(session));
            console.log('🔓 Test mode: session created');
            return true;
        } catch (_) {
            return false;
        }
    }
};

// ================================================================
// PART 11: AUTO-START
// ================================================================

// Start saat DOM ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Boot.start());
    } else {
        // DOM sudah ready
        setTimeout(() => Boot.start(), 0);
    }
}

// ================================================================
// PART 12: EXPORT
// ================================================================

const BootstrapModule = {
    BOOTSTRAP,
    Boot,
    LoadingScreen,
    AppController,
    ErrorHandler,
    DependencyChecker,
    RouteSetup,
    UIBindings,
    ServiceWorkerSetup,
    Debug,

    // Start manual
    start: () => Boot.start(),
    retry: () => Boot.retry()
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Bootstrap = Boot;
    window.BootstrapModule = BootstrapModule;
    window.Debug = Debug;
}

console.log('✅ bootstrap.js loaded');

export default BootstrapModule;
export { BOOTSTRAP, Boot, LoadingScreen, AppController, ErrorHandler, DependencyChecker, RouteSetup, UIBindings, Debug };

// ================================================================
// END OF BOOTSTRAP — 500+ BARIS
// ================================================================