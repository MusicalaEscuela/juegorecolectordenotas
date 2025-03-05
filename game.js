/* -------------------- MENÚ PRINCIPAL -------------------- */
class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    preload() {
        // Cargar imágenes
        this.load.image('menuBackground', 'assets/menu.png'); // Asegúrate que la ruta sea correcta
    }

    create() {
        // Fondo del menú
        const background = this.add.image(0, 0, 'menuBackground').setOrigin(0, 0);
        background.setDisplaySize(this.sys.canvas.width, this.sys.canvas.height);

        this.add.tween({
            targets: background,
            alpha: { from: 0, to: 1 },
            duration: 1000
        });        

        // Título del juego
        this.add.text(400, 150, '🎵 Recolector de Notas 🎵', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Botón para iniciar el juego
        const playButton = this.add.text(400, 300, '▶ Iniciar Juego', {
            fontSize: '36px',
            fill: '#00ff00'
        }).setOrigin(0.5).setInteractive();

        playButton.on('pointerdown', () => {
            this.scene.start('GameScene'); // Inicia la escena del juego
        });

        // Botón de Instrucciones
        const instructionsButton = this.add.text(400, 370, 'ℹ Instrucciones', {
            fontSize: '32px',
            fill: '#ffff00'
        }).setOrigin(0.5).setInteractive();

        instructionsButton.on('pointerdown', () => {
            this.showInstructions();
        });

        // Botón de salir
        const exitButton = this.add.text(400, 440, '❌ Salir', {
            fontSize: '32px',
            fill: '#ff0000'
        }).setOrigin(0.5).setInteractive();

        exitButton.on('pointerdown', () => {
            this.game.destroy(true); // Cierra el juego
        });
    }

    showInstructions() {
        // Fondo semitransparente
        this.instructionsBg = this.add.rectangle(400, 300, 500, 250, 0x000000, 0.8)
            .setOrigin(0.5)
            .setDepth(1); // Se asegura de que esté al frente
    
        // Texto de instrucciones
        this.instructionsText = this.add.text(400, 270, 
            "📜 Instrucciones 📜\n\n" + 
            "🎮 Usa las flechas para moverte\n" + 
            "🎯 Recoge solo la nota correcta\n" + 
            "❌ Evita las notas incorrectas",
            {
                fontSize: '24px',
                fill: '#ffffff',
                align: 'center'
            })
            .setOrigin(0.5)
            .setDepth(2);
    
        // Botón para cerrar
        this.closeButton = this.add.text(400, 380, '❌ Cerrar', {
            fontSize: '28px',
            fill: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5)
          .setInteractive()
          .setDepth(2);
    
        // Acción al hacer clic en cerrar
        this.closeButton.on('pointerdown', () => {
            this.instructionsBg.destroy();
            this.instructionsText.destroy();
            this.closeButton.destroy();
        });
    
        // Efecto de aparición
        this.tweens.add({
            targets: [this.instructionsBg, this.instructionsText, this.closeButton],
            alpha: { from: 0, to: 1 },
            duration: 500
        });
    }    
}

/* -------------------- ESCENA DEL JUEGO -------------------- */
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        console.log('Preload funcionando');

        // Cargar imágenes
        this.load.image('background', 'assets/background2.png');
        this.load.image('note', 'assets/note.png');
        this.load.image('character', 'assets/muñequito.png');

        // Cargar imágenes de notas musicales
        this.load.image('Mi', 'assets/mi.png');
        this.load.image('Sol', 'assets/sol.png');
        this.load.image('Si', 'assets/si.png');
        this.load.image('Re', 'assets/re.png');
        this.load.image('Fa', 'assets/fa.png');

        // Cargar sonidos
        this.load.audio('bgMusic', 'assets/music.mp3');
        this.load.audio('noteCorrect', 'assets/correct.mp3');
        this.load.audio('noteWrong', 'assets/incorrect.mp3');
    }

    create() {
        console.log('Create funcionando');

        // Variables globales
        this.collectedNotes = 0;
        this.currentLevel = 1;
        this.availableNotes = ["Mi"];
        this.lives = 3;
        this.isPaused = false;

        // Fondo
        const background = this.add.image(0, 0, 'background').setOrigin(0, 0);
        background.setDisplaySize(this.sys.canvas.width, this.sys.canvas.height);

        // Jugador
        this.player = this.physics.add.sprite(400, 500, 'character').setScale(0.3);
        this.player.setCollideWorldBounds(true);

        // Movimiento con el mouse (horizontalmente)
        this.input.on('pointermove', (pointer) => {
            this.player.x = pointer.x; // Solo se mueve en el eje X
        });

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();

        // Grupo de notas
        this.notes = this.physics.add.group();

        // Superposición entre jugador y notas
        this.physics.add.overlap(this.player, this.notes, this.collectNote, null, this);

        // Texto de puntaje, nivel y vidas
        this.scoreText = this.add.text(16, 16, 'Notas recolectadas: 0/5', { fontSize: '28px', fill: '#ffffff' });
        this.levelText = this.add.text(16, 50, 'Nivel: 1', { fontSize: '28px', fill: '#00ff00' });
        this.livesText = this.add.text(16, 90, 'Vidas: ❤️❤️❤️', { fontSize: '28px', fill: '#ff0000' });

        // Texto "Nota objetivo" (arriba)
        this.add.text(700, 20, '🎯 Nota objetivo', {
            fontSize: '18px',
            fill: '#ffff00'
        }).setOrigin(0.5);

        // Imagen de la nota objetivo (debajo del texto)
        this.noteGoal = "Mi";
        this.noteGoalImage = this.add.image(700, 85, this.noteGoal)
            .setScale(0.15)  // Ajusta el tamaño según la imagen
            .setOrigin(0.5);

        // Generar notas
        this.dropNoteEvent = this.time.addEvent({
            delay: 1200,
            callback: this.dropNote,
            callbackScope: this,
            loop: true
        });

        // Pausar/reanudar con ESPACIO
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.isPaused) {
                this.pauseGame();
            } else {
                this.resumeGame();
            }
        });

        // Música de fondo
        let bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
        bgMusic.play();

        // Partículas al recolectar notas
        let particles = this.add.particles('note');
        this.noteEmitter = particles.createEmitter({
            speed: { min: -200, max: 200 },
            scale: { start: 0.1, end: 0 },
            lifespan: 500,
            quantity: 10,
            on: false
        });
    }

    update() {
        // Movimiento del jugador
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-400);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(400);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        // Salto
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-250);
        }

        // Actualizar etiquetas de las notas
        this.notes.children.iterate(function (note) {
            if (note && note.label) {
                note.label.x = note.x - 15;
                note.label.y = note.y - 40;
            }
        });
    }

    dropNote() {
        let x = Phaser.Math.Between(50, 750);
        let note = this.notes.create(x, -50, 'note').setScale(0.05);

        // Velocidad de caída
        note.setVelocityY(Phaser.Math.Between(80, 120));

        // Asignar nota aleatoria
        let randomNote = Phaser.Utils.Array.GetRandom(this.availableNotes);
        note.noteType = randomNote;

        // Etiqueta de la nota
        let noteLabel = this.add.text(note.x - 15, note.y - 40, randomNote, {
            fontSize: '32px',
            fill: '#000000',
            fontStyle: 'bold'
        });
        note.label = noteLabel;
    }

    collectNote(player, note) {
        if (note.noteType === this.noteGoal) {
            note.destroy();
            note.label.destroy();
            note.label.destroy();
            this.collectedNotes += 1;
            this.scoreText.setText('Notas recolectadas: ' + this.collectedNotes + '/5');

            this.sound.play('noteCorrect');
            this.noteEmitter.explode(15, note.x, note.y);

            if (this.collectedNotes >= 5) {
                this.advanceLevel();
            } else {
                this.changeNoteGoal();
            }
        } else {
            note.disableBody(true, true);
            note.label.destroy();
            this.sound.play('noteWrong');
            this.loseLife();
        }
    }

    changeNoteGoal() {
        if (this.availableNotes.length > 1) {
            let newGoal;
            do {
                newGoal = Phaser.Utils.Array.GetRandom(this.availableNotes);
            } while (newGoal === this.noteGoal);
            this.noteGoal = newGoal;
        }
        
        this.noteGoalImage.setTexture(this.noteGoal);  // Cambia la imagen de la nota
    }    

    advanceLevel() {
        this.currentLevel += 1;
        this.collectedNotes = 0;

        if (this.currentLevel > 5) {
            this.winGame("¡Ganaste todos los niveles! 🎉");
        } else {
            this.levelText.setText('Nivel: ' + this.currentLevel);
            let newNote = ["Sol", "Si", "Re", "Fa"][this.currentLevel - 2];
            if (newNote) {
                this.availableNotes.push(newNote);
            }

            this.changeNoteGoal();

            let levelTextObj = this.add.text(400, 300, `¡Nivel ${this.currentLevel}! 🎶`, {
                fontSize: '48px',
                fill: '#00ff00'
            }).setOrigin(0.5);

            this.time.delayedCall(2000, () => levelTextObj.destroy());
        }
    }

    loseLife() {
        this.lives -= 1;
        let hearts = '❤️'.repeat(this.lives) + '🖤'.repeat(3 - this.lives);
        this.livesText.setText('Vidas: ' + hearts);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    winGame(message) {
        this.dropNoteEvent.remove(false);
        this.physics.world.pause();

        this.add.text(400, 300, message, {
            fontSize: '48px',
            fill: '#00ff00'
        }).setOrigin(0.5);
    }

    gameOver() {
        this.dropNoteEvent.remove(false);
        this.physics.world.pause();

        this.add.text(400, 300, '¡Game Over! 😢', {
            fontSize: '48px',
            fill: '#ff0000'
        }).setOrigin(0.5);
    }

    pauseGame() {
        this.isPaused = true;
        this.physics.world.pause();
        this.dropNoteEvent.paused = true;
    
        // Fondo semitransparente
        this.pauseOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
    
        // Texto "Juego Pausado"
        this.pauseText = this.add.text(400, 200, '⏸ Juego Pausado', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    
        // Botón para reanudar
        this.resumeButton = this.add.text(400, 300, '▶ Reanudar', {
            fontSize: '36px',
            fill: '#00ff00'
        }).setOrigin(0.5).setInteractive();
    
        this.resumeButton.on('pointerdown', () => {
            this.resumeGame();
        });
    
        // Botón para reiniciar el nivel
        this.restartButton = this.add.text(400, 370, '🔄 Reiniciar Nivel', {
            fontSize: '36px',
            fill: '#ffff00'
        }).setOrigin(0.5).setInteractive();
    
        this.restartButton.on('pointerdown', () => {
            this.scene.restart(); // Reinicia la escena actual
        });
    
        // Botón para volver al menú principal
        this.menuButton = this.add.text(400, 440, '🏠 Volver al Menú', {
            fontSize: '36px',
            fill: '#ff0000'
        }).setOrigin(0.5).setInteractive();
    
        this.menuButton.on('pointerdown', () => {
            this.scene.start('MainMenu'); // Vuelve al menú principal
        });

        // Agregar un sonido al pasar el mouse sobre un botón
        playButton.on('pointerover', () => {
            this.sound.play('hoverSound', { volume: 0.5 });
        });
    }
    
    resumeGame() {
        this.isPaused = false;
        this.physics.world.resume();
        this.dropNoteEvent.paused = false;
    
        // Eliminar elementos del menú de pausa
        this.pauseOverlay.destroy();
        this.pauseText.destroy();
        this.resumeButton.destroy();
        this.restartButton.destroy();
        this.menuButton.destroy();
    }    
}

/* -------------------- CONFIGURACIÓN Y CREACIÓN DEL JUEGO -------------------- */
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [MainMenu, GameScene]
};

// ✅ Crear el juego después de definir las escenas
const game = new Phaser.Game(config);
