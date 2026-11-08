/* entity.note.js — Musi · Recolector de Notas (PRO+++)
   Nota “jugable” (no mini-partitura)
   ✅ SIEMPRE usa 'noteBase' (assets/note.png) como cuerpo de la nota
   ✅ Label opcional (Mi/Fa/Sol...) para modo principiante
   ✅ Hitbox consistente (usa displayWidth/Height) + shrink configurable
   ✅ _kill() seguro + cleanup de listeners y label
   ✅ _syncLabel() para que GameScene la reposicione (sin listeners por nota)
   ✅ Opcional: worldBounds (apagado por defecto, porque a las notas no les interesa rebotar)
*/

'use strict';

const NOTE_META = Object.freeze({
  Mi:  { label: 'Mi'  },
  Fa:  { label: 'Fa'  },
  Sol: { label: 'Sol' },
  La:  { label: 'La'  },
  Si:  { label: 'Si'  },
  Do:  { label: 'Do'  },
  Re:  { label: 'Re'  },
});

const DEFAULTS = Object.freeze({
  textureKey: 'noteBase',
  depth: 20,
  scale: 0.085,

  showLabel: true,
  labelMode: 'side', // 'side' | 'above'
  labelAlpha: 0.98,
  labelFontSize: 24,

  // hitbox
  hitboxShrink: 0.72,
  minHitbox: 10,

  // fall speed (clamp)
  minFall: 40,
  maxFall: 600,

  // physics flags
  allowGravity: false,
  worldBounds: false, // 👈 por defecto NO: evita rebotes y eventos innecesarios

  // perf: por defecto NO listeners por nota
  autoSyncLabel: false,
});

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function resolveMeta(noteId) {
  const id = String(noteId ?? 'Mi');
  return NOTE_META[id] || { label: id };
}

function createLabel(scene, text, depth, alpha = DEFAULTS.labelAlpha, fontSize = DEFAULTS.labelFontSize) {
  // label “chip” legible encima de fondos locos
  return scene.add.text(0, 0, text, {
    resolution: 2,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: `${fontSize}px`,
    color: '#0b1020',
    fontStyle: 'bold',
    backgroundColor: '#ffffff',
    padding: { left: 8, right: 8, top: 5, bottom: 5 },
  })
    .setOrigin(0.5)
    .setDepth(depth)
    .setAlpha(1);
}

function placeLabel(note, label, mode, offsetX, offsetY) {
  if (!label || !note) return;

  const m = mode === 'above' ? 'above' : 'side';

  // Defaults del “al ladito”
  const dx = (offsetX != null) ? Number(offsetX) : (m === 'side' ? note.displayWidth/2 + 22 : 0);
  const dy = (offsetY != null) ? Number(offsetY) : (m === 'side' ? -6 : -44);

  label.setPosition(note.x + dx, note.y + dy);
}

/**
 * spawnNote(scene, opts)
 * Crea una nota física que cae con label opcional.
 */
export function spawnNote(scene, opts = {}) {
  if (!scene?.physics?.add?.sprite) {
    throw new Error('spawnNote: la escena no tiene Arcade Physics activo (scene.physics.add.sprite no existe).');
  }

  const {
    x = 200,
    y = -60,
    noteId = 'Mi',
    unit = 1,

    // velocidad
    velocityY = 110,

    // look & UX
    textureKey = DEFAULTS.textureKey,
    depth = DEFAULTS.depth,
    scale = DEFAULTS.scale,

    showLabel = DEFAULTS.showLabel,
    labelMode = DEFAULTS.labelMode,
    labelOffsetX = null,
    labelOffsetY = null,
    labelAlpha = DEFAULTS.labelAlpha,
    labelFontSize = DEFAULTS.labelFontSize,

    // gameplay
    isDistractor = false,

    // hitbox
    hitboxShrink = DEFAULTS.hitboxShrink,
    minHitbox = DEFAULTS.minHitbox,

    // clamps
    minFall = DEFAULTS.minFall,
    maxFall = DEFAULTS.maxFall,

    // physics behavior
    allowGravity = DEFAULTS.allowGravity,
    worldBounds = DEFAULTS.worldBounds,

    // perf
    autoSyncLabel = DEFAULTS.autoSyncLabel,
  } = opts;

  const meta = resolveMeta(noteId);

  // ✅ SIEMPRE: la nota es 'noteBase' (o la key que le pases, pero no depende de noteId)
  const note = scene.physics.add.sprite(x, y, textureKey);
  note.setOrigin(0.5);
  note.setDepth(depth);

  // Identidad
  note.noteId = String(noteId);
  note.isDistractor = !!isDistractor;

  // Visual
  note.setDisplaySize(28*unit, 40*unit);
  // A light badge keeps the same black note legible on light and dark worlds.
  note._badge = scene.add.ellipse(x, y, note.displayWidth + 18*unit, note.displayHeight + 12*unit, 0xffffff, 0.97)
    .setStrokeStyle(Math.max(1, 1.5*unit), 0x3d6eaf, 0.9)
    .setDepth(depth - 1);

  // Física
  if (note.body) {
    note.body.setAllowGravity(!!allowGravity);

    const vy = clamp(Number(velocityY), Number(minFall), Number(maxFall));
    note.setVelocity(0, vy);

    // Hitbox: usa displayWidth/Height (ya escalados)
    const shrink = clamp(Number(hitboxShrink), 0.35, 1.0);
    const bw = Math.max(Number(minHitbox), note.width * shrink);
    const bh = Math.max(Number(minHitbox), note.height * shrink);
    note.body.setSize(bw, bh, true);

    // World bounds (apagado por defecto)
    if (worldBounds) {
      note.setCollideWorldBounds(true);
      note.body.onWorldBounds = true;
    } else {
      note.setCollideWorldBounds(false);
      note.body.onWorldBounds = false;
    }
  }

  // Label opcional
  if (showLabel) {
    note._label = createLabel(scene, meta.label, depth + 1, labelAlpha, Math.max(16,labelFontSize*unit));
    placeLabel(note, note._label, labelMode, labelOffsetX, labelOffsetY);
  }

  // Sync (para llamarlo desde GameScene.update)
  note._syncLabel = () => {
    if (!note.active) return;
    if (note._badge) {
      const currentUnit = note.displayHeight / 40;
      note._badge.setPosition(note.x, note.y).setSize(note.displayWidth + 18*currentUnit, note.displayHeight + 12*currentUnit);
    }
    if (note._label) placeLabel(note, note._label, labelMode, labelOffsetX, labelOffsetY);
  };

  // (Opcional) Auto-sync con listener: NO recomendado si hay muchas notas
  let _updateOff = null;
  if (autoSyncLabel) {
    const fn = () => note._syncLabel?.();
    scene.events.on('update', fn);
    _updateOff = () => scene.events.off('update', fn);
  }

  // Limpieza segura (idempotente)
  note._kill = () => {
    if (!note || !note.active) return;
    _updateOff?.();
    _updateOff = null;

    note._badge?.destroy();
    note._badge = null;

    if (note._label) {
      note._label.destroy();
      note._label = null;
    }

    note.destroy();
  };

  return note;
}
