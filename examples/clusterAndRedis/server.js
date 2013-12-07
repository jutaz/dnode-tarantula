var dnode = require('../../index');
var redis = require('redis');
var cluster = require('cluster');

if(cluster.isMaster) {
    for(var i = 0; i < 4; i++) {
        cluster.fork();
    }
} else {
    var re = redis.createClient();
    var serverOptions = {
        port: 3000,
        host: 'localhost',
        store: new dnode.stores.redis({
            pub: redis.createClient(),
            sub: redis.createClient(),
            client: redis.createClient()
        }),
        log: 3
    }

    var server = new dnode.Server({}, serverOptions);

    server.on('connection', function(remote, client, api) {
        setInterval(function() {
            re.randomkey(function(err, key) {
                if(key !== client.id) {
                    client.remote(key, 'fn', Math.random(), function(data) {
                        console.log(data);
                    });
                }
            });
        }, 3000);
    });
}