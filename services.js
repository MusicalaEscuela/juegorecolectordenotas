/* services.js — Musi · Recolector de Notas (PRO+++)
   “Kernel” liviano para no llenar escenas de mugre.
   Incluye:
   ✅ Events: bus global (con off fn)
   ✅ State: estado único (run) + helpers + métricas útiles
   ✅ Storage: settings + progreso (localStorage) con migración simple
   ✅ Audio: wrapper robusto (SFX/Music + mute/volumen + unlock móvil)
*/

'use strict';

/* =========================
   Events (mini bus)
========================= */
export const Events = (() => {
  const ee = new Phaser.Events.EventEmitter();

  const on = (evt, fn, ctx) => { ee.on(evt, fn, ctx); return () => ee.off(evt, fn, ctx); };
  const once = (evt, fn, ctx) => { ee.once(evt, fn, ctx); return () => ee.off(evt, fn, ctx); };
  const off = (evt, fn, ctx) => { ee.off(evt, fn, ctx); };
  const emit = (evt, payload) => { ee.emit(evt, payload); };
  const clear = () => ee.removeAllListeners();

  return { on, once, off, emit, clear };
})();

/* =========================
   Event name constants
========================= */
export const EVT = Object.freeze({
  STATE_RESET: 'STATE_RESET',
  STATE_CHANGED: 'STATE_CHANGED',
  LIFE_CHANGED: 'LIFE_CHANGED',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',

  AUDIO_MUTED: 'AUDIO_MUTED',
  AUDIO_VOLUMES: 'AUDIO_VOLUMES',
  AUDIO_UNLOCKED: 'AUDIO_UNLOCKED',

  NOTE_COLLECTED: 'NOTE_COLLECTED',
  NOTE_WRONG: 'NOTE_WRONG',
  LEVEL_WIN: 'LEVEL_WIN',
  GAME_OVER: 'GAME_OVER',
});

/* =========================
   Storage
========================= */
const LS_KEYS = {
  settings: 'musi_settings_v2',
  progress: 'musi_progress_v2',

  // legacy (por si ya había data)
  legacySettings: 'musi_settings_v1',
  legacyProgress: 'musi_progress_v1',
};

function safeJSONParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function safeLocalStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLocalStorageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function safeLocalStorageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

const DEFAULT_SETTINGS = Object.freeze({
  muted: false,
  musicVolume: 0.45,
  sfxVolume: 0.75,
  inputMode: 'auto', // 'auto' | 'pointer' | 'keyboard'
});

const DEFAULT_PROGRESS = Object.freeze({
  unlocked: { lines: 1, spaces: 1, mixed: 1 },
  best: {}, // best[lessonId] = { score, lives, date }
});

function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  s.muted = !!s.muted;
  s.musicVolume = clampNum(s.musicVolume, 0, 1, DEFAULT_SETTINGS.musicVolume);
  s.sfxVolume = clampNum(s.sfxVolume, 0, 1, DEFAULT_SETTINGS.sfxVolume);
  s.inputMode = ['auto', 'pointer', 'keyboard'].includes(s.inputMode) ? s.inputMode : 'auto';
  return s;
}

function normalizeProgress(raw) {
  const p = { ...DEFAULT_PROGRESS, ...(raw || {}) };
  p.unlocked = p.unlocked || { lines: 1, spaces: 1, mixed: 1 };
  p.unlocked.lines = Math.max(1, Number(p.unlocked.lines || 1));
  p.unlocked.spaces = Math.max(1, Number(p.unlocked.spaces || 1));
  p.unlocked.mixed = Math.max(1, Number(p.unlocked.mixed || 1));
  p.best = p.best || {};
  return p;
}

function clampNum(v, a, b, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(a, Math.min(b, n));
}

// Migración simple: si existe v1 y no existe v2, copia a v2
function migrateIfNeeded() {
  const v2Settings = safeLocalStorageGet(LS_KEYS.settings);
  const v2Progress = safeLocalStorageGet(LS_KEYS.progress);

  if (!v2Settings) {
    const legacy = safeLocalStorageGet(LS_KEYS.legacySettings);
    if (legacy) safeLocalStorageSet(LS_KEYS.settings, legacy);
  }

  if (!v2Progress) {
    const legacy = safeLocalStorageGet(LS_KEYS.legacyProgress);
    if (legacy) safeLocalStorageSet(LS_KEYS.progress, legacy);
  }
}

migrateIfNeeded();

export const Storage = {
  getSettings() {
    const raw = safeLocalStorageGet(LS_KEYS.settings);
    return normalizeSettings(safeJSONParse(raw, null));
  },

  setSettings(next) {
    const normalized = normalizeSettings(next);
    safeLocalStorageSet(LS_KEYS.settings, JSON.stringify(normalized));
    return normalized;
  },

  patchSettings(patch = {}) {
    const cur = Storage.getSettings();
    return Storage.setSettings({ ...cur, ...(patch || {}) });
  },

  getProgress() {
    const raw = safeLocalStorageGet(LS_KEYS.progress);
    return normalizeProgress(safeJSONParse(raw, null));
  },

  setProgress(next) {
    const normalized = normalizeProgress(next);
    safeLocalStorageSet(LS_KEYS.progress, JSON.stringify(normalized));
    return normalized;
  },

  patchProgress(patch = {}) {
    const cur = Storage.getProgress();
    return Storage.setProgress({ ...cur, ...(patch || {}) });
  },

  clearAll() {
    safeLocalStorageRemove(LS_KEYS.settings);
    safeLocalStorageRemove(LS_KEYS.progress);
    // también limpia legacy por si acaso
    safeLocalStorageRemove(LS_KEYS.legacySettings);
    safeLocalStorageRemove(LS_KEYS.legacyProgress);
  },
};

/* =========================
   State (run state)
========================= */
export const State = (() => {
  const s = {
    mode: 'mixed',
    lessonId: null,
    level: 1,

    score: 0,
    correct: 0,
    wrong: 0,

    lives: 3,
    target: null,

    paused: false,

    startedAt: 0,
    lastActionAt: 0,
  };

  const snapshot = () => ({ ...s });

  const resetRun = (opts = {}) => {
    s.mode     = opts.mode ?? 'mixed';
    s.level    = opts.level ?? 1;
    s.lessonId = opts.lessonId ?? `${s.mode}-${s.level}`;

    s.score   = 0;
    s.correct = 0;
    s.wrong   = 0;

    s.lives   = opts.lives ?? 3;
    s.target  = opts.target ?? null;

    s.paused = false;
    s.startedAt = Date.now();
    s.lastActionAt = s.startedAt;

    Events.emit(EVT.STATE_RESET, snapshot());
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return snapshot();
  };

  const set = (patch = {}) => {
    Object.assign(s, patch);
    s.lastActionAt = Date.now();
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return snapshot();
  };

  const inc = (key, delta = 1) => {
    const n = Number(delta);
    s[key] = (s[key] ?? 0) + (Number.isFinite(n) ? n : 1);
    s.lastActionAt = Date.now();
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return snapshot();
  };

  const loseLife = (n = 1) => {
    const dec = Number.isFinite(Number(n)) ? Number(n) : 1;
    s.lives = Math.max(0, s.lives - dec);
    s.lastActionAt = Date.now();
    Events.emit(EVT.LIFE_CHANGED, { lives: s.lives, ...snapshot() });
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return s.lives;
  };

  const pause = () => {
    if (s.paused) return snapshot();
    s.paused = true;
    s.lastActionAt = Date.now();
    Events.emit(EVT.PAUSE, snapshot());
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return snapshot();
  };

  const resume = () => {
    if (!s.paused) return snapshot();
    s.paused = false;
    s.lastActionAt = Date.now();
    Events.emit(EVT.RESUME, snapshot());
    Events.emit(EVT.STATE_CHANGED, snapshot());
    return snapshot();
  };

  const get = () => snapshot();

  // Helpers “útiles de verdad”
  const elapsedMs = () => Math.max(0, Date.now() - (s.startedAt || Date.now()));
  const accuracy = () => {
    const total = (s.correct || 0) + (s.wrong || 0);
    return total <= 0 ? 0 : (s.correct / total);
  };

  return {
    get,
    resetRun,
    set,
    inc,
    loseLife,
    pause,
    resume,
    elapsedMs,
    accuracy,
  };
})();

/* =========================
   Audio (wrapper robusto)
========================= */
export const Audio = (() => {
  let scene = null;
  let music = null;
  let settings = Storage.getSettings();

  // Anti-spam SFX (evita “tatatatata” si choca rápido)
  const _lastSfxAt = new Map();

  const _applyMute = () => {
    if (scene?.sound) scene.sound.mute = !!settings.muted;
  };

  const bind = (phaserScene) => {
    scene = phaserScene;
    settings = Storage.getSettings();
    _applyMute();

    // Avisar cuando se desbloquea audio en móvil
    if (scene?.sound) {
      scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        Events.emit(EVT.AUDIO_UNLOCKED, {});
      });
    }
  };

  const getSettings = () => ({ ...settings });

  const setMuted = (muted) => {
    settings = Storage.patchSettings({ muted: !!muted });
    _applyMute();
    Events.emit(EVT.AUDIO_MUTED, { muted: settings.muted });
    return settings.muted;
  };

  const setVolumes = ({ musicVolume, sfxVolume } = {}) => {
    settings = Storage.patchSettings({
      musicVolume: (musicVolume == null) ? settings.musicVolume : musicVolume,
      sfxVolume:   (sfxVolume == null) ? settings.sfxVolume : sfxVolume,
    });

    if (music) music.setVolume(settings.musicVolume);
    Events.emit(EVT.AUDIO_VOLUMES, { ...settings });
    return getSettings();
  };

  const playMusic = (key, opts = {}) => {
    if (!scene?.sound || !scene.cache.audio.exists(key)) return null;

    stopMusic();

    const vol = clampNum(opts.volume ?? settings.musicVolume ?? 0.45, 0, 1, 0.45);
    const loop = (opts.loop == null) ? true : !!opts.loop;

    music = scene.sound.add(key, { loop, volume: vol });

    // Si no está bloqueado, arranca ya
    if (!scene.sound.locked) music.play();

    // Si está bloqueado (móvil), arranca al UNLOCKED
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      if (music && !music.isPlaying) music.play();
    });

    return music;
  };

  const stopMusic = () => {
    if (!music) return;
    try { music.stop(); } catch {}
    try { music.destroy(); } catch {}
    music = null;
  };

  const pauseMusic = () => {
    try { music?.pause(); } catch {}
  };

  const resumeMusic = () => {
    try { music?.resume(); } catch {}
  };

  const sfx = (key, opts = {}) => {
    if (!scene?.sound || !scene.cache.audio.exists(key)) return;

    const now = Date.now();
    const cooldown = Number.isFinite(opts.cooldown) ? opts.cooldown : 40; // ms
    const last = _lastSfxAt.get(key) || 0;
    if (cooldown > 0 && (now - last) < cooldown) return;
    _lastSfxAt.set(key, now);

    const vol = clampNum(opts.volume ?? settings.sfxVolume ?? 0.75, 0, 1, 0.75);
    const detune = opts.detune ?? 0; // por si luego quieres variar pitch
    const rate = opts.rate ?? 1;

    scene.sound.play(key, { ...opts, volume: vol, detune, rate });
  };

  return {
    bind,
    getSettings,
    setMuted,
    setVolumes,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    sfx,
  };
})();
