'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('removeDeletedWorkloads')

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let workloads = data.workloads
	let workloadsForNode = {}
	for (var workloadIndex = 0; workloadIndex < workloads.length; workloadIndex += 1) {
		await workloads[workloadIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 