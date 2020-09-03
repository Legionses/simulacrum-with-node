const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);
const players = {};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('подключился пользователь');
    // создание нового игрока и добавление го в объект players
    players[socket.id] = {
        rotation: 0,
        x: 352,
        y: 1216,
        playerID: socket.id,
    };
// отправляем объект players новому игроку
    socket.emit('currentPlayers', players);
// обновляем всем другим игрокам информацию о новом игроке
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function () {
        console.log('пользователь отключился');
        // удаляем игрока из нашего объекта players
        delete players[socket.id];
        // отправляем сообщение всем игрокам, чтобы удалить этого игрока
        io.emit('disconnect', socket.id);
    });
    // когда игроки движутся, то обновляем данные по ним
    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        // отправляем общее сообщение всем игрокам о перемещении игрока
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
});

server.listen(8081, function () {
    console.log(`Прослушиваем ${server.address().port}`);
});

