'use strict'

let fs = require('fs')
let level = require('level')
let workloadDb = level('pwmnodedb', { valueEncoding: 'json' }, (err, db) => {
	if (err) {
		console.log('error init leveldb', err)
	}
})

module.exports.formatResource = (workload, wants, status = null) => {
	return {
		wants: wants,
		status: status,
		containerId: undefined,
		workload: workload
	}
}

var insertWorkloadInDb = module.exports.insertWorkloadInDb = async (workloadName, workload) => {
	return await workloadDb.put(workloadName, workload)
}

module.exports.getWorkloadInDb = async (workloadName) => {
	try {
		return await workloadDb.get(workloadName)
	} catch (err) {
		return undefined
	}
}

module.exports.deleteWorkloadInDb = async (workloadName) => {
	return await workloadDb.del(workloadName)
}

module.exports.updateWorkloadWants = async (workloadName, workload, wants) => {
	workload.wants = wants
	await insertWorkloadInDb (workloadName, workload)
}

module.exports.updateWorkloadContainerId = async (workloadName, workload, containerId) => {
	workload.containerId = containerId
	await insertWorkloadInDb (workloadName, workload)
}

module.exports.updateWorkloadStatus = async (workloadName, workload, status) => {
	workload.status = status
	await insertWorkloadInDb (workloadName, workload)
}

module.exports.db = workloadDb 