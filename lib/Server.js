var net             = require('net');
var proto           = require('dnode-protocol');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');
var parser          = require('./parser');
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
    this.authenticated  = options.authenticated || false;
    this.buffer         = '';
    this.store          = options.store;
    this.hooks          = {};
    this.pingInterval   = options.pingInterval || 10000;
    this.pingTimeout    = options.pingTimeout || this.pingInterval*1.2;
    this.log            = options.log || new logger();
    this.server         = options.server;
    this.api            = options.api;
    this.api.$.ping     = this.ping.bind(this);

    this.store.subscribe(this.id);
    this.dnode = proto(this.api);
    this.client.on('data', this.onData.bind(this));
    this.client.on('end', this.server.disconnection.bind(this.server, this))
    this.dnode.on('request', this._write.bind(this));
    this.dnode.on('remote', this._onRemote.bind(this));
    this.dnode.start();
    this.initPing();
}
util.inherits(Client, EventEmitter);

Client.prototype.remote = function() {
    args = Array.prototype.slice.call(arguments, 0);
    return {exec: this._callRemote.bind(this, args)};
}

Client.prototype._callRemote = function(args, clientId, method) {
    if(clientId === this.id) {
        this._remote[method].apply(undefined, args);
    } else {
        scrub = this.dnode.scrubber.scrub(args);
        payload = {
            method:     method,
            arguments:  scrub.arguments,
            callbacks:  scrub.callbacks,
            links:      scrub.links,
            client_id:  this.id
        }
        this.store.publish(clientId, payload);
    }
}

Client.prototype.initPing = function() {
    var self = this;
    this.on('ping:reply', function() {
        clearTimeout(self.pingTimeout);
    });
    setInterval(function() {
        self.ping(function() {
            self.pingTimeout = setTimeout(function() {
                self.emit('ping:timeout', self);
            }, this.pingTimeout);
        });
    }, self.pingInterval);
}

Client.prototype.ping = function(callback) {
    this._write("PING");
    this.emit('ping', this);
}

Client.prototype.handlePingAnswer = function() {
    this.emit('ping:reply', this);
    this.store.ttl(this.id);
}

Client.prototype.event = function(name) {
    this._write({
        type: 'event',
        name: name,
        arguments: Array.prototype.slice.call(arguments, 1),
    });
}

Client.prototype.onData = function(chunk) {
    var self = this;
    if(!this.authenticated) {
        return;
    }
    parser.chunk(this, chunk, function(data) {
        this.parse(data, function(err, isEvent, data, isString) {
            if(isString && data == "PONG") {
                self.handlePingAnswer();
                return;
            }
            if(isEvent) {
                self._event(data.name, data.args);
            } else {
                self.hookCheck(data, function(err, hook) {
                    if(err) {
                        throw new Error(err);
                    }
                    if(hook) {
                        self.store.publish(hook.clientId, data);
                        self.hooks[hook.name] = null;
                        delete self.hooks[hook.name];
                        self.log.debug("publishing data to client "+hook.clientId+":", data);
                    } else {
                        self.dnode.handle(data);
                    }
                });
            }
        });
    }.bind(this));
    this.log.debug('got data from client: ', ""+chunk);
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
        return;
    }
    if(data && data.type && data.type === 'event') {
        callback(null, true, data, false)      
    } else {
        callback(null, false, data, false);
    }
}

Client.prototype._event = function(name, args, callback) {
    args = args || [];
    this.emit(name, args);
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

Client.prototype.hookCheck = function(data, callback) {
    if(this.hooks[data.method]) {
        callback(null, this.hooks[data.method]);
    } else {
        callback(null, null);
    }
}

Client.prototype.hook = function(id, data, callback) {
    if(Object.keys(data.callbacks).length > 0) {
        for(var i in data.callbacks) {
            this.hooks[i] = {
                name: i,
                clientId: id
            }
        }
    }
    callback && callback();
}

Client.prototype.disconnect = function(msg, callback) {
    if(msg && 'function' !== typeof msg) {
        this._write("ERR:"+msg);
    }
    this.client.end();
    if('function' == typeof msg) {
        callback = msg;
    }
    callback && 'function' == typeof callback && callback();
    this.log.info('disconnected client');
}

var Server = function(api, options) {
    var options         = options   || {};
    var api             = api       || {};
    var server          = new net.Server();
    var store           = options.store || memoryStore;
    if('function' == typeof api) {
        api.prototype.$             = {};
        api.prototype.$.ids         = this.ids.bind(this);
        api.prototype.$._changeId   = this._changeId.bind(this);
    } else {
        api.$               = {};
        api.$.ids           = this.ids.bind(this);
        api.$._changeId     = this._changeId.bind(this);
        api.$.update        = this.update.bind(this);
    }
    this.buffer         = '';
    this.server         = server;
    this.id             = options.id || shortid.generate();
    this.pingInterval   = options.pingInterval || 10000;
    this.store          = new store({id: this.id, pingInterval: this.pingInterval});
    this.auth           = options.auth || null;
    this.log            = new logger(options.log || true);
    this.store.on('request', this.handleStoreRequest.bind(this));
    server.on('connection', this.onConnection.bind(this, api));
    server.listen(options.port || DEFAULT.PORT, options.host);
    this.log.info("server started");
}
util.inherits(Server, EventEmitter);

Server.prototype.onConnection = function(api, client) {
    var self = this;
    var api = util._extend({}, api);
    if(this.auth !== null) {
        client.once('data', this.authListener.bind(this, api, client));
        client.write("AUTH:require"+DEFAULT.DELIMITER);
    } else {
        this.setClient({
            client: client,
            server: this,
            api: api,
            store: this.store,
            log: this.log,
            authenticated: true
        }, function(remote, client) {
            self.emit('connection', remote, client, client.api);
        });
    }
    this.log.info("client connected");
}

Server.prototype.authListener = function(api, client, chunk) {
    var self = this;
    parser.chunk(self, chunk, function(data) {
        if(data.indexOf("AUTH:") == 0) {
            self.auth(data.slice(5), function(err, success, cb) {
                if(err) {
                    throw new Error(err);
                }
                if(!success) {
                    self.disconnection("Not authenticated", client);
                } else {
                    if(cb && 'function' == typeof cb) {
                        cb(null, true);
                    }
                    client.write("AUTH:success"+DEFAULT.DELIMITER);
                    self.setClient({
                        client: client,
                        server: self,
                        api: api,
                        store: self.store,
                        log: self.log,
                        authenticated: true
                    }, function(remote, client) {
                        self.emit('connection', remote, client, client.api);
                    });
                }
            });
        }
    });
}

Server.prototype.setClient = function(options, callback) {
    client = new Client(options);
    client.on('remote', function(remote) {
        callback(remote, client);
    });
    this.store.set(client);
}

Server.prototype.close = function(callback) {
    this.server.close(callback);
    this.log.info("closing server");
}

Server.prototype.handleStoreRequest =  function(payload, id, data) {
    var self = this;
    this.store.get(id, function(err, client) {
        if(err) {
            if(self.listenerCount(self, 'error') < 1) {
                throw new Error(err);
            } else {
                self.emit('error', err, self);
                return;
            }
        }
        if(!payload.client_id && 'number' == typeof payload.method) {
            client.onData(payload);
        } else {
            client.hook(payload.client_id, payload, function() {
                client._write(payload);
            });
        }
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

Server.prototype.disconnection = function(msg, client) {
    var self = this;
    if(!client) {
        client = msg;
        msg = 'disconnected';
    }
    if(!client.id && !client.server) { //assume it`s just plain server
        if(msg && 'function' !== typeof msg) {
            client.write("ERR:"+msg+DEFAULT.DELIMITER);
        }
        client.end();
    } else {
        client.disconnect(msg, function() {
            self.store.get(client.id, function(err, client) {
                if(err) {
                    if(self.listenerCount(self, 'error') < 1) {
                        throw new Error(err);
                    } else {
                        self.emit('error', err, self);
                        return;
                    }
                }
                if(client) {
                    self.emit('disconnection', client);
                    self.store.delete(client.id)
                }
            });
        });
    }
}

Server.prototype._changeId = function(id, newId, callback) {
    var self = this;
    if(id !== newId) {
        this.store.changeId(id, newId, function(err, client) {
            client._remote.$.updateId(newId);
            callback();
        });
    } else {
        callback();
    }
}

module.exports = Server;
