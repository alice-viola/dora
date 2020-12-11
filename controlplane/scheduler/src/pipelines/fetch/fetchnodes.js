'use strict'

const GE = require('../../../../libcommon').events
let api = {v1: require('../../../../libcommon').api}
let Models = require('../../../../libcommon').models
let Node = Models.Node

let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let https = require ('https')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('fetchNodes')

pipe.step('fetchdb', (pipe, job) => {
	api['v1']._get({kind: 'Node'}, (err, _nodes) => {
		pipe.data.nodes = _nodes.map((node) => { return new Node(node) })
		pipe.next()
	})
})

pipe.step('resource-discover', (pipe, job) => {
	let queue = []
	if (pipe.data.nodes == undefined) {
		pipe.end()
		return
	}
	pipe.data.nodes.forEach((_Node) => {
		let node = _Node._p
		if (node.currentStatus != GE.NODE.MAINTENANCE) {
			const agent = new https.Agent({  
			  rejectUnauthorized: false
			  //ca: [ca]
			})
			queue.push((cb) => {
				axios.get('https://' + node.spec.address[0] + '/' + GE.DEFAULT.API_VERSION + '/resource/status', 
					{timeout: 5000, httpsAgent: agent}).then(async (_res) => {	
					_Node._p.currentStatus = GE.NODE.READY
					_Node._p.properties.gpu = _res.data.gpus
					_Node._p.properties.cpu = _res.data.cpus
					_Node._p.properties.sys = _res.data.sys
					_Node._p.properties.version = _res.data.version
					_Node._p.lastSeen = new Date()
					let res = await _Node.update()
					_res.data.gpus.forEach ((gpu) => {
						gpu.node = node.metadata.name
					})
					_res.data.cpus.forEach ((cpu) => {
						cpu.node = node.metadata.name
					})
					cb(null, _res.data)
				}).catch(async (err) => {
					if (err.code !== 'ECONNREFUSED') {}
					_Node._p.currentStatus = GE.NODE.NOT_READY
					await _Node.update()
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
				lastSeen: new Date(),
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
				lastSeen: new Date(),
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