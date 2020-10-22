'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipeline
let axios = require('axios')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('statusWorkloadBatch')
let request = require('../fn/request')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.RUNNING
		workload._p.status.push(GE.status(GE.WORKLOAD.RUNNING, err))
		await workload.update()
	} 
}

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let workloads = data.workloads
	let workloadsForNode = {}
	workloads.forEach ((workload) => {
		if (workload !== undefined && (workload._p.currentStatus == GE.WORKLOAD.RUNNING || workload._p.currentStatus == GE.WORKLOAD.REQUESTED_LAUNCH) && pipe.data.nodes !== undefined) {
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
				//workloads.forEach((workload) => {
				//	statusWriter (workload, pipe, {err: null})
				//})
				let apiVersion = GE.DEFAULT.API_VERSION
				request({
					method: 'post',
					node: node,
					path: '/' + apiVersion + '/' + 'batch' + '/workloadstatus',
					body: {data: workloads.map((workload) => {return workload._p})},
					then: (res) => {

						res.data = res.data[0]
						workloads.forEach(async (workload) => {
							let oneWorkloadResult = res.data[workload._p.scheduler.container.name]
							switch (oneWorkloadResult.inspect) {
								
								case 'done':
									let lastStatus = workload._p.status[workload._p.status.length -1]
									if (lastStatus.status !== oneWorkloadResult.info.State.Status.toUpperCase() || lastStatus.reason !== null ) {
										workload._p.status.push(GE.status(oneWorkloadResult.info.State.Status.toUpperCase()))
										workload._p.currentStatus = oneWorkloadResult.info.State.Status.toUpperCase()
										if (oneWorkloadResult.info.State.Status.toUpperCase() == 'RUNNING') {
											workload._p.locked = true
											workload._p.scheduler.container.id = oneWorkloadResult.info.Id
											workload._p.scheduler.container.inspect = oneWorkloadResult.info
										} else {
											workload._p.locked = false
											workload._p.scheduler.container.endDate = new Date()
										}
										await workload.update()
									}
									break
					
								case 'error':
									workload._p.status.push(GE.status(GE.WORKLOAD.CRASHED))
									workload._p.currentStatus = GE.WORKLOAD.CRASHED
									workload._p.locked = false
									workload._p.scheduler.container.endDate = new Date()
									workload.update()
									break
					
								case 'notpresent':
									workload._p.status.push(GE.status(GE.WORKLOAD.UNKNOWN))
									workload._p.currentStatus = GE.WORKLOAD.UNKNOWN
									workload._p.locked = false
									workload._p.scheduler.container.endDate = new Date()
									workload.update()
									break
							}
						})
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