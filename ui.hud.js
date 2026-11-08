'use strict';
import { Audio } from './services.js';
import { mountScreen, modal, bindFullscreen } from './ui.dom.js';

export class HUD {
  constructor(scene, opts={}) {
    this.scene=scene;
    this.root=mountScreen(scene,'game-ui',`<header class="game-header"><section class="game-summary"><h1></h1><p class="guide">Lee la nota del pentagrama</p><p class="speed-label"></p><div class="score-row"><span class="lives"></span><span class="score"></span></div><progress value="0" max="${opts.targetPerLevel || 6}" aria-label="Aciertos del nivel"></progress></section><section class="staff-card"></section><nav class="game-actions" aria-label="Controles de partida"><button data-pause aria-label="Pausar partida"><span class="full-label">Ⅱ Pausa</span><span class="compact-label" aria-hidden="true">Ⅱ</span></button><button data-sound><span class="sound-label"></span><span class="compact-label" aria-hidden="true">♪</span></button><button data-fullscreen>Pantalla completa</button></nav><div class="game-status"><span class="streak"></span><span class="conditions"></span></div></header><footer class="game-footer"></footer>`);
    this.header=this.root.querySelector('.game-header');
    this.footer=this.root.querySelector('.game-footer');
    this.staffSlot=this.root.querySelector('.staff-card');
    this.goalText={text:'Lee la nota del pentagrama'};
    this.root.querySelector('[data-pause]').onclick=()=>scene._togglePause();
    const mute=this.root.querySelector('[data-sound]');
    const refresh=()=>{mute.querySelector('.sound-label').textContent=Audio.getSettings().muted?'Sonido: no':'Sonido: sí';mute.setAttribute('aria-label',Audio.getSettings().muted?'Activar sonido':'Silenciar sonido');};
    refresh(); mute.onclick=()=>{Audio.setMuted(!Audio.getSettings().muted);refresh();};
    bindFullscreen(this.root);
  }
  resize() {}
  setAccent() {}
  setLevel(level,mode) {this.root.querySelector('h1').textContent=`Nivel ${level} · ${mode}`;this.root.querySelector('.speed-label').textContent=`Velocidad ${level}/10`;}
  setScore(correct,needed) {this.root.querySelector('.score').textContent=needed==null?`${correct} aciertos`:`${correct}/${needed} aciertos`;const p=this.root.querySelector('progress');p.hidden=needed==null;if(needed!=null){p.max=needed;p.value=correct;}}
  setLives(cur,max=3) {this.root.querySelector('.lives').textContent=cur===Infinity?'♥ ∞':'♥'.repeat(cur)+'♡'.repeat(Math.max(0,max-cur));this.root.querySelector('.lives').setAttribute('aria-label',`${cur} vidas`);}
  flashGoal() {}
  toast(text,ms=1800) {this._toast?.remove();this._toastTimer?.remove(false);this._toast=document.createElement('div');this._toast.className='game-toast';this._toast.setAttribute('role','status');this._toast.textContent=text;this.root.append(this._toast);this._toastTimer=this.scene.time.delayedCall(ms,()=>this._toast?.remove());}
  showPause({onResume,onRestart,onMenu,onFinish}) {if(this._pause)return;this._pause=modal(this.scene,'Partida en pausa','<p>Respira, observa el pentagrama y continúa cuando quieras.</p>',[{label:'Reanudar',primary:true,run:onResume},...(onFinish?[{label:'Finalizar práctica',run:onFinish}]:[]),{label:'Reiniciar nivel',run:onRestart},{label:'Volver al menú',run:onMenu}]);}
  hidePause(){this._pause?.close();this._pause=null;}
  destroy(){this.hidePause();this._toastTimer?.remove(false);this.root.remove();}
}
