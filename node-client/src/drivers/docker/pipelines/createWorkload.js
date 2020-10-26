let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipeline = scheduler.pipeline('createWorkload')
let db = require('../db')
let driver = require('../driver')

pipeline.step('create', async (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	let _job = await db.getWorkloadInDb(job.workload.scheduler.container.name)
	if (_job.wants == 'RUN') {
		pipe.next()	
	} else {
		pipe.end()
	}
})

pipeline.step('pullnewcontainer', (pipe, job) => {
	driver.pull(pipe, job.workload)
})

pipeline.step('stopcontainer', (pipe, job) => {
	driver.preStop(pipe, job.workload)
})

pipeline.step('createVolumes', (pipe, job) => {
	driver.createVolumes(pipe, job.workload)
})

pipeline.step('start', (pipe, job) => {
	driver.createContainer(pipe, job.workload)
})

pipeline.step('end', async (pipe, job) => {
	await db.updateWorkloadStatus(job.workload.scheduler.container.name, job, pipe.data.status)	
	pipe.end()
})

module.exports = scheduler