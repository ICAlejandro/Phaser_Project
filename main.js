const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

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

// --- INDIVIDUAL VOLUME CONTROLS ---
let volumeCollect = 0.5; 
let volumeHit = 0.9;
let volumeJump = 0.6;

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('gameOverScreen', 'assets/game_over_screen.png');
    this.load.image('playerHurt', 'assets/player_hurt.png'); // Loaded the hurt image asset

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
        frameWidth: 16,
        frameHeight: 16
    });
    this.load.spritesheet('stompParticle', 'assets/stompParticle_spritesheet.png', {
        frameWidth: 16,
        frameHeight: 16
    });

    // --- LOAD SOUND EFFECTS ---
    this.load.audio('sfx_collect', 'assets/sfx_collect.mp3');
    this.load.audio('sfx_hit', 'assets/sfx_hit.mp3');
    this.load.audio('sfx_jump', 'assets/sfx_jump.mp3');
}

function create() {
    this.add.image(400, 300, 'background');

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

    // Enemy walking animation loop (2-frame format like the star)
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
    timerText = this.add.text(700, 10, 'Time: 60', {
        fontSize: '20px',
        fill: '#0e0846'
    });

    // star counter
    scoreText = this.add.text(10, 75, 'Stars: 0', {
        fontSize: '20px',
        fill: '#0e0846'
    });

    // collision
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(enemies, platforms);
    this.physics.add.collider(chaseEnemies, platforms);

    this.physics.add.overlap(player, stars, collectStar, null, this);
    //this.physics.add.overlap(player, enemies, hitEnemy, null, this);
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

    // Movement controls (Always processing now, even if hurt, giving user full control override)
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

    if (spaceKey.isDown && player.body.touching.down) {
        player.setVelocityY(-450);
        
        // Play jump sound with its unique speed rate and individual volume
        this.sound.play('sfx_jump', { 
            rate: 0.7,
            volume: volumeJump
        });
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

    // Flip enemy sprite based on its movement direction
    enemies.getChildren().forEach((enemy) => {
        if (enemy.body.velocity.x > 0) {
            enemy.setFlipX(false);
        } else if (enemy.body.velocity.x < 0) {
            enemy.setFlipX(true);
        }
    });

    chaseEnemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;

        let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);

        if (dist < 200) {
            let dir = player.x < enemy.x ? -1 : 1;
            enemy.setVelocityX(dir * 120);
            enemy.setFlipX(dir > 0);
            enemy.anims.play('enemy_chase_run', true);
        } else {
            enemy.setVelocityX(0);
            enemy.anims.play('enemy_chase_idle', true);
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

        this.add.text(300, 250, 'TIME\'S UP!', {
            fontSize: '40px',
            fill: '#ff0000'
        });

        this.add.text(280, 320, 'Stars Collected: ' + score, {
            fontSize: '30px',
            fill: '#ffffff'
        });
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

    // Play collect sound with individual volume configuration
    this.sound.play('sfx_collect', { volume: volumeCollect });

    score++;
    scoreText.setText('Stars: ' + score);

    for (let i = 0; i < 4; i++) {
        let p = this.add.sprite(
            x + Phaser.Math.Between(-10, 10),
            y + Phaser.Math.Between(-10, 10),
            'starParticle'
        );
        p.anims.play('star_particle_anim');
        p.once('animationcomplete', () => p.destroy());
    }
    
    spawnStar(this);
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
        this.add.image(400, 300, 'gameOverScreen');
    } else {
        isHurt = true;
        player.anims.stop();
        player.setTexture('playerHurt');

        let knockbackDir = player.x < enemy.x ? -150 : 150;
        player.setVelocityX(knockbackDir);
        player.setVelocityY(-150);

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
    let enemy = chaseEnemies.create(650, 500, 'enemyChase');
    enemy.setCollideWorldBounds(true);
    enemy.anims.play('enemy_chase_idle');
}

function hitChaseEnemy(player, enemy) {
    if (isHurt) return;

    let stomping = player.body.velocity.y > 0 &&
                   player.body.bottom <= enemy.body.top + 20;

    if (stomping) {
        let ex = enemy.x;
        let ey = enemy.y;
        enemy.disableBody(true, true);
        player.setVelocityY(-350);

        for (let i = 0; i < 4; i++) {
            let p = this.add.sprite(
                ex + Phaser.Math.Between(-15, 15),
                ey + Phaser.Math.Between(-10, 10),
                'stompParticle'
            );
            p.anims.play('stomp_particle_anim');
            p.once('animationcomplete', () => p.destroy());
        }

        // Respawn exactly 1 new chase enemy after a short delay
        this.time.delayedCall(1000, () => {
            spawnChaseEnemy(this);
        });
    } else {
        hitEnemy.call(this, player, enemy);
    }
}
function stompPatrolEnemy(player, enemy) {
    if (isHurt) return;

    let stomping = player.body.velocity.y > 0 &&
                   player.body.bottom <= enemy.body.center.y;

    if (stomping) {
        let ex = enemy.x;
        let ey = enemy.y;
        enemy.disableBody(true, true);
        player.setVelocityY(-350);

        for (let i = 0; i < 4; i++) {
            let p = this.add.sprite(
                ex + Phaser.Math.Between(-15, 15),
                ey + Phaser.Math.Between(-10, 10),
                'stompParticle'
            );
            p.anims.play('stomp_particle_anim');
            p.once('animationcomplete', () => p.destroy());
        }

        this.time.delayedCall(1000, () => {
            spawnPatrolEnemy(this);
        });
    } else {
        hitEnemy.call(this, player, enemy);
    }
}
