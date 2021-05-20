'use strict'

let randomstring = require('randomstring')

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class ReplicaController {
	
	constructor (args) {
		this._zone = args.zone
		this._firstRun = args.firstRun
		this._workloads = []
		this._containersToCreate = []
		this._containersToDrain = []
		this._containersToUpdate = []
	}

	containersToCreate () {
		return this._containersToCreate
	}

	containersToDrain () {
		return this._containersToDrain
	}

	containersToUpdate () {
		return this._containersToUpdate
	}

	async run () {
		let wkT = []
		if (this._firstRun == true) {
			wkT = await Class.Workload.Get({
				zone: this._zone,
			})
		} else {
			wkT = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'workload',
				destination: 'replica-controller'
			})
			wkT.data = wkT.data.sort((wka, wkb) => {
				return new Date(wka.insdate) - new Date(wkb.insdate)
			})
		}

		
		for (var i = 0; i < wkT.data.length; i += 1) {
			let wkF = null
			if (this._firstRun == true) {
				wkF = await Class.Workload.Get({
					zone: wkT.data[i].zone,
					workspace: wkT.data[i].workspace,
					name: wkT.data[i].name
				})
			} else {
				wkF = await Class.Workload.Get({
					zone: wkT.data[i].resource_pk.zone,
					workspace: wkT.data[i].resource_pk.workspace,
					name: wkT.data[i].resource_pk.name
				})
			}
			
			let wk = wkF.data[0]

			let workload = new Class.Workload(wk)			
			// Fetch workload container
			let containers = []
			let containersIndex = []
			const desiredReplicaCount = workload.desiredReplica()
			let workloadComputed = workload.computed()
			
			let containerWk = await Class.Container.Get({
				zone: this._zone,
				workspace: workload.workspace(),
				workload_id: workload.id()
			})	
			if (containerWk.err == null) {
				containers = containerWk.data.map((c) => {
					return new Class.Container(c)
				})
			}
			
			// Check workloads desired
			if (workload.desired() == 'run') {
				// Check replica count is correct
				let runningReplicas = containers.filter((c) => {
					return c.isRunning() == true 
				})
				let runningReplicasC = runningReplicas.length
				let assignedReplicas = containers.filter((c) => {
					return c.isAssigned() == true
				}).length
				let toAssignReplicas = containers.filter((c) => {
					return c.isToAssign() == true
				})
				let toAssignReplicasC = toAssignReplicas.length

				let drainingReplicasC = containers.filter((c) => {
					return c.isDraining() == true
				})
				let drainingReplicas = drainingReplicasC.length
				let totalContainers = containers.length
				this._containersToDrain = this._containersToDrain.concat(drainingReplicasC)
				console.log('->', totalContainers, assignedReplicas, runningReplicasC)
				
				if ((assignedReplicas + toAssignReplicasC) == desiredReplicaCount) {
					console.log('To run, good replica count', assignedReplicas, desiredReplicaCount)
					let isGood = true
					for (var ri = 0; ri < assignedReplicas; ri += 1) {
						if (workload.resource_hash() !== containers[ri].resource_hash()) {
							console.log(containers[ri].name(), 'to update!')	
							isGood = false

							for (var ri = 0; ri < 1; ri += 1) {
								
								console.log('DRAIN_____', containers[ri].name())
								await containers[ri].drain()
								this._containersToDrain.push(containers[ri])
								let newContainer = new Class.Container({
									kind: 'container',
									zone: this._zone,
									workspace: workload.workspace(),
									name: workload.name() + '.' + randomstring.generate(6).toLowerCase(),
									resource: workload.resource(),
									workload_id: workload.id()
								})
								await newContainer.apply()
								this._containersToCreate.push(newContainer)

							}


							// Update one at time (for now)
							// this._containersToUpdate.push({container: containers[ri], workload: workload})
							//let newContainer = new Class.Container({
							//	kind: 'container',
							//	zone: this._zone,
							//	workspace: workload.workspace(),
							//	name: workload.name() + '.' + ri,
							//	desired: 'drain'
							//})
							//let res = await newContainer.updateDesired()
							//console.log(workload.name() + '.' + ri, 'drain')
							break
						}
					}
					if (isGood == true) {
						// we can delete the event
						let ev = await Class.Action.Delete({
							zone: wkT.data[i].zone,
							resource_kind: wkT.data[i].resource_kind,
							destination: wkT.data[i].destination,
							id: wkT.data[i].id,
						})
					}
				} 

				else if ( (assignedReplicas + toAssignReplicasC) < desiredReplicaCount) {
					console.log('To run, but bad replica count', assignedReplicas, desiredReplicaCount)
					for (var ri = assignedReplicas + toAssignReplicasC; ri < desiredReplicaCount; ri += 1) {
						
						let newContainer = new Class.Container({
							kind: 'container',
							zone: this._zone,
							workspace: workload.workspace(),
							name: workload.name() + '.' + randomstring.generate(6).toLowerCase(),
							resource: workload.resource(),
							workload_id: workload.id()
						})
						let existCheck = await newContainer.$exist()
						if (existCheck.data.exist == true) {
							let loadedContainer = new Class.Container(existCheck.data.data)
							if (loadedContainer.isAssigned() == false) {
								// Because the container is not assigned yet, 
								// we can update to the last wk resource
								loadedContainer.set('resource', workload.resource())
								loadedContainer.set('resource_hash', workload.resource_hash())
								await loadedContainer.updateResource()
								await loadedContainer.updateResourceHash()
								this._containersToCreate.push(loadedContainer)
							} 
						} else {
							await newContainer.apply()
							this._containersToCreate.push(newContainer)
						}
						
					}
				} 
				toAssignReplicas.forEach((c) => {
					this._containersToCreate.push(c)
				})

				if (totalContainers - drainingReplicas > desiredReplicaCount) {
					for (var ri = totalContainers - 1; ri >= desiredReplicaCount; ri -= 1) {
						console.log('DRAIN_____', containers[ri].name())
						await containers[ri].drain()
						this._containersToDrain.push(containers[ri])
					}
				}
 			} else {
 				console.log('To NOT run')
 			}
		}
	}
}


module.exports = ReplicaController