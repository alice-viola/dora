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
const compressing = require('compressing')
const splitFile = require('split-file')

const si = require('systeminformation')
const homedir = require('os').homedir()
let api = require('./src/api')

let version = require('./version')

//  ____       _                    
// |  _ \ _ __(_)_   _____ _ __ ___ 
// | | | | '__| \ \ / / _ \ '__/ __|
// | |_| | |  | |\ V /  __/ |  \__ \
// |____/|_|  |_| \_/ \___|_|  |___/
//                                  
let drivers = {
	'pwm.docker': require('./src/drivers/docker/index'),
	'pwm.nvidiadocker': require('./src/drivers/docker/index')
}

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

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/update', (req, res) => {
	let ota = require('./src/ota')
	ota.exec(hasGpus, (response) => {
		res.send(response)
	})
})

app.get('/alive', (req, res) => {
	res.sendStatus(200)
})

app.get('/:apiVersion/resource/status', async (req, res) => {
	let data = {}
	data.version = version
	data.sys = {}
	data.cpus = []
	data.gpus = []

	// Sys
	data.sys.arch = await os.arch()
	data.sys.cpus = await si.cpu()
	data.sys.currentLoad = await si.currentLoad()
	data.sys.mem = await si.mem()
	
	// Cpu
	let cpus = os.cpus()
	let index = 0
	cpus.forEach ((cpu) => {
		data.cpus.push({
			uuid: cpu.model + ' ' + index, 
			product_name: cpu.model,
			speed: cpu.speed,
			load: data.sys.currentLoad.cpus[index].load
		})
		index += 1
	})

	// Gpu
	api.gpu.info(null, (err, gpus) => {
		hasGpus = gpus.length > 0
		data.gpus = gpus
		res.json(data)
	})
})

app.post('/:apiVersion/:driver/:verb', (req, res) => {
	if (drivers[req.params.driver] && drivers[req.params.driver][req.params.verb]) {
		drivers[req.params.driver][req.params.verb](req.body.data, (response) => {
			res.json(response)
		})
	} else if (req.params.driver == 'batch') { 
		let quene = []
 		quene.push((st) => {
 			let _drivers = {}
			req.body.data.forEach((body) => {
				if (_drivers[body.spec.driver] == undefined) {
					_drivers[body.spec.driver] = []
				} 
				_drivers[body.spec.driver].push(body)
			})
			Object.keys(_drivers).forEach((driver) => {
				if (drivers[driver] !== undefined && drivers[driver] !== null) {
					drivers[driver][req.params.verb](_drivers[driver], (result) => {
						st(null, result)
					})
				} else {
					st(null, 'Not valid driver')
				}
			}) 

		})
		async.parallel(quene, (err, results) => {
			res.json(results.flat())	
		})
	} else {
		res.sendStatus(404)
	}
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

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:id/:total/:index/:storage', function (req, res) {
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

app.post('/:apiVersion/:group/Volume/ls/:volumeName/:storage', function (req, res) {
    let tmp = require('os').tmpdir()
    let dockerDriver = require('./src/drivers/docker/driver')
    let storageData = JSON.parse(req.params.storage)
    dockerDriver.lsVolume(storageData, (status, response) => {
        if (status == true) {
          res.json(response)
        } else {
          res.sendStatus(404)
        }
    })
})

pem.createCertificate({ days: 1, selfSigned: true }, function (err, keys) {
  	if (err) {
  	  throw err
  	}
  	let server = https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(process.env.PORT || 3001)

	var DockerServer = require('./src/web-socket-docker-server')
	new DockerServer({
	  path: '/pwm/cshell',
	  port: process.env.PORT || 3001,
	  server: server,
	})
})


