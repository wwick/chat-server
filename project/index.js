const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = {
  'default':{
    'users':Array(),
    'owner':'',
    'password':'',
    'banned':''
  } 
};
let users_list = {};
const port = 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.on('chat message', function(msg) {
    let room_name = users_list[msg.socket_id].room;
    let username = users_list[msg.socket_id].username;
    let message = username + ": " + msg.message;
    io.to(room_name).emit('message', message);
  });

  socket.on('login', function(credentials) {
    users_list[credentials.socket_id] = {
      'username':credentials.username
    };
    joinRoom({
      'name':'default',
      'socket_id':credentials.socket_id
    });
  });

  function joinRoom(room) {
    let username = users_list[room.socket_id].username;
    let message = username + " has joined the room";
    io.to(room.name).emit('message', message);
    let members = "(nobody)";
    let room_users = rooms[room.name].users;
    if (room_users.length != 0) {
      members = users_list[room_users[0]].username;
      for (i=1; i<room_users.length; i++) {
        members += ", " + users_list[room_users[i]].username;
      }
    }
    rooms[room.name].users.push(room.socket_id);
    message = room.name + " currently contains: " + members;
    io.to(room.socket_id).emit('join room', {
      'success':true,
      'message':message
    });
    socket.join(room.name);
    users_list[room.socket_id].room = room.name;
  }

  function leaveRoom(room) {
    let former_room = users_list[room.socket_id].room;
    socket.leave(former_room);
    for (i=0; i<rooms[former_room].users.length; i++) {
      if (rooms[former_room].users[i] == room.socket_id) {
        rooms[former_room].users.splice(i,1);
        continue;
      }
    }
    let username = users_list[room.socket_id].username;
    let message = username + ' has left the room';
    io.to(former_room).emit('message', message);
  }


  socket.on('join room', function(room) {

    if (rooms[room.name] == null) {
      rooms[room.name] = {
        'password':room.password,
        'users':Array(),
        'owner':room.socket_id,
        'banned':''
      };
      leaveRoom(room);
      joinRoom(room);
      
    } else {
      if (rooms[room.name].password == room.password) {
        if (!rooms[room.name].banned.includes[room.socket_id]) {
          leaveRoom(room);
          joinRoom(room);
          return false;
        }
      }
      io.to(room.socket_id).emit('join room', {
        'success':false,
        'message':'failed to join ' + room.name
      });
      console.log(room.password);

    }
  });

  socket.on('delete room', function(room){
    let currentRoom = users_list[room.socket_id].room;
    if (rooms[currentRoom].owner == room.socket_id){
      io.to(currentRoom).emit('delete room');
    }
  });

  socket.on('kick user', function(room){
    for (i = 0; i < rooms.length; i++){
      if(rooms[i].name == room.name) {
        if (rooms[i].owner != room.socket_id){
          return false;
        } else {
          io.emit('kick user', {
            'room':room.name,
            'user':room.user
          });
          console.log("success");
        }
      }
    }
  });


});

server.listen(port, function(){
  console.log('listening on port ' + port);
});
