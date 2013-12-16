var buffer      = require('buffer');
var delimiter   = "\0";

var parser = {};

parser.chunk = function(connection, chunk, callback) {
    var j = 0;
    if(chunk && !buffer.Buffer.isBuffer(chunk)) {
        callback(chunk);
    }
    for (var i = 0, l = chunk.length; i < l; i++) {
        if (chunk.toString('utf8', i, i + 1) !== delimiter) {
            continue;
        }
        if (connection.buffer !== '') {
            callback(connection.buffer + chunk.slice(j, i).toString());
            connection.buffer = '';
        } else {
            callback(chunk.slice(j, i).toString());
        }
        j = i + 1;
    }
    if (j < chunk.length - 1){
        connection.buffer += chunk.slice(j, chunk.length).toString();
    }
}

parser.string = function(str, callback) {
    parsed = {
        type: '',
        data: '',
        original: str,
        valid: false
    }
    if(!str.indexOf(':') < 0) {
        callback(null, parsed);
        return;
    }
    index = str.indexOf(':');
    parsed.type = str.slice(0, index);
    parsed.data = str.slice(index);
    parsed.valid = true;
    callback(null, parsed);
}

module.exports = parser;