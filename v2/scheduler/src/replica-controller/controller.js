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
		let wkF = await Class.Workload.Get({
			zone: this._zone
		})
		if (wkF.err == null) {
			this._workloads = wkF.data
		}

		for (var i = 0; i < this._workloads.length; i += 1) {
			let workload = new Class.Workload(this._workloads[i])			
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

				if (assignedReplicas == desiredReplicaCount) {
					console.log('To run, good replica count', assignedReplicas, desiredReplicaCount)
					for (var ri = 0; ri < assignedReplicas; ri += 1) {
						if (workload.resource_hash() !== containers[ri].resource_hash()) {
							console.log(containers[ri].name(), 'to update!')	
							// Update one at time (for now)
							this._containersToUpdate.push({container: containers[ri], workload: workload})
						}
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
								desired: 'drain'
							})
							let res = await newContainer.updateDesired()
							console.log(workload.name() + '.' + ri, 'drain')
							this._containersToDrain.push(newContainer)
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