'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db, docker

let statusPipeline = require('./pipelines/status')
let managePipeline = require('./pipelines/manage')

module.exports.start = () => {
	scheduler.run({
		name: 'fetchWorkload', 
		pipeline: statusPipeline.getScheduler().getPipeline('status'),
		run: {
			everyMs: 1000,
			onEvent: 'start'
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
	scheduler.log(false)
	scheduler.emit('start')
}


scheduler.run({
	name: 'manageContainers', 
	pipeline: managePipeline.getScheduler().getPipeline('manage'),
	run: {
		onEvent: 'fetchWorkloadEnd'
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {	
					
				}	
			]
		}
	}
})
scheduler.log(false)
scheduler.emit('start')

module.exports.set = (args) => {

}
