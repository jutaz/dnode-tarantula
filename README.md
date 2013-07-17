# dnode-spider

dnode-spider is an asynchronous rpc system for node.js based on dnode-protocol and TCP sockets. Fly-Clients nodes and Spider-Server in the middle of web.

![dnode-spider: spider rpc](http://s17.postimg.org/5gwmy1a4v/dnode_spider.jpg)

### Features
* Automatic Reconnect
* bi-direction and poly-direction communication provided by Spider-Server 'proxy' method. You can call any Fly-Clients functions from any Fly-Clients.

### Install

```
npm i dnode-spider
```

### Examples

server:

``` js
var dnode = require('dnode-spider');

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

output:
```
6 'Hello from Fly! My name: Fly1'
```

client:

``` js
var dnode = require('dnode-spider');

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
3 'Hello from Spider!'
```