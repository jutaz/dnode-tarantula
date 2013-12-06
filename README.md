# dnode-tarantula

dnode-tarantula is an asynchronous rpc and event system for node.js based on dnode-protocol and TCP sockets.
This is fork of [dnode-spider](https://github.com/llevkin/dnode-spider)

[![NPM](https://nodei.co/npm/dnode-tarantula.png?downloads=true)](https://nodei.co/npm/dnode-tarantula/)

### Features
* Automatic reconnection
* bi-direction and poly-direction communication
* Events

### Install

```
npm install dnode-tarantula
```

### Examples

Also check [examples](/examples/)

server.js:

``` js
var dnode = require('dnode-tarantula');

var server = new dnode.Server({
	transform: function (a, b, cb) {
		cb(a + b, 'Hello from Spider!');
	}
}, {port: 5000, host: 'localhost'});

server.on('connection', function(remote) {
	remote.math(1, 2, function(res, hello) {
		console.log(res, hello);
	});
});

```

client.js:

``` js
var dnode = require('dnode-tarantula');

var client = new dnode.Client({
	math: function (a, b, cb) {
		cb((a + b) * 2, 'Hello from Fly! My name: '+client.nodeId);
	}
}, {port: 5000, host: 'localhost', nodeId: 'Fly1'});

client.on('connection', function(remote) {
	remote.transform(1, 2, function(res, hello) {
		console.log(res, hello);
	});
});

```

output:
```
node server.js &
node client.js &
3 'Hello from Spider!'
6 'Hello from Fly! My name: Fly1'
```

## Methods

``` js
var dnode = require('dnode-tarantula')
```

# API

## Server

``` js
var server = dnode.Server(api, options);
```

* Object api - shared server methods object
* Object options - settings object

```js
{
	port: 1337, //default: 5000
	host: 'node.example.com', // default: 'localhost'
	auth: function(flyAuth, callback), // default: null
	id: '1337', // any string. Default: random shortid
	store: new dnode.stores.redis({}), // default: memory store
	pingInterval: 15000, // Any number in ms. default: 10000
}
```

Api has `$` object, which is reserved for internal stuff (Danger Zone™).

### api.$.proxy(nodeId, methodname, [arguments])

* String nodeId - receiver client Id
* String methodname - name of method
* Array arguments - arguments, that should be passed to remote function

Call method with 'methodname' from Client with id = 'nodeId'.

### api.$.ids(callback)

* Function callback - callback

Return Array of all Client ID`s that are connected to Server

### server.broadcast(methodname, [arguments])

* String methodname - name of method
* Array arguments - arguments, that should be passed to remote function

Broadcast a function call to all clients.

### server.ids()

Return ids of all connected clients

### Events

``` js
server.on('connection', function(remote, client, api) {});	// client connected
server.on('disconnection', function(client) {});		// client disconnected
```

## Client

### var client = dnode.Client(api, options);

* Object api - shared Client methods object
* Object options - settings object

```js
{
	port: 1337, //default 5000
	host: 'node.example.com', // default 'localhost'
	nodeId: 'W00T', //default process.pid
	auth: function(callback)//default null
}
```

### client.update()

Call this method after updating your API object, and changes will propagate to server.

### Events

``` js
client.on('remote', function(remote) {}); // client remote methods are ready
client.on('ping', function(client) {}); // ping packet sent
client.on('ping:timeout', function(client) {}); // well... A ping timeout!
client.on('ping:reply', function(client) {}); // emitted when ping reply arrives
```
