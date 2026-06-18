const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
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
let platforms;
let keys;
let spaceKey;

let score = 0;
let scoreText;
let gameOver = false;

// life system variables
let lives = 3;
let heartsGroup;
let isHurt = false; // Flag to track if player is in the hurt state

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
}

function create() {
    this.add.image(400, 300, 'background');

    // platforms
    platforms = this.physics.add.staticGroup();

    let ground = this.add.rectangle(400, 620, 800, 80, 0x00aa00);
    this.physics.add.existing(ground, true);
    platforms.add(ground);

    let middlePlatform = this.add.rectangle(400, 380, 250, 20, 0x00aa00);
    this.physics.add.existing(middlePlatform, true);
    platforms.add(middlePlatform);

    // player
    player = this.physics.add.sprite(400, 450, 'player', 0);
    player.setCollideWorldBounds(true);

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

    // groups
    stars = this.physics.add.group();

    // Spawn initial items so the game map isn't completely empty
    spawnStar(this);
    
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

    // star counter
    scoreText = this.add.text(10, 75, 'Stars: 0', {
        fontSize: '20px',
        fill: '#1f5c21'
    });

    // collision
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);

    this.physics.add.overlap(player, stars, collectStar, null, this);
}

function update() {
    if (gameOver) return;

    let speed = 200;

    player.setVelocityX(0);

    if (keys.A.isDown) {
        player.setVelocityX(-speed);
        player.setFlipX(true);
    }
    else if (keys.D.isDown) {
        player.setVelocityX(speed);
        player.setFlipX(false);
    }

    if (spaceKey.isDown && player.body.touching.down) {
        player.setVelocityY(-550);
    }

    // only process state animation rules if the player is not recovering from a hit
    if (!isHurt) {
        if (!player.body.touching.down) {
            player.anims.play('jump', true);
        }
        else if (player.body.velocity.x !== 0) {
            player.anims.play('run', true);
        }
        else {
            player.anims.play('idle', true);
        }
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

// collect star
function collectStar(player, star) {
    star.disableBody(true, true);

    score++;
    scoreText.setText('Stars: ' + score);

    spawnStar(this);

    if (score % 5 === 0) {
        player.setScale(player.scale + 0.1);
    }
}
