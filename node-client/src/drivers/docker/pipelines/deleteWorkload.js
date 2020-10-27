'use strict'

const { StaticPool } = require('node-worker-threads-pool')

let STATUS = require('../global.js')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('deleteWorkload')
let db

let THREADS_POOLS = 4

let task = async function (_job) {
	return new Promise((resolve, reject) => {
		let Piperunner = require('piperunner')
		let driver = require('./src/drivers/docker/driver')
		
		let deletePipe = new Piperunner.Pipeline()
		deletePipe.step('stopcontainer', (pipe, job) => {
			driver.stop(pipe, job.workload)
		})	
		deletePipe.setEndCallback(() => {
			resolve()
		})
		deletePipe.setJob(_job)
		deletePipe.run()
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
	if (_job.wants == 'STOP' && runningTasks < THREADS_POOLS) {
		runningTasks += 1
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.DELETING)
		pipe.next()
		
		await staticPool.exec(job)
		db.updateWorkloadInternalStatus(job.workload.scheduler.container.name, job, STATUS.DELETED)
		db.updateWorkloadStatus(job.workload.scheduler.container.name, job, STATUS.DELETED, null)
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