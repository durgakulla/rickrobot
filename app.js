var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.set('view engine', 'ejs');

//this variable holds all of the games with keys
//1. [roomid].      - mirrors the url of the game
//each game has keys:
//1. socket_list    - players in the room
//2. level          - level currently in play
//3. piecePositions - locations of each piece

var games = {}

//use https
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

//if user visits main page, do the following
app.get('/', function(req, res) {
    res.render('pages/login.ejs');
    //********************************
    //TODO: have one input box on this page
    //on submission, enter that room if it exists,
    //or create that room!
    //********************************
});

//if user visits room url, do the following
app.get('/:channel', function(req, res) {
    //log that a player visited a room
    console.log('user visited /' + req.params.channel);
    //
    res.render('pages/game.ejs');
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 2000;
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
    delete Player.list[socket.id+1];
    delete Player.list[socket.id+2];
    delete Player.list[socket.id+3];
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

var displaynames = {};

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    Player.onConnect(socket);

    socket.on('disconnect',function(){
        var lastpack = {
            player:Player.update()
        }
        posToReset = [];
        for(i in lastpack.player){
            if(lastpack.player[i].id == socket.id)
                level[lastpack.player[i].rowpos][lastpack.player[i].colpos] = 0;
            else if(lastpack.player[i].id == socket.id + 1)
                level[lastpack.player[i].rowpos][lastpack.player[i].colpos] = 0;
            else if(lastpack.player[i].id == socket.id + 2)
                level[lastpack.player[i].rowpos][lastpack.player[i].colpos] = 0;
            else if(lastpack.player[i].id == socket.id + 3)
                level[lastpack.player[i].rowpos][lastpack.player[i].colpos] = 0;
        }
        delete SOCKET_LIST[socket.id];
        delete Player.list[socket.id];
        delete displaynames[socket.id];
        delete Player.list[socket.id+1];
        delete Player.list[socket.id+2];
        delete Player.list[socket.id+3];
        Player.onDisconnect(socket);
    });
    socket.on('sendDisplaynameToServer',function(data){
        displaynames[socket.id] = data[0];
        var pack = {
            displayname: data[0],
            roomid: data[1],
            socketid: socket.id,
        }
        socket.emit('newPlayerJoined',pack);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',pack.displayname + ' is joining the chat...');
        }
    });
    socket.on('sendMsgToServer',function(data){
        var playerName = (displaynames[socket.id]);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
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
},1000/80);
