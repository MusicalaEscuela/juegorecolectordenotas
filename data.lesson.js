'use strict';

import { stageFor } from './data.adventure.js';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function isFiniteNum(n) { return Number.isFinite(Number(n)); }

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) deepFreeze(obj[key]);
  return obj;
}

function normGoalRule(ruleLike, fallback) {
  const src = ruleLike || fallback;
  const type = src?.type || fallback?.type || 'afterEachCorrect';

  if (type === 'everySeconds') {
    return { type: 'everySeconds', seconds: clamp(Number(src?.seconds ?? 6), 3, 12) };
  }

  return { type: 'afterEachCorrect', seconds: clamp(Number(src?.seconds ?? 6), 3, 12) };
}

function normWin(winLike, targetPerLevel) {
  const src = winLike || { type: 'collect', value: targetPerLevel };
  return {
    type: src.type || 'collect',
    value: clamp(Number(src.value ?? targetPerLevel), 1, 99),
  };
}

export const MODES = deepFreeze({
  lines: {
    id: 'lines',
    label: 'Lineas',
    description: 'Reconoce notas ubicadas sobre las lineas del pentagrama.',
    pool: ['Mi', 'Sol', 'Si', 'Re', 'Fa'],
    minOpen: 2,
  },
  spaces: {
    id: 'spaces',
    label: 'Espacios',
    description: 'Entrena la lectura de notas que viven entre lineas.',
    pool: ['Fa', 'La', 'Do', 'Mi'],
    minOpen: 2,
  },
  mixed: {
    id: 'mixed',
    label: 'Mixto',
    description: 'Combina lineas y espacios para un reto mas completo.',
    pool: ['Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re'],
    minOpen: 3,
  },
});

export const BACKGROUND_FILES = deepFreeze({
  bg1: 'assets/background.png',
  bg2: 'assets/background2.png',
  bg3: 'assets/background3.png',
  bg5: 'assets/background5.png',
  bg6: 'assets/background6.png',
  bg7: 'assets/background7.png',
  bg8: 'assets/background8.png',
  bg9: 'assets/background9.png',
  bg10: 'assets/background10.png',
  bg11: 'assets/background11.png',
});

export const BACKGROUNDS = Object.freeze(Object.keys(BACKGROUND_FILES));

export const DEFAULT_RULES = deepFreeze({
  targetPerLevel: 5,
  lives: 3,
  spawnDelay: 1600,
  spawnDelayMin: 950,
  fallMin: 65,
  fallMax: 90,
  fallGrowth: 7,
  goalRule: { type: 'afterEachCorrect', seconds: 6 },
  distractorChance: 0,
  win: { type: 'collect', value: 5 },
  maxLevel: 10,
});

export const MAX_LEVEL = DEFAULT_RULES.maxLevel;

const LEVEL_BANDS = deepFreeze([
  {
    id: 'explora',
    min: 1,
    max: 3,
    label: 'Exploracion',
    caption: 'Ritmo amable y apoyo visual completo para ubicar la nota objetivo.',
    accent: 0x59d7ff,
    noteLabelAlpha: 0.98,
    labelFontSize: 18,
    noteScale: 0.086,
  },
  {
    id: 'practica',
    min: 4,
    max: 6,
    label: 'Practica guiada',
    caption: 'Se abren mas notas y el ritmo empieza a exigir atencion sostenida.',
    accent: 0xffd166,
    noteLabelAlpha: 0.92,
    labelFontSize: 18,
    noteScale: 0.084,
  },
  {
    id: 'desafio',
    min: 7,
    max: 10,
    label: 'Desafio',
    caption: 'Combina todas las posiciones con un ritmo más ágil.',
    accent: 0xff6b9c,
    noteLabelAlpha: 0.86,
    labelFontSize: 18,
    noteScale: 0.082,
  },
]);

function bandFor(level) {
  const lvl = clamp(Number(level || 1), 1, MAX_LEVEL);
  return LEVEL_BANDS.find((band) => lvl >= band.min && lvl <= band.max) || LEVEL_BANDS[0];
}

export function getLevelBand(level) {
  return bandFor(level);
}

function progressivePool(modeId, level) {
  const mode = MODES[modeId] || MODES.mixed;
  const count = clamp((mode.minOpen ?? 2) + Math.floor((level - 1) / 2), 1, mode.pool.length);
  return mode.pool.slice(0, count);
}

function bgFor(level) {
  const index = (clamp(Number(level || 1), 1, MAX_LEVEL) - 1) % BACKGROUNDS.length;
  return BACKGROUNDS[index];
}

function spawnDelayFor(level, overrides) {
  if (overrides?.spawnDelay != null) return Number(overrides.spawnDelay);

  return stageFor(level).delay;
}

function targetFor(level, overrides) {
  if (overrides?.targetPerLevel != null) return Number(overrides.targetPerLevel);
  return stageFor(level).goal;
}

function fallFor(level, overrides) {
  const lvl = Math.max(1, Number(level || 1));
  const minBase = stageFor(lvl).speed;
  const maxBase = stageFor(lvl).speed + 18;

  const fallMin = Math.max(20, Number(overrides?.fallMin ?? minBase));
  const fallMax = Math.max(fallMin + 12, Number(overrides?.fallMax ?? maxBase));

  return { fallMin, fallMax };
}

function goalRuleFor(level, overrides) {
  if (overrides?.goalRule || overrides?.goalChange) {
    return normGoalRule(overrides.goalRule || overrides.goalChange, DEFAULT_RULES.goalRule);
  }

  const lvl = Math.max(1, Number(level || 1));
   
   
  return DEFAULT_RULES.goalRule;
}

function makeLesson(modeId, level, overrides = {}) {
  const mode = MODES[modeId] || MODES.mixed;
  const lvl = clamp(Number(level || 1), 1, MAX_LEVEL);
  const band = bandFor(lvl);

  const pool = Array.isArray(overrides.pool) && overrides.pool.length
    ? overrides.pool
    : progressivePool(modeId, lvl);

  const targetPerLevel = clamp(targetFor(lvl, overrides), 1, 20);
  const { fallMin, fallMax } = fallFor(lvl, overrides);

  return {
    id: `${modeId}-${lvl}`,
    adventure: stageFor(lvl),
    mode: modeId,
    level: lvl,
    title: `${mode.label} · Nivel ${lvl}`,
    scene: {
      backgroundKey: overrides.backgroundKey ?? bgFor(lvl),
      music: overrides.music ?? 'bgMusic',
    },
    notes: {
      pool,
      goalRule: goalRuleFor(lvl, overrides),
    },
    rules: {
      lives: clamp(Number(overrides.lives ?? DEFAULT_RULES.lives), 1, 9),
      targetPerLevel,
      spawnDelay: spawnDelayFor(lvl, overrides),
      fallMin,
      fallMax,
      distractorChance: clamp(Number(overrides.distractorChance ?? DEFAULT_RULES.distractorChance), 0, 1),
      win: normWin(overrides.win, targetPerLevel),
    },
    ui: {
      phaseId: band.id,
      phaseLabel: overrides.phaseLabel ?? band.label,
      phaseCaption: overrides.phaseCaption ?? band.caption,
      accent: overrides.accent ?? band.accent,
      noteLabelAlpha: clamp(Number(overrides.noteLabelAlpha ?? band.noteLabelAlpha), 0.55, 1),
      labelFontSize: clamp(Number(overrides.labelFontSize ?? band.labelFontSize), 16, 28),
      noteScale: clamp(Number(overrides.noteScale ?? band.noteScale), 0.06, 0.12),
    },
    toast: overrides.toast ?? null,
  };
}

export const LESSONS = (() => {
  const lessons = [];

  for (let level = 1; level <= MAX_LEVEL; level += 1) {
    lessons.push(
      makeLesson('lines', level, {
        toast:
          level === 1
            ? 'Sigue la linea resaltada y atrapa solo esa nota.'
            : (level === 4 ? 'Ahora aparecen mas lineas posibles. Mira el pentagrama antes de moverte.' : null),
      })
    );

    lessons.push(
      makeLesson('spaces', level, {
        toast:
          level === 1
            ? 'Observa el espacio iluminado y responde sin afan.'
            : (level === 4 ? 'Los espacios abiertos aumentan. Respira y anticipa la caida.' : null),
      })
    );

    lessons.push(
      makeLesson('mixed', level, {
        toast:
          level === 1
            ? 'Modo mixto: combina lo aprendido y sigue la pista del pentagrama.'
            : (level === 7 ? 'Combina más posiciones y mantén la atención en el pentagrama.' : null),
      })
    );
  }

  return Object.freeze(lessons);
})();

export function getLesson(lessonId) {
  const id = String(lessonId ?? '').trim();
  if (!id) return null;
  return LESSONS.find((lesson) => lesson.id === id) || null;
}

export function getLessonByModeLevel(mode, level) {
  const safeMode = String(mode ?? '').trim() || 'mixed';
  const safeLevel = isFiniteNum(level) ? Number(level) : 1;
  return getLesson(`${safeMode}-${safeLevel}`);
}

export function listLessons(mode) {
  const safeMode = String(mode ?? '').trim();
  return LESSONS
    .filter((lesson) => lesson.mode === safeMode)
    .slice()
    .sort((a, b) => a.level - b.level);
}

export function listModes() {
  return Object.values(MODES).map((mode) => ({
    id: mode.id,
    label: mode.label,
    description: mode.description,
    poolSize: mode.pool.length,
    minOpen: mode.minOpen ?? 2,
  }));
}
