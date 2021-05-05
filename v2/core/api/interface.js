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
	let ResourceKindClass = Class[args.kind]
	if (ResourceKindClass == undefined) {
		cb(true, 'Kind ' + args.kind + ' not exist')
		return
	}
	let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
	let resource = new ResourceKindClass(translatedArgs)
	let exist = await resource.$exist()
	if (exist == true) {
		resource.properties().desired = 'run'
		let resultDes = await resource.updateDesired()
		let result = await resource.updateResource()
		if (result.err == null) {
			cb(null, 'Resource ' + translatedArgs.name + ' updated')		
		} else {
			cb(null, err)		
		}
		return
	} else {
		let result = await resource.apply()
		cb(result.err, 'Resource created')
	}
}

module.exports.delete = async (apiVersion, args, cb) => {
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
			cb(null, 'Resource ' + translatedArgs.name + ' deleted')		
		} else {
			cb(null, err)		
		}
		return
	} else {
		let result = await resource.apply()
		cb(result.err, 'Resource not exist')
	}
}

module.exports.get = async (apiVersion, args, cb) => {
	let ResourceKindClass = Class[args.kind]
	if (ResourceKindClass == undefined) {
		cb(true, 'Kind ' + args.kind + ' not exist')
		return
	}
	let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
	let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
	// console.log(translatedArgs, partition)
	let result = await ResourceKindClass.Get(partition, true)
	// console.log(result)
	cb(result.err, result.data)
}

module.exports.describe = async (apiVersion, args, cb) => {
	let ResourceKindClass = Class[args.kind]
	if (ResourceKindClass == undefined) {
		cb(true, 'Kind ' + args.kind + ' not exist')
		return
	}
	let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
	let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
	let result = await ResourceKindClass.Get(partition)
	cb(result.err, result.data)
}

