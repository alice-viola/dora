'use strict'

let fs = require('fs')
let Docker = require('dockerode')
let DockerEvents = require('docker-events')
let db = require('./db')
let STATUS = require('./global.js')

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
	let job = db.getWorkloadInDb(containerName)
  	if (job !== undefined) {
  		db.updateWorkloadContainerId(containerName, job, message.id)
  		db.updateWorkloadStatus(containerName, job, STATUS.RUNNING)	
  	}
})

dockerEmitter.on('stop', async function (message) {
	let containerName = message.Actor.Attributes.name
  	let job = db.getWorkloadInDb(containerName)
  	if (job !== undefined && job.internalStatus !== STATUS.CREATING) {
  		db.updateWorkloadStatus(containerName, job, STATUS.DELETED)	
  	}
})

dockerEmitter.on('die', async function (message) {
	let containerName = message.Actor.Attributes.name
  	let job = db.getWorkloadInDb(containerName)
  	if (job !== undefined && job.internalStatus !== STATUS.CREATING) {
  		db.updateWorkloadStatus(containerName, job, STATUS.EXITED)
  	}
})

async function checkContainer (name) {
	return new Promise((resolve, reject) => {
		let container = docker.getContainer(name)
		if (container) {
			container.inspect(function (err, data) {
				if (err) {
					if (err.reason !== undefined) {
						resolve({exist: false, data: data, reason: err.reason})	
					} else if (typeof err == 'string') {
						resolve({exist: false, data: data, reason: err})	
					} else {
						resolve({exist: false, data: data, reason: 'Object error'})	
					}
				} else {
					resolve({exist: true, data: data, reason: err, id: data.Id})
				}
			})
		} else {
			resolve({exist: false, data: null, reason: null})
		}
	})
}

let scheduler = require('./scheduler')
scheduler.set({
	db: db,
	docker: docker
})
scheduler.start()


// docker rm $(docker ps -a -f status=running -q)

module.exports.create = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		let job = db.getWorkloadInDb(body[i].scheduler.container.name)
		if (job != undefined) {
			db.deleteWorkloadInDb(body[i].scheduler.container.name)
		} 
		db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
			body[i],
			'RUN',
			{status: body[i].currentStatus, err: null},
			STATUS.RECV_CREATE
		))	
	}
	cb(true)
}

module.exports.workloaddelete = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		let job = db.getWorkloadInDb(body[i].scheduler.container.name)
		if (job !== undefined) {
			db.updateWorkloadWants(body[i].scheduler.container.name, job, 'STOP')
			db.updateWorkloadInternalStatus(body[i].scheduler.container.name, job, STATUS.RECV_STOP)
		} else {
			let container = await checkContainer(body[i].scheduler.container.name)
			if (container.exist == true) {
				db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
					body[i],
					'STOP',
					{status: body[i].currentStatus, reason: null},
					STATUS.RECV_STOP
				))	
			}
		}
	}
	cb(true)
}

module.exports.workloadstatus = async (body, cb) => {
	let status = {}
	for (var i = 0; i < body.length; i += 1) {
		let job = db.getWorkloadInDb(body[i].scheduler.container.name)
		if (job !== undefined) {
			if (job.containerId == undefined) {
				let check = await checkContainer(body[i].scheduler.container.name)
				status[body[i].scheduler.container.name] = {status: job.status.status, reason: job.status.reason, id: check.id}
				db.updateWorkloadContainerId(body[i].scheduler.container.name, job, check.id)
			} else {
				status[body[i].scheduler.container.name] = {status: job.status.status, reason: job.status.reason, id: job.containerId}
			}
		} else {
			let container = await checkContainer(body[i].scheduler.container.name)
			if (container.exist == true && container.data.State.Status == 'running') {
				status[body[i].scheduler.container.name] = {
					status: container.data !== null ? container.data.State.Status.toUpperCase() : STATUS.UNKNOWN, 
					reason: container.reason, 
					id: container.id
				}
				db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
					body[i],
					body[i].wants,
					{status: status[body[i].scheduler.container.name].status, reason: container.reason, id: container.id},
					body[i].wants == 'RUN' ? STATUS.RUNNING : STATUS.RECV_STOP 
				))	
			} else if (container.exist == true && container.data.State.Status == 'created') {
				status[body[i].scheduler.container.name] = {
					status: container.data !== null ? container.data.State.Status.toUpperCase() : STATUS.UNKNOWN, 
					reason: container.reason, 
					id: container.id
				}
				db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
					body[i],
					body[i].wants,
					{status: container.data.State.Status.toUpperCase(), reason: null},
					body[i].wants == 'RUN' ? STATUS.RECV_CREATE : STATUS.RECV_STOP 
				))	
			} else if (container.exist == true) {
				status[body[i].scheduler.container.name] = {
					status: container.data !== null ? container.data.State.Status.toUpperCase() : STATUS.UNKNOWN, 
					reason: container.reason, 
					id: container.id
				}
				db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
					body[i],
					body[i].wants,
					{status: container.data.State.Status.toUpperCase(), reason: null},
					body[i].wants == 'RUN' ? STATUS.RECV_CREATE : STATUS.RECV_STOP 
				))	
			} else {
				status[body[i].scheduler.container.name] = {status: STATUS.NOT_PRESENT, reason: null}
				db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
					body[i],
					body[i].wants,
					{status: body[i].currentStatus, reason: null},
					body[i].wants == 'RUN' ? STATUS.RECV_CREATE : STATUS.RECV_STOP 
				))	
			}
		}
	}
	cb(status)
}