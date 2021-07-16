'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class AssignController {
	constructor (container) {
		this._c = container
	}

	async assign () {
		let nodes = await this._findSuitableNodes()	
		if (nodes.length == 0) {
			await this._writeNoNodeAvailabe()
			return
		} 

		// Filter by readiness
		nodes = nodes.map((n) => { return new Class.Node(n) })
		nodes = nodes.filter((n) => {
			let {lastSeen, status} = n.isReady()
			return status == 'READY'
		})
		if (nodes.length == 0) {
			await this._writeNoNodeAvailabe()
			return 
		}
		
		let filteredNodes = []
		for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
			let result = await this._canNodeScheduleWorkload(nodes[nodeIndex])
			if (result == true) {
				filteredNodes.push(nodes[nodeIndex])
			}
		}

		nodes = filteredNodes
		if (nodes.length == 0) {
			await this._writeNoNodeAvailabe()
			return 
		}
		

		// Found some good nodes,
		// now sort it.

		let selectedNode = await this._filterNodeAffinity(nodes)
		if (selectedNode == null) {
			console.log('Error in affinity node strategy')
			return
		}
		let assignedResources = await selectedNode.computeResourceToAssign(Class, this._c)
		assignedResources.node = selectedNode.name()
		this._c.set('computed', assignedResources)
		let res = await this._c.updateComputed()
		await this._c.updateKey('node_id', selectedNode.id())
	}

	async _filterNodeAffinity (nodes) {
		let fetchContainersForWorkload = async function (container) {
			let containers = []
			let containerWk = await Class.Container.Get({
				zone: this._zone,
				workspace: container.workspace(),
				workload_id: container.workloadId()
			})	
			if (containerWk.err == null) {
				containers = containerWk.data.map((c) => {
					return new Class.Container(c)
				})
			}	
			return containers
		}.bind(this)

		let randomStrategy = (nodes) => {
			let index = 0
			index = Math.floor(Math.random() * nodes.length)
			return nodes[index]			
		}

		let distributeStrategy = async (nodes) => {
			let selectedNode = null
			let otherContainers, otherContainersNodeUUID, assignedNode, selectedUUID
			otherContainers = await fetchContainersForWorkload(this._c)
			otherContainersNodeUUID = otherContainers.map((c) => {
				return c._p.node_id
			})
			assignedNode = false
			let occurences = otherContainersNodeUUID.reduce(function (acc, curr) {
				return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc 
			}, {})
			delete occurences[null]
			const occurencesLength = Object.values(occurences)
			const occurencesUUIDS = Object.keys(occurences)
			if (occurencesLength == 0) {
				selectedNode = randomStrategy(nodes)
			} else if (occurencesLength <= nodes.length) {
				nodes.some((n) => {
					if (!occurencesUUIDS.includes(n.id().toString())) {
						selectedNode = n
						return true
					}
				})
			} else {
				let occurencesArray = occurencesUUIDS.map((uuid) => {return {uuid: uuid, value: occurences[uuid]}})
				occurencesArray.sort((a, b) => (a.value > b.value) ? 1 : -1)
				let minUUID = occurencesArray[0].uuid		
				nodes.some((n) => {
					if (n.id() == minUUID) {
						selectedNode = n
						return true
					}
				})							
			}
			return selectedNode			
		}

		let fillStrategy = async (nodes) => {
			let selectedNode = null
			let otherContainers, otherContainersNodeUUID, assignedNode, selectedUUID
			otherContainers = await fetchContainersForWorkload(this._c)
			otherContainersNodeUUID = otherContainers.map((c) => {
				return c._p.node_id
			})
			assignedNode = false
			let occurences = otherContainersNodeUUID.reduce(function (acc, curr) {
				return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc 
			}, {})
			delete occurences[null]
			const occurencesLength = Object.values(occurences)
			const occurencesUUIDS = Object.keys(occurences)
			if (occurencesLength == 0) {
				selectedNode = randomStrategy(nodes)
			} else if (occurencesLength <= nodes.length) {
				nodes.some((n) => {
					if (occurencesUUIDS.includes(n.id().toString())) {
						selectedNode = n
						return true
					}
				})
			} else {
				let occurencesArray = occurencesUUIDS.map((uuid) => {return {uuid: uuid, value: occurences[uuid]}})
				occurencesArray.sort((a, b) => (a.value > b.value) ? 1 : -1)
				let occurencesArrayRev = occurencesArray.reverse()
				let minUUID = occurencesArrayRev[0].uuid	
				nodes.some((n) => {
					if (n.id().toString() == minUUID) {
						selectedNode = n
						return true
					}
				})							
			}		
			return selectedNode	
		}

		let strategy = this._c._p.resource.config.affinity
		if (strategy == undefined) {
			strategy = 'Random'
		}
		let selectedNode = null
		console.log('Try to assign with node affinity:', strategy)
		
		switch (strategy) {
			case 'Random':
				selectedNode = randomStrategy(nodes)
				break;

			case 'Distribute': // TODO implement more efficient way to FanOut
				selectedNode = await distributeStrategy(nodes)
				break;

			case 'Fill':
				selectedNode = await fillStrategy(nodes)
				break;

			default:
				selectedNode = randomStrategy(nodes)
				break;
		}
		return selectedNode
	}

	async _findSuitableNodes () {
		let nodesToReturn = []
		try {
			if (this._c.hasNodeSelector()) {
				// Find corresponding node
				let nodes = await Class.Node.Get({
					zone: this._c.zone(),
					name: this._c.nodeSelector(),
				})
				nodesToReturn = nodes.data
				if (nodes.err == null) {
					return nodesToReturn
				} else {
					return []
				}
			} else if (this._c.wantGpu()) {
				let nodes = await Class.Node.Get({
					zone: this._c.zone()
				})
				if (nodes.err != null) {
					return []
				}
				nodesToReturn = nodes.data
				nodesToReturn = nodesToReturn.filter((n) => {
					return Class.Node.allowGpuWorkload(n) == true
				})
				if (this._c.hasGpuSelector()) {
					if (this._c.requireSpecificGpuKind() == true) {
						let requiredGPUsKind = this._c.requiredGpuKind()
						let nodesAvailable = {}
						requiredGPUsKind.forEach((requireGpuKind) => {
							let nodes_ = nodesToReturn.filter((n) => {
								return Class.Node.hasGpuKind(n, requireGpuKind) == true
							})
							nodes_.forEach((n) => {
								nodesAvailable[n.name] = n
							})					
						})
						nodesToReturn = Object.values(nodesAvailable)
					} 
				}		
			} else {
				let nodes = await Class.Node.Get({
					zone: this._c.zone()
				})
				if (nodes.err != null) {
					return []
				}
				nodesToReturn = nodes.data
				nodesToReturn = nodesToReturn.filter((n) => {
					return Class.Node.allowCpuWorkload(n) == true
				})
				//if (this._c.hasCpuSelector() && this._c.requiredCpuKind() !== 'pwm.all' && this._c.requiredCpuKind() !== 'All') {
				//	// Find the nodes with the request Gpu Kind
				//	nodesToReturn = nodesToReturn.filter((n) => {
				//		return Class.Node.hasCpuKind(n, this._c.requiredCpuKind()) == true
				//	})
				//}
				if (this._c.hasCpuSelector()) {
					if (this._c.requireSpecificCpuKind() == true) {
						let requiredGPUsKind = this._c.requiredCpuKind()
						let nodesAvailable = {}
						requiredGPUsKind.forEach((requireCpuKind) => {
							let nodes_ = nodesToReturn.filter((n) => {
								return Class.Node.hasCpuKind(n, requireCpuKind) == true
							})
							nodes_.forEach((n) => {
								nodesAvailable[n.name] = n
							})					
						})
						nodesToReturn = Object.values(nodesAvailable)
					} 
				}				
			}
			return nodesToReturn
		} catch (err) {
			console.log(err)
			return nodesToReturn
		}
	}

	async _canNodeScheduleWorkload (node) {
		if (this._c.wantGpu()) {
			// Look at the GPU availability
			let nodeFreeGpus = await node.freeGpusCount(Class.Container)

			let requiredGpu = this._c.requiredGpuCount()
			if (requiredGpu <= nodeFreeGpus) {
				return true
			} else {
				return false
			}
		} else {
			// Look at the CPU availability
			let nodeFreeCpus = await node.freeCpusCount(Class.Container)
			let requiredCpu = this._c.requiredCpuCount()
			if (isNaN(requiredCpu)) {
				return true
			} else {
				if (requiredCpu <= nodeFreeCpus) {
					return true
				} else {
					return false
				}
			}
		}
	}

	async _writeNoNodeAvailabe () {

	}

}

module.exports = AssignController

