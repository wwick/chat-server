const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const port = 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.join('default');

  socket.on('chat message', function(msg) {
    io.to(msg.room).emit('chat message', msg);
  });

  socket.on('join room', function(room) {
    console.log(room);
    socket.leaveAll();
    socket.join(room);
  });

  socket.on('user join', function(username) {
    console.log(username);
    io.emit('user join', username);
  });
});

server.listen(port, function(){
  console.log('listening on port ' + port);
});
