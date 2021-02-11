'use strict'

const GE = require('../../../../../index').events
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainNodes')
let request = require('../../fn/request')

/**
*	In future we will also delete data on physical nodes
*/
pipe.step('drainNodes', async function (pipe, data) {
	let nodes = data.nodes
	for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
		await nodes[nodeIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 