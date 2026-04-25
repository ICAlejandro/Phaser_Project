const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1d1d1d',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    console.log("Game is loading...");
}

function create() {
    this.add.text(250, 280, 'Phaser is working!', {
        fontSize: '32px',
        fill: '#ffffff'
    });
}

function update() {}