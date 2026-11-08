'use strict';

import { makePhaserConfig, bindResizeNudges } from './config.js';
import { BootScene } from './scene.boot.js';
import { MenuScene } from './scene.menu.js';
import { GameScene } from './scene.game.js';
import { ResultsScene } from './scene.results.js';

const config = makePhaserConfig([
  BootScene,
  MenuScene,
  GameScene,
  ResultsScene,
]);

const game = new Phaser.Game(config);

bindResizeNudges(game);

export { game };
