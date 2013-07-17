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
var server = dnode.Spider({
    s: function (a, b, cb) {
        cb(a + b);
    }
}, {port: 5000, host: 'localhost'});

```

client:

``` js
var dnode = require('dnode-spider');
var server = dnode.Fly({
    c: function (a, b, cb) {
        cb((a + b) * 2);
    }
}, {port: 5000, host: 'localhost', nodeId: 'Fly1'});

```