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

## Server Methods

### var server = dnode.Server(Object api, Object options = {});

* Object api - shared Spider object
* Object options - settings object

```js
{
	port: 1337, //default 5000
	host: 'node.example.com', // default 'localhost'
	auth: function(flyAuth, callback) //default null
}
```

Api has `$` object, which is reserved for internal stuff.

### api.$.proxy(String nodeId, String methodname, [arguments...])

Call method with 'methodname' from Client with id = 'nodeId'.

### api.$.ids(Function callback)

Return Array of all Client ID`s connected to Server

### server.broadcast(String methodname, [arguments...])

Broadcast call 'methodname' on all Clients and pass to each arguments

### server.ids()

Return ids of all connected clients

### Events

``` js
server.on('connection', function(remote, client, api) {});	// client connected
server.on('disconnection', function(client) {});		// client disconnected
```

## Client Methods

### var client = dnode.Client(Object api, Object options = {});

* Object api - shared Client object
* Object options - settings object

```js
{
	port: 1337, //default 5000
	host: 'node.example.com', // default 'localhost'
	nodeId: 'W00T', //default process.pid
	auth: function(callback)//default null
}
```

### Events

``` js
server.on('connection', function(remote) {}); // client connected
```
