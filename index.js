// loads libraries
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
const port = 3456;

// sends html to users
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// adds listeners when user is kicked
io.on('connection', function(socket) {

  // processes and distributes chat messages
  socket.on('chat message', function(msg) {
    let room_name = users_list[socket.id].room;
    let username = users_list[socket.id].username;
    let toUser = "";
    if (msg.user != ""){
      for (var ids in users_list){
        if (users_list[ids].username == msg.user) {
          toUser = ids;
        }
      }
      if (msg.message.charAt(0) == "!") {
        msg.message = emote(msg.message);
      }
      let message = "PM from " + username + ": " + msg.message;
      io.to(toUser).emit("message", message);
      message = "PM to " + msg.user + ": " + msg.message;
      io.to(socket.id).emit("message", message);
    } else {
      if (msg.message.charAt(0) == "!") {
        msg.message = emote(msg.message);
      }
      let message = username + ": " + msg.message;
      io.to(room_name).emit('message', message);
    }
  });

  // finds a unique username
  function findValidUsername(username) {
    for (let socket_id in users_list) {
      if (users_list[socket_id].username == username) {
        username += Math.floor(Math.random()*10);
        return(findValidUsername(username));
      }
    }
    return(username);
  }

  // logs in
  socket.on('login', function(username) {
    username = findValidUsername(username);
    users_list[socket.id] = {
      'username':username
    };
    joinRoom({
      'name':'default',
      'socket_id':socket.id
    });
  });

  // joins room and notifies other users
  function joinRoom(room) {
    let username = users_list[socket.id].username;
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
    rooms[room.name].users.push(socket.id);
    message = room.name + " currently contains: " + members;
    let is_owner = (rooms[room.name].owner == socket.id);
    io.to(socket.id).emit('join room', {
      'success':true,
      'message':message,
      'is_owner':is_owner
    });
    socket.join(room.name);
    users_list[socket.id].room = room.name;
  }

  // leaves room and notifies other users
  function leaveRoom(room) {
    let former_room = users_list[socket.id].room;
    socket.leave(former_room);
    for (i=0; i<rooms[former_room].users.length; i++) {
      if (rooms[former_room].users[i] == socket.id) {
        rooms[former_room].users.splice(i,1);
        continue;
      }
    }
    let username = users_list[socket.id].username;
    let message = username + ' has left the room';
    io.to(former_room).emit('message', message);
  }

  // emoji support
  function emote(msg) {
    if (msg.substring(0,6) == "!shrug"){
      msg = "¯\\_(ツ)_/¯ " + msg.substring(6);
    } else if (msg.substring(0,6) == "!lenny"){
      msg = "( ͡° ͜ʖ ͡°) " + msg.substring(6);
    } else if (msg.substring(0,5) == "!rage"){
      msg = "(ノಠ益ಠ)ノ彡┻━┻ " + msg.substring(5);
    } else if (msg.substring(0,9) == "!confused"){
      msg = "(⊙.☉)7 " + msg.substring(9);
    } else if (msg.substring(0,4) == "!lol"){
      msg = "(^_^)v " + msg.substring(4);
    } else if (msg.substring(0,4) == "!sad"){
      msg = "(T_T) " + msg.substring(5);
    }
    return msg;
  }

  // leaves current room and joins new room
  socket.on('join room', function(room) {
    if (rooms[room.name] == null) {
      rooms[room.name] = {
        'password':room.password,
        'users':Array(),
        'owner':socket.id,
        'banned':Array()
      };
      leaveRoom(room);
      joinRoom(room);
    } else {
      let banned = false;
      if (rooms[room.name].password == room.password) {
        for (ids in rooms[room.name].banned){
          if(rooms[room.name].banned[ids] == socket.id){
            banned = true;
          }
        }
        if (!banned) {
          leaveRoom(room);
          joinRoom(room);
          return false;
        }
      }
      io.to(socket.id).emit('join room', {
        'success':false,
        'message':'failed to join ' + room.name
      });
    }
  });

  // deletes rooms
  socket.on('delete room', function() {
    let currentRoom = users_list[socket.id].room;
    if (rooms[currentRoom].owner == socket.id){
      io.to(currentRoom).emit('delete room');
    }
  });

  // kicks user
  socket.on('kick user', function(room){
    let currentRoom = users_list[socket.id].room;
    let currentUser = users_list[socket.id].username;
    currentUsers = rooms[currentRoom].users;
    for (let i = 0; i < currentUsers.length; i++){
      if(users_list[currentUsers[i]].username == room.user){
        kicked_user = currentUsers[i];
      }
    }
    let message = "You have been kicked from the room";
    io.to(kicked_user).emit('kicked', {
      'message': message,
      'user':room.user
    }); 
  });

  // bans user
  socket.on('ban user', function(room){
    let currentRoom = users_list[socket.id].room;
    let currentUsers = rooms[currentRoom].users;
    for (let i = 0; i < currentUsers.length; i++){
      if(users_list[currentUsers[i]].username == room.user){
        kicked_user = currentUsers[i];
        rooms[currentRoom].banned.push(currentUsers[i]);
      }
    }
    let message = "You have been banned from the room";
    io.to(kicked_user).emit('kicked', {
      'message': message,
      'user':currentUser
    });
  });
});

// indicates which port to use
server.listen(port, function(){
  console.log('listening on port ' + port);
});
