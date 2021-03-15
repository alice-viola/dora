'use strict'


const GE = require('../../../../../index').events
let fn = require('../../fn/fn')
let Models = require('../../../../../index').models
let Node = Models.Node
let Workload = Models.Workload

let fs = require('fs')
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let https = require ('https')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('fetchNodes')


let instance
if (process.env.USE_CUSTOM_CA_SSL_CERT == true || process.env.USE_CUSTOM_CA_SSL_CERT == 'true') {
	const CA_CRT = fs.readFileSync(process.env.SSL_CA_CRT)
	instance = axios.create({
	  httpsAgent: new https.Agent({  
	    ca: [CA_CRT], 
		checkServerIdentity: function (host, cert) {
		    return undefined
		}
	  })
	})
} else {
	instance = axios.create({
	  httpsAgent: new https.Agent({  
		rejectUnauthorized: process.env.DENY_SELF_SIGNED_CERTS || false				
	  })
	})
}

pipe.step('fetchdb', async (pipe, job) => {
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

pipe.step('fetchworkloads', async (pipe, job) => {
	let _workloads = []
	_workloads = await Workload.FindByZone(process.env.zone)
	pipe.data.workloads = _workloads.map((wk) => { return new Workload(wk) })
	pipe.next()
})

pipe.step('resource-discover', (pipe, job) => {
	let queue = []
	if (pipe.data.nodes == undefined) {
		pipe.end()
		return
	}
	let assignedGPUs = {}
	pipe.data.workloads.forEach((wk) => {
		if (wk !== undefined && wk._p.scheduler !== undefined && wk._p.scheduler.gpu !== undefined) {
			
			wk._p.scheduler.gpu.forEach((gpu) => {
				assignedGPUs[gpu.uuid] = gpu
			})
		}
	})
	pipe.data.nodes.forEach((_Node) => {
		let node = _Node._p
		if (node.currentStatus != GE.NODE.MAINTENANCE) {
			queue.push((cb) => {
				if (node.spec.token !== undefined) {
					instance.defaults.headers.common = {'Authorization': `Bearer ${node.spec.token}`}	
				}
				instance.get('https://' + node.spec.address[0] + '/' + GE.DEFAULT.API_VERSION + '/resource/status', 
					{timeout: 3000}).then(async (_res) => {	
					_Node._p.currentStatus = GE.NODE.READY
					_Node._p.properties.gpu = _res.data.gpus
					_Node._p.properties.cpu = _res.data.cpus
					_Node._p.properties.sys = _res.data.sys
					_Node._p.properties.version = _res.data.version
					_Node._p.lastSeen = new Date()
					let res = await _Node.update()
					_res.data.name = node.metadata.name
					_res.data.gpus.forEach ((gpu) => {
						gpu.node = node.metadata.name
					})
					_res.data.cpus.forEach ((cpu) => {
						cpu.node = node.metadata.name
					})
					cb(null, _res.data)
				}).catch(async (err) => {
					_Node._p.currentStatus = GE.NODE.NOT_READY
					await _Node.update()
					cb(null, [])
				})
			})
		}
	})
	async.parallel(queue, (err, results) => {
		let flatResults = results.flat()
		pipe.data.resources = flatResults
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
				if (assignedGPUs[gpu.uuid] !== undefined) {
					_gpu.setAssigned()	
				} else {
					_gpu.unsetAssigned()
				}
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





