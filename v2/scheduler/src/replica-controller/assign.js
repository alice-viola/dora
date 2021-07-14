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
		/*let strategy = 'RANDOM' 
		let index = 0
		if (strategy == 'RANDOM') {
			index = Math.floor(Math.random() * nodes.length)
		} 
		let selectedNode = nodes[index]*/
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

		let strategy = this._c._p.resource.config.affinity
		if (strategy == undefined) {
			strategy = 'Random'
		}
		let selectedNode = null
		console.log('Assing with node affinity:', strategy)
		let otherContainers, otherContainersNodeUUID, assignedNode, selectedUUID
		switch (strategy) {
			case 'Random':
				selectedNode = randomStrategy(nodes)
				break;

			case 'FanOut':
				otherContainers = await fetchContainersForWorkload(this._c)
				otherContainersNodeUUID = otherContainers.map((c) => {
					return c._p.node_id
				})
				console.log('UUID', otherContainersNodeUUID)
				assignedNode = false
				for (var n = 0; n < nodes.length; n += 1) {
					if (!otherContainersNodeUUID.includes(nodes[n].id)) {
						selectedNode = nodes[n]
						assignedNode = true
					}
				}
				if (assignedNode == false) {
					selectedNode = randomStrategy(nodes)
				}
				break;

			case 'SameNode':
				otherContainers = await fetchContainersForWorkload(this._c)
				otherContainersNodeUUID = otherContainers.map((c) => {
					return c._p.node_id
				})	
				otherContainersNodeUUID = otherContainersNodeUUID.filter((uuid) => {
					return uuid !== null
				})		
				assignedNode = false
				if (otherContainersNodeUUID.length !== 0) {
					selectedUUID = otherContainersNodeUUID[0]
					for (var n = 0; n < nodes.length; n += 1) {
						if (nodes[n].id == selectedUUID) {
							selectedNode = nodes[n]
							assignedNode = true
						}
					}					
				} else {
					assignedNode = true
					selectedNode = randomStrategy(nodes)
				}	
				if (assignedNode == false) {
					selectedNode = randomStrategy(nodes)
				}
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
				if (this._c.hasGpuSelector() && this._c.requiredGpuKind() !== 'pwm.all' && this._c.requiredGpuKind() !== 'All') {
					// Find the nodes with the request Gpu Kind
					nodesToReturn = nodesToReturn.filter((n) => {
						return Class.Node.hasGpuKind(n, this._c.requiredGpuKind()) == true
					})
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
				if (this._c.hasCpuSelector() && this._c.requiredCpuKind() !== 'pwm.all' && this._c.requiredCpuKind() !== 'All') {
					// Find the nodes with the request Gpu Kind
					nodesToReturn = nodesToReturn.filter((n) => {
						return Class.Node.hasCpuKind(n, this._c.requiredCpuKind()) == true
					})
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

