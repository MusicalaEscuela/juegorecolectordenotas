'use strict';

import { CHARACTER_ART } from './data.adventure.js';


export function registerCharacterFrames(scene, skin) {
  const art=CHARACTER_ART[skin];
  if (!art) return;
  const portrait=scene.textures.exists(`musi-${skin}`) && scene.textures.get(`musi-${skin}`);
  if(portrait && art.crop && !portrait.has('portrait')) { const c=art.crop; portrait.add('portrait',0,c.x,c.y,c.width,c.height); }
  const sheet=scene.textures.exists(`musi-${skin}-sheet`) && scene.textures.get(`musi-${skin}-sheet`);
  if(sheet && art.sheet) { const c=art.sheetCrop || {x:0,y:0,width:art.frameWidth,height:art.frameHeight};for(let i=0;i<4;i++)if(!sheet.has(i))sheet.add(i,0,i*art.frameWidth+c.x,c.y,c.width,c.height); }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });

    this._progressFill = null;
    this._progressText = null;
    this._cleanupLoader = null;
  }

  preload() {
    this._buildLoader();

    // Only the two essential textures block the menu. Each level loads its own assets.
    this.load.image('noteBase','assets/note.png');
    this.load.image('character','assets/muñequito.png');

    this.load.on('progress', (value) => this._updateLoader(value));
    this.load.once('complete', () => {
      this._cleanupLoader?.();

    });
  }

  create() {
    this.scene.start('MenuScene');
  }

  _buildLoader() {
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1020, 1);
    const glowA = this.add.ellipse(W * 0.24, H * 0.26, 260, 260, 0x0c41c4, 0.22);
    const glowB = this.add.ellipse(W * 0.76, H * 0.30, 320, 320, 0x680dbf, 0.18);
    const glowC = this.add.ellipse(W * 0.56, H * 0.74, 360, 240, 0xce0071, 0.14);

    const card = this.add.rectangle(W / 2, H / 2, 420, 196, 0xffffff, 0.08);
    card.setStrokeStyle(1, 0xffffff, 0.12);

    this.add.text(W / 2, H * 0.40, 'Musi', {
      resolution: 2,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.47, 'Preparando pentagramas, niveles y notas...', {
      resolution: 2,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '18px',
      color: '#dbe7ff',
      align: 'center',
    }).setOrigin(0.5);

    const track = this.add.rectangle(W / 2, H * 0.57, 280, 12, 0xffffff, 0.10).setOrigin(0.5);
    track.setStrokeStyle(1, 0xffffff, 0.14);

    this._progressFill = this.add.rectangle((W / 2) - 140, H * 0.57, 0, 12, 0x59d7ff, 0.96).setOrigin(0, 0.5);
    this._progressText = this.add.text(W / 2, H * 0.64, '0%', {
      resolution: 2,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [glowA, glowB, glowC],
      alpha: { from: 0.10, to: 0.26 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this._cleanupLoader = () => {
      this.load.off('progress');
      bg.destroy();
      glowA.destroy();
      glowB.destroy();
      glowC.destroy();
      card.destroy();
      track.destroy();
      this._progressFill?.destroy();
      this._progressText?.destroy();
      this._progressFill = null;
      this._progressText = null;
    };
  }

  _updateLoader(value) {
    const progress = Phaser.Math.Clamp(Number(value) || 0, 0, 1);
    if (this._progressFill) this._progressFill.width = 280 * progress;
    if (this._progressText) this._progressText.setText(`${Math.round(progress * 100)}%`);
  }
}
