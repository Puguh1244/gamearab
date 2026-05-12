// PHASER CONFIG
// =============================================
let phaserGame = null;
let gameScene = null;

function initPhaser() {
  if (typeof Phaser === 'undefined') {
    throw new Error('Phaser library belum termuat');
  }
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 'transparent',
    transparent: true,
    parent: 'game-canvas-wrapper',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  phaserGame = new Phaser.Game(config);
  phaserGame.events.on('ready', () => {
    gameScene = phaserGame.scene.getScene('GameScene');
  });
}

// =============================================
