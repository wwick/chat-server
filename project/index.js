const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = Array({
  'name':'default',
  'password':'default',
  'users':Array()
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.on('chat message', function(msg) {
    io.to(msg.room).emit('chat message', msg);
  });

  socket.on('join room', function(room) {
    for (i = 0; i < rooms.length; i++){
      if (rooms[i].name == room.name){
        if (rooms[i].password == room.password){
           if (!rooms[i].users.includes(room.username)) {
            rooms[i].users.push(room.username);
            socket.leaveAll();
            socket.join(room.name);
            console.log(room.name);
            console.log(rooms);
           }
        } else {
          return false;
        }
      } else {
        rooms.push({
          'name':room.name,
          'password':room.password,
          'users':Array(room.username)
        });
        socket.leaveAll();
        socket.join(room.name);
      }
    }

  });

  socket.on('user join', function(username) {
    console.log(username);
    io.emit('user join', username);
  });

  socket.on('delete room', function(room){
    io.emit('delete room', room)
    console.log("success");
  })


});

server.listen(3000, function(){
  console.log('listening on *:3000');
});
