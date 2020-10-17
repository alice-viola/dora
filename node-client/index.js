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
let axios = require('axios')
let shell = require('shelljs')
const compressing = require('compressing')
let docker = new Docker()
let nvidiaDocker = require('./src/nvidia-docker')
const si = require('systeminformation')
const homedir = require('os').homedir()
let api = require('./src/api')

let version = require('./version')

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

app.get('/alive', (req, res) => {
	res.json()
})

app.get('/resource/status', async (req, res) => {
	let data = {}
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
		data.gpus = gpus
		res.json(data)
	})
})

app.post('/workload/pull/status', (req, res) => {
	console.log('Pull status request', req.body)
	nvidiaDocker.pullStatus(req.body, (result) => {
		console.log('->', result)
		res.json(result)
	})
})

app.post('/workloads/pull/status', (req, res) => {
	nvidiaDocker.batchPullStatus(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/pull', (req, res) => {
	res.json({})
	nvidiaDocker.pull(req.body, (result) => {})
})

app.post('/workload/create', (req, res) => {
	nvidiaDocker.launch(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/status', (req, res) => {
	nvidiaDocker.status(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workloads/status', (req, res) => {
	nvidiaDocker.batchStatus(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/logs', (req, res) => {
	nvidiaDocker.logs(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/delete', (req, res) => {
	nvidiaDocker.delete(req.body, (result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/node/drain', (req, res) => {
	shell.exec('docker stop $(docker ps -a -q)')
	res.json({})
})

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

app.post('/volume/create', function (req, res) {
	let data = req.body.data
	let type = data.type
	let cmd = ''
	if (type == 'nfs') {
		cmd = `docker volume create --driver local --opt type=nfs --opt o=addr=${data.server},rw --opt device=:${data.rootPath}${data.subPath} ${data.name}`
	} else {
		cmd = `docker volume create ${data.name}`
	}
	let output = shell.exec(cmd)
	res.send(output)
})

app.post('/volume/upload/:nodename/:dst', function (req, res) {
	console.log('Recv upload')
    req.pipe(fs.createWriteStream(path.join(req.params.dst)))
    req.on('end', async () => {
    	let compressedDst = './uploads/' + req.params.dst + '.pwm.extracted'
    	await compressing.tar.uncompress(req.params.dst, compressedDst)
    	let busyboxName = randomstring.generate(24).toLowerCase()
    	let runBusy = shell.exec(`docker run -d --mount source=${req.params.dst},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
    	console.log('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.' + ' ' + busyboxName + `:/mnt/${busyboxName}`)
    	let result = shell.exec('docker cp ' + './uploads/' + req.params.dst + '.pwm.extracted/.  ' + busyboxName + `:/mnt/${busyboxName}/` )
    	shell.exec(`docker stop ${busyboxName}`)
    	shell.exec(`docker rm ${busyboxName}`)
    	fs.unlink(path.join(compressedDst), () => {})
        res.end('Upload complete')
    })
})

app.post('/volume/download/:nodename/:dst', async function(req, res) {
	console.log('Recv download')
	let busyboxName = randomstring.generate(24).toLowerCase()
	let runBusy = shell.exec(`docker run -d --mount source=${req.params.dst},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
	console.log('Running busybox')
	let result = shell.exec('mkdir -p ' + homedir + '/pwm/downloads/' + req.params.dst + '.pwm.volume' + ' && docker cp ' + busyboxName + `:/mnt/${busyboxName}/ ` + homedir + '/pwm/downloads/' + req.params.dst + '.pwm.volume')
	console.log('Copied locally')
	let archiveName = path.join(homedir + '/pwm/downloads/' + req.params.dst + '.pwm.volume/' + busyboxName)
	let archiveNameCompressed = path.join(homedir + '/pwm/downloads/' + busyboxName + '.tar')
	await compressing.tar.compressDir(homedir + '/pwm/downloads/' + req.params.dst + '.pwm.volume/' + busyboxName, archiveNameCompressed)
	const size = fs.statSync(archiveNameCompressed)
	console.log('Compressed, now piping')
	let fileStream = fs.createReadStream(archiveNameCompressed)
	fileStream.pipe(res)
})

var DockerServer = require('./src/web-socket-docker-server')
new DockerServer({
  path: '/pwm/cshell',
  port: 3001,
  server: server,
})

server.listen(3001)