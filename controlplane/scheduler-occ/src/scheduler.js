'use strict'

const GE = require('../../libcommon').events
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

GE.Emitter.setMaxListeners(20)

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetch/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: process.env.PIPELINE_OUT_OF_CREDIT_KILLER_MS || 10000,
		onEvents: [GE.SystemStarted, GE.ApiCall]
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {		

					scheduler.feed({
						name: 'outOfCreditKiller',
						data: pipeline.data().users
					})
					
					scheduler.emit('fetchdbEnd')
				}
			]
		}
	}
})

scheduler.run({
	name: 'outOfCreditKiller', 
	pipeline: require('./pipelines/killers/out_of_credit_killer').getPipeline('outOfCreditKiller'),
	run: {
		onEvents: ['fetchdbEnd']
	}
})

scheduler.log(false)

GE.Emitter.emit(GE.SystemStarted)