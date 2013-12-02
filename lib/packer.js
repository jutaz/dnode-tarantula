function packer(serverId) {
    this.id = serverId;
}

packer.prototype.pack = function(data, callback) {
    packed = {};
    if('string' == typeof data) {
        data = JSON.decode(data);
    }
    packed.payload = data;
    packed.server_id = this.id;
    callback(null, JSON.encode(packed));
}

packer.prototpe.unpack = function(data, callback) {
    unpacked = {};
    if('string' == typeof data) {
        unpacked = JSON.decode(data);
    }
    callback(null, data);
}

module.exports = packer;