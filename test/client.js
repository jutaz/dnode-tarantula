var dnode = require('../index');
var generator = require("./lib/code_generator");

var connectOptions = {
    port: 3000,
    host: 'localhost'
}

var client = new dnode.Fly({
    fn: function(data, callback) {
        console.log(data);
        callback(data);
    }
}, connectOptions);

client.on('connection', function(remote) {
    
});