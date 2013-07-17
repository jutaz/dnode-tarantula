var proto			= require('dnode-protocol');
var net				= require('net');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var uuid			= require('node-uuid');

var encode			= JSON.stringify;
var decode			= JSON.parse;

const DEFAULT				= {
	PORT:	5000,
};
const RECONNECT_INTERVAL	= 500;

var _handle = function(data) {
	data = data.toString().split('\n');
	for (var i = data.length; i--;) {
		if (!data[i] || data[i].indexOf('namespace/') === 0)
			continue;
		try
		{
			this.handle(decode(data[i]));
		} catch (e)
		{
			console.error(e);
		}
	}
}

var _getPid = function(client, server, data) {
	var data = data.toString().split('\n');
	for (var i = data.length; i--;) {
		if (data[i].indexOf('namespace/') !== 0)
			continue;
		data[i] = data[i].replace('namespace/', '');
		if (server.connections[data[i]]) {
			if (!Array.isArray(server.connections[data[i]])) {
				server.connections[data[i]] = [server.connections[data[i]]];
				server.connections[data[i]].push(client);
				console.warn('Duplicate connection with pid ['+data[i]+'], sum connection count is: ['+server.connections[data[i]].length+']');
			}
			else
				server.connections[data[i]].push(client);
		}
		else {
			server.connections[data[i]] = client;
		}
		client.uniqId = uuid.v1();
		server.emit('connection', client.remote, client);
	}
}

var _write = function(data) {
	this.write(encode(data)+'\n');
}

var _serverEnd = function(client) {
	for (var i in this.connections) {
		if (Array.isArray(this.connections[i])) {
			for (var j = this.connections[i].length; j--;)
				if (this.connections[i][j].uniqId == client.uniqId)
					this.connections[i].splice(j, 1);
			if (this.connections[i].length == 0)
				delete this.connections[i];
		}
		else if (this.connections[i].uniqId == client.uniqId) {
			delete this.connections[i];
		}
	}
	this.emit('disconnection', client);
}

var _proxy = function(pid, method) {
	if (!this.connections[pid]) {
		console.warn('connection pid ['+pid+'] does not exist');
		return;
	}
	if (Array.isArray(this.connections[pid])) {
		var connections = this.connections[pid];
		for (var i = connections.length; i--;) {
			if (connections[i].remote[method])
				connections[i].remote[method].apply(connections[i].remote, Array.prototype.slice.call(arguments, 2));
			else
				console.warn('pid ['+pid+'] has no method '+method);
		}
	}
	else {
		if (this.connections[pid].remote[method])
			this.connections[pid].remote[method].apply(this.connections[pid].remote, Array.prototype.slice.call(arguments, 2));
		else
			console.warn('pid ['+pid+'] has no method '+method);
	}
}

var _ids = function(callback) {
	callback(this.ids());
}

var Server = function(api, options) {
	var self			= this;
	var options			= options || {};
	var api				= api || {};
	api.$				= {};
	api.$.proxy			= _proxy.bind(this);
	api.$.ids			= _ids.bind(this);
	this.connections	= {};
	var server			= new net.Server();
	server.on('connection', function(client) {
		var s = proto(api);
		client.on('data', _handle.bind(s));
		client.on('data', _getPid.bind(self, client, self));
		client.on('end', _serverEnd.bind(self, client))
		s.on('request', _write.bind(client));
		s.on('remote', function(remote) { client.remote = remote; });
		s.start();
	});
	server.listen(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Server, EventEmitter);

Server.prototype.ids = function() {
	return Object.keys(this.connections);
}

Server.prototype.broadcast = function(method) {
	var ids = this.ids();
	for (var i = ids.length; i--;) {
		if (Array.isArray(this.connections[ids])) {
			var connections = this.connections[ids];
			for (var j = connections.length; j--;)
				connections[j].remote[method].apply(connections[j].remote, Array.prototype.slice.call(arguments, 1));
		}
		else
			this.connections[ids].remote[method].apply(this.connections[ids].remote, Array.prototype.slice.call(arguments, 1));
	}
}

var Client = function(api, options) {
	var self	= this;
	var options	= options || {};
	var api		= api || {};
	var client	= new net.Socket();
	var c		= proto(api);
	this.remote	= null;
	this.nodeId	= options.nodeId ? options.nodeId : process.pid;
	c.on('request', _write.bind(client));
	c.on('remote', function(remote) { self.remote = remote; self.emit('connection', remote); });
	client.on('connect', client.write.bind(client, 'namespace/'+this.nodeId+'\n', c.start.bind(c)));
	client.on('data', _handle.bind(c));
	client.on('close', this._reconnect(client, options));
	client.on('end', this._reconnect(client, options));
	client.on('error', function(error) {});
	client.connect(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Client, EventEmitter);

Client.prototype._reconnect = function(client, options, event) {
	return function() { setTimeout(client.connect.bind(client, options.port || DEFAULT.PORT, options.host), RECONNECT_INTERVAL); }
}

this.Server	=	this.Spider	= Server;
this.Client	=	this.Fly	= Client;
this.setSerializer	= function(newencode, newdecode) {
	encode = newencode;
	decode = newdecode;
}