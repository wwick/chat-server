const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.join('default');

  socket.on('chat message', function(msg) {
    io.to(msg.room).emit('chat message', msg);
  });

  socket.on('join room', function(room) {
    socket.leaveAll();
    socket.join(room);
  });

  socket.on('user join', function(msg) {
    console.log(msg);
    io.emit('user join', msg);
  });
});

server.listen(3000, function(){
  console.log('listening on *:3000');
});
