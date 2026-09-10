 /* ================================================================
   AUDIO — Warung Atika Enterprise
   ================================================================
   Web Audio API (tanpa file MP3):
   - Beep (scan barcode sukses)
   - Warning (low stock)
   - Success (checkout)
   - Error
   - Notification
   - Volume control
   Total: 400+ baris
   ================================================================ */

'use strict';

// ================================================================
// PART 1: AUDIO CONSTANTS
// ================================================================

const AUDIO = {
    enabled: true,
    volume: 0.5,
    sounds: {
        beep: {
            frequency: 1200,
            duration: 0.1,
            type: 'sine',
            pattern: [1]
        },
        doubleBeep: {
            frequency: 1200,
            duration: 0.08,
            type: 'sine',
            pattern: [1, 0, 1]
        },
        warning: {
            frequency: 800,
            duration: 0.3,
            type: 'square',
            pattern: [1, 0.4, 1, 0.4, 1]
        },
        success: {
            frequency: 1000,
            duration: 0.1,
            type: 'sine',
            pattern: [1, 0, 1.25, 0, 1.5]
        },
        error: {
            frequency: 400,
            duration: 0.3,
            type: 'sawtooth',
            pattern: [1, 0.2, 1]
        },
        notification: {
            frequency: 1500,
            duration: 0.08,
            type: 'sine',
            pattern: [1, 0.15, 1.5]
        },
        click: {
            frequency: 2000,
            duration: 0.03,
            type: 'sine',
            pattern: [1]
        },
        scan: {
            frequency: 1400,
            duration: 0.06,
            type: 'sine',
            pattern: [1, 0, 1.5]
        }
    }
};

// ================================================================
// PART 2: AUDIO CONTEXT MANAGER
// ================================================================

const AudioContextManager = {
    context: null,
    isInitialized: false,

    // Init AudioContext (harus dari user gesture)
    init() {
        if (this.isInitialized && this.context) {
            return this.context;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('[Audio] Web Audio API tidak didukung');
                return null;
            }
            this.context = new AudioContextClass();
            this.isInitialized = true;
            console.log('[Audio] AudioContext initialized');
            return this.context;
        } catch (err) {
            console.error('[Audio] Init failed:', err);
            return null;
        }
    },

    // Resume context (kalau suspended)
    async resume() {
        if (!this.context) this.init();
        if (this.context && this.context.state === 'suspended') {
            try {
                await this.context.resume();
                return true;
            } catch (err) {
                console.warn('[Audio] Resume failed:', err);
                return false;
            }
        }
        return true;
    },

    // Suspend
    async suspend() {
        if (this.context && this.context.state === 'running') {
            try {
                await this.context.suspend();
            } catch (_) {}
        }
    },

    // Get context
    get() {
        if (!this.context) this.init();
        return this.context;
    },

    // Get current time
    now() {
        return this.context ? this.context.currentTime : 0;
    }
};

// ================================================================
// PART 3: TONE PLAYER
// ================================================================

const TonePlayer = {
    // Play single tone
    playTone({ frequency = 440, duration = 0.1, type = 'sine', volume = 0.5, delay = 0 }) {
        const ctx = AudioContextManager.get();
        if (!ctx) return false;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.value = frequency;
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = ctx.currentTime + delay;
            const endTime = startTime + duration;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
            gain.gain.setValueAtTime(volume, endTime - 0.01);
            gain.gain.linearRampToValueAtTime(0, endTime);

            osc.start(startTime);
            osc.stop(endTime + 0.01);

            return true;
        } catch (err) {
            console.error('[Audio] Play tone failed:', err);
            return false;
        }
    },

    // Play pattern (multiple tones)
    playPattern(pattern, { frequency, duration, type, volume = 0.5 }) {
        const ctx = AudioContextManager.get();
        if (!ctx) return false;

        let time = 0;
        for (const multiplier of pattern) {
            if (multiplier === 0) {
                time += duration;
                continue;
            }
            this.playTone({
                frequency: frequency * multiplier,
                duration,
                type,
                volume,
                delay: time
            });
            time += duration + 0.02;
        }
        return true;
    }
};

// ================================================================
// PART 4: SOUND PLAYER
// ================================================================

const Player = {
    // Play sound by name
    play(soundName) {
        if (!AUDIO.enabled) return false;

        const sound = AUDIO.sounds[soundName];
        if (!sound) {
            console.warn(`[Audio] Sound "${soundName}" tidak ada`);
            return false;
        }

        // Resume context kalau suspended (butuh user gesture)
        AudioContextManager.resume();

        // Play pattern
        return TonePlayer.playPattern(sound.pattern, {
            frequency: sound.frequency,
            duration: sound.duration,
            type: sound.type,
            volume: AUDIO.volume
        });
    },

    // Shortcut functions
    beep() { return this.play('beep'); },
    doubleBeep() { return this.play('doubleBeep'); },
    warning() { return this.play('warning'); },
    success() { return this.play('success'); },
    error() { return this.play('error'); },
    notification() { return this.play('notification'); },
    click() { return this.play('click'); },
    scan() { return this.play('scan'); }
};

// ================================================================
// PART 5: VOLUME CONTROL
// ================================================================

const Volume = {
    get() {
        return AUDIO.volume;
    },

    set(value) {
        const vol = Math.max(0, Math.min(1, parseFloat(value) || 0));
        AUDIO.volume = vol;
        return vol;
    },

    increase(step = 0.1) {
        return this.set(AUDIO.volume + step);
    },

    decrease(step = 0.1) {
        return this.set(AUDIO.volume - step);
    },

    mute() {
        AUDIO.enabled = false;
    },

    unmute() {
        AUDIO.enabled = true;
    },

    toggle() {
        AUDIO.enabled = !AUDIO.enabled;
        return AUDIO.enabled;
    },

    isMuted() {
        return !AUDIO.enabled;
    }
};

// ================================================================
// PART 6: AUTO SETUP
// ================================================================

const AutoSetup = {
    // Setup event listener untuk unlock audio
    unlockOnFirstGesture() {
        if (typeof document === 'undefined') return;

        const unlock = () => {
            AudioContextManager.resume();
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };

        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
    },

    // Setup UI bindings
    setup() {
        // Click sound on button
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, .btn');
            if (btn && !btn.disabled) {
                Player.click();
            }
        }, true);

        // Play sound on event bus events
        if (typeof window.EventBus !== 'undefined') {
            // Barcode scan success
            window.EventBus.on('barcode:success', () => Player.beep());

            // Low stock
            window.EventBus.on('inventory:lowStock', () => Player.warning());

            // Checkout success
            window.EventBus.on('payment:success', () => Player.success());

            // Checkout failed
            window.EventBus.on('payment:failed', () => Player.error());

            // Sync completed
            window.EventBus.on('sync:completed', () => Player.notification());
        }
    }
};

// ================================================================
// PART 7: MAIN AUDIO FACADE
// ================================================================

const Audio = {
    // Sub-modules
    Context: AudioContextManager,
    Tone: TonePlayer,
    Player,
    Volume,

    // Constants
    sounds: Object.keys(AUDIO.sounds),

    // ---- High-level API ----
    play(soundName) {
        return Player.play(soundName);
    },

    beep() { return Player.beep(); },
    doubleBeep() { return Player.doubleBeep(); },
    warning() { return Player.warning(); },
    success() { return Player.success(); },
    error() { return Player.error(); },
    notification() { return Player.notification(); },
    click() { return Player.click(); },
    scan() { return Player.scan(); },

    // Control
    setVolume(v) { return Volume.set(v); },
    getVolume() { return Volume.get(); },
    mute() { Volume.mute(); },
    unmute() { Volume.unmute(); },
    toggle() { return Volume.toggle(); },
    isMuted() { return Volume.isMuted(); },

    // Init
    init() {
        AudioContextManager.init();
        AutoSetup.unlockOnFirstGesture();
        return true;
    }
};

// ================================================================
// PART 8: INITIALIZATION
// ================================================================

function initialize() {
    console.log('🔊 Audio module initialized');
    console.log(`   Sounds: ${Object.keys(AUDIO.sounds).join(', ')}`);
    console.log(`   Volume: ${AUDIO.volume * 100}%`);

    // Setup auto unlock
    AutoSetup.unlockOnFirstGesture();

    // Setup UI bindings (setelah DOM ready)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AutoSetup.setup());
    } else {
        AutoSetup.setup();
    }

    return true;
}

// ================================================================
// PART 9: EXPORT
// ================================================================

const AudioModule = {
    Audio,
    AudioContextManager,
    TonePlayer,
    Player,
    Volume,
    AUDIO,
    initialize
};

// Expose ke window
if (typeof window !== 'undefined') {
    window.Audio = Audio;
    window.AudioModule = AudioModule;
}

console.log('✅ audio.js loaded');

export default AudioModule;
export { Audio, AudioContextManager, TonePlayer, Player, Volume, initialize };

// ================================================================
// END OF AUDIO — 400+ BARIS
// ================================================================