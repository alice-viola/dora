'use strict'


let fs = require('fs')
let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let express = require('express')
let randomstring = require('randomstring')
let session = require('express-session')
let history = require('connect-history-api-fallback')
const expressIpFilter = require('express-ipfilter').IpFilter
const IpDeniedError = require('express-ipfilter').IpDeniedError
const querystring = require('querystring')
const pem = require('pem')
let cors = require('cors')
let http = require('http')
let httpProxy = require('http-proxy')
let jwt = require('jsonwebtoken')
const bearerToken = require('express-bearer-token')


let api = {
	v1: require('../core').Api.Interface, 
	'v1.experimental': require('../core').Api.Interface, 
	v2: require('../core').Api.Interface
}

let StartServer = true

function getUserDataFromRequest(req) {
	return {user: req.session.user, userGroup: req.session.userGroup, defaultGroup: req.session.defaultGroup}
}

const { version } = require('./package.json')

let app = express()
const server = http.createServer(app)
app.use(bodyParser.json({limit: '200mb', extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
 secret: process.env.secret || 'DORA-API',
 resave: false,
 saveUninitialized: true,
 cookie: { secure: true }
}))

app.enable('trust proxy', true)

/**
*	Middlewares
*/
app.use(history())

app.use(cors())

// app.use(expressIpFilter(ipFilter.ipBlacklist()))

app.use((err, req, res, _next) => {
 	if (err instanceof IpDeniedError) {
 	  	res.sendStatus(401)
 	} else {
 		_next()
 	}
})

//app.use(rateLimiter)

app.use(express.static('public'))

app.use(bearerToken())

/**
*	Pre auth routes
*/
app.all('*', (req, res, next) => {
	// console.log(req.url)
	next()
})

let secCb = (req) => {
	ipFilter.addIpToBlacklist(GE.ipFromReq(req))
}

app.all('/:apiVersion/**', (req, res, next) => {
	if (api[req.params.apiVersion] == undefined) {
		res.sendStatus(401)
	} else {
		req.session.user = 'amedeo.setti'
		req.session.group = 'amedeo.setti'
		next()
	}
})

app.all('/:apiVersion/:group/:resourceKind/:operation', (req, res, next) => {
	//api[req.params.apiVersion].passRoute(req, res, next, secCb)
	next()
})

app.all('/:apiVersion/:group/:resourceKind/:operation/*', (req, res, next) => {
	//api[req.params.apiVersion].passRoute(req, res, next, secCb)
	next()
})

app.all('/:apiVersion/:group/:resourceKind/:operation/:name/**', (req, res, next) => {
	//api[req.params.apiVersion].passRoute(req, res, next, secCb)
	next()
})


/**
*	Metric route
*/ 
app.post('/:apiVersion/:group/cluster/stat', (req, res) => {
	//api[req.params.apiVersion].stat(req.body, (err, result) => {
	//	res.json(result)	
	//})
})

/**
*	User routes
*/
app.post('/:apiVersion/:group/user/validate', (req, res) => {
	// logger.pwmapi.log('200', GE.LOG.AUTH.VALID_LOGIN, req.session.user, GE.ipFromReq(req))
	res.json({status: 200, name: req.session.user})
})

app.post('/:apiVersion/:group/user/groups', (req, res) => {
	// api[req.params.apiVersion]._getOne({kind: 'User', metadata: {name: req.session.user, group: req.session.userGroup}}, (err, result) => {
	// 	res.json(result)	
	// })
})

app.post('/:apiVersion/:group/user/defaultgroup', (req, res) => {
	// res.json({group: api[req.params.apiVersion].userDefaultGroup(req)})
})

app.post('/:apiVersion/:group/user/status', (req, res) => {
	// let queue = []
	// let results = {}
	// let resources = ['Workload', 'Volume', 'Storage', 'Node', 'GPU', 'CPU', 'DeletedResource', 'ResourceCredit', 'Bind']
	// resources.forEach((resource) => {
	// 	queue.push((cb) => {
	// 		let data = {}
	// 		data = {kind: resource, metadata: {group: req.params.group}}
	// 		data.user = getUserDataFromRequest(req)
	// 		data._userDoc = req.session._userDoc
	// 		api[req.params.apiVersion].get(data, (err, result) => {
	// 			results[resource] = result
	// 			cb(null)
	// 		})
	// 	})
	// })
	// queue.push((cb) => {
	// 	let data = {}
	// 	data = {kind: 'User', metadata: {name: getUserDataFromRequest(req).user, group: getUserDataFromRequest(req).userGroup}}
	// 	data.user = getUserDataFromRequest(req)
	// 	api[req.params.apiVersion]._getOneModel(data, (err, result) => {
	// 		results['Account'] = {
	// 			name: result._p.metadata.name,
	// 			limits: result._p.spec.limits,
	// 			account: result._p.account,
	// 			active: result._p.active,
	// 		}
	// 		cb(null)
	// 	})
	// })
	// async.parallel(queue, (err, _results) => {
	// 	res.json(results)
	// })
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

/**
*	Apply/Delete/Stop route for resource 
*/
app.post('/:apiVersion/:group/:resourceKind/:operation', async (req, res) => {
	if (req.params.resourceKind == 'batch') {
		await GE.LOCK.API.acquireAsync()
		let queue = []
		req.body.data.forEach((doc) => {
			queue.push((cb) => {
				doc.user = getUserDataFromRequest(req)
				doc._userDoc = req.session._userDoc
				api[req.params.apiVersion][req.params.operation](doc, (err, result) => {
					cb(err == false ? null : err)	
				})
			})
		})
		async.series(queue, (err, result) => {
			GE.LOCK.API.release()
			if (req.params.operation == 'apply' || req.params.operation == 'delete') {
				GE.Emitter.emit(GE.ApiCall)	
			}
			if (err) {
				res.json('Error in batch ' + req.params.operation)
			} else {
				res.json('Batch ' + req.params.operation + ' applied')
			}
		})
	} else {
		//let data = req.body.data == undefined ? {kind: req.params.resourceKind, metadata: {group: req.params.group}} : req.body.data
		//data.user = getUserDataFromRequest(req)
		//data._userDoc = req.session._userDoc
		//api[req.params.apiVersion][req.params.operation](data, (err, result) => {
		//	res.json(result)
		//})
		let data = req.body.data == undefined ? {kind: req.params.resourceKind, metadata: {group: req.params.group, workspace: req.params.group}} : req.body.data
		api[req.params.apiVersion][req.params.operation](req.params.apiVersion, data, (err, result) => {
			res.json(result)
		})
	}
})

let proxy
if (StartServer == true) { 
	if (process.env.USE_CUSTOM_CA_SSL_CERT == true || process.env.USE_CUSTOM_CA_SSL_CERT == 'true') {
		const CA_CRT = fs.readFileSync(process.env.SSL_CA_CRT  || '/etc/ssl/certs/pwmca.pem')
		proxy = httpProxy.createProxyServer({
			ca: CA_CRT,
			checkServerIdentity: function (host, cert) {
				return undefined
			},
		})
		proxy.on('error', function (err, req, res) {
		  //res.writeHead(500, { 'Content-Type': 'text/plain'})
		  res.end('Something went wrong')
		  console.error('Proxy err', err)
		})
	} else {
		proxy = httpProxy.createProxyServer({secure: process.env.DENY_SELF_SIGNED_CERTS || false})
		proxy.on('error', function (err, req, res) {
		  //res.writeHead(500, { 'Content-Type': 'text/plain'})
		  res.end('Something went wrong')
		  console.error('Proxy err', err)
		})
	}
} else {
	proxy = httpProxy.createProxyServer()
	proxy.on('error', function (err, req, res) {
	  //res.writeHead(500, { 'Content-Type': 'text/plain'})
	  res.end('Something went wrong')
	  console.error('Proxy err', err)
	})
}

/*
*	Containers direct access operations like logs, inspect, top, commit
*/
app.post('/:apiVersion/:group/Workload/:operation/:name/', (req, res) => {
	let wkName = req.params.name
	api['v1'].describe({ metadata: {name: wkName, group: req.params.group}, kind: 'Workload'}, (err, result) => {
		if (result.metadata !== undefined && result.metadata.name !== undefined && result.metadata.name == wkName) {
			req.url += 'pwm.' + req.params.group + '.' + req.params.name
			api['v1'].describe({ metadata: {name: result.scheduler.node, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultNode) => {
				if (resultNode.spec.token !== undefined) {
					req.headers.authorization = 'Bearer ' + resultNode.spec.token	
				}
				proxy.web(req, res, {target: 'https://' + result.scheduler.nodeProperties.address[0]})
			})
		} else {
			res.sendStatus(404)
		}
	})
})

app.post('/:apiVersion/:group/Workload/commit/:name/:reponame', (req, res) => {
	let wkName = req.params.name
	api['v1'].describe({ metadata: {name: wkName, group: req.params.group}, kind: 'Workload'}, (err, result) => {
		if (result.metadata !== undefined && result.metadata.name !== undefined && result.metadata.name == wkName) {
			req.url += 'pwm.' + req.params.group + '.' + req.params.name
			api['v1'].describe({ metadata: {name: result.scheduler.node, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultNode) => {
				if (resultNode.spec.token !== undefined) {
					req.headers.authorization = 'Bearer ' + resultNode.spec.token	
				}
				proxy.web(req, res, {target: 'https://' + result.scheduler.nodeProperties.address[0]})
			})
		} else {
			res.sendStatus(404)
		}
	})
})

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

let uploadMem = {}

app.all('/v1.experimental/:group/Volume/upload/:volumeName/:info/:uploadId/:storage/*', (req, res) => {
	//console.log('Incoming request', req.url)
	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
			if (result.name !== undefined && result.name == volumeName) {
				api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
					api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
						let storageData = {
							rootName: resultStorage.name,
							kind: resultStorage.type,
							name: 'pwm.' + req.params.group + '.' + req.params.volumeName,
							group: req.params.group,
							server: resultStorage.node,
							rootPath: resultStorage.path,
							subPath: result.subPath,
							policy: result.policy,
							nodeAddress: resultStorageNode.spec.address[0].split(':')[0]
						}
						if (resultStorageNode.spec.token !== undefined) {
							req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
						}
						uploadMem[req.params.uploadId] = {
							nodeToken: resultStorageNode.spec.token,
							storageData: storageData,
							proxyAddress: resultStorageNode.spec.address[0]
						}
						cb(null)
					})
				})
			} else {
				cb(true)
			}
		})
	}

	let execProxy = () => {
		req.headers.authorization = 'Bearer ' + uploadMem[req.params.uploadId].nodeToken
		let storage = encodeURIComponent(JSON.stringify(uploadMem[req.params.uploadId].storageData))	
		// let host = '192.168.180.150'
		// let port = 3001
		let url = `${'https://' + uploadMem[req.params.uploadId].proxyAddress}/${'v1.experimental'}/${req.params.group}/Volume/upload/${req.params.volumeName}/-/${encodeURIComponent(req.params.uploadId)}/${storage}/${encodeURIComponent(req.params['0'])}`
		proxy.web(req, res, {target: url, ignorePath: true})
	} 

	if (uploadMem[req.params.uploadId] == undefined) {
		getUploadStorageData((err) => {
			if (err == null) {
				execProxy()
			} else {
				res.sendStatus(401)
			}
		})
	} else {
		execProxy()
	}
})

app.post('/v1.experimental/:group/Volume/ls/:volumeName/:path', (req, res) => {

	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
			if (result.name !== undefined && result.name == volumeName) {
				api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
					api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
						let storageData = {
							rootName: resultStorage.name,
							kind: resultStorage.type,
							name: 'pwm.' + req.params.group + '.' + req.params.volumeName,
							group: req.params.group,
							server: resultStorage.node,
							rootPath: resultStorage.path,
							subPath: result.subPath,
							policy: result.policy,
							nodeAddress: resultStorageNode.spec.address[0].split(':')[0]
						}

						if (resultStorageNode.spec.token !== undefined) {
							req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
						}
						let data = {
							nodeToken: resultStorageNode.spec.token,
							storageData: storageData,
							proxyAddress: resultStorageNode.spec.address[0]
						}
						cb(null, data)
					})
				})
			} else {
				cb(true)
			}
		})
	}
	getUploadStorageData((err, data) => {
		if (err == null) {
			req.headers.authorization = 'Bearer ' + data.nodeToken	
			req.params.storage = encodeURIComponent(JSON.stringify(data.storageData))
			req.url += '/' + req.params.storage
			proxy.web(req, res, {target: 'https://' + data.proxyAddress})
		} else {
			res.sendStatus(401)
		}
	})
})

app.post('/v1.experimental/:group/Volume/download/:volumeName/:path', (req, res) => {

	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
			if (result.name !== undefined && result.name == volumeName) {
				api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
					api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
						let storageData = {
							rootName: resultStorage.name,
							kind: resultStorage.type,
							name: 'pwm.' + req.params.group + '.' + req.params.volumeName,
							group: req.params.group,
							server: resultStorage.node,
							rootPath: resultStorage.path,
							subPath: result.subPath,
							policy: result.policy,
							nodeAddress: resultStorageNode.spec.address[0].split(':')[0]
						}

						if (resultStorageNode.spec.token !== undefined) {
							req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
						}
						uploadMem[req.params.uploadId] = {
							nodeToken: resultStorageNode.spec.token,
							storageData: storageData,
							proxyAddress: resultStorageNode.spec.address[0]
						}
						cb(null)
					})
				})
			} else {
				cb(true)
			}
		})
	}
	getUploadStorageData((err) => {
		if (err == null) {
			req.headers.authorization = 'Bearer ' + uploadMem[req.params.uploadId].nodeToken	
			req.params.storage = encodeURIComponent(JSON.stringify(uploadMem[req.params.uploadId].storageData))
			req.url += '/' + req.params.storage
			proxy.web(req, res, {target: 'https://' + uploadMem[req.params.uploadId].proxyAddress})
		} else {
			res.sendStatus(401)
		}
	})
})

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////


/** New Volume upload
*	/:apiVersion/:group/Volume/upload/:uploadInfo
*	
*	uploadInfo:
*		- targetDir
*		- uploadId (randomCode)
*		- index
*		- count
*/
app.post('/:apiVersion/:group/Volume/upload/:volumeName/:uploadInfo', (req, res) => {
	let volumeName = req.params.volumeName
	api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
				api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
					let storageData = {
						rootName: resultStorage.name,
						kind: resultStorage.type,
						name: 'pwm.' + req.params.group + '.' + req.params.volumeName,
						group: req.params.group,
						server: resultStorage.node,
						rootPath: resultStorage.path,
						subPath: result.subPath,
						policy: result.policy,
						nodeAddress: resultStorageNode.spec.address[0].split(':')[0]
					}
					if (resultStorageNode.spec.token !== undefined) {
						req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
					}
					req.params.storage = encodeURIComponent(JSON.stringify(storageData))
					req.url += '/' + req.params.storage
					proxy.web(req, res, {target: 'https://' + resultStorageNode.spec.address[0]})
				})
			})
		} else {
			res.json()
		}
	})
})


app.post('/:apiVersion/:group/Volume/upload/:volumeName/:id/:total/:index', (req, res) => {
	let volumeName = req.params.volumeName
	api['v1'].getOne({ metadata: {name: volumeName, group: req.params.group}, kind: 'Volume'}, (err, result) => {
		if (result.name !== undefined && result.name == volumeName) {
			api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
				api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
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
					if (resultStorageNode.spec.token !== undefined) {
						req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
					}
					req.params.storage = encodeURIComponent(JSON.stringify(storageData))
					req.url += req.params.storage
					proxy.web(req, res, {target: 'https://' + resultStorageNode.spec.address[0]})
				})
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
			api['v1'].getOne({metadata: {name: result.storage, group: GE.LABEL.PWM_ALL}, kind: 'Storage'}, (err, resultStorage) => {
				api['v1'].describe({metadata: {name: resultStorage.mountNode, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultStorageNode) => {
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
					if (resultStorageNode.spec.token !== undefined) {
						req.headers.authorization = 'Bearer ' + resultStorageNode.spec.token	
					}
					req.params.storage = encodeURIComponent(JSON.stringify(storageData))
					req.url += req.params.storage
					proxy.web(req, res, {target: 'https://' + resultStorageNode.spec.address[0]})
				})
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
 		logger.pwmapi.info(GE.LOG.SHELL.REQUEST, authUser, qs.containername, GE.ipFromReq(req))
 		if (authUser) {
 			let authGroup = jwt.verify(qs.token, process.env.secret).data.group
 			api['v1'].describe({kind: 'Workload', metadata: {name: qs.containername, group: authGroup}}, (err, result) => {
 				if (result.currentStatus == GE.WORKLOAD.RUNNING) {
 					if (result.metadata.group == authGroup) {
						api['v1'].describe({ metadata: {name: result.scheduler.node, group: GE.LABEL.PWM_ALL}, kind: 'Node'}, (err, resultNode) => {
							if (resultNode.spec.token !== undefined) {
								req.headers.authorization = 'Bearer ' + resultNode.spec.token	
							}
							proxy.ws(req, socket, head, {target: 'wss://' + result.scheduler.nodeProperties.address[0]})	
						})
 					} else {
 						logger.pwmapi.error('401', GE.LOG.SHELL.GROUP_NOT_MATCH, authUser, qs.containername, authGroup, GE.ipFromReq(req))
 					}
 				} else {
 					logger.pwmapi.warn('401', GE.LOG.SHELL.WK_NOT_RUNNING, authUser, qs.containername, authGroup, GE.ipFromReq(req))
 				}
 			})
		} else {
			logger.pwmapi.error('401', GE.LOG.SHELL.NOT_AUTH, authUser, qs.containername, authGroup, GE.ipFromReq(req))
		}
	} catch (err) {
		console.log('ws upgrade:', err)
		logger.pwmapi.fatal(GE.LOG.SHELL.REQUEST, err.toString(), GE.ipFromReq(req))
	}
})

proxy.on('error', function (err) {
 	console.log('error', err)
})

if (StartServer == true) {
	server.listen(process.env.port || 3000)
}

process.on('unhandledRejection', (reason, p) => {
 console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
})