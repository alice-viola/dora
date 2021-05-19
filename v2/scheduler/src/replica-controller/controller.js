'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class ReplicaController {
	
	constructor (args) {
		this._zone = args.zone
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
		let wkT = await Class.Action.Get({
			zone: this._zone,
			resource_kind: 'workload',
			destination: 'replica-controller'
		})
		wkT.data = wkT.data.sort((wka, wkb) => {
			return new Date(wka.insdate) - new Date(wkb.insdate)
		})
		
		for (var i = 0; i < wkT.data.length; i += 1) {
			let wkF = await Class.Workload.Get({
				zone: wkT.data[i].resource_pk.zone,
				workspace: wkT.data[i].resource_pk.workspace,
				name: wkT.data[i].resource_pk.name
			})
			
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
				containersIndex = containers.map((c) => {return c.name().split('.')[c.name().split('.').length -1]})
			}
			
			// Check workloads desired
			if (workload.desired() == 'run') {
				// Check replica count is correct
				let runningReplicas = containers.filter((c) => {
					return c.isRunning() == true 
				}).length
				let assignedReplicas = containers.filter((c) => {
					return c.isAssigned() == true
				}).length

				let drainingReplicasC = containers.filter((c) => {
					return c.isDraining() == true
				})
				let drainingReplicas = drainingReplicasC.length
				let totalContainers = containers.length
				this._containersToDrain = this._containersToDrain.concat(drainingReplicasC)
				console.log(totalContainers, assignedReplicas, runningReplicas)
				
				if (assignedReplicas == desiredReplicaCount) {
					console.log('To run, good replica count', assignedReplicas, desiredReplicaCount)
					let isGood = true
					for (var ri = 0; ri < assignedReplicas; ri += 1) {
						if (workload.resource_hash() !== containers[ri].resource_hash()) {
							console.log(containers[ri].name(), 'to update!')	
							isGood = false
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

				else if (assignedReplicas < desiredReplicaCount) {
					console.log('To run, but bad replica count', assignedReplicas, desiredReplicaCount)
					for (var ri = 0; ri < desiredReplicaCount; ri += 1) {
						if (!containersIndex.includes(ri)) {
							let newContainer = new Class.Container({
								kind: 'container',
								zone: this._zone,
								workspace: workload.workspace(),
								name: workload.name() + '.' + ri,
								resource: workload.resource(),
								workload_id: workload.id()
							})
							let existCheck = await newContainer.$exist()
							if (existCheck.data.exist == true) { //ISSUE?
								let loadedContainer = new Class.Container(existCheck.data.data)
								if (loadedContainer.isAssigned() == false) {
									// Because the container is not assigned yet, 
									// we can update to the last wk resource
									loadedContainer.set('resource', workload.resource())
									loadedContainer.set('resource_hash', workload.resource_hash())
									await loadedContainer.updateResource()
									await loadedContainer.updateResourceHash()
									this._containersToCreate.push(loadedContainer)
								} /*else {
									newContainer = new Class.Container({
										kind: 'container',
										zone: this._zone,
										workspace: workload.workspace(),
										name: workload.name() + '.' + ri,
										resource: workload.resource(),
									})
									newContainer.set('desired', 'run')
									let res = await newContainer.updateDesired()
								}*/
							} else {
								await newContainer.apply()
								this._containersToCreate.push(newContainer)
							}
						}
					}
				} 

				console.log('#####', totalContainers, drainingReplicas, desiredReplicaCount)
				if (totalContainers - drainingReplicas > desiredReplicaCount) {
					console.log(assignedReplicas, desiredReplicaCount, totalContainers)
					for (var ri = totalContainers - 1; ri >= desiredReplicaCount; ri -= 1) {
						console.log('ri', ri)
						if (!containersIndex.includes(ri)) {
							let newContainer = new Class.Container({
								kind: 'container',
								zone: this._zone,
								workspace: workload.workspace(),
								name: workload.name() + '.' + ri,
							})
							let existCheck = await newContainer.$exist()
							console.log(existCheck)
							if (existCheck.data.exist == true) { //ISSUE?
								let loadedContainer = new Class.Container(existCheck.data.data)
								loadedContainer.set('desired', 'drain')
								await loadedContainer.updateDesired()
								this._containersToDrain.push(loadedContainer)

							}

							//l
							//console.log(workload.name() + '.' + ri, 'drain')
							//this._containersToDrain.push(newContainer)
						}
					}
				}
 			} else {
 				console.log('To NOT run')
 			}
		}
	}
}


module.exports = ReplicaController