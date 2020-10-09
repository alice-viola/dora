'use strict'

let api = {v1: require('../../api')}
let Workload = require ('../../models/workload')
let WorkingDir = require ('../../models/workingdir')
let Volume = require ('../../models/volume')
let Node = require ('../../models/node')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchdb').step('node', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		let nodes = _nodes.map((node) => { return new Node(node) })
		pipe.data.nodes = nodes.filter((node) => {return node.isMaintenance() == false})
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('volume', (pipe, job) => {
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		pipe.data.volumes = _volumes.map((volume) => { return new Volume(volume) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('workingdir', (pipe, job) => {
	api['v1']._get({kind: 'WorkingDir'}, (err, _volumes) => {
		pipe.data.workingdir = _volumes.map((volume) => { return new WorkingDir(volume) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('workload', async (pipe, job) => {
	api['v1']._get({kind: 'Workload'}, async (err, _workload) => {
		pipe.data.alreadyAssignedGpu = []
		pipe.data.alreadyAssignedCpu = []
		pipe.data.workloads = _workload.map((workload) => { return new Workload(workload) })
		pipe.data.workloads.forEach(async (wk) => {
			if (wk.hasGpuAssigned()) {
				if (wk.ended() == true) {
					// FREE GPU
					wk.unlock()
					wk.releaseGpu()
					await wk.update()
				} else {
					pipe.data.alreadyAssignedGpu.push(wk.assignedGpu())	
				}
			}
			if (wk.hasCpuAssigned()) {
				if (wk.ended() == true) {
					// FREE GPU
					wk.unlock()
					wk.releaseCpu()
					await wk.update()
				} else {
					pipe.data.alreadyAssignedCpu.push(wk.assignedCpu())	
				}
			}
		})
		pipe.data.alreadyAssignedGpu = pipe.data.alreadyAssignedGpu.flat()
		pipe.data.alreadyAssignedCpu = pipe.data.alreadyAssignedCpu.flat()
		pipe.next()
	})
})

module.exports = scheduler