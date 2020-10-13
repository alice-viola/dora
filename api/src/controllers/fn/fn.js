'use strict'

module.exports.nodeSelector = (selectors, nodes) => {
	if (selectors == null || selectors == undefined) {
		return nodes
	}
	if (nodes.length == 0) {
		return nodes
	}
	if (selectors.node !== undefined 
		&& selectors.node.name !== undefined
		&& selectors.node.name == 'pwm.all') {
		return nodes
	}
	if (selectors.node !== undefined && selectors.node.name !== undefined) {
		return nodes.filter((node) => { return node._p.metadata.name == selectors.node.name })
	}
	return nodes
}

module.exports.gpuSelector = (selectors, nodes) => {
	if (selectors == null || selectors == undefined) {
		return nodes
	}
	if (nodes.length == 0) {
		return nodes
	}
	if (selectors.gpu !== undefined 
		&& selectors.gpu.product_name !== undefined
		&& selectors.gpu.product_name == 'pwm.all') {
		return nodes
	}
	if (selectors.gpu !== undefined && selectors.gpu.product_name !== undefined) {
		return nodes.filter((node) => { 
			return (node._p.properties.gpu.filter((nodeGpu) => {
				return nodeGpu.product_name == selectors.gpu.product_name
			})).length > 0 ? true : false
		})
	}
	return nodes
}

module.exports.cpuSelector = (selectors, nodes) => {
	if (selectors == null || selectors == undefined) {
		return nodes
	}
	if (nodes.length == 0) {
		return nodes
	}
	if (selectors.cpu !== undefined 
		&& selectors.cpu.product_name !== undefined
		&& selectors.cpu.product_name == 'pwm.all') {
		return nodes
	}
	if (selectors.cpu !== undefined && selectors.cpu.product_name !== undefined) {
		return nodes.filter((node) => { 
			return (node._p.properties.cpu.filter((nodeCpu) => {
				return nodeCpu.product_name == selectors.cpu.product_name
			})).length > 0 ? true : false
		})
	}
	return nodes
}

module.exports.filterGpuNumber = (config, nodes) => {
	nodes.forEach

	if (selectors.gpu !== undefined && selectors.gpu.product_name !== undefined) {
		return nodes.filter((node) => { 
			return (node._p.properties.gpu.filter((nodeGpu) => {
				return nodeGpu.product_name == selectors.gpu.product_name
			})).length > 0 ? true : false
		})
	}
	return nodes
}

module.exports.wantsCpu = (selectors) => {
	if (selectors !== undefined 
		&& selectors.cpu !== undefined 
		&& selectors.cpu.product_name !== undefined) {
		return true
	}
	return false
}

module.exports.wantsGpu = (selectors) => {
	if (selectors !== undefined
		&& selectors.gpu !== undefined 
		&& selectors.gpu.product_name !== undefined) {
		return true
	}
	return false
}

module.exports.filterNodesByAllow = (nodes, allowType) => {
	return nodes.filter((node) => { 
		return node._p.spec.allow.includes(allowType)
	})
}

module.exports.getRequiredCpu = (selectors) => {
	if (selectors !== undefined && selectors.cpu !== undefined) {

		if (selectors.cpu.count !== undefined) {
			if (selectors.cpu.product_name !== undefined) {
				return {count: selectors.cpu.count, product_name: selectors.cpu.product_name}
			} else {
				return {count: selectors.cpu.count, product_name: 'pwm.all'}	
			}
		} else {
			if (selectors.cpu.product_name !== undefined) {
				return {count: 1, product_name: selectors.cpu.product_name}
			} else {
				return {count: 1, product_name: 'pwm.all'}	
			}
		}
	} else {
		return {count: 0, product_name: 'pwm.zero'}
	}
}

module.exports.getRequiredGpu = (selectors) => {
	if (selectors !== undefined && selectors.gpu !== undefined) {
		if (selectors.gpu.count !== undefined) {
			if (selectors.gpu.product_name !== undefined) {
				return {count: selectors.gpu.count, product_name: selectors.gpu.product_name}
			} else {
				return {count: selectors.gpu.count, product_name: 'pwm.all'}	
			}
		} else {
			if (selectors.gpu.product_name !== undefined) {
				return {count: 1, product_name: selectors.gpu.product_name}
			} else {
				return {count: 1, product_name: 'pwm.all'}	
			}
		}
	} else {
		return {count: 0, product_name: 'pwm.zero'}
	}
}

module.exports.findAvailableNode = (nodes, cpu, gpu, alreadyAssignedCpu, alreadyAssignedGpu) => {
	let _nodes = []
	nodes.forEach((node) => {
		alreadyAssignedCpu.forEach()

	})
	return _nodes
}

module.exports.gpuForWorkload = (agpu, args) => {
	let productAvailableGpu = []
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (args.spec.selectors !== undefined && args.spec.selectors.gpu !== undefined) {
				if (gpu.product_name == args.spec.selectors.gpu.product_name) {
					productAvailableGpu.push(gpu)
				} 
			} else {
				productAvailableGpu.push(gpu)
			}
		})
	}
	return productAvailableGpu
}

module.exports.gpuMemoryStatus = (agpu) => {
	let freeAvailableGpu = []
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (gpu.fb_memory_usage == '0 MiB' ) {
				freeAvailableGpu.push(gpu)
			} 
		})
	}
	return freeAvailableGpu
}

module.exports.gpuProcessStatus = (_agpu, alreadyAssignedGpu) => {
	let freeAvailableGpu = []
	let agpu = _agpu.filter((gpu) => {
		return !alreadyAssignedGpu.includes(gpu.uuid)
	})
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (gpu.processes !== undefined) {
				if (typeof gpu.processes == 'string') {
					freeAvailableGpu.push(gpu)
				} else if (gpu.processes.process_info !== undefined) {
					let available = true
					gpu.processes.process_info.forEach((gpuProc) => {
						if (gpuProc.type == 'C') {
							available = false
						}
					})
					if (available) {
						freeAvailableGpu.push(gpu)
					}
				}
			} 
		})
	}
	return freeAvailableGpu
}

module.exports.gpuNumberStatus = (agpu, args, alreadyAssignedGpu) => {
	let gpuCount = 1
	if (args.spec.selectors !== undefined 
		&& args.spec.selectors.gpu !== undefined
		&& args.spec.selectors.gpu.count != undefined) {
		gpuCount = args.spec.selectors.gpu.count
	}
	let freeAvailableGpu = agpu.filter((gpu) => {
		return !alreadyAssignedGpu.includes(gpu.uuid)
	})
	if (freeAvailableGpu.length >= gpuCount) {
		return freeAvailableGpu.filter((fAG, idx) => idx < gpuCount)	
	} else {
		return []
	}
}

module.exports.cpuNumberStatus = (acpu, args, alreadyAssignedCpu) => {
	let cpuCount = 1
	if (args.spec.selectors !== undefined 
		&& args.spec.selectors.cpu !== undefined
		&& args.spec.selectors.cpu.count != undefined) {
		cpuCount = args.spec.selectors.cpu.count
	}
	let freeAvailableCpu = acpu.filter((cpu) => {
		return !alreadyAssignedCpu.includes(cpu.uuid)
	})
	if (freeAvailableCpu.length >= cpuCount) {
		return freeAvailableCpu.filter((fAG, idx) => idx < cpuCount)	
	} else {
		return []
	}
}

module.exports.volumeRequirement = (agpu, volumes, args) => {
	let freeAvailableGpu = []
	let matchedLocalNodes = []
	let matchedNfsNodes = []
	if (args._p.spec.volumes !== undefined && args._p.spec.volumes.length > 0) {
		args._p.spec.volumes.forEach((requiredVolume) => {
			volumes.forEach((availableVolume) => {
				if (availableVolume._p.metadata.name == requiredVolume.name) {
					if (availableVolume._p.spec.mount.local !== undefined) {						
						matchedLocalNodes.push(availableVolume)
					} else if (availableVolume._p.spec.mount.nfs !== undefined) {						
						matchedNfsNodes.push(availableVolume)
					}
				} 
			})
		})
		if (agpu.length !== 0) {
			agpu.forEach((gpu) => {
				matchedLocalNodes.forEach((localNode) => {
					if (gpu.node == localNode._p.spec.mount.local.node) {
						if (localNode._p.spec.accessModes == 'ReadWriteMany' || localNode._p.bound.value == false) {
							freeAvailableGpu.push(gpu)	
						}
					}
				})
			})
		}
		return {agpu: freeAvailableGpu, volumes: matchedLocalNodes}
	} else {
		return {agpu: agpu, volumes: []}
	}
}

module.exports.filterNodeSelector = (workload, nodes) => {
	if (workload._p.spec.selectors.node == undefined) {
		return nodes
	}
	let requiredNode = workload._p.spec.selectors.node.name

	return nodes.filter((node) => {return node._p.metadata.name == requiredNode})
}

module.exports.filterCpuSelector = (workload, nodes) => {
	if (workload._p.spec.selectors.cpu == undefined) {
		return nodes
	}
	let requiredCpu = workload._p.spec.selectors.cpu.product_name
	return nodes.filter((node) => {
		let count = node._p.properties.cpu.filter((cpu) => {return cpu.product_name == requiredCpu})
		if (count.length > 0) {
			return true
		} else {
			return false
		}
	})
}

module.exports.filterCpuNumber = (workload, nodes) => {
	if (workload._p.spec.selectors === undefined) {
		return
	}
	let requiredCpu = (workload._p.spec.selectors.cpu !== undefined 
		&& workload._p.spec.selectors.cpu.count) ? workload._p.spec.selectors.cpu.count : 1
	let requiredConfigCpu = (workload._p.spec.config !== undefined 
		&& workload._p.spec.config.cpu) ? workload._p.spec.config.cpu : 1
	let cpuNumReq = requiredCpu
	let cpuNumConfig = requiredConfigCpu
	if (cpuNumConfig > cpuNumReq) {
		console.log('Return config', cpuNumConfig)
		return [cpuNumConfig <= nodes.length, cpuNumConfig]	
	} else {
		console.log('Return req', cpuNumReq)
		return [cpuNumReq <= nodes.length, cpuNumReq]	
	}
}