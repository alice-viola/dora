'use strict'

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

//  address=192.168.180.150:3001 allow=CPUWorkload apiAddress=http://localhost:3000 joinToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7Im5vZGUiOiJhbm9kZSJ9LCJleHAiOjE2MDI0OTUyMzcsImlhdCI6MTYwMjQ5NDMzN30.IYtwHaDaoj7PpfHHn_RxsaBP6DeYcDRjYAKLswpgbrc  node index.js 
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

const server = http.createServer(app)

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
			uuid: os.hostname() + ' ' + cpu.model + ' ' + index, 
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
				drivers[driver][req.params.verb](_drivers[driver], (result) => {
					st(null, result)
				})
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

app.post('/:apiVersion/volume/upload/:volumeName/:id/:total/:index/:storage', function (req, res) {
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
				res.send(200)
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

app.post('/:apiVersion/volume/download/:volumeName/:storage', function (req, res) {
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

var DockerServer = require('./src/web-socket-docker-server')
new DockerServer({
  path: '/pwm/cshell',
  port: process.env.PORT || 3001,
  server: server,
})

server.listen(process.env.PORT || 3001)