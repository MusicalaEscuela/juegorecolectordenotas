'use strict';
import {getLessonByModeLevel,MAX_LEVEL} from './data.lesson.js';
import {starsFor,completedRoutes,unlockedSkins} from './data.adventure.js';
import {Audio,Storage} from './services.js';
import {playCollectedMelody} from './music.melody.js';
import {mountScreen,escapeHTML as e} from './ui.dom.js';
export class ResultsScene extends Phaser.Scene {
  constructor(){super({key:'ResultsScene'});}
  init(data){this.payload=data||{};}
  create(){
    Audio.bind(this);const p=this.payload;const won=p.status==='win';const lesson=getLessonByModeLevel(p.mode,p.level);const progress=Storage.getProgress();const record=progress.best?.[p.lessonId]||{};
    const stars=starsFor(p.correct||0,p.wrong||0,won);const accuracy=Math.round((p.correct||0)/Math.max(1,(p.correct||0)+(p.wrong||0))*100);
    const routes=completedRoutes(progress);const routeNames={lines:'Líneas',spaces:'Espacios',mixed:'Mixto'};
    const stats=[['Aciertos',p.special==='free'?`${p.correct||0}`:`${p.correct||0}/${p.targetCount||lesson.rules.targetPerLevel}`],['Precisión',`${accuracy}%`],['Mejor racha',p.bestStreak||0],['Puntos',p.score||0]];
    this.root=mountScreen(this,'screen results-screen',`<header class="screen-head"><h1>${p.special==='free'?'¡Práctica terminada!':p.special==='precision'?(won?'¡Desafío superado!':'Desafío terminado'):(won?(p.level===MAX_LEVEL?'¡Ruta completada!':'¡Melodía recogida!'):'Una nueva oportunidad')}</h1><p>${p.special==='free'?'Práctica libre':p.special==='precision'?'Desafío de precisión':`${e(lesson.title)} · ${e(lesson.adventure.title)}`}</p></header><div class="stars" aria-label="${stars} estrellas">${won?'★'.repeat(stars)+'☆'.repeat(3-stars):'♫'}</div><p class="screen-note">3 estrellas: ≥90% · 2: ≥75% · 1: completar</p><div class="stats-grid">${stats.map(([label,value])=>`<div class="stat"><span>${label}</span><strong>${e(value)}</strong></div>`).join('')}</div><div class="results-detail"><p>Errores: ${p.wrong||0} · Ruido: ${p.noiseHits||0} · Poderes: ${p.powersUsed||0}</p><p class="record">${p.special==='precision'?`Récord de desafío: ${progress.precisionBest?.score||0} puntos · ${progress.precisionBest?.correct||0} aciertos`:p.special==='free'?'Práctica sin vidas y sin modificar el progreso de las rutas':`Récord: ${record.score||0} puntos · racha ${record.bestStreak||0} · ${record.stars||0}/3 estrellas`}</p><p>${routes.length?`Insignias: ${routes.map(m=>routeNames[m]).join(' · ')}`:'Completa una ruta para ganar su insignia y el traje astronauta.'}</p><p>Vestuario: ${unlockedSkins(progress).map(s=>s.label).join(' · ')}</p><p>${won&&p.melody?.length?`Tu melodía: ${e(p.melody.join(' · '))}`:'Practica con calma y vuelve a intentarlo.'}</p></div><nav class="screen-actions"><button data-menu>Menú</button><button data-retry>Repetir nivel</button><button class="primary" data-next>${!p.special&&won&&p.level<10?'Siguiente nivel':'Elegir ruta'}</button></nav><p class="screen-note">Tus récords se guardan en este navegador.</p>`);
    this.root.querySelector('[data-menu]').onclick=()=>this.scene.start('MenuScene');this.root.querySelector('[data-retry]').onclick=()=>this.scene.start('GameScene',{mode:p.mode,level:p.level,special:p.special,practiceNotes:p.practiceNotes});this.root.querySelector('[data-next]').onclick=()=>!p.special&&won&&p.level<10?this.scene.start('GameScene',{mode:p.mode,level:p.level+1}):this.scene.start('MenuScene');
    if(won&&p.melody?.length)playCollectedMelody(this,p.melody);
  }
}
