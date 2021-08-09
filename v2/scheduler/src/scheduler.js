'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

let ReplicaController = require('./replica-controller/controller')
let ReplicaControllerSf = require('./replica-controller/controller_sf')
let SchedulerAssign = require('./replica-controller/assign')
let SchedulerDrain = require('./replica-controller/drain')
let CheckNodes = require('./replica-controller/checknodes')

/**
*	This pipeline
*	scales up and down the
*	replica count for each workload
*/
let firstRun = true
let firstRunCheckNodes = true
let replicaControllerRun = new Date()
let checkNodesControllerRun = new Date()

scheduler.run({
	name: 'ReplicaController', 
	pipeline: scheduler.pipeline('ReplicaController').step('Run', async (pipe, job) => {
		if ((new Date() - replicaControllerRun) > 30000) {
			replicaControllerRun = new Date()
			firstRun = true
		}   
		let rc = new ReplicaControllerSf({
			zone: process.env.ZONE,
			firstRun: firstRun
		})	
		await rc.run()
		firstRun = false
		pipe.data.containersToCreate = rc.containersToCreate()
		pipe.data.containersToDrain = rc.containersToDrain()

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
		await assignController.assign()
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
		await assignController.drain()
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

scheduler.run({
	name: 'CheckNodes', 
	pipeline: scheduler.pipeline('CheckNodes').step('Check', async (pipe, job) => {
		if ((new Date() - checkNodesControllerRun) > 30000) {

			checkNodesControllerRun = new Date()
			let checkNodes = new CheckNodes({firstRun: firstRunCheckNodes})
			await checkNodes.check()
			firstRunCheckNodes = false
			pipe.next()
		} else {
			pipe.next()
		}
	}),
	run: {
		onEvent: 'ReplicaControllerEnd',
	}
})

scheduler.log('false')
scheduler.emit('start')
