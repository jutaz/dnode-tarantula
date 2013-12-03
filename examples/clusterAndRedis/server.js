var dnode = require('../../index');
var redis = require('redis');
var cluster = require('cluster');

if(cluster.isMaster) {
    for(var i = 0; i < 4; i++) {
        cluster.fork();
    }
} else {
    var serverOptions = {
        port: 3000,
        host: 'localhost',
        store: new dnode.stores.redis({
            pub: redis.createClient(),
            sub: redis.createClient(),
            client: redis.createClient()
        })
    }

    var server = new dnode.Server({}, serverOptions);

    server.on('connection', function(remote, client, api) {
        setInterval(function() {
            remote.fn("test", function(data) {
                console.log(data);
            });
        }, 1000);
    });
}