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
let bombs;
let platforms;
let keys;
let spaceKey;

let score = 0;
let scoreText;
let gameOver = false;

let colorIndex = 0;
const colors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x8f00ff];

function preload() {
    this.load.image('background', 'assets/background.png');

    this.load.spritesheet('player', 'assets/player_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.spritesheet('star', 'assets/star_spritesheet.png', {
        frameWidth: 64,
        frameHeight: 64
    });

    this.load.image('bomb', 'assets/bomb.png');
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

    // groups
    stars = this.physics.add.group();
    bombs = this.physics.add.group();

    spawnStar(this);

    // input
    keys = this.input.keyboard.addKeys({
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D
    });

    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // UI
    scoreText = this.add.text(10, 10, 'Stars: 0', {
        fontSize: '20px',
        fill: '#ffffff'
    });

    // collision
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(bombs, platforms);

    // star collder
    this.physics.add.collider(stars, platforms);

    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, bombs, hitBomb, null, this);
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

    player.setTint(colors[colorIndex]);
    colorIndex = (colorIndex + 1) % colors.length;

    if (score % 5 === 0) {
        player.setScale(player.scale + 0.1);
    }

    if (Phaser.Math.Between(0, 7) === 0) {//bomb sapn rate
        let bomb = bombs.create(Phaser.Math.Between(50, 750), 50, 'bomb');

        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
    }
}

// lose condition
function hitBomb(player, bomb) {
    this.physics.pause();
    player.setVisible(false);

    gameOver = true;

    this.add.text(300, 250, 'GAME OVER', {
        fontSize: '40px',
        fill: '#ff0000'
    });
}