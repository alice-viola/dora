'use strict'

var https = require('https')
var pem = require('pem')
let express = require('express')
let expressFileUpload = require('express-fileupload')
let bodyParser = require('body-parser')
let Docker = require('dockerode')
let randomstring = require('randomstring')
let fs = require('fs')
let http = require('http')
let os = require('os')
let path = require('path')
let async = require('async')
let shell = require('shelljs')
let jwt = require('jsonwebtoken')
const bearerToken = require('express-bearer-token')
const compressing = require('compressing')
const splitFile = require('split-file')
let httpProxy = require('http-proxy')


// TODO: remove
let proxy = httpProxy.createProxyServer({secure: false})
proxy.on('error', function (err, req, res) {
  	res.writeHead(500, { 'Content-Type': 'text/plain'})
  	res.end('Something went wrong')
  	console.error(err)
})


const si = require('systeminformation')
const homedir = require('os').homedir()
let api = require('./src/api')

let version = require('./version')
process.env.VERSION = version

//  ____       _                    
// |  _ \ _ __(_)_   _____ _ __ ___ 
// | | | | '__| \ \ / / _ \ '__/ __|
// | |_| | |  | |\ V /  __/ |  \__ 
// |____/|_|  |_| \_/ \___|_|  |___/
//              
let drivers = {
	'pwm.docker': require('./src/drivers/docker/index'),
	'pwm.nvidiadocker': require('./src/drivers/docker/index')
}

/**
*	Scheduler
*/
let scheduler = require('./src/scheduler/scheduler')
scheduler.set()
scheduler.start()

let hasGpus = false

if (process.env.joinToken !== undefined) {
	axios({
	  method: 'POST',
	  url: `${process.env.apiAddress}/v1/node/apply`,
	  headers: {
	    'Authorization': `Bearer ${process.env.joinToken}`
	  },
	  data: {data: {
	  	apiVersion: 'v1',
	  	kind: 'Node',
	  	metadata: {
	  		name: os.hostname(),
	  	},
	  	spec: {
	  		maintenance: false,
	  		address: [process.env.address],
	  		allow: [process.env.allow]
	  	} 
	  }}
	}).then((res) => {
		console.log(res.data)
		process.exit()
	})	
}

let app = express()

app.use(bodyParser.json({limit: '200mb', extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.raw({ type: 'application/gzip' }))


/**
*	Pre auth route
*/
function isValidToken (req, token) {
	try {
		let decoded = jwt.verify(token, process.env.secret)
		return true
	} catch (err) {
		return false
	}
}

app.all('*', (req, res, next) => {
	console.log(req.url)
	next()
})


if (process.env.REQUIRE_TOKEN_AUTH == true || process.env.REQUIRE_TOKEN_AUTH == 'true') {
	app.use(bearerToken())
	app.all('*', (req, res, next) => {
		if (isValidToken(req, req.token)) {
			console.log(req.url, 200)
			next()	
		} else {
			console.log(req.url, 401)
			res.sendStatus(401)
		}
	})
}

app.get('/alive', (req, res) => {
	res.sendStatus(200)
})

/**
*	Proxied routes
*/
app.post('/:apiVersion/:group/Workload/:operation/:name/:cname', (req, res) => {
	let dockerDriver = require('./src/drivers/docker/driver')
	dockerDriver[req.params.operation](req.params.cname, (response) => {
		res.send(response)
	})
})

app.post('/:apiVersion/:group/Workload/commit/:name/:reponame/:cname', (req, res) => {
	let dockerDriver = require('./src/drivers/docker/driver')
	if (req.params.reponame == '-') {
		dockerDriver['commitLocalFn']({name: req.params.cname, reponame: req.params.reponame}, (response) => {
			res.send(response)
		})			
	} else {
		dockerDriver['commit']({name: req.params.cname, reponame: req.params.reponame}, (response) => {
			res.send(response)
		})		
	}
})


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

let volumeNetworkOperation = require('./src/drivers/docker/volumes_network_operations')

app.post('/v1.experimental/:group/Volume/ls/:volumeName/:path/:storage', async function (req, res) {
	volumeNetworkOperation.operation('ls', req, res)
})

app.post('/v1.experimental/:group/Volume/download/:volumeName/:path/:storage', async function (req, res) {
	volumeNetworkOperation.operation('download', req, res)
})

app.all('/v1.experimental/:group/Volume/upload/:volumeName/:info/:uploadId/:storage/:tus', async function (req, res) {
	//console.log(req.url)
	volumeNetworkOperation.operation('upload', req, res)
})

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////


app.post('/:apiVersion/:group/Volume/upload/:volumeName/:uploadInfo/:storage', async function (req, res) {
	try {
		let dockerDriver = require('./src/drivers/docker/driver')
		let storageData = JSON.parse(req.params.storage)
		let uploadInfo = JSON.parse(req.params.uploadInfo)
		storageData.id = 'pwmsync-' + storageData.name + '-' + uploadInfo.id
		dockerDriver.getRunningContainerByName(storageData.id, (err, responseContainer) => {
			if (uploadInfo.event !== undefined && uploadInfo.event == 'exit') {
				if (err == null) {
					dockerDriver.stopContainer(storageData.id, () => {
						res.sendStatus(200)
					})	
				}
			} else {
				if (err == null) {
					responseContainer.inspect(function (err, data) {
						let port = data.NetworkSettings.Ports['3002/tcp'][0].HostPort
						proxy.web(req, res, {target: 'http://' + storageData.nodeAddress + ':' + port})
					})
				} else {
					dockerDriver.createSyncContainer(storageData, (responseContainer) => {
						responseContainer.inspect(function (err, data) {
							let port = data.NetworkSettings.Ports['3002/tcp'][0].HostPort
							setTimeout(() => {proxy.web(req, res, {target: 'http://' + storageData.nodeAddress + ':' + port})}, 1000)	
						})
					})				
				}
			}
		}) 
	} catch (err) {
		console.log('PROXY UPLOAD ERROR', err)
	}
})

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:id/:total/:index/:storage', async function (req, res) {
	let tmp = require('os').tmpdir()
	if (req.params.index == 'end') {
		let compressedDir = tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + req.params.index
		let uncompressedDir = tmp + '/' + req.params.volumeName + '-' + req.params.id + '-extracted'

		let names = []
		for (var i = 1; i <= req.params.total; i += 1) {
			names.push( path.join(tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + i) )
		}
		splitFile.mergeFiles(names, compressedDir).then(async () => {
			let dockerDriver = require('./src/drivers/docker/driver')
			let storageData = JSON.parse(req.params.storage)
			storageData.archive = compressedDir
			dockerDriver.createVolume(storageData, (response) => {
				res.sendStatus(200)
			})
		}).catch((err) => {
			console.log('Error: ', err)
		})
	} else if (req.params.index == 'endweb') {
		let compressedDir = tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + req.params.index
		let compressedDirTar = compressedDir + '.tar'
		let names = []
		for (var i = 1; i <= req.params.total; i += 1) {
			names.push( path.join(tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + i) )
		}
		names.forEach(async () => {
			let dockerDriver = require('./src/drivers/docker/driver')
			let storageData = JSON.parse(req.params.storage)
			await compressing.tar.compressDir(compressedDir, compressedDirTar)
			storageData.archive = compressedDirTar
			dockerDriver.createVolume(storageData, (response) => {
				res.sendStatus(200)
			})			
		})
	} else {
		req.pipe(fs.createWriteStream(path.join(tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + req.params.index)))	
		req.on('end', async () => {
			res.end('Upload complete')
		})
	}
})

app.post('/:apiVersion/:group/Volume/download/:volumeName/:storage', function (req, res) {
  let tmp = require('os').tmpdir()
  let dockerDriver = require('./src/drivers/docker/driver')
  let storageData = JSON.parse(req.params.storage)
  dockerDriver.getVolume(storageData, (status, response) => {
      if (status == true) {
        response.pipe(res)
      } else {
        res.sendStatus(404)
      }
  })
})

/**
* 	Startup the server
*/
let server = null
function createDockerServer (server) {
	var DockerServer = require('./src/web-socket-docker-server')
	if (process.env.REQUIRE_TOKEN_AUTH == true || process.env.REQUIRE_TOKEN_AUTH == 'true') {
		new DockerServer({
		  path: '/pwm/cshell',
		  port: process.env.PORT || 3001,
		  server: server,
		  secureFunction: (socket, request, server) => {
		  	console.log(request.headers.authorization.split('Bearer ')[1])
		  	if (request.headers.authorization !== undefined) {
		  		let valid = isValidToken(request, request.headers.authorization.split('Bearer ')[1])
		  		if (valid == true) {
		  			server.onConnection(socket, request)	
		  		} else {
		  			socket.close()
		  		}
		  	} else {
		  		socket.close()
		  	}
		  }
		})
	} else {
		new DockerServer({
		  path: '/pwm/cshell',
		  port: process.env.PORT || 3001,
		  server: server,
		})
	}
}

process.on('unhandledRejection', (reason, p) => {
console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
try {} catch (err) {}   
})

proxy.on('unhandledRejection', (reason, p) => {
console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
try {} catch (err) {}   
})

if (process.env.USE_SSL_CERTS == 'true' || process.env.USE_SSL_CERTS == true) {
	const KEY = fs.readFileSync(process.env.SSL_KEY || '/etc/ssl/certs/pwmkey.pem')
	const CRT = fs.readFileSync(process.env.SSL_CERT || '/etc/ssl/certs/pwmcrt.pem')
	server = https.createServer({ key: KEY, cert: CRT}, app).listen(process.env.PORT || 3001)
	createDockerServer(server)
} else {
	pem.createCertificate({ days: 365, selfSigned: true }, function (err, keys) {
	  	if (err) {
	  	  throw err
	  	}
	  	server = https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(process.env.PORT || 3001)
	  	createDockerServer(server)
	})
}