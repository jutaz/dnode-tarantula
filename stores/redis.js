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
            self.packer.unpack(message, function(err, payload, isLocal, data) {
                if(err) {
                    throw new Error(err);
                }
                if(!isLocal) {
                    self.emit('request', payload, data.server_id, data);
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
    this.client.del(id);
    this.clients[id] = null;
    delete this.clients[id];
    (callback && callback(null))
}

store.prototype.ids = function(callback) {

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

module.exports = wrapper;