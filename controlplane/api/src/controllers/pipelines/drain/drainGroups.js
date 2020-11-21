'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainGroups')
let request = require('../../fn/request')

/**
*	In future we will also delete data on physical nodes
*/
pipe.step('drainGroups', async function (pipe, data) {
	let groups = data.groups
	for (var groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
		await groups[groupIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 