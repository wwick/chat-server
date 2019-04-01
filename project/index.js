const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let rooms = {
  'default':{
    'users':Array(),
    'owner':'',
    'password':'',
    'banned':Array()
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
    let toUser = "";
    if (msg.user != ""){
      for (var ids in users_list){
        if(users_list[ids].username == msg.user){
          toUser = ids;
      }
    }
    let message = "PM from " + username +": "+ msg.message;
    io.to(toUser).emit("message", message);
  } else{
    let message = username + ": " + msg.message;
    io.to(room_name).emit('message', message);
  }
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
        'banned':Array()
      };
      leaveRoom(room);
      joinRoom(room);
      
    } else {
      let banned = false;
      if (rooms[room.name].password == room.password) {
        console.log(room.name);
        console.log(rooms[room.name].banned);
        for (ids in rooms[room.name].banned){
          console.log(ids);
          if(rooms[room.name].banned[ids] == room.socket_id){
            banned = true;
          }
        }
        if (!banned/*rooms[room.name].banned.includes[room.socket_id]*/) {
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
    let currentRoom = users_list[room.socket_id].room;
    if (rooms[currentRoom].owner == room.socket_id){
    currentUsers = rooms[currentRoom].users;
    for (let i = 0; i < currentUsers.length; i++){
      if(users_list[currentUsers[i]].username == room.user){
        kicked_user = currentUsers[i];
      }
    }
    let message = "You have been kicked from the room";
    io.to(kicked_user).emit('kicked', {
      'message': "You have been kicked from the room"
    }); 
  }
  });

  socket.on('ban user', function(room){
    let currentRoom = users_list[room.socket_id].room;
    if (rooms[currentRoom].owner == room.socket_id){
      currentUsers = rooms[currentRoom].users;
      for (let i = 0; i < currentUsers.length; i++){
        if(users_list[currentUsers[i]].username == room.user){
          kicked_user = currentUsers[i];
          rooms[currentRoom].banned.push(currentUsers[i]);
        }
      }
      let message = "You have been banned from the room";
      io.to(kicked_user).emit('kicked', {
        'message': message
      });
    }
  });


});

server.listen(port, function(){
  console.log('listening on port ' + port);
});
