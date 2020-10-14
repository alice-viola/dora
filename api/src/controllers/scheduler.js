'use strict'

const GE = require('../events/global')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: 2000,
		onEvents: [GE.SystemStarted]
	},
	on: {
		end: {
			exec: [
				(scheduler, pipeline) => {					
					scheduler.assignData('fetchNodes', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkload', 'volumes', pipeline.data().volumes)
					scheduler.assignData('assignWorkload', 'storages', pipeline.data().storages)
					scheduler.assignData('assignWorkload', 'workingdir', pipeline.data().workingdir)
					scheduler.assignData('assignWorkload', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('assignWorkload', 'alreadyAssignedCpu', pipeline.data().alreadyAssignedCpu)
					
					scheduler.feed({
						name: 'fetchNodes',
						data: pipeline.data().nodes
					})

					scheduler.feed({
						name: 'assignWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('pullWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'pullWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('checkPull', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'checkPull',
						data: pipeline.data().workloads
					})

					scheduler.assignData('launchWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'launchWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('checkLaunch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'checkLaunch',
						data: pipeline.data().workloads
					})

					scheduler.assignData('statusWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'statusWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('cancelWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'cancelWorkload',
						data: pipeline.data().workloads
					})

					scheduler.emit('fetchdbEnd')
				}
			]
		}
	}
})

scheduler.run({
	name: 'fetchNodes', 
	pipeline: require('./pipelines/fetchnodes').getPipeline('fetchNodes'),
	run: {
		everyMs: 5000,
	},
	on: {
		end: {
			exec: [
				(scheduler, pipeline) => {
					scheduler.assignData('assignWorkload', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkload', 'availableGpu', pipeline.data().availableGpu)
					scheduler.assignData('assignWorkload', 'availableCpu', pipeline.data().availableCpu)
					scheduler.emit('fetchNodesEnd')
				}
			]
		}
	}
})

scheduler.run({
	name: 'assignWorkload', 
	pipeline: require('./pipelines/assignWorkload').getPipeline('assignWorkload'),
	run: {
		onEvent: 'fetchdbEnd' // TODO: Questo era *fetchNodesEnd*, ho cambiato, da verificare stabilità
	}
})

scheduler.run({
	name: 'pullWorkload', 
	pipeline: require('./pipelines/pullWorkload').getPipeline('pullWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'checkPull', 
	pipeline: require('./pipelines/checkPull').getPipeline('checkPull'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'launchWorkload', 
	pipeline: require('./pipelines/launchWorkload').getPipeline('launchWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'checkLaunch', 
	pipeline: require('./pipelines/checkLaunch').getPipeline('checkLaunch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'statusWorkload', 
	pipeline: require('./pipelines/statusWorkload').getPipeline('statusWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'cancelWorkload', 
	pipeline: require('./pipelines/cancelWorkload').getPipeline('cancelWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.log(false)