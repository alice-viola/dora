'use strict'

let express = require('express')
let bodyParser = require('body-parser')
let Docker = require('dockerode')
let fs = require('fs')
let docker = new Docker()
let nvidiaDocker = require('./src/nvidia-docker')
let api = require('./src/api')

let app = express()
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


app.get('/wk/:operation', (req, res) => {
	nvidiaDocker.exec(req.params.operation, req.query, (result) => {
		res.json(result)
	})
})

app.listen(3001)
