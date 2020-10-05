'use strict'

let api = {v1: require('../../api')}
let GPUWorkload = require ('../../models/gpuworkload')
let Volume = require ('../../models/volume')
let Node = require ('../../models/node')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchDataFromDb').step('node', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		let nodes = _nodes.map((node) => { return new Node(node) })
		pipe.data.nodes = nodes.filter((node) => {return node.isMaintenance() == false})
		pipe.next()
	})
})

scheduler.pipeline('fetchDataFromDb').step('volume', (pipe, job) => {
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		pipe.data.volumes = _volumes.map((volume) => { return new Volume(volume) })
		pipe.next()
	})
})

scheduler.pipeline('fetchDataFromDb').step('gpuworkload', (pipe, job) => {
	api['v1']._get({kind: 'GPUWorkload'}, (err, _gpuworkload) => {
		pipe.data.alreadyAssignedGpu = []
		pipe.data.workloads = _gpuworkload.map((gpuworkload) => { return new GPUWorkload(gpuworkload) })
		pipe.data.workloads.forEach(async (wk) => {
			if (wk.hasGpuAssigned()) {
				if (wk.ended() == true) {
					// FREE GPU
					wk.unlock()
					wk.releaseGpu()
					wk.update()
				} else {
					pipe.data.alreadyAssignedGpu.push(wk.assignedGpu())	
				}
			}
		})
		pipe.data.alreadyAssignedGpu = pipe.data.alreadyAssignedGpu.flat()
		pipe.next()
	})
})

module.exports = scheduler