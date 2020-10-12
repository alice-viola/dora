'use strict'

let fs = require('fs')
let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let express = require('express')
let session = require('express-session')
const querystring = require('querystring')
let api = {v1: require('./src/api')}
let http = require('http')
let httpProxy = require('http-proxy')
let jwt = require('jsonwebtoken')
const bearerToken = require('express-bearer-token')
const GE = require('./src/events/global')

if (process.env.generateApiToken !== undefined) {
	let token = jwt.sign({
	  data: {user: process.env.generateApiToken}
	}, process.env.secret)
	console.log(token)
	process.exit()
}

let version = null
fs.readFile('./.version', 'utf8', function (err,data) {
  	if (err) {
  	  	return console.log(err)
  	}
  	version = data
})

let controllers = {
	scheduler: require('./src/controllers/scheduler')
}

let app = express()
const server = http.createServer(app)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: 'PWMAPI',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

function isValidToken (req, token) {
	try {
		req.session.user = jwt.verify(token, process.env.secret).data.user
		return true
	} catch (err) {
		return false
	}
}

app.use(bearerToken())
app.use(function (req, res, next) {
	if (isValidToken(req, req.token)) {
		next()	
	} else {
		res.sendStatus(401)
	}  	
})

app.post('/:apiVersion/api/version', (req, res) => {
	res.json(version)
})


app.post('/:apiVersion/authtoken/get', (req, res) => {
	let token = jwt.sign({
	  exp: Math.floor(Date.now() / 1000) + (5), // 5 seconds validity
	  data: {user: req.session.user}
	}, process.env.secret)
	res.json(token)
})

app.post('/:apiVersion/interactive/get', (req, res) => {
	api[req.params.apiVersion]._proceduresGet(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/interactive/next', (req, res) => {
	api[req.params.apiVersion]._proceduresNext(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/interactive/apply', (req, res) => {
	api[req.params.apiVersion]._proceduresApply(req.body.data, (err, result) => {
		res.json(result)
	})
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

app.post('/:apiVersion/:kind/remove', (req, res) => {
	api[req.params.apiVersion].remove(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/:kind/cancel', (req, res) => {
	api[req.params.apiVersion].cancel(req.body.data, (err, result) => {
		res.json(result)
	})
})

var proxy = httpProxy.createProxyServer({})

app.post('/volume/upload/:nodename/:filename', (req, res) => {
	console.log('PROXY VOLUME')
	api['v1'].get({name: req.params.nodename, kind: 'Node'}, (err, result) => {
		let node = result.filter((n) => { return n.name == req.params.nodename })
		if (node.length == 1) {
			console.log(node[0].address[0])
			proxy.web(req, res, {target: 'http://' + node[0].address[0]})
		} else {
			res.send('No node')
		}
	})
})

app.post('/volume/download/:nodename/:filename', (req, res) => {
	console.log('PROXY VOLUME BACK')
	api['v1'].get({name: req.params.nodename, kind: 'Node'}, (err, result) => {
		let node = result.filter((n) => { return n.name == req.params.nodename })
		if (node.length == 1) {
			console.log(node[0].address[0])
			proxy.web(req, res, {target: 'http://' + node[0].address[0]})
		} else {
			res.send('No node')
		}
	})
})

server.on('upgrade', function (req, socket, head) {
	try {
		let qs = querystring.decode(req.url.split('?')[1])
  		let authUser = jwt.verify(qs.token, process.env.secret).data.user
  		if (authUser) {
			api['v1'].get({name: qs.node, kind: 'Node'}, (err, result) => {
				let node = result.filter((n) => { return n.name == qs.node })
				if (node.length == 1) {
					proxy.ws(req, socket, head, {target: 'ws://' + node[0].address[0]})		
				} else {
					
				}
			})
		}
	} catch (err) {
		console.log('ws upgrade:', err)
	}
})

proxy.on('error', function (err) {
  	console.log('error', err)
})

server.listen(3000 || process.env.port)
GE.Emitter.emit(GE.SystemStarted)
