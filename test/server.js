var dnode = require('../index');

var serverOptions = {
    port: 3000,
    host: 'localhost'
}

var server = new dnode.Server({}, serverOptions);

server.on('connection', function(remote, client, api) {
    
});