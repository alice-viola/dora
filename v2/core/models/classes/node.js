'use strict'

let BaseResource = require('./base')

class Node extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Node

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	observed () {
		return (this._p.observed == undefined || this._p.observed == null) ? {
			cpus: [],
			gpus: [],
		} : this._p.observed
	}


	freeGpusCount () {
		let computed = this.computed()
		let observed = this.observed()
		return observed.gpus.length - computed.assignedGpus.length
	}

	async freeCpusCount (ContainerClass) {
		let observed = this.observed()
		let containers = await ContainerClass.Get({
			zone: this.zone(),
			node_id: this.id(),
		})

		let assignedCpus = 0
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			assignedCpus += cc.assignedCpuCount()
		})

		//let computed = this.computed()
		
		return observed.cpus.length - assignedCpus
	}

	async assignContainer (ContainerClass, container) {
		let observed = this.observed()
		let computed = this.computed()
		let toAssign = container.requiredCpuCount()
		let assignedCpuIndex = []
		
		let containers = await ContainerClass.Get({
			zone: this.zone(),
			node_id: this.id(),
		})

		let nodeAssignedCpusIndex = []
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			nodeAssignedCpusIndex = nodeAssignedCpusIndex.concat(cc.assignedCpu())
		})

		for (var cpuIndex = 0; cpuIndex < observed.cpus.length; cpuIndex += 1) {
			if (!nodeAssignedCpusIndex.includes(cpuIndex)) {
				assignedCpuIndex.push(cpuIndex)
			}
			if (toAssign == assignedCpuIndex.length) {
				break
			}
		} 
		return {cpus: assignedCpuIndex}
	}

	static isReady (data) {
		let lastSeen = 'never'
		let milliLastSeen = '-'
		if (data.observed !== undefined && data.observed !== null) {
			lastSeen = new Date() - new Date(data.observed.lastSeen)
			milliLastSeen = lastSeen
			if (lastSeen <= 20000) {
				lastSeen = 'now'
			} else if (lastSeen > 20000 && lastSeen <= 120000) {
				lastSeen = Math.floor(lastSeen / 1000) + 's ago'
			} else if (lastSeen > 120000 && lastSeen <= 3600000) {
				lastSeen = Math.floor(lastSeen / 1000 / 60) + 'm ago'
			} else if (lastSeen > 3600000 && lastSeen < 86400000) {
				lastSeen = Math.floor(lastSeen / 1000 / 60 / 60) + 'h ago'
			} else {
				lastSeen = Math.floor(lastSeen / 1000 / 60 / 60 / 24) + 'd ago'
			}			
		}
		return {
			lastSeen: lastSeen,
			status: (lastSeen !== 'never' && milliLastSeen < 20000 && data.desired == 'run') ? 'READY' : 'NOT_READY' 
		}
	}

	isReady () {
		return this.constructor.isReady(this._p)
	}

	static _FormatOne (data) {
		let cpuKind = '-' 
		let gpuKind = '-'
		let cpuCount = '-'
		let gpuCount = '-'
		if (data.observed !== undefined && data.observed !== null) {
			if (data.observed.cpuKind !== undefined && data.observed.cpuKind !== null) {
				cpuKind = data.observed.cpuKind	
				cpuCount = data.observed.cpuCount
			}
			if (data.observed.gpuKind !== undefined && data.observed.gpuKind !== null) {
				gpuKind = data.observed.gpuKind	
				gpuCount = data.observed.gpuCount
			}
		}

		let {lastSeen, status} = this.isReady(data) 

		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			endpoint: data.resource.endpoint,
			cpu: cpuKind !== '-' ? cpuCount + 'x' + cpuKind : cpuKind,
			gpu: gpuKind !== '-' ? gpuCount + 'x' + gpuKind : gpuKind,
			lastSeen: lastSeen,
			desired: data.desired,
			status: status
		}
	}
}

module.exports = Node