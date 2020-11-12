'use strict'

let api = {v1: require('../../api')}
let Workload = require ('../../models/workload')
let Volume = require ('../../models/volume')
let Storage = require ('../../models/storage')
let Node = require ('../../models/node')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchdb').step('node', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		pipe.data.nodes = _nodes.map((node) => { return new Node(node) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('volume', (pipe, job) => {
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		pipe.data.volumes = _volumes.map((volume) => { return new Volume(volume) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('storage', (pipe, job) => {
	api['v1']._get({kind: 'Storage'}, (err, _storage) => {
		pipe.data.storages = _storage.map((storage) => { return new Storage(storage) })
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
					// FREE CPU
					wk.unlock()
					wk.releaseCpu()
					await wk.update()
				} else {
					//let assignedCpu = wk.assignedCpuExtended()
					//if (assignedCpu.exclusive == undefined || assignedCpu.exclusive == true) {
					//	pipe.data.alreadyAssignedCpu.push(wk.assignedCpu())	
					//}
					let assignedCpu = wk.assignedCpuExtended()
					assignedCpu.forEach((cpu) => {
						if (cpu.exclusive == undefined || cpu.exclusive == true) {
							pipe.data.alreadyAssignedCpu.push(cpu.uuid)	
						}
					})
				}
			}
		})
		pipe.data.alreadyAssignedGpu = pipe.data.alreadyAssignedGpu.flat()
		pipe.data.alreadyAssignedCpu = pipe.data.alreadyAssignedCpu.flat()
		pipe.next()
	})
})

module.exports = scheduler