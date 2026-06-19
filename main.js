const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 },
            debug: false //if true, shows hitbox  
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);
const STAR_GOAL = 10; //star goal score
let highScore = 0;

let player;
let stars;
let enemies;
let chaseEnemies;
let platforms;
let keys;
let spaceKey;

let score = 0;
let scoreText;
let timeLeft = 60;
let timerText;
let timerEvent;
let timerStarted = false;
let gameOver = false;

// life system variables
let lives = 3;
let heartsGroup;
let isHurt = false; // Flag to track if player is in the hurt state
let isStomping = false;

// Jump tracking variable
let jumpCount = 0;

// volume control
let volumeCollect = 0.5; 
let volumeHit = 0.9;
let volumeJump = 0.5;
let volumeBgm = 0.1; 

let bgm;

let chaseEnemySpeed = 110; 
let roamEnemySpeed = 40; 

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('gameOverScreen', 'assets/game_over_screen.png');
    this.load.image('playerHurt', 'assets/player_hurt.png');
    this.load.image('victoryScreen', 'assets/victory_screen.png');

    this.load.spritesheet('player', 'assets/player_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('star', 'assets/star_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('heart', 'assets/heart_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // Loaded patrol enemy spritesheet
    this.load.spritesheet('enemyPatrol', 'assets/enemypatrol_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('enemyChase', 'assets/enemychase_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('starParticle', 'assets/starParticle_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });
    this.load.spritesheet('stompParticle', 'assets/death_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    // Audio Assets
    this.load.audio('sfx_collect', 'assets/sfx_collect.mp3');
    this.load.audio('sfx_hit', 'assets/sfx_hit.mp3');
    this.load.audio('sfx_jump', 'assets/sfx_jump.mp3'); //also used for the stomp sfx  
    this.load.audio('bgm', 'assets/bgm.mp3');
}

function create() {
    this.add.image(400, 300, 'background');
    highScore = Number(localStorage.getItem('starHighScore')) || 0;
    // Play and loop background music smoothly
    bgm = this.sound.add('bgm', { loop: true, volume: volumeBgm });
    bgm.play();

    // platforms
    platforms = this.physics.add.staticGroup();

    let ground = this.add.rectangle(400, 620, 800, 80, 0x191970);
    this.physics.add.existing(ground, true);
    platforms.add(ground);

    let middlePlatform = this.add.rectangle(400, 380, 250, 20, 0x191970);
    this.physics.add.existing(middlePlatform, true);
    platforms.add(middlePlatform);

    // player
    player = this.physics.add.sprite(400, 450, 'player', 0);
    player.setCollideWorldBounds(true);

    player.setScale(1.2);

    // animations
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 5,
        repeat: -1
    });

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
        frameRate: 10,
        repeat: -1
    });

    player.anims.play('idle');

    // star animation loop
    this.anims.create({
        key: 'star_glow',
        frames: this.anims.generateFrameNumbers('star', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1
    });

    // heart animation loop
    this.anims.create({
        key: 'heart_pulse',
        frames: this.anims.generateFrameNumbers('heart', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1
    });

    // Enemy walking animation loop
    this.anims.create({
        key: 'enemy_walk',
        frames: this.anims.generateFrameNumbers('enemyPatrol', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_chase_idle',
        frames: this.anims.generateFrameNumbers('enemyChase', { start: 0, end: 0 }),
        frameRate: 1,
        repeat: -1
    });

    this.anims.create({
        key: 'enemy_chase_run',
        frames: this.anims.generateFrameNumbers('enemyChase', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1
    });
    
    this.anims.create({
        key: 'star_particle_anim',
        frames: this.anims.generateFrameNumbers('starParticle', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
    });

    this.anims.create({
        key: 'stomp_particle_anim',
        frames: this.anims.generateFrameNumbers('stompParticle', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
    });

    // groups
    stars = this.physics.add.group();
    enemies = this.physics.add.group();
    chaseEnemies = this.physics.add.group();

    // Spawn initial items so the game map isn't completely empty
    spawnStar(this);
    spawnPatrolEnemy(this);
    spawnChaseEnemy(this);
    
    // input
    keys = this.input.keyboard.addKeys({
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D
    });

    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // heart counter
    heartsGroup = this.add.group();
    for (let i = 0; i < lives; i++) {
        let heart = heartsGroup.create(35 + (i * 70), 35, 'heart');
        heart.anims.play('heart_pulse');
    }

    // timer
    timerText = this.add.text(700, 10, 'Time: ' + timeLeft, {
        fontSize: '20px',
        fill: '#0e0846'
    });

    // star counter
    scoreText = this.add.text(10, 75, 'Stars: ' + score, {
        fontSize: '20px',
        fill: '#0e0846'
    });

    // collision
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(enemies, platforms);

    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, enemies, stompPatrolEnemy, null, this);
    this.physics.add.overlap(player, chaseEnemies, hitChaseEnemy, null, this);
}

function update() {
    if (gameOver) return;
    if (!timerStarted && (keys.A.isDown || keys.D.isDown || spaceKey.isDown)) {
        timerStarted = true;

        timerEvent = this.time.addEvent({
            delay: 1000,
            callback: updateTimer,
            callbackScope: this,
            loop: true
        });
    }

    let speed = 200;

    // movement  
    let currentVelocityY = player.body.velocity.y;
    let isMovingHorizontally = false;

    if (keys.A.isDown) {
        player.setVelocityX(-speed);
        player.setFlipX(true);
        isMovingHorizontally = true;
    }
    else if (keys.D.isDown) {
        player.setVelocityX(speed);
        player.setFlipX(false);
        isMovingHorizontally = true;
    }
    else {
        player.setVelocityX(0);
    }

    if (player.body.touching.down) {
        jumpCount = 0;
    } else if (jumpCount === 0) {
        jumpCount = 1;
    }

    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        if (player.body.touching.down || jumpCount < 2) {
            player.setVelocityY(-400);//jump height
            jumpCount++;
            
            this.sound.play('sfx_jump', { 
                rate: jumpCount === 2 ? 0.9 : 0.7, // double jump sfx pitch
                volume: volumeJump
            });
        }
    }

    // Process matching asset visual styling states cleanly
    if (!isHurt) {
        if (!player.body.touching.down) {
            player.anims.play('jump', true);
        }
        else if (isMovingHorizontally) {
            player.anims.play('run', true);
        }
        else {
            player.anims.play('idle', true);
        }
    }

    enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        if (enemy.body.velocity.x > 0) {
            enemy.setFlipX(false);
        } else if (enemy.body.velocity.x < 0) {
            enemy.setFlipX(true);
        }
    });

    chaseEnemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;

        let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);

        // Always keep the movement/running loop playing, even if the player is out of range
        if (enemy.anims.currentAnim?.key !== 'enemy_chase_run') {
            enemy.anims.play('enemy_chase_run', true);
        }

        if (dist < 200) {
            this.physics.moveToObject(enemy, player, chaseEnemySpeed);
            enemy.setFlipX(player.x > enemy.x);
        } else {
            // Pick a slower, random trajectory loop if currently idling or completely stopped
            if (enemy.body.velocity.x === 0 && enemy.body.velocity.y === 0) {
                let randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                enemy.setVelocity(
                    Math.cos(randomAngle) * roamEnemySpeed,
                    Math.sin(randomAngle) * roamEnemySpeed
                );
            }
            // Maintain layout tracking updates during passive paths
            enemy.setFlipX(enemy.body.velocity.x > 0);
        }
    });
}

function updateTimer() {
    if (gameOver) return;
    timeLeft--;
    timerText.setText('Time: ' + timeLeft);

     if (timeLeft <= 10) {
        timerText.setColor('#ff0000');
    }

    if (timeLeft <= 0) {
        timerEvent.remove();
        gameOver = true;
        this.physics.pause();
        
        if (bgm) bgm.stop();

        this.add.image(400, 300, 'gameOverScreen');

        this.add.text(400, 360, 'Time ran out! Stars Collected: ' + score + ' / ' + STAR_GOAL, {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        createRetryButton(this);
    }
}

// spawn star
function spawnStar(scene) {
    let x = Phaser.Math.Between(50, 750);
    let y = Phaser.Math.Between(80, 300);

    let star = stars.create(x, y, 'star');

    star.anims.play('star_glow');

    star.setBounce(0.3);
    star.setCollideWorldBounds(true);
}

// Helper to spawn the left/right moving patrol enemy (Limited to a maximum of 1)
function spawnPatrolEnemy(scene) {
    if (enemies.countActive(true) === 0) {
        let enemy = enemies.create(100, 500, 'enemyPatrol');
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1, 0); 
        enemy.setVelocityX(80); 
        
        enemy.anims.play('enemy_walk');
    }
}

// collect star
function collectStar(player, star) {
    let x = star.x;
    let y = star.y;
    star.disableBody(true, true);

    this.sound.play('sfx_collect', { volume: volumeCollect });

    score++;
    scoreText.setText('Stars: ' + score);

    // Removed loop: Creating a single sprite instance since the spritesheet holds the full sequence
    let p = this.add.sprite(x, y, 'starParticle');
    p.anims.play('star_particle_anim');
    p.once('animationcomplete', () => p.destroy());

    if (score >= STAR_GOAL) {
        triggerVictory.call(this);
        return;
    }
    
    spawnStar(this);
}

function triggerVictory() {
    gameOver = true;
    if (timerEvent) timerEvent.remove();
    this.physics.pause();

    if (bgm) bgm.stop();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('starHighScore', highScore);
    }

    this.add.image(400, 300, 'victoryScreen');

    this.add.text(400, 340, 'Stars Collected: ' + score, {
        fontSize: '28px',
        fill: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(400, 380, 'High Score: ' + highScore, {
        fontSize: '24px',
        fill: '#ffff00'
    }).setOrigin(0.5);

    createRetryButton(this);
}

// player damage handling when colliding with patrol enemy
function hitEnemy(player, enemy) {
    if (isHurt) return;

    lives--;

    this.sound.play('sfx_hit', { volume: volumeHit });
    this.cameras.main.shake(150, 0.02);

    let currentHearts = heartsGroup.getChildren();
    if (currentHearts.length > 0) {
        currentHearts[currentHearts.length - 1].destroy();
    }

    if (lives <= 0) {
        this.physics.pause();
        player.setVisible(false);
        gameOver = true;
        
        if (bgm) bgm.stop();
        
        this.add.image(400, 300, 'gameOverScreen');

        this.add.text(400, 360, 'Out of lives! Stars Collected: ' + score + ' / ' + STAR_GOAL, {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        createRetryButton(this);
    } else {
        isHurt = true;
        player.anims.stop();
        player.setTexture('playerHurt');

        let knockbackDir = player.x < enemy.x ? -150 : 150;
        player.setVelocityX(knockbackDir);
        player.setVelocityY(-150);
        jumpCount = 1; // Allows a single recovery jump if knocked into mid-air

        this.tweens.add({
            targets: player,
            alpha: 0.2,
            duration: 50,
            yoyo: true,
            repeat: 9,
            onComplete: () => {
                if (!gameOver) {
                    isHurt = false;
                    player.alpha = 1;
                    player.setTexture('player');
                    player.anims.play('idle', true);
                }
            }
        });
    }
}

function spawnChaseEnemy(scene) {
    let x;
    do {
        x = Phaser.Math.Between(50, 750);
    } while (Math.abs(x - player.x) < 200);
    
    let y = Phaser.Math.Between(100, 300);
    let enemy = chaseEnemies.create(x, y, 'enemyChase');
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(1, 1); // roaming feature
    
    enemy.body.setAllowGravity(false);
    enemy.anims.play('enemy_chase_run'); 
}

function hitChaseEnemy(player, enemy) {
    let stomping = player.body.velocity.y > 0 &&
                   player.body.bottom <= enemy.body.top + 20;

    if (stomping) {
        if (isStomping) return;
        isStomping = true;
        
        let ex = enemy.x;
        let ey = enemy.y;
        
        enemy.disableBody(true, false);
        player.setVelocityY(-350);
        jumpCount = 1; // Refresh jump count to allow 1 single mid-air jump after a successful stomp bounce!

        // Play the jump sound pitched down for the stomp impact
        this.sound.play('sfx_jump', { 
            rate: 0.5, // Pitched down from the standard jump rate
            volume: volumeJump
        });

        this.tweens.add({
            targets: enemy,
            scaleY: 0.1,
            scaleX: 1.6,
            alpha: 0,
            y: ey + 20, 
            duration: 200,
            ease: 'Quad.easeOut',
            onComplete: () => {
                enemy.destroy();
            }
        });

        // Removed loop to fix the overlapping asset stacking bug
        let p = this.add.sprite(ex, ey, 'stompParticle');
        p.setScale(1.5);
        p.setAlpha(0.3); 
        p.anims.play('stomp_particle_anim');
        p.once('animationcomplete', () => p.destroy());

        // Respawn exactly 1 new chase enemy after a short delay
        this.time.delayedCall(1000, () => {
            isStomping = false;
            spawnChaseEnemy(this);
        });
    } else {
        if (!isStomping) hitEnemy.call(this, player, enemy);
    }
}

function stompPatrolEnemy(player, enemy) {
    let stomping = player.body.velocity.y > 0 &&
                   player.body.bottom <= enemy.body.center.y;

    if (stomping) {
        if (isStomping) return;
        isStomping = true;
        
        let ex = enemy.x;
        let ey = enemy.y;
        
        enemy.disableBody(true, false);
        player.setVelocityY(-350);
        jumpCount = 1; // Refresh jump count to allow 1 single mid-air jump after a successful stomp bounce!

        // Play the jump sound pitched down for the stomp impact
        this.sound.play('sfx_jump', { 
            rate: 0.5, // Pitched down from the standard jump rate
            volume: volumeJump
        });

        this.tweens.add({
            targets: enemy,
            scaleY: 0.1,
            scaleX: 1.6,
            alpha: 0,
            y: ey + 20, 
            duration: 200,
            ease: 'Quad.easeOut',
            onComplete: () => {
                enemy.destroy();
            }
        });

        // Removed loop to fix the overlapping asset stacking bug
        let p = this.add.sprite(ex, ey, 'stompParticle');
        p.setScale(1.5);
        p.setAlpha(0.5); 
        p.anims.play('stomp_particle_anim');
        p.once('animationcomplete', () => p.destroy());

        this.time.delayedCall(1000, () => {
            isStomping = false;
            spawnPatrolEnemy(this);
        });
    } else {
        if (!isStomping) hitEnemy.call(this, player, enemy);
    }
}

// Helper function to create an interactive retry button on screen
function createRetryButton(scene) {
    const btnWidth = 240;
    const btnHeight = 60;
    const btnX = 400;
    const btnY = 460;
    const cornerRadius = 15; 

    let bgGraphics = scene.add.graphics();
    bgGraphics.fillStyle(0x12d0ff, 0.7); // opacity
    bgGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, cornerRadius);

    let retryButtonText = scene.add.text(btnX, btnY, 'PLAY AGAIN', {
        fontSize: '32px',
        fill: '#0d0f2d',
        fontStyle: 'bold'
    });
    retryButtonText.setOrigin(0.5);
    retryButtonText.setAlpha(0.4); // opacity

    let buttonZone = scene.add.zone(btnX, btnY, btnWidth, btnHeight);
    buttonZone.setInteractive({ useHandCursor: true });

    buttonZone.on('pointerover', () => {
        retryButtonText.setStyle({ fill: '#151f6d' });
        retryButtonText.setAlpha(1); // Make it solid on hover
        
        bgGraphics.clear();
        bgGraphics.fillStyle(0x12d0ff, 1); // Make background solid on hover
        bgGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    });

    buttonZone.on('pointerout', () => {
        retryButtonText.setStyle({ fill: '#100d29' });
        retryButtonText.setAlpha(0.7); // Return back to low opacity frame setting
        
        bgGraphics.clear();
        bgGraphics.fillStyle(0x12d0ff, 0.7); // Return back to low opacity background setting
        bgGraphics.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    });

    // Reset properties and trigger scene restart on press
    buttonZone.on('pointerdown', () => {
        if (timerEvent) timerEvent.remove();
        if (bgm) bgm.stop();
        resetGameState();
        scene.scene.restart();
    });
}

// reset feature  
function resetGameState() {
    score = 0;
    timeLeft = 60;
    timerStarted = false;
    gameOver = false;
    lives = 3;
    isHurt = false;
    isStomping = false;
    jumpCount = 0;
}
