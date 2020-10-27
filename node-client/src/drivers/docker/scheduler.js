'use strict'

let STATUS = require('./global.js')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db, docker

let createPipeline = require('./pipelines/createWorkload')
let deletePipeline = require('./pipelines/deleteWorkload')

module.exports.start = () => {
	scheduler.run({
		name: 'fetchWorkload', 
		pipeline: require('./pipelines/fetchWorkload').getPipeline('fetchWorkload'),
		run: {
			everyMs: 1000,
		},
		on: {
			end: {
				exec: [
					async (scheduler, pipeline) => {	
						scheduler.feed({
							name: 'createWorkload',
							data: pipeline.data().workloads.filter((workload) => {
								return workload.wants == 'RUN' && workload.internalStatus == STATUS.RECV_CREATE
							}) 
						})
						
						scheduler.feed({
							name: 'deleteWorkload',
							data: pipeline.data().workloads.filter((workload) => {
								return workload.wants == 'STOP' && workload.internalStatus == STATUS.RECV_STOP
							}) 
						})
	
						scheduler.emit('endFetchWorkload')
					}
				]
			}
		}
	})
	
	scheduler.run({
		name: 'createWorkload', 
		pipeline: createPipeline.getScheduler().getPipeline('createWorkload'),
		run: {
			onEvent: 'endFetchWorkload',
		}
	})
	
	scheduler.run({
		name: 'deleteWorkload', 
		pipeline: deletePipeline.getScheduler().getPipeline('deleteWorkload'),
		run: {
			onEvent: 'endFetchWorkload',
		}
	})
	
	scheduler.log(false)
}

module.exports.set = (args) => {
	db = args.db
	docker = args.docker
	createPipeline.set(args)
	deletePipeline.set(args)
}
