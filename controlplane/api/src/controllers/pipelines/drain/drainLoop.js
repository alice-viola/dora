'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainLoop')

let model = require ('../../../models/models')

pipe.step('drainAllBinds', async function (pipe, data) {
	let binds = data.binds
	
	for (var bindId = 0; bindId < binds.length; bindId += 1) {
		console.log('BIND TO DRAIN', binds[bindId]._p._id, 'SPEC', binds[bindId]._p.spec.to)
		let resource = new model[binds[bindId]._p.spec.to.kind]()
		let resourceToDrain = await resource.findOneIdAsResource({_id: binds[bindId]._p.spec.to._id }, model[binds[bindId]._p.spec.to.kind])	
		await resourceToDrain.drain(model['Bind'])
		await resourceToDrain.update()
	}
	pipe.end()
})

module.exports = scheduler 