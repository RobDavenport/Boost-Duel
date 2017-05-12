var path = require('path');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use('/css', express.static(path.resolve('../css')));
app.use('/js', express.static(path.resolve('../js')));
app.use('/assets', express.static(path.resolve('../assets')));

app.get('/', function (req, res) {
  res.sendFile(path.resolve('../index.html'));
});

server.listen(8081, function () { // Listens to port 8081
  console.log('Listening on ' + server.address().port);
});

server.lastPlayerID = 0;
var groundLevel = 650;
var gravity = 0.35;

var friction = 0.90;

var laserSpeed = 10;
var laserRadius = 32;

var playerRadius = 33;
var playerHP = 3;
var playerInitialJumpPower = 6;
var playerJumpSpeed = 0.25;
var playerMaxMoveSpeed = 6;
var playerMoveAcceleration = 0.5;
var playerAirMoveAcceleration = 0.1;

var playerMaxEnergy = 100;
var playerEnergyRefilRate = 4;
var playerJumpHoldCost = 1;
var playerDashHoldCost = 1;

var playerMaxAmmo = 400;
var playerShotCost = 100;
var playerReloadRate = 1;

var playerShootAnimFrames = 42;
var playerShootSpawnFrame = 24;
var playerMaxShootMoveSpeed = 2;
var playerShootGravity = gravity / 6;

var playerDashAnimLockFrames = 12;
var playerDashSpeed = 8;
var playerDashMaxSpeed = 8.5;
var playerDashNormalizeSpeed = (playerDashSpeed / Math.SQRT2);
var playerDashInitialCost = 15;
var playerDashAirMoveAcceleration = 0.1;
var playerDashAirMoveNormalizeAcceleration = (playerDashAirMoveAcceleration / Math.SQRT2);

server.lastLaserID = 0;
server.lasers = [];

// Player states: idle, jump, dash, shoot, melee

io.on('connection', function (socket) {
  console.log("incoming connection")
  socket.on('newplayer', function () {
    var id = server.lastPlayerID++
    socket.player = {
      id: id,
      hp: playerHP,
      energy: playerMaxEnergy,
      ammo: playerMaxAmmo,
      xPos: randomInt(100, 900),
      yPos: randomInt(300, 500),
      xVel: 0,
      yVel: 0,
      xAccel: 0,
      yAccel: 0,
      xAxis: 0,
      yAxis: 0,
      getGravity: true, //should be affected by gravity or not
      state: 'idle',
      animLock: 0,
      ground: false,
      holdBoost: false
    };

    socket.broadcast.emit('newplayer', socket.player);
    socket.emit('allplayers', getAllPlayers());

    socket.on('disconnect', function () {
      io.emit('remove', socket.player.id);
    })

    socket.on('onShootDown', function () {
      if (socket.player.ammo < playerShotCost || 
          socket.player.animLock != 0 ||
          socket.player.state == 'melee' || 
          socket.player.state == 'shoot') {
        return;
      }

      socket.player.getGravity = false;
      socket.player.state = 'shoot';
      socket.player.animLock = playerShootAnimFrames;
      socket.player.xVel = clampMovespeed(socket.player.xVel, playerMaxShootMoveSpeed);
      socket.player.yVel = clampMovespeed(socket.player.yVel, playerMaxShootMoveSpeed);
    })

    socket.on('onBoostDown', function () {
      socket.player.holdBoost = true;
      if (socket.player.animLock == 0) {
        if (socket.player.state == 'idle') {
          socket.player.state = 'jump';
          socket.player.getGravity = false;

          if (socket.player.ground == true) {
            socket.player.yVel = -playerInitialJumpPower;
            socket.player.ground = false;
          }
        }
      }
    })

    socket.on('onBoostUp', function () {
      socket.player.holdBoost = false;
      if (socket.player.animLock == 0) {
        if (socket.player.state == 'idle' || socket.player.state == 'jump') {
          socket.player.state = 'idle';
          socket.player.getGravity = true;
        }
      }
    })

    socket.on('onDash', function() {
      if (socket.player.energy >= playerDashInitialCost) {
        socket.player.holdBoost = true;
        socket.player.state = 'dash';
        socket.player.getGravity = false;
        socket.player.animLock = playerDashAnimLockFrames;
        socket.player.energy -= playerDashInitialCost;

        if (socket.player.xAxis == 0 && socket.player.yAxis == 0) {
          socket.player.yVel = -playerDashSpeed;
        }
        else 
        if (socket.player.xAxis == 0 || socket.player.yAxis == 0) {
          socket.player.xVel = socket.player.xAxis * playerDashSpeed;
          socket.player.yVel = socket.player.yAxis * -playerDashSpeed;
        } else {
          socket.player.xVel = socket.player.xAxis * playerDashNormalizeSpeed;
          socket.player.yVel = socket.player.yAxis * -playerDashNormalizeSpeed;
        }
      }
    })

    socket.on('onMeleeDown', function () {
      //TODO
    })

    socket.on('onRightDown', function () {
      socket.player.xAxis += 1;
    })

    socket.on('onRightUp', function () {
      socket.player.xAxis -= 1;
    })

    socket.on('onLeftDown', function () {
      socket.player.xAxis += -1;
    })

    socket.on('onLeftUp', function () {
      socket.player.xAxis -= -1;
    })

    socket.on('onUpDown', function () {
      socket.player.yAxis += 1;
    })

    socket.on('onUpUp', function () {
      socket.player.yAxis -= 1;
    })

    socket.on('onDownDown', function () {
      socket.player.yAxis += -1;
    })

    socket.on('onDownUp', function () {
      socket.player.yAxis -= -1;
    })
  });
});

function getAllPlayers() {
  var players = [];
  Object.keys(io.sockets.connected).forEach(function (socketID) {
    var player = io.sockets.connected[socketID].player;
    if (player) players.push(player);
  });
  return players;
}

function randomInt(low, high) {
  return Math.floor(Math.random() * (high - low) + low);
}

function clampMovespeed(speed, max) {
  if (speed > max)
    return max;
  else if (speed < -max)
    return -max;
  else
    return speed;
}

function calculateLaserSpeed(player) {
  if (player.xAccel > 0)
    return laserSpeed
  else if (player.xAccel < 0)
    return -laserSpeed
  else if (player.xVel > 0)
    return laserSpeed
  else
    return -laserSpeed
}

function update() {
  var players = getAllPlayers()
  players.forEach(p => {

    if (p.ground == true) { //only recharge on the ground
      p.energy += playerEnergyRefilRate;
    }

    p.ammo += playerReloadRate;
    p.ammo = Math.min(p.ammo, playerMaxAmmo)

    if (p.state == 'idle') 
      updateIdle(p);
    else if (p.state == 'jump')
      updateJump(p);
    else if (p.state == 'dash')
      updateDash(p);
    else if (p.state == 'shoot')
      updateShoot(p);

    checkGroundCollision(p);

    if (p.energy <= 0 && p.animLock == 0) {
      p.state = 'idle';
      p.getGravity = true;
    }

    p.energy = Math.min(p.energy, playerMaxEnergy)

    //Update all lasers
    server.lasers.forEach(l => {
      l.xPos += l.xVel;

      //Collision check vs players
      players.forEach(p => {
        if (l.xPos + laserRadius + playerRadius > p.xPos
          && l.xPos < p.xPos + laserRadius + playerRadius
          && l.yPos + laserRadius + playerRadius > p.yPos
          && l.yPos < p.yPos + laserRadius + playerRadius
          && l.ownerId != p.id) { //A hit occured
          l.invalid = true
          players[l.ownerId].canFire = true;
          var newX = randomInt(100, 900)
          var newY = randomInt(100, 500)
          p.xPos = newX;
          p.yPos = newY;
          io.emit('onHit', l.id, p.id, newX, newY)
        }
      })

      if (l.xPos > 1300 || l.xPos < -20) {
        l.invalid = true
      }
    })

    io.emit('updatePlayers', players);
    io.emit('updateLasers', server.lasers)

    //Cleanup
    var newLasers = [];

    server.lasers.forEach(l => {
      if (!l.invalid) {
        newLasers.push(l)
      }
    })

    server.lasers = newLasers;
  })
}

function checkGroundCollision(p) {
  //Collision Horizontal Check vs edges
  if (p.xPos + playerRadius >= 1280) {
    p.xPos = 1280 - playerRadius;
    p.xVel = 0;
  }
  else if (p.xPos - playerRadius <= 0) {
    p.xPos = playerRadius
    p.xVel = 0;
  }

  if (p.yPos >= groundLevel) {
    p.yPos = groundLevel;
    p.yVel = 0;
    p.ground = true;
    if (p.animLock == 0)
      p.state = 'idle';
  }
}

//Update the player positions
function updatePosition(p) {
  //Update X Positions
  p.xAccel = p.xAxis;

  var accel = 0;

  if (p.ground)
    accel = playerMoveAcceleration;
  else
    accel = playerAirMoveAcceleration;

  if (p.xAccel)
    p.xVel += p.xAccel * accel;
  else
    p.xVel *= friction;

  p.xVel = clampMovespeed(p.xVel, playerMaxMoveSpeed)
  p.xPos += p.xVel

  //Handle Vertical Movement
  p.yPos += p.yVel
  
  if (p.getGravity) //Only if they should receive gravity
    p.yVel += gravity;
}

//Handle updates in "idle"
function updateIdle(p) {
  updatePosition(p);
}

//Handle updates in "jump"
function updateJump(p) {
  p.yVel -= playerJumpSpeed;
  p.yVel = clampMovespeed(p.yVel, playerMaxMoveSpeed);

  p.energy -= playerJumpHoldCost;

  updatePosition(p);
}

//Handle updates in "dash"
function updateDash(p) {
  if (p.animLock > 0)
    p.animLock -= 1;
  
  if (p.holdBoost) {
    p.energy -= playerDashHoldCost;
    if (p.xAxis == 0 || p.yAxis == 0) {
      p.xAccel = p.xAxis * playerDashAirMoveAcceleration;
      p.yAccel = p.yAxis * -playerDashAirMoveAcceleration;
    } else {
      p.xAccel = p.xAxis * playerDashAirMoveNormalizeAcceleration;
      p.yAccel = p.yAxis * -playerDashAirMoveNormalizeAcceleration;
    }
    p.xVel += p.xAccel;
    p.yVel += p.yAccel;

    p.xVel = clampMovespeed(p.xVel, playerDashMaxSpeed);
    p.yVel = clampMovespeed(p.yVel, playerDashMaxSpeed);

  } else if (p.holdBoost == false && p.animLock == 0) {
    p.state = 'idle';
    p.getGravity = true;
  }
    p.xPos += p.xVel;
    p.yPos += p.yVel;
}

function updateShoot(p) {
  p.animLock -= 1;

  if (p.animLock == playerShootSpawnFrame) {
    var theLaser = {
      id: server.lastLaserID++,
      ownerId: p.id,
      xPos: p.xPos,
      yPos: p.yPos,
      xVel: calculateLaserSpeed(p)
    }
    p.ammo -= playerShotCost;
    server.lasers.push(theLaser)
    io.sockets.emit('spawnLaser', theLaser);
  }

  p.yVel += playerShootGravity;

  if (p.animLock == 0) {
    p.state = 'idle';
    p.getGravity = true;
  }

  updatePosition(p);
}

setInterval(update, 17);
