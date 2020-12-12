'use strict'

const GE = require('../../../../libcommon').events
let api = {v1: require('../../../../libcommon').api}
let Models = require('../../../../libcommon').models
let Workload = Models.Workload
let Volume = Models.Volume
let Storage = Models.Storage
let User = Models.User
let Group = Models.Group
let Node = Models.Node
let Bind = Models.Bind


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchdb').step('group', (pipe, job) => {
	api['v1']._get({kind: 'Group'}, (err, _group) => {
		pipe.data.groups = _group.map((group) => { return new Group(group) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('user', (pipe, job) => {
	api['v1']._get({kind: 'User'}, (err, _user) => {
		pipe.data.users = _user.map((user) => { return new User(user) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('node', async (pipe, job) => {
	let _nodes = []
	if (process.env.node_selector !== undefined) {
		let _splittedNodeSelectors = process.env.node_selector.split(',')
		let keyValueAry = []
		for (var i = 0; i < _splittedNodeSelectors.length; i += 1) {
			let [key, value] = _splittedNodeSelectors[i].split('=')
			keyValueAry.push({key: key, value: value})
		}
		_nodes = await Node.FindByLabelsInZone(process.env.zone, keyValueAry)
	} else {
		_nodes = await Node.FindByZone(process.env.zone)
	}
	pipe.data.nodes = _nodes.map((node) => { return new Node(node) })
	pipe.next()
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

scheduler.pipeline('fetchdb').step('bind', (pipe, job) => {
	api['v1']._get({kind: 'Bind'}, (err, _bind) => {
		pipe.data.binds = _bind.map((bind) => { return new Bind(bind) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('workload', async (pipe, job) => {
	let _workload = await Workload.FindByZone(process.env.zone)
	
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

module.exports = scheduler