var net = require('net');
var noIndex = require('../../lib/noIndex.js');
var github = require('../../services/github.js');
var memory = require('../../drivers/memory.js');

var index = new noIndex();

index.setDriver(memory());
index.setService('github', github());

net.createServer(function (socket) {
  socket.name = socket.remoteAddress + ":" + socket.remotePort;
  socket.setEncoding('utf8');

  socket.on('data', function (data) {
    var args = data.replace(/(\r\n|\n|\r)/gm,'').split(' ');

    if (args && args.length >= 1) {
      var cmd = args[0];
      args.splice(0, 1);
      
      switch (cmd) {
        case 'GET':
        case 'get':          
          index.get.apply(index, args).then(function(data) {
            if (data) {
              socket.write(JSON.stringify(data) + '\r\n');
            } else {
              socket.write('undefined\r\n');
            }
          }).catch(function(error) {
            try {
              socket.write(error.toString() + '\r\n');
            } catch(error) {
              socket.write('Got Error!\r\n');
            }
          }).finally(function() {
            console.log('done!');
          });;
          
          break;
        default:
          console.log(cmd);
                  
          break;
      }
    }
  });
}).listen(8888);