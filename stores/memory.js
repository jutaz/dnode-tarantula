var store = require('../lib/store');

function memory(opts) {
    this.clients      = {};
    this.server_id    = opts.id;
    this.pingInterval = opts.pingInterval*1.2;
    this.timeouts     = {};
}

memory.prototype.__proto__ = store.prototype;

memory.prototype.publish = function() {

};

memory.prototype.subscribe = function() {

};

memory.prototype.unsubscribe = function() {

};

memory.prototype.destroy = function(callback) {
    this.clients = {};
    (callback && callback());
};

memory.prototype.set = function(client, callback) {
    this.clients[client.id] = client;
    this.ttl(client.id, function() {
        (callback && callback(null, client));
    });
};

memory.prototype.get = function(id, callback) {
    client = this.clients[id];
    if(!client) {
        callback(null, false);
    } else {
        callback(null, client);
    }
};

memory.prototype.delete = function(id, callback) {
    this.clients[id] = null;
    delete this.clients[id];
    (callback && callback(null));
};

memory.prototype.ids = function(callback) {
    callback(null, Object.keys(this.clients));
};

store.prototype.ttl = function(id, callback) {
    var self = this;
    if(this.timeouts[id]) {
        clearTimeout(this.timeouts[id]);
    }
    this.timeouts[id] = setTimeout(function(id) {
        self.delete(id);
    }, this.pingInterval, id);
    callback && callback();
};

module.exports = memory;
