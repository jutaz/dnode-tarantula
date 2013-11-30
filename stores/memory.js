function memory() {
	this.clients = {};
}

memory.prototype.set = function(client, callback) {
	this.clients[client.id] = client;
	(callback && callback(null, client))
}

memory.prototype.get = function(id, callback) {
	client = this.clients[id];
	if(!client) {
		callback(null, false);
	} else {
		callback(null, client);
	}
}

memory.prototype.delete = function(id, callback) {
	this.clients[id] = null;
	delete this.clients[id];
	(callback && callback(null))
}

memory.prototype.ids = function(callback) {

}

memory.prototype.changeId = function(id, newId, callback) {

}

module.exports = memory;