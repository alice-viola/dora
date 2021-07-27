'use strict'

let jwt = require('jsonwebtoken')
let Class = require('../index').Model.Class

const AlwaysAllowedRoutes = [
	'/v1/-/api/version',
	'/v2/-/api/version',
	'/v1/-/-/User/validate',
	'/v2/-/-/User/validate',
	'/v1/-/-/User/groups',
	'/v2/-/-/User/groups',
	'/v1/-/-/User/preferences/get',
	'/v1/-/-/User/preferences/apply',
]



async function onWorkload(translatedArgs, type, dst, origin = 'api') {
	return await Class.Action.Insert({
		zone: translatedArgs.zone,
		resource_kind: 'workload',
		resource_pk: {
			zone: translatedArgs.zone,
			workspace: translatedArgs.workspace,
			name: translatedArgs.name,
		},
		action_type: type,
		origin: origin,
		destination: dst,
		insdate: (new Date()).toISOString()	
	})
}

async function onContainerToDelete(translatedArgs, type, dst, origin = 'node-observed') {
	return await Class.Action.Insert({
		zone: translatedArgs.zone,
		resource_kind: 'container',
		resource_pk: {
			zone: translatedArgs.zone,
			workspace: translatedArgs.workspace,
			name: translatedArgs.name,
		},
		action_type: type,
		origin: origin,
		destination: dst,
		insdate: (new Date()).toISOString()	
	})
}

async function onWorkloadToSaveVersion (id, workloadOriginal) {
	
	await Class.Workload.WriteVersion({
		resource_id: id,
		zone: process.env.ZONE,
		resource_kind: 'workload',
		origin: 'dora.api',
		resource: JSON.stringify(workloadOriginal),
		insdate: (new Date()).toISOString()
	})	
}

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
				cb(null, 'Resource ' + translatedArgs.name + ' not updated, failed dependencies test' + validateDependecies.data.join('\n !-> '))
				return		
			}
			resource.properties().desired = 'run'
			
			// Check hash to detect changes


			if (resource._p.resource !== undefined && 
				exist.data.data.resource_hash !== null && 
				Class[args.kind]._ComputeResourceHash(resource._p.resource) == exist.data.data.resource_hash) {

				// Check if is a replicated resource
				if (Class[args.kind].IsReplicated == true) {
					let currentReplica = exist.data.data.resource.replica !== undefined ? (exist.data.data.resource.replica.count) : 1
					let desiredReplica = resource._p.resource.replica !== undefined ? (resource._p.resource.replica.count) : 1
					if (currentReplica !== desiredReplica) {
						
						let actionRes = {err: null, data: null}
						if (translatedArgs.kind.toLowerCase() == 'workload') {
							actionRes = await onWorkload(translatedArgs, 'update', 'replica-controller')
						}
						if (actionRes.err == null) {
							// Changed replica
							let resultDes = await resource.updateDesired()
							let result = await resource.updateResource()
							let resultMeta = await resource.updateMeta()
							if (resultDes.err == null && result.err == null) {
								cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' scaled')		
							} else {
								cb(null, err)		
							}			
						} else {
							cb(result.err, 'Resource ' + translatedArgs.name + ' not created: an error occurs')
						}
					} else {

						// Replica not changed
						let resultDes = await resource.updateDesired()
						let resultMeta = await resource.updateMeta()
						if (resultDes.err == null) {
							cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
						} else {
							cb(null, err)		
						}
					}
				} else {

					// Nothing is changed
					let resultDes = await resource.updateDesired()
					let resultMeta = await resource.updateMeta()
					if (resultDes.err == null) {
						cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
					} else {
						cb(null, err)		
					}
				}
			} else if (resource._p.resource == undefined && exist.data.data.resource_hash == null) {
				
				// Nothing is changed, this kind of resource doesn't have a *spec* field
				let resultDes = await resource.updateDesired()
				let resultMeta = await resource.updateMeta()
				if (resultDes.err == null) {
					cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' not changed')		
				} else {
					cb(null, err)		
				}
			} else {
				
				// Something is changed
				let actionRes = {err: null, data: null}
				if (translatedArgs.kind.toLowerCase() == 'workload') {
					actionRes = await onWorkload(translatedArgs, 'update', 'replica-controller')
					await onWorkloadToSaveVersion(exist.data.data.id, args)
				}
				if (actionRes.err == null) {
					let resultMeta = await resource.updateMeta()
					let resultDes = await resource.updateDesired()
					let result = await resource.updateResource()
					let resultHash = await resource.updateResourceHash()
					
					if (result.err == null && resultHash.err == null && resultDes.err == null) {
						cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' updated')		
					} else {
						cb(null, err)		
					}			
				} else {
					cb(result.err, 'Resource ' + translatedArgs.name + ' not created: an error occurs')
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
				cb(null, 'Resource ' + translatedArgs.name + ' not created, failed dependencies test: \n' + validateDependecies.data.join('\n !-> '))
				return		
			}
			let actionRes = {err: null, data: null}
			if (translatedArgs.kind.toLowerCase() == 'workload') {
				actionRes = await onWorkload(translatedArgs, 'insert', 'replica-controller')
			}
			if (actionRes.err == null) {
				let result = await resource.apply()
				
				let exist = await resource.$exist()
				console.log('XIST', exist.err, exist.data.exist)
				if (exist.err == null && exist.data.exist == true) {
					await onWorkloadToSaveVersion(exist.data.data.id, args)
				}
				cb(result.err, 'Resource ' + translatedArgs.name + ' created')				
			} else {
				cb(result.err, 'Resource ' + translatedArgs.name + ' not created: an error occurs')
			}
		}
	} catch (err) {
		console.log(err)
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
		if (exist.err == null && exist.data.exist == true) {
			//resource.properties().desired = 'drain'
			//let resultDes = await resource.updateDesired()
			let resultDes = await resource.drain(Class)
			
			if (translatedArgs.kind.toLowerCase() == 'workload') {
				await onWorkload(translatedArgs, 'delete', 'replica-controller')
			}
			if (translatedArgs.kind.toLowerCase() == 'container') {
				await onWorkload(translatedArgs, 'delete', 'replica-controller')
			}
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
		console.log('-----> err', err)
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
		let result = await ResourceKindClass.Get(partition, true, Class)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}

module.exports.event = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let result = await ResourceKindClass.GetEvent({resource_id: args.spec.resource_id, kind: args.kind, zone: process.env.ZONE}, true)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}	

module.exports.version = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let result = await ResourceKindClass.GetVersion({resource_id: args.spec.resource_id, kind: args.kind, zone: process.env.ZONE}, true)
		cb(result.err, result.data)
	} catch (err) {
		console.log(err)
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

module.exports.getOne = async (apiVersion, args, cb, asTable = true) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
		let result = await ResourceKindClass.Get(partition, asTable)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}

module.exports.report = async (apiVersion, args, cb) => {
	try {
		// console.log('REPORT', args)
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let objt = {
			kind: args.kind,
			name: args.metadata.name,
		}
		if (args.metadata.zone !== undefined && args.metadata.zone !== null) {
			objt.zone = args.metadata.zone
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, objt)
		let resource = new ResourceKindClass(translatedArgs)
		// console.log('Resource', resource)
		let exist = await resource.$exist()
		// console.log('Exist', exist.data)
		if (exist.err == null && exist.data.exist == true) {
			resource = new ResourceKindClass(exist.data.data) 
			let observed = args.observed 
			let dataToSave = {}
			dataToSave.lastSeen = new Date()
			dataToSave.version = observed.version
			dataToSave.arch = observed.sys.arch
			dataToSave.cpuKind = observed.cpus[observed.cpus.length - 1].product_name
			dataToSave.gpuKind = observed.gpus.length > 0 ? observed.gpus[observed.gpus.length - 1].product_name : '---'
			dataToSave.gpuCount = observed.gpus.length > 0 ? observed.gpus.length : 0
			dataToSave.cpuCount = observed.cpus.length
			dataToSave.mem = observed.sys.mem
			dataToSave.cpus = observed.cpus
			dataToSave.gpus = observed.gpus
			dataToSave.containers = observed.containers
			observed.containers.forEach(async (c) => {
				if (c.containerResource !== undefined && c.containerResource !== null) {
					let cc = new Class.Container({
						kind: 'container',
						zone: c.containerResource.zone,
						workspace: c.containerResource.workspace,
						name: c.containerResource.name,
					})
					let existContainer = await cc.$exist()
					if (existContainer.err == null && existContainer.data.exist == true) {
						console.log('New container observed', c.containerResource.name, c.status, c.reason)
						cc.set('observed', {
							c_id: c.id,
							state: c.status,
							lastSeen: new Date(),
							reason: c.reason
						})
						// let noRestartNeeded = false 
						// if (c.containerResource.resource !== undefined && c.containerResource.resource.config !== undefined && c.containerResource.resource.config.restartPolicy == 'Never') {
						// 	noRestartNeeded = true
						// }					
						// console.log('Restart needed', noRestartNeeded)	
						if ((c.containerResource.desired == 'drain') && (c.status == 'deleted' || c.status == 'exited' || c.status == 'failed' )) {
							//Write an action to delete
							console.log('Deleting container', c.containerResource.name)
							await onContainerToDelete({
								zone: c.containerResource.zone,
								workspace: c.containerResource.workspace,
								name: c.containerResource.name,
							}, 'delete', 'replica-controller')
						} else {
							try {
								console.log('Updating c observed', cc.name())
								let updateRes = await cc.updateObserved()	
								console.log('Updating c observed', cc.name(), updateRes)
							} catch (err) {
								console.log('Error in update container observed')
							}
							
						}
						
					}
				}
				
			})			
			resource.set('observed', dataToSave)
			let resultDes = await resource.updateObserved()
			let containers = await Class.Container.GetByNodeId(resource.id())
			if (containers.err == null) {
				cb(null, {containers: containers.data})	
			} else {
				cb(null, {containers: []})	
			}
			
		} 
	} catch (err) {
		console.log(err)
		cb(true, err)
	}
}

function isValidToken (req, token) {
	try {
		let decoded = jwt.verify(token, process.env.secret)
		req.session.user = decoded.data.user
		req.session.defaultGroup = decoded.data.defaultGroup
		req.session.group = (req.params.group == undefined || req.params.group == '-') ? decoded.data.defaultGroup : req.params.group
		req.session.workspace = (req.params.group == undefined || req.params.group == '-') ? decoded.data.defaultGroup : req.params.group
		req.session.defaultWorkspace = decoded.data.defaultGroup
		return true
	} catch (err) {
		console.log(err)
		return false
	}
}

module.exports.checkUser = async (req, cb) => {
	let checkOutput = {err: null, data: false}
	try {
		let validToken = isValidToken(req, req.token)
		if (validToken == false) {
			cb(checkOutput)
			return	
		} 
	
		let username = req.session.user

		let resultUser = await Class.User.GetOne({
			name: username
		}, false)
		if (resultUser.err !== null || resultUser.data.length !== 1) {
			cb(checkOutput)
			return	
		}

		if (AlwaysAllowedRoutes.includes(req.url)) {
			cb({err: null, data: true})
			return
		}

		let userDef = resultUser.data[0].resource.resources
		const hasBody = (req.body !== null && req.body !== undefined && Object.keys(req.body).length) > 0 ? true : false

		let opResourceKind = null
		let opOperation = null
		let opWorkspace = null
		let opZone = null

		//console.log('-->', hasBody)
		if (hasBody == true) {

			let bodyData = req.body.data
			opResourceKind = bodyData.kind
			opOperation = req.params.operation
			opWorkspace = req.params.group == '-' ? req.session.defaultWorkspace : req.params.group
			opZone = bodyData.metadata !== undefined ? bodyData.metadata.zone || process.env.ZONE : process.env.ZONE 

			// Set default userspace
			if (req.body.data.metadata == undefined) {
				req.body.data.metadata = {}
			}

			if (req.body.data.metadata.group == undefined || req.body.data.metadata.group == '-') {
				req.body.data.metadata.workspace = opWorkspace
				req.body.data.metadata.group = opWorkspace				
			}
		} else {
			opResourceKind = req.params.resourceKind
			opOperation = req.params.operation
			opWorkspace = req.params.group == '-' ? req.session.defaultWorkspace : req.params.group
			opZone = process.env.ZONE
		}

		let auth = false
		// console.log(opZone, opWorkspace, opResourceKind, opOperation, userDef)

		for (var i = 0; i < userDef.length; i += 1) {
			let policy = userDef[i]
			// console.log(policy)
			if (   (policy.kind == opResourceKind 	|| policy.kind == 'All') 
				&& (policy.zone == opZone 			|| policy.zone == 'All')
				&& (policy.workspace == opWorkspace || policy.workspace == 'All') 
				) {

				let resultPolicy = await Class.Role.GetOne({
					name: policy.role
				}, false)
				//console.log(opResourceKind, opOperation, opWorkspace, opZone)
				//console.log(resultPolicy.data[0].resource.permission[opResourceKind], resultPolicy.data[0].resource.permission[opResourceKind])
				if (resultPolicy.err == null && resultPolicy.data.length == 1) {
					if (resultPolicy.data[0].resource.permission[opResourceKind].map((x) => { return x.toLowerCase()}).includes(opOperation.toLowerCase())) {
						auth = true
						break
					}
				}
			}  
		}

		cb({err: null, data: auth})
	} catch (err) {
		console.log(err)
		checkOutput.err = err
		cb(checkOutput)
	}
}


