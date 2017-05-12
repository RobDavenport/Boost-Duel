var Client = {};
Client.socket = io.connect();

Client.askNewPlayer = function () {
  Client.socket.emit('newplayer');
};

Client.onRightDown = function () {
  Client.socket.emit('onRightDown');
}

Client.onRightUp = function () {
  Client.socket.emit('onRightUp');
}

Client.onLeftDown = function () {
  Client.socket.emit('onLeftDown');
}

Client.onLeftUp = function () {
  Client.socket.emit('onLeftUp');
}

Client.onUpDown = function () {
  Client.socket.emit('onUpDown');
}

Client.onUpUp = function () {
  Client.socket.emit('onUpUp');
}

Client.onDownDown = function () {
  Client.socket.emit('onDownDown');
}

Client.onDownUp = function () {
  Client.socket.emit('onDownUp');
}

Client.onShootDown = function () {
  Client.socket.emit('onShootDown');
}

Client.onBoostDown = function() {
  Client.socket.emit('onBoostDown');
}

Client.onBoostUp = function() {
  Client.socket.emit('onBoostUp');
}

Client.onMeleeDown = function() {
  Client.socket.emit('onMeleeDown');
}

Client.socket.on('newplayer', function (data) {
  game.addNewPlayer(data.id, data.xPos, data.yPos);
});

Client.socket.on('allplayers', function (data) {
  for (var i = 0; i < data.length; i++) {
    game.addNewPlayer(data[i].id, data[i].xPos, data[i].yPos);
  }
});

Client.socket.on('remove', function (id) {
  game.removePlayer(id);
});

Client.socket.on('updatePlayers', function (data) {
  for (var i = 0; i < data.length; i++) {
    game.updatePlayer(data[i])
  }
});

Client.socket.on('spawnLaser', function (data) {
  game.spawnLaser(data)
});

Client.socket.on('updateLasers', function (data) {
  for (var i = 0; i < data.length; i++) {
    game.updateLaser(data[i].id, data[i].xPos, data[i].invalid)
  }
});

Client.socket.on('onHit', function (laserID, playerID, newX, newY) {
  game.onHit(laserID, playerID, newX, newY)
})