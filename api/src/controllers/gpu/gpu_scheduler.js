'use strict'

const GE = require('../../events/global')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchDataFromDb', 
	pipeline: require('./gpu_fetch_db_pipeline').getPipeline('fetchDataFromDb'),
	run: {
		everyMs: 3000,
		onEvents: [GE.SystemStarted]
	},
	on: {
		end: {
			exec: [
				(scheduler, pipeline) => {
					// To gpuAssignedToLaunch
					scheduler.assignData('gpuAssignedToLaunch', 'volumes', pipeline.data().volumes)
					scheduler.assignData('gpuAssignedToLaunch', 'nodes', pipeline.data().nodes)
					scheduler.assignData('gpuAssignedToLaunch', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('gpuAssignedToLaunch', 'volumes', pipeline.data().volumes)

					scheduler.feed({
						name: 'gpuAssignedToLaunch',
						data: pipeline.data().workloads.filter((w) => 
							{ return w.status() == undefined 
								|| w.status() == GE.WORKLOAD.INSERTED })
					})

					// To gpuPullWorkload
					scheduler.assignData('gpuPullWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'gpuPullWorkload',
						data: pipeline.data().workloads.filter((w) => 
							{ return w.status() == GE.WORKLOAD.ASSIGNED || w.status() == GE.WORKLOAD.PULLING })
					})

					scheduler.assignData('gpuCheckPullImage', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'gpuCheckPullImage',
						data: pipeline.data().workloads.filter((w) => 
							{ return w.status() == GE.WORKLOAD.REQUESTED_PULLING })
					})

					// To gpuLaunchWorkload
					scheduler.assignData('gpuLaunchWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'gpuLaunchWorkload',
						data: pipeline.data().workloads.filter((w) => 
							{ return w.status() == GE.WORKLOAD.LAUNCHING })
					})

					// To gpuRequestedLaunch
					scheduler.feed({
						name: 'gpuCheckRequestedLaunchWorkload',
						data: pipeline.data().workloads.filter((w) => { return w.status() == GE.WORKLOAD.REQUESTED_LAUNCH })
					})

					// To gpuStatusWorkload
					scheduler.assignData('gpuStatusWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'gpuStatusWorkload',
						data: pipeline.data().workloads.filter((w) => { return w.status() == GE.WORKLOAD.RUNNING })
					})

					// To gpuCancelWorkload
					scheduler.assignData('gpuCancelWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'gpuCancelWorkload',
						data: pipeline.data().workloads.filter((w) => { return w.status() == GE.WORKLOAD.REQUESTED_CANCEL })
					})

					scheduler.emit('dbFetchCompleted')
				}
			]
		}
	}
})

scheduler.run({
	name: 'fetchGpuFromNodes', 
	pipeline: require('./gpu_fetch_nodes_pipeline').getPipeline('fetchGpuFromNodes'),
	run: {
		onEvent: 'dbFetchCompleted'
	},
	on: {
		end: {
			exec: [
				(scheduler, pipeline) => {
					scheduler.assignData('gpuAssignedToLaunch', 'availableGpu', pipeline.data().availableGpu)
				}
			],
			emit: ['gpuFetchCompleted']
		}
	}
})

scheduler.run({
	name: 'gpuAssignedToLaunch', 
	pipeline: require('./gpu_toassign_pipeline').getPipeline('gpuAssignedToLaunch'),
	run: {
		onEvent: 'gpuFetchCompleted'
	},
	on: {
		end: {
			emit: ['launchWorkload']
		}
	}
})

scheduler.run({
	name: 'gpuPullWorkload', 
	pipeline: require('./gpu_pull_image_pipeline').getPipeline('gpuPullWorkload'),
	run: {
		onEvent: 'launchWorkload'
	}
})

scheduler.run({
	name: 'gpuCheckPullImage', 
	pipeline: require('./gpu_check_pull_pipeline').getPipeline('gpuCheckPullImage'),
	run: {
		onEvent: 'dbFetchCompleted'
	}
})

scheduler.run({
	name: 'gpuLaunchWorkload', 
	pipeline: require('./gpu_launch_pipeline').getPipeline('gpuLaunchWorkload'),
	run: {
		onEvent: 'dbFetchCompleted'
	}
})

scheduler.run({
	name: 'gpuCheckRequestedLaunchWorkload', 
	pipeline: require('./gpu_requested_launch.js').getPipeline('gpuCheckRequestedLaunchWorkload'),
	run: {
		onEvent: 'dbFetchCompleted'
	}
})

scheduler.run({
	name: 'gpuStatusWorkload', 
	pipeline: require('./gpu_container_state_cntl_pipeline').getPipeline('gpuStatusWorkload'),
	run: {
		onEvent: 'dbFetchCompleted'
	}
})

scheduler.run({
	name: 'gpuCancelWorkload', 
	pipeline: require('./gpu_cancel_pipeline').getPipeline('gpuCancelWorkload'),
	run: {
		onEvent: 'dbFetchCompleted'
	}
})

scheduler.log(true)
