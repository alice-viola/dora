'use strict'

const { StaticPool } = require('node-worker-threads-pool')
let axios = require('axios')
let fs = require('fs')
let Docker = require('dockerode')
let DockerEvents = require('docker-events')
let shell = require ('shelljs')
let parseString = require ('xml2js').parseString

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('manage')

let DockerDriver = require('../../../../core/index').Driver.Docker
let DockerDb = require('../../../../core/index').Driver.DockerDb

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})

let dockerEmitter = new DockerEvents({
  docker: docker,
})

dockerEmitter.start()

dockerEmitter.on('start', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'running', null)
	// let containerName = message.Actor.Attributes.name
	// let job = db.getWorkloadInDb(containerName)
  	// if (job !== undefined) {
  	// 	db.updateWorkloadContainerId(containerName, job, message.id)
  	// 	db.updateWorkloadStatus(containerName, job, STATUS.RUNNING)	
  	// }
})

dockerEmitter.on('stop', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'deleted', null)
	// let containerName = message.Actor.Attributes.name
  	// let job = db.getWorkloadInDb(containerName)
  	// if (job !== undefined && job.internalStatus !== STATUS.CREATING) {
  	// 	db.updateWorkloadStatus(containerName, job, STATUS.DELETED)	
  	// }
})

dockerEmitter.on('die', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'exited', null)
	// let containerName = message.Actor.Attributes.name
  	// let job = db.getWorkloadInDb(containerName)
  	// if (job !== undefined && job.internalStatus !== STATUS.CREATING) {
  	// 	db.updateWorkloadStatus(containerName, job, STATUS.EXITED)
  	// }
})

pipeline.step('fetch-status', async (pipe, job) => {
	if (job == undefined) {
		console.log('ENDING no job')
		pipe.next()
		return
	}
	try {
		let containerName = 'dora.' + job.workspace + '.' + job.name
		let container = job
		let desired = job.desired
		
		let containerDb = DockerDb.get(containerName) 
		console.log(containerDb)
		if (containerDb == undefined) {
			// Check
			let c = await DockerDriver.get(containerName)
			if (c.err == null && c.data !== null && c.data !== undefined) {
				DockerDb.set(containerName, container, c.data.State.Status, c.err)
				// if (c.data.State.Status !== 'running' && desired == 'run') {
				// 	await DockerDriver.create(containerName, container)	
				// }
				if (desired == 'drain') {
					DockerDb.set(containerName, container, 'draining', null)
					await DockerDriver.drain(containerName)
				}
			} else {
				//console.log(c)
				//DockerDb.set(containerName, container, 'unknown', null)
				if (desired == 'run') {
					DockerDb.set(containerName, container, 'creating', null)
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						DockerDb.set(containerName, container, 'not_created', res.err)
					}
				}
			}
		} else {
			if (desired == 'drain' && containerDb.status == 'deleted') {
				DockerDb.delete(containerName)
			} else if (desired == 'run' && containerDb.status != 'creating' && containerDb.status != 'running') {
				DockerDb.set(containerName, container, 'creating', null)
				let res = await DockerDriver.create(containerName, container)	
				if (res.err !== null) {
					DockerDb.set(containerName, container, 'not_created', null)
				}
				// if (c.data.State.Status !== 'running' && desired == 'run') {
				// 	await DockerDriver.create(containerName, container)	
				// }
			} else if (desired == 'drain' && containerDb.status !== 'deleted' && containerDb.status !== 'exited' && containerDb.status !== 'draining') {
				DockerDb.set(containerName, container, 'draining', null)
				let res = await DockerDriver.drain(containerName)
				if (res.err !== null) {
					DockerDb.set(containerName, container, 'deleted', null)
				}

			}
		}
		
		pipe.next()
	} catch (err) {
		pipe.next()
	}
})
/*
pipeline.step('fetch-status__', async (pipe, job) => {
	if (job == undefined) {
		pipe.end()
		return
	}
	let containerName = 'dora.' + job.workspace + '.' + job.name
	let container = job
	let desired = job.desired

	// At startup and at the first sign
	if (DockerDb.getContainer(containerName) == undefined) {
		DockerDb.setContainerResource(containerName, container)
		let c = await DockerDriver.get(containerName)
		DockerDb.setContainerObserved(containerName, c)
	}
	let cdb = DockerDb.getContainer(containerName)

	//console.log(cdb)
	
	if (desired == 'run' 
		&& cdb.observed !== undefined 
		&& cdb.observed.err == null 
		&& cdb.observed.data != null
		&& cdb.observed.data != undefined 
		&& cdb.observed.data.State.Status == 'running') {
		console.log('->', job.name, desired, 'OK RUNNING')
	} else if (desired == 'drain' 
		&& (cdb.observed == undefined
		|| cdb.observed == null) )  {
		console.log('->', job.name, desired, 'OK DRAINED')
	} else if (desired == 'run' && (cdb.observed == undefined || cdb.observed == null || cdb.observed.err !== null) && cdb.internal !== 'CREATING') {
		console.log('->', job.name, desired, 'TO CREATE')
		DockerDb.setContainerInternal(containerName, 'CREATING')
		DockerDriver.create(containerName, container)
	} else if (desired == 'drain' 
		&& cdb.observed != undefined
		&& cdb.observed != null 
		&& cdb.observed.err == null 
		&& cdb.observed.data != null
		&& cdb.observed.data != undefined 
		&& cdb.observed.data.State.Status == 'running')  {
		console.log('->', job.name, desired, 'TO DRAIN')
		DockerDriver.drain(containerName)
	}


	

	pipe.next()
	return
	
	if (desired == 'run') {
		if (c.err !== null && c.err.statusCode == 404 && DockerDb.getContainer(containerName) == undefined) {
			console.log('Container', containerName, 'not exist, first view')
			// CREATE Container
			DockerDb.setContainer(containerName, container)
			DockerDriver.create(containerName, container)
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
	} else if (desired == 'drain') {
		if (DockerDb.getContainer(containerName) == undefined) {
			DockerDb.setContainer(containerName, container)
		}
		if (c.err == null && c.data !== null) {
			let aa = DockerDriver.drain(containerName)	
			DockerDb.setContainerInternal(containerName, aa)
		}
	}
	pipe.next()
})

/*
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
	console.log('->', job.name, desired)
	if (desired == 'run') {
		if (c.err !== null && c.err.statusCode == 404 && DockerDb.getContainer(containerName) == undefined) {
			console.log('Container', containerName, 'not exist, first view')
			// CREATE Container
			DockerDb.setContainer(containerName, container)
			DockerDriver.create(containerName, container)
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
	} else if (desired == 'drain') {
		if (DockerDb.getContainer(containerName) == undefined) {
			DockerDb.setContainer(containerName, container)
		}
		if (c.err == null && c.data !== null) {
			let aa = DockerDriver.drain(containerName)	
			DockerDb.setContainerInternal(containerName, aa)
		}
	}
	pipe.next()
})*/

//pipeline.step('get-all-test', async (pipe, job) => {
//	console.log(await DockerDriver.getAll())
//})*/

module.exports.getScheduler = () => { return scheduler }