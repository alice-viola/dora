'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainStorages')

pipe.step('drainStorages', async function (pipe, data) {
	let storages = data.storages
	for (var storageIndex = 0; storageIndex < storages.length; storageIndex += 1) {
		await storages[storageIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 