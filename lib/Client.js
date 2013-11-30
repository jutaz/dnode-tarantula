var net				= require('net');
var proto			= require('dnode-protocol');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var chunkParser		= require('./chunkParser');

var DEFAULT = {
	PORT:				5000,
	DELIMITER:			"\0",
	RECONNECT_INTERVAL:	1000,
};

var Client = function(api, options) {
	var self		= this;
	var options		= options	|| {};
	var api			= api		|| {};
	if('function' == typeof api) {
		api.prototype.$			= {};
		api.prototype.$._setId	= this._setId.bind(this);
		api.prototype.$.auth	= options.auth || null;
	} else {
		api.$			= {};
		api.$._setId	= this._setId.bind(this);
		api.$.auth		= options.auth || null;
		api.$.update	= this._update.bind(this);
	}
	this.client		= new net.Socket();
	this.buffer		= '';
	this.id			= options.nodeId || null;
	this.remote		= null;
	this.dnode		= proto(api);
	this._inited	= false;
	this.dnode.on('request', this._write.bind(this));
	this.dnode.on('remote', this._onRemote.bind(this));
	this.client.on('connect', this.dnode.start.bind(this.dnode));
	this.client.on('close', this._reconnect.bind(this, options, api));
	this.client.on('end', this._reconnect.bind(this, options));
	this.client.on('error', function(error) {});
	this.client.on('data', this.onData.bind(this));
	this.client.connect(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Client, EventEmitter);

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

Client.prototype.event = function(name) {
	this._write({
		type: 'event',
		name: name,
		arguments: arguments.slice(1),
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
	if(name == 'ready') {
		this.emit(name, this.remote);
	} else {
		this.emit(name, args);
	}
	callback && callback()
}

Client.prototype._reconnect = function(options, api) {
	setTimeout(function() {
		this.client.connect(options.port || DEFAULT.PORT, options.host);
	}.bind(this), DEFAULT.RECONNECT_INTERVAL);
}

Client.prototype._onRemote = function(remote) {
	this.remote = remote;
}

Client.prototype._write = function(data) {
	this.client.write(JSON.stringify(data)+DEFAULT.DELIMITER);
}

Client.prototype.update = function() {
	this.remote.$.update(this.id);
}

Client.prototype._update = function() {
	this.dnode.start();
}

Client.prototype._setId = function(id) {
	if (!this.id) {
		this.id = id;
		this.emit(!this._inited ? 'connection' : 'reconnection', this.remote);
	} else {
		this.remote.$._changeId(id, this.id, this.emit.bind(this, !this._inited ? 'connection' : 'reconnection', this.remote));
	}
	if (!this._inited) {
		this._inited = true;
	}
}

module.exports = Client;