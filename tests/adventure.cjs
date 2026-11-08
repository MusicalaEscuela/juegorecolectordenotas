const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: process.env.MUSI_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.stack));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForSelector('#loading.hidden', { state: 'attached' });
    await page.evaluate(async () => { window.__musi = { ...(await import('/game.js')), ...(await import('/services.js')) }; });
    await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
    const start = async (mode, level) => {
      await page.evaluate(async ({ mode, level }) => {
        const { game } = await import('/game.js');
        game.scene.getScenes(true)[0].scene.start('GameScene', { mode, level });
      }, { mode, level });
      await page.waitForFunction(id => {
        const { game } = window.__musi;
        const s = game.scene.getScene('GameScene');
        return s.sys.isActive() && s._introOpen && s.lesson.id === id;
      }, `${mode}-${level}`);
      await page.evaluate(async () => {
        const { game } = await import('/game.js');
        const s = game.scene.getScene('GameScene');
        s._startLevel(); s._stopTimers();
      });
    };
    const collect = async (wrong = false) => {
      const before = await page.evaluate(async wrong => {
        const { game } = await import('/game.js');
        const { State } = await import('/services.js');
        const s = game.scene.getScene('GameScene');
        s._killAllNotes(); s.adventure.graceUntil = 0;
        s._spawnOneNote();
        const n = s.notes.getChildren()[0];
        n.noteId = wrong ? 'incorrect' : State.get().target;
        n.body.reset(s.player.x, s.player.y + 8);
        n.body.setVelocity(0);
        return State.get().correct + State.get().wrong;
      }, wrong);
      await page.waitForFunction(before => {
        const { State } = window.__musi;
        return State.get().correct + State.get().wrong > before;
      }, before);
    };

    await start('lines', 1);
    assert.ok(await page.evaluate(async () => {
      const s=(await import('/game.js')).game.scene.getScene('GameScene');
      s._spawnOneNote();const note=s.notes.getChildren()[0];const badge=note._badge;
      note.x+=30;note.y+=40;note._syncLabel();
      const visible=badge.active && badge.fillColor===0xffffff && badge.fillAlpha>=0.95 && badge.x===note.x && badge.y===note.y && badge.depth<note.depth && note._label.alpha===1;
      note._kill();return visible && !badge.active;
    }));
    assert.deepEqual(await page.evaluate(async () => {
      const { game } = await import('/game.js');
      const s = game.scene.getScene('GameScene');
      const visual = s.adventure.collector;
      visual.catch(s.adventure.now);
      const frames = [0,100,200,300,400].map(dt => {
        visual.update(s.adventure.now + dt);
        return Number(s.player.frame.name);
      });
      return {
        art: ['musi-explorer','musi-explorer-sheet','musi-astronaut','musi-conductor'].every(key=>game.textures.exists(key)),
        frames,
        proportional: Math.abs(s.player.scaleX-s.player.scaleY)<0.00001,
        frameSize: [s.player.frame.width,s.player.frame.height],
      };
    }), {art:true,frames:[0,1,2,3,0],proportional:true,frameSize:[444,686]});
    // No answer labels in either target panel; falling choices remain named.
    assert.ok(await page.evaluate(async () => {
      const { game } = await import('/game.js');
      const s = game.scene.getScene('GameScene');
      return !s.staffBoard.goalChipText && s.hud.goalText.text === 'Lee la nota del pentagrama';
    }));
    for (let i = 0; i < 3; i++) await collect();
    assert.equal(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').adventure.energy), 3);
    await page.keyboard.press('1');
    assert.ok(await page.evaluate(async () => {
      const s = (await import('/game.js')).game.scene.getScene('GameScene');
      s._killAllNotes(); s._spawnOneNote();
      return s.adventure.fallFactor === 0.45 && Math.abs(s.notes.getChildren()[0].body.velocity.y / s.notes.getChildren()[0].baseFall - 0.45) < 0.001;
    }));
    await page.keyboard.press('Space');
    const paused = await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').adventure.now);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').adventure.now), paused);
    await page.keyboard.press('Space');
    assert.ok(await page.evaluate(async () => {
      const a = (await import('/game.js')).game.scene.getScene('GameScene').adventure;
      a.now = a.slowUntil + 1; return a.fallFactor === 1;
    }));
    console.log('PASS energy earned, keyboard power, slow speed and pause clock');

    await start('mixed', 10);
    // Shield: wrong answer still counts, but consumes shield instead of a life.
    await page.evaluate(async () => { const a=(await import('/game.js')).game.scene.getScene('GameScene').adventure; a.energy=3; a.activate('shield'); });
    await collect(true);
    assert.deepEqual(await page.evaluate(async () => { const {State}=await import('/services.js'); const a=(await import('/game.js')).game.scene.getScene('GameScene').adventure; return [State.get().lives, State.get().wrong, a.shieldUntil]; }), [3,1,0]);
    await page.evaluate(async () => { const a=(await import('/game.js')).game.scene.getScene('GameScene').adventure; a.energy=3; a.activate('basket'); });
    assert.equal(Math.round(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').player.body.width/(await import('/game.js')).game.scene.getScene('GameScene').layout.unit)),94);
    await page.evaluate(async () => { const a=(await import('/game.js')).game.scene.getScene('GameScene').adventure; a.now=a.bigUntil+1; a.update(0); });
    assert.equal(Math.round(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').player.body.width/(await import('/game.js')).game.scene.getScene('GameScene').layout.unit)),42);
    // Noise, warned wind, puddle penalty and recovery.
    await page.evaluate(async () => {
      const s=(await import('/game.js')).game.scene.getScene('GameScene');
      s._killAllNotes(); s.adventure.streak=2; s.adventure.energy=2; s.adventure.graceUntil=0;
      s.adventure.spawnNoise(); const n=s.notes.getChildren()[0]; n.body.reset(s.player.x,s.player.y+8);
    });
    await page.waitForFunction(() => window.__musi.game.scene.getScene('GameScene').adventure.noiseHits === 1);
    assert.deepEqual(await page.evaluate(async () => { const s=(await import('/game.js')).game.scene.getScene('GameScene'); return [s.adventure.energy,s.adventure.streak,(await import('/services.js')).State.get().lives]; }),[0,0,3]);
    assert.ok(await page.evaluate(async () => {
      const s=(await import('/game.js')).game.scene.getScene('GameScene');const a=s.adventure;
      s._killAllNotes(); s._spawnOneNote(); const n=s.notes.getChildren()[0]; n.drift=false;
      a.beginWind(); const warning=a.wind===0; a.now=a.windWarnAt+1; a.update(0);
      const blowing=Math.abs(Math.abs(n.body.velocity.x)-43*s.layout.unit)<0.001;
      a.beginPuddle(); a.now=a.puddle.starts+1; s.player.x=a.puddle.x; a.update(0);
      const sticky=a.moveFactor===0.48; a.now=a.puddle.ends+1000; a.update(0);
      return warning && blowing && sticky && !a.puddle && a.moveFactor===1;
    }));
    console.log('PASS shield, basket hitbox, noise, wind warning, puddle recovery');

    assert.ok(await page.evaluate(async () => {
      const { STAGES } = await import('/data.adventure.js');
      const s=(await import('/game.js')).game.scene.getScene('GameScene');
      s._killAllNotes(); s.adventure.restUntil=0; s._startSpawner();
      const delays=[];
      for(let i=0;i<3;i++){s.adventure.spawnWave();delays.push(s.spawnTimer.delay);}
      s._stopTimers();
      const burst=delays[0]===delays[1] && delays[2]>delays[0]*3;
      return burst && STAGES.every((stage,i)=>!i || stage.speed>STAGES[i-1].speed);
    }));

    // Normal goal changes preserve in-flight objects and their motion.
    assert.ok(await page.evaluate(async () => {
      const s=(await import('/game.js')).game.scene.getScene('GameScene');const {State}=await import('/services.js');
      s._killAllNotes(); s.adventure.graceUntil=0; s._spawnOneNote(); s._spawnOneNote();
      const [caught,other]=s.notes.getChildren(); caught.noteId=State.get().target;
      const y=other.y, v=other.body.velocity.y; s._onCollect(s.player,caught);
      return other.active && other.y===y && other.body.velocity.y===v;
    }));
    for (const mode of ['lines','spaces','mixed']) {
      for (let level=1;level<=10;level++) {
        await start(mode,level);
        const needed=await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').lesson.rules.targetPerLevel);
        for(let i=0;i<needed;i++) await collect();
        await page.waitForFunction(() => window.__musi.game.scene.isActive('ResultsScene'));
        assert.equal(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('ResultsScene').payload.status),'win');
      }
      console.log(`PASS 10 ${mode} levels via physics collisions`);
    }
    assert.deepEqual(await page.evaluate(async () => {
      const {Storage}=await import('/services.js');const {unlockedSkins}=await import('/data.adventure.js');
      const p=Storage.getProgress();return [Object.keys(p.best).length,unlockedSkins(p).length,p.best['mixed-10'].stars];
    }),[30,3,3]);
    for (const skin of ['astronaut','conductor']) {
      await page.evaluate(async skin => (await import('/services.js')).Storage.patchSettings({skin}),skin);
      await start('lines',1);
      await collect();
      assert.deepEqual(await page.evaluate(async () => {
        const s=(await import('/game.js')).game.scene.getScene('GameScene');const visual=s.adventure.collector;
        const frames=[0,100,200,300,400].map(dt=>{visual.update(visual.catchUntil-380+dt);return Number(s.player.frame.name)});
        return {key:visual.artKey,frames,size:[s.player.frame.width,s.player.frame.height],width:Math.round(s.player.body.width/s.layout.unit)};
      }), {key:`musi-${skin}-sheet`,frames:[0,1,2,3,0],size:[460,700],width:42});
    }
    await page.screenshot({path:path.join(root,'test-results/results.png')});
    await page.evaluate(async () => {const {game}=await import('/game.js');game.scene.getScene('GameScene').scene.start('MenuScene');});
    await page.waitForTimeout(150);
    await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('MenuScene').showWardrobe());
    await page.screenshot({path:path.join(root,'test-results/wardrobe.png')});
    await page.evaluate(async () => (await import('/services.js')).Storage.patchSettings({skin:'astronaut'}));
    await start('lines',1);
    assert.equal(await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene').adventure.skin),'astronaut');
    await page.evaluate(async () => {const s=(await import('/game.js')).game.scene.getScene('GameScene'); s._pause(); s.scene.restart({mode:'lines',level:1});});
    await page.waitForTimeout(150);
    await page.evaluate(async () => (await import('/game.js')).game.scene.getScene('GameScene')._startLevel());
    assert.ok(await page.evaluate(async () => {const s=(await import('/game.js')).game.scene.getScene('GameScene');return !s.physics.world.isPaused && s.adventure.energy===0;}));
    await page.setViewportSize({width:844,height:390});
    await page.waitForTimeout(200);
    const bounds=await page.locator('canvas').boundingBox();
    await page.touchscreen.tap(bounds.x+bounds.width*0.78,bounds.y+bounds.height*0.55);
    await page.waitForFunction(()=>{const s=window.__musi.game.scene.getScene('GameScene');return s.player.x>s.scale.width*.74;});
    const playerX=await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').player.x);
    await page.evaluate(()=>{window.__musi.game.scene.getScene('GameScene').adventure.energy=3;});
    await page.locator('[data-power="slow"]').tap();
    assert.ok(await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').adventure.fallFactor===0.45));
    assert.ok(Math.abs(await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').player.x)-playerX)<45);
    await page.screenshot({path:path.join(root,'test-results/mobile.png')});
    // Orientation / viewport changes must keep the same run, notes and powers.
    const preserved=await page.evaluate(()=>{
      const s=window.__musi.game.scene.getScene('GameScene');
      s._stopTimers();s._killAllNotes();s._spawnOneNote();
      window.__resizeNote=s.notes.getChildren()[0];
      s._pause();
      return {run:window.__musi.State.get(),clock:s.adventure.now};
    });
    for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[667,375],[844,390],[1920,1080]]){
      await page.setViewportSize({width,height});
      await page.waitForTimeout(200);
      const layout=await page.evaluate(()=>{
        const s=window.__musi.game.scene.getScene('GameScene');
        const canvas=document.querySelector('canvas').getBoundingClientRect();
        const root=document.getElementById('ui-root').getBoundingClientRect();
        const header=s.hud.header.getBoundingClientRect(),footer=s.hud.footer.getBoundingClientRect();
        const buttons=[...s.hud.footer.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0);
        return {coverage:canvas.width/window.innerWidth,noteAlive:window.__resizeNote.active,run:window.__musi.State.get(),clock:s.adventure.now,
          gap:s.layout.playerY-s.layout.spawnTop,
          contained:header.left>=root.left&&header.right<=root.right+1&&footer.left>=root.left&&footer.right<=root.right+1&&footer.bottom<=root.bottom+1,
          touchSize:buttons.every(b=>b.getBoundingClientRect().height>=44),
          bodyInside:s.player.y+s.player.displayHeight/2<s.layout.footerTop,
        };
      });
      assert.ok(layout.coverage>0.95,`${width}: canvas should use the available width`);
      assert.ok(layout.gap>70,`${width}x${height}: enough falling space`);
      assert.ok(layout.contained&&layout.touchSize&&layout.bodyInside&&layout.noteAlive,`${width}x${height}: layout safety`);
      assert.deepEqual(layout.run,preserved.run);
      assert.equal(layout.clock,preserved.clock);
    }
    await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene')._resume());
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
    await page.screenshot({path:path.join(root,'test-results/responsive-portrait.png')});
    const arrow=page.locator('[data-move="-1"]');
    const arrowBounds=await arrow.boundingBox();
    const xBefore=await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').player.x);
    await page.mouse.move(arrowBounds.x+arrowBounds.width/2,arrowBounds.y+arrowBounds.height/2);
    await page.mouse.down();await page.waitForTimeout(150);await page.mouse.up();
    assert.ok(await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').player.x)<xBefore);
    assert.equal(await page.evaluate(()=>window.__musi.game.scene.getScene('GameScene').touchDirection),0);
    console.log('PASS seven responsive sizes, orientation state preservation, touch targets and directional controls');
    await page.reload(); await page.waitForSelector('#loading.hidden',{state:'attached'});
    assert.equal(await page.evaluate(async () => Object.keys((await import('/services.js')).Storage.getProgress().best).length),30);
    await page.getByRole('button',{name:'Jugar Mixto',exact:true}).click();
    await page.locator('[data-level="10"]').click();
    await page.getByRole('button',{name:'¡A recoger!',exact:true}).click();
    await page.getByRole('button',{name:'Pausar partida'}).click();
    await page.getByRole('button',{name:'Volver al menú',exact:true}).click();
    await page.getByRole('button',{name:'Vestuario de Musi',exact:true}).click();
    await page.locator('[data-skin="conductor"]').click();
    assert.equal(await page.evaluate(async()=>(await import('/services.js')).Storage.getSettings().skin),'conductor');
    assert.deepEqual(errors,[]);
    console.log('PASS continuity, stars, skin unlocks, restart, saved progress and no JS errors');
  } finally { await browser.close(); server.close(); }
})().catch(error => {console.error(error);server.close();process.exitCode=1;});
