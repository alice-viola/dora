let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipeline = scheduler.pipeline('deleteWorkload')
let db = require('../db')
let driver = require('../driver')

pipeline.step('delete', (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	pipe.next()
})


pipeline.step('stopcontainer', (pipe, job) => {
	driver.stop(pipe, job.workload)
})

//pipeline.step('deletecontainer', (pipe, job) => {
//	driver.deleteContainer(pipe, job.workload)
//})

pipeline._pipeEndCallback(async (pipe, job) => {
	await db.updateWorkloadStatus(job.workload.scheduler.container.name, job, pipe.data.status)	
})


module.exports = scheduler