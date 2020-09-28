'use strict'

const GE = require('../events/global')
let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let api = {v1: require('../api')}

let COMPUTE_NODES_GPU = []
let GpuDiscoverInterval = undefined
let GpuDiscoverIntervalTimeMs = 60000
let subscribers = []

function gpuDiscover () {
	let queue = []
	api['v1'].get({kind: 'Node'}, (err, result) => {
		result.forEach((node) => {
			queue.push((cb) => {
				axios.get('http://' + node.spec.address[0] + '/gpu/info').then((_res) => {	
					_res.data.forEach ((gpu) => {
						gpu.node = node.metadata.name
					})
					cb(null, _res.data)
				})
			})
		})
		async.parallel(queue, (err, results) => {
			COMPUTE_NODES_GPU = results.flat()
			GE.Emitter.emit(GE.GpuUpdate, COMPUTE_NODES_GPU)
		})
	})
}

GE.Emitter.on(GE.SystemStarted, () => {
	gpuDiscover()
	GpuDiscoverInterval = setInterval(gpuDiscover, GpuDiscoverIntervalTimeMs)
})

module.exports.start = () => {
	if (GpuDiscoverInterval == undefined) {
		gpuDiscover()
		GpuDiscoverInterval = setInterval(gpuDiscover, GpuDiscoverIntervalTimeMs)
	}
} 

module.exports.stop = () => {
	if (GpuDiscoverInterval != undefined) {
		clearInterval(GpuDiscoverInterval)
	}
} 
