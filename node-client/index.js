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
let async = require('async')
let shell = require('shelljs')
const compressing = require('compressing')
let docker = new Docker()
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

var args = process.argv.slice(2)
if (args.length > 0 && args[0] == 'InstallSystemD') {
	shell.exec(`useradd -r --system -s /bin/false pwm`)
	shell.exec(`usermod -aG docker pwm`)
	shell.exec(`touch /etc/systemd/system/pwmnode.service`)
	shell.exec(`echo "[Unit]\nDescription=PWM Node\nAfter=network.target\nStartLimitIntervalSec=0\n[Service]\nType=simple\nRestart=always\nRestartSec=1\nUser=pwm\nExecStart=/usr/local/bin/pwmnode\n[Install]\nWantedBy=multi-user.target" > /etc/systemd/system/pwmnode.service`)
	shell.exec(`systemctl start pwmnode`)
	process.exit()
}

let drivers = {
	'pwm.docker': require('./src/drivers/docker_v2'),
	'pwm.docker_v2': require('./src/drivers/docker_v2'),
	'pwm.nvidiadocker': require('./src/drivers/docker')
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
	let output = shell.exec('wget https://pwm.promfacility.eu/downloads/vlatest/linux-x64/node && systemctl restart pwmnode')
	res.json(output.stdout)
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
			console.log(results)
			res.json(results.flat())	
		})
	} else {
		res.sendStatus(404)
	}
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

app.post('/:apiVersion/volume/upload/:volumeName', function (req, res) {
	console.log('Recv upload')
    req.pipe(fs.createWriteStream(path.join(req.params.volumeName)))
    req.on('end', async () => {
    	let compressedDst = './uploads/' + req.params.volumeName + '.pwm.extracted'
    	await compressing.tar.uncompress(req.params.volumeName, compressedDst)
    	let busyboxName = randomstring.generate(24).toLowerCase()
    	let runBusy = shell.exec(`docker run -d --mount source=${req.params.volumeName},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
    	console.log('docker cp ' + './uploads/' + req.params.volumeName + '.pwm.extracted/.' + ' ' + busyboxName + `:/mnt/${busyboxName}`)
    	let result = shell.exec('docker cp ' + './uploads/' + req.params.volumeName + '.pwm.extracted/.  ' + busyboxName + `:/mnt/${busyboxName}/` )
    	shell.exec(`docker stop ${busyboxName}`)
    	shell.exec(`docker rm ${busyboxName}`)
    	fs.unlink(path.join(compressedDst), () => {})
        res.end('Upload complete')
    })
})

app.post('/:apiVersion/volume/download/:volumeName', async function(req, res) {
	console.log('Recv download')
	let tmp = require('os').tmpdir()
	let busyboxName = randomstring.generate(24).toLowerCase()
	let runBusy = shell.exec(`docker run -d --mount source=${req.params.volumeName},target=/mnt/${busyboxName} --name ${busyboxName} busybox`)
	console.log('Running busybox')
	let archiveName = path.join(tmp + '/' + req.params.volumeName + '.pwm.volume.' + busyboxName)
	let result = shell.exec('docker cp ' + busyboxName + `:/mnt/${busyboxName}/ ` + archiveName)
	console.log('Copied locally')
	let archiveNameCompressed = path.join(tmp + '/' + req.params.volumeName + '.pwm.volume.' + busyboxName + '.tar')
	console.log(archiveName, archiveNameCompressed)
	await compressing.tar.compressDir(archiveName, archiveNameCompressed)
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