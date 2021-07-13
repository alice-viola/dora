'use strict'

const CONTAINER = 'CONTAINER'

let DB = {
	CONTAINER: {}
}

let initContainer = (job_id, data) => {
	let c = {
		job_id: job_id, 
		containerResource: null, 
		container: null, 
		status: null, 
		reason: null, 
		failedStartup: 0, 
		update: 0,
		updateSent: -1 
	}
	Object.keys(data).forEach((k) => {
		c[k] = data[k]
	})
	return c
}

module.exports.set = (job_id, data) => {
	if (DB.CONTAINER[job_id] == undefined) {
		DB[CONTAINER][job_id] = initContainer(job_id, data)
	} else {
		Object.keys(data).forEach((k) => {
			DB[CONTAINER][job_id][k] = data[k]
		})		
	}
}

module.exports.getOne = (job_id) => {
	let one = DB.CONTAINER[job_id]
	if (one == undefined) {
		return null
	} else {
		return one
	}
}

module.exports.getOneByContainerId = (containerid) => {
	let one = Object.values(DB.CONTAINER).filter((c) => {
		return c.id == containerid
	})
	if (one.length == 1) {
		return one[0]
	} else {
		return null
	}
}

module.exports.deleteOne = (job_id) => {
	let one = DB.CONTAINER[job_id]
	if (one == undefined) {
		return null
	} else {
		delete DB.CONTAINER[job_id]
	}
}

module.exports.getAll = () => {
	return DB.CONTAINER
}

module.exports.get = (filterFunction) => {
	return Object.values(DB.CONTAINER).filter((c) => {
		return filterFunction(c)
	})
}