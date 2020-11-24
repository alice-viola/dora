'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline
let axios = require('axios')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('statusWorkloadBatch')
let request = require('../../fn/request')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.status.push(GE.status(workload._p.currentStatus, err))
		await workload.update()
	} 
}

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let workloads = data.workloads
	let workloadsForNode = {}
	workloads.forEach ((workload) => {
		if (workload !== undefined && pipe.data.nodes !== undefined) {
			let nodes = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.node})	
			if (nodes !== undefined && nodes.length == 1) {
				let node = nodes[0]
				if (workloadsForNode[node._p.metadata.name] == undefined) {
					workloadsForNode[node._p.metadata.name] = {node: node, workloads: [], alive: false}
				}
				workloadsForNode[node._p.metadata.name].workloads.push(workload)
 			}
		}
	})
	if (Object.keys(workloadsForNode).length == 0) {
		pipe.end()
	} else {
		pipe.data.workloadsForNode = workloadsForNode
		pipe.next()
	}
})

pipe.step('pingNode', async function (pipe, data) {
	Object.values(pipe.data.workloadsForNode).forEach((nodeWorkloads) => {
		let batchStatusRequest = function (node, workloads) {
			let apiVersion = GE.DEFAULT.API_VERSION
			request({
				method: 'post',
				node: node,
				path: '/' + apiVersion + '/' + 'batch' + '/workloadstatus',
				body: {data: workloads.map((workload) => {return workload._p})},
				then: async (res) => {
					res.data = res.data[0]
					if (res.data == null) {
						return
					}
					for (var i = 0; i < workloads.length; i += 1) {
						let workload = workloads[i]
						let oneWorkloadResult = res.data[workload._p.scheduler.container.name]
						if (oneWorkloadResult !== undefined) {
							let lastStatus = workload._p.status[workload._p.status.length -1]
							let status = oneWorkloadResult.status
							let reason = oneWorkloadResult.reason
							let by = oneWorkloadResult.by
							if (reason == undefined) {
								reason = null
							}
							if (lastStatus.reason == undefined) {
								lastStatus.reason = null
							}
							if (status !== undefined && (
								lastStatus.status !== status 
								|| lastStatus.reason !== reason 
								|| (workload._p.scheduler.container.id !== oneWorkloadResult.id && oneWorkloadResult.id !== undefined) )) {
								if (oneWorkloadResult.id !== undefined) {
									workload._p.scheduler.container.id = oneWorkloadResult.id
								}
								workload._p.currentStatus = status
								workload._p.status.push(GE.status(status, reason, by))
								await workload.update()
							}
						}
					}
				},
				err: (res) => {
					workloads.forEach((workload) => {
						statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
					})
					console.log('NODE', node._p.metadata.name, 'IS DEAD')
				}
			})
		}
		batchStatusRequest(nodeWorkloads.node, nodeWorkloads.workloads)
		pipe.end()
	})
})

module.exports = scheduler