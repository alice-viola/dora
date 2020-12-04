'use strict'

const GE = require('../../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('launchWorkloadBatch')
let request = require('../../fn/request')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
		workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, err))
		await workload.update()
	}
}

pipe.step('checkWorkloadStatus', async function (pipe, workloads) {
	if (workloads == undefined || workloads.workloads == undefined) {
		pipe.endRunner()
		return
	}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		if (workload._p.currentStatus == GE.WORKLOAD.ASSIGNED) {
			workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
			workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING))
			await workload.update()	
		}
	}
	pipe.next()
})

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


pipe.step('launchRequest', async function (pipe, data) {
	Object.values(pipe.data.workloadsForNode).forEach((nodeWorkloads) => {
		let batchStatusRequest = async function (node, workloads) {
			for (var workloadIndex = 0; workloadIndex < workloads.length; workloadIndex += 1) {
				let workload = workloads[workloadIndex]
				//statusWriter (workload, pipe, {err: null})
				workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_LAUNCH))
				workload._p.currentStatus = GE.WORKLOAD.REQUESTED_LAUNCH
				if (workload._p.scheduler.container == undefined) {
					workload._p.scheduler.container = {}
					workload._p.scheduler.container.launchedRequest = []		
				}
				workload._p.scheduler.pwmnode = {}
				workload._p.scheduler.pwmnode.assignedToPwmnode = true
				workload._p.scheduler.container.pullUid = randomstring.generate(24)
				workload._p.scheduler.container.launchedRequest.push({node: node._p.spec.address[0], date: new Date()})
				await workload.update()
			
			}
			let apiVersion = GE.DEFAULT.API_VERSION
			request({
				method: 'post',
				node: node,
				path: '/' + apiVersion + '/' + 'batch' + '/create',
				body: {data: workloads.map((workload) => {return workload._p})},
				then: (res) => {

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