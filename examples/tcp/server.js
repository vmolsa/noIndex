var net = require('net');
var noIndex = require('../../lib/noIndex.js');

var index = new noIndex();

index.setDriver(noIndex.getDriver('memory'));
index.setService('github', noIndex.getService('github', {
  //token: 'GITHUB_OAUTH_TOKEN',
  username: 'GITHUB_USERNAME',
  password: 'GITHUB_PASSWORD',
}));

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
              socket.write(JSON.stringify(data));
            } else {
              socket.write('undefined');
            }
          }).catch(function(error) {            
            try {
              socket.write(error.toString());
            } catch(error) {
              socket.write('Got Error');
            }
          }).finally(function() {
            console.log(args, 'done!');
          });
          
          break;
        default:
          console.log(cmd);
                  
          break;
      }
    }
  });
}).listen(8888);