'use strict';

import { getLesson, getLessonByModeLevel, MAX_LEVEL } from './data.lesson.js';
import { Storage, State, Audio, Events, EVT } from './services.js';
import { spawnNote } from './entity.note.js';
import { HUD } from './ui.hud.js';
import { StaffBoard } from './ui.staff.js';
import { Adventure } from './game.adventure.js';
import { starsFor, stageFor, CHARACTER_ART, unlockedSkins } from './data.adventure.js';
import { BACKGROUND_FILES, MUSIC_FILES } from './data.lesson.js';
import { registerCharacterFrames } from './scene.boot.js';
import { modal, mountScreen, escapeHTML as e } from './ui.dom.js';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.lesson = null;
    this.hud = null;
    this.staffBoard = null;

    this.notes = null;
    this.spawnTimer = null;
    this.goalTimer = null;

    this.bg = null;
    this.topVeil = null;
    this.bottomVeil = null;
    this.playerShadow = null;
    this.player = null;
    this.particles = null;
    this.noteEmitter = null;
    this.auras = [];

    this.cursors = null;
    this.targetX = 0;
    this.lastPointerMoveAt = 0;
    this._pointerControl = false;
    this.spawnTopY = 188;
    this.goalVisual = null;

    this._lastSpawned = null;
    this._sameStreak = 0;
    this._spawnsSinceTarget = 0;

    this._offWorldBounds = null;
    this._onPointerMove = null;
    this._onPauseKey = null;
    this._pauseUIShown = false;
  }

  init(data) {
    const mode = data?.mode || 'mixed';
    const level = Number.isFinite(data?.level) ? data.level : 1;
    const lessonId = data?.lessonId || `${mode}-${level}`;

    this.lesson =
      getLesson(lessonId) ||
      getLessonByModeLevel(mode, level) ||
      getLessonByModeLevel('mixed', 1);

    this.special = data?.special === 'free' || data?.special === 'precision' ? data.special : null;
    this.practiceNotes = this.special === 'free' ? (Array.isArray(data?.practiceNotes) ? data.practiceNotes.filter(n=>['Mi','Fa','Sol','La','Si','Do','Re'].includes(n)) : []) : [];
    if(this.special === 'free' && !this.practiceNotes.length) this.practiceNotes=['Mi','Sol'];
    if(this.special){
      const stage=this.special==='precision'?stageFor(7):stageFor(1);
      const base=getLessonByModeLevel('mixed',this.special==='precision'?7:1);
      this.lesson={...base,mode:'mixed',id:this.special,adventure:{...stage,title:this.special==='free'?'Práctica libre':'Desafío de precisión',hint:this.special==='free'?'Practica sin perder vidas. Termina cuando quieras desde Pausa.':'Consigue 12 aciertos en 60 segundos con al menos 80% de precisión.'},notes:{...base.notes,pool:this.special==='free'?this.practiceNotes:base.notes.pool},rules:{...base.rules,targetPerLevel:12,spawnDelay:stage.delay,fallMin:stage.speed,fallMax:stage.speed+18}};
    }
    State.resetRun({
      mode: this.lesson.mode,
      level: this.lesson.level,
      lessonId: this.lesson.id,
      lives: this.lesson.rules?.lives ?? 3,
      target: null,
    });

    this.targetX = 0;
    this.lastPointerMoveAt = 0;
    this._pointerControl = false;
    this.goalVisual = null;
    this.spawnTopY = 188;
    this._lastSpawned = null;
    this._sameStreak = 0;
    this._spawnsSinceTarget = 0;
    this._pauseUIShown = false;
  }

  preload() {
    this.loadingView=mountScreen(this,'modal-layer','<section class="dialog" role="status"><h2>Preparando el nivel…</h2><p>Cargando escenario y traje de Musi.</p></section>');
    const bg=this.lesson.scene?.backgroundKey;
    if(bg && BACKGROUND_FILES[bg] && !this.textures.exists(bg))this.load.image(bg,BACKGROUND_FILES[bg]);
    const skins=unlockedSkins(Storage.getProgress());
    this._skinToLoad=skins.find(s=>s.id===Storage.getSettings().skin)?.id || 'explorer';
    const art=CHARACTER_ART[this._skinToLoad];
    if(art?.sheet && !this.textures.exists(`musi-${this._skinToLoad}-sheet`))this.load.image(`musi-${this._skinToLoad}-sheet`,art.sheet);
    else if(!art?.sheet && art?.image && !this.textures.exists(`musi-${this._skinToLoad}`))this.load.image(`musi-${this._skinToLoad}`,art.image);
    for(const [key,path] of [['noteCorrect','assets/correct.mp3'],['noteWrong','assets/incorrect.mp3']])if(!this.cache.audio.exists(key))this.load.audio(key,path);
  }

  create() {
    this.loadingView?.remove();this.loadingView=null;
    registerCharacterFrames(this,this._skinToLoad);
    Audio.bind(this);
    this.physics.world.resume();
    this._ending = false;
    this.layout = null;
    this.touchDirection = 0;
    this._introOpen = false;

    this._buildBackground();
    this._buildPlayer();
    this._buildFeedback();

    this.notes = this.physics.add.group({ collideWorldBounds: false });

    this.hud = new HUD(this, {
      modeLabel: this._modeLabel(this.lesson.mode),
      phaseLabel: this.lesson.ui?.phaseLabel,
      targetPerLevel: this.lesson.rules?.targetPerLevel ?? 5,
      accent: this.lesson.ui?.accent,
    });

    this.staffBoard = new StaffBoard(this, {
      mode: this.lesson.mode,
      phaseCaption: this.lesson.ui?.phaseCaption,
      accent: this.lesson.ui?.accent,
    });
    this.spawnTopY = Math.max(222, this.staffBoard.getPlayfieldTop());
    this.adventure = new Adventure(this, Storage.getProgress(), Audio.getSettings());
    this._applyLayout();
    this._layoutObserver=new ResizeObserver(()=>{if(this.sys.isActive() && this.adventure)this._applyLayout();});
    this._layoutObserver.observe(this.hud.header);
    this._layoutObserver.observe(this.hud.footer);

    if (this.lesson.scene?.music) {
      const play=()=>{if(this.sys.isActive() && !State.get().paused && !this._ending) Audio.playMusic(this.lesson.scene.music,{volume:Audio.getSettings().musicVolume ?? 0.45,gain:this.lesson.scene.musicGain ?? 1});};
      if(this.cache.audio.exists(this.lesson.scene.music))play();
      else {
        this.load.once(`filecomplete-audio-${this.lesson.scene.music}`,play);
        this.load.audio(this.lesson.scene.music,MUSIC_FILES[this.lesson.scene.music] || MUSIC_FILES.bgMusic);
        this.load.start();
      }
    }

    this._setupInput();

    this.physics.add.overlap(this.player, this.notes, this._onCollect, null, this);

    this._pickNewGoal(true);
    this._refreshHUD(true);

    this._startSpawner();
    this._startGoalRuleTimer();

    this._offWorldBounds = () => {};
    if (this.physics?.world) {
      const onBounds = (body) => body?.gameObject?._kill?.();
      this.physics.world.on('worldbounds', onBounds);
      const world = this.physics.world;
      this._offWorldBounds = () => world.off('worldbounds', onBounds);
    }

    this.scale.on('resize', this._onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);

    this._showLevelIntro();

    Events.emit('GAME_STARTED', {
      lessonId: this.lesson.id,
      mode: this.lesson.mode,
      level: this.lesson.level,
    });
  }

  update(time, delta) {
    const run = State.get();
    if (run.paused || this._ending) return;

    this.adventure?.update(delta);
    this._updatePlayer(delta);
    this._syncNotes();

    if (this.playerShadow && this.player) {
      this.playerShadow.x = Phaser.Math.Linear(this.playerShadow.x, this.player.x, 0.35);
      this.playerShadow.y = this.player.y + 47*(this.layout?.unit||1);
    }
  }

  _buildBackground() {
    const W = this.scale.width;
    const H = this.scale.height;
    const bgKey = this.lesson.scene?.backgroundKey;

    if (bgKey && this.textures.exists(bgKey)) {
      this.bg = this.add.image(0, 0, bgKey).setOrigin(0, 0);
      this.bg.setDisplaySize(W, H);
      this.bg.setDepth(0);
    } else {
      this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0xf6f8ff, 1);
      this.bg.setDepth(0);
    }

    this.topVeil = this.add.rectangle(W / 2, 94, W, 206, 0xf0f4ff, 0.25).setDepth(1);
    this.bottomVeil = this.add.rectangle(W / 2, H - 52, W, 128, 0x081120, 0.10).setDepth(1);

    const auraA = this.add.ellipse(W * 0.30, H * 0.48, 180, 220, 0x59d7ff, 0.16).setDepth(1);
    const auraB = this.add.ellipse(W * 0.72, H * 0.36, 160, 170, 0xff6b9c, 0.12).setDepth(1);
    const auraC = this.add.ellipse(W * 0.57, H * 0.74, 220, 120, 0xffd166, 0.10).setDepth(1);

    this.auras = [auraA, auraB, auraC];

    this.tweens.add({
      targets: auraA,
      x: auraA.x + 18,
      y: auraA.y - 10,
      alpha: { from: 0.11, to: 0.18 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.tweens.add({
      targets: auraB,
      x: auraB.x - 14,
      alpha: { from: 0.08, to: 0.15 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  _buildPlayer() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.playerShadow = this.add.ellipse(W / 2, H - 60, 80, 20, 0x000000, 0.16).setDepth(8);

    this.player = this.physics.add.sprite(W / 2, H - 112, 'character');
    this.player.setDisplaySize(70, 86);
    this.player.body.setSize(this.player.width * 0.72, this.player.height * 0.78, true);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setAllowGravity(false);
  }

  _buildFeedback() {
    this.particles = this.add.particles('noteBase');
    this.noteEmitter = this.particles.createEmitter({
      speed: { min: -220, max: 220 },
      scale: { start: 0.018, end: 0 },
      lifespan: 460,
      quantity: 14,
      on: false,
    });
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.targetX = this.player.x;

    this._onPointerMove = (pointer) => {
      if (State.get().paused || pointer.y < this.spawnTopY || pointer.y > (this.layout?.footerTop ?? this.scale.height)) return;
      this._pointerControl = true;
      this.targetX = pointer.x;
      this.lastPointerMoveAt = this.time.now;
    };
    this.input.on('pointermove', this._onPointerMove);
    this.input.on('pointerdown', this._onPointerMove);
    this._onBlur = () => this._pause();
    this.game.events.on('blur', this._onBlur);

    this._onPauseKey = () => this._togglePause();
    this.input.keyboard.on('keydown-SPACE', this._onPauseKey);
    this.input.keyboard.on('keydown-ESC', this._onPauseKey);
  }

  _updatePlayer(delta = 16.67) {
    const speed = 480 * (this.scale.width/800) * (this.adventure?.moveFactor ?? 1);
    const settings = Audio.getSettings();
    const inputMode = settings?.inputMode || 'auto';
    const W = this.scale.width;
    const margin = 48*(this.layout?.unit||1);
    this.player.x=clamp(this.player.x,margin,this.scale.width-margin);
    if(this.touchDirection){this.player.setVelocityX(speed*this.touchDirection);this.player.flipX=this.touchDirection<0;return;}
    if (this.cursors.left.isDown || this.cursors.right.isDown) this._pointerControl = false;
    const pointerActive = this._pointerControl;

    if (inputMode === 'pointer' || (inputMode === 'auto' && pointerActive)) {
      const tx = clamp(this.targetX, margin, W - margin);
      this.player.x += clamp(tx - this.player.x, -speed * delta / 1000, speed * delta / 1000);
      this.player.setVelocityX(0);
    } else {
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.flipX = true;
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.flipX = false;
      } else {
        this.player.setVelocityX(0);
      }
    }
  }

  _syncNotes() {
    const H = this.scale.height;
    this.notes.getChildren().slice().forEach((note) => {
      if (!note) return;
      note._syncLabel?.();
      if (note.y > H + 120) note._kill?.();
    });
  }

  _onResize() { this._applyLayout(); }

  _applyLayout() {
    if(!this.hud || !this.adventure)return;
    const W=this.scale.width,H=this.scale.height;
    const top=document.getElementById('phaser-root').getBoundingClientRect().top;
    const footerTop=this.hud.footer.getBoundingClientRect().top-top;
    const spawnTop=this.staffBoard.getPlayfieldTop();
    const unit=clamp(Math.min(W/700,H/600),H<500?0.55:0.8,1.4);
    const playerY=footerTop-54*unit-8;
    const fallScale=Math.max(0.22,(playerY-spawnTop-24*unit)/242);
    const previous=this.layout;
    if(previous && previous.W===W && previous.H===H && Math.abs(previous.footerTop-footerTop)<1 && Math.abs(previous.spawnTop-spawnTop)<1)return;
    this.layout={W,H,footerTop,spawnTop,playerY,unit,fallScale};
    this.spawnTopY=spawnTop;
    this.physics.world.setBounds(0,0,W,H);
    this.player.x=previous ? this.player.x/previous.W*W : W/2;
    this.player.y=playerY;
    this.targetX=previous ? this.targetX/previous.W*W : W/2;
    this.adventure.collector.resize(unit);
    this.adventure.collector.update(this.adventure.now);
    this.player.body.updateFromGameObject();
    this.playerShadow.setPosition(this.player.x,playerY+47*unit).setDisplaySize(80*unit,20*unit);
    if(this.bg?.texture){
      this.bg.setOrigin(0.5).setPosition(W/2,H/2);
      this.bg.setScale(Math.max(W/this.bg.width,H/this.bg.height));
    }else this.bg?.setDisplaySize(W,H);
    this.topVeil?.setSize(W,spawnTop).setPosition(W/2,spawnTop/2);
    this.bottomVeil?.setSize(W,110*unit).setPosition(W/2,H-55*unit);
    if(this.auras[0])this.auras[0].setPosition(W*.3,H*.48);
    if(this.auras[1])this.auras[1].setPosition(W*.72,H*.36);
    if(this.auras[2])this.auras[2].setPosition(W*.57,H*.74);
    if(previous){
      for(const note of this.notes.getChildren()){
        note.x=note.x/previous.W*W;
        const ratio=(note.y-previous.spawnTop)/Math.max(1,previous.playerY-previous.spawnTop);
        note.y=spawnTop+ratio*(playerY-spawnTop);
        note.baseFall*=fallScale/previous.fallScale;
        if(note.isNoise)note.setScale(unit);else note.setDisplaySize(28*unit,40*unit);
        note._label?.setFontSize(note.isNoise?23*unit:Math.max(16,18*unit));
        note.body.updateFromGameObject();note._syncLabel?.();
      }
      const puddle=this.adventure.puddle;
      if(puddle){puddle.x=puddle.x/previous.W*W;puddle.art.setPosition(puddle.x,playerY+44*unit).setDisplaySize(112*unit,22*unit);puddle.label.setPosition(puddle.x,playerY+25*unit);puddle.bubbles.forEach((b,i)=>b.setPosition(puddle.x+(i?15:-25)*unit,playerY+44*unit).setDisplaySize((i?12:18)*unit,(i?6:8)*unit));}
    }
  }

  _startSpawner() {
    const delay = this.lesson.rules?.spawnDelay ?? 1200;

    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay,
      loop: true,
      callback: () => this.adventure.spawnWave(),
    });
  }

  _pickSpawnNoteId(pool, target) {
    if (!Array.isArray(pool) || pool.length === 0) return target || 'Mi';

    const forceEvery = 2;
    if (target && pool.includes(target) && this._spawnsSinceTarget >= forceEvery) {
      this._spawnsSinceTarget = 0;
      this._lastSpawned = target;
      this._sameStreak = 1;
      return target;
    }

    let picked = pickRandom(pool);

    if (pool.length > 1) {
      if (picked === this._lastSpawned) this._sameStreak += 1;
      else this._sameStreak = 1;

      if (this._sameStreak > 3) {
        let guard = 10;
        while (guard-- > 0 && picked === this._lastSpawned) picked = pickRandom(pool);
        this._sameStreak = 1;
      }
    }

    this._lastSpawned = picked;
    this._spawnsSinceTarget = target && picked !== target ? this._spawnsSinceTarget + 1 : 0;

    return picked;
  }

  _spawnOneNote() {
    const run = State.get();
    if (run.paused || this._ending) return;

    const pool = this.lesson.notes?.pool || ['Mi'];
    const fallMin = this.lesson.rules?.fallMin ?? 92;
    const fallMax = this.lesson.rules?.fallMax ?? 144;
    const W = this.scale.width;

    const occupied = this.notes.getChildren().filter(n => n.y < this.spawnTopY + 80*(this.layout?.unit||1));
    const unit=this.layout?.unit||1;
    const lanes = [0.11,0.26,0.41,0.56,0.71,0.86].map(x=>x*W).filter(x=>!occupied.some(n=>Math.abs(n.x-x)<85*unit));
    if (!lanes.length) return;
    const x = pickRandom(lanes);
    const noteId = this._pickSpawnNoteId(pool, run.target);

    const note = spawnNote(this, {
      x,
      y: this.spawnTopY + 24*unit,
      noteId,
      velocityY: Phaser.Math.Between(fallMin, fallMax)*(this.layout?.fallScale||1),
      unit,
      minFall: 10,
      maxFall: 1600,
      showLabel: true,
      labelMode: 'side',
      scale: this.lesson.ui?.noteScale ?? 0.085,
      labelAlpha: this.lesson.ui?.noteLabelAlpha ?? 0.96,
      labelFontSize: this.lesson.ui?.labelFontSize ?? 22,
      hitboxShrink: 0.72,
    });

    if (note && note.body) {
      const vy = note.body.velocity.y;
      this.notes.add(note);
      note.body.setAllowGravity(false);
      note.baseFall = vy;
      note.bornAt = this.adventure?.now ?? 0;
      note.drift = this.lesson.adventure.drift && Math.random() < 0.45;
      note.setVelocityY(vy * (this.adventure?.fallFactor ?? 1));
    }
  }

  _startGoalRuleTimer() {
    const goalRule = this.lesson.notes?.goalRule || { type: 'afterEachCorrect', seconds: 6 };

    this.goalTimer?.remove(false);
    this.goalTimer = null;

    if (goalRule.type === 'everySeconds') {
      this.goalTimer = this.time.addEvent({
        delay: clamp(goalRule.seconds ?? 6, 3, 30) * 1000,
        loop: true,
        callback: () => {
          if (State.get().paused) return;
          this._pickNewGoal(true);
          this._refreshHUD(false);
        },
      });
    }
  }

  _pickNewGoal(forceChange) {
    const pool = this.lesson.notes?.pool || ['Mi'];
    const run = State.get();

    let next = run.target;
    if (pool.length === 1) {
      next = pool[0];
    } else {
      next = pickRandom(pool);
      if (forceChange) {
        let guard = 12;
        while (guard-- > 0 && next === run.target) next = pickRandom(pool);
      }
    }

    this._spawnsSinceTarget = 0;
    // Cambiar la guía conserva las notas en vuelo y el ritmo de aparición.
    State.set({ target: next });
    this.goalVisual = this.staffBoard?.setGoal(next, this.lesson.mode, this.time.now + next.charCodeAt(0) + this.lesson.level) || null;
  }

  _onCollect(player, note) {
    const run = State.get();
    if (run.paused || this._ending || !note || !note.active) return;

    if (this.adventure.now < this.adventure.graceUntil) return;
    if (note.isNoise) {
      note._kill();
      this.adventure.wrong(true);
      Audio.sfx('noteWrong', { volume: 0.25 });
      return;
    }
    const target = run.target;
    const noteId = note.noteId || note.noteType || note.getData?.('noteId');

    note._kill?.();

    if (noteId === target) {
      State.inc('correct', 1);
      State.inc('score', 10 + Math.min(this.adventure.streak, 5) * 2);
      this.adventure.correct(noteId);

      Audio.sfx('noteCorrect');
      this.noteEmitter?.explode(16, player.x, player.y - 10);


      const needed = this.lesson.rules?.targetPerLevel ?? 5;
      if (this.special !== 'free' && State.get().correct >= needed) {
        if(this.special==='precision' && State.get().correct/(State.get().correct+State.get().wrong)<0.8) this._gameOver(); else this._levelWin();
      } else {
        const goalRule = this.lesson.notes?.goalRule || { type: 'afterEachCorrect' };
        if (goalRule.type === 'afterEachCorrect') this._pickNewGoal(true);
        this._refreshHUD(false);
        this.staffBoard?.flash();
      }

      Events.emit(EVT.NOTE_COLLECTED, { noteId, target, ...State.get() });
      return;
    }

    this.hud.toast(`Era ${target}. Atrapaste ${noteId}; vuelve a mirar la guía.`, 1600);
    State.inc('wrong', 1);
    Audio.sfx('noteWrong');

    const protectedByShield = this.adventure.wrong();
    const livesLeft = protectedByShield || this.special==='free' ? State.get().lives : State.loseLife(1);
    this.cameras.main.shake(120, 0.004);
    this._refreshHUD(false);

    Events.emit(EVT.NOTE_WRONG, { noteId, target, livesLeft, ...State.get() });
    if (livesLeft <= 0) this._gameOver();
  }

  _levelWin() {
    this._ending = true;
    this._stopTimers();
    this._killAllNotes();

    const run = State.get();
    if(!this.special)this._saveProgressWin(run.mode, run.level, run.lessonId, run.score, run.lives);
    if(this.special==='precision')this._savePrecision(run);

    Events.emit(EVT.LEVEL_WIN, { ...run });

    this.scene.start('ResultsScene', {
      status: 'win',
      special:this.special, practiceNotes:this.practiceNotes, targetCount:this.lesson.rules.targetPerLevel,
      ...this.adventure.snapshot(),
      mode: run.mode,
      level: run.level,
      lessonId: run.lessonId,
      score: run.score,
      correct: run.correct,
      wrong: run.wrong,
      lives: run.lives,
      backgroundKey: this.lesson.scene?.backgroundKey || null,
      phaseLabel: this.lesson.ui?.phaseLabel,
      phaseCaption: this.lesson.ui?.phaseCaption,
      accent: this.lesson.ui?.accent,
    });
  }

  _gameOver() {
    this._ending = true;
    this._stopTimers();
    this._killAllNotes();

    const run = State.get();
    if(this.special==='precision')this._savePrecision(run);
    Events.emit(EVT.GAME_OVER, { ...run });

    this.scene.start('ResultsScene', {
      status: 'lose',
      special:this.special, practiceNotes:this.practiceNotes, targetCount:this.lesson.rules.targetPerLevel,
      ...this.adventure.snapshot(),
      mode: run.mode,
      level: run.level,
      lessonId: run.lessonId,
      score: run.score,
      correct: run.correct,
      wrong: run.wrong,
      lives: 0,
      backgroundKey: this.lesson.scene?.backgroundKey || null,
      phaseLabel: this.lesson.ui?.phaseLabel,
      phaseCaption: this.lesson.ui?.phaseCaption,
      accent: this.lesson.ui?.accent,
    });
  }

  _savePrecision(run) {
    const progress=Storage.getProgress();const prior=progress.precisionBest||{};
    progress.precisionBest={score:Math.max(prior.score||0,run.score),correct:Math.max(prior.correct||0,run.correct)};
    Storage.setProgress(progress);
  }

  _saveProgressWin(mode, level, lessonId, score, lives) {
    const progress = Storage.getProgress();
    const unlocked = progress.unlocked || { lines: 1, spaces: 1, mixed: 1 };
    const best = progress.best || {};

    unlocked[mode] = Math.max(unlocked[mode] || 1, clamp(level + 1, 1, MAX_LEVEL));

    const prev = best[lessonId] || {};
    const run = State.get();
    const stats = this.adventure.snapshot();
    const accuracy = Math.round(run.correct / Math.max(1, run.correct + run.wrong) * 100);
    best[lessonId] = {
      ...prev,
      score: Math.max(prev.score || 0, score),
      lives: Math.max(prev.lives || 0, lives),
      stars: Math.max(prev.stars || 0, starsFor(run.correct, run.wrong)),
      accuracy: Math.max(prev.accuracy || 0, accuracy),
      bestStreak: Math.max(prev.bestStreak || 0, stats.bestStreak),
      date: new Date().toISOString(),
    };
    Storage.setProgress({ ...progress, unlocked, best });
  }

  _refreshHUD(initial) {
    const run = State.get();
    const needed = this.lesson.rules?.targetPerLevel ?? 5;

    this.hud.setAccent(this.lesson.ui?.accent);
    this.hud.setLevel(run.level, this._modeLabel(run.mode), this.lesson.ui?.phaseLabel);
    this.hud.setScore(run.correct, this.special==='free'?null:needed);
    this.hud.setLives(this.special==='free'?Infinity:run.lives, this.lesson.rules?.lives ?? 3);

    if (initial) {
      this.hud.flashGoal();
      this.staffBoard?.flash();
    }
  }

  _showLevelIntro() {
    this._introOpen=true;State.pause();this.physics.world.pause();this.spawnTimer.paused=true;if(this.goalTimer)this.goalTimer.paused=true;
    const stage=this.lesson.adventure;
    const levelDescription=this.special ? stage.title : `Nivel ${this.lesson.level} · ${this._modeLabel(this.lesson.mode)}`;
    this._startLevel=()=>{if(!this._introOpen)return;this._introOpen=false;this.introView?.close();this.introView=null;this._resume();};
    this.introView=modal(this,stage.title,`<p>${e(levelDescription)}</p><p>${e(stage.hint)}</p><p>${this.special==='free'?'Sin límite de aciertos ni vidas':`Meta: ${stage.goal} aciertos · 3 vidas`}<br>Objetivo en pentagrama</p><p>Arrastra o usa las flechas para moverte.<br>Toca un poder para activarlo.</p>`,[{label:'¡A recoger!',primary:true,run:this._startLevel}]);
  }

  _togglePause() {
    if (this._introOpen) return;
    if (State.get().paused) this._resume();
    else this._pause();
  }

  _pause() {
    if (this._pauseUIShown || this._ending || this._introOpen) return;
    this._pauseUIShown = true;

    this.touchDirection=0;
    State.pause();
    this.physics.world.pause();
    if (this.spawnTimer) this.spawnTimer.paused = true;
    if (this.goalTimer) this.goalTimer.paused = true;
    Audio.pauseMusic();

    this.hud.showPause({
      onResume: () => this._resume(),
      onFinish: this.special==='free' ? () => {this._resume();this._levelWin();} : null,
      onRestart: () => {
        this._pauseUIShown = false;
        this.scene.restart({ mode: this.lesson.mode, level: this.lesson.level, lessonId: this.lesson.id, special:this.special, practiceNotes:this.practiceNotes });
      },
      onMenu: () => {
        Audio.stopMusic();
        this._pauseUIShown = false;
        this.scene.start('MenuScene');
      },
    });

    Events.emit(EVT.PAUSE, { ...State.get() });
  }

  _resume() {
    if (this._introOpen) return;
    this.hud.hidePause();
    this.physics.world.resume();
    if (this.spawnTimer) this.spawnTimer.paused = false;
    if (this.goalTimer) this.goalTimer.paused = false;
    Audio.resumeMusic();
    if(this.lesson.scene?.music && this.cache.audio.exists(this.lesson.scene.music) && !this.sound.get(this.lesson.scene.music)) Audio.playMusic(this.lesson.scene.music,{volume:Audio.getSettings().musicVolume ?? 0.45,gain:this.lesson.scene.musicGain ?? 1});

    State.resume();
    this._pauseUIShown = false;

    Events.emit(EVT.RESUME, { ...State.get() });
  }

  _killAllNotes() {
    if (!this.notes?.children) return;
    this.notes.getChildren().slice().forEach((note) => note?._kill?.());
    this.notes.clear(true, true);
  }

  _stopTimers() {
    this.spawnTimer?.remove(false);
    this.goalTimer?.remove(false);
    this.spawnTimer = null;
    this.goalTimer = null;
  }

  _cleanup() {
    this._layoutObserver?.disconnect();
    this.introView?.close();this.introView=null;
    this.adventure?.destroy();
    this.adventure = null;
    this.game.events.off('blur', this._onBlur);
    this._stopTimers();

    this.scale.off('resize', this._onResize, this);
    this._offWorldBounds?.();
    this._offWorldBounds = null;

    if (this._onPointerMove) {
      this.input.off('pointermove', this._onPointerMove);
      this.input.off('pointerdown', this._onPointerMove);
      this._onPointerMove = null;
    }

    if (this._onPauseKey) {
      this.input.keyboard.off('keydown-SPACE', this._onPauseKey);
      this.input.keyboard.off('keydown-ESC', this._onPauseKey);
      this._onPauseKey = null;
    }

    this._killAllNotes();
    this.staffBoard?.destroy();
    this.staffBoard = null;

    this.hud?.destroy();
    this.hud = null;

    Audio.stopMusic();
  }

  _modeLabel(mode) {
    if (mode === 'lines') return 'Lineas';
    if (mode === 'spaces') return 'Espacios';
    return 'Mixto';
  }
}

