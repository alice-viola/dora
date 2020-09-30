'use strict'

const GE = require('../events/global')
let async = require('async')
let api = {v1: require('../api')}

let GPUWorkload = require ('../models/gpuworkload')
let Volume = require ('../models/volume')
let Node = require ('../models/node')

let availableGpu = []

let WorkloadDiscoverInterval = undefined
let WorkloadDiscoverIntervalTimeMs = 1000

async function workloadFetch () {
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
		pipe.end()
		let GpuShedulerPipe = require('piperunner').Pipe
		let Pipeliner = require('piperunner').Runner
		let gpupipe = require('./gpu_scheduler_pipeline')
		let pipeliner = new Pipeliner()
		gpupipe.data.volumes = pipe.data.volumes
		gpupipe.data.nodes = pipe.data.nodes
		gpupipe.data.availableGpu = availableGpu
		gpupipe.data.alreadyAssignedGpu = pipe.data.alreadyAssignedGpu.flat()
		
		pipeliner.jobs(pipe.data.workloads).pipe(gpupipe, () => {
			console.log('End computing all jobs')
		})
	})
	fetchPipe.run()
}

GE.Emitter.on(GE.GpuUpdate, function (agpu) {
	availableGpu = agpu
})
GE.Emitter.on(GE.RunGpuScheduler, workloadFetch)
GE.Emitter.on(GE.SystemStarted, () => {
	if (WorkloadDiscoverInterval == undefined) {
		workloadFetch()
		WorkloadDiscoverInterval = setInterval(workloadFetch, WorkloadDiscoverIntervalTimeMs)
	}
})

module.exports.stop = () => {
	if (GpuDiscoverInterval != undefined) {
		clearInterval(WorkloadDiscoverInterval)
	}
} 