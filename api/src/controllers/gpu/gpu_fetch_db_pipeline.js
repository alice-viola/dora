'use strict'

let api = {v1: require('../../api')}
let GPUWorkload = require ('../../models/gpuworkload')
let Volume = require ('../../models/volume')
let Node = require ('../../models/node')

let FetchPipe = require('piperunner').Pipe
let fetchPipe = new FetchPipe()

fetchPipe.step('node', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		pipe.data.nodes = _nodes.map((node) => { return new Node(node) })
		pipe.next()
	})
})

fetchPipe.step('volume', (pipe, job) => {
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		pipe.data.volumes = _volumes.map((volume) => { return new Volume(volume) })
		pipe.next()
	})
})

fetchPipe.step('gpuworkload', (pipe, job) => {
	api['v1']._get({kind: 'GPUWorkload'}, (err, _gpuworkload) => {
		pipe.data.alreadyAssignedGpu = []
		pipe.data.workloads = _gpuworkload.map((gpuworkload) => { return new GPUWorkload(gpuworkload) })
		pipe.data.workloads.forEach((wk) => {
			if (wk.hasGpuAssigned()) {
				pipe.data.alreadyAssignedGpu.push(wk.assignedGpu())
			}
		})
		pipe.next()
	})
})

fetchPipe.step('schedule', (pipe, job) => {
	pipe.data.scheduler.line('gpuAssignedToLaunch').pipeline.data.volumes = pipe.data.volumes
	pipe.data.scheduler.line('gpuAssignedToLaunch').pipeline.data.nodes = pipe.data.nodes
	pipe.data.scheduler.line('gpuAssignedToLaunch').pipeline.data.alreadyAssignedGpu = pipe.data.alreadyAssignedGpu.flat()
	pipe.data.scheduler.line('gpuAssignedToLaunch').jobs = pipe.data.workloads
	pipe.data.scheduler.line('gpuLaunchWorkload').jobs = pipe.data.workloads
	pipe.data.scheduler.line('gpuLaunchWorkload').pipeline.data.nodes = pipe.data.nodes
	pipe.data.scheduler.emit('gpuFetchCompleted')
	pipe.end()
})

module.exports = fetchPipe