var net             = require('net');
var proto           = require('dnode-protocol');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');
var chunkParser     = require('./chunkParser');
var shortid         = require('shortid');
var memoryStore     = require('../stores/memory');
var logger          = require('./logger');

var DEFAULT = {
    PORT:       5000,
    DELIMITER:  "\0",
};

var Client = function(options) {
    var self            = this;
    this.id             = shortid.generate();
    this.client         = options.client;
    this._remote        = null;
    this.first          = true;
    this.buffer         = '';
    this.store          = options.store;
    this.hooks          = [];
    this.ping_interval  = options.ping_interval || 10000;
    this.ping_timeout   = options.ping_timeout || this.ping_interval*1.2;
    this.log            = options.log || new logger();
    this.server         = options.server;
    options.api.$.ping  = this.ping.bind(this);

    this.store.subscribe(this.id);
    this.dnode = proto(options.api);
    this.client.on('data', this.onData.bind(this));
    this.client.on('end', server.disconnection.bind(server, this))
    this.dnode.on('request', this._write.bind(this));
    this.dnode.on('remote', this._onRemote.bind(this));
    this.dnode.start();
    this.initPing();
}
util.inherits(Client, EventEmitter);

Client.prototype.remote = function(clientId, method) {
    args = Array.prototype.slice.call(arguments, 2);
    if(clientId === this.id) {
        this._remote[method].apply(undefined, args);
    } else {
        scrub = this.dnode.scrubber.scrub(args);
        payload = {
            method:     method,
            arguments:  scrub.arguments,
            callbacks:  scrub.callbacks,
            links:      scrub.links
        }
        this.store.publish(clientId, payload);
    }
}

Client.prototype.initPing = function() {
    var self = this;
    this.on('ping:reply', function() {
        clearTimeout(self.ping_timeout);
    });
    setInterval(function() {
        self.ping(function() {
            self.ping_timeout = setTimeout(function() {
                self.emit('ping:timeout');
            }, this.ping_timeout);
        });
    }, self.ping_interval);
}

Client.prototype.ping = function(callback) {
    this._write("PING");
    this.emit('ping', this);
}

Client.prototype.handlePingAnswer = function() {
    this.emit('ping:reply', this);
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
        this.parse(data, function(err, isEvent, data, isString) {
            if(isString && data == "PONG") {
                self.handlePingAnswer();
                return;
            }
            if(isEvent) {
                self._event(data.name, data.args);
            } else {
                self.dnode.handle(data);
            }
        });
    }.bind(this));
    this.log.debug('got data from client: ', ""+chunk)
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
    try {
        data = JSON.parse(data);
    } catch (e) {
        data = data;
        callback(null, false, data, true);
    }
    if(data && data.type && data.type === 'event') {
        callback(null, true, data, false)      
    } else {
        callback(null, false, data, false);
    }
}

Client.prototype._event = function(name, args, callback) {
    args = args || [];
    this.events.emit(name, args);
    callback && callback()
}

Client.prototype._onRemote = function(remote) {
    if(this.first) {
        this._remote = remote;
        this._remote.$._setId(this.id);
        this.emit('remote', remote);
    }
}

Client.prototype._write = function(data) {
    if('object' == typeof data) {
        data = JSON.stringify(data);
    }
    if(this.client.writable) {
        this.client.write(data+DEFAULT.DELIMITER);
        this.log.debug("writing data to client:", data);
    }
}

Client.prototype.hook = function(id, data, callback) {
    if(Object.keys(data.callbacks).length > 0) {
        for(var i in data.callbacks) {
            this.hooks.push(i);
        }
    }
    this._write(data);
}

Client.prototype.disconnect = function(callback) {
    this.client.end();
    (callback && callback());
    this.log.info('disconnected client');
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
    this.server         = server;
    this.id             = options.id || shortid.generate();
    this.store          = new store({id: this.id});
    this.auth           = options.auth || null;
    this.log            = new logger(options.log || true);
    this.pingInterval   = options.pingInterval || 10000;
    this.store.subscribe(this.id);
    this.store.on('request', this.handleStoreRequest.bind(this));
    server.on('connection', this.onConnection.bind(this, api));
    server.listen(options.port || DEFAULT.PORT, options.host);
    this.log.info("server started");
}
util.inherits(Server, EventEmitter);

Server.prototype.onConnection = function(api, client) {
    var self = this;
    var api = util._extend({}, api);
    client = new Client({
        client: client,
        server: this,
        api: api,
        store: this.store,
        log: this.log
    });
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
    this.log.info("client connected");
}

Server.prototype.close = function(callback) {
    this.server.close(callback);
    this.log.info("closing server");
}

Server.prototype.handleStoreRequest =  function(payload, data) {
    this.store.get(data.client_id, function(err, client) {
        client.onData(payload);
    });
}

Server.prototype.update = function(id) {
    this.store.get(id, function(err, client) {
        client.update();
    });
    this.log.debug("pushing API update to remote");
}

Server.prototype.ids = function(callback) {
    this.store.ids(function(err, ids) {
        callback(ids)
    });
}

Server.prototype.proxy = function(id, method) {
    this.store.get(id, function(err, client) {
        if (!client)
            return this.log.warn('Connection with ['+id+'] does\'t exist');
        if (!client.remote)
            return this.log.warn('Connection with ['+id+'] does\'t have remote object');
        if (!client.remote[method])
            return this.log.warn('Connection with ['+id+'] does\'t have remote method ['+method+']');
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
    this.log.debug('broadcasting method '+method+' to all servers');
}

Server.prototype.disconnection = function(client) {
    var self = this;
    this.store.get(client.id, function(err, client) {
        self.emit('disconnection', client);
        self.store.delete(client.id)
    });
    this.log.info("client disconnected")
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
