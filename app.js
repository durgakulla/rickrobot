/*
What the game does right now:
- User goes to website, sees landing page asking for roomID input
- They can type in a friend's room, or their own ID to create that room
- They are redirected to the game url, which can be shared with friends
- They are asked for a display name
- They can chat only with others in their room

Things to work on:

- Everyone sees the same game, send from the games object only the room's object to work with that data
- The game is all wrong
    - Everyone should be able to control the only four pieces, not get four pieces each
    - Fix laggy movement code, or maybe just use instantaneous movement (easier to process in mind when board has a lot of walls)
- Random board generation, along with piece start location randomizer button
- Add buttons so users can grab control, and show that in the chat
- Add mobile friendly buttons for movement, and get rid of chat on mobile (probably)

*/


//use express and ejs
var express = require('express');
var app = express();
var serv = require('http').Server(app);
app.set('view engine', 'ejs');

//if the port isn't specified, run it on port 2000
let port = process.env.PORT;
if (port == null || port == "") {
  port = 2000;
}
serv.listen(port);
console.log("Server started.");

//this object holds all of the games with keys
//1. [roomid]       - mirrors the url of the game
//each game has keys:
//1. socketsInGame    - users in the room
//2. board          - level currently in play
//3. startingPositions - starting location for all pieces
//4. piecePositions - current location for all pieces

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
    //display the login page. User will input a roomid and go to that page.
    res.render('pages/login.ejs');
});

//if user visits room url (either from main page or a friend's link), do the following
app.get('/id-:channel', function(req, res) {
    roomid = req.params.channel;
    //display the game page
    res.render('pages/game.ejs');
});

//if the game doesn't already exist, start it. Run whenever a user visits a valid room url
function createNewGame(roomid){
    //TODO: add function to randomly generate a board the board randomly generated
    board = [
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
    //TODO:add function to randomly pick the starting positions
    startingPositions = {
        red: [2,1],
        green: [7,7],
        blue: [12,7],
        yellow: [2,13],
        black: [6,5],
    }
    //add the roomid to the games list, along with the board, and piece positions
    games[roomid] = {
        socketsInGame: [],
        board: board,
        startingPositions: startingPositions,
        piecePositions: startingPositions,
        //the startingpositions and the piece positions are the same
        //startingpositions exists so players can revert pieces to these positions
    };
}

//this object holds the socket information of the users connected to any game
var SOCKET_LIST = {};
//this object holds the display name connected to each user
var displaynames = {};
//this object holds the roomid connected to each user
var usersRoomid = {};

//recieve and transmit data from mulitple clients with socket.io
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    Player.onConnect(socket);

    //do all of this when a user connects to a game page:
    //generate a random number to assign as a socket.id to the connecting user
    socket.id = Math.random();
    //put that number into the socket_list
    SOCKET_LIST[socket.id] = socket;
    //also recieve the roomid from the client, so we can say that this user is in that room (add to room object in the game)
    socket.on('sendRoomidToServer',function(data){
        //data received is the roomid, so put that into the usersroomid object
        usersRoomid[socket.id] = data;
        if (!(data in games)){
            //run function: if the room doesn't already exist, start a new game in it
            createNewGame(data);
        }
        games[data].socketsInGame.push(socket.id);
    });

    //do this when a user disconnects
    socket.on('disconnect',function(){
        roomid = usersRoomid[socket.id];
        //do this if the roomid still exists (server refresh deletes all games so much check for this)
        if(typeof games[roomid] !== 'undefined'){
            //delete their socketid from the games object
            games[roomid].socketsInGame = games[roomid].socketsInGame.filter(v => v !== socket.id);
            //delete the room from games object if no other users are in it
            if (games[roomid].socketsInGame === undefined || games[roomid].socketsInGame.length == 0){
                delete games[roomid];
            }
        }
        //delete the user from the socket_list
        delete SOCKET_LIST[socket.id];




        var lastpack = {
            player:Player.update()
        }
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
        delete Player.list[socket.id];
        delete displaynames[socket.id];
        delete Player.list[socket.id+1];
        delete Player.list[socket.id+2];
        delete Player.list[socket.id+3];
        Player.onDisconnect(socket);
    });

    //when server gets displayname, tell client to show game board, and tell users in the room that this user joined
    socket.on('sendDisplaynameToServer',function(data){
        displaynames[socket.id] = data[0];
        //tell client to show game board
        socket.emit('showBoard');

        //tell users in the room that this new user joined
        currSockets = games[usersRoomid[socket.id]].socketsInGame;
        playerName = (displaynames[socket.id]);
        for(var i in SOCKET_LIST){
            if (currSockets.includes(parseFloat(i))){
                SOCKET_LIST[i].emit('addToChat',displaynames[socket.id] + ' is joining the chat...');
            }
        }
    });

    //when server receives message from user, send only to users in the same roomid
    socket.on('sendMsgToServer',function(data){
        currSockets = games[usersRoomid[socket.id]].socketsInGame;
        playerName = (displaynames[socket.id]);
        for(var i in SOCKET_LIST){
            if (currSockets.includes(parseFloat(i))){
                SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
            }
        }
    });

});




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

setInterval(function(){
    var pack = {
        player:Player.update(),
        level:level,
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},50);
