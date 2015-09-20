var net = require('net');

var client = net.connect({port: 8888});

process.stdin.pipe(client).pipe(process.stdout);
