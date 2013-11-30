function memory() {
    this.clients = {};
}

memory.prototype.set = function(client, callback) {
    this.clients[client.id] = client;
    (callback && callback(null, client))
}

memory.prototype.get = function(id, callback) {
    client = this.clients[id];
    if(!client) {
        callback(null, false);
    } else {
        callback(null, client);
    }
}

memory.prototype.delete = function(id, callback) {
    this.clients[id] = null;
    delete this.clients[id];
    (callback && callback(null))
}

memory.prototype.ids = function(callback) {
    callback(null, Object.keys(this.clients))
}

memory.prototype.changeId = function(id, newId, callback) {
    var self = this;
    this.get(id, function(err, client) {
        client.id = newId;
        self.set(client, function(err, client) {
            self.delete(id, function(err) {
                callback(err);
            });
        })
    });
}

module.exports = memory;