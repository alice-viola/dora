'use strict'

const GE = require('../../libcommon').events
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

GE.Emitter.setMaxListeners(20)

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchNodes', 
	pipeline: require('./pipelines/fetch/fetchnodes').getPipeline('fetchNodes'),
	run: {
		everyMs: process.env.PIPELINE_FETCH_NODES_MS || 5000,
	}
})

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
					await GE.LOCK.API.acquireAsync()

					/**
					*	Create part
					*/

					scheduler.assignData('assignWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkloadBatch', 'groups', pipeline.data().groups)
					scheduler.assignData('assignWorkloadBatch', 'users', pipeline.data().users)
					scheduler.assignData('assignWorkloadBatch', 'volumes', pipeline.data().volumes)
					scheduler.assignData('assignWorkloadBatch', 'storages', pipeline.data().storages)
					scheduler.assignData('assignWorkloadBatch', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('assignWorkloadBatch', 'alreadyAssignedCpu', pipeline.data().alreadyAssignedCpu)
					
					scheduler.feed({
						name: 'assignWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.wants == 'RUN' && (workload._p.currentStatus == null 
							|| workload._p.currentStatus == GE.WORKLOAD.INSERTED 
							|| workload._p.currentStatus == GE.WORKLOAD.QUENED)
						}) }]
					})

					scheduler.assignData('checkVolumes', 'storages', pipeline.data().storages)
					scheduler.assignData('checkVolumes', 'groups', pipeline.data().groups)
					scheduler.assignData('checkVolumes', 'users', pipeline.data().users)
					scheduler.feed({
						name: 'checkVolumes',
						data: [{volumes: pipeline.data().volumes.filter((vol) => {
							return vol._p.currentStatus == null 
							|| vol._p.currentStatus == GE.VOLUME.INSERTED 
							|| vol._p.currentStatus == GE.VOLUME.DENIED
						}) }]
					})

					scheduler.feed({
						name: 'createStorage',
						data: [{storages: pipeline.data().storages.filter((storage) => {
							return storage._p.currentStatus == null 
							|| storage._p.currentStatus == GE.STORAGE.INSERTED
						}) }]
					})

					scheduler.feed({
						name: 'createNode',
						data: [{nodes: pipeline.data().nodes.filter((node) => {
							return node._p.currentStatus == null 
							|| node._p.currentStatus == GE.NODE.INSERTED
						}) }]
					})

					scheduler.feed({
						name: 'createUser',
						data: [{users: pipeline.data().users.filter((user) => {
							return user._p.currentStatus == null 
							|| user._p.currentStatus == GE.USER.INSERTED
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
					*	Unpause
					*/
					scheduler.assignData('assignPausedWorkloadBatch', 'users', pipeline.data().users)
					scheduler.assignData('assignPausedWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignPausedWorkloadBatch', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('assignPausedWorkloadBatch', 'alreadyAssignedCpu', pipeline.data().alreadyAssignedCpu)
					scheduler.feed({
						name: 'assignPausedWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.wants == 'RUN' && (workload._p.currentStatus == GE.WORKLOAD.PAUSED)
						}) }]
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

					scheduler.assignData('drainVolumesBatch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('drainVolumesBatch', 'storages', pipeline.data().storages)
					scheduler.feed({
						name: 'drainVolumesBatch',
						data: [{volumes: pipeline.data().volumes.filter((volume) => { return (volume._p.wants == GE.RESOURCE.WANT_DRAIN  && volume._p.currentStatus == GE.VOLUME.CREATED) })}]
					})

					scheduler.feed({
						name: 'drainStorages',
						data: [{storages: pipeline.data().storages.filter((storage) => { return (storage._p.wants == GE.RESOURCE.WANT_DRAIN && storage._p.currentStatus == GE.STORAGE.CREATED) })}]
					})

					scheduler.feed({
						name: 'drainNodes',
						data: [{nodes: pipeline.data().nodes.filter((node) => { return (node._p.wants == GE.RESOURCE.WANT_DRAIN) })}]
					})

					scheduler.feed({
						name: 'drainUsers',
						data: [{users: pipeline.data().users.filter((user) => { return (user._p.wants == GE.RESOURCE.WANT_DRAIN && user._p.currentStatus == GE.USER.CREATED) })}]
					})

					scheduler.feed({
						name: 'drainGroups',
						data: [{groups: pipeline.data().groups.filter((group) => { return (group._p.wants == GE.RESOURCE.WANT_DRAIN /**&& group._p.currentStatus == GE.USER.CREATED **/) })}]
					})

					scheduler.feed({
						name: 'removeDeletedResource',
						data: [{
							workloads: pipeline.data().workloads.filter((workload) => { return (workload._p.wants == GE.RESOURCE.WANT_STOP || workload._p.wants == GE.RESOURCE.WANT_DRAIN) 
								&& (workload._p.currentStatus == GE.WORKLOAD.DELETED || workload._p.currentStatus == GE.WORKLOAD.EXITED) }),
							volumes: pipeline.data().volumes.filter((volume) => { return (volume._p.wants == GE.RESOURCE.WANT_DRAIN && volume._p.currentStatus == GE.VOLUME.DELETED)})
						}]
					})

					scheduler.feed({
						name: 'drainLoop',
						data: [{binds: pipeline.data().binds.filter((bind) => { return bind._p.wants == GE.RESOURCE.WANT_DRAIN && bind._p.currentStatus != GE.RESOURCE.DRAINING }) }]
					})

					/**
					*	Killers
					*/
					scheduler.assignData('outOfCreditKiller', 'workloads', pipeline.data().workloads.filter((wk) => { return wk._p.wants == GE.RESOURCE.WANT_RUN && wk._p.currentStatus != GE.RESOURCE.DRAINING }))
					scheduler.feed({
						name: 'outOfCreditKiller',
						data: pipeline.data().users
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
	pipeline: require('./pipelines/create/assignWorkloadBatch').getPipeline('assignWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'assignPausedWorkloadBatch', 
	pipeline: require('./pipelines/create/assignPausedWorkloadBatch').getPipeline('assignPausedWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
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
	name: 'cancelWorkloadBatch', 
	pipeline: require('./pipelines/drain/cancelWorkloadBatch').getPipeline('cancelWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainLoop', 
	pipeline: require('./pipelines/drain/drainLoop').getPipeline('drainLoop'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'removeDeletedResource', 
	pipeline: require('./pipelines/drain/removeDeletedResource').getPipeline('removeDeletedResource'),
	run: {
		onEvent: 'endStatusBatch'
	}
})

scheduler.run({
	name: 'checkVolumes', 
	pipeline: require('./pipelines/create/createVolumes').getPipeline('checkVolumes'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainVolumesBatch', 
	pipeline: require('./pipelines/drain/drainVolumesBatch').getPipeline('drainVolumesBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'createStorage', 
	pipeline: require('./pipelines/create/createStorage').getPipeline('createStorage'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainStorages', 
	pipeline: require('./pipelines/drain/drainStorages').getPipeline('drainStorages'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'createUser', 
	pipeline: require('./pipelines/create/createUser').getPipeline('createUser'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainUsers', 
	pipeline: require('./pipelines/drain/drainUsers').getPipeline('drainUsers'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainGroups', 
	pipeline: require('./pipelines/drain/drainGroups').getPipeline('drainGroups'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'createNode', 
	pipeline: require('./pipelines/create/createNode').getPipeline('createNode'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'drainNodes', 
	pipeline: require('./pipelines/drain/drainNodes').getPipeline('drainNodes'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'outOfCreditKiller', 
	pipeline: require('./pipelines/killers/out_of_credit_killer').getPipeline('outOfCreditKiller'),
	run: {
		everyMs: process.env.PIPELINE_OUT_OF_CREDIT_KILLER_MS || 10000
	}
})

scheduler.run({
	name: 'pauseWorkloadBatch', 
	pipeline: require('./pipelines/status/pauseWorkloadBatch').getPipeline('pauseWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.log(false)
