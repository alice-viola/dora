'use strict'

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
const rateLimiter = require('./src/security/rate-limiter')

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

// secret=PWMAPIPRODPROM01 generateToken=yes user=amedeo.setti userGroup=pwm.users defaultGroup=amedeo.setti id=1 node index.js 
if (process.env.generateToken !== undefined) {
	let StartServer = false
	let token = jwt.sign({
	  data: {user: process.env.user, userGroup: process.env.userGroup, defaultGroup: process.env.defaultGroup, id: process.env.id},
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

app.use(rateLimiter)

app.use(cors())

app.use(express.static('public'))

app.use(bearerToken())

/**
*	Pre auth routes
*/
app.post('*', (req, res, next) => {
	console.log(req.url)
	next()
})

app.post('/:apiVersion/:group/:resourceKind/:operation', (req, res, next) => {
	api[req.params.apiVersion].passRoute(req, res, next)
})

app.post('/:apiVersion/:group/:resourceKind/:operation/*', (req, res, next) => {
	api[req.params.apiVersion].passRoute(req, res, next)
})

app.post('/:apiVersion/:group/:resourceKind/:operation/:name/**', (req, res, next) => {
	api[req.params.apiVersion].passRoute(req, res, next)
})

/**
*	User routes
*/
app.post('/:apiVersion/:group/user/validate', (req, res) => {
	res.json({status: 200, name: req.session.user})
})

app.post('/:apiVersion/:group/user/groups', (req, res) => {
	api[req.params.apiVersion]._getOne({kind: 'User', metadata: {name: req.session.user, group: req.session.userGroup}}, (err, result) => {
		res.json(result)	
	})
})

app.post('/:apiVersion/:group/user/defaultgroup', (req, res) => {
	res.json({group: api[req.params.apiVersion].userDefaultGroup(req)})
})

app.post('/:apiVersion/:group/user/status', (req, res) => {
	let queue = []
	let results = {}
	let resources = ['Workload', 'Volume', 'Storage', 'Node', 'GPU', 'CPU', 'DeletedResource']
	resources.forEach((resource) => {
		queue.push((cb) => {
			let data = {}
			data = {kind: resource, metadata: {group: req.params.group}}
			data.user = getUserDataFromRequest(req)
			data._userDoc = req.session._userDoc
			api[req.params.apiVersion].get(data, (err, result) => {
				results[resource] = result
				cb(null)
			})
		})
	})
	async.parallel(queue, (err, _results) => {
		res.json(results)
	})
})

/**
*	Api routes
*/
app.post('/:apiVersion/:group/api/version', (req, res) => {
	res.json(version)
})

app.post('/:apiVersion/:group/api/compatibility', (req, res) => {
	let map = {
		api: {}
	}
	map.api[version] = {cli: [version]}
	res.json({compatible: map.api[version].cli.includes(req.body.data.cliVersion)})
})

/**
*	Token api routes
*/
app.post('/:apiVersion/:group/Workload/token', (req, res) => {
	let token = jwt.sign({
	  exp: Math.floor(Date.now() / 1000) + (5), // 5 seconds validity
	  data: {user: req.session.user, group: req.params.group}
	}, process.env.secret)
	res.json(token)
})

app.post('/:apiVersion/:group/token/create', (req, res) => {
	let dataToken = {
	  	data: {user: req.body.data.user, userGroup: req.body.data.userGroup, defaultGroup: req.body.data.defaultGroup || req.body.data.user, id: req.body.data.id || 1}
	}
	if (req.body.exp !== undefined) {
		dataToken.exp = Math.floor(Date.now() / 1000) + (req.body.exp * 60)
	}
	let token = jwt.sign(dataToken, process.env.secret)
	res.json(token)
})

//console.log(jwt.sign({
//	data: {user: 'amedeo.setti', userGroup: 'pwm.users', defaultGroup: 'amedeo.setti'}
//}, process.env.secret))

/**
*	Apply/Delete/Stop route for resource 
*/
function getUserDataFromRequest(req) {
	return {user: req.session.user, userGroup: req.session.userGroup, defaultGroup: req.session.defaultGroup}
}

app.post('/:apiVersion/:group/:resourceKind/:operation', async (req, res) => {
	if (req.params.resourceKind == 'batch') {
		await GE.LOCK.API.acquireAsync()
		let queue = []
		req.body.data.forEach((doc) => {
			queue.push((cb) => {
				data.user = getUserDataFromRequest(req)
				data._userDoc = req.session._userDoc
				api[req.params.apiVersion][req.params.operation](doc, (err, result) => {
					cb(err == false ? null : err)	
				})
			})
		})
		async.series(queue, (err, result) => {
			GE.LOCK.API.release()
			GE.Emitter.emit(GE.ApiCall)
			if (err) {
				res.json('Error in batch ' + req.params.operation)
			} else {
				res.json('Batch ' + req.params.operation + ' applied')
			}
		})
	} else {
		await GE.LOCK.API.acquireAsync()
		let data = req.body.data == undefined ? {kind: req.params.resourceKind, metadata: {group: req.params.group}} : req.body.data
		data.user = getUserDataFromRequest(req)
		data._userDoc = req.session._userDoc
		api[req.params.apiVersion][req.params.operation](data, (err, result) => {
			res.json(result)
			GE.Emitter.emit(GE.ApiCall)
			GE.LOCK.API.release()
		})
	}
})

var proxy = httpProxy.createProxyServer({})

/*
*	Containers direct access operations like logs, inspect, top
*/
app.post('/:apiVersion/:group/Workload/:operation/:name/', (req, res) => {
	let wkName = req.params.name
	api['v1'].describe({ metadata: {name: wkName, group: req.params.group}, kind: 'Workload'}, (err, result) => {
		if (result.metadata !== undefined && result.metadata.name !== undefined && result.metadata.name == wkName) {
			req.url += 'pwm.' + req.params.group + '.' + req.params.name
			proxy.web(req, res, {target: 'http://' + result.scheduler.nodeProperties.address[0]})
		} else {
			res.sendStatus(404)
		}
	})
})

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:id/:total/:index', (req, res) => {
	let volumeName = req.params.volumeName
	api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage, group: 'pwm.all'}, kind: 'Storage'}, (err, resultStorage) => {
				let storageData = {
					rootName: resultStorage.name,
					kind: resultStorage.type,
					name: 'pwm.' + req.params.group + '.' + req.params.volumeName,
					group: req.params.group,
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

app.post('/:apiVersion/:group/Volume/download/:volumeName/', (req, res) => {
	let parsedParams = JSON.parse(req.params.volumeName)
	let volumeName = parsedParams.name
	api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage, group: 'pwm.all'}, kind: 'Storage'}, (err, resultStorage) => {
				let storageData = {
					rootName: resultStorage.name,
					kind: resultStorage.type,
					name: 'pwm.' + req.params.group + '.' + parsedParams.name,
					group: req.params.group,
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
  			let authGroup = jwt.verify(qs.token, process.env.secret).data.group
  			api['v1'].describe({kind: 'Workload', metadata: {name: qs.containername, group: authGroup}}, (err, result) => {
  				if (result.currentStatus == GE.WORKLOAD.RUNNING) {
  					if (result.metadata.group == authGroup) {
  						proxy.ws(req, socket, head, {target: 'ws://' + result.scheduler.nodeProperties.address[0]})	
  					} else {
  						//res.send(401)
  					}
  				} else {
  					//res.send(404)
  				}
  			})
		} else {
			//res.send(401)
		}
	} catch (err) {
		console.log('ws upgrade:', err)
		//res.send(500)
	}
})

proxy.on('error', function (err) {
  	console.log('error', err)
})

if (StartServer == true) {
	server.listen(process.env.port || 3000)
	GE.Emitter.emit(GE.SystemStarted)
}

