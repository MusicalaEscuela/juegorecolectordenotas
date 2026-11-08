'use strict';
import { Audio } from './services.js';

export function playCollectedMelody(scene, notes = []) {
  const context = scene.sound?.context;
  if (!context || !notes.length) return;
  const frequencies = { Do: 523.25, Re: 587.33, Mi: 659.25, Fa: 698.46, Sol: 783.99, La: 880, Si: 987.77 };
  const voices = new Set();
  const timers = notes.slice(-8).map((name, index) => scene.time.delayedCall(250 + index * 230, () => {
    const settings = Audio.getSettings();
    if (settings.muted || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencies[name] || 523.25;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16 * settings.sfxVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    oscillator.connect(gain); gain.connect(context.destination);
    voices.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(oscillator); };
    oscillator.start(now); oscillator.stop(now + 0.28);
  }));
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    timers.forEach(timer => timer.remove(false));
    voices.forEach(voice => { try { voice.stop(); } catch {} });
  });
}
