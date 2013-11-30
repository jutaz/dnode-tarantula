function memory() {
	this.clients = {};
}

memory.prototype.set = function(client, callback) {
	this.clients[client.id] = client;
	(callback && callback(null, client))
}

memory.prototype.get = function(id, callback) {

}

memory.prototype.delete = function(id, callack) {

}

memory.prototype.ids = function(callback) {

}

memory.prototype.changeId = function(id, newId, callback) {

}

module.exports = memory;