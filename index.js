var server      = require('./lib/Server');
var client      = require('./lib/Client');
var memoryStore = require('./stores/memory');
var redisStore  = require('./stores/redis');

module.exports = {
    Server:     server,
    Spider:     server,
    Tarantula:  server,
    server:     server,
    Client:     client,
    client:     client,
    Fly:        client,
    stores:     {
        memory: memoryStore,
        redis: redisStore
    },
};