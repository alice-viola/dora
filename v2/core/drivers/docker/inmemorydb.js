'use strict'

const CONTAINER = 'CONTAINER'

let DB = {
	CONTAINER: {}
}


module.exports.set = (containerName, container, status, reason) => {
	if (DB[CONTAINER][containerName] == undefined && DB[CONTAINER][containerName] == null) {
		DB[CONTAINER][containerName] = {containerName: containerName, container: null, status: null, reason: null, failedStartup: 0, updated: false}
	} 
	if (container !== null) {
		DB[CONTAINER][containerName].container = container	
	}
	if (DB[CONTAINER][containerName].status !== status || DB[CONTAINER][containerName].reason !== reason) {
		DB[CONTAINER][containerName].updated = true
	}
	DB[CONTAINER][containerName].status = status
	DB[CONTAINER][containerName].reason = reason
}

module.exports.setId = (containerName, id) => {
	if (DB[CONTAINER][containerName] == undefined && DB[CONTAINER][containerName] == null) {
		DB[CONTAINER][containerName] = {containerName: containerName, container: null, status: null, reason: null, failedStartup: 0}
	} 
	DB[CONTAINER][containerName].id = id
}


module.exports.incrementFailedCreationCount = (containerName) => {
	if (DB[CONTAINER][containerName] == undefined || DB[CONTAINER][containerName] == null) {
		return
	} 
	DB[CONTAINER][containerName].failedStartup += 1
}

module.exports.delete = (containerName) => {
	if (DB[CONTAINER][containerName] != undefined) {
		delete DB[CONTAINER][containerName]
	} 
}

module.exports.get = (containerName) => {
	return DB[CONTAINER][containerName]
} 

module.exports.getAll = () => {
	return DB[CONTAINER]
} 


module.exports.getAllUpdated = () => {
	let toReturn = Object.values(DB[CONTAINER]).filter((c) => {
		return c.updated == true
	})
	Object.values(DB[CONTAINER]).forEach((c) => {
		c.updated = false
	})
	return toReturn
} 

