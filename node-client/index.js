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
let shell = require('shelljs')
const compressing = require('compressing')
let docker = new Docker()
let nvidiaDocker = require('./src/nvidia-docker')
const si = require('systeminformation')
let api = require('./src/api')

let app = express()

const server = http.createServer(app)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.raw({ type: 'application/gzip' }))


app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/alive', (req, res) => {
	res.json()
})

app.get('/sys/info', async (req, res) => {
	let data = {}
	data.arch = await os.arch()
	data.cpus = await si.cpu()
	data.currentLoad = await si.currentLoad()
	data.mem = await si.mem()
	res.json(data)
})

app.get('/cpu/info', async (req, res) => {
	let data = []
	let cpus = os.cpus()
	let load = await si.currentLoad()
	let index = 0
	cpus.forEach ((cpu) => {
		data.push({
			uuid: os.hostname() + ' ' + cpu.model + ' ' + index, 
			product_name: cpu.model,
			speed: cpu.speed,
			load: load.cpus[index].load
		})
		index += 1
	})
	
	res.json(data)
})

if (process.env.mode == 'dummy') {
app.get('/gpu/info', (req, res) => {
	res.json([
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-01',
	    fb_memory_usage: '0 MiB',
	    minor_number: 0,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-02',
	    fb_memory_usage: '0 MiB',
	    minor_number: 1,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-03',
	    fb_memory_usage: '0 MiB',
	    minor_number: 2,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-04',
	    fb_memory_usage: '0 MiB',
	    minor_number: 3,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-05',
	    fb_memory_usage: '0 MiB',
	    minor_number: 4,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-06',
	    fb_memory_usage: '0 MiB',
	    minor_number: 5,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-07',
	    fb_memory_usage: '0 MiB',
	    minor_number: 6,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-08',
	    fb_memory_usage: '0 MiB',
	    minor_number: 7,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01'
	  }
	])
})
} else {
	app.get('/gpu/info', (req, res) => {
		api.gpu.info(null, (err, gpus) => {
			res.json(gpus)
		})
	})
}

app.post('/workload/pull/status', (req, res) => {
	console.log('Pull status request', req.body)
	nvidiaDocker.pullStatus(req.body, (result) => {
		console.log('->', result)
		res.json(result)
	})
})

app.post('/workload/pull', (req, res) => {
	console.log('Pull request', req.body)
	res.json({})
	nvidiaDocker.pull(req.body, (result) => {})
})

app.post('/workload/create', (req, res) => {
	console.log('Create request', req.body)
	nvidiaDocker.launch(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/status', (req, res) => {
	console.log('Status request', req.body)
	nvidiaDocker.status(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/delete', (req, res) => {
	console.log('Delete request', req.body)
	nvidiaDocker.delete(req.body, (result) => {
		res.json(result)
	})
})

/*
app.post('/workingdir/create/local', (req, res) => {
	console.log('Create workingdir request', req.body)
	let volumeFolder = req.body.volume.spec.mount.local.folder
	let workingdirSubpath = req.body.workingdir.spec.volume.subpath
	if (volumeFolder[volumeFolder.length -1 ] == '/') {
		volumeFolder = volumeFolder.substring(volumeFolder.length)
	}
	if (workingdirSubpath[0] !== '/') {
		workingdirSubpath = '/' + workingdirSubpath
	}
	console.log('creating', volumeFolder + workingdirSubpath)
	fs.mkdir(volumeFolder + workingdirSubpath, { recursive: true }, (err) => {
	  	if (err) {
	  		res.json({created: false})
	  	} else {
	  		res.json({created: true})
	  	}
	})
})*/

app.post('/workingdir/create/local', (req, res) => {
	console.log('Create workingdir volume request', req.body)
	nvidiaDocker.createVolume({name: req.body.workingdir.metadata.name }, (result) => {
		res.json({created: result})
	})
})

app.post('/workingdir/delete/local', (req, res) => {
	console.log('Create workingdir volume request', req.body)
	nvidiaDocker.deleteVolume({name: req.body.workingdir.metadata.name }, (result) => {
		res.json({created: result})
	})
})
// ls /home/amedeo1.pwm.extracted
app.post('/volume/upload/:nodename/:dst', function(req, res) {
	console.log('Recv upload')
    req.pipe(fs.createWriteStream(path.join(req.params.dst)))
    req.on('end', async () => {
    	console.log(req.params)
    	await compressing.tar.uncompress(req.params.dst, './uploads/' + req.params.dst + '.pwm.extracted')
    	let busyboxName = randomstring.generate(24).toLowerCase()
    	let runBusy = shell.exec(`docker run -d --mount source=${req.params.dst},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
    	console.log('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.' + ' ' + busyboxName + `:/mnt/${busyboxName}`)
    	let result = shell.exec('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.  ' + busyboxName + `:/mnt/${busyboxName}/` )
    	shell.exec(`docker stop ${busyboxName}`)
    	shell.exec(`docker rm ${busyboxName}`)
        res.end('Upload complete')
    })
})

// TODO
app.post('/volume/download/:nodename/:dst', function(req, res) {
	console.log('Recv download')
    req.pipe(fs.createWriteStream(path.join(req.params.dst)))
    req.on('end', async () => {
    	console.log(req.params)
    	await compressing.tar.uncompress(req.params.dst, './uploads/' + req.params.dst + '.pwm.extracted')
    	let busyboxName = randomstring.generate(24).toLowerCase()
    	let runBusy = shell.exec(`docker run -d --mount source=${req.params.dst},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
    	console.log('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.' + ' ' + busyboxName + `:/mnt/${busyboxName}`)
    	let result = shell.exec('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.  ' + busyboxName + `:/mnt/${busyboxName}/` )
    	shell.exec(`docker stop ${busyboxName}`)
    	shell.exec(`docker rm ${busyboxName}`)
        res.end('Upload complete')
    })
})

var DockerServer = require('./src/web-socket-docker-server')
new DockerServer({
  path: '/pwm/cshell',
  port: 3001,
  server: server,
})

server.listen(3001)