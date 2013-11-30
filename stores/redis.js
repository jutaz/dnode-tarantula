function store(opts) {
    this.pub    = opts.pub;
    this.sub    = opts.sub;
    this.client = opts.client;
    this.clients = {};
}

store.prototype.publish = function(data, callback) {

}

store.prototype.subscribe = function(name, callaback) {

}

store.prototype.unsubscribe = function(name, callback) {

}

store.prototype.destroy = function(callback) {

}

store.prototype.set = function(client, callback) {
    this.clients[client.id] = client;
    this.client.set(client.id, true, function() {
        (callback && callback(null, client))
    });
}

store.prototype.get = function(id, callback) {

}

store.prototype.delete = function(id, callback) {

}

store.prototype.ids = function(callback) {

}

store.prototype.changeId = function(id, newId, callback) {

}

module.exports = store;