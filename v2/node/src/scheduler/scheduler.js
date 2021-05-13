'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db, docker

let statusPipeline = require('./pipelines/status')

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
						
					}	
				]
			}
		}
	})
	scheduler.log(false)
	scheduler.emit('start')
	
}

module.exports.set = (args) => {
	// db = args.db
	// docker = args.docker
	// createPipeline.set(args)
	// deletePipeline.set(args)
	// pausePipeline.set(args)
}
