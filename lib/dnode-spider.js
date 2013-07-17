var proto			= require('dnode-protocol');
var net				= require('net');
var EventEmitter	= require('events').EventEmitter;
var util			= require('util');
var uuid			= require('node-uuid');

var encode			= JSON.stringify;
var decode			= JSON.parse;

const DEFAULT		= {
	PORT:	5000,
};

var _handle = function(target) {
	return function(data) {
		data = data.toString().split('\n');
		for (var i = data.length; i--;)
			if (data[i] && data[i].indexOf('namespace/') !== 0) {
				try
				{
					target.handle(decode(data[i]));
				} catch (e)
				{
					console.error(e);
				}
			}
	}
}

var _getPid = function(client, server) {
	return function(data) {
		var data = data.toString().split('\n');
		for (var i = data.length; i--;) {
			if (data[i].indexOf('namespace/') !== 0)
				continue;
			data[i] = data[i].replace('namespace/', '');
			console.log(data[i]);
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
}

var _write = function(client) {
	return function(data) {
		client.write(encode(data)+'\n');
	}
}

var _serverEnd = function(client, self) {
	return function() {
		for (var i in self.connections) {
			if (Array.isArray(self.connections[i])) {
				for (var j = self.connections[i].length; j--;)
					if (self.connections[i][j].uniqId == client.uniqId)
						self.connections[i].splice(j, 1);
				if (self.connections[i].length == 0)
					delete self.connections[i];
			}
			else if (self.connections[i].uniqId == client.uniqId) {
				delete self.connections[i];
			}
		}
		self.emit('disconnection', client);
	}
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

var _pids = function(callback) {
	callback(this.ids());
}

var Server = function(api, options) {
	this.connections	= {};
	var self			= this;
	var options			= options || {};
	var api				= api || {};
	api.proxy			= _proxy.bind(this);
	api.pids			= _pids.bind(this);
	net.createServer(function(client) {
		var s = proto(api);
		client.on('data', _handle(s));
		client.on('data', _getPid(client, self));
		client.on('end', _serverEnd(client, self))
		s.on('request', _write(client));
		s.on('remote', function(remote) { client.remote = remote; });
		s.start();
	}).listen(options.port || DEFAULT.PORT, options.host);
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
	this.remote	= null;
	var self	= this;
	var options	= options || {};
	var api		= api || {};
	var client	= new net.Socket();
	client.on('connect', function() {
		var c = proto(api);
		c.on('request', _write(client));
		client.on('data', _handle(c));
		c.on('remote', function(remote) { self.remote = remote; self.emit('connection', remote); });
		client.write('namespace/'+(options.nodeId ? options.nodeId : process.pid)+'\n');
		c.start();
	});
//	client.on('close', this._reconnect(client, options));
//	client.on('end', this._reconnect(client, options));
	client.on('error', this._reconnect(client, options));
	client.connect(options.port || DEFAULT.PORT, options.host);
}
util.inherits(Client, EventEmitter);

Client.prototype._reconnect = function(client, options) {
	return function(error) {
		setTimeout(client.connect.bind(client, options.port || DEFAULT.PORT, options.host), 1000);
	}
}

this.Server			= Server;
this.Client			= Client;
this.setSerializer	= function(newencode, newdecode) {
	encode = newencode;
	decode = newdecode;
}