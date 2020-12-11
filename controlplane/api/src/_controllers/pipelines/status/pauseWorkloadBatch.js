'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('pauseWorkloadBatch')
let request = require('../../fn/request')

pipe.step('verifyContainerIsAssigned', async function (pipe, data) {
	let workloads = data.workloads
	let toPauseWorkloads = []
	for (var workloadIndex = 0; workloadIndex < workloads.length; workloadIndex += 1) {
		if (workloads[workloadIndex]._p.scheduler == undefined 
			|| workloads[workloadIndex]._p.scheduler.container == undefined 
			|| workloads[workloadIndex]._p.scheduler.pwnnode == undefined
			|| workloads[workloadIndex]._p.scheduler.pwnnode.assignedToPwmnode == false) {
			/** 
			*	Do not stop this workload, never started 
			*/
			console.log('PAUSE ERR!')
		} else {
			toPauseWorkloads.push(workloads[workloadIndex])
		}
	}
	pipe.data.workloads = toPauseWorkloads
	pipe.next()
})

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let workloads = data.workloads
	let workloadsForNode = {}
	workloads.forEach ((workload) => {
		let nodes = pipe.data.nodes.filter((node) => {
			if (workload !== undefined && workload._p !== undefined && workload._p.scheduler !== undefined) {
				return node._p.metadata.name == workload._p.scheduler.node	
			} else {
				return false
			}
		})	
		if (nodes !== undefined && nodes.length == 1) {
			let node = nodes[0]
			if (workloadsForNode[node._p.metadata.name] == undefined) {
				workloadsForNode[node._p.metadata.name] = {node: node, workloads: [], alive: false}
			}
			workloadsForNode[node._p.metadata.name].workloads.push(workload)
 		}
	})
	if (Object.keys(workloadsForNode).length == 0) {
		pipe.end()
	} else {
		pipe.data.workloadsForNode = workloadsForNode
		pipe.next()
	}
})

pipe.step('pauseWorkload', async function (pipe, data) {
	Object.values(pipe.data.workloadsForNode).forEach((nodeWorkloads) => {
		let batchStatusRequest = async function (node, workloads) {
			for (var workloadIndex = 0; workloadIndex < workloads.length; workloadIndex += 1) {
				workloads[workloadIndex]._p.requestedCancelSent = true
				await workloads[workloadIndex].update()
			} 
			let apiVersion = GE.DEFAULT.API_VERSION
			request({
				method: 'post',
				node: node,
				path: '/' + apiVersion + '/' + 'batch' + '/workloadpause',
				body: {data: workloads.map((workload) => {return workload._p})},
				then: async (res) => {
				}
			})
		}
		console.log('Pausing')
		batchStatusRequest(nodeWorkloads.node, nodeWorkloads.workloads)
		pipe.end()
	})
})

module.exports = scheduler 