'use strict'

const CONTAINER = 'CONTAINER'

let DB = {
	CONTAINER: {}
}

module.exports.getContainer = (containerName) => {
	return DB[CONTAINER][containerName]
} 

module.exports.setContainer = (containerName, container) => {
	if (DB[CONTAINER][containerName] == undefined && DB[CONTAINER][containerName] == null) {
		DB[CONTAINER][containerName] = {external: null, internal: null}
	} 
	DB[CONTAINER][containerName].external = container
} 