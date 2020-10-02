'use strict'

let api = {v1: require('../../api')}
let GPUWorkload = require ('../../models/gpuworkload')
let Volume = require ('../../models/volume')
let Node = require ('../../models/node')
let Models = require ('../../models/models')
let GPU = require ('../../models/GPU')
let async = require ('async')
let axios = require ('axios')

let FetchPipe = require('piperunner').Pipe
let fetchPipe = new FetchPipe()

fetchPipe.step('gpu-discover', (pipe, job) => {
	let queue = []
	api['v1']._get({kind: 'Node'}, (err, result) => {
		result.forEach((node) => {
			queue.push((cb) => {
				axios.get('http://' + node.spec.address[0] + '/gpu/info', {timeout: 10000}).then((_res) => {	
					_res.data.forEach ((gpu) => {
						gpu.node = node.metadata.name
					})
					cb(null, _res.data)
				}).catch((err) => {
					cb(null, [])
				})
			})
		})
		async.parallel(queue, (err, results) => {
			pipe.data.scheduler.line('gpuAssignedToLaunch').pipeline.data.availableGpu = results.flat()
			pipe.data.scheduler.line('gpuAssignedToLaunch').pipeline.data.availableGpu.forEach(async (gpu) => {
				let _gpu = new Models['GPU']({
					kind: 'GPU',
					metadata: {
						name: gpu.uuid
					},
					spec: gpu
				})
				if (!await _gpu.exist()) {
					await _gpu.create()
				} else {
					await _gpu.update()
				}
			})
			pipe.data.scheduler.emit('gpuFetchCompleted')
			pipe.end()
		})
	})
})

module.exports = fetchPipe