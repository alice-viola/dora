'use strict'

const GE = require('../events/global')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchNodes', 
	pipeline: require('./pipelines/fetchnodes').getPipeline('fetchNodes'),
	run: {
		everyMs: 5000,
	}
})

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: 5000,
		onEvents: [GE.SystemStarted, GE.ApiCall]
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {		
					await GE.LOCK.API.acquireAsync()
					scheduler.assignData('assignWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkloadBatch', 'volumes', pipeline.data().volumes)
					scheduler.assignData('assignWorkloadBatch', 'storages', pipeline.data().storages)
					scheduler.assignData('assignWorkloadBatch', 'workingdir', pipeline.data().workingdir)
					scheduler.assignData('assignWorkloadBatch', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('assignWorkloadBatch', 'alreadyAssignedCpu', pipeline.data().alreadyAssignedCpu)

					scheduler.feed({
						name: 'assignWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.currentStatus == null 
							|| workload._p.currentStatus == GE.WORKLOAD.INSERTED 
							|| workload._p.currentStatus == GE.WORKLOAD.DENIED
						}) }]
					})

					scheduler.assignData('launchWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'launchWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.currentStatus == GE.WORKLOAD.ASSIGNED 
								|| workload._p.currentStatus == GE.WORKLOAD.LAUNCHING
						}) }]
					})

					scheduler.assignData('statusWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'statusWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.scheduler !== undefined 
								&& workload._p.scheduler.pwmnode !== undefined 
								&& workload._p.scheduler.pwmnode.assignedToPwmnode == true 
								&& (workload._p.currentStatus !== GE.WORKLOAD.DELETED 
								&& workload._p.currentStatus !== GE.WORKLOAD.EXITED 
								&& workload._p.currentStatus !== GE.WORKLOAD.CRASHED)
						}) }]
					})

					// To batch
					scheduler.assignData('cancelWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'cancelWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => { return workload._p.wants == 'STOP' 
							&& workload._p.currentStatus !== GE.WORKLOAD.DELETED 
							&& workload._p.currentStatus !== GE.WORKLOAD.EXITED 
							&& workload._p.currentStatus !== GE.WORKLOAD.CRASHED })}]
					})

					scheduler.feed({
						name: 'removeDeletedWorkloads',
						data: [{workloads: pipeline.data().workloads.filter((workload) => { return workload._p.wants == 'STOP' 
							&& (workload._p.currentStatus == GE.WORKLOAD.DELETED || workload._p.currentStatus == GE.WORKLOAD.EXITED) })}]
					})

					scheduler.emit('fetchdbEnd')
					GE.LOCK.API.release()
				}
			]
		}
	}
})

scheduler.run({
	name: 'assignWorkloadBatch', 
	pipeline: require('./pipelines/assignWorkloadBatch').getPipeline('assignWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'launchWorkloadBatch', 
	pipeline: require('./pipelines/launchWorkloadBatch').getPipeline('launchWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'statusWorkloadBatch', 
	pipeline: require('./pipelines/statusWorkloadBatch').getPipeline('statusWorkloadBatch'),
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
	name: 'cancelWorkloadBatch', 
	pipeline: require('./pipelines/cancelWorkloadBatch').getPipeline('cancelWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'removeDeletedWorkloads', 
	pipeline: require('./pipelines/removeDeletedWorkloads').getPipeline('removeDeletedWorkloads'),
	run: {
		onEvent: 'endStatusBatch'
	}
})

scheduler.log(false)
