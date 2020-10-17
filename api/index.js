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

let StartServer = true

/**
* 	Join node token generation
*/ 
if (process.env.generateJoinToken !== undefined) {
	let StartServer = false
	let token = jwt.sign({
	  data: {node: process.env.generateJoinToken},
	  exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes validity
	}, process.env.secret)
	console.log(token)
	process.exit()
}

let version = require('./version')

let controllers = {
	scheduler: require('./src/controllers/scheduler')
}

let app = express()
const server = http.createServer(app)
app.use(bodyParser.json({limit: '200mb', extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: process.env.secret || 'PWMAPI',
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
		if (req.body !== undefined &&
			req.body.data !== undefined && 
			req.body.data.metadata !== undefined &&
			req.body.data.metadata.group == undefined) 
		{
			req.body.data.metadata.group = req.session.user
		} 
		let getOneUser = api[GE.DEFAULT.API_VERSION]._getOneModel({
			apiVersion: GE.DEFAULT.API_VERSION,
			kind: 'User',
			metadata: {
				name: req.session.user
			}
		}, (err, result) => {
			if (err) {
				res.sendStatus(401)
			} else {
				if (req.body.data.metadata !== undefined 
					&& result.hasGroup(req.body.data.metadata.group)) {
					req.session.group = req.body.data.metadata.group
					req.session.policy = result.policyForGroup(req.body.data.metadata.group)

					next()
				} else if (req.body.data.length > 0) { // Check batch mode
					console.log('Check batch')
					let goOn = true
					req.session.groups = []
					req.session.policies = {}
					if (req.body.useAuthGroup == GE.LABEL.PWM_ALL) {
						let policies = result.policyForGroup(GE.LABEL.PWM_ALL)
						if (policies == GE.LABEL.PWM_ALL) {
							req.body.data.some((doc) => {
								req.session.groups.push(doc.metadata.group)
								req.session.policies[doc.metadata.group] = GE.LABEL.PWM_ALL
							})
						} else {
							goOn = false
						}
					} else {
						req.body.data.some((doc) => {
							if (doc !== undefined &&
								doc.metadata !== undefined &&
								doc.metadata.group == undefined) {
	
								doc.metadata.group = req.session.user
								req.session.groups.push(doc.metadata.group)
								req.session.policies[doc.metadata.group] = (result.policyForGroup(doc.metadata.group))
							} 
							if (!result.hasGroup(doc.metadata.group) ) {
								goOn = false
								return true		
							}
						})
					}
					if (goOn) {
						next()
					} else {
						res.sendStatus(401)	
					}
				} else {
					next()
				}
			}
		})
	} else {
		res.sendStatus(401)
	}  	
})

function allowedToRoute (resourceKind, verb, policy) {
	if (typeof policy == 'string' && policy == GE.LABEL.PWM_ALL) {
		return true
	}
	if (policy == undefined) {
		return false
	}
	if (Object.keys(policy).includes(resourceKind) == false) {
		return false
	} else if (policy[resourceKind].includes(verb) == true) {
		return true
	} else {
		return false
	}
}

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

app.post('/:apiVersion/token/create', (req, res) => {
	let dataToken = {
	  	data: {user: req.body.data.user}
	}
	if (req.body.exp !== undefined) {
		dataToken.exp = Math.floor(Date.now() / 1000) + (req.body.exp * 60)
	}
	let token = jwt.sign(dataToken, process.env.secret)
	res.json(token)
})

// TODO: La uso?
app.post('/:apiVersion/user/create', (req, res) => {
	if (!allowedToRoute('User', 'create', req.session.policy)) {
		res.sendStatus(401)
		return
	}
	api[req.params.apiVersion]['user'](req.body.data, (err, result) => {
		api[req.params.apiVersion]['group']({
			apiVersion: req.params.apiVersion,
			kind: 'Group',
			metadata: {
				name: req.body.data.metadata.name
			}
		}, (err, result) => {
			res.json(result)
		})
	})
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
	if (!allowedToRoute('Workload', 'apply', req.session.policy)) {
		res.sendStatus(401)
		return
	}
	api[req.params.apiVersion]._proceduresApply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/batch/:verb', (req, res) => {
	req.body.data.forEach((doc) => {
		if (!allowedToRoute(doc.kind, req.params.verb, req.session.policies[doc.metadata.group])) {
			return
		}
		api[req.params.apiVersion][req.params.verb](doc, (err, result) => {})		
	})
	GE.Emitter.emit(GE.ApiCall)
	res.json('Batch apply applied')
})

app.post('/:apiVersion/:kind/:verb', (req, res) => {
	if (!allowedToRoute(req.params.kind, req.params.verb, req.session.policy)) {
		res.sendStatus(401)
		return
	}
	api[req.params.apiVersion][req.params.verb](req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/workload/logs', (req, res) => {
	if (!allowedToRoute('Workload', 'delete', req.session.policy)) {
		res.sendStatus(401)
		return
	}
	api['v1'].get({name: req.body.data.nodename, kind: 'Node'}, (err, result) => {
		let node = result.filter((n) => { return n.name == req.body.data.nodename })
		if (node.length == 1) {
			axios['post'](`${'http://' + node[0].address[0]}/workload/logs`, 
				req.body.data, {timeout: 1000}).then((resNode) => {
				res.json(resNode.data)
			}).catch((err) => {
				console.log('Error connecting to node server')
				res.json('Error')
			})
		} else {
			res.json('No node')
		}
	})
})

var proxy = httpProxy.createProxyServer({})

app.post('/:apiVersion/node/drain', (req, res) => {
	api['v1'].get({name: req.body.data.metadata.name, kind: req.body.data.kind}, (err, result) => {
		console.log(req.body)
		let node = result.filter((n) => { return n.name == req.body.data.metadata.name })
		console.log('--->', node)
		if (node.length == 1) {
			proxy.web(req, res, {target: 'http://' + node[0].address[0]})
		} else {
			res.send('No node')
		}
	})
})

app.post('/volume/upload/:nodename/:filename', (req, res) => {
	console.log('PROXY VOLUME')
	api['v1'].get({name: req.params.nodename, kind: 'Node'}, (err, result) => {
		let node = result.filter((n) => { return n.name == req.params.nodename })
		if (node.length == 1) {
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

if (StartServer == true) {
	server.listen(process.env.port || 3000)
	GE.Emitter.emit(GE.SystemStarted)
}

