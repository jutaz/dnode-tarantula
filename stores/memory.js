var store = require('../lib/store');

function memory() {
    this.clients = {};
}

memory.prototype.__proto__ = store.prototype;

memory.prototype.publish = function() {

}

memory.prototype.subscribe = function() {

}

memory.prototype.unsubscribe = function() {

}

memory.prototype.destroy = function(callback) {
    this.clients = {};
    (callback && callback())
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

module.exports = memory;