var dnode = require('../../index');
var redis = require('redis');

var serverOptions = {
    port: 3000,
    host: 'localhost',
    log: 5
}

var server = new dnode.Server({}, serverOptions);

server.on('connection', function(remote, client, api) {
    client.on('ping:timeout', function(client) {
        console.log("ping timeout");
    });
    client.on('ping:reply', function(client) {
        console.log("got ping back");
    });
    client.on('ping', function() {
        console.log("pinging...");
    });
});