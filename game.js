class DungeonCrawler extends Phaser.Scene
{
    constructor ()
    {
        super('DungeonCrawler');
        this.player = null;
        this.cursors = null;
        this.walls = null;
        this.path = null;
        this.background = null;
        this.doors = null;
        this.heroSize = 40; // Increased hero size
        this.treasures = null;
        this.score = 0;
        this.scoreText = null;
        this.enemies = null;
        this.wallPositions = [];
        this.winText = null; // New property for win message
        this.loseText = null; // New property for lose message
    }

    preload ()
    {
        this.load.image('hero', 'https://play.rosebud.ai/assets/Basic 2D top-down hero character sprite.png?RrTv');
        this.load.image('floor', 'https://play.rosebud.ai/assets/A seamless sand texture for a desert background.png?SAND_TEXTURE');
        this.load.image('treasure', 'https://play.rosebud.ai/assets/A small, shiny treasure chest with gold coins.png?xwQ0');
        this.load.image('zombie', 'https://play.rosebud.ai/assets/A simple 2D top-down zombie character sprite.png?yZQW');
    }

    create ()
    {
        // Create the background
        this.background = this.add.tileSprite(0, 0, 800, 600, 'floor');
        this.background.setOrigin(0, 0);

        // Create path
        this.path = this.add.graphics();
        this.path.fillStyle(0x4a4a4a, 0.5);
        this.createPath();

        // Create walls (Pac-Man style)
        this.walls = this.physics.add.staticGroup();
        this.createWalls();

        // Create player
        this.player = this.physics.add.sprite(this.heroSize, this.heroSize, 'hero');
        this.player.setDisplaySize(this.heroSize, this.heroSize);

        // Create treasures
        this.treasures = this.physics.add.staticGroup();
        this.createTreasures();

        // Create enemies
        this.enemies = this.physics.add.group();
        this.createEnemies();

        // Set up collision between player and walls
        this.physics.add.collider(this.player, this.walls);

        // Set up collision between enemies and walls
        this.physics.add.collider(this.enemies, this.walls);

        // Set up overlap between player and enemies
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

        // Set up cursor keys for movement
        this.cursors = this.input.keyboard.createCursorKeys();

        // Add score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#FFF' });

        // Add win text (initially hidden)
        this.winText = this.add.text(400, 300, 'You Win!', { fontSize: '64px', fill: '#FFF' });
        this.winText.setOrigin(0.5);
        this.winText.setVisible(false);

        // Add lose text (initially hidden)
        this.loseText = this.add.text(400, 300, 'Game Over!', { fontSize: '64px', fill: '#FF0000' });
        this.loseText.setOrigin(0.5);
        this.loseText.setVisible(false);

        // Add enter key listener for game restart
        this.input.keyboard.on('keydown-ENTER', this.restartGame, this);
    }

    update ()
    {
        if (this.winText.visible || this.loseText.visible) return; // Stop updating if the game is won or lost

        // Player movement
        const speed = 200; // Increased from 100 to 200

        if (this.cursors.left.isDown)
        {
            this.player.setVelocityX(-speed);
        }
        else if (this.cursors.right.isDown)
        {
            this.player.setVelocityX(speed);
        }
        else
        {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown)
        {
            this.player.setVelocityY(-speed);
        }
        else if (this.cursors.down.isDown)
        {
            this.player.setVelocityY(speed);
        }
        else
        {
            this.player.setVelocityY(0);
        }

        // Pac-Man style wrap-around
        this.wrapPlayerAroundWorld();

        // Update enemy movement
        this.enemies.getChildren().forEach(enemy => {
            this.moveEnemyTowardsPlayer(enemy);
        });

        // Check for treasure collection
        this.treasures.getChildren().forEach(treasure => {
            if (!treasure.collected && this.checkOverlap(this.player, treasure)) {
                this.collectTreasure(this.player, treasure);
            }
        });
    }

    createPath()
    {
        // In Pac-Man style, the entire area except for walls is considered a path
        this.path.fillRect(0, 0, 800, 600);
    }

    createWalls()
    {
        const wallColor = 0x0000FF; // Blue color for walls
        const wallSize = 40; // Size of each wall square

        // Function to add a wall
        const addWall = (x, y) => {
            const wall = this.walls.create(x, y, 'wall');
            wall.setDisplaySize(wallSize, wallSize);
            wall.setTint(wallColor);
            this.wallPositions.push({x, y, width: wallSize, height: wallSize});
        };

        // Outer frame
        for (let x = 0; x < 900; x += wallSize) {
            addWall(x, 0);
            addWall(x, 619 - wallSize);
        }
        for (let y = wallSize; y < 900 - wallSize; y += wallSize) {
            addWall(0, y);
            addWall(800 - wallSize, y);
        }

        // Inner walls
        for (let x = wallSize * 2; x < 800 - wallSize * 2; x += wallSize * 3) {
            for (let y = wallSize * 2; y < 600 - wallSize * 2; y += wallSize * 3) {
                addWall(x, y);
            }
        }

        // Refresh the physics body of the static group
        this.walls.refresh();
    }

    wrapPlayerAroundWorld()
    {
        if (this.player.x < 0) {
            this.player.x = 800;
        } else if (this.player.x > 800) {
            this.player.x = 0;
        }

        if (this.player.y < 0) {
            this.player.y = 600;
        } else if (this.player.y > 600) {
            this.player.y = 0;
        }
    }

    createTreasures()
    {
        const treasureCount = 5;
        const padding = this.heroSize;
        const minDistance = 150; // Minimum distance between treasures

        const placedTreasures = [];

        for (let i = 0; i < treasureCount; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 100;

            do {
                x = Phaser.Math.Between(padding, 800 - padding);
                y = Phaser.Math.Between(padding, 600 - padding);
                attempts++;

                if (attempts > maxAttempts) {
                    console.log("Could not place all treasures");
                    return;
                }
            } while (
                this.isOverlappingWall(x, y) ||
                placedTreasures.some(t => 
                    Phaser.Math.Distance.Between(x, y, t.x, t.y) < minDistance
                )
            );

            const treasure = this.treasures.create(x, y, 'treasure');
            treasure.setDisplaySize(this.heroSize, this.heroSize);
            treasure.collected = false;
            placedTreasures.push({x, y});
        }
    }

    isOverlappingWall(x, y)
    {
        return this.wallPositions.some(wall => 
            x + this.heroSize > wall.x &&
            x < wall.x + wall.width &&
            y + this.heroSize > wall.y &&
            y < wall.y + wall.height
        );
    }

    checkOverlap(spriteA, spriteB) {
        const boundsA = spriteA.getBounds();
        const boundsB = spriteB.getBounds();

        return Phaser.Geom.Intersects.RectangleToRectangle(boundsA, boundsB);
    }

    collectTreasure(player, treasure)
    {
        if (!treasure.collected) {
            treasure.collected = true;
            this.score += 10;
            this.scoreText.setText('Score: ' + this.score);
            
            // Change the tint to indicate it's been collected, but keep it visible
            treasure.setTint(0x808080);

            // Check if all treasures are collected
            if (this.treasures.getChildren().every(t => t.collected)) {
                this.winGame();
            }
        }
    }

    winGame()
    {
        this.winText.setVisible(true);
        this.player.setVelocity(0, 0);
        this.enemies.getChildren().forEach(enemy => enemy.setVelocity(0, 0));
    }

    loseGame()
    {
        this.loseText.setVisible(true);
        this.player.setVelocity(0, 0);
        this.enemies.getChildren().forEach(enemy => enemy.setVelocity(0, 0));
    }

    createEnemies()
    {
        for (let i = 0; i < 10; i++) { // Increased from 5 to 10
            let x, y;
            do {
                x = Phaser.Math.Between(50, 750);
                y = Phaser.Math.Between(50, 550);
            } while (this.isOverlappingWall(x, y));

            const enemy = this.physics.add.sprite(x, y, 'zombie');
            enemy.setDisplaySize(this.heroSize, this.heroSize); // Increased size
            this.enemies.add(enemy);
        }
    }

    moveEnemyTowardsPlayer(enemy)
    {
        const speed = 120; // Increased from 60 to 120
        const direction = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y);
        direction.normalize();
        enemy.setVelocity(direction.x * speed, direction.y * speed);
    }

    hitEnemy(player, enemy)
    {
        this.score -= 5;
        this.scoreText.setText('Score: ' + this.score);

        // Check if score is -50 or lower
        if (this.score <= -50) {
            this.loseGame();
            return;
        }

        // Reset player position
        player.setPosition(this.heroSize, this.heroSize);

        // Reset enemy position
        let x, y;
        do {
            x = Phaser.Math.Between(50, 750);
            y = Phaser.Math.Between(50, 550);
        } while (this.isOverlappingWall(x, y));
        enemy.setPosition(x, y);
    }

    restartGame()
    {
        // Reset score
        this.score = 0;
        this.scoreText.setText('Score: 0');

        // Hide win/lose text
        this.winText.setVisible(false);
        this.loseText.setVisible(false);

        // Reset player position
        this.player.setPosition(this.heroSize, this.heroSize);
        this.player.setVelocity(0, 0);

        // Reset treasures
        this.treasures.clear(true, true);
        this.createTreasures();

        // Reset enemies
        this.enemies.clear(true, true);
        this.createEnemies();
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'renderDiv',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: DungeonCrawler
};

window.phaserGame = new Phaser.Game(config);