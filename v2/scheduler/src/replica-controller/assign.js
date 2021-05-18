'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class AssignController {
	constructor (container) {
		this._c = container
		console.log(container.name())
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

		// Filter by availability
		let filteredNodes = []
		for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
			let result = await this._canNodeScheduleWorkload(nodes[nodeIndex])
			if (result == true) {
				filteredNodes.push(nodes[nodeIndex])
			}
		}
		nodes = filteredNodes

			
		console.log('NODES length after filter', nodes.length)

		if (nodes.length == 0) {
			await this._writeNoNodeAvailabe()
			return 
		}

		// Found some good nodes,
		// now sort it. For the moment, we
		// choose the first
		let selectedNode = nodes[0]
		let assignedResources = await selectedNode.assignContainer(Class.Container, this._c)
		console.log('ASSIGNED', assignedResources)
		assignedResources.node = selectedNode.name()
		this._c.set('computed', assignedResources)
		let res = await this._c.updateComputed()
		await this._c.updateKey('node_id', selectedNode.id())
	}

	async _findSuitableNodes () {
		// console.log('----', this._c.name())
		// console.log('.... Node selector', this._c.hasNodeSelector())	
		// console.log('..... Want gpu', this._c.wantGpu())
		// console.log('..... Has gpu selector', this._c.hasGpuSelector())	
		// console.log('..... Has cpu selector', this._c.hasCpuSelector())	
		try {
			if (this._c.hasNodeSelector()) {
				// Find corresponding node
				let nodes = await Class.Node.Get({
					zone: this._c.zone(),
					name: this._c.nodeSelector(),
				})
	
				if (nodes.err == null) {
					return nodes.data
				} else {
					return []
				}
			} else if (this._c.wantGpu()) {
				if (this._c.hasGpuSelector()) {
					// Find the nodes with the request Gpu Kind
	
					return []
				} else {
					// Find some nodes with any Gpu Kind
	
					return []
				}
			} else {
				if (this._c.hasCpuSelector()) {
					// Find the nodes with the request Cpu Kind
	
					return []
				} else {
					// Find some nodes with any Cpu Kind
	
					return []
				}
			}
		} catch (err) {
			console.log(err)
			return []
		}
	}

	async _canNodeScheduleWorkload (node) {
		if (this._c.wantGpu()) {
			// Look at the GPU availability
			let nodeFreeGpus = node.freeGpusCount()
			let requiredGpu = this._c.requiredGpuCount()
			if (requiredGpu <= nodeFreeGpus) {
				return true
			} else {
				return false
			}
		} else {
			// Look at the CPU availability
			let nodeFreeCpus = await node.freeCpusCount(Class.Container)
			console.log('AVAILABLE NODE CPUS', nodeFreeCpus)
			let requiredCpu = this._c.requiredCpuCount()
			console.log('REQUIRED CPU', requiredCpu)
			if (requiredCpu <= nodeFreeCpus) {
				return true
			} else {
				return false
			}
		}
	}

	async _writeNoNodeAvailabe () {

	}

}

module.exports = AssignController

