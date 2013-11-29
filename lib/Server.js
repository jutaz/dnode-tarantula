var net				= require('net');
var proto			= require('dnode-protocol');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var chunkParser		= require('./chunkParser');
var uniqId			= require('./uniqId');

const EVENTS = {
	DATA:		'data',	
	END:		'end',
	REQUEST:	'request',
	REMOTE:		'remote',
	CONNECTION:	'connection',
};

const DEFAULT = {
	PORT:		5000,
	DELIMITER:	"\0",
};

var Client = function(client, server, api) {
	var self 	= this;
	this.id		= uniqId();
	this.client	= client;
	this.remote	= null;
	this.first 	= true;
	this.buffer	= '';
	
	this.dnode = proto(api);
	this.client.on(EVENTS.DATA, this.onData.bind(this));
	this.client.on(EVENTS.END, server.disconnection.bind(server, this))
	this.dnode.on(EVENTS.REQUEST, this._write.bind(this));
	this.dnode.on(EVENTS.REMOTE, this._onRemote.bind(this));
	this.dnode.start();
}
util.inherits(Client, EventEmitter);

Client.prototype.onData = function(chunk) {
	var self = this;
	chunkParser(this, chunk, function(data) {
		this.parse(data, function(err, isEvent, data) {
			if(isEvent) {
				self.event(data.name, data.args);
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

Client.prototype.event = function(name, args, callback) {
	args = args || [];
	this.emit(name, args);
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
	var self			= this;
	var options			= options	|| {};
	var api				= api		|| {};
	var server			= new net.Server();
	if('function' == typeof api) {
		api.prototype.$ 			= {};
		api.prototype.$.proxy		= this.proxy.bind(this);
		api.prototype.$.ids			= this.ids.bind(this);
		api.prototype.$._changeId	= this._changeId.bind(this);
	} else {
		api.$				= {};
		api.$.proxy			= this.proxy.bind(this);
		api.$.ids			= this.ids.bind(this);
		api.$._changeId		= this._changeId.bind(this);
		api.$.update		= this.update.bind(this);
	}
	this.auth			= options.auth || null;
	this.connections	= {};
	server.on(EVENTS.CONNECTION, this.onConnection.bind(this, api));
	server.listen(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Server, EventEmitter);

Server.prototype.onConnection = function(api, client) {
	var self = this;
	var api = util._extend({}, api);
	client = new Client(client, this, api);
	self.connections[client.id] = client;
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

Server.prototype.update = function(id) {
	this.connections[id].update();
}

Server.prototype.ids = function() {
	return Object.keys(this.connections);
}

Server.prototype.proxy = function(id, method) {
	if (!this.connections[id])
		return console.warn('Connection with ['+id+'] does\'t exist');
	if (!this.connections[id].remote)
		return console.warn('Connection with ['+id+'] does\'t have remote object');
	if (!this.connections[id].remote[method])
		return console.warn('Connection with ['+id+'] does\'t have remote method ['+method+']');
	this.connections[id].remote[method].apply(this.connections[id].remote, Array.prototype.slice.call(arguments, 2));
}

Server.prototype.broadcast	= function(method) {
	var ids = this.ids();
	for (var i = ids.length; i--;) {
		if (this.connections[ids[i]] && this.connections[ids[i]].remote &&  this.connections[ids[i]].remote[method]) {
			this.connections[ids[i]].remote[method].apply(this.connections[ids[i]].remote, Array.prototype.slice.call(arguments, 1));
		}
	}
}

Server.prototype.disconnection = function(client) {
	this.emit('disconnection', this.connections[client.id]);
	this.connections[client.id] = null;
	delete this.connections[client.id];
}

Server.prototype._changeId = function(id, newId, callback) {
	if(id !== newId) {
		this.connections[newId]		= this.connections[id];
		this.connections[newId].id	= newId;
		this.connections[id] = null;
		delete this.connections[id];
		callback();
	} else {
		callback();
	}
}

module.exports = Server;
