'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('workload-assign')

let Core = require('../../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

pipeline.step('fetch-wk-to-assign', async (pipe, job) => {
	let wkF = await Class.Workload.Get({
		zone: 'dc-test-01',
		next_step: 'assign'
	})

	if (wkF.err !== null) {
		pipe.end()
		return
	}

	pipe.data.WorkloadToAssing = wkF.data

	pipe.next()
})

pipeline.step('fetch-nodes', async (pipe, job) => {
	let nodesF = await Class.Node.Get({
		zone: 'dc-test-01',
	})
	if (nodesF.err !== null) {
		pipe.end()
		return
	}


	pipe.data.Nodes = nodesF.data
	pipe.next()
})

pipeline.step('filter', async (pipe, job) => {
	console.log(pipe.data.Nodes, pipe.data.WorkloadToAssing)
	pipe.next()
})

module.exports = scheduler