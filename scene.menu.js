'use strict';
import { listModes, getLessonByModeLevel, MAX_LEVEL } from './data.lesson.js';
import { Storage, Audio } from './services.js';
import { SKINS, CHARACTER_ART, unlockedSkins, completedRoutes } from './data.adventure.js';
import { playCollectedMelody } from './music.melody.js';
import { mountScreen, modal, escapeHTML as e, bindFullscreen } from './ui.dom.js';

export class MenuScene extends Phaser.Scene {
  constructor(){super({key:'MenuScene'});}
  create(){
    Audio.bind(this);
    const progress=Storage.getProgress();
    const modes=listModes();
    const accents=['#79dff4','#f5ca78','#ef8bbe'];
    this.root=mountScreen(this,'screen menu-screen',`<header class="screen-head"><p class="eyebrow">MUSICALA · APRENDE JUGANDO</p><h1>Musi · Cazador de melodías</h1><p>Lee el pentagrama, recoge la nota y descubre tus poderes.</p></header><div class="route-grid">${modes.map((mode,i)=>{
      const unlocked=Math.min(MAX_LEVEL,Math.max(1,progress.unlocked?.[mode.id]||1));
      return `<article class="route-card" style="--accent:${accents[i]}"><span class="route-mark" aria-hidden="true">${['𝄞','♫','♪'][i]}</span><h2>${e(mode.label)}</h2><p>${e(mode.description)}</p><div class="route-progress">Disponible hasta nivel ${unlocked} de 10</div><progress value="${unlocked}" max="10" aria-label="Progreso en ${e(mode.label)}"></progress><button class="primary" data-mode="${mode.id}">Jugar ${e(mode.label)}</button></article>`;
    }).join('')}</div><p class="screen-note">Gana estrellas e insignias para vestir a Musi.</p><nav class="screen-actions"><button data-free>Práctica libre</button><button data-precision>Desafío de precisión</button><button data-melodies>Colección de melodías</button><button data-wardrobe>Vestuario de Musi</button><button data-help>Cómo jugar</button><button data-fullscreen>Pantalla completa</button><button data-reset>Reiniciar progreso</button></nav>`);
    this.cards=[...this.root.querySelectorAll('.route-card')];
    this.root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>this.chooseLevel(b.dataset.mode,Math.min(10,progress.unlocked?.[b.dataset.mode]||1)));
    this.root.querySelector('[data-free]').onclick=()=>this.choosePractice();
    this.root.querySelector('[data-precision]').onclick=()=>this.scene.start('GameScene',{special:'precision'});
    this.root.querySelector('[data-melodies]').onclick=()=>this.showMelodies();
    this.root.querySelector('[data-wardrobe]').onclick=()=>this.showWardrobe();
    this.root.querySelector('[data-help]').onclick=()=>this.showInstructions();
    this.root.querySelector('[data-reset]').onclick=()=>this.confirmReset();
    bindFullscreen(this.root);
    window.dispatchEvent(new Event('musi:ready'));
  }
  startMode(mode,level){const lesson=getLessonByModeLevel(mode,Math.max(1,Math.min(10,level)))||getLessonByModeLevel(mode,1);this.scene.start('GameScene',{mode,level:lesson.level,lessonId:lesson.id});}
  chooseLevel(mode,unlocked){
    const best=Storage.getProgress().best;
    const view=modal(this,'Elige tu nivel de práctica',`<p>1–3 Explora · 4–6 Afianza · 7–10 Desafío</p><div class="level-grid">${Array.from({length:10},(_,i)=>`<button data-level="${i+1}" ${i+1>unlocked?'disabled':''}><strong>${i+1}</strong><small>${i+1>unlocked?'Bloqueado':'★'.repeat(best?.[`${mode}-${i+1}`]?.stars||0)||'Practicar'}</small></button>`).join('')}</div>`,[{label:'Volver',run:close=>close()}]);
    view.root.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{view.close();this.startMode(mode,Number(b.dataset.level));});
  }
  choosePractice(){
    const notes=['Mi','Fa','Sol','La','Si','Do','Re'];
    const view=modal(this,'Práctica libre',`<p>Elige las notas que quieres practicar. No hay límite de tiempo ni pierdes vidas. Termina desde Pausa.</p><div class="practice-notes">${notes.map((n,i)=>`<label><input type="checkbox" value="${n}" ${i<2?'checked':''}> ${n}</label>`).join('')}</div><p class="practice-error" role="status"></p>`,[{label:'Empezar práctica',primary:true,run:()=>{const selected=[...view.root.querySelectorAll('input:checked')].map(n=>n.value);if(!selected.length){view.root.querySelector('.practice-error').textContent='Elige al menos una nota.';return;}view.close();this.scene.start('GameScene',{special:'free',practiceNotes:selected});}},{label:'Volver',run:close=>close()}]);
  }
  showMelodies(){
    const progress=Storage.getProgress();
    const songs=[{name:'Estrellita',notes:['Do','Do','Sol','Sol','La','La','Sol'],mode:'lines',requirement:'Completa nivel 3 de Líneas'},{name:'Himno a la alegría',notes:['Mi','Mi','Fa','Sol','Sol','Fa','Mi','Re'],mode:'spaces',requirement:'Completa nivel 3 de Espacios'},{name:'María tenía un corderito',notes:['Mi','Re','Do','Re','Mi','Mi','Mi'],mode:'mixed',requirement:'Completa nivel 3 de Mixto'}];
    const view=modal(this,'Colección de melodías',`<p>Desbloquea y escucha fragmentos al avanzar en las rutas. Activa el sonido para escucharlos.</p><div class="melody-list">${songs.map((song,i)=>{const unlocked=!!progress.best?.[`${song.mode}-3`];return `<article><strong>${e(song.name)}</strong><span>${unlocked?'Desbloqueada':e(song.requirement)}</span><button data-song="${i}" ${unlocked?'':'disabled'}>${unlocked?'▶ Escuchar':'Bloqueada'}</button></article>`;}).join('')}</div>`,[{label:'Volver',run:close=>close()}]);
    view.root.querySelectorAll('[data-song]').forEach(b=>b.onclick=()=>{if(Audio.getSettings().muted){b.textContent='Activa sonido';return;}this.sound.context?.resume();playCollectedMelody(this,songs[Number(b.dataset.song)].notes);});
  }

  showWardrobe(){
    const progress=Storage.getProgress();const available=unlockedSkins(progress).map(s=>s.id);const selected=Storage.getSettings().skin||'explorer';
    const view=modal(this,'El vestuario de Musi',`<p>Rutas completadas: ${completedRoutes(progress).length}/3 · Los trajes son cosméticos.</p><div class="skin-grid">${SKINS.map(s=>`<article class="skin-card"><img src="${CHARACTER_ART[s.id].image}" alt="Musi ${e(s.label)}"/><h3>${e(s.label)}</h3><p>${e(s.requirement)}</p><button data-skin="${s.id}" ${available.includes(s.id)?'':'disabled'}>${!available.includes(s.id)?'Bloqueado':selected===s.id?'Equipado':'Elegir'}</button></article>`).join('')}</div>`,[{label:'Volver',run:close=>close()}]);
    view.root.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{Storage.patchSettings({skin:b.dataset.skin});view.close();this.showWardrobe();});
  }
  showInstructions(){modal(this,'Cómo jugar','<p>Lee la nota del pentagrama y recoge la opción que corresponde.</p><p>Mueve a Musi con las flechas, arrastrando en la zona de juego o con los botones ◀ y ▶ del celular.</p><p>Tres aciertos cargan un poder: toca su botón o pulsa 1, 2 o 3. Canasta XL amplía la zona de captura durante 6 segundos: también recoge notas equivocadas. Los charcos te frenan; sal de ellos. Evita las bolas de ruido.</p><p>Pausa con el botón o con Espacio. Puedes girar el celular sin perder el avance de la partida.</p>',[{label:'Entendido',primary:true,run:close=>close()}]);}
  confirmReset(){modal(this,'¿Reiniciar el progreso?','<p>Se borrarán los niveles desbloqueados, las estrellas y los récords guardados en este navegador.</p>',[{label:'Cancelar',primary:true,run:close=>close()},{label:'Sí, borrar progreso',run:close=>{Storage.setProgress({unlocked:{lines:1,spaces:1,mixed:1},best:{}});close();this.scene.restart();}}]);}
}
