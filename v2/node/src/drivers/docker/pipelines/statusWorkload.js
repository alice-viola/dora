let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipeline = scheduler.pipeline('statusWorkload')
let db = require('../db')
let driver = require('../driver')

pipeline.step('status', (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	driver.getContainer(pipe, job.workload)
})

pipeline.step('end', async (pipe, job) => {
	if (pipe.data.containerStatus !== null) {
		await db.updateWorkloadStatus(job.workload.scheduler.container.name, job, pipe.data.containerStatus)		
		await db.updateWorkloadContainerId(job.workload.scheduler.container.name, job, pipe.data.containerId)
	} else if (pipe.data.containerStatus == null && job.status == 'RUNNING') {
		// Its exited or crashed
		await db.updateWorkloadStatus(job.workload.scheduler.container.name, job, 'EXITED')
	}
	pipe.end()
})


module.exports = scheduler