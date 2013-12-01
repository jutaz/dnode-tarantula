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

module.exports = store;
