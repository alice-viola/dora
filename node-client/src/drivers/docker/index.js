'use strict'

let fs = require('fs')
let scheduler = require('./scheduler')
let db = require('./db')

// docker rm $(docker ps -a -f status=exited -q)

module.exports.create = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		await db.insertWorkloadInDb(body[i].scheduler.container.name, db.formatResource(
			body[i],
			'RUN',
			'RECV CREATE'
		))	
	}
	cb(true)
}

module.exports.workloadstatus = async (body, cb) => {
	let status = {}
	for (var i = 0; i < body.length; i += 1) {
		let job = await db.getWorkloadInDb(body[i].scheduler.container.name)
		if (job !== undefined) {
			status[body[i].scheduler.container.name] = {status: job.status, err: null, id: job.containerId}
			if (job.status == 'DELETED' || job.status == 'EXITED' || job.status == 'CRASHED') {
			 	await db.deleteWorkloadInDb(body[i].scheduler.container.name)
			}
		}
	}
	cb(status)
}

module.exports.workloaddelete = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		let job = await db.getWorkloadInDb(body[i].scheduler.container.name)
		if (job !== undefined) {
			db.updateWorkloadWants(body[i].scheduler.container.name, job, 'STOP')	
		}
	}
	cb(true)
}