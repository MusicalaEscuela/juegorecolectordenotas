'use strict';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep track of fingers even when a scene and its controls disappear mid-press.
const activePointers = new Set();
let lastRelease = 0;
document.addEventListener('pointerdown', event => activePointers.add(event.pointerId), true);
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => {
  activePointers.delete(event.pointerId);
  lastRelease = performance.now();
}, true);
window.addEventListener('blur', () => { activePointers.clear(); lastRelease = performance.now(); });

export function guardTransitionButtons(scene, root) {
  const buttons = [...root.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  const earliest = performance.now() + 1200;
  const check = () => {
    if (!root.isConnected) return;
    if (activePointers.size || performance.now() < earliest || performance.now() - lastRelease < 300) {
      timer = window.setTimeout(check, 100);
      return;
    }
    buttons.forEach(button => { button.disabled = false; });
  };
  let timer = window.setTimeout(check, 100);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.clearTimeout(timer));
}

export function mountScreen(scene, className, html) {
  const root = document.createElement('div');
  root.className = className;
  root.innerHTML = html;
  document.getElementById('ui-root').append(root);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.remove());
  return root;
}

export function modal(scene, title, body, actions = []) {
  const previous = document.activeElement;
  const root = mountScreen(scene, 'modal-layer', `<section class="dialog" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><h2>${escapeHTML(title)}</h2>${body}<div class="dialog-actions"></div></section>`);
  const buttons = root.querySelector('.dialog-actions');
  const close = () => { root.remove(); previous?.focus?.({preventScroll:true}); };
  actions.forEach(({label, run, primary}) => {
    const b = document.createElement('button'); b.textContent = label;
    if (primary) b.className = 'primary';
    b.onclick = () => run(close);
    buttons.append(b);
  });
  root.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    const all = [...root.querySelectorAll('button:not(:disabled)')];
    if (!all.length) return;
    if (event.shiftKey && document.activeElement === all[0]) { event.preventDefault(); all.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === all.at(-1)) { event.preventDefault(); all[0].focus(); }
  });
  buttons.querySelector('button')?.focus({preventScroll:true});
  return { root, close };
}

export async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* Fullscreen is optional; layout already uses the available viewport. */ }
}

export function bindFullscreen(root) {
  root.querySelectorAll('[data-fullscreen]').forEach(button => {
    button.hidden = !document.fullscreenEnabled;
    button.onclick = fullscreen;
  });
}
