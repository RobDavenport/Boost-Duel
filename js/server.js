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
var laserRadius = 64;

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

var playerShootAnimFrames = 36;
var playerShootSpawnFrame = 18;
var playerMaxShootMoveSpeed = 2;
var playerShootGravity = gravity / 6;

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
      getGravity: true, //should be affected by gravity or not
      state: 'idle',
      animLock: 0,
      ground: false,
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
      if (!socket.player.animLock) {
        if (socket.player.state == 'idle' || socket.player.state == 'jump' || socket.player.state == 'dash') {
          socket.player.state = 'idle';
          socket.player.getGravity = true;
        }
      }
    })

    socket.on('onMeleeDown', function () {
      //TODO
    })

    socket.on('onRightDown', function () {
      socket.player.xAccel += 1;
    })

    socket.on('onRightUp', function () {
      socket.player.xAccel -= 1;
    })

    socket.on('onLeftDown', function () {
      socket.player.xAccel += -1;
    })

    socket.on('onLeftUp', function () {
      socket.player.xAccel -= -1;
    })

    socket.on('onUpDown', function () {
      //TODO
    })

    socket.on('onUpUp', function () {
      //TODO
    })

    socket.on('onDownDown', function () {
      //TODO
    })

    socket.on('onDownUp', function () {
      //TODO
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

    updatePosition(p);

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

//Update the player positions
function updatePosition(p) {
  //Update X Positions

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

  //Collision Horizontal Check vs edges
  if (p.xPos + playerRadius >= 1280) {
    p.xPos = 1280 - playerRadius;
    p.xVel = 0;
  }
  else if (p.xPos - playerRadius <= 0) {
    p.xPos = playerRadius
    p.xVel = 0;
  }

  //Handle Vertical Movement
  p.yPos += p.yVel

  if (p.getGravity) //Only if they should receive gravity
    p.yVel += gravity;

  if (p.yPos >= groundLevel) {
    p.yPos = groundLevel;
    p.yVel = 0;
    p.ground = true;
    if (p.animLock == 0)
      p.state = 'idle';
  }
}

//Handle updates in "idle"
function updateIdle(p) {

}

//Handle updates in "jump"
function updateJump(p) {
  p.yVel -= playerJumpSpeed;
  p.yVel = clampMovespeed(p.yVel, playerMaxMoveSpeed);

  p.energy -= playerJumpHoldCost;

  if (p.energy <= 0) {
    p.state = 'idle';
    p.getGravity = true;
  }
}

//Handle updates in "dash"
function updateDash(p) {

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
}


setInterval(update, 17);
