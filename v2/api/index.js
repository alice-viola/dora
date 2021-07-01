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

const rateLimiter = require('./src/rate-limiter')
const ipFilter = require('./src/ip-filter')


let ipFromReq = (req) => {
	let ip = req.headers['x-original-forwarded-for'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
	return ip
}


let api = {
	v1: require('../core').Api.Interface, 
	'v1.experimental': require('../core').Api.Interface, 
	v2: require('../core').Api.Interface
}

let VolumeOperations = require('../core').Driver.DockerVolumeOperations

let Class = require('../core').Model.Class

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

app.use(expressIpFilter(ipFilter.ipBlacklist()))

app.use((err, req, res, _next) => {
 	if (err instanceof IpDeniedError) {
 	  	res.sendStatus(401)
 	} else {
 		_next()
 	}
})

app.use(rateLimiter)

app.use(express.static('public'))

app.use(bearerToken())

/**
*	Pre auth routes
*/
app.all('*', (req, res, next) => {
	next()
})


app.all('/:apiVersion/**', (req, res, next) => {
	if (api[req.params.apiVersion] == undefined) {
		res.sendStatus(401)
	} else {
		next()
	}
})

app.all('/:apiVersion/:group/:resourceKind/:operation', (req, res, next) => {
	api[req.params.apiVersion].checkUser(req, (response) => {
		if (response.err == null && response.data == true) {
			next()
		} else {
			if (response.data == false) {
				ipFilter.addIpToBlacklist(ipFromReq(req))
				res.sendStatus(401)	
			} else {
				res.sendStatus(500)	
			}
		}
	})	
})

app.all('/:apiVersion/:group/:resourceKind/:operation/*', (req, res, next) => {
	api[req.params.apiVersion].checkUser(req, (response) => {
		if (response.err == null && response.data == true) {
			next()
		} else {
			if (response.data == false) {
				ipFilter.addIpToBlacklist(ipFromReq(req))
				res.sendStatus(401)	
			} else {
				res.sendStatus(500)	
			}
		}
	})	
})

app.all('/:apiVersion/:group/:resourceKind/:operation/:name/**', (req, res, next) => {
	api[req.params.apiVersion].checkUser(req, (response) => {
		if (response.err == null && response.data == true) {
			next()
		} else {
			if (response.data == false) {
				ipFilter.addIpToBlacklist(ipFromReq(req))
				res.sendStatus(401)	
			} else {
				res.sendStatus(500)	
			}
		}
	})	
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

app.post('/:apiVersion/:group/user/groups', async (req, res) => {
	api[req.params.apiVersion].getOne(req.params.apiVersion, {kind: 'User', metadata: {name: req.session.user, group: req.session.userGroup}}, async (err, result) => {
		if (result.length == 1) {
			let user = new Class.User(result[0])
			let exist = await user.$exist() 
			if (exist.err == null && exist.data.exist == true) {

				user = new Class.User(exist.data.data)
				console.log(user.groups)
				res.json(await user.workspaces(Class.Role, Class.Workspace))
			} else {
				res.sendStatus(404)
			}
		} else {
			res.sendStatus(404)
		}
		
	}, false)
})

app.post('/:apiVersion/-/User/credits', (req, res) => {
	console.log(req.url)
	api[req.params.apiVersion].getOne(req.params.apiVersion, {kind: 'Usercredit', metadata: {name: req.session.user}}, async (err, result) => {
		console.log(err, result)
		if (result.length == 1) {
			let user = new Class.Usercredit(result[0])
			
			res.json(user._p.computed)
		} else {
			res.sendStatus(404)
		}
		
	}, false)
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
	  data: {user: req.session.user, group: req.body.group || req.session.defaultGroup}
	}, process.env.secret)
	res.json(token)
})

app.post('/:apiVersion/:group/Container/token', (req, res) => {
	let token = jwt.sign({
	  exp: Math.floor(Date.now() / 1000) + (5), // 5 seconds validity
	  data: {user: req.session.user, group: req.body.group || req.session.defaultGroup}
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
		
		// let queue = []
		// req.body.data.forEach((doc) => {
		// 	queue.push((cb) => {
		// 		doc.user = getUserDataFromRequest(req)
		// 		doc._userDoc = req.session._userDoc
		// 		api[req.params.apiVersion][req.params.operation](doc, (err, result) => {
		// 			cb(err == false ? null : err)	
		// 		})
		// 	})
		// })
		// async.series(queue, (err, result) => {
		// 	
		// 	if (req.params.operation == 'apply' || req.params.operation == 'delete') {
		// 		GE.Emitter.emit(GE.ApiCall)	
		// 	}
		// 	if (err) {
		// 		res.json('Error in batch ' + req.params.operation)
		// 	} else {
		// 		res.json('Batch ' + req.params.operation + ' applied')
		// 	}
		// })
	} else {
		if (Class[req.params.resourceKind] == undefined) {
			res.json({err: true, data: 'Resource Kind not exist'})
			return
		}
		//let data = req.body.data == undefined ? {kind: req.params.resourceKind, metadata: {group: req.params.group, workspace: req.params.group}} : req.body.data
		let data = req.body.data == undefined ? {kind: req.params.resourceKind} : req.body.data
		if (Class[req.params.resourceKind].IsZoned == true) {
			if (data.metadata == undefined) {
				data.metadata = {}	
			}
			data.metadata.zone = process.env.ZONE
		}
		if (Class[req.params.resourceKind].IsWorkspaced == true) {
			if (data.metadata == undefined) {
				data.metadata = {}	
			}
			if (req.params.group == '-' && data.metadata.group == undefined) {
				data.metadata.group = req.session.defaultWorkspace 
				data.metadata.workspace = req.session.defaultWorkspace 
			} else if (req.params.group == '-' && data.metadata.group != undefined) {
				// It's ok
			} else {
				data.metadata.group = req.params.group	
				data.metadata.workspace = req.params.group	
			}
		}
		data.owner = req.session.user
		// console.log('324', data)
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
	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		let workspace = req.params.group !== '-' ?  req.params.group : req.session.defaultGroup
		api['v2'].getOne('v2', {
			kind: 'Volume',
			workspace: workspace,
			name: req.params.volumeName
		}, (err, resultVolume) => {
			if (resultVolume.length == 1) {
				api['v2'].getOne('v2', {
					kind: 'Storage',
					name: resultVolume[0].storage
				}, (err, resultStorage) => {
					if (resultStorage.length == 1) {
						let storageData = {
							rootName: resultStorage[0].name,
							kind: resultStorage[0].type,
							name: 'dora.volume.' + workspace + '.' + req.params.volumeName,
							containerName: 'dora.sync.' + workspace + '.' + req.params.volumeName,
							group: workspace,
							server: resultStorage[0].endpoint,
							rootPath: resultStorage[0].mountpath,
							subPath: workspace + '/' + req.params.volumeName,
							policy: resultVolume[0].policy || 'rw',
							nodeAddress: '192.168.180.150'
						}
						uploadMem[req.params.uploadId] = {
							storageData: storageData
						}
						cb({err: null, data: storageData})
					} else {
						cb({err: true, data: null})
					}
				})
			} else {
				cb({err: true, data: null})
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

	let upload = (storageData, req, res) => {
		switch (storageData.kind.toLowerCase()) {
			case 'nfs': // Proxy direct to storage
				req.params.storage = storageData
				VolumeOperations.operation('upload', req, res)
			case 'local': // Proxy to node
				break
	
		} 
	}

	if (uploadMem[req.params.uploadId] == undefined) {
		getUploadStorageData((response) => {
			if (response.err == null) {
				upload(uploadMem[req.params.uploadId].storageData, req, res)
			} else {
				res.sendStatus(403)
			}
		})
	} else {
		upload(uploadMem[req.params.uploadId].storageData, req, res)
	} 

})

app.post('/v1.experimental/:group/Volume/ls/:volumeName/:path', (req, res) => {
	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		let workspace = req.params.group !== '-' ?  req.params.group : req.session.defaultGroup
		api['v2'].getOne('v2', {
			kind: 'Volume',
			workspace: workspace,
			name: req.params.volumeName
		}, (err, resultVolume) => {
			if (resultVolume.length == 1) {
				api['v2'].getOne('v2', {
					kind: 'Storage',
					name: resultVolume[0].storage
				}, (err, resultStorage) => {
					if (resultStorage.length == 1) {
						let storageData = {
							rootName: resultStorage[0].name,
							kind: resultStorage[0].type,
							name: 'dora.volume.' + workspace + '.' + req.params.volumeName,
							containerName: 'dora.sync.' + workspace + '.' + req.params.volumeName,
							group: workspace,
							server: resultStorage[0].endpoint,
							rootPath: resultStorage[0].mountpath,
							subPath: workspace + '/' + req.params.volumeName,
							policy: resultVolume[0].policy || 'rw',
							nodeAddress: '192.168.180.150'
						}
						uploadMem[req.params.uploadId] = {
							storageData: storageData
						}
						cb({err: null, data: storageData})
					} else {
						cb({err: true, data: null})
					}
				})
			} else {
				cb({err: true, data: null})
			}
		})
	}
	let execProxy = () => {
		req.headers.authorization = 'Bearer ' + uploadMem[req.params.uploadId].nodeToken
		let storage = encodeURIComponent(JSON.stringify(uploadMem[req.params.uploadId].storageData))	
		// let host = '192.168.180.150'
		// let port = 3001
		let url = `${'https://' + uploadMem[req.params.uploadId].proxyAddress}/${'v1.experimental'}/${req.params.group}/Volume/ls/${req.params.volumeName}/-/${encodeURIComponent(req.params.uploadId)}/${storage}/${encodeURIComponent(req.params['0'])}`
		proxy.web(req, res, {target: url, ignorePath: true})
	} 
	
	let ls = (storageData, req, res) => {
		switch (storageData.kind.toLowerCase()) {
			case 'nfs': // Proxy direct to storage
				req.params.storage = storageData
				req.url += '/-'
				VolumeOperations.operation('ls', req, res)
			case 'local': // Proxy to node

				break
	
		} 
	}

	if (uploadMem[req.params.uploadId] == undefined) {
		getUploadStorageData((response) => {
			if (response.err == null) {
				ls(uploadMem[req.params.uploadId].storageData, req, res)
			} else {
				res.sendStatus(403)
			}
		})
	} else {
		ls(uploadMem[req.params.uploadId].storageData, req, res)
	} 
})

app.post('/v1.experimental/:group/Volume/download/:volumeName', (req, res) => {
	let getUploadStorageData = function (cb) {
		let volumeName = req.params.volumeName
		let workspace = req.params.group !== '-' ?  req.params.group : req.session.defaultGroup
		api['v2'].getOne('v2', {
			kind: 'Volume',
			workspace: workspace,
			name: req.params.volumeName
		}, (err, resultVolume) => {

			if (resultVolume.length == 1) {
				api['v2'].getOne('v2', {
					kind: 'Storage',
					name: resultVolume[0].storage
				}, (err, resultStorage) => {

					if (resultStorage.length == 1) {
						let storageData = {
							rootName: resultStorage[0].name,
							kind: resultStorage[0].type,
							name: 'dora.volume.' + workspace + '.' + req.params.volumeName,
							containerName: 'dora.sync.' + workspace + '.' + req.params.volumeName,
							group: workspace,
							server: resultStorage[0].endpoint,
							rootPath: resultStorage[0].mountpath,
							subPath: workspace + '/' + req.params.volumeName,
							policy: resultVolume[0].policy || 'rw',
							nodeAddress: '192.168.180.150'
						}
						uploadMem[req.params.uploadId] = {
							storageData: storageData
						}
						cb({err: null, data: storageData})
					} else {
						cb({err: true, data: null})
					}
				})
			} else {
				cb({err: true, data: null})
			}
		})
	}
	let execProxy = () => {
		req.headers.authorization = 'Bearer ' + uploadMem[req.params.uploadId].nodeToken
		let storage = encodeURIComponent(JSON.stringify(uploadMem[req.params.uploadId].storageData))	
		// let host = '192.168.180.150'
		// let port = 3001
		let url = `${'https://' + uploadMem[req.params.uploadId].proxyAddress}/${'v1.experimental'}/${req.params.group}/Volume/ls/${req.params.volumeName}/-/${encodeURIComponent(req.params.uploadId)}/${storage}/${encodeURIComponent(req.params['0'])}`
		proxy.web(req, res, {target: url, ignorePath: true})
	} 
	
	let download = (storageData, req, res) => {
		switch (storageData.kind.toLowerCase()) {
			case 'nfs': // Proxy direct to storage
				req.params.storage = storageData
				req.url += '/' + encodeURIComponent('/') +'/-'
				VolumeOperations.operation('download', req, res)
			case 'local': // Proxy to node

				break
	
		} 
	}

	if (uploadMem[req.params.uploadId] == undefined) {
		getUploadStorageData((response) => {
			if (response.err == null) {

				download(uploadMem[req.params.uploadId].storageData, req, res)
			} else {
				res.sendStatus(403)
			}
		})
	} else {
		download(uploadMem[req.params.uploadId].storageData, req, res)
	} 
})

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

server.on('upgrade', function (req, socket, head) {
	try {
		
		let qs = querystring.decode(req.url.split('?')[1])
 		let authUser = jwt.verify(qs.token, process.env.secret).data.user
 		//logger.pwmapi.info(GE.LOG.SHELL.REQUEST, authUser, qs.containername, GE.ipFromReq(req))
 		if (authUser) {
 			let authGroup = jwt.verify(qs.token, process.env.secret).data.group
 			api['v1'].describe('v1', {kind: 'Container', metadata: {name: qs.containername, group: authGroup}}, (err, result) => {
 				if (result.length == 1) {
 					result = result[0]
 				} else {
 					return
 				}
 				if (result.observed !== undefined && result.observed !== null && result.observed.state == 'running') {
 					if (result.workspace == authGroup) {
						api['v1'].describe('v1', { metadata: {name: qs.node}, kind: 'Node'}, (err, resultNode) => {
 							if (resultNode.length == 1) {
 								resultNode = resultNode[0]
 							} else {
 								return
 							}
							if (resultNode.resource.token !== undefined) {
								req.headers.authorization = 'Bearer ' + resultNode.resource.token
							}
							proxy.ws(req, socket, head, {target: 'wss://' + resultNode.resource.endpoint.split('://')[1]})	
						})
 					} else {
 						//logger.pwmapi.error('401', GE.LOG.SHELL.GROUP_NOT_MATCH, authUser, qs.containername, authGroup, GE.ipFromReq(req))
 					}
 				} else {
 					//logger.pwmapi.warn('401', GE.LOG.SHELL.WK_NOT_RUNNING, authUser, qs.containername, authGroup, GE.ipFromReq(req))
 				}
 			})
		} else {
			////logger.pwmapi.error('401', GE.LOG.SHELL.NOT_AUTH, authUser, qs.containername, authGroup, GE.ipFromReq(req))
		}
	} catch (err) {
		console.log('ws upgrade:', err)
		////logger.pwmapi.fatal(GE.LOG.SHELL.REQUEST, err.toString(), GE.ipFromReq(req))
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