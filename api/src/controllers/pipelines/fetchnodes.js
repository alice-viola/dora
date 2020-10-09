'use strict'

const GE = require('../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let Models = require ('../../models/models')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('fetchNodes')


pipe.step('gpu-discover', (pipe, job) => {
	let queue = []
	pipe.data.nodes.forEach((_Node) => {
		let node = _Node._p
		if (node.spec.maintenance != true && node.spec.allow !== undefined && node.spec.allow.includes('GPUWorkload')) {
			queue.push((cb) => {
				axios.get('http://' + node.spec.address[0] + '/alive', {timeout: 2000}).then((_res) => {
					axios.get('http://' + node.spec.address[0] + '/gpu/info', {timeout: 10000}).then(async (_res) => {	
						_Node._p.properties.gpu = _res.data
						await _Node.update()
						_res.data.forEach ((gpu) => {
							gpu.node = node.metadata.name
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
		pipe.data.availableGpu = results.flat()
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
		pipe.next()
	})
})

pipe.step('cpu-discover', (pipe, job) => {
	let queue = []
	pipe.data.nodes.forEach((_Node) => {
		let node = _Node._p
 		if (node.spec.maintenance != true && node.spec.allow !== undefined && node.spec.allow.includes('CPUWorkload')) {
			queue.push((cb) => {
				axios.get('http://' + node.spec.address[0] + '/alive', {timeout: 2000}).then((_res) => {
					axios.get('http://' + node.spec.address[0] + '/cpu/info', {timeout: 10000}).then(async (_res) => {	
						_Node._p.properties.cpu = _res.data
						await _Node.update()
						_res.data.forEach ((cpu) => {
							cpu.node = node.metadata.name
						})
						cb(null, _res.data)
					}).catch((err) => {
						if (err.code !== 'ECONNREFUSED') {
							console.log(err)
						}
						console.log(err)
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
		pipe.data.availableCpu = results.flat()
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
		pipe.end()
	})
	
})

module.exports = scheduler