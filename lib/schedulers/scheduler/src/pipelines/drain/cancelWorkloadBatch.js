'use strict'

const GE = require('../../../../../index').events
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('cancelWorkloadBatch')
let request = require('../../../../../index')

pipe.step('verifyContainerIsAssigned', async function (pipe, data) {
	let workloads = data.workloads
	for (var workloadIndex = 0; workloadIndex < workloads.length; workloadIndex += 1) {
		if (workloads[workloadIndex]._p.scheduler == undefined 
			|| workloads[workloadIndex]._p.scheduler.container == undefined 
			|| workloads[workloadIndex]._p.scheduler.pwnnode == undefined
			|| workloads[workloadIndex]._p.scheduler.pwnnode.assignedToPwmnode == false) {
			/** 
			*	Do not stop this workload, never started 
			*/
			workloads[workloadIndex]._p.currentStatus = GE.WORKLOAD.DELETED
			await workloads[workloadIndex].update()
		} 
	}
	pipe.next()
})

module.exports = scheduler 