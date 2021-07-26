'use strict'

let BaseResource = require('./base')

const DEFAULT_GPU_COMPUTE_TYPE = 'C'

function isGpuUsed (gpu) {
	if (gpu.processes !== undefined) {
		if (typeof gpu.processes == 'string') {
			return false
		} else if (gpu.processes.process_info !== undefined) {
			let available = true
			gpu.processes.process_info.forEach((gpuProc) => {
				if (gpuProc.type == DEFAULT_GPU_COMPUTE_TYPE) {
					available = false
				}
			})
			return !available
		}
	} else {
		return false
	}	
}

class Node extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Node

	static IsZoned = true

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

	async drain (Class) {
		
		await this.drainContainers(Class)
		this.$delete()
	}

	async drainContainers (Class) {
		let containerOnNode = await Class.Container.GetByNodeId(this.id())
		for (var i = 0; i < containerOnNode.data.length; i += 1) {
			let c = containerOnNode.data[i]
			let cObj = new Class.Container(c)
			await c.drain()
		}		
	} 

	observed () {
		return (this._p.observed == undefined || this._p.observed == null) ? {
			cpus: [],
			gpus: [],
		} : this._p.observed
	}

	async freeGpusCount (ContainerClass) {
		let observed = this.observed()
		let containers = await ContainerClass.GetByNodeId(this.id())
		let assignedGpus = 0
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			// Do not count if container is exited or deleted
			// Check restart policy of the container
			if (cc.canBeDeleted() == false) {
				assignedGpus += cc.assignedGpuCount()	
			}
		})		
		return observed.gpus.length - assignedGpus
	}

	async freeCpusCount (ContainerClass) {
		let observed = this.observed()
		let containers = await ContainerClass.GetByNodeId(this.id())

		let assignedCpus = 0
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			assignedCpus += cc.assignedCpuCount()
		})		
		return observed.cpus.length - assignedCpus
	}

	areGpusUsed (gpusIndexArray) {
		let gpus = this.observed().gpus
		let map = {}
		gpusIndexArray.forEach(function (gpuIndex) {
			map[gpuIndex] = false
			for (var i = 0; i < gpus.length; i += 1) {
				if (gpus[i].minor_number == gpuIndex) {

					map[gpuIndex] = {used: isGpuUsed(gpus[i]), uuid: gpus[i].uuid}	
					break
				}
			}
		}.bind(this))
		let values = Object.values(map)
		return values
	}

	async computeResourceToAssign (Class, container) {
		let observed = this.observed()
		let computed = this.computed()
		let toAssignCpu = container.requiredCpuCount()
		let toAssignGpu = container.requiredGpuCount()
		let computedResources = {
			cpus: [], 
			volumes: [], 
			gpus: null, 
			gpuKind: observed.gpuKind,
			mem: null, 
			nodecpus: observed.cpuCount, 
			nodegpus: observed.gpus.length,
			nodememory: observed.mem.total,
			shmSize: container.requiredShmSize()
		}

		// VOLUMES
		if (container.requireVolumes()) {
			let volumes = container.requiredVolumes()	
			for (var vol = 0; vol < volumes.length; vol += 1) {
				let _vol = await Class.Volume.Get({
					zone: this.zone(),
					workspace: volumes[vol].workspace || container.workspace(),
					name: volumes[vol].name
				})
				if (_vol.err == null && _vol.data.length == 1) {

					// TODO: Add hostpath
					if (_vol.data[0].resource.storage !== 'Local') {
						let _storage = await Class.Storage.Get({
							zone: this.zone(),
							name: _vol.data[0].resource.storage
						})
						if (_storage.err == null && _storage.data.length == 1) {
							computedResources.volumes.push({
								name: 'dora.volume.' + container.workspace() + '.' + volumes[vol].name,
								target: volumes[vol].target,
								workspace: _vol.data[0].workspace,
								storageName: _storage.data[0].name, 
								storage: _storage.data[0].resource,
								resource: volumes[vol],
								policy: _vol.data[0].resource.policy || 'rw'
							})							
						}
					} else {
						computedResources.volumes.push({
							name: 'dora.volume.' + container.workspace() + '.' + volumes[vol].name,
							target: volumes[vol].target,
							workspace: _vol.data[0].workspace,
							storageName: 'local',
							storage: _storage.data[0].resource,
							resource: volumes[vol],
							policy: _vol.data[0].resource.policy || 'rw'
						})	
					}
				}
			}
		}

		// CPUS
		if (isNaN(toAssignCpu) == true) {
			computedResources.cpus = toAssignCpu
			return computedResources
		}
		let assignedCpuIndex = []
		let assignedGpuIndex = []
		
		let containers = await Class.Container.GetByNodeId(this.id())

		let nodeAssignedCpusIndex = []
		let nodeAssignedGpusIndex = []
		containers.data.forEach((c) => {
			let cc = new Class.Container(c)
			console.log('+', this.name(), cc.name(),  cc.assignedGpu())
			nodeAssignedCpusIndex = nodeAssignedCpusIndex.concat(cc.assignedCpu())
			nodeAssignedGpusIndex = nodeAssignedGpusIndex.concat(cc.assignedGpu())
		})

		for (var cpuIndex = 0; cpuIndex < observed.cpus.length; cpuIndex += 1) {
			if (!nodeAssignedCpusIndex.includes(cpuIndex)) {
				assignedCpuIndex.push(cpuIndex)
			}
			console.log(toAssignCpu, assignedCpuIndex.length)
			if (parseInt(toAssignCpu) === parseInt(assignedCpuIndex.length)) {
				break
			}
		} 
		computedResources.cpus = assignedCpuIndex

		// GPUS
		if (toAssignGpu !== 0) {
			console.log('GPUS ASSIGN ----', nodeAssignedGpusIndex, observed.gpus.length)
			for (var gpuIndex = 0; gpuIndex < observed.gpus.length; gpuIndex += 1) {
				if (!nodeAssignedGpusIndex.includes(observed.gpus[gpuIndex].minor_number)) {
					assignedGpuIndex.push(observed.gpus[gpuIndex].minor_number)
					nodeAssignedGpusIndex.push(observed.gpus[gpuIndex].minor_number)
				}
				if (parseInt(toAssignGpu) == parseInt(assignedGpuIndex.length)) {
					break
				}
			} 
			computedResources.gpus = assignedGpuIndex
		}
		return computedResources
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
		let _status = (lastSeen !== 'never' && milliLastSeen < 20000 && data.desired == 'run') ? 'READY' : 'NOT_READY' 
		if (data.resource !== undefined && data.resource.schedulingDisabled !== undefined) {
			if (data.resource.schedulingDisabled == true || data.resource.schedulingDisabled == 'true') {
				_status = _status + ', SCHEDULING DISABLED'
			}
		}
		return {
			lastSeen: lastSeen,
			status: _status
		}
	}

	isReady () {
		return this.constructor.isReady(this._p)
	}

	static hasCpuKind (node, cpuKind) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.cpuKind == cpuKind
		} else {
			return false
		}
	}

	static hasGpuKind (node, gpuKind) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.gpuKind == gpuKind
		} else {
			return false
		}
	}

	static hasGpus (node) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.gpus !== undefined & node.observed.gpus.length > 0
		} else {
			return false
		}
	}

	static hasCpus (node) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.cpus !== undefined & node.observed.cpus.length > 0
		} else {
			return false
		}
	}

	static allowCpuWorkload (node) {

		return node.resource !== undefined && node.resource.allow !== undefined && node.resource.allow.includes('CPUWorkload')
	}	

	static allowGpuWorkload (node) {
		return node.resource !== undefined && node.resource.allow !== undefined && node.resource.allow.includes('GPUWorkload')
	}

	static _FormatOne (data) {
		let cpuKind = '-' 
		let gpuKind = '-'
		let cpuCount = '-'
		let gpuCount = '-'
		let version = '-'
		if (data.observed !== undefined && data.observed !== null) {
			if (data.observed.cpuKind !== undefined && data.observed.cpuKind !== null) {
				cpuKind = data.observed.cpuKind	
				cpuCount = data.observed.cpuCount
			}
			if (data.observed.gpus.length !== 0) {
				gpuKind = data.observed.gpus[0].product_name	
				gpuCount = data.observed.gpus.length
			}
			version = data.observed.version
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
			status: status,
			version: version
		}
	}
}

module.exports = Node