'use strict'

const GE = require('../../libcommon').events
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

GE.Emitter.setMaxListeners(10)

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetch/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: process.env.PIPELINE_FETCH_DB_MS || 5000,
		onEvents: [GE.SystemStarted, GE.ApiCall]
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {	
					
					scheduler.assignData('launchWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'launchWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.currentStatus == GE.WORKLOAD.ASSIGNED 
								|| workload._p.currentStatus == GE.WORKLOAD.LAUNCHING
						}) }]
					})


					/**
					*	Status part
					*/
					scheduler.assignData('statusWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'statusWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.scheduler !== undefined 
								&& workload._p.scheduler.pwmnode !== undefined 
								&& workload._p.scheduler.pwmnode.assignedToPwmnode == true 
								&& (workload._p.wants == 'RUN' || workload._p.wants == 'PAUSE')
								&& workload._p.currentStatus !== GE.WORKLOAD.NOT_PRESENT
								&& workload._p.currentStatus !== GE.WORKLOAD.EXITED
								&& workload._p.currentStatus !== GE.WORKLOAD.DELETED 
								&& workload._p.currentStatus !== GE.WORKLOAD.ERROR_CREATING_CONTAINER
								&& workload._p.currentStatus !== GE.WORKLOAD.ERROR_STARTING_CONTAINER
								&& workload._p.currentStatus !== GE.WORKLOAD.PAUSED 
								&& workload._p.currentStatus !== GE.WORKLOAD.ASSIGNED
						}) }]
					})

					/**
					*	Pause
					*/
					scheduler.assignData('pauseWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('pauseWorkloadBatch', 'volumes', pipeline.data().volumes)
					scheduler.feed({
						name: 'pauseWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => { 
							return workload._p.wants == GE.RESOURCE.WANT_PAUSE 
							&& workload._p.currentStatus == GE.WORKLOAD.RUNNING })}]
					})

					/**
					*	Drain part
					*/
					scheduler.assignData('cancelWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('cancelWorkloadBatch', 'volumes', pipeline.data().volumes)
					scheduler.feed({
						name: 'cancelWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => { 
							return (workload._p.wants == GE.RESOURCE.WANT_STOP 
							|| workload._p.wants == GE.RESOURCE.WANT_DRAIN) 
							&& workload._p.currentStatus !== GE.WORKLOAD.DELETED 
							&& workload._p.currentStatus !== GE.WORKLOAD.EXITED 
							&& workload._p.currentStatus !== GE.WORKLOAD.CRASHED })}]
					})

					scheduler.emit('fetchdbEnd')
				}
			]
		}
	}
})

scheduler.run({
	name: 'launchWorkloadBatch', 
	pipeline: require('./pipelines/create/launchWorkloadBatch').getPipeline('launchWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'statusWorkloadBatch', 
	pipeline: require('./pipelines/status/statusWorkloadBatch').getPipeline('statusWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	},
	on: {
		end: {
			emit: ['endStatusBatch']
		}
	}
})

scheduler.run({
	name: 'pauseWorkloadBatch', 
	pipeline: require('./pipelines/status/pauseWorkloadBatch').getPipeline('pauseWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'cancelWorkloadBatch', 
	pipeline: require('./pipelines/drain/cancelWorkloadBatch').getPipeline('cancelWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.log(false)

GE.Emitter.emit(GE.SystemStarted)