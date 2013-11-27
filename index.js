var server = require('./lib/Server');
var client = require('./lib/Client');

module.exports = {
	Server: server,
	Spider:	server,
	Tarantula: server,
	server: server,
	Client:	client,
	client: client,
	Fly: client,
};