//use express and ejs
var express = require('express');
var app = express();
var serv = require('http').Server(app);
var randomWords = require('random-words');
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

//use the client folder to server static resources like images
app.use('/client',express.static(__dirname + '/client'));

//if the game doesn't already exist, start it. Run whenever a user visits a valid room url
function createNewGame(roomid){
    //TODO:add function to randomly pick the starting positions, to be run after a new game is created, and when users push button
    initstartingPositions = {
        red: [3,5],
        green: [7,7],
        blue: [12,7],
        yellow: [2,13],
        black: [6,5],
    }
    initpiecePositions = {
        red: [3,5],
        green: [7,7],
        blue: [12,7],
        yellow: [2,13],
        black: [6,5],
    }
    //add the roomid to the games list, along with the board, and piece positions
    games[roomid] = {
        socketsInGame: [],
        board: generateBoard(),
        currPiece: 'red',
        startingPositions: initstartingPositions,
        piecePositions: initpiecePositions,
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
    socket.emit('randomRoomName',randomWords({exactly:2,join:'-'}));
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
                SOCKET_LIST[i].emit('addToChatServer',displaynames[socket.id] + ' is joining...');
            }
        }
    });

    //when server receives message from user, send only to users in the same roomid
    socket.on('sendMsgToServer',function(data){
        currSockets = games[usersRoomid[socket.id]].socketsInGame;
        playerName = (displaynames[socket.id]);
        for(var i in SOCKET_LIST){
            if (currSockets.includes(parseFloat(i))){
                SOCKET_LIST[i].emit('addToChat',"<span id='player-name'>"+playerName+"</span>: " + data);
            }
        }
    });

    //when server receives a keypress (comes with roomid)
    socket.on('keyPress',function(data){
        game = games[data.roomid];
        board = games[data.roomid].board;
        piecePosition = game.piecePositions[game.currPiece];
        piecePositions = game.piecePositions;
        if(data.inputId === 'one'){
            game.currPiece = 'red';
        }
        else if(data.inputId === 'two'){
            game.currPiece = 'green';
        }
        else if(data.inputId === 'three'){
            game.currPiece = 'blue';
        }
        else if(data.inputId === 'four'){
            game.currPiece = 'yellow';
        }
        else if(data.inputId === 'left'){
            toLeft = board[piecePosition[0]][piecePosition[1]-1];
            onTop = board[piecePosition[0]][piecePosition[1]];

            while(!(toLeft == 9 || toLeft == 2 || onTop == 4 || pieceInDirection('left', piecePosition, piecePositions))){
                piecePosition[1] -= 1;
                toLeft = board[piecePosition[0]][piecePosition[1]-1];
                onTop = board[piecePosition[0]][piecePosition[1]];
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'right'){
            toRight = board[piecePosition[0]][piecePosition[1]+1];
            onTop = board[piecePosition[0]][piecePosition[1]];
            while(!(toRight == 9 || toRight == 4 || onTop == 2 || pieceInDirection('right', piecePosition, piecePositions))){
                piecePosition[1] += 1;
                toRight = board[piecePosition[0]][piecePosition[1]+1];
                onTop = board[piecePosition[0]][piecePosition[1]];
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'up'){
            toUp = board[piecePosition[0]-1][piecePosition[1]];
            onTop = board[piecePosition[0]][piecePosition[1]];
            while(!(toUp == 9 || toUp == 3 || onTop == 1 || pieceInDirection('up', piecePosition, piecePositions))){
                piecePosition[0] -= 1;
                toUp = board[piecePosition[0]-1][piecePosition[1]];
                onTop = board[piecePosition[0]][piecePosition[1]];
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
        else if(data.inputId === 'down'){
            toDown = board[piecePosition[0]+1][piecePosition[1]];
            onTop = board[piecePosition[0]][piecePosition[1]];
            while(!(toDown == 9 || toDown == 1 || onTop == 3 || pieceInDirection('down', piecePosition, piecePositions))){
                piecePosition[0] += 1;
                toDown = board[piecePosition[0]+1][piecePosition[1]];
                onTop = board[piecePosition[0]][piecePosition[1]];
            }
            game.piecePositions[game.currPiece] = piecePosition;
        }
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
            //tell room the user is leaving
            currSockets = games[roomid].socketsInGame;
            playerName = (displaynames[socket.id]);
            for(var i in SOCKET_LIST){
                if (currSockets.includes(parseFloat(i))){
                    SOCKET_LIST[i].emit('addToChatServer',displaynames[socket.id] + ' is leaving...');
                }
            }
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

quarterBoards = [
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,2,0,0,0,0],
        [9,0,0,0,0,0,0,0,0],
        [9,0,0,0,0,0,0,4,0],
        [9,0,0,3,0,0,1,0,0],
        [9,3,0,0,4,0,0,0,0],
        [9,0,3,0,0,0,0,2,3],
        [9,2,0,0,0,0,0,0,3],
        [9,0,0,0,0,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,2,0,0,0,0],
        [9,2,3,0,0,0,0,3,0],
        [9,0,0,0,0,0,0,0,4],
        [9,0,0,0,0,0,0,0,0],
        [9,0,0,0,4,0,0,0,0],
        [9,0,0,1,0,0,0,2,1],
        [9,1,0,0,0,0,0,0,3],
        [9,0,0,0,0,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,2,0,0,0,0],
        [9,0,0,0,0,0,2,0,0],
        [9,2,3,0,0,0,1,0,0],
        [9,3,0,0,0,0,0,0,0],
        [9,0,0,0,0,0,2,1,0],
        [9,0,0,3,0,0,0,0,0],
        [9,0,0,0,4,0,0,0,3],
        [9,0,0,0,0,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,3,0,2,0,0,0],
        [9,0,2,0,0,0,0,0,0],
        [9,0,0,0,0,0,0,0,0],
        [9,0,0,0,0,0,2,0,0],
        [9,0,0,0,0,3,0,1,0],
        [9,1,0,0,0,0,4,0,0],
        [9,0,0,4,0,0,0,0,3],
        [9,0,1,0,0,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,2,0,0,3,0,0,0],
        [9,0,3,0,2,0,0,0,0],
        [9,0,0,4,0,0,0,0,0],
        [9,0,0,0,0,0,0,0,4],
        [9,0,0,0,0,0,0,1,0],
        [9,3,0,0,0,0,0,0,0],
        [9,0,0,2,0,0,0,0,3],
        [9,0,0,0,1,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,0,2,0,0,0],
        [9,0,3,0,0,0,0,0,4],
        [9,2,0,0,0,0,0,1,0],
        [9,0,0,0,0,0,0,0,0],
        [9,0,0,0,0,0,0,3,0],
        [9,0,0,0,0,0,0,0,4],
        [9,1,0,2,0,0,0,0,3],
        [9,0,0,0,1,0,0,2,0],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,2,0,0,0,0],
        [9,0,0,0,0,0,2,0,0],
        [9,0,3,0,0,0,0,1,0],
        [9,0,0,4,0,0,3,0,0],
        [9,0,0,0,0,2,0,0,0],
        [9,0,0,0,4,0,0,0,2],
        [9,0,0,1,0,0,0,0,1],
        [9,1,0,0,0,0,0,2,1],
    ],
    [
        [9,9,9,9,9,9,9,9,9],
        [9,0,0,0,0,2,0,0,0],
        [9,0,0,0,4,0,0,0,0],
        [9,0,0,1,0,0,0,0,0],
        [9,0,0,0,0,0,0,3,0],
        [9,3,0,0,0,0,2,0,0],
        [9,0,0,0,0,0,3,0,0],
        [9,0,0,0,0,0,0,4,3],
        [9,0,0,0,3,4,0,2,0],
    ],
];

//rotates an N x N matrix clockwise 90 degrees
function rotateCW(matrix){
    var newMatrix = [];
    for(let i=0; i<matrix[0].length; i++) {
        var rowToCol = matrix.map(function(value,index) { return value[i]; });
        newMatrix.push(rowToCol.reverse());
    }
    for(let i=0; i<newMatrix.length; i++) {
        for(let j=0; j<newMatrix.length; j++) {
            if(newMatrix[i][j] == 1){
                newMatrix[i][j] = 2;
            }
            else if(newMatrix[i][j] == 2){
                newMatrix[i][j] = 3;
            }
            else if(newMatrix[i][j] == 3){
                newMatrix[i][j] = 4;
            }
            else if(newMatrix[i][j] == 4){
                newMatrix[i][j] = 1;
            }
        }
    }
    return newMatrix;
}

//make a random board using the prefedined (from the real game) quarterBoard pieces
function generateBoard(){
    remainingQuarters = [...quarterBoards];
    quadOne = [];
    quadTwo = [];
    quadThree = [];
    quadFour = []
    //pick a quarter board to use, assign it to quadrant 1 (top left), and delete from the list
    indexToUse = Math.floor(Math.random() * 8);
    quadOne = quarterBoards[indexToUse];
    remainingQuarters.splice(indexToUse, 1);
    //pick a quarter board to use, assign it to quadrant 2 (rotate oce to top right), and delete from the list
    indexToUse = Math.floor(Math.random() * 7);
    quadTwo = quarterBoards[indexToUse];
    remainingQuarters.splice(indexToUse, 1);
    quadTwo = rotateCW(quadTwo);
    //pick a quarter board to use, assign it to quadrant 3 (rotate twice to bottom right), and delete from the list
    indexToUse = Math.floor(Math.random() * 6);
    quadThree = quarterBoards[indexToUse];
    remainingQuarters.splice(indexToUse, 1);
    quadThree = rotateCW(rotateCW(quadThree));
    //pick a quarter board to use, assign it to quadrant 3 (rotate thrice to bottom left)
    indexToUse = Math.floor(Math.random() * 5);
    quadFour = quarterBoards[indexToUse];
    quadFour = rotateCW(rotateCW(rotateCW(quadFour)));
    //STITCH THE FOUR QUADRANTS TOGETHER INTO BOARD PIECE TO RETURN
    var fullBoard = [];
    var leftHalf = quadOne.concat(quadFour);
    var rightHalf = quadTwo.concat(quadThree);
    for(let i=0; i<leftHalf.length; i++){
        row = leftHalf[i].concat(rightHalf[i]);
        fullBoard.push(row);
    }
    return fullBoard;
}

//Check if a game piece is immediately in the given direction relative to the current piece
function pieceInDirection(direction, piecePosition, piecePositions){
    if (direction == 'left'){
        locationToCheck = [piecePosition[0], piecePosition[1]-1];
    }
    else if (direction == 'right'){
        locationToCheck = [piecePosition[0], piecePosition[1]+1];
    }
    else if (direction == 'up'){
        locationToCheck = [piecePosition[0]-1, piecePosition[1]];
    }

    else if (direction == 'down'){
        locationToCheck = [piecePosition[0]+1, piecePosition[1]];
    }

    for(i in piecePositions){
        if(locationToCheck.toString() == piecePositions[i].toString()){
            return true;
        }
    }
    return false;
}
