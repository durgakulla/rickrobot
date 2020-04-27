var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};
var PLAYER_LIST = {};
var currChar = 1;


var Player = function(id){
    var self = {
        x:100,
        y:250,
        id:id,
        number:"" + Math.floor(10 * Math.random()),
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        maxSpd:10,
    }
    self.updatePosition = function(){
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
        if(self.pressingUp)
            self.y -= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;
    }
    return self;
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    var player2 = Player(socket.id+1);
    PLAYER_LIST[socket.id] = player;
    PLAYER_LIST[socket.id+1] = player2;

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        delete PLAYER_LIST[socket.id+1];
    });

    socket.on('keyPress',function(data){
        if(data.inputId === 'one'){
            currChar = 1;
            console.log("one");
        }
        else if(data.inputId === 'two'){
            currChar = 2;
            console.log("two");
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
        if(currChar==2){
            if(data.inputId === 'left')
                player2.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player2.pressingRight = data.state;
            else if(data.inputId === 'up')
                player2.pressingUp = data.state;
            else if(data.inputId === 'down')
                player2.pressingDown = data.state;
        }
    });


});

setInterval(function(){
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number,
            id:player.id
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
        console.log(pack);
        console.log(currChar);
    }




},1000/25);
