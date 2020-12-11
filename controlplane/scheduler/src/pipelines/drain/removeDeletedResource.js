'use strict'

const GE = require('../../../../libcommon').events
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('removeDeletedResource')

pipe.step('groupWorkloadsByNode', async function (pipe, data) {
	let resourceAryToDelete = Object.values(data)
	resourceAryToDelete = resourceAryToDelete.flat()
	for (var resourceIndex = 0; resourceIndex < resourceAryToDelete.length; resourceIndex += 1) {
		await resourceAryToDelete[resourceIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 