'use strict'

let axios = require('axios')
let async = require('async')
let express = require('express')
let app = express()

let COMPUTE_NODES_GPU = []
let COMPUTE_NODES_API = ['192.168.186.2:3000', '192.168.186.3:3000']

function ()

app.get('/gpu/info', (req, res) => {
	let queue = []
	COMPUTE_NODES_API.forEach((nodeAddress) => {
		queue.push((cb) => {
			axios.get('http://' + nodeAddress + '/gpu/info').then((res) => {		
				cb(null, res.data)
			})
		})
	})
	async.parallel(queue, (err, results) => {
		COMPUTE_NODES_GPU = results.flat()
		res.json(COMPUTE_NODES_GPU)
	})
})

app.get('/wl/:operation', (req, res) => {
	let operation = req.params.operation
	// Write to DB
})

app.listen(3000)