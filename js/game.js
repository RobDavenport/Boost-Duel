var phaserEngine = new Phaser.Game(1280, 720, Phaser.AUTO, document.getElementById('game'));
var game = {};

var keyRight;
var keyLeft;
var keyUp;
var keyDown;
var keySpace;

game.init = function(){
};      

game.preload = function() {
  phaserEngine.load.image('player','assets/alienGreen.png'); // this will be the sprite of the active player
  phaserEngine.load.image('otherPlayer','assets/alienPink.png'); // this will be the sprite of the other player
  phaserEngine.load.image('playerBeam','assets/laserGreen3.png');
  phaserEngine.load.image('enemyBeam','assets/laserPink3.png');
};

function onRightDown() {
  Client.onRightDown();
}

function onRightUp() {
  Client.onRightUp();
}

function onLeftDown() {
  Client.onLeftDown();
}

function onLeftUp() {
  Client.onLeftUp();
}

function onUpDown() {
  Client.onUpDown();
}

function onUpUp() {
  Client.onUpUp();
}

function onDownDown() {
  Client.onDownDown();
}

function onDownUp() {
  Client.onDownUp();
}

function onSpaceDown() {
  Client.onSpaceDown();
}

game.create = function(){
  game.playerMap = {};
  game.lasers = {};

  keyRight = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.RIGHT)
  keyRight.onDown.add(onRightDown, this);
  keyRight.onUp.add(onRightUp, this);

  keyLeft = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.LEFT)
  keyLeft.onDown.add(onLeftDown, this);
  keyLeft.onUp.add(onLeftUp, this);

  keyUp = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.UP)
  keyUp.onDown.add(onUpDown, this);
  keyUp.onUp.add(onUpUp, this);

  keyDown = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.DOWN)
  keyDown.onDown.add(onDownDown, this);
  keyDown.onUp.add(onDownUp, this);

  keySpace = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
  keySpace.onDown.add(onSpaceDown, this);

  Client.askNewPlayer();
};

game.addNewPlayer = function(id,x,y){
  var sprite = phaserEngine.add.sprite(x,y,'player');
  sprite.anchor.setTo(0.5);
  game.playerMap[id] = sprite;
};

game.removePlayer = function(id){
  game.playerMap[id].destroy();
  delete game.playerMap[id];
}

game.updatePlayer = function(id,x,y) {
  if (!game.playerMap[id])
    return;

  game.playerMap[id].position.x = x;
  game.playerMap[id].position.y = y;
}

game.spawnLaser = function(data) {
  var sprite = phaserEngine.add.sprite(data.xPos, data.yPos, 'playerBeam');
  sprite.anchor.setTo(0.5);
  game.lasers[data.id] = sprite;

}

game.updateLaser = function(id,x,invalid) {
  if (!game.lasers[id])
    return;

  if (invalid) {
    console.log("delete laser")
    game.lasers[id].destroy();
    delete game.lasers[id];
    return;
  }

  game.lasers[id].position.x = x
}

game.onHit = function(laserID, playerID, newX, newY) {
  game.lasers[laserID].destroy();
  delete game.lasers[laserID];

  game.playerMap[playerID].position.x = newX;
  game.playerMap[playerID].position.y = newY;
}

phaserEngine.state.add('game', game);
phaserEngine.state.start('game');

