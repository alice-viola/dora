'use strict'

const { StaticPool } = require('node-worker-threads-pool')

let STATUS = require('../global.js')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('pauseWorkload')
let db

let THREADS_POOLS = 4

let task = async function (_job) {
	return new Promise((resolve, reject) => {
		let Piperunner = require('piperunner')
		let driver = require('./src/drivers/docker/driver')
		
		let pausePipe = new Piperunner.Pipeline()
		pausePipe.step('commitcontainer', (pipe, job) => {
			driver.commitLocal(pipe, job.workload)
		})	
		pausePipe.step('pausecontainer', (pipe, job) => {
			driver.stop(pipe, job.workload)
		})	
		pausePipe.setEndCallback(() => {
			resolve()
		})
		pausePipe.setJob(_job)
		pausePipe.run()
	})
}

const staticPool = new StaticPool({
	size: THREADS_POOLS,
	task: task
})

let runningTasks = 0

pipeline.step('check', async (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	let _job = await db.getWorkloadInDb(job.workload.scheduler.container.name)
	if (_job.wants == 'PAUSE' && runningTasks < THREADS_POOLS) {
		runningTasks += 1
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.PAUSING)
		pipe.next()
		
		await staticPool.exec(job)
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.PAUSED)
		db.updateWorkloadStatus(job.workload.scheduler.container.name, job, STATUS.PAUSED, null)
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