'use strict'

let express = require('express')
let bodyParser = require('body-parser')
let Docker = require('dockerode')
let fs = require('fs')
let http = require('http')
let docker = new Docker()
let nvidiaDocker = require('./src/nvidia-docker')
let api = require('./src/api')

let app = express()

const server = http.createServer(app)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/alive', (req, res) => {
	res.json()
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

server.on('upgrade', function (req, socket, head) {
  	console.log('Upgrading', req.url.split('?')[0])
})

var DockerServer = require('./src/web-socket-docker-server')
new DockerServer({
  path: '/pwm/cshell',
  port: 3001,
  server: server,
})

server.listen(3001)