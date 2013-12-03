var dnode = require('../../index');
var cluster = require('cluster');

var connectOptions = {
    port: 3000,
    host: 'localhost'
}

if(cluster.isMaster) {
    for(var i = 0; i < 10; i++) {
        cluster.fork();
    }
} else {
    var client = new dnode.client({
        fn: function(data, callback) {
            console.log(data);
            callback(data);
        }
    }, connectOptions);

    client.on('connection', function(remote) {
        
    });
}