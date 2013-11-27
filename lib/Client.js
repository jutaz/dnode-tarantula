var net				= require('net');
var proto			= require('dnode-protocol');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var chunkParser		= require('./chunkParser');

const EVENTS = {
	DATA:			'data',	
	END:			'end',
	REQUEST:		'request',
	REMOTE:			'remote',
	CONNECT:		'connect',
	CONNECTION:		'connection',
	RECONNECTION:	'reconnection',
	CLOSE:			'close',
	ERROR:			'error',
};

const DEFAULT = {
	PORT:				5000,
	DELIMITER:			"\0",
	RECONNECT_INTERVAL:	1000,
};

var Client = function(api, options) {
	var self		= this;
	var options		= options	|| {};
	var api			= api		|| {};
	api.$			= {};
	api.$._setId	= this._setId.bind(this);
	api.$.auth		= options.auth || null;
	this.client		= new net.Socket();
	this.buffer		= '';
	this.id			= options.nodeId || null;
	this.remote		= null;
	this.c			= proto(api);
	this._inited	= false;
	this.c.on(EVENTS.REQUEST, this._write.bind(this));
	this.c.on(EVENTS.REMOTE, this._onRemote.bind(this));
	this.client.on(EVENTS.CONNECT, this.c.start.bind(this.c));
	this.client.on(EVENTS.CLOSE, this._reconnect.bind(this, options, api));
	this.client.on(EVENTS.END, this._reconnect.bind(this, options));
	this.client.on(EVENTS.ERROR, function(error) {});
	this.client.on(EVENTS.DATA, this.onData.bind(this));
	this.client.connect(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Client, EventEmitter);

Client.prototype.onData = function(chunk) {
	chunkParser(this, chunk, function(data) {
		this.c.handle(JSON.parse(data));
	}.bind(this));
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

Client.prototype._setId = function(id) {
	if (!this.id) {
		this.id = id;
		this.emit(!this._inited ? EVENTS.CONNECTION : EVENTS.RECONNECTION, this.remote);
	} else {
		this.remote.$._changeId(id, this.id, this.emit.bind(this, !this._inited ? EVENTS.CONNECTION : EVENTS.RECONNECTION, this.remote));
	}
	if (!this._inited) {
		this._inited = true;
	}
}

module.exports = Client;