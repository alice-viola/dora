/*let httpProxy = require('http-proxy')

// This is ok for http
//var proxy1 = new httpProxy.createProxyServer({
//  target: {
//    socketPath: '/var/run/docker.sock'
//  }
//}).listen(3002)

// THIS WORKS FOR WS
var proxy2 = new httpProxy.createProxyServer({
  ws: true,
  target: {
    socketPath: '/var/run/docker.sock'
  }
}).listen(3333)

proxy2.on('open', function (socket) {
  console.log("open")
})

proxy2.on('proxyReqWs', function (proxyReqWs, IncomingMessage, socket1) {
  //console.log(IncomingMessage)
  console.log('req')
});

proxy2.on('message', function (data) {
  console.log("data: ", data)
})

proxy2.on('error', function (err) {
  console.log('ERROR PROXY SERVER', err)
})*/


var http = require('http'),
    httpProxy = require('http-proxy');
 
//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({})
//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
  //proxy.web(req, res, {target: {socketPath: '/var/run/docker.sock' }})
  proxy.web(req, res, {target: 'localhost:8080'})
})

server.on('upgrade', function (req, socket, head) {
  console.log('Upgrading')
  //proxy.ws(req, socket, head, {target: {socketPath: '/var/run/docker.sock' }});
  proxy.ws(req, socket, head, {target: 'ws://localhost:8080'})
  //proxy.ws(req, socket, head, {target: 'ws://localhost:3334'});
  //proxy.ws(req, socket, head)
});

proxy.on('proxyReqWs', function () {
  console.log('proxyReqWs')
});

proxy.on('proxyReq', function (req) {
  //console.log(IncomingMessage)
  console.log('proxyReq')
});

proxy.on('close', function (proxyReqWs, IncomingMessage, socket1) {
  //console.log(IncomingMessage)
  console.log('close')
});

proxy.on('open', function (proxyReqWs, IncomingMessage, socket1) {
  //console.log(IncomingMessage)
  console.log('open')
});

proxy.on('proxySocket', function (proxyReqWs, IncomingMessage, socket1) {
  //console.log(IncomingMessage)
  console.log('proxySocket')
});

proxy.on('error', function (err) {
  //console.log(IncomingMessage)
  console.log('error', err)
});

server.listen(3333)

/*
let http = require('http')
let httpProxy = require('http-proxy')
var proxy = new httpProxy.createProxyServer({
  target: ':/var/run/docker.sock' 
});
var proxyServer = http.createServer(function (req, res) {
  proxy.web(req, res);
});
 
//
// Listen to the `upgrade` event and proxy the
// WebSocket requests as well.
//
proxyServer.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket, head);
});
 
proxyServer.listen(3333);
 
*/