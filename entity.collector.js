'use strict';

export class CollectorVisual {
  constructor(scene, player, skin = 'explorer', { animated = true } = {}) {
    this.scene = scene;
    this.player = player;
    this.skin = skin;
    this.catchUntil = 0;
    this.errorUntil = 0;
    this.lastX = player.x;
    this.captureWidth = 42;
    this.root = scene.add.container(player.x, player.y).setDepth(24);
    this.halo = scene.add.ellipse(0, 0, 98, 110, 0x59d7ff, 0.09).setStrokeStyle(2, 0x59d7ff, 0.85).setVisible(false);
    this.root.add(this.halo);
    this.artKey = animated && scene.textures.exists(`musi-${skin}-sheet`) ? `musi-${skin}-sheet`
      : scene.textures.exists(`musi-${skin}`) ? `musi-${skin}` : null;
    if (this.artKey) {
      player.setTexture(this.artKey, this.artKey.endsWith('-sheet') ? 0 : 'portrait');
      player.setScale(104 / player.height);
    }
    this.baseScaleX = player.scaleX;
    this.baseScaleY = player.scaleY;
    this.accessory = scene.add.graphics();
    this.basket = scene.add.container(0, 10);
    this.basketArt = scene.add.graphics();
    this.basket.add(this.basketArt);
    this.root.add([this.accessory, this.basket]);
    this.bigRim = scene.add.ellipse(0, 14, 94, 16, 0xffd568, 0.15).setStrokeStyle(2, 0xffd568, 0.95).setVisible(false);
    this.root.add(this.bigRim);
    this.bigArrows = scene.add.text(0, -2, '◀     ▶', {fontFamily:'Arial',fontSize:'15px',color:'#ffe29a',fontStyle:'bold',stroke:'#503000',strokeThickness:3}).setOrigin(.5).setVisible(false);
    this.root.add(this.bigArrows);
    this.drawBasket();
    if (this.artKey) this.basket.setVisible(false);
    else this.drawAccessory();
  }

  drawBasket() {
    const g = this.basketArt;
    const space = this.skin === 'astronaut';
    g.fillStyle(space ? 0xc9f3fc : 0xc88946, 1);
    g.fillRoundedRect(-30, -1, 60, 24, 7);
    g.lineStyle(2, space ? 0x248ca7 : 0x6d4024, 1);
    g.strokeRoundedRect(-30, -1, 60, 24, 7);
    g.fillStyle(0x362240, 1); g.fillEllipse(0, -1, 61, 12);
    g.lineStyle(3, space ? 0x77e8ff : 0xffd58c, 1); g.strokeEllipse(0, -1, 61, 12);
    g.lineStyle(1, space ? 0x248ca7 : 0x946033, 0.7);
    for (let x = -20; x <= 20; x += 10) g.lineBetween(x, 7, x, 20);
    g.lineBetween(-25, 13, 25, 13);
    g.fillStyle(0xf66eab, 1); g.fillEllipse(-31, 4, 10, 13); g.fillEllipse(31, 4, 10, 13);
  }

  drawAccessory() {
    const g = this.accessory;
    if (this.skin === 'astronaut') {
      g.lineStyle(3, 0xcef7ff, 0.95); g.strokeEllipse(0, -20, 74, 68);
      g.fillStyle(0xffffff, 0.7); g.fillEllipse(-19, -37, 6, 15);
    } else if (this.skin === 'conductor') {
      g.fillStyle(0x162443, 1); g.fillTriangle(-27, -1, -22, 24, -7, 9); g.fillTriangle(27, -1, 22, 24, 7, 9);
      g.fillStyle(0xffce6d, 1); g.fillTriangle(0, -3, -10, -8, -10, 2); g.fillTriangle(0, -3, 10, -8, 10, 2);
    } else {
      g.fillStyle(0xe8ba70, 1); g.fillRoundedRect(-20, -45, 40, 12, 5); g.fillEllipse(0, -33, 59, 10);
      g.fillStyle(0x856039, 1); g.fillRect(-20, -36, 40, 4);
    }
  }

  resize(unit) {
    this.unit=unit;
    this.root.setScale(unit);
    this.player.setScale(104*unit/this.player.height);
    this.baseScaleX=this.player.scaleX;
    this.baseScaleY=this.player.scaleY;
  }

  catch(now) { this.catchUntil = now + 380; }
  error(now) { this.errorUntil = now + 350; }

  update(now, big = false, shield = false, slow = false) {
    const p = this.player;
    const moving = Math.abs(p.x - this.lastX) > 0.2;
    const catchPhase = Math.max(0, (this.catchUntil - now) / 380);
    this.root.setPosition(p.x, p.y);
    this.basket.y = 10 - Math.sin(catchPhase * Math.PI) * 10;
    this.basket.setScale(big ? 1.55 : 1);
    this.accessory.y = moving ? Math.sin(now / 75) * 1.4 : 0;
    p.setAngle(now < this.errorUntil ? Math.sin(now / 25) * 5 : moving ? Math.sin(now / 85) * 2 : 0);
    this.halo.setVisible(shield || slow).setStrokeStyle(2, shield ? 0x64e2ff : 0xbfa4ff, 0.9);
    this.bigRim.setVisible(big);
    this.bigArrows.setVisible(big);
    let lift = 0;
    if (this.artKey?.endsWith('-sheet')) {
      const frame = catchPhase > 0 ? Math.min(3, Math.floor((1 - catchPhase) * 4)) : 0;
      p.setFrame(frame);
      lift = [0, -6, -12, 0][frame];
    } else if (this.artKey) {
      // Static skins receive a small squash/stretch; the supplied art stays intact.
      const bounce = Math.sin(catchPhase * Math.PI) * 0.045;
      p.setScale(this.baseScaleX * (1 + bounce), this.baseScaleY * (1 - bounce));
    }
    this.bigRim.y = 14 + lift;
    this.lastX = p.x;
    // Arcade body coordinates are unscaled texture coordinates.
    const unit=this.unit||1;
    const w = (big ? 94 : this.captureWidth)*unit;
    p.body?.setSize(w / p.scaleX, 18*unit / p.scaleY, false);
    p.body?.setOffset((p.width - w / p.scaleX) / 2, p.height / 2 + (5 + lift)*unit / p.scaleY);
  }

  destroy() { this.root?.destroy(true); }
}
