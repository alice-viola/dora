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
	let jobId = message.Actor.Attributes['dora.id']
	if (jobId !== undefined) {
		let containerInDB = DockerDb.getOne(jobId) 
		if (containerInDB !== null) {
			DockerDb.set(containerInDB.job_id, {
				id: message.id,
				status: 'running',
				reason: null,
				// update: containerInDB.update += 1
			})			
		}
	}
})

dockerEmitter.on('stop', async function (message) {
	let containerName = message.Actor.Attributes.name
	let containerInDB = DockerDb.getOneByContainerId(message.id) 
	let jobId = message.Actor.Attributes['dora.id']
	if (jobId !== undefined) {
		let containerInDB = DockerDb.getOne(jobId) 
		if (containerInDB !== null) {
			DockerDb.set(containerInDB.job_id, {
				id: message.id,
				status: 'deleted',
				reason: null,
				// update: containerInDB.update += 1
			})			
		}
	}
})

dockerEmitter.on('die', async function (message) {
	let containerName = message.Actor.Attributes.name
	let containerInDB = DockerDb.getOneByContainerId(message.id) 
	let jobId = message.Actor.Attributes['dora.id']
	if (jobId !== undefined) {
		let containerInDB = DockerDb.getOne(jobId) 
		if (containerInDB !== null) {
			DockerDb.set(containerInDB.job_id, {
				id: message.id,
				status: 'exited',
				reason: null,
				// update: containerInDB.update += 1
			})			
		}
	}
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
		
		let containerDb = DockerDb.getOne(containerID) 


		/** This happen when is the first time the container
		*	is wanted or a node restart.
		*/
		
		if (containerDb == undefined) {
			// Check
			let c = await DockerDriver.get(containerName)
			if (c.err == null && c.data !== null && c.data !== undefined) {
				DockerDb.set(containerID, {
					container: c.data,
					containerResource: job,
					id: c.data.Id,
					status: c.data.State.Status,
					reason: c.err
				})
				if (desired == 'drain') {
					DockerDb.set(containerID, {
						status: 'draining',
						reason: null,
						containerResource: job,
						id: c.data.Id,						
					})
					await DockerDriver.drain(containerName)
				}
			} else {
				if (desired == 'run') {
					DockerDb.set(containerID, {
						status: 'creating',
						reason: null,
						containerResource: job
					})					
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err.toString())
					}
				}
				if (desired == 'drain') {
					DockerDb.set(containerID, {
						status: 'deleted',
						reason: null,
						containerResource: job,
						toDelete: true
					})						
				}
			}
		} else {
			let noRestartNeeded = false
			if (desired == 'run' && (containerDb.status == 'deleted' || containerDb.status == 'exited') ) {
				if (containerDb.containerResource.resource !== undefined && containerDb.containerResource.resource.config !== undefined && containerDb.containerResource.resource.config.restartPolicy == 'Never') {
					noRestartNeeded = true
				}
			}
			if (desired == 'drain' && containerDb.status == 'deleted') {
				DockerDb.deleteOne(containerID)
			} else if (desired == 'run' && containerDb.status != 'creating' && containerDb.status != 'pulling' && containerDb.status != 'running' && noRestartNeeded == false) {
				if (containerDb.failedStartup < MAX_STARTUP) {
					DockerDb.set(containerID, {
						status: 'creating',
						reason: null,
						containerResource: job
					})						
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err)
					}
				} else if (containerDb.status !== 'failed') {
					DockerDb.set(containerID, {
						status: 'failed',
						reason: 'reached max failed startup with error: ' + containerDb.reason,
						containerResource: job
					})						
				}
			} else if (desired == 'drain' && containerDb.status !== 'deleted' && containerDb.status !== 'exited' && containerDb.status !== 'draining') {
				DockerDb.set(containerID, {
					status: 'draining',
					reason: null,
					containerResource: job
				})				
				let res = await DockerDriver.drain(containerName)
				if (res.err !== null) {
					DockerDb.set(containerID, {
						status: 'deleted',
						reason: res.err,
						containerResource: job
					})						
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