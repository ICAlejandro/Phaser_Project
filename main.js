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
let platforms;
let stars;
let keys;
let spaceKey;
let score = 0;
let scoreText;
let gameOver = false;

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('player', 'assets/player.png');

    this.load.image('star_1', 'assets/star_1.png');
    this.load.image('star_2', 'assets/star_2.png');
    this.load.image('star_3', 'assets/star_3.png');
    this.load.image('star_4', 'assets/star_4.png');
}

function create() {
    this.add.image(400, 300, 'background');

    // platform
    platforms = this.physics.add.staticGroup();

    let ground = this.add.rectangle(400, 550, 800, 40, 0x00aa00);
    this.physics.add.existing(ground, true);
    platforms.add(ground);

    let platform1 = this.add.rectangle(400, 400, 200, 20, 0x00aa00);
    this.physics.add.existing(platform1, true);
    platforms.add(platform1);

    // player (64x64 recommended asset size)
    player = this.physics.add.sprite(400, 450, 'player');
    player.setCollideWorldBounds(true);

    // stars (24x24 recommended asset size)
    stars = this.physics.add.group();

    const positions = [
        { x: 100, y: 120 },
        { x: 250, y: 180 },
        { x: 400, y: 120 },
        { x: 550, y: 180 },
        { x: 700, y: 120 }
    ];

    positions.forEach(pos => {
        let star = stars.create(pos.x, pos.y, 'star_1');

        // fixed stars (no gravity)
        star.body.setAllowGravity(false);
        star.body.immovable = true;
    });

    // star animation
    this.anims.create({
        key: 'spin',
        frames: [
            { key: 'star_1' },
            { key: 'star_2' },
            { key: 'star_3' },
            { key: 'star_4' }
        ],
        frameRate: 8,
        repeat: -1
    });

    stars.children.iterate(function (child) {
        child.play('spin');
    });

    // input (WASD only)
    keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D
    });

    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // score
    scoreText = this.add.text(10, 10, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff'
    });

    // collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);
}

function update() {
    if (gameOver) return;

    let speed = 200;

    player.setVelocityX(0);

    // move left
    if (keys.A.isDown) {
        player.setVelocityX(-speed);
    }

    // move right
    else if (keys.D.isDown) {
        player.setVelocityX(speed);
    }

    // jump
    if (spaceKey.isDown && player.body.touching.down) {
        player.setVelocityY(-550);
    }
}

function collectStar(player, star) {
    star.disableBody(true, true);

    score++;
    scoreText.setText('Score: ' + score);

    console.log("Star collected");

    // win condition
    if (score === 5) {
        gameOver = true;

        this.add.text(270, 250, 'YOU WIN!', {
            fontSize: '48px',
            fill: '#ffff00'
        });

        console.log("Player won");
    }
}