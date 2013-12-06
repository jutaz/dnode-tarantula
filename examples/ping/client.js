var dnode = require('../../index');
var cluster = require('cluster');
var connectOptions = {
    port: 3000,
    host: 'localhost',
    log: 3
}
var client = new dnode.client({
    fn: function(data, callback) {
        console.log(data);
        callback(data);
    }
}, connectOptions);

client.on('connection', function(remote) {

});