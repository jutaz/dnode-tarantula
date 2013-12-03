var util = require('util')
var events = require('events').EventEmitter;

function store() {

}
util.inherits(store, events);

store.prototype.error = function(err) {
    if(this.listeners.length < 1) {
        throw new Error(err);
    } else {
        this.emit('error', err);
    }
}

store.prototype.changeId = function(id, newId, callback) {
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

module.exports = store;
