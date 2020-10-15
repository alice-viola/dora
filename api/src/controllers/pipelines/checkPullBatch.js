'use strict'

const GE = require('../../events/global')
let axios = require('axios')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('checkPullBatch')

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
		console.log(pipe.data.workloadsForNode)
		pipe.next()
	}
})

pipe.step('pingNode', async function (pipe, data) {
	Object.values(pipe.data.workloadsForNode).forEach((nodeWorkloads) => {
		let batchStatusRequest = function (node, workloads) {
			axios.get('http://' + node._p.spec.address[0] + '/alive', {timeout: 3000}).then((res) => {
				workloads.forEach((workload) => {
					statusWriter (workload, pipe, {err: null})
				})
				axios.post('http://' + node._p.spec.address[0] + '/workloads/pull/status', 
					workloads.map((workload) => {
						return {
							name: workload._p.metadata.name,
							registry: workload._p.spec.image.registry,
							image: workload._p.spec.image.image,
							pullUid: workload._p.scheduler.container.pullUid
						}
					})
				).then(async (res) => {
					workloads.forEach(async (workload) => {
						console.log(res.data)
						let oneWorkloadResult = res.data[workload._p.metadata.name]
						console.log('PULL STATUS', workload._p.metadata.name, oneWorkloadResult)
						if (oneWorkloadResult.status == 'error') {
							workload._p.currentStatus = GE.WORKLOAD.ERROR
							workload._p.status.push(GE.status(GE.WORKLOAD.ERROR, GE.ERROR.PULL_FAILED))
							workload._p.status.locked = false
							await workload.update()
						} else if (oneWorkloadResult.status == 'done') {
							workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
							workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, null))
							await workload.update()
						}
					
					})
				}).catch((err) => {
					console.log('NODE', node._p.metadata.name, 'IS DEAD', err)
				})
			}).catch((err) => {
				workloads.forEach((workload) => {
					statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
				})
				pipe.end()
			})
		}
		batchStatusRequest(nodeWorkloads.node, nodeWorkloads.workloads)
		pipe.end()
	})
})

module.exports = scheduler