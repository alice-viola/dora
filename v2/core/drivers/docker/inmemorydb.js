'use strict'

const CONTAINER = 'CONTAINER'

let DB = {
	CONTAINER: {}
}


module.exports.set = (containerName, container, status, reason) => {
	if (DB[CONTAINER][containerName] == undefined && DB[CONTAINER][containerName] == null) {
		DB[CONTAINER][containerName] = {containerName: containerName, container: null, status: null, reason: null}
	} 
	if (container !== null) {
		DB[CONTAINER][containerName].container = container	
	}
	DB[CONTAINER][containerName].status = status
	DB[CONTAINER][containerName].reason = reason
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

