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
//3. currPiece       - piece being controlled
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
    //TODO: add function to randomly generate a board, to be run after a new game is created, and when users push a button
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
    //TODO:add function to randomly pick the starting positions, to be run after a new game is created, and when users push button
    startingPositions = {
        red: [3,5],
        green: [7,7],
        blue: [12,7],
        yellow: [2,13],
        black: [6,5],
    }
    //add the roomid to the games list, along with the board, and piece positions
    games[roomid] = {
        socketsInGame: [],
        board: board,
        currPiece: 'red',
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

////******************* SENDING AND RECEIVING DATA TO/FROM CLIENT *******************
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    //******************* ON USER CONNECT *******************
    //generate a random number to assign as a socket.id to the connecting user
    socket.id = Math.random();
    //put that number into the socket_list
    SOCKET_LIST[socket.id] = socket;
    //also receive the roomid from the client, so we can say that this user is in that room (add to room object in the game)
    socket.on('sendRoomidToServer',function(data){
        //data received is the roomid, so put that into the usersroomid object, with key socket.id
        //also put that in the list of socketsingame in the games object
        usersRoomid[socket.id] = data;
        if (!(data in games)){
            //run function: if the room doesn't already exist, start a new game in it
            createNewGame(data);
        }
        games[data].socketsInGame.push(socket.id);
    });

    //******************* DURING GAME *******************
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

    //when server receives a keypress (comes with roomid)
    socket.on('keyPress',function(data){
        game = games[data.roomid];
        board = games[data.roomid].board;
        piecePosition = game.piecePositions[game.currPiece];
        if(data.inputId === 'one'){
            games[data.roomid].currPiece = 'red';
        }
        else if(data.inputId === 'two'){
            games[data.roomid].currPiece = 'green';
        }
        else if(data.inputId === 'three'){
            games[data.roomid].currPiece = 'blue';
        }
        else if(data.inputId === 'four'){
            games[data.roomid].currPiece = 'yellow';
        }
        else if(data.inputId === 'left'){
            while(board[piecePosition[0]][piecePosition[1]-1] !== 1){
                piecePosition[1] -= 1;
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'right'){
            while(board[piecePosition[0]][piecePosition[1]+1] !== 1){
                piecePosition[1] += 1;
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'up'){
            while(board[piecePosition[0]-1][piecePosition[1]] !== 1){
                piecePosition[0] -= 1;
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'down'){
            while(board[piecePosition[0]+1][piecePosition[1]] !== 1){
                piecePosition[0] += 1;
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        console.log(game)
    });

    //at a fixed time interval, send each socket the game data for the room its in
    setInterval(function(){
        socket.emit('gameUpdate',games);
        /*
        for(var socketid in displaynames){
            pack = games[usersRoomid[socketid]];
            socket.emit('gameUpdate',pack);
        }
        */
    },50);


    //******************* ON USER DISCONNECT *******************
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
        //delete the user from the displaynames object
        delete displaynames[socket.id];
        //delete the user from the usersRoomid object
        delete usersRoomid[socket.id];
        //delete the user from the socket_list
        delete SOCKET_LIST[socket.id];

    });
});
