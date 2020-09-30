'use strict'

let express = require('express')
let nvidiaDocker = require('./src/nvidia-docker')
let api = require('./src/api')

let ary = [
	{name: 'dummy-01', port: 3001},
	{name: 'dummy-02', port: 3002},
	{name: 'dummy-03', port: 3003},
]

ary.forEach((node) => {

	let app = express()

	app.get('/alive', (req, res) => {
		res.json()
	})
	
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
		    uuid: 'GPU-' + node.name + '-01',
		    fb_memory_usage: '0 MiB',
		    node: node.name
		  },
		  {
		    product_name: 'Dummy GPU',
		    uuid: 'GPU-' + node.name + '-02',
		    fb_memory_usage: '0 MiB',
		    node: node.name
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

app.listen(node.port)
})
