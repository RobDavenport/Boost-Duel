var phaserEngine = new Phaser.Game(1280, 720, Phaser.AUTO, document.getElementById('game'));
var game = {};

var keyRight;
var keyLeft;
var keyUp;
var keyDown;
var keyBoost;
var keyMelee;
var keyShoot;

var dashTiming = 200; //in miliseconds
var textOffset = 30;

var style = { font: "11px Arial", fill: "#ffffff", align: "center"};

game.init = function () {
};

game.preload = function () {
  phaserEngine.load.image('player', 'assets/alienGreen.png'); // this will be the sprite of the active player
  phaserEngine.load.image('otherPlayer', 'assets/alienPink.png'); // this will be the sprite of the other player
  phaserEngine.load.image('playerBeam', 'assets/laserGreen3.png');
  phaserEngine.load.image('enemyBeam', 'assets/laserPink3.png');

  phaserEngine.load.audio('jump', 'assets/jump.wav');
  phaserEngine.load.audio('shoot', 'assets/shot.wav');
  phaserEngine.load.audio('dash', 'assets/dash.wav');
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

function onBoostDown() {
  currentBoost = new Date().getTime();

  if ((currentBoost - lastBoost) <= dashTiming)
    Client.onDash();
  else
    Client.onBoostDown();
  
  lastBoost = currentBoost;
}

function onBoostUp() {
  Client.onBoostUp();
}

function onMeleeDown() {
  Client.onMeleeDown();
}

function onShootDown() {
  Client.onShootDown();
}

game.create = function () {
  game.playerMap = {};
  game.uiEnergy = {};
  game.uiAmmo = {};
  game.lasers = {};

  lastBoost = new Date().getTime();

  jumpSound = phaserEngine.add.audio('jump');
  shootSound = phaserEngine.add.audio('shoot');
  dashSound = phaserEngine.add.audio('dash');

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

  keyShoot = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.C)
  keyShoot.onDown.add(onShootDown, this);

  keyMelee = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.X)
  keyMelee.onDown.add(onMeleeDown, this);

  keyBoost = phaserEngine.input.keyboard.addKey(Phaser.Keyboard.Z)
  keyBoost.onDown.add(onBoostDown, this);
  keyBoost.onUp.add(onBoostUp, this);

  Client.askNewPlayer();
};

game.addNewPlayer = function (id, x, y) {
  var sprite = phaserEngine.add.sprite(x, y, 'player');
  var energyText = phaserEngine.add.text(x, y + textOffset, '', style);
  var ammoText = phaserEngine.add.text(x, y - textOffset, '', style)

  sprite.anchor.setTo(0.5);
  energyText.anchor.setTo(0.5);
  ammoText.anchor.setTo(0.5);

  game.playerMap[id] = sprite;
  game.uiEnergy[id] = energyText;
  game.uiAmmo[id] = ammoText;
};

game.removePlayer = function (id) {
  game.playerMap[id].destroy();
  delete game.playerMap[id];

  game.uiEnergy[id].destroy();
  delete game.uiEnergy[id];

  game.uiAmmo[id].destroy();
  delete game.uiAmmo[id];
}

game.updatePlayer = function (playerData) {
  if (!game.playerMap || !game.playerMap[playerData.id])
    return;

  var p = game.playerMap[playerData.id];

  //We are jumping
  if (p.state == 'idle' && p.ground == true && 
      playerData.state == 'jump' && playerData.ground == false) {
      jumpSound.play();
  }

  //We started shooting
  if (playerData.state == 'shoot' && p.state != 'shoot') {
    shootSound.play();
  }

  //We started dashing
  if (playerData.state == 'dash' && p.state != 'dash') {
    dashSound.play();
  }

  p.position.x = playerData.xPos;
  p.position.y = playerData.yPos;
  p.state = playerData.state;
  p.ground = playerData.ground;

  game.uiEnergy[playerData.id].text = playerData.energy;
  game.uiEnergy[playerData.id].position.x = playerData.xPos;
  game.uiEnergy[playerData.id].position.y = playerData.yPos + textOffset;

  game.uiAmmo[playerData.id].text = playerData.ammo;
  game.uiAmmo[playerData.id].position.x = playerData.xPos;
  game.uiAmmo[playerData.id].position.y = playerData.yPos - textOffset;
}

game.spawnLaser = function (data) {
  var sprite = phaserEngine.add.sprite(data.xPos, data.yPos, 'playerBeam');
  sprite.anchor.setTo(0.5);
  game.lasers[data.id] = sprite;
}

game.updateLaser = function (id, x, invalid) {
  if (!game.lasers[id])
    return;

  if (invalid) {
    game.lasers[id].destroy();
    delete game.lasers[id];
    return;
  }

  game.lasers[id].position.x = x
}

game.onHit = function (laserID, playerID, newX, newY) {
  game.lasers[laserID].destroy();
  delete game.lasers[laserID];

  game.playerMap[playerID].position.x = newX;
  game.playerMap[playerID].position.y = newY;
}

phaserEngine.state.add('game', game);
phaserEngine.state.start('game');
