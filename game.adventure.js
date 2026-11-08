'use strict';

import { State } from './services.js';
import { CollectorVisual } from './entity.collector.js';
import { unlockedSkins } from './data.adventure.js';

const textStyle = { fontFamily: 'Arial', fontSize: '13px', color: '#ffffff', resolution: 2 };
export const POWER_COST = 3;

// Gameplay time advances only while playing; pause freezes powers and hazards too.
export class Adventure {
  constructor(scene, progress, settings) {
    this.scene = scene;
    this.stage = scene.lesson.adventure;
    this.now = 0;
    this.energy = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.noiseHits = 0;
    this.powersUsed = 0;
    this.melody = [];
    this.slowUntil = 0;
    this.bigUntil = 0;
    this.shieldUntil = 0;
    this.graceUntil = 0;
    this.stickyUntil = 0;
    this.restUntil = 0;
    this.burstIndex = 0;
    this.patternCycle = 0;
    this.spawnCount = 0;
    this.nextNoise = 7000;
    this.nextWind = 10000;
    this.windWarnAt = 0;
    this.windUntil = 0;
    this.windDirection = 1;
    this.nextPuddle = 13000;
    this.puddle = null;
    this.message = '';
    this.messageUntil = 0;
    const skins = unlockedSkins(progress);
    this.skin = skins.find(s => s.id === settings.skin)?.id || 'explorer';
    this.collector = new CollectorVisual(scene, scene.player, this.skin);
    this.buildUI();
    this.keys = {
      'keydown-ONE': () => this.activate('slow'),
      'keydown-TWO': () => this.activate('shield'),
      'keydown-THREE': () => this.activate('basket'),
    };
    for (const [event, fn] of Object.entries(this.keys)) scene.input.keyboard.on(event, fn);
    this.collector.update(0);
  }

  buildUI() {
    const s=this.scene;
    this.root=s.hud.footer;
    this.root.innerHTML=`<div class="energy-area"><strong class="energy-label"></strong><span class="energy-help"></span></div><div class="powers"><button data-power="slow" aria-label="Activar tiempo lento">1 · Tiempo lento</button><button data-power="shield" aria-label="Activar escudo">2 · Escudo</button><button data-power="basket" aria-label="Activar canasta XL">3 · Canasta XL</button></div><div class="move-pad" aria-label="Mover a Musi"><button data-move="-1" aria-label="Mover a la izquierda">◀</button><button data-move="1" aria-label="Mover a la derecha">▶</button></div>`;
    this.energyLabel=this.root.querySelector('.energy-label');
    this.energyHelp=this.root.querySelector('.energy-help');
    this.status=s.hud.root.querySelector('.streak');
    this.conditions=s.hud.root.querySelector('.conditions');
    this.buttons=[...this.root.querySelectorAll('[data-power]')].map(element=>{
      const id=element.dataset.power;element.onclick=()=>this.activate(id);return {element,id};
    });
    this.root.querySelectorAll('[data-move]').forEach(button=>{
      button.onpointerdown=event=>{event.preventDefault();if(State.get().paused)return;button.setPointerCapture(event.pointerId);s._pointerControl=false;s.touchDirection=Number(button.dataset.move);};
      const release=()=>{s.touchDirection=0;};
      button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
    });
    this.refreshUI();
  }

  notify(message, ms = 1800) {
    this.message = message;
    this.messageUntil = this.now + ms;
    this.refreshUI();
  }

  refreshUI() {
    this.energyLabel.textContent = (`Energía ${'●'.repeat(this.energy)}${'○'.repeat(POWER_COST - this.energy)}`);
    this.energyHelp.textContent = (this.energy >= POWER_COST ? 'Elige tu poder ↓' : 'Carga con aciertos seguidos');
    const wave = this.stage.finale ? ` · Oleada ${Math.min(3, 1 + Math.floor(State.get().correct / 4))}/3` : '';
    this.status.textContent = (`Racha ${this.streak} · Mejor ${this.bestStreak}${wave}`);
    const active = this.now < this.slowUntil ? `Tiempo lento ${Math.ceil((this.slowUntil - this.now) / 1000)}s`
      : this.now < this.bigUntil ? `Canasta XL ${Math.ceil((this.bigUntil - this.now) / 1000)}s`
      : this.now < this.shieldUntil ? `Escudo ${Math.ceil((this.shieldUntil - this.now) / 1000)}s` : '';
    this.conditions.textContent = (this.now < this.messageUntil ? this.message : active || this.stage.title);
    for (const button of this.buttons) {
      const ready = this.energy >= POWER_COST && !this.powerActive;
      button.element.classList.toggle('primary',ready);
      button.element.setAttribute('aria-disabled',String(!ready));
    }
  }

  get powerActive() { return this.now < Math.max(this.slowUntil, this.bigUntil, this.shieldUntil); }
  get fallFactor() { return this.now < this.slowUntil ? 0.45 : 1; }
  get moveFactor() { return this.now < this.stickyUntil ? 0.48 : 1; }
  get wind() { return this.now >= this.windWarnAt && this.now < this.windUntil ? 43 * this.windDirection : 0; }

  activate(kind) {
    if (State.get().paused || this.scene._ending || this.scene._introOpen) return false;
    if (this.energy < POWER_COST) { this.notify('Carga energía con 3 aciertos'); return false; }
    if (this.powerActive) { this.notify('Espera a que termine el poder'); return false; }
    if (!['slow', 'shield', 'basket'].includes(kind)) return false;
    this.energy = 0;
    this.powersUsed++;
    if (kind === 'slow') this.slowUntil = this.now + 5000;
    if (kind === 'shield') this.shieldUntil = this.now + 9000;
    if (kind === 'basket') this.bigUntil = this.now + 6000;
    this.notify(kind === 'slow' ? 'Tiempo lento · 5 segundos' : kind === 'shield' ? 'Escudo · protege de un error' : 'Canasta XL: captura más ancho · también errores', 2600);
    this.collector.update(this.now, this.now < this.bigUntil, this.now < this.shieldUntil, this.now < this.slowUntil);
    return true;
  }

  correct(noteId) {
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.energy = Math.min(POWER_COST, this.energy + 1);
    this.melody.push(noteId);
    this.collector.catch(this.now);
    this.graceUntil = this.now + 400;
    this.notify(this.energy === POWER_COST && !this.powerActive ? '¡Poder listo! Elige abajo' : `¡Bien leído! Racha ${this.streak}`);
    if (this.stage.finale && State.get().correct % 4 === 0 && State.get().correct < 12) {
      this.restUntil = this.now + 2600;
      this.notify('Respiro · prepara la siguiente oleada', 2600);
    }
  }

  wrong(noise = false) {
    this.streak = 0;
    this.energy = 0;
    this.graceUntil = this.now + 650;
    this.collector.error(this.now);
    if (noise) {
      this.noiseHits++;
      this.notify('Ruido: racha y energía perdidas');
      return true; // No life penalty for noise.
    }
    const protectedByShield = this.now < this.shieldUntil;
    if (protectedByShield) {
      this.shieldUntil = 0;
      this.notify('Escudo usado · conserva tu vida');
    }
    this.refreshUI();
    return protectedByShield;
  }

  spawnWave() {
    if (this.scene._introOpen || this.now < this.restUntil) return;
    this.scene._spawnOneNote();
    this.spawnCount++;
    if (this.stage.burst) {
      // Alternate three-note bursts and sustained rain; spawn scheduling never clears notes.
      const rain = this.patternCycle % 2 === 1;
      const length = rain ? 7 : 3;
      this.burstIndex++;
      if (this.burstIndex === 1) this.notify(rain ? '¡Lluvia continua de notas!' : 'Ráfaga · 3 notas', 1400);
      if (this.burstIndex >= length) {
        this.burstIndex = 0;
        this.patternCycle++;
        this.scene.spawnTimer.delay = this.stage.delay * 1.8;
      } else this.scene.spawnTimer.delay = this.stage.delay * (rain ? 0.68 : 0.52);
    }
  }

  spawnNoise() {
    const s = this.scene;
    const unit=s.layout?.unit||1;
    const lanes = [0.11,0.26,0.41,0.56,0.71,0.86].map(x=>x*s.scale.width);
    const occupied = s.notes.getChildren().filter(n => n.y < s.spawnTopY + 85*unit);
    const free = lanes.filter(x => !occupied.some(n => Math.abs(n.x - x) < 86*unit));
    if (!free.length) return;
    const x = Phaser.Utils.Array.GetRandom(free);
    const ball = s.add.star(x, s.spawnTopY + 28, 9, 14, 21, 0x3b244f).setStrokeStyle(2, 0xffbcf0).setDepth(20);
    s.physics.add.existing(ball);
    s.notes.add(ball);
    ball.body.setAllowGravity(false).setSize(30, 30, true);
    ball.isNoise = true;
    ball.setScale(unit);
    ball.baseFall = this.stage.speed * 0.86 * (s.layout?.fallScale||1);
    ball.body.setVelocityY(ball.baseFall);
    ball._label = s.add.text(x, ball.y, '×', { ...textStyle, fontSize: '23px', fontStyle: 'bold', color: '#ffd4f1' }).setOrigin(0.5).setDepth(21);
    ball._syncLabel = () => ball._label?.setPosition(ball.x, ball.y);
    ball._kill = () => { if (ball.active) { ball._label?.destroy(); ball.destroy(); } };
  }

  beginWind() {
    this.windDirection *= -1;
    this.windWarnAt = this.now + 1800;
    this.windUntil = this.windWarnAt + 4200;
    this.notify(`Viene viento ${this.windDirection > 0 ? '→' : '←'}`, 1800);
    this.nextWind = this.now + 15000;
  }

  beginPuddle() {
    if (this.puddle) return;
    const s = this.scene;
    const x = Phaser.Utils.Array.GetRandom([0.2,0.5,0.8])*s.scale.width;
    const unit=s.layout?.unit||1;
    const art = s.add.ellipse(x, s.player.y + 44*unit, 112*unit, 22*unit, 0x9a5ced, 0.15).setStrokeStyle(2, 0xddc5ff, 0.9).setDepth(7);
    const label = s.add.text(x, s.player.y + 25*unit, '⚠ CHARCO', { ...textStyle, fontSize: '12px', color:'#ffffff', backgroundColor:'#542d83', padding:{x:6,y:3} }).setOrigin(0.5).setDepth(25);
    const bubbles = [s.add.ellipse(x-25*unit,s.player.y+43*unit,18*unit,8*unit,0xe1b1ff,.8),s.add.ellipse(x+15*unit,s.player.y+46*unit,12*unit,6*unit,0xf1d3ff,.7)].map(b=>b.setDepth(8));
    this.puddle = { x, art, label, bubbles, starts: this.now + 1800, ends: this.now + 6500 };
    this.nextPuddle = this.now + 17000;
    this.notify('Charco anunciado en el suelo', 1800);
  }

  update(delta) {
    this.now += Math.min(delta, 80);
    if(this.scene.special==='precision' && this.now>=60000){this.scene._gameOver();return;}
    const s = this.scene;
    if (this.stage.noise && this.now >= this.nextNoise) { this.spawnNoise(); this.nextNoise = this.now + 7500; }
    if (this.stage.wind && this.now >= this.nextWind) this.beginWind();
    if (this.stage.puddles && this.now >= this.nextPuddle) this.beginPuddle();
    if (this.puddle) {
      const p = this.puddle;
      if (this.now >= p.ends) { p.art.destroy(); p.label.destroy(); p.bubbles.forEach(b=>b.destroy()); this.puddle = null; }
      else if (this.now >= p.starts) {
        p.art.setFillStyle(0x8d42cf, 0.82); p.label.setText('LENTO');
        p.bubbles.forEach((b,i)=>{b.y=s.player.y+44*(s.layout?.unit||1)+Math.sin(this.now/250+i)*3*(s.layout?.unit||1);b.alpha=.45+.3*(1+Math.sin(this.now/300+i))/2;});
        if (Math.abs(s.player.x - p.x) < 65*(s.layout?.unit||1)) this.stickyUntil = this.now + 450;
      }
    }
    for (const n of s.notes.getChildren()) {
      if (!n.active || !n.body) continue;
      const drift = n.drift ? Math.cos((this.now - n.bornAt) / 700) * 35 : 0;
      n.body.setVelocityY(n.baseFall * this.fallFactor);
      let vx = (drift + this.wind) * this.fallFactor * (s.layout?.unit||1);
      const margin=40*(s.layout?.unit||1);
      if (n.x < margin) { n.x = margin; vx = Math.max(0, vx); }
      if (n.x > s.scale.width - margin*2) { n.x = s.scale.width - margin*2; vx = Math.min(0, vx); }
      n.body.setVelocityX(vx);
    }
    this.collector.update(this.now, this.now < this.bigUntil, this.now < this.shieldUntil, this.now < this.slowUntil);
    this.refreshUI();
    if(this.scene.special==='precision')this.conditions.textContent=`⏱ ${Math.max(0,Math.ceil((60000-this.now)/1000))} s · 12 aciertos · 80%`;
    if (this.scene.special!=='precision' && this.wind && this.now >= this.messageUntil) this.conditions.textContent = (`Viento ${this.windDirection > 0 ? '→ → →' : '← ← ←'}`);
    if (this.moveFactor < 1) this.conditions.textContent = ('Suelo pegajoso · sal del charco');
  }

  snapshot() {
    return { bestStreak: this.bestStreak, noiseHits: this.noiseHits, powersUsed: this.powersUsed, melody: this.melody.slice(-8) };
  }

  destroy() {
    for (const [event, fn] of Object.entries(this.keys)) this.scene.input.keyboard?.off(event, fn);
    this.puddle?.art.destroy(); this.puddle?.label.destroy(); this.puddle?.bubbles.forEach(b=>b.destroy());
    this.scene.touchDirection=0;
    this.collector.destroy(); this.root.remove();
  }
}
