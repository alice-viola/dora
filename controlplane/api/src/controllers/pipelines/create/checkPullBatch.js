'use strict'

const GE = require('../../../events/global')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('checkPullBatch')

let request = require('../../fn/request')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.REQUESTED_PULLING
		workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_PULLING, err))
		await workload.update()
	}
}

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let workloads = data.workloads
	let workloadsForNode = {}
	workloads.forEach ((workload) => {
		let nodes = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.node})	
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

pipe.step('pingNode', async function (pipe, data) {
	Object.values(pipe.data.workloadsForNode).forEach((nodeWorkloads) => {
		let batchStatusRequest = function (node, workloads) {
			workloads.forEach((workload) => {
				statusWriter (workload, pipe, {err: null})
			})
			let apiVersion = GE.DEFAULT.API_VERSION
			request({
				method: 'post',
				node: node,
				path: '/' + apiVersion + '/' + 'batch' + '/pullstatus',
				body: {data: workloads.map((workload) => {return workload._p})},
				then: (res) => {
					res.data = res.data[0]
					workloads.forEach(async (workload) => {
						let oneWorkloadResult = res.data[workload._p.metadata.name]
						if (oneWorkloadResult.status == 'error') {
							workload._p.currentStatus = GE.WORKLOAD.ERROR
							workload._p.status.push(GE.status(GE.WORKLOAD.ERROR, GE.ERROR.PULL_FAILED))
							workload._p.locked = false
							await workload.update()
						} else if (oneWorkloadResult.status == 'done') {
							workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
							workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, null))
							await workload.update()
						}
					})
				},
				err: (res) => {
					console.log('NODE', node._p.metadata.name, 'IS DEAD')
				}
			})
		}
		batchStatusRequest(nodeWorkloads.node, nodeWorkloads.workloads)
		pipe.end()
	})
})

module.exports = scheduler