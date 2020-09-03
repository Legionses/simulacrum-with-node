// import Phaser from "phaser";
// import tileSet from "./assets/tuxmon-sample-32px-extruded.png";
// import atlas from "./assets/atlas/atlas.png"

const config = {
    type: Phaser.AUTO, // Which renderer to use
    width: 800, // Canvas width in pixels
    height: 600, // Canvas height in pixels
    parent: "game-container", // ID of the DOM element to add the canvas to
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: {y: 0} // Top down game, so no gravity
        }
    }
};
let cursors;
const game = new Phaser.Game(config);

function addPlayer(self, playerInfo, worldLayer) {
    self.player = self.physics.add
        .sprite(playerInfo.x, playerInfo.y, "atlas", "misa-front")
        .setSize(30, 40)
        .setOffset(0, 24);

    self.physics.add.collider(self.player, worldLayer);
    self.cameras.main.startFollow(self.player);
}

function addOtherPlayer(self, playerInfo, worldLayer) {
    const otherPlayer = self.physics.add
        .sprite(playerInfo.x, playerInfo.y, "atlas", "misa-front")
        .setSize(30, 40)
        .setOffset(0, 24);

    self.physics.add.collider(otherPlayer, worldLayer);
    otherPlayer.playerID = playerInfo.playerID;
    return self.otherPlayers.add(otherPlayer);
}

function preload() {
    this.load.image("tiles", "./assets/tuxmon-sample-32px-extruded.png");
    this.load.tilemapTiledJSON("map", "./assets/tuxemon-town.json");

    // An atlas is a way to pack multiple images together into one texture. I'm using it to load all
    // the player animations (walking left, walking right, etc.) in one image. For more info see:
    //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
    // If you don't use an atlas, you can do the same thing with a spritesheet, see:
    //  https://labs.phaser.io/view.html?src=src/animation/single%20sprite%20sheet.js
    this.load.atlas("atlas", "./assets/atlas/atlas.png", "./assets/atlas.json");
}

function create() {
    const self = this;
    this.socket = io();
    const map = this.make.tilemap({key: "map"});
    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cursors = this.input.keyboard.createCursorKeys();

    this.otherPlayers = this.physics.add.group();

    // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
    // Phaser's cache (i.e. the name you used in preload)
    const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

    // Parameters: layer name (or index) from Tiled, tileset, x, y
    const belowLayer = map.createStaticLayer("Below Player", tileset, 0, 0);
    const worldLayer = map.createStaticLayer("World", tileset, 0, 0);
    const aboveLayer = map.createStaticLayer("Above Player", tileset, 0, 0);

    worldLayer.setCollisionByProperty({collides: true});

    // By default, everything gets depth sorted on the screen in the order we created things. Here, we
    // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
    // Higher depths will sit on top of lower depth objects.
    aboveLayer.setDepth(10);

    // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
    // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"
    const spawnPoint = map.findObject("Objects", obj => obj.name === "Spawn Point");

    // Create a sprite with physics enabled via the physics system. The image used for the sprite has
    // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
    // Watch the player and worldLayer for collisions, for the duration of the scene:
    this.socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (players[id].playerID === self.socket.id) {
                addPlayer(self, players[id], worldLayer);
            } else {
                addOtherPlayer(self, players[id], worldLayer);
            }
        });
    });
    this.socket.on('newPlayer', function (playerInfo) {
        console.log("player new")
        addOtherPlayer(self, playerInfo, worldLayer);
    });
    this.socket.on('disconnect', function (playerId) {
        console.log("player disconect")
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });
    this.socket.on('playerMoved', (playerInfo) => {
        self.otherPlayers.getChildren().forEach((otherPlayer) => {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                otherPlayer.anims.play("misa-front-walk", true);
            }
        });
    });

    // addPlayer(this, {x: spawnPoint.x, y: spawnPoint.y}, worldLayer)
    // console.log(spawnPoint)
    // const playersArr = [{x: spawnPoint.x - 153, y: spawnPoint.y - 32, playerID: 1}, {
    //     x: spawnPoint.x - 103,
    //     y: spawnPoint.y - 132,
    //     playerID: 2
    // }, {x: spawnPoint.x - 13, y: spawnPoint.y - 52, playerID: 3},]
    // playersArr.forEach(playerInfo => addOtherPlayer(self, playerInfo, worldLayer))
    // Create the player's walking animations from the texture atlas. These are stored in the global
    // animation manager so any sprite can access them.

    const anims = this.anims;
    anims.create({
        key: "misa-left-walk",
        frames: anims.generateFrameNames("atlas", {
            prefix: "misa-left-walk.",
            start: 0,
            end: 3,
            zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: "misa-right-walk",
        frames: anims.generateFrameNames("atlas", {
            prefix: "misa-right-walk.",
            start: 0,
            end: 3,
            zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: "misa-front-walk",
        frames: anims.generateFrameNames("atlas", {
            prefix: "misa-front-walk.",
            start: 0,
            end: 3,
            zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: "misa-back-walk",
        frames: anims.generateFrameNames("atlas", {
            prefix: "misa-back-walk.",
            start: 0,
            end: 3,
            zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
    });

}

function update(time, delta) {
    const speed = 175;
    const player = this.player;
    if (player) {
        const x = player.x;
        const y = player.y;
        const r = player.rotation;

        if (player.oldPosition && (x !== player.oldPosition.x ||
            y !== player.oldPosition.y ||
            r !== player.oldPosition.rotation)) {
            // console.log(this.socket,"this.socket")

            this.socket.emit('playerMovement',
                {
                    x: this.player.x,
                    y: this.player.y,
                    rotation: this.player.rotation
                });
        }

        player.oldPosition = {
            x: player.x,
            y: player.y,
            rotation: player.rotation
        };

        const prevVelocity = this.player.body.velocity.clone();
        // Stop any previous movement from the last frame
        player.body.setVelocity(0);

        // Horizontal movement
        if (cursors.left.isDown) {
            player.body.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            player.body.setVelocityX(speed);
        }

        // Vertical movement
        if (cursors.up.isDown) {
            player.body.setVelocityY(-speed);
        } else if (cursors.down.isDown) {
            player.body.setVelocityY(speed);
        }

        // Normalize and scale the velocity so that player can't move faster along a diagonal
        player.body.velocity.normalize().scale(speed);

        // Update the animation last and give left/right animations precedence over up/down animations
        if (cursors.left.isDown) {
            player.anims.play("misa-left-walk", true);
        } else if (cursors.right.isDown) {
            player.anims.play("misa-right-walk", true);
        } else if (cursors.up.isDown) {
            player.anims.play("misa-back-walk", true);
        } else if (cursors.down.isDown) {
            player.anims.play("misa-front-walk", true);
        } else {
            player.anims.stop();

            // If we were moving, pick and idle frame to use
            if (prevVelocity.x < 0) player.setTexture("atlas", "misa-left");
            else if (prevVelocity.x > 0) player.setTexture("atlas", "misa-right");
            else if (prevVelocity.y < 0) player.setTexture("atlas", "misa-back");
            else if (prevVelocity.y > 0) player.setTexture("atlas", "misa-front");
        }
    }

}
