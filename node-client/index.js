'use strict'

let express = require('express')
let nvidiaSmi = require('./src/nvidia-smi')
let nvidiaDocker = require('./src/nvidia-docker')

let app = express()

app.get('/gpu/info', (req, res) => {
	nvidiaSmi.getGPU((gpus) => {
		res.json(gpus)
	})
})

app.get('/wk/:operation', (req, res) => {
	nvidiaDocker.exec(req.params.operation, req.query, (result) => {
		res.json(result)
	})
})

app.listen(3000)
