function packer(serverId) {
    this.id = serverId;
}

packer.prototype.pack = function(data, callback) {
    packed = {};
    if('string' == typeof data) {
        data = JSON.parse(data);
    }
    packed.payload = data;
    packed.server_id = this.id;
    callback(null, JSON.stringify(packed));
}

packer.prototype.unpack = function(data, callback) {
    unpacked = {};
    if('string' == typeof data) {
        unpacked = JSON.parse(data);
    }
    callback(null, data.payload, (unpacked.server_id === this.id), unpacked);
}

module.exports = packer;