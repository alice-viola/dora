'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db, docker

let statusPipeline = require('./pipelines/status')
let managePipeline = require('./pipelines/manage')
let cleanPipeline = require('./pipelines/clean')

module.exports.start = () => {
	scheduler.run({
		name: 'manageContainers', 
		pipeline: managePipeline.getScheduler().getPipeline('manage'),
		run: {
			everyMs: 1000,
			onEvent: 'start'
		},
		on: {
			end: {
				exec: [
					async (scheduler, pipeline) => {	
						scheduler.emit('manageEnd')
					}	
				]
			}
		}
	})	

	scheduler.run({
		name: 'fetchWorkload', 
		pipeline: statusPipeline.getScheduler().getPipeline('status'),
		run: {
			//everyMs: 1000,
			onEvent: 'manageEnd'
		},
		on: {
			end: {
				exec: [
					async (scheduler, pipeline) => {	

						scheduler.feed({
							name: 'manageContainers',
							data:  pipeline.data().containers
						})
						scheduler.emit('fetchWorkloadEnd')
					}	
				]
			}
		}
	})

	// Clean the node every 12 hours
	scheduler.run({
		name: 'cleanNode', 
		pipeline: cleanPipeline.getScheduler().getPipeline('clean'),
		run: {
			everyMs: 1000 * 60 * 60 * 12,
			onEvent: 'start'
		}
	})	

	scheduler.log(false)
	scheduler.emit('start')
}

module.exports.set = (args) => {}
