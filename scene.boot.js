'use strict';

import { CHARACTER_ART } from './data.adventure.js';

import { BACKGROUND_FILES } from './data.lesson.js';

const STATIC_ASSETS = Object.freeze([
  { type: 'image', key: 'menuBackground', path: 'assets/menu.png' },
  { type: 'image', key: 'noteBase', path: 'assets/note.png' },
  { type: 'image', key: 'character', path: 'assets/muñequito.png' },
  { type: 'audio', key: 'bgMusic', path: 'assets/music.mp3' },
  { type: 'audio', key: 'noteCorrect', path: 'assets/correct.mp3' },
  { type: 'audio', key: 'noteWrong', path: 'assets/incorrect.mp3' },
]);

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });

    this._progressFill = null;
    this._progressText = null;
    this._cleanupLoader = null;
  }

  preload() {
    this._buildLoader();

    Object.entries(BACKGROUND_FILES).forEach(([key, path]) => this.load.image(key, path));
    STATIC_ASSETS.forEach((asset) => {
      if (asset.type === 'audio') this.load.audio(asset.key, asset.path);
      else this.load.image(asset.key, asset.path);
    });

    for (const [skin, art] of Object.entries(CHARACTER_ART)) {
      if (art.image) this.load.image(`musi-${skin}`, art.image);
      if (art.sheet) this.load.image(`musi-${skin}-sheet`, art.sheet);
    }

    this.load.on('progress', (value) => this._updateLoader(value));
    this.load.once('complete', () => {
      this._cleanupLoader?.();

    });
  }

  create() {
    for (const [skin, art] of Object.entries(CHARACTER_ART)) {
      if (art.image && this.textures.exists(`musi-${skin}`)) {
        const c = art.crop;
        if (c) this.textures.get(`musi-${skin}`).add('portrait', 0, c.x, c.y, c.width, c.height);
      }
      if (art.sheet && this.textures.exists(`musi-${skin}-sheet`)) {
        const c = art.sheetCrop || { x: 0, y: 0, width: art.frameWidth, height: art.frameHeight };
        for (let i = 0; i < 4; i++) this.textures.get(`musi-${skin}-sheet`).add(i, 0, i * art.frameWidth + c.x, c.y, c.width, c.height);
      }
    }
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
