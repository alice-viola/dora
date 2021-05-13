'use strict'

let fs = require('fs')
let inMemoryDb = {}

module.exports.formatResource = (workload, wants, status, internalStatus) => {
	return {
		wants: wants,
		status: status,
		internalStatus: internalStatus,
		containerId: undefined,
		workload: workload
	}
}

var insertWorkloadInDb = module.exports.insertWorkloadInDb = (workloadName, workload) => {
	return  inMemoryDb[workloadName] = workload
}

module.exports.workloads = () => {
	return Object.values(inMemoryDb)
}

module.exports.getWorkloadInDb = (workloadName) => {
	return inMemoryDb[workloadName]
}

module.exports.deleteWorkloadInDb = (workloadName) => {
	delete inMemoryDb[workloadName]
}

module.exports.updateWorkloadWants = (workloadName, workload, wants) => {
	workload.wants = wants
	inMemoryDb[workloadName] = workload
}

module.exports.updateWorkloadContainerId = (workloadName, workload, containerId) => {
	workload.containerId = containerId
	inMemoryDb[workloadName] = workload
}

module.exports.updateWorkloadStatus = (workloadName, workload, status, reason = null) => {
	workload.status = {status: status, reason: reason}
	inMemoryDb[workloadName] = workload
}

module.exports.updateWorkloadInternalStatus = (workloadName, workload, internalStatus) => {
	workload.internalStatus = internalStatus
	inMemoryDb[workloadName] = workload
}

module.exports.db = inMemoryDb 