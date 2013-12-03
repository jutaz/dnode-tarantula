var DELIMITER   = "\0";

module.exports  = function(connection, chunk, callback) {
    var j = 0;
    if(chunk && 'object' === typeof chunk) {
        callback(chunk);
    }
    for (var i = 0, l = chunk.length; i < l; i++) {
        if (chunk.toString('utf8', i, i + 1) !== DELIMITER) {
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