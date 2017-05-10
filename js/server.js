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
var maxMoveSpeed = 6;
var moveAcceleration = 0.5;
var jumpPower = 15;
var friction = 0.90;

var laserSpeed = 10;
var laserRadius = 64;

var playerRadius = 33;

server.lastLaserID = 0;
server.lasers = [];

io.on('connection', function (socket) {
  console.log("incoming connection")
  socket.on('newplayer', function () {
    var id = server.lastPlayerID++
    socket.player = {
      id: id,
      xPos: randomInt(100, 900),
      yPos: randomInt(100, 500),
      xVel: 0,
      yVel: 0,
      xAccel: 0,
      canFire: true
    };

    socket.broadcast.emit('newplayer', socket.player);
    socket.emit('allplayers', getAllPlayers());

    socket.on('disconnect',function(){
      io.emit('remove',socket.player.id);
    })

    socket.on('onSpaceDown', function() {
      if (socket.player.canFire == false)
      { 
        return
      }

      var theLaser = {
        id: server.lastLaserID++,
        ownerId: socket.player.id,
        xPos: socket.player.xPos,
        yPos: socket.player.yPos,
        xVel: calculateLaserSpeed(socket.player)
      }
      socket.player.canFire = false;
      server.lasers.push(theLaser)
      io.sockets.emit('spawnLaser', theLaser);
    })

    socket.on('onRightDown', function() {
      socket.player.xAccel += 1;
    })

    socket.on('onRightUp', function() {
      socket.player.xAccel -= 1;
    })

    socket.on('onLeftDown', function() {
      socket.player.xAccel += -1;
    })

    socket.on('onLeftUp', function() {
      socket.player.xAccel -= -1;
    })

    socket.on('onUpDown', function() {
      if (socket.player.yPos >= groundLevel) {
        socket.player.yVel -= jumpPower;
      }
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

function clampMovespeed(speed) {
  if (speed > maxMoveSpeed)
    return maxMoveSpeed;
  else if (speed < -maxMoveSpeed)
    return -maxMoveSpeed;
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
  players.forEach( p => {
    if (p.xAccel)
      p.xVel += p.xAccel * moveAcceleration;
    else
      p.xVel *= friction;

    p.xVel = clampMovespeed(p.xVel)
    p.yVel += gravity;
    p.xPos += p.xVel
    p.yPos += p.yVel

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
    }


  })

  server.lasers.forEach( l => {
    l.xPos += l.xVel;

    players.forEach( p => {
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
      players[l.ownerId].canFire = true;
    }
  })

  io.emit('updatePlayers', players);
  io.emit('updateLasers', server.lasers)

  var newLasers = [];

  server.lasers.forEach( l => {
    if (!l.invalid) {
      newLasers.push(l)
    }
  })

  server.lasers = newLasers;
}

setInterval(update, 17)