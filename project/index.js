const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = Array({
  'name':'default',
  'password':'default',
  'users':Array(),
  'owner':''
});
let users_list = {};
const port = 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.on('chat message', function(msg) {
    let room = users_list[msg.socket_id].room;
    io.to(room).emit('chat message', msg);
  });

  socket.on('login', function(credentials) {
    users_list[credentials.socket_id] = {
      'username':credentials.username,
      'room':'default'
    };
  });

  socket.on('join room', function(room) {
    let room_exists = false;
    for (i = 0; i < rooms.length; i++) {
      if (rooms[i].name == room.name){
        if (rooms[i].password != room.password){
          return false;
        } else {
          if (!rooms[i].users.includes(room.socket_id)) {
            rooms[i].users.push(room.socket_id);
          }
          room_exists = true;
        }
      }
    }
    if (!room_exists) {
      rooms.push({
        'name':room.name,
        'password':room.password,
        'users':Array(room.socket_id),
        'owner':room.socket_id
      });
    }
    socket.leave(users_list[room.socket_id].room);
    socket.join(room.name);
    console.log(room.name);
    console.log(rooms);

  });

  // socket.on('user join', function(username) {
  //   console.log(username);
  //   io.emit('user join', username);
  // });

  socket.on('delete room', function(room){
    for (i = 0; i < rooms.length; i++) {
      if (rooms[i].name == room.name) {
        if (rooms[i].owner != room.socket_id){
          return false;
        } else {
          io.emit('delete room', room)
          console.log("success");
        }
      }
    }
  });


});

server.listen(port, function(){
  console.log('listening on port ' + port);
});
