var net				= require('net');
var proto			= require('dnode-protocol');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var chunkParser		= require('./chunkParser');
var log				= require('./log')(module);

const EVENTS = {
	DATA:		'data',	
	END:		'end',
	REQUEST:	'request',
	REMOTE:		'remote',
	CONNECT:	'connect',
	CONNECTION:	'connection',
	CLOSE:		'close',
	ERROR:		'error',
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
	var c			= proto(api);
	this.client		= new net.Socket();
	this.buffer		= '';
	this.id			= options.nodeId || null;
	this.remote		= null;
	c.on(EVENTS.REQUEST, this._write.bind(this));
	c.on(EVENTS.REMOTE, this._onRemote.bind(this));
	this.client.once(EVENTS.CONNECT, c.start.bind(c));
	this.client.on(EVENTS.DATA, this.onData.bind(this, c));
	this.client.on(EVENTS.CLOSE, this._reconnect.bind(this, options));
	this.client.on(EVENTS.END, this._reconnect.bind(this, options));
	this.client.on(EVENTS.ERROR, function(error) {});
	this.client.connect(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Client, EventEmitter);

Client.prototype.onData = function(s, chunk) {
	chunkParser(this, chunk, function(data) {
		try
		{
			s.handle(JSON.parse(data));
		} catch (e)
		{
			log.error(e);
		}
	});
}

Client.prototype._reconnect = function(options) {
	setTimeout(this.client.connect.bind(this.client, options.port || DEFAULT.PORT, options.host), DEFAULT.RECONNECT_INTERVAL);
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
		this.emit(EVENTS.CONNECTION, this.remote);
	}
	else
		this.remote.$._changeId(id, this.id, this.emit.bind(this, EVENTS.CONNECTION, this.remote));
}

module.exports = Client;