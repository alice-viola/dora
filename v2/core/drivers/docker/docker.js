'use strict'

let fs = require('fs')
let async = require('async')
const isValidDomain = require('is-valid-domain')
let Docker = require('dockerode')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})

module.exports.get = async (containerName) => {
	try {
		let containerStatus = {err: null, data: null}
		let container = docker.getContainer(containerName)
		if (container) {
			let {err, data} = await container.inspect()
			if (err) {
				containerStatus.err = err
			} else {
				containerStatus.data = data
			}
		} 
		return containerStatus
	} catch (err) {
		return {err: err, data: null}
	}
}

module.exports.getAll = async () => {
	let containers = await docker.listContainers()
	return containers
}


module.exports.create = async (containerName, container) => {

		let cpuSetsForWorkload = (kind, workload) => {
			let cpusSets = []
			let cpusSetsString = ''
			switch (kind) {
				case 'cpu':
					workload.scheduler.cpu.forEach((cpu) => {
						let splittedUuid = cpu.uuid.split(' ')
						cpusSets.push(parseInt(splittedUuid[splittedUuid.length - 1]))
					})
					cpusSetsString = cpusSets.join()
					break

				case 'gpu':
					let numberOfNodeCpus = workload.scheduler.nodeProperties.cpu.length
					let numberOfNodeGpus = workload.scheduler.nodeProperties.gpu.length
					let numberOfCpusPerGpus = parseInt(numberOfNodeCpus / numberOfNodeGpus)
					workload.scheduler.gpu.forEach((gpu) => {
						let minorNumber = gpu.minor_number
						for (var i = minorNumber * numberOfCpusPerGpus; i < (minorNumber * numberOfCpusPerGpus) + numberOfCpusPerGpus; i += 1) {
							cpusSets.push(i)
						}
					})
					cpusSetsString = cpusSets.join()
					break
				
			}
			return cpusSetsString
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
		workload.Image = container.resource.image.image
		workload.Name = containerName
		workload.createOptions = { 
			AttachStdout: false,
			Tty: true,
			name: containerName,
			Image: workload.Image,
			OpenStdin: false,
			Labels: {
					'dora.zone': container.zone,
					'dora.workspace': container.workspace,
					'dora.name': container.name,
					'dora.id': container.id,
					'dora.workload_id': container.workload_id,
					'dora.node_id': container.node_id,
			},
			HostConfig: {
				AutoRemove: true, 
				DeviceRequests: [], 
				Mounts: [], 
				/*NetworkMode: body.metadata.group,*/ 
				Labels: {}
			},
		}
		if (isValidDomain(containerName) == true) {
			workload.createOptions.Hostname = containerName
		}
	
		// Set configs		
		if (container.resource.config !== undefined && container.resource.config.cmd !== undefined && typeof container.resource.config.cmd == 'string') {
			workload.createOptions.Cmd = container.resource.config.cmd.split(/\s+/)
		} else if (container.resource.config !== undefined && container.resource.config.cmd !== undefined && (typeof container.resource.config.cmd == 'array' || typeof container.resource.config.cmd == 'object')) {
			workload.createOptions.Cmd = container.resource.config.cmd
		}
		if (container.resource.config !== undefined) {
			Object.keys(container.resource.config).forEach((configKey) => {
				if (configKey !== 'cmd' && (typeof container.resource.config[configKey] == 'object' || typeof container.resource.config[configKey] == 'array' )) {
					let capConfigKey = configKey.replace(/\b\w/, v => v.toUpperCase())
					let configValue = container.resource.config[configKey]
					container.resource.config[configKey].forEach((value) => {
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
		if (container.computed.gpus != undefined) {
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
			container.computed.gpus.forEach((gpu) => {
				workload.createOptions.HostConfig.DeviceRequests[0].DeviceIDs.push(gpu)
			})
			// Old --cpus flag, replaced for --cpus-set
			// workload.createOptions.HostConfig.NanoCpus = cpusForWorkload('gpu', body)
			/////// ###### workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('gpu', body)
			/////// ###### workload.createOptions.HostConfig.Memory = body.spec.config.memory == undefined ? memSetsForWorkload('gpu', body) : body.spec.config.memory * 1073741824
		} else {
			if (container.computed.cpus.length !== 0 /*&& body.scheduler.cpu[0].exclusive !== false*/) {
				//workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('cpu', container.computed.cpus)	
			} /*else {
				workload.createOptions.HostConfig.NanoCpus = cpusForWorkload('cpu', body)
			}*/
			//workload.createOptions.HostConfig.Memory = body.spec.config.memory == undefined ? memSetsForWorkload('cpu', body) : body.spec.config.memory * 1073741824
		}

		// Other options
		if (container.resource.config !== undefined && container.resource.config.shmSize !== undefined) {
			workload.createOptions.HostConfig.ShmSize = parseInt(container.resource.config.shmSize)
		}

		await docker.pull(workload.Image)

		let _container = await docker.createContainer(workload.createOptions)
  		let {err, data} = await _container.start({})
		

		console.log(workload, err, data)
}