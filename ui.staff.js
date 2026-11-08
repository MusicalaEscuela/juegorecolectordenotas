'use strict';

const STAFF_VARIANTS = Object.freeze({
  lines: {
    Mi: [{ slot: 8, kind: 'line', index: 1 }],
    Sol: [{ slot: 6, kind: 'line', index: 2 }],
    Si: [{ slot: 4, kind: 'line', index: 3 }],
    Re: [{ slot: 2, kind: 'line', index: 4 }],
    Fa: [{ slot: 0, kind: 'line', index: 5 }],
  },
  spaces: {
    Fa: [{ slot: 7, kind: 'space', index: 1 }],
    La: [{ slot: 5, kind: 'space', index: 2 }],
    Do: [{ slot: 3, kind: 'space', index: 3 }],
    Mi: [{ slot: 1, kind: 'space', index: 4 }],
  },
  mixed: {
    Mi: [
      { slot: 8, kind: 'line', index: 1 },
      { slot: 1, kind: 'space', index: 4 },
    ],
    Fa: [
      { slot: 7, kind: 'space', index: 1 },
      { slot: 0, kind: 'line', index: 5 },
    ],
    Sol: [{ slot: 6, kind: 'line', index: 2 }],
    La: [{ slot: 5, kind: 'space', index: 2 }],
    Si: [{ slot: 4, kind: 'line', index: 3 }],
    Do: [{ slot: 3, kind: 'space', index: 3 }],
    Re: [{ slot: 2, kind: 'line', index: 4 }],
  },
});

const MODE_ACCENTS = Object.freeze({
  lines: 0x59d7ff,
  spaces: 0xffd166,
  mixed: 0xff6b9c,
});

function safeMode(mode) {
  return STAFF_VARIANTS[mode] ? mode : 'mixed';
}

export function resolveStaffVisual(noteId, mode = 'mixed', seed = 0) {
  const safe = safeMode(mode);
  const fallback = STAFF_VARIANTS.mixed[noteId] || [{ slot: 4, kind: 'line', index: 3 }];
  const variants = STAFF_VARIANTS[safe][noteId] || fallback;
  const pickIndex = variants.length <= 1 ? 0 : Math.abs(Math.floor(seed)) % variants.length;
  const picked = variants[pickIndex];

  return {
    ...picked,
    noteId,
    descriptor: `${picked.kind === 'line' ? 'Línea' : 'Espacio'} ${picked.index}`,
  };
}

export class StaffBoard {
  constructor(scene, opts = {}) {
    this.scene=scene;
    this.mode=safeMode(opts.mode);
    this.root=scene.hud.staffSlot;
    this.root.innerHTML=`<h2>LEE · BUSCA · ATRAPA</h2><svg viewBox="0 0 320 126" role="img" aria-label="Nota objetivo en clave de Sol"><rect class="staff-highlight" x="16" y="30" width="288" height="8" rx="4" fill="#cdeef8"/>${[30,46,62,78,94].map(y=>`<path d="M16 ${y}H304" stroke="#61718c" stroke-width="1.4"/>`).join('')}<text x="26" y="99" font-family="Georgia,serif" font-size="78" fill="#172442">𝄞</text><ellipse class="note-head" cx="205" cy="94" rx="10" ry="6.5" fill="#172442"/><path class="note-stem" stroke="#172442" stroke-width="2"/></svg>`;
  }
  resize() {}
  setGoal(noteId,mode=this.mode,seed=0) {
    this.mode=safeMode(mode);
    const visual=resolveStaffVisual(noteId,this.mode,seed);
    const y=30+visual.slot*8;
    const head=this.root.querySelector('.note-head');head.setAttribute('cy',y);head.setAttribute('transform',`rotate(-22 205 ${y})`);
    const down=visual.slot<=4;
    this.root.querySelector('.note-stem').setAttribute('d',`M${down?196:214} ${y}v${down?32:-32}`);
    this.root.querySelector('.staff-highlight').setAttribute('y',y-4);
    return visual;
  }
  flash() {}
  getPlayfieldTop() { return this.scene.hud.header.getBoundingClientRect().bottom-document.getElementById('phaser-root').getBoundingClientRect().top+12; }
  destroy() {this.root.replaceChildren();}
}
