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

app.get('/gpu/info', (req, res) => {
	res.json([
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-01',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-02',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T2',
	    uuid: 'GPU-DUMMY-03',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T2',
	    uuid: 'GPU-DUMMY-04',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T3',
	    uuid: 'GPU-DUMMY-05',
	    fb_memory_usage: '1000 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T3',
	    uuid: 'GPU-DUMMY-06',
	    fb_memory_usage: '1000 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T2',
	    uuid: 'GPU-DUMMY-07',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU T2',
	    uuid: 'GPU-DUMMY-08',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-09',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-DUMMY-10',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	])
	return
	api.gpu.info(null, (err, gpus) => {
		res.json(gpus)
	})
})

app.post('/workload/create', (req, res) => {
	console.log('Create request', req.body)
	nvidiaDocker.launch(req.body, (result) => {
		res.json(result)
	})
})

app.get('/wk/:operation', (req, res) => {
	nvidiaDocker.exec(req.params.operation, req.query, (result) => {
		res.json(result)
	})
})

app.listen(3001)
