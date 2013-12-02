var Store   = require('../lib/store');
var packer  = require('../lib/packer');

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
    this.packer       = new packer(this.id);
}

store.prototype.__proto__ = Store.prototype;

store.prototype.publish = function(name, data, callback) {
    var self = this;
    this.packer.pack(data, function(err, packed) {
        if(err) {
            throw new Error(err);
        }
        self.pub.publish(name, packed)
        (callback && callback());
    });
}

store.prototype.subscribe = function(name, callaback) {
    var self = this;
    this.sub.subscribe(name);
    self.sub.on('message', function (channel, message) {
        if (name == channel) {
            self.packer.unpack(message, function(err, data, isLocal) {
                if(err) {
                    throw new Error(err);
                }
            });
        }
    });
}

store.prototype.unsubscribe = function(name, callback) {

}

store.prototype.destroy = function(callback) {
    this.pub.end();
    this.sub.end();
    this.client.end();
    this.clients = {};
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