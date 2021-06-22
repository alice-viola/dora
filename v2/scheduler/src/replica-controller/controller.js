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
		let containerObservedActions = {err: null, data: []}
		if (this._firstRun == true) {
			wkT = await Class.Workload.Get({
				zone: this._zone,
			})
		} else {
			containerObservedActions = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'container',
				destination: 'replica-controller'
			})


			wkT = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'workload',
				destination: 'replica-controller'
			})
			wkT.data = wkT.data.sort((wka, wkb) => {
				return new Date(wka.insdate) - new Date(wkb.insdate)
			})
		}

		for (var i = 0; i < containerObservedActions.data.length; i += 1) {
			if (containerObservedActions.data[i].action_type == 'delete') {
				let containerToDelete = await Class.Container.Get({
					zone: containerObservedActions.data[i].resource_pk.zone,
					workspace: containerObservedActions.data[i].resource_pk.workspace,
					name: containerObservedActions.data[i].resource_pk.name
				})
				if (containerToDelete.data.length == 1) {
					containerToDelete = new Class.Container(containerToDelete.data[0])
					let existContainer = await containerToDelete.$exist()
					if (existContainer.err == null && existContainer.data.exist == true) {
						// Do not restart containers with wrong restartPolicy
						if (containerToDelete.restartPolicy() == 'Always') {
							await containerToDelete.$delete()	
							let ev = await Class.Action.Delete({
								zone: containerObservedActions.data[i].zone,
								resource_kind: containerObservedActions.data[i].resource_kind,
								destination: containerObservedActions.data[i].destination,
								id: containerObservedActions.data[i].id,
							})
						} else {
							// Delete it also if the restartPolicy is not Always but 
							// the desired state is drain
							if (containerToDelete.desired() == 'drain') {
								await containerToDelete.$delete()
							}
							let ev = await Class.Action.Delete({
								zone: containerObservedActions.data[i].zone,
								resource_kind: containerObservedActions.data[i].resource_kind,
								destination: containerObservedActions.data[i].destination,
								id: containerObservedActions.data[i].id,
							})
						}
					}
				} else {
					let ev = await Class.Action.Delete({
						zone: containerObservedActions.data[i].zone,
						resource_kind: containerObservedActions.data[i].resource_kind,
						destination: containerObservedActions.data[i].destination,
						id: containerObservedActions.data[i].id,
					})
				}
			}
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

			if (workload._p == undefined) {
				let ev = await Class.Action.Delete({
					zone: wkT.data[i].zone,
					resource_kind: wkT.data[i].resource_kind,
					destination: wkT.data[i].destination,
					id: wkT.data[i].id,
				})
				break
			}	

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
			
			if (workload.desired() == 'drain') {
				if (containers.length == 0) {
					// Ok, we can remove the wk
					await workload.$delete()
				} else {
					for (var ri = 0; ri < containers.length; ri += 1) {
						await containers[ri].drain()
						this._containersToDrain.push(containers[ri])
					}
				}
			}	

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
				
				// Update one at time of the already assigned container
				for (var ri = 0; ri < assignedReplicas; ri += 1) {
					if (workload.resource_hash() !== containers[ri].resource_hash()) {
						//if (runningReplicas.length >= desiredReplicaCount - 1) { // CHECK THIS
							await containers[ri].drain()
							break	
						//}
					}
				}

				if ((assignedReplicas) == desiredReplicaCount) {
					let isGood = true
					for (var ri = 0; ri < assignedReplicas; ri += 1) {
						if (workload.resource_hash() !== containers[ri].resource_hash()) {
							isGood = false
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
				} else if ( (assignedReplicas + toAssignReplicasC) < desiredReplicaCount) {
					console.log('NOT HERE')
					for (var ri = assignedReplicas + toAssignReplicasC; ri < desiredReplicaCount; ri += 1) {
						let containerName = desiredReplicaCount == 1 ? workload.name() : workload.name() + '.' + randomstring.generate(6).toLowerCase()
						let newContainer = new Class.Container({
							kind: 'container',
							zone: this._zone,
							workspace: workload.workspace(),
							name: containerName,
							resource: workload.resource(),
							workload_id: workload.id(),
							owner: workload.owner()
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
							let existCheck = await newContainer.$exist()
							if (existCheck.data.exist == true) {
								let loadedContainer = new Class.Container(existCheck.data.data)
								this._containersToCreate.push(loadedContainer)
							}
							
						}
						
					}
				} 
				// #### check if this is the right place
				for (var ri = 0; ri < toAssignReplicasC; ri += 1) {
					if (workload.resource_hash() !== containers[ri].resource_hash()) {
						//if (runningReplicas.length >= desiredReplicaCount - 1) { // CHECK THIS
							await containers[ri].drain()
							break	
						//}
					}
				}

				toAssignReplicas.forEach((c) => {
					this._containersToCreate.push(c)
				})

				if (totalContainers - drainingReplicas > desiredReplicaCount) {
					for (var ri = totalContainers - 1; ri >= desiredReplicaCount; ri -= 1) {
						await containers[ri].drain()
						this._containersToDrain.push(containers[ri])
					}
				}
 			} 
		}
	}
}


module.exports = ReplicaController