'use strict'

const GE = require('../../events/global')

module.exports.filterNodeByUser = (nodes, user) => {
	let validNodes = []
	let userGroups = user.spec.groups.filter((group) => { 
		return (group.policy.Node !== undefined && group.policy.Node.includes('use'))
	})
	
	userGroups.forEach((userGroup) => {
		let groupName = userGroup.name
		nodes.forEach((node) => {
			if (node._p.metadata.group == groupName) {
				validNodes.push(node)
			}
		})
	})
	return validNodes
}

module.exports.filterStorageByUser = (storages, user) => {
	let validStorage = []
	let userGroups = user.spec.groups.filter((group) => { 
		return (group.policy.Storage !== undefined && group.policy.Storage.includes('use'))
	})
	
	userGroups.forEach((userGroup) => {
		let groupName = userGroup.name
		storages.forEach((storage) => {
			if (storage._p.metadata.group == groupName) {
				validStorage.push(storage)
			}
		})
	})
	return validStorage
}

module.exports.filterNodeStatus = (nodes) => {
	return nodes.filter((node) => { return node._p.currentStatus == GE.NODE.READY })
}

module.exports.nodeSelector = (selectors, nodes) => {
	if (selectors == null || selectors == undefined) {
		return nodes
	}
	if (nodes.length == 0) {
		return nodes
	}
	if (selectors.node !== undefined 
		&& selectors.node.name !== undefined
		&& selectors.node.name == GE.LABEL.PWM_ALL) {
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
		&& selectors.gpu.product_name == GE.LABEL.PWM_ALL) {
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
		&& selectors.cpu.product_name == GE.LABEL.PWM_ALL) {
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
				return {count: selectors.cpu.count, product_name: GE.LABEL.PWM_ALL}	
			}
		} else {
			if (selectors.cpu.product_name !== undefined) {
				return {count: 1, product_name: selectors.cpu.product_name}
			} else {
				return {count: 1, product_name: GE.LABEL.PWM_ALL}	
			}
		}
	} else {
		return {count: 0, product_name: GE.LABEL.PWM_ZERO}
	}
}

module.exports.getRequiredGpu = (selectors) => {
	if (selectors !== undefined && selectors.gpu !== undefined) {
		if (selectors.gpu.count !== undefined) {
			if (selectors.gpu.product_name !== undefined) {
				return {count: selectors.gpu.count, product_name: selectors.gpu.product_name}
			} else {
				return {count: selectors.gpu.count, product_name: GE.LABEL.PWM_ALL}	
			}
		} else {
			if (selectors.gpu.product_name !== undefined) {
				return {count: 1, product_name: selectors.gpu.product_name}
			} else {
				return {count: 1, product_name: GE.LABEL.PWM_ALL}	
			}
		}
	} else {
		return {count: 0, product_name: GE.LABEL.PWM_ZERO}
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
						if (gpuProc.type == GE.DEFAULT.GPU_COMPUTE_TYPE) {
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

module.exports.volumeData = (volume, storages, nodes, target) => {
	let volumeDataToReturn = {
		name: 'pwm.' + volume._p.metadata.group + '.' + volume._p.metadata.name,
		errors: [],
		kind: null,
		storage: null,
		vol: volume,
		target: target
	}
	let volumeSpec = volume._p.spec
	let selectedStorage = null
	// Find the storage
	storages.some((storage) => {
		if (storage._p.metadata.name == volumeSpec.storage) {
			selectedStorage = storage
			return true
		}
	}) 
	if (selectedStorage == null) {
		volumeDataToReturn.errors.push('NO_STORAGE_MATCH')
		return volumeDataToReturn
	}
	// Find node storage
	let kindOfStorage = selectedStorage._p.spec.kind
	let nodeName = null
	let nfsServerAddress = null
	let nfsServerRootPath = null
	if (kindOfStorage != 'local' && kindOfStorage != 'nfs') {
		volumeDataToReturn.errors.push('NO_STORAGE_TYPE_MATCH')
		return volumeDataToReturn
	} 
	volumeDataToReturn.kind = kindOfStorage
	volumeDataToReturn.storage = selectedStorage
	return volumeDataToReturn
}

module.exports.formatWorkload = (body) => {
	try {
		let cpuSetsForWorkload = (kind, workload) => {
			let cpusSets = []
			switch (kind) {
				case 'cpu':
					workload.scheduler.cpu.forEach((cpu) => {
						let splittedUuid = cpu.uuid.split(' ')
						cpusSets.push(parseInt(splittedUuid[splittedUuid.length - 1]))
					})
					break
				
			}
			return cpusSets.join()
		}
		
		let cpusForWorkload = (kind, workload) => {
			let nanoCpus = 0
			switch (kind) {
				case 'gpu':
					nanoCpus = 1000000000 * (workload.scheduler.nodeProperties.cpu.length) * (workload.scheduler.gpu.length / workload.scheduler.nodeProperties.gpu.length)
					break
				case 'cpu':
					nanoCpus = 1000000000 * (workload.scheduler.nodeProperties.cpu.length) * (workload.scheduler.cpu.length / workload.scheduler.nodeProperties.cpu.length)
					break
			}
			return parseInt(nanoCpus.toFixed())
		}
		
		let memSetsForWorkload = (kind, workload) => {
			let totalMemory = workload.scheduler.nodeProperties.sys.mem.total
			let assignedMemory  = 0
			switch (kind) {
				case 'cpu':
					assignedMemory = ( (totalMemory / workload.scheduler.nodeProperties.cpu.length) * workload.scheduler.cpu.length).toFixed(0)
					break
				
				case 'gpu':
					assignedMemory = ( (totalMemory / workload.scheduler.nodeProperties.gpu.length) * workload.scheduler.gpu.length).toFixed(0)
					break
			}
			return parseInt(assignedMemory)
		}
	
		let workload = {}
		workload.Image = body.spec.image.registry == undefined ? body.spec.image.image : body.spec.image.registry + '/' + body.spec.image.image
		workload.Name = body.scheduler.container.name
		workload.createOptions = { 
			AttachStdout: false,
			Tty: true,
			name: body.scheduler.container.name,
			Image: body.spec.image.registry == undefined ? body.spec.image.image : body.spec.image.registry + '/' + body.spec.image.image,
			OpenStdin: false,
			HostConfig: {AutoRemove: true, DeviceRequests: [], Mounts: [], NetworkMode: body.metadata.group, Labels: {}},
		}
	
		// Set configs
		if (body.spec.config !== undefined && body.spec.config.cmd !== undefined) {
			workload.createOptions.Cmd = body.spec.config.cmd.split(/\s+/)
		}
		if (body.spec.config !== undefined) {
			Object.keys(body.spec.config).forEach((configKey) => {
				if (configKey !== 'cmd' && (typeof body.spec.config[configKey] == 'object' || typeof body.spec.config[configKey] == 'array' )) {
					let capConfigKey = configKey.replace(/\b\w/, v => v.toUpperCase())
					let configValue = body.spec.config[configKey]
					body.spec.config[configKey].forEach((value) => {
						if (workload.createOptions[capConfigKey] == undefined) {
							if (typeof value == 'string') {
								workload.createOptions[capConfigKey] = []
							} else {
								workload.createOptions[capConfigKey] = {}
							}
						}
						if (typeof value == 'string') {
							workload.createOptions[capConfigKey].push(value)
						} else {
							workload.createOptions[capConfigKey][value.name] = value.value
						}
					})
					
				}
			})
		}
		// Check if wants GPU
		if (body.scheduler.gpu != undefined) {
			workload.createOptions.HostConfig.DeviceRequests = [{
			    Driver: '',
			    Count: 0,
			    DeviceIDs: [],
			    Capabilities: [
			        [
			            'gpu'
			        ]
			    ],
			    Options: {}
			}]
			body.scheduler.gpu.forEach((gpu) => {
				workload.createOptions.HostConfig.DeviceRequests[0].DeviceIDs.push(gpu.minor_number)
			})
			workload.createOptions.HostConfig.NanoCpus = cpusForWorkload('gpu', body)
			workload.createOptions.HostConfig.Memory = body.spec.config.memory == undefined ? memSetsForWorkload('gpu', body) : body.spec.config.memory * 1073741824
		} else {
			if (body.scheduler.cpu.length !== 0 && body.scheduler.cpu[0].exclusive !== false) {
				workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('cpu', body)	
			} else {
				workload.createOptions.HostConfig.NanoCpus = cpusForWorkload('cpu', body)
			}
			workload.createOptions.HostConfig.Memory = body.spec.config.memory == undefined ? memSetsForWorkload('cpu', body) : body.spec.config.memory * 1073741824
		}
	
		// Check if wants volumes 
		if (body.scheduler.volume !== undefined) {
			body.scheduler.volume.forEach((volume) => {
				workload.createOptions.HostConfig.Mounts.push({
					Type: 'volume',
					Source: volume.name,
					Target: volume.target[0] !== '/' ? '/' + volume.target : volume.target,
					ReadOnly: volume.vol._p.spec.policy == 'ReadOnly' ? true : false
				})
			}) 
		}
	
		// Check if wants network
		if (body.spec.network !== undefined) {
			let network = body.spec.network
			//if (network.name.toLowerCase() == 'none')
			workload.createOptions.HostConfig.PortBindings = {}
			workload.createOptions.HostConfig.NetworkMode = network.name
			network.ports.forEach((onePort) => {
				console.log(onePort.port + '/' + onePort.protocol)
				workload.createOptions.HostConfig.PortBindings[onePort.port + '/' + onePort.protocol] = [{
					HostIp: onePort.hostPort == undefined ? '' : '0.0.0.0', 
					HostPort: onePort.hostPort !== undefined ? onePort.hostPort.toString() : ''}]
			}) 
		}
		return workload
	} catch (err) {
		console.log(err)
		return null
	}
}