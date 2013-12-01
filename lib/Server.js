var net             = require('net');
var proto           = require('dnode-protocol');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');
var chunkParser     = require('./chunkParser');
var shortid         = require('shortid');
var memoryStore     = require('../stores/memory');

var DEFAULT = {
    PORT:       5000,
    DELIMITER:  "\0",
};

var Client = function(client, server, api, store) {
    var self        = this;
    this.id         = shortid.generate();
    this.client     = client;
    this.remote     = null;
    this.first      = true;
    this.buffer     = '';
    this.store      = store;
    api.$.remote    = this.remote.bind(this);
    
    this.dnode = proto(api);
    this.client.on('data', this.onData.bind(this));
    this.client.on('end', server.disconnection.bind(server, this))
    this.dnode.on('request', this._write.bind(this));
    this.dnode.on('remote', this._onRemote.bind(this));
    this.dnode.start();
}
util.inherits(Client, EventEmitter);

Client.prototype.remote = function(ServerId, method) {
    args = Array.prototype.slice.call(arguments, 2);
    scrub = this.dnode.scrubber.scrub(args);
    
    payload = {
        method:     method,
        arguments:  scrub.arguments,
        callbacks:  scrub.callbacks,
        links:      scrub.links
    }
    this.store.publish(ServerId, payload);
}

Client.prototype.event = function(name) {
    this._write({
        type: 'event',
        name: name,
        arguments: arguments.slice(1),
    });
}

Client.prototype.onData = function(chunk) {
    var self = this;
    chunkParser(this, chunk, function(data) {
        this.parse(data, function(err, isEvent, data) {
            if(isEvent) {
                self._event(data.name, data.args);
            } else {
                self.dnode.handle(data);
            }
        });
    }.bind(this));
}

Client.prototype.update = function() {
    this.first = false;
    this.dnode.start();
}

Client.prototype.ready = function() {
    this._write({
        type: 'event',
        name: 'ready',
        arguments: [],
    });
}

Client.prototype.parse = function(data, callback) {
    data = JSON.parse(data);
    if(data && data.type && data.type === 'event') {
        callback(null, true, data)      
    } else {
        callback(null, false, data);
    }
}

Client.prototype._event = function(name, args, callback) {
    args = args || [];
    this.events.emit(name, args);
    callback && callback()
}

Client.prototype._onRemote = function(remote) {
    if(this.first) {
        this.remote = remote;
        this.remote.$._setId(this.id);
        this.emit('remote', remote);
    }
}

Client.prototype._write = function(data) {
    this.client.write(JSON.stringify(data)+DEFAULT.DELIMITER);
}

var Server = function(api, options) {
    var self            = this;
    var options         = options   || {};
    var api             = api       || {};
    var server          = new net.Server();
    var store           = options.store || memoryStore;
    if('function' == typeof api) {
        api.prototype.$             = {};
        api.prototype.$.proxy       = this.proxy.bind(this);
        api.prototype.$.ids         = this.ids.bind(this);
        api.prototype.$._changeId   = this._changeId.bind(this);
    } else {
        api.$               = {};
        api.$.proxy         = this.proxy.bind(this);
        api.$.ids           = this.ids.bind(this);
        api.$._changeId     = this._changeId.bind(this);
        api.$.update        = this.update.bind(this);
    }
    this.id             = shortid.generate();
    this.store          = new store({id: this.id});
    this.auth           = options.auth || null;
    this.store.subscribe(this.id);
    this.store.on('request', this.handleStoreRequest.bind(this));
    server.on('connection', this.onConnection.bind(this, api));
    server.listen(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Server, EventEmitter);

Server.prototype.onConnection = function(api, client) {
    var self = this;
    var api = util._extend({}, api);
    client = new Client(client, this, api, this.store);
    this.store.set(client);
    client.on('remote', function(remote) {
        if(remote.$.auth !== null && 'function' == typeof remote.$.auth && self.auth !== null) {
            self.auth(remote.$.auth, function(err, success, cb) {
                if(err) {
                    throw new Error(err);
                }
                if(!success) {
                    self.disconnection(client);
                } else {
                    if(cb && 'function' == typeof cb) {
                        cb(null, true);
                    }
                    self.emit('connection', remote, client, api);
                }
            });
        } else {
            self.emit('connection', remote, client, api);
        }
    });
}

Server.prototype.handleStoreRequest =  function() {
    
}

Server.prototype.update = function(id) {
    this.store.get(id, function(err, client) {
        client.update();
    });
}

Server.prototype.ids = function(callback) {
    this.store.ids(function(err, ids) {
        callback(ids)
    });
}

Server.prototype.proxy = function(id, method) {
    this.store.get(id, function(err, client) {
        if (!client)
            return console.warn('Connection with ['+id+'] does\'t exist');
        if (!client.remote)
            return console.warn('Connection with ['+id+'] does\'t have remote object');
        if (!client.remote[method])
            return console.warn('Connection with ['+id+'] does\'t have remote method ['+method+']');
        client.remote[method].apply(client.remote, Array.prototype.slice.call(arguments, 2));
    });
}

Server.prototype.broadcast  = function(method) {
    var self = this;
    this.ids(function(ids) {
        for (var i = ids.length; i--;) {
            self.store.get(ids[i], function(err, client) {
                if (client && client.remote && client.remote[method]) {
                    client.remote[method].apply(client.remote, Array.prototype.slice.call(arguments, 1));
                }
            });
        }
    });
}

Server.prototype.disconnection = function(client) {
    var self = this;
    this.store.get(client.id, function(err, client) {
        this.emit('disconnection', client);
        self.store.delete(client.id)
    });
}

Server.prototype._changeId = function(id, newId, callback) {
    if(id !== newId) {
        this.store.changeId(id, newId, function(err, client) {
            callback();
        });
    } else {
        callback();
    }
}

module.exports = Server;
