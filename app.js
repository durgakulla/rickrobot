var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
serv.listen(port);
console.log("Server started.");

var SOCKET_LIST = {};
var currChar = 1;
var currPos = {};
var level = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

var Entity = function(){
    var self = {
        colpos:4,
        rowpos:2,
        spdX:0,
        spdY:0,
        id:0,
        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false,
        moving: false,
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.colpos += self.spdX;
        self.rowpos += self.spdY;
        if(self.spdX == 1)
            level[self.rowpos][self.colpos-1] = 0;
        else if(self.spdX == -1)
            level[self.rowpos][self.colpos+1] = 0;
        else if(self.spdY == 1)
            level[self.rowpos-1][self.colpos] = 0;
        else if(self.spdY == -1)
            level[self.rowpos+1][self.colpos] = 0;
    }
    self.updateSpd = function(){
        if(self.pressingRight && self.moving == false){
            self.spdX = 1;
            self.moving = true;
        }
        if(self.spdX == 1 && level[self.rowpos][self.colpos + 1] == 1){
            self.spdX = 0;
            self.moving = false;
        }
        if(self.spdX == 1 && level[self.rowpos][self.colpos + 1] == 2){
            self.spdX = 0;
            self.moving = false;
        }
        if(self.pressingLeft && self.moving == false){
            self.spdX = -1;
            self.moving = true;
        }
        if(self.spdX == -1 && level[self.rowpos][self.colpos - 1] == 1){
            self.spdX = 0;
            self.moving = false;
        }
        if(self.spdX == -1 && level[self.rowpos][self.colpos - 1] == 2){
            self.spdX = 0;
            self.moving = false;
        }
        if(self.pressingUp && self.moving == false){
            self.spdY = -1;
            self.moving = true;
        }
        if(self.spdY == -1 && level[self.rowpos - 1][self.colpos] == 1){
            self.spdY = 0;
            self.moving = false;
        }
        if(self.spdY == -1 && level[self.rowpos - 1][self.colpos] == 2){
            self.spdY = 0;
            self.moving = false;
        }
        if(self.pressingDown && self.moving == false){
            self.spdY = 1;
            self.moving = true;
        }
        if(self.spdY == 1 && level[self.rowpos + 1][self.colpos] == 1){
                self.spdY = 0;
                self.moving = false;
        }
        if(self.spdY == 1 && level[self.rowpos + 1][self.colpos] == 2){
                self.spdY = 0;
                self.moving = false;
        }
    }
    return self;
}

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random());
    var super_update = self.update;
    self.update = function(){
        level[self.rowpos][self.colpos] = 2;
        self.updateSpd();
        super_update();
    }

    Player.list[id] = self;
    return self;
}

Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);
    var player2 = Player(socket.id+1);
    var player3 = Player(socket.id+2);
    var player4 = Player(socket.id+3);
    socket.on('keyPress',function(data){
        if(data.inputId === 'one'){
            currChar = 1;
        }
        else if(data.inputId === 'two'){
            currChar = 2;
        }
        else if(data.inputId === 'three'){
            currChar = 3;
        }
        else if(data.inputId === 'four'){
            currChar = 4;
        }

        if(currChar==1){
            if(data.inputId === 'left')
                player.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player.pressingRight = data.state;
            else if(data.inputId === 'up')
                player.pressingUp = data.state;
            else if(data.inputId === 'down')
                player.pressingDown = data.state;
        }
        else if(currChar==2){
            if(data.inputId === 'left')
                player2.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player2.pressingRight = data.state;
            else if(data.inputId === 'up')
                player2.pressingUp = data.state;
            else if(data.inputId === 'down')
                player2.pressingDown = data.state;
        }
        else if(currChar==3){
            if(data.inputId === 'left')
                player3.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player3.pressingRight = data.state;
            else if(data.inputId === 'up')
                player3.pressingUp = data.state;
            else if(data.inputId === 'down')
                player3.pressingDown = data.state;
        }
        else if(currChar==4){
            if(data.inputId === 'left')
                player4.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player4.pressingRight = data.state;
            else if(data.inputId === 'up')
                player4.pressingUp = data.state;
            else if(data.inputId === 'down')
                player4.pressingDown = data.state;
        }
    });
}
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            colpos:player.colpos,
            rowpos:player.rowpos,
            number:player.number,
            id:player.id
        });
    }
    return pack;
}


var DEBUG = true;

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
    socket.on('sendMsgToServer',function(data){
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });

    socket.on('evalServer',function(data){
        if(!DEBUG)
            return;
        var res = eval(data);
        socket.emit('evalAnswer',res);
    });



});

setInterval(function(){
    var pack = {
        player:Player.update(),
        level:level,
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);
