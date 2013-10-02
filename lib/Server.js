var net				= require('net');
var proto			= require('dnode-protocol');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var chunkParser		= require('./chunkParser');
var uniqId			= require('./uniqId');
var log				= require('./log')(module);

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
	this.id		= uniqId();
	this.client	= client;
	this.remote	= null;
	this.buffer	= '';
	
	this.s = proto(api);
	this.client.on(EVENTS.DATA, this.onData.bind(this));
	this.client.on(EVENTS.END, server.disconnection.bind(server, this))
	this.s.on(EVENTS.REQUEST, this._write.bind(this));
	this.s.on(EVENTS.REMOTE, this._onRemote.bind(this));
	this.s.start();
}

Client.prototype.onData = function(chunk) {
	chunkParser(this, chunk, function(data) {
		try
		{
			this.s.handle(JSON.parse(data));
		} catch (e)
		{
			log.error(e.toString());
		}
	}.bind(this));
}

Client.prototype._onRemote = function(remote) {
	this.remote = remote;
	this.remote.$._setId(this.id);
}

Client.prototype._write = function(data) {
	this.client.write(JSON.stringify(data)+DEFAULT.DELIMITER);
}

var Server = function(api, options) {
	var self			= this;
	var options			= options	|| {};
	var api				= api		|| {};
	var server			= new net.Server();
	api.$				= {};
	api.$.proxy			= this.proxy.bind(this);
	api.$.ids			= this.ids.bind(this);
	api.$._changeId		= this._changeId.bind(this);
	this.connections	= {};
	server.on(EVENTS.CONNECTION, this.onConnection.bind(this, api));
	server.listen(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Server, EventEmitter);

Server.prototype.onConnection = function(api, client) {
	client = new Client(client, this, api);
	this.connections[client.id] = client;
}

Server.prototype.ids = function() {
	return Object.keys(this.connections);
}

Server.prototype.proxy = function(id, method) {
	if (!this.connections[id])
		return log.warn('Connection with ['+id+'] does\'t exist');
	if (!this.connections[id].remote)
		return log.warn('Connection with ['+id+'] does\'t have remote object');
	if (!this.connections[id].remote[method])
		return log.warn('Connection with ['+id+'] does\'t have remote method ['+method+']');
	this.connections[id].remote[method].apply(this.connections[id].remote, Array.prototype.slice.call(arguments, 2));
}

Server.prototype.broadcast	= function(method) {
	var ids = this.ids();
	for (var i = ids.length; i--;)
		if (this.connections[ids[i]] && this.connections[ids[i]].remote &&  this.connections[ids[i]].remote[method])
			this.connections[ids[i]].remote[method].apply(this.connections[ids[i]].remote, Array.prototype.slice.call(arguments, 1));
}

Server.prototype.disconnection = function(client) {
	this.emit('disconnection', this.connections[client.id]);
	this.connections[client.id] = null;
	delete this.connections[client.id];
}

Server.prototype._changeId = function(id, newId, callback) {
	this.connections[newId]		= this.connections[id];
	this.connections[newId].id	= newId;
	this.connections[id] = null;
	delete this.connections[id];
	callback();
}

module.exports = Server;
