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

const MAX_STARTUP = 3

let docker = new Docker({socketPath: socket})

let dockerEmitter = new DockerEvents({
  docker: docker,
})

dockerEmitter.start()

dockerEmitter.on('start', async function (message) {
	let containerName = message.Actor.Attributes.name
	console.log(containerName, message)
	DockerDb.set(containerName, null, 'running', null)
	DockerDb.setId(containerName, message.id)
})

dockerEmitter.on('stop', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'deleted', null)
})

dockerEmitter.on('die', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'exited', null)
})

pipeline.step('fetch-status', async (pipe, job) => {
	if (job == undefined) {
		pipe.next()
		return
	}
	try {
		let containerName = 'dora.' + job.workspace + '.' + job.name
		let containerID = job.id
	
		let container = job
		let desired = job.desired
		
		let containerDb = DockerDb.get(containerName) 

		/**
		 * Verify the name with the DB ID,
		 * in order to avoid non sobstitution of
		 * different containers with same name (like after stop/start)
		 * 
		 */
		if (containerDb !== undefined) {
			if (containerDb.containerResource !== undefined && containerDb.containerResource !== null) {
				if (containerDb.containerResource.id != containerID) {
					if (containerDb.status !== 'running' && containerDb.status !== 'creating' && containerDb.status !== 'creating' && containerDb.status !== 'pulling') {
						console.log('Updated, container with same name but different IDs, deleting the old one')
					} else {
						console.log('Updated, container with same name but different IDs, not deleting because status not match', containerDb.status)
					}
				}
			}
		}



		/** This happen when is the first time the container
		*	is wanted or a node restart.
		*/
		
		if (containerDb == undefined) {
			// Check
			let c = await DockerDriver.get(containerName)
			if (c.err == null && c.data !== null && c.data !== undefined) {
				DockerDb.set(containerName, container, c.data.State.Status, c.err)
				DockerDb.setContainerResource(containerName, job)
				DockerDb.setId(containerName, c.data.Id)
				if (desired == 'drain') {
					DockerDb.set(containerName, container, 'draining', null)
					DockerDb.setContainerResource(containerName, job)
					DockerDb.setId(containerName, c.data.Id)
					await DockerDriver.drain(containerName)
				}
			} else {
				if (desired == 'run') {
					
					DockerDb.set(containerName, container, 'creating', null)
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err.toString())
						//DockerDb.set(containerName, container, 'not_created', res.err.toString())
						//DockerDb.incrementFailedCreationCount(containerName)
					}
				}
				if (desired == 'drain') {
					DockerDb.set(containerName, container, 'deleted', null)
					DockerDb.setContainerResource(containerName, job)
				}
			}
		} else {
			//console.log(containerName, desired, containerDb.status, containerDb.container)
			let noRestartNeeded = false
			if (desired == 'run' && containerDb.status == 'deleted') {
				if (containerDb.container.resource !== undefined && containerDb.container.resource.config !== undefined && containerDb.container.resource.config.restartPolicy == 'Never') {
					console.log('----->', containerDb.container.resource.config.restartPolicy)
					noRestartNeeded = true
					// DockerDb.delete(containerName)
				}
			}
			if (desired == 'drain' && containerDb.status == 'deleted') {
				DockerDb.delete(containerName)
			} else if (desired == 'run' && containerDb.status != 'creating' && containerDb.status != 'pulling' && containerDb.status != 'running' && noRestartNeeded == false) {
				if (containerDb.failedStartup < MAX_STARTUP) {
					DockerDb.set(containerName, container, 'creating', null)
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err)
						//DockerDb.set(containerName, container, 'not_created', res.err.toString())
						//DockerDb.incrementFailedCreationCount(containerName)
					}
				} else if (containerDb.status !== 'failed') {
					DockerDb.set(containerName, container, 'failed', 'reached max failed startup with error: ' + containerDb.reason)
				}
			} else if (desired == 'drain' && containerDb.status !== 'deleted' && containerDb.status !== 'exited' && containerDb.status !== 'draining') {
				DockerDb.set(containerName, container, 'draining', null)
				let res = await DockerDriver.drain(containerName)
				if (res.err !== null) {
					DockerDb.set(containerName, container, 'deleted', res.err)
				}

			}
		}
		
		pipe.next()
	} catch (err) {
		console.log(err)
		pipe.next()
	}
})

module.exports.getScheduler = () => { return scheduler }