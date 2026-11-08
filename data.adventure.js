'use strict';

// Each stage introduces one mechanic; level 10 combines them in short waves.
export const STAGES = Object.freeze([
  { speed: 72, delay: 1550, goal: 6, title: 'Primeras capturas', hint: 'Lee y recoge. Tres aciertos seguidos cargan un poder.' },
  { speed: 96, delay: 1400, goal: 6, title: 'Toma velocidad', hint: 'Las notas bajan más rápido. Anticipa tu movimiento.' },
  { speed: 123, delay: 1200, goal: 7, title: 'Más opciones', hint: 'Más notas en pantalla: deja pasar las que no corresponden.' },
  { speed: 151, delay: 1100, goal: 7, noise: true, title: '¡Cuidado con el ruido!', hint: 'Las bolas con una X cortan tu racha. No quitan vidas.' },
  { speed: 180, delay: 1020, goal: 8, noise: true, burst: true, title: 'Lluvia musical', hint: 'Alternan ráfagas cortas y lluvia continua. Conserva tu energía.' },
  { speed: 210, delay: 950, goal: 8, noise: true, burst: true, title: 'Sigue el pulso', hint: 'Las ráfagas aceleran. Activa un poder cuando lo necesites.' },
  { speed: 240, delay: 920, goal: 9, noise: true, burst: true, drift: true, title: 'Notas viajeras', hint: 'Algunas notas se mueven a los lados. Sigue su trayectoria.' },
  { speed: 270, delay: 900, goal: 9, noise: true, burst: true, drift: true, wind: true, title: 'Viento musical', hint: 'Una flecha avisa antes del viento. Todas las notas se desvían.' },
  { speed: 300, delay: 870, goal: 10, noise: true, burst: true, drift: true, wind: true, puddles: true, title: 'Suelo pegajoso', hint: 'Los charcos morados frenan a Musi. Se anuncian antes de aparecer.' },
  { speed: 330, delay: 830, goal: 12, noise: true, burst: true, drift: true, wind: true, puddles: true, finale: true, title: 'La gran melodía', hint: 'Tres oleadas, doce aciertos. Usa los descansos para prepararte.' },
]);

export function stageFor(level) {
  return STAGES[Math.max(0, Math.min(9, Math.floor(Number(level) || 1) - 1))];
}

export function starsFor(correct, wrong, won = true) {
  if (!won || correct <= 0) return 0;
  const accuracy = correct / (correct + wrong);
  return accuracy >= 0.9 ? 3 : accuracy >= 0.75 ? 2 : 1;
}

export const SKINS = Object.freeze([
  { id: 'explorer', label: 'Explorador', requirement: 'Disponible desde el inicio', color: 0xf1bc65 },
  { id: 'astronaut', label: 'Astronauta', requirement: 'Completa una ruta de 10 niveles', color: 0x66d9ef },
  { id: 'conductor', label: 'Director', requirement: 'Completa las tres rutas', color: 0xffd568 },
]);

export function completedRoutes(progress) {
  return ['lines', 'spaces', 'mixed'].filter(mode => (progress.best?.[`${mode}-10`]?.score || 0) > 0);
}

export function unlockedSkins(progress) {
  const count = completedRoutes(progress).length;
  return SKINS.filter(s => s.id === 'explorer' || (s.id === 'astronaut' ? count >= 1 : count === 3));
}

// Source images are preserved. Phaser frames remove transparent outer margins.
export const CHARACTER_ART = {
  explorer: {
    image: 'assets/characters/explorer.png',
    crop: { x: 266, y: 22, width: 690, height: 1205 },
    sheet: 'assets/characters/explorer-catch.png',
    frameWidth: 543, frameHeight: 724,
    sheetCrop: { x: 48, y: 18, width: 444, height: 686 },
  },
  astronaut: {
    image: 'assets/characters/astronaut.png', sheet: 'assets/characters/astronaut-catch.png',
    crop: { x: 194, y: 0, width: 862, height: 1241 },
    frameWidth: 543, frameHeight: 724,
    sheetCrop: { x: 42, y: 10, width: 460, height: 700 },
  },
  conductor: {
    image: 'assets/characters/conductor.png', sheet: 'assets/characters/conductor-catch.png',
    crop: { x: 214, y: 2, width: 814, height: 1248 },
    frameWidth: 543, frameHeight: 724,
    sheetCrop: { x: 42, y: 10, width: 460, height: 700 },
  },
};
