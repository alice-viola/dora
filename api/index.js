'use strict'

let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let express = require('express')
const querystring = require('querystring')
let api = {v1: require('./src/api')}
let http = require('http')
let httpProxy = require('http-proxy')
const GE = require('./src/events/global')

if (process.env.generateApiToken !== undefined) {
	const crypto = require('crypto')
	console.log(crypto.randomBytes(256).toString('hex'))
	process.exit()
}

let controllers = {
	gpuScheduler: require('./src/controllers/gpu/gpu_scheduler')
}

let app = express()
const server = http.createServer(app)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.all('*', (req, res, next) => {
	// console.log('Checking auth', req.body.token)
	next()
})

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/get', (req, res) => {
	api[req.params.apiVersion].get(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/getOne', (req, res) => {
	api[req.params.apiVersion].getOne(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/delete', (req, res) => {
	api[req.params.apiVersion].delete(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/:kind/cancel', (req, res) => {
	api[req.params.apiVersion].cancel(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/wl/:operation', (req, res) => {
	let operation = req.params.operation
	// Write to DB
})

var proxy = httpProxy.createProxyServer({})

server.on('upgrade', function (req, socket, head) {
	let qs = querystring.decode(req.url.split('?')[1])
  	console.log('Upgrading', qs)
	api['v1'].get({name: qs.node, kind: 'Node'}, (err, result) => {
		console.log(result)
		let node = result.filter((n) => { return n.name == qs.node })
		console.log(node)
		if (node.length == 1) {
			proxy.ws(req, socket, head, {target: 'ws://' + node[0].address[0]})		
		} else {

		}
	})
})

proxy.on('proxyReqWs', function () {
  	console.log('proxyReqWs')
});

proxy.on('proxyReq', function (req) {
  	console.log('proxyReq')
});

proxy.on('close', function (proxyReqWs, IncomingMessage, socket1) {
  	console.log('close')
});

proxy.on('open', function (proxyReqWs, IncomingMessage, socket1) {
  	console.log('open')
});

proxy.on('proxySocket', function (proxyReqWs, IncomingMessage, socket1) {
  	console.log('proxySocket')
});

proxy.on('error', function (err) {
  	console.log('error', err)
});

server.listen(3000)
GE.Emitter.emit(GE.SystemStarted)
