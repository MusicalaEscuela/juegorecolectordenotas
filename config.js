/* config.js — Musi · Recolector de Notas (PRO+)
   Config central del juego (Phaser)
   ✅ Responsive (FIT + autoCenter) con base 800x600 (4:3)
   ✅ Parent: "phaser-root" (index.html)
   ✅ Defaults sensatos para web/móvil (input, focus, context menu)
   ✅ Helpers para “nudge” de resize (arregla el bug de “se ve gigante hasta minimizar”)
*/

'use strict';

export const CFG = Object.freeze({
  // Canvas base (tu “diseño” vive en estas proporciones)
  BASE_W: 800,
  BASE_H: 600,

  // UI safe zones (por si luego quieres respetar HUD/objetivo)
  HUD_PAD: 16,

  // Colores base (claritos, como debe ser 😌)
  COLORS: Object.freeze({
    BG: '#f6f8ff',
    TEXT: '#0b1020',
    MOZART: '#0C41C4',
    BEETHOVEN: '#680DBF',
    BRAHMS: '#CE0071',
  }),

  // Física (Arcade)
  // Ojo: si tus notas no usan gravedad (solo velocity), esto no estorba.
  GRAVITY_Y: 320,

  // Render/Perf
  RENDER: Object.freeze({
    antialias: true,
    roundPixels: false,
    pixelArt: false,
    // "high-performance" ayuda un poquito en algunos navegadores
    powerPreference: 'high-performance',
  }),

  // Input
  INPUT: Object.freeze({
    activePointers: 2,
    touch: true,
    mouse: true,
    // evita “click derecho = menú” encima del canvas en desktop
    disableContextMenu: true,
  }),

  // Debug flags
  DEBUG: Object.freeze({
    physics: false,
  }),
});

/**
 * makePhaserConfig(scenes)
 * Crea config listo para Phaser.Game
 */
export function makePhaserConfig(scenes) {
  return {
    type: Phaser.AUTO,
    parent: 'phaser-root',
    backgroundColor: CFG.COLORS.BG,

    // Evita el banner de Phaser (nadie lo pidió)
    banner: false,

    // Escalado responsive sin romper el layout
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: document.getElementById('phaser-root').clientWidth || CFG.BASE_W,
      height: document.getElementById('phaser-root').clientHeight || CFG.BASE_H,
    },

    render: {
      antialias: CFG.RENDER.antialias,
      roundPixels: CFG.RENDER.roundPixels,
      pixelArt: CFG.RENDER.pixelArt,
      powerPreference: CFG.RENDER.powerPreference,
    },

    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: CFG.GRAVITY_Y },
        debug: CFG.DEBUG.physics,
      },
    },

    // Input: útil para móvil (y menos “cosas raras” en desktop)
    input: {
      activePointers: CFG.INPUT.activePointers,
      touch: CFG.INPUT.touch,
      mouse: CFG.INPUT.mouse,
      // Phaser 3 soporta esto en config para evitar context menu en canvas
      disableContextMenu: CFG.INPUT.disableContextMenu,
      // Mantiene el juego enfocado cuando el usuario interactúa
      // (si lo quitas, a veces el teclado “no responde” hasta click)
      // autoFocus existe en algunas builds, si no existe, no rompe.
      autoFocus: true,
    },

    // Scenes (las pasas desde game.js)
    scene: scenes,
  };
}

/**
 * bindResizeNudges(game)
 * Soluciona el clásico: “se ve gigante hasta que minimizo o cambio tamaño”.
 * Úsalo en game.js justo después de crear el Phaser.Game.
 *
 * - Escucha el evento "musi:resize" que dispara tu index.html.
 * - Refresca el Scale Manager en 1-2 frames.
 */
export function bindResizeNudges(game) {
  if (!game || !game.scale) return () => {};

  const refresh = () => {
    try {
      // refresh() recalcula el tamaño real del parent
      game.scale.refresh();
    } catch {}
  };

  const raf2 = () => requestAnimationFrame(() => requestAnimationFrame(refresh));

  const onResize = () => raf2();
  const onVisibility = () => {
    // cuando vuelves a la pestaña, a veces queda desfasado
    if (!document.hidden) raf2();
  };

  window.addEventListener('musi:resize', onResize);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  // “nudge” inicial por si acaso
  raf2();

  // cleanup
  return () => {
    window.removeEventListener('musi:resize', onResize);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
