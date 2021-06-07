'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

let ReplicaController = require('./replica-controller/controller')
let SchedulerAssign = require('./replica-controller/assign')
let SchedulerDrain = require('./replica-controller/drain')

/**
*	This pipeline
*	scales up and down the
*	replica count for each workload
*/
let firstRun = true
let replicaControllerRun = new Date()

scheduler.run({
	name: 'ReplicaController', 
	pipeline: scheduler.pipeline('ReplicaController').step('Run', async (pipe, job) => {
		if ((new Date() - replicaControllerRun) > 30000) {
			replicaControllerRun = new Date()
			firstRun = true
		}   
		let rc = new ReplicaController({
			zone: 'dc-test-01',
			firstRun: firstRun
		})	
		firstRun = false
		let startDate = new Date()
		await rc.run()
		let endDate = new Date()
		// console.log('TIME TO REPLICA CONTROLLER', ((endDate - startDate) / 1000) + 's', '  Replica rate:',  1 / ((endDate - startDate) / 1000))
		pipe.data.containersToCreate = rc.containersToCreate()
		pipe.data.containersToDrain = rc.containersToDrain()
		pipe.data.containersToUpdate = rc.containersToUpdate()
		pipe.end()
	}),
	run: {
		onEvent: 'start',
		everyMs: process.env.PIPELINE_FETCH_NODES_MS || 1000,
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {	
					scheduler.feed({
						name: 'SchedulerAssign',
						data: pipeline.data().containersToCreate
					})
					scheduler.feed({
						name: 'SchedulerDrain',
						data: pipeline.data().containersToDrain
					})
					scheduler.emit('ReplicaControllerEnd')
				}]
			}
		}
})

/**
*	For each workload associated container
*	we assign to a node if it is unbound
*/
scheduler.run({
	name: 'SchedulerAssign', 
	pipeline: scheduler.pipeline('SchedulerAssign').step('Run', async (pipe, job) => {
		if (job == undefined) {
			pipe.next()
			return
		}

		let assignController = new SchedulerAssign(job) 
		let startDate = new Date()
		await assignController.assign()
		let endDate = new Date()
		// console.log('TIME TO SCHEDULE', job.name(), ((endDate - startDate) / 1000) + 's', '  Scheduling rate:',  1 / ((endDate - startDate) / 1000))
		pipe.next()
	}),
	run: {
		onEvent: 'ReplicaControllerEnd',
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {	

				}]
			}
		}
})

/**
*	For each workload associated container
*	we drain it 
*/
scheduler.run({
	name: 'SchedulerDrain', 
	pipeline: scheduler.pipeline('SchedulerDrain').step('Run', async (pipe, job) => {
		if (job == undefined) {
			pipe.next()
			return
		}
		let assignController = new SchedulerDrain(job) 
		let startDate = new Date()
		await assignController.drain()
		let endDate = new Date()
		// console.log('TIME TO SCHEDULE DRAIN', job.name(), ((endDate - startDate) / 1000) + 's', '  Scheduling rate:',  1 / ((endDate - startDate) / 1000))
		pipe.next()

	}),
	run: {
		onEvent: 'ReplicaControllerEnd',
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {	

				}]
			}
		}
})

scheduler.log('false')
scheduler.emit('start')
