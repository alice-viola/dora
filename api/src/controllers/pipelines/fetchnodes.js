'use strict'

const GE = require('../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let Models = require ('../../models/models')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('fetchNodes')

pipe.step('resource-discover', (pipe, job) => {
	let queue = []
	if (pipe.data.nodes == undefined) {
		pipe.end()
		return
	}
	pipe.data.nodes.forEach((_Node) => {
		let node = _Node._p
		if (node.spec.maintenance != true) {
			queue.push((cb) => {
				axios.get('http://' + node.spec.address[0] + '/alive', {timeout: 2000}).then((_res) => {
					axios.get('http://' + node.spec.address[0] + '/resource/status', {timeout: 10000}).then(async (_res) => {	
						_Node._p.properties.gpu = _res.data.gpus
						_Node._p.properties.cpu = _res.data.cpus
						_Node._p.properties.sys = _res.data.sys
						let res = await _Node.update()
						_res.data.gpus.forEach ((gpu) => {
							gpu.node = node.metadata.name
						})
						_res.data.cpus.forEach ((cpu) => {
							cpu.node = node.metadata.name
						})
						cb(null, _res.data)
					}).catch((err) => {
						if (err.code !== 'ECONNREFUSED') {
							console.log(err)
						}
						cb(null, [])
					})
				}).catch((err) => {
					console.log('NON REACHEBLE NODE', node.spec.address[0])
					cb(null, [])
				})
			})
		}
	})
	async.parallel(queue, (err, results) => {
		let flatResults = results.flat()
		let gpus = flatResults.map((nodeResult) => { return nodeResult.gpus })
		let cpus = flatResults.map((nodeResult) => { return nodeResult.cpus })
		pipe.data.availableGpu = gpus.flat()
		pipe.data.availableGpu.forEach(async (gpu) => {
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
		pipe.data.availableCpu = cpus.flat()
		pipe.data.availableCpu.forEach(async (cpu) => {
			let _cpu = new Models['CPU']({
				kind: 'CPU',
				metadata: {
					name: cpu.uuid
				},
				spec: cpu
			})
			if (!await _cpu.exist()) {
				await _cpu.create()
			} else {
				await _cpu.update()
			}
		})
		pipe.next()
	})
})

module.exports = scheduler