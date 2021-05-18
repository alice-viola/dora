'use strict'

const { StaticPool } = require('node-worker-threads-pool')
let axios = require('axios')
let shell = require ('shelljs')
let parseString = require ('xml2js').parseString

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('manage')

let DockerDriver = require('../../../../core/index').Driver.Docker
let DockerDb = require('../../../../core/index').Driver.DockerDb


pipeline.step('fetch-status', async (pipe, job) => {
	// console.log(job)
	if (job == undefined) {
		pipe.end()
		return
	}
	let containerName = 'dora.' + job.workspace + '.' + job.name
	let container = job
	let desired = job.desired
	let c = await DockerDriver.get(containerName)
	if (c.err !== null && c.err.statusCode == 404 && DockerDb.getContainer(containerName) == undefined) {
		console.log('Container', containerName, 'not exist, first view')
		// CREATE Container
		if (desired == 'run') {
			DockerDb.setContainer(containerName, container)
			DockerDriver.create(containerName, container)
		}
	} else if (c.err !== null && c.err.statusCode == 404 && DockerDb.getContainer(containerName) != undefined) {
		console.log('Container', containerName, 'not exist, creating')
		// TODO Check Progress
	} else if (c.err == null && DockerDb.getContainer(containerName) != undefined) {
		console.log('Container', containerName, 'exist')

	} else if (c.err == null && DockerDb.getContainer(containerName) == undefined) {
		// Node server restarted
		DockerDb.setContainer(containerName, container)
		console.log('Container', containerName, 'exist')

	}
	pipe.next()
})

//pipeline.step('get-all-test', async (pipe, job) => {
//	console.log(await DockerDriver.getAll())
//})

module.exports.getScheduler = () => { return scheduler }