var pub     = null;
var sub     = null;
var client  = null;


function wrapper(opts) {
    pub    = opts.pub;
    sub    = opts.sub;
    client = opts.client;
    return store;
}

function store(opts) {
    this.server_id    = opts.id;
    this.pub          = pub;
    this.sub          = sub;
    this.client       = client;
    this.clients      = {};
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
    client = this.clients[id];
    if(!client) {
        callback(null, false);
    } else {
        callback(null, client);
    }
}

store.prototype.delete = function(id, callback) {

}

store.prototype.ids = function(callback) {

}

store.prototype.changeId = function(id, newId, callback) {

}

module.exports = wrapper;