'use strict'

const GE = require('../../../../../index').events
let api = {v1: require('../../../../../index').api}
let Models = require('../../../../../index').models
let Workload = Models.Workload
let Volume = Models.Volume
let Storage = Models.Storage
let User = Models.User
let Group = Models.Group
let Node = Models.Node
let Bind = Models.Bind


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()


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


scheduler.pipeline('fetchdb').step('workload', async (pipe, job) => {
	pipe.data.nodes
	let _workload = await Workload.FindByNodesAndZone(process.env.zone, pipe.data.nodes.map((node) => { return node._p.metadata.name }))
	pipe.data.workloads = _workload.map((workload) => { return new Workload(workload) })
	pipe.next()
})

module.exports = scheduler