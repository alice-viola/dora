'use strict'

let express = require('express')
let nvidiaDocker = require('./src/nvidia-docker')
let api = require('./src/api')

let app = express()

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.get('/gpu/info', (req, res) => {
	api.gpu.info(null, (err, gpus) => {
		res.json(gpus)
	})
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

app.listen(3000)
