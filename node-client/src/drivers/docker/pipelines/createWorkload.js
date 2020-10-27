'use strict'

const { StaticPool } = require('node-worker-threads-pool')

let STATUS = require('../global.js')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('createWorkload')
let db

let THREADS_POOLS = 4

let task = async function (_job) {
	return new Promise((resolve, reject) => {
		let Piperunner = require('piperunner')
		let driver = require('./src/drivers/docker/driver')
		
		let createPipe = new Piperunner.Pipeline()
		createPipe.step('pullnewcontainer', (createPipe, job) => {
			driver.pull(createPipe, job.workload)
		})
		
		createPipe.step('stopcontainer', (createPipe, job) => {
			driver.preStop(createPipe, job.workload)
		})
	
		createPipe.step('delcontainer', (createPipe, job) => {
			driver.preDeleteContainer(createPipe, job.workload)
		})
		
		createPipe.step('createVolumes', (createPipe, job) => {
			driver.createVolumes(createPipe, job.workload)
		})
		
		createPipe.step('start', (createPipe, job) => {
			driver.createContainer(createPipe, job.workload)
		})		
		createPipe.setEndCallback(() => {
			resolve()
		})
		createPipe.setJob(_job)
		createPipe.run()
	})
}

const staticPool = new StaticPool({
	size: THREADS_POOLS,
	task: task
})


/**
*	We use this variable
*	because we don't want to
*	schedule containers 
*	until there is an empty worker.
*	
*	Doing so we can unscheduler the not 
*	yet created container at every moment.
*
* 	Without this flag, if the user wants 1000
*	containers, and after few seconds he change
*	idea, asking for the stop, there is no possibility to break
*	the creation loop
*/
let runningTasks = 0

pipeline.step('check', async (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	let _job = await db.getWorkloadInDb(job.workload.scheduler.container.name)

	if (_job.wants == 'RUN' && runningTasks < THREADS_POOLS) {
		runningTasks += 1
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.CREATING)
		pipe.next()
		await staticPool.exec(job)
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.CREATED)
		runningTasks -= 1
	} else {
		//console.log('SKIPPING', runningTasks)
		if (runningTasks < THREADS_POOLS) {
			pipe.endRunner()	
		} else {
			pipe.end()
		}
	}
})

module.exports.getScheduler = () => { return scheduler }
module.exports.set = (args) => {
	db = args.db
} 