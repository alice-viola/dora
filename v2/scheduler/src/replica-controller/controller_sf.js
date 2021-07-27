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
		let wkActions = []
		let containerObservedActions = {err: null, data: []}
		if (this._firstRun == true) {
			wkT = await Class.Workload.Get({
				zone: this._zone,
			})
			console.log(wkT)
			containerObservedActions = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'container',
				destination: 'replica-controller'
			})
			await this._manageOrphanContainers()
			await this._manageContainerActions(containerObservedActions)
			await this._manageWorkloads(wkT)
		} else {
			wkActions = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'workload',
				destination: 'replica-controller'
			})

			containerObservedActions = await Class.Action.Get({
				zone: this._zone,
				resource_kind: 'container',
				destination: 'replica-controller'
			})
			await this._manageContainerActions(containerObservedActions)

			if (Array.isArray(wkActions.data)) {
				wkActions.data = wkActions.data.sort((wka, wkb) => {
					return new Date(wka.insdate) - new Date(wkb.insdate)
				})			
				wkT = await this._manageWorkloadActions(wkActions)	
			}			
			
			await this._manageWorkloads(wkT)
		}
	}


	async _manageContainerActions (containerObservedActions) {
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
						console.log(containerToDelete.restartPolicy(), containerToDelete.desired())
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
				} else if (containerToDelete.data.length == 0) {
					let ev = await Class.Action.Delete({
						zone: containerObservedActions.data[i].zone,
						resource_kind: containerObservedActions.data[i].resource_kind,
						destination: containerObservedActions.data[i].destination,
						id: containerObservedActions.data[i].id,
					})
				} else {
					console.log('Non managed case at container delete action', containerToDelete.name())
				}		
			}		
		}
	}

	async _manageWorkloadActions (workloadsObservedActions) {
		let workloadsToCheck = []
		for (var i = 0; i < workloadsObservedActions.data.length; i += 1) {
			let wkF = null

			wkF = await Class.Workload.Get({
				zone: workloadsObservedActions.data[i].resource_pk.zone,
				workspace: workloadsObservedActions.data[i].resource_pk.workspace,
				name: workloadsObservedActions.data[i].resource_pk.name
			})
			
			let wk = wkF.data[0]
			let workload = new Class.Workload(wk)		
			if (workload._p == undefined) {
				let ev = await Class.Action.Delete({
					zone: workloadsObservedActions.data[i].zone,
					resource_kind: workloadsObservedActions.data[i].resource_kind,
					destination: workloadsObservedActions.data[i].destination,
					id: workloadsObservedActions.data[i].id,
				})
				break
			} else {
				// check action and in case delete it
				if (await workload.isSteady(Class.Container)) {
					// wkF.data[0].__action = workloadsObservedActions.data[i]	
					console.log('Workload marked as steady, delete action', workload.name())
					let ev = await Class.Action.Delete({
						zone: workloadsObservedActions.data[i].zone,
						resource_kind: workloadsObservedActions.data[i].resource_kind,
						destination: workloadsObservedActions.data[i].destination,
						id: workloadsObservedActions.data[i].id,
					})					
				} 
				workloadsToCheck.push(wkF.data[0])	
			}
		}	
		return {err: null, data: workloadsToCheck}
	}

	async _manageOrphanContainers () {
		let containerNull = await Class.Container.Get({
			zone: this._zone,
			workload_id: null
		})	
		if (containerNull.err == null) {
			for (var i = 0; i < containerNull.data.length; i+= 1) {
				let c = new Class.Container(containerNull.data[i])
				if (c.workloadId() == null) {
					await c.$delete()	
				}
			}
		}
	}

	async _manageWorkloads (wkT) {
		if (wkT.err != null) {
			return
		}
		for (var i = 0; i < wkT.data.length; i += 1) {
			await this._manageWorkload(wkT.data[i])
		}
	}	

	async _manageWorkload (wk) {

		let fetchContainersForWorkload = async function (workload) {
			let containers = []
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
			return containers
		}.bind(this)

		let workload = new Class.Workload(wk)	
		let desiredReplicaCount = parseInt(workload.desiredReplica())
		let containers = await fetchContainersForWorkload(workload)	
		
		let workloadDesired = workload.desired()
		let workloadContainersCount = parseInt(containers.length)

		// console.log('#', workload.name(), workloadDesired, workloadContainersCount, desiredReplicaCount)
		/**
		*	Nothing to do, idle wk
		*/
		if (workloadDesired == 'run' && desiredReplicaCount == 0 && workloadContainersCount == 0) {
			console.log('Workload', wk.name, 'is steady')
			return
		} 

		/**
		*	Replica set to zero but there are some containers
		*/
		else if (workloadDesired == 'run' && desiredReplicaCount == 0 && workloadContainersCount > 0) {
			await this._drainContainers(workload, containers, workloadContainersCount)	
		}

		/**
		*	Want to drain the workload, but some container are present yet
		*/
		else if (workloadDesired == 'drain' && workloadContainersCount > 0) {
			await this._drainContainers(workload, containers, workloadContainersCount)	
		}	

		/**
		*	Want to draint the workload, and we can to it
		*/
		else if (workloadDesired == 'drain' && workloadContainersCount == 0) {
			await this._drainWorkload(workload)	
		}	

		/**
		*	Want to run the wk, and the replica set is good, check only if is it to 
		*	update the container
		*/
		else if (workloadDesired == 'run' && desiredReplicaCount == workloadContainersCount) {
			await this._checkToUpdate(workload, containers)
		}		

		/**
		*	Want to run but there are more containers than desired
		*/
		else if (workloadDesired == 'run' && workloadContainersCount > desiredReplicaCount) {
			await this._drainContainers(workload, containers, workloadContainersCount - desiredReplicaCount)
		}	

		/**
		*	Want to run but there are fewer containers than desired
		*/
		else if (workloadDesired == 'run' && workloadContainersCount < desiredReplicaCount) {
			await this._addContainers(workload, containers, desiredReplicaCount, desiredReplicaCount - workloadContainersCount)
		}	

		else {
			console.log('Non managed case:', workloadDesired, workloadContainersCount, desiredReplicaCount)
		}							
	}

	async _checkToUpdate (workload, containers) {
		console.log('Workload', workload.name(), ', to check update', workload.desiredReplica(), containers.length)
		for (var i = 0; i < containers.length; i += 1) {
			let container = containers[i]
			if (workload.resource_hash() !== container.resource_hash()) {
				console.log('Container', container.name(), 'is to update')
				await this._drainContainer(workload, container.name())
			}
			if (!container.isAssigned()) {
				this._containersToCreate.push(container)		
			}
		}
	}

	/**
	*	Delete workload from DB when desired is DRAIN
	*	and there are not associated containers
	*/
	async _drainWorkload (workload, containers) {
		console.log('Workload', workload.name(), ', to drain all workload', workload.desiredReplica())
		await Class.Workload.DeleteEvents({
			resource_id: workload.id(),
			zone: workload.zone(),
			resource_kind: 'workload'
		})
		await workload.$delete()
	}

	/**
	*	Drain containers from replica
	*/
	async _drainContainers (workload, containers, quantityToRemove) {
		console.log('Workload', workload.name(), ', to drain container', quantityToRemove)
		let containersLength = containers.length
		for (var i = 0; i < quantityToRemove;  i += 1) {
			let containerName = workload.name() + '.' + (containersLength - i)
			await this._drainContainer(workload, containerName)
		}
	}	

	/**
	*	Drain single container
	*/
	async _drainContainer (workload, containerName) {
		console.log('Draining container', containerName)
		let containerToDelete = new Class.Container({
			kind: 'container',
			zone: this._zone,
			workspace: workload.workspace(),
			name: containerName,
			resource: workload.resource(),
			workload_id: workload.id(),
			owner: workload.owner()
		})	
		try {
			containerToDelete = await containerToDelete.$load(Class.Container)	
			if (containerToDelete.canBeDeleted() == true) {
				await containerToDelete.$delete()
			} else if (!containerToDelete.isDraining()) {
				await containerToDelete.drain()	
				this._containersToDrain.push(containerToDelete)
			} else {
				this._containersToDrain.push(containerToDelete)
			}
		} catch (err) {
			console.log(err)
		}	
	}

	/**
	*	Add single containers to the replica
	*/
	async _addContainers (workload, containers, desiredReplicaCount, quantityToAdd) {
		console.log('Workload', workload.name(), ' to add container', quantityToAdd)
		let containersName = containers.map((c) => {
			return c.name()
		})
		let addedQuantity = 0
		

		for (var i = 1; i < (desiredReplicaCount + 1); i += 1) {
			let containerCandidateName = workload.name() + '.' + i.toString()
			console.log('Add check', containerCandidateName)
			if (!containersName.includes(containerCandidateName)) {
				console.log('Found good', containerCandidateName)
				let added = await this._addContainer(workload, i)
				if (added == true) {
					addedQuantity += 1	
				}
				
			}
			if (addedQuantity == quantityToAdd) {
				break
			}
		}
	}		
	/**
	*	Add single container to the replica
	*/		
	async _addContainer (workload, containerIndex) {
		try {
			let added = false
			let containerName = workload.name() + '.' + containerIndex.toString()
			console.log('Workload', workload.name(), ' adding', containerIndex, containerName)
			let newContainer = new Class.Container({
				kind: 'container',
				zone: this._zone,
				workspace: workload.workspace(),
				name: containerName,
				resource: workload.resource(),
				workload_id: workload.id(),
				owner: workload.owner()
			})		
			await Class.Workload.WriteEvent({
				resource_id: workload.id(),
				zone: workload.zone(),
				resource_kind: 'workload',
				origin: 'dora.scheduler',
				resource: JSON.stringify({
					kind: 'ScaleUp',
					destination: workload.name(),
					text: `Container ${containerName} of workload ${workload.name()} has been added to the replica set`
				}),
				insdate: (new Date()).toISOString()
			})
			// Check if this container exist, maybe because is draining
			let existCheck = await newContainer.$exist()
			if (existCheck.data.exist == true) {		
				// Do Nothing
				console.log('Want to add', containerName, 'but still exist')
			} else {
				await newContainer.apply()
				newContainer = await newContainer.$load(Class.Container)
				this._containersToCreate.push(newContainer)	
				added = true		
			}
			return added
		} catch (err) {
			console.log(err)
			return false
		}
	}		
}


module.exports = ReplicaController