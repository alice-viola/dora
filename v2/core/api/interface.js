'use strict'

let Class = require('../index').Model.Class

/**
*	TODO:
*	- resource validation, against schema and against dependencies
*	- dependencies binds
*
*	- GE (run, drain etc)
*	- Defined Response text
*/
module.exports.apply = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let resource = new ResourceKindClass(translatedArgs)
		let exist = await resource.$exist()
		if (exist.err == null && exist.data.exist == true) {
			let validate = resource.$validate(resource.$check())
			if (validate.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not updated, failed test: \n !-> ' + validate.data.join('\n !-> '))
				return		
			}
			let validateDependecies = await resource.$checkDependencies()
			if (validateDependecies.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not updated, failed dependencies test')
				return		
			}
			resource.properties().desired = 'run'
			
			// Check hash to detect changes


			if (resource._p.resource !== undefined && 
				exist.data.data.resource_hash !== null && 
				Class[args.kind]._ComputeResourceHash(resource._p.resource) == exist.data.data.resource_hash) {

				// Check if is a replicated resource
				if (Class[args.kind].IsReplicated == true) {
					let currentReplica = exist.data.data.resource.replica !== undefined ? (exist.data.data.resource.replica.count || 1) : 1
					let desiredReplica = resource._p.resource.replica !== undefined ? (resource._p.resource.replica.count || 1) : 1
					if (currentReplica !== desiredReplica) {
						
						// Changed replica
						let resultDes = await resource.updateDesired()
						let result = await resource.updateResource()
						if (resultDes.err == null && result.err == null) {
							cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' scaled')		
						} else {
							cb(null, err)		
						}
					} else {

						// Replica not chagend
						let resultDes = await resource.updateDesired()
						if (resultDes.err == null) {
							cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
						} else {
							cb(null, err)		
						}
					}
				} else {

					// Nothing is changed
					let resultDes = await resource.updateDesired()
					if (resultDes.err == null) {
						cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
					} else {
						cb(null, err)		
					}
				}
			} else if (resource._p.resource == undefined && exist.data.data.resource_hash == null) {
				
				// Nothing is changed, this kind of resource doesn't have a *spec* field
				let resultDes = await resource.updateDesired()
				if (resultDes.err == null) {
					cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
				} else {
					cb(null, err)		
				}
			} else {
				
				// Something is changed
				let resultDes = await resource.updateDesired()
				let result = await resource.updateResource()
				let resultHash = await resource.updateResourceHash()
				
				if (result.err == null && resultHash.err == null && resultDes.err == null) {
					cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' updated')		
				} else {
					cb(null, err)		
				}
			}
			return
		} else {
			let validate = resource.$validate(resource.$check())
			if (validate.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not created, failed test: \n !-> ' + validate.data.join('\n !-> '))
				return		
			}
			let validateDependecies = await resource.$checkDependencies()
			if (validateDependecies.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not created, failed dependencies test')
				return		
			}
			let result = await resource.apply()
			cb(result.err, 'Resource ' + translatedArgs.name + ' created')
		}
	} catch (err) {
		cb(true, err)
	}
}

module.exports.delete = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let resource = new ResourceKindClass(translatedArgs)
		let exist = await resource.$exist()
		if (exist == true) {
			resource.properties().desired = "drain"
			let resultDes = await resource.updateDesired()
			if (resultDes.err == null) {
				cb(null, 'Resource ' + translatedArgs.name + ' drained')		
			} else {
				cb(null, err)		
			}
			return
		} else {
			cb(null, 'Resource not exist')
		}
	} catch (err) {
		cb(true, err)
	}
}

module.exports.get = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
		let result = await ResourceKindClass.Get(partition, true)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}	

module.exports.describe = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
		let result = await ResourceKindClass.Get(partition)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}

module.exports.setObserved = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, {
			kind: args.kind,
			name: args.name,
		})
		let resource = new ResourceKindClass(translatedArgs)
		let exist = await resource.$exist()

		if (exist.err == null && exist.data.exist == true) {
			let dataToSave = {}
			dataToSave.lastSeen = new Date()
			dataToSave.version = args.observed.version
			dataToSave.arch = args.observed.sys.arch
			dataToSave.cpuKind = args.observed.cpus[args.observed.cpus.length - 1].product_name
			dataToSave.cpuCount = args.observed.cpus.length
			dataToSave.cpus = args.observed.cpus
			dataToSave.gpus = args.observed.gpus
			resource.set('observed', dataToSave)

			let resultDes = await resource.updateObserved()
			//let result = await resource.updateResource()
			//let resultHash = await resource.updateResourceHash()
			//
			//if (result.err == null && resultHash.err == null && resultDes.err == null) {
			//	cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' updated')		
			//} else {
			//	cb(null, err)		
			//}
		} 
	} catch (err) {
		cb(true, err)
	}
}

