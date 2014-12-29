var Store   = require('../lib/store');
var packer  = require('../lib/packer');

function wrapper(opts) {
    pub    = opts.pub;
    sub    = opts.sub;
    client = opts.client;
    function store(opts) {
        this.server_id    = opts.id;
        this.pingInterval = opts.pingInterval*1.2;
        this.timeouts     = {};
        this.pub          = pub;
        this.sub          = sub;
        this.client       = client;
        this.clients      = {};
        this.packer       = new packer(this.server_id);
        this.sub.setMaxListeners(100);
    }

    store.prototype.__proto__ = Store.prototype;

    store.prototype.publish = function(name, data, callback) {
        var self = this;
        this.packer.pack(data, function(err, packed) {
            if(err) {
                throw new Error(err);
            }
            self.pub.publish(name, packed);
            callback && callback();
        });
    };

    store.prototype.subscribe = function(name, callback) {
        var self = this;
        this.sub.on('message', function (channel, message) {
            if (name == channel) {
                self.packer.unpack(message, function(err, payload, isLocal, data) {
                    if(err) {
                        throw new Error(err);
                    }
                    self.emit('request', payload, channel, data);
                });
            }
        });
        this.sub.subscribe(name);
    };

    store.prototype.unsubscribe = function(name, callback) {
        this.sub.unsubscribe(name);
        callback && callback(null, client);
    };

    store.prototype.destroy = function(callback) {
        this.pub.end();
        this.sub.end();
        this.client.end();
        this.clients = {};
    };

    store.prototype.set = function(client, callback) {
        var self = this;
        this.clients[client.id] = client;
        this.client.setex(client.id, this.pingInterval/1000, true, function() {
            callback && callback(null, client);
        });
    };

    store.prototype.get = function(id, callback) {
        client = this.clients[id];
        if(!client) {
            callback(new Error("No client with Id: "+id), null);
        } else {
            callback(null, client);
        }
    };

    store.prototype.delete = function(id, callback) {
        this.client.del(id);
        this.clients[id] = null;
        delete this.clients[id];
        callback && callback(null, id);
    };

    store.prototype.ids = function(callback) {
        this.client.keys('*', function (err, keys) {
            if (err) {
                throw new Error(err);
            }
            callback(null, keys);
        });
    };

    store.prototype.ttl = function(id, callback) {
        var self = this;
        if(this.timeouts[id]) {
            clearTimeout(this.timeouts[id]);
        }
        this.client.expire(id, this.pingInterval/1000);
        this.timeouts[id] = setTimeout(function(id) {
            self.delete(id);
        }, this.pingInterval, id);
        callback && callback();
    };

    return store;
}
module.exports = wrapper;
