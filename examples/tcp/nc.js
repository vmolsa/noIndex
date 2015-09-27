var net = require('net');

var client = net.connect({port: 8888});

process.stdin.pipe(client).on('data', function(packet) {
  var data = null;
  
  try {
    data = JSON.parse(packet);
  } catch(ignored) {}
  
  console.log(data);
});
