# dnode-tarantula

dnode-tarantula is an asynchronous rpc system for node.js based on dnode-protocol and TCP sockets.
This is fork of [dnode-spider](https://github.com/llevkin/dnode-spider)

### Features
* Automatic reconnection
* bi-direction and poly-direction communication

### Install

```
npm install dnode-tarantula
```

### Examples

server.js:

``` js
var dnode = require('dnode-tarantula');

/** create Spider-Server */
var server = new dnode.Spider({
	s: function (a, b, cb) {
		cb(a + b, 'Hello from Spider!');
	}
}, {port: 5000, host: 'localhost'});

/** on connection call client function "c" */
server.on('connection', function(remote) {
	remote.c(1, 2, function(res, hello) {
		console.log(res, hello);
	});
});

```

client.js:

``` js
var dnode = require('dnode-tarantula');

/** create Fly-Client */
var client = new dnode.Fly({
	c: function (a, b, cb) {
		cb((a + b) * 2, 'Hello from Fly! My name: '+client.nodeId);
	}
}, {port: 5000, host: 'localhost', nodeId: 'Fly1'});

/** on connection call client function "s" */
client.on('connection', function(remote) {
	remote.s(1, 2, function(res, hello) {
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

### var server = dnode.Spider(Object api, Object options = {});

Create new Spider-Server, shard api object functions to all connected Fly-s.
If you don't like dnode.Spider classname, you can use dnode.Server.
dnode.Server === dnode.Spider

* Object api - shared Spider object
* Object options - settings object

```js
{
	port: 1337, //default 5000
	host: 'node.example.com', // default 'localhost'
	auth: function(flyAuth, callback) //default null
}
```

After creation in api object add '$' object with 2 methods: 'proxy' and 'ids'. This methods availible in all Fly-s remote.

### api.$.proxy(String nodeId, String methodname, [arguments...])

Call method with 'methodname' from Fly with id = 'nodeId'.

### api.$.ids(Function callback)

Return Array of all Id connected to Spider

### server.broadcast(String methodname, [arguments...])

Broad cast call 'methodname' on all Fly and pass to each arguments

### server.ids()

Return ids of all connected clients

### Events

``` js
server.on('connection', function(remote, client) {});	// client connected
server.on('disconnection', function(client) {});		// client disconnected
```

## Client Methods

### var client = dnode.Fly(Object api, Object options = {});

Create new Fly-Client, shard api object functions to Spider-Server.
If you don't like dnode.Fly classname, you can use dnode.Client.
dnode.Client === dnode.Fly

* Object api - shared Fly object
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
