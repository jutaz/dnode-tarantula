var server 		= require('./lib/Server');
var client 		= require('./lib/Client');
var memoryStore = require('./stores/memory');

module.exports = {
	Server: 	server,
	Spider:		server,
	Tarantula: 	server,
	server: 	server,
	Client:		client,
	client: 	client,
	Fly: 		client,
	stores: 	{
		memory:	memoryStore
	},
};