'use strict'

let express = require('express')
let nvidiaDocker = require('./src/nvidia-docker')
let api = require('./src/api')

let app = express()

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/gpu/info', (req, res) => {
	//api.gpu.info(null, (err, gpus) => {
	//	res.json(gpus)
	//})
	res.json([
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-01',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  },
	  {
	    product_name: 'Dummy GPU',
	    uuid: 'GPU-02',
	    fb_memory_usage: '0 MiB',
	    node: 'dummy-01'
	  }
	])
})

app.get('/docker/:operation', (req, res) => {
	api.docker[req.params.operation](req.query, (err, containers) => {
		res.json(containers)
	})
})

app.get('/wk/:operation', (req, res) => {
	nvidiaDocker.exec(req.params.operation, req.query, (result) => {
		res.json(result)
	})
})

app.listen(3001)
