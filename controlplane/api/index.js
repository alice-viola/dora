'use strict'

let fs = require('fs')
let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let express = require('express')
let session = require('express-session')
const querystring = require('querystring')
let api = {v1: require('./src/api')}
let cors = require('cors')
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

app.use(cors())

function isValidToken (req, token) {
	try {
		req.session.user = jwt.verify(token, process.env.secret).data.user
		return true
	} catch (err) {
		return false
	}
}

app.use(bearerToken())

app.post('/:apiVersion/user/validate', (req, res) => {
	if (isValidToken(req, req.token)) {
		res.json({status: 200, name: req.session.user})
	} else {
		res.json({status: 401})
	}
})

app.post('/:apiVersion/user/groups', (req, res) => {
	if (isValidToken(req, req.token)) {
		api[req.params.apiVersion]._getOne({kind: 'User', metadata: {name: req.session.user}}, (err, result) => {
			res.json(result)	
		})
	} else {
		res.sendStatus(401)
	}
})

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
				if (req.body.data !== undefined && req.body.data.metadata !== undefined 
					&& result.hasGroup(req.body.data.metadata.group)) {
					req.session.group = req.body.data.metadata.group
					req.session.policy = result.policyForGroup(req.body.data.metadata.group)
					next()
				} else if (req.body.data !== undefined && req.body.data.length > 0) { // Check batch mode
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
					// If there is no body, check the route
					let split = req.url.split('/')
					const resource = split[2]
					const verb = split[3]
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

app.post('/:apiVersion/api/cli/compatibility', (req, res) => {
	let map = {
		api: {}
	}
	map.api[version] = {cli: [version]}
	res.json({compatible: map.api[version].cli.includes(req.body.data.cliVersion)})
})

app.post('/:apiVersion/user/defaultgroup', (req, res) => {
	res.json({group: req.session.user})
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

app.post('/:apiVersion/batch/:verb', async (req, res) => {
	await GE.LOCK.API.acquireAsync()
	req.body.data.forEach((doc) => {
		if (!allowedToRoute(doc.kind, req.params.verb, req.session.policies[doc.metadata.group])) {
			return
		}
		api[req.params.apiVersion][req.params.verb](doc, (err, result) => {})
	})
	GE.LOCK.API.release()
	GE.Emitter.emit(GE.ApiCall)
	res.json('Batch apply applied')
})

app.post('/:apiVersion/:kind/:verb', async (req, res) => {
	if (!allowedToRoute(req.params.kind, req.params.verb, req.session.policy)) {
		res.sendStatus(401)
		return
	}
	await GE.LOCK.API.acquireAsync()
	api[req.params.apiVersion][req.params.verb](req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
	GE.LOCK.API.release()
})

var proxy = httpProxy.createProxyServer({})

app.post('/:apiVersion/:op/Workload/:name/', (req, res) => {
	let wkName = req.params.name
	api['v1'].getOne({ metadata: {name: wkName, group: req.session.user}, kind: 'Workload'}, (err, result) => {
		if (result.name !== undefined && result.name == wkName) {
			api['v1'].getOne({metadata: {name: result.node, group: GE.LABEL.PWM_RESOURCE}, kind: 'Node'}, (err, resultNode) => {
				if (resultNode.name !== undefined && resultNode.name == result.node) {
					req.url += 'pwm.' + req.session.user + '.' + req.params.name
					proxy.web(req, res, {target: 'http://' + resultNode.address})
				} else {
					res.sendStatus(404)
				}
			})
		} else {
			res.sendStatus(404)
		}
	})
})

app.post('/:apiVersion/volume/upload/:volumeName/:id/:total/:index', (req, res) => {
	//if (!allowedToRoute('Volume', 'get', req.session.policy)) {
	//	res.sendStatus(401)
	//	return
	//}
	let volumeName = req.params.volumeName.split('.')[req.params.volumeName.split('.').length - 1]
	api['v1'].getOne({ metadata: {name: volumeName, group: req.session.user}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage}, kind: 'Storage'}, (err, resultStorage) => {
				let storageData = {
					rootName: resultStorage.name,
					kind: resultStorage.type,
					name: req.params.volumeName,
					group: req.session.user,
					server: resultStorage.node,
					rootPath: resultStorage.path,
					subPath: result.subPath,
					policy: result.policy
				}
				req.params.storage = encodeURIComponent(JSON.stringify(storageData))
				req.url += req.params.storage
				proxy.web(req, res, {target: 'http://' + resultStorage.node + ':3001'})
			})
		} else {
			res.json()
		}
	})
})

app.post('/:apiVersion/volume/download/:volumeName/', (req, res) => {
	//if (!allowedToRoute('Volume', 'get', req.session.policy)) {
	//	res.sendStatus(401)
	//	return
	//}
	let parsedParams = JSON.parse(req.params.volumeName)
	let volumeName = parsedParams.name.split('.')[parsedParams.name.split('.').length - 1]
	api['v1'].getOne({ metadata: {name: volumeName, group: req.session.user}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage}, kind: 'Storage'}, (err, resultStorage) => {
				let storageData = {
					rootName: resultStorage.name,
					kind: resultStorage.type,
					name: parsedParams.name,
					group: req.session.user,
					server: resultStorage.node,
					rootPath: resultStorage.path,
					subPath: result.subPath + parsedParams.subPath,
					policy: result.policy,
				}
				req.params.storage = encodeURIComponent(JSON.stringify(storageData))
				req.url += req.params.storage
				proxy.web(req, res, {target: 'http://' + resultStorage.node + ':3001'})
			})
		} else {
			res.json()
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
					console.log('Proxy')
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

