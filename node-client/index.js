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
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-02',
	    fb_memory_usage: '0 MiB',
	    minor_number: 1,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-03',
	    fb_memory_usage: '0 MiB',
	    minor_number: 2,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-04',
	    fb_memory_usage: '0 MiB',
	    minor_number: 3,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-05',
	    fb_memory_usage: '0 MiB',
	    minor_number: 4,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-06',
	    fb_memory_usage: '0 MiB',
	    minor_number: 5,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-07',
	    fb_memory_usage: '0 MiB',
	    minor_number: 6,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-08',
	    fb_memory_usage: '0 MiB',
	    minor_number: 7,
	    fb_memory_total: '512 MiB',
	    node: 'dummy-01',
	    processes: ""
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
	//console.log('Status request', req.body)
	nvidiaDocker.status(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/logs', (req, res) => {
	console.log(req.body)
	nvidiaDocker.logs(req.body, (result) => {
		res.json(result)
	})
})

app.post('/workload/delete', (req, res) => {
	console.log('Delete request', req.body)
	nvidiaDocker.delete(req.body, (result) => {
		res.json(result)
	})
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