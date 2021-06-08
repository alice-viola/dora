'use strict'

let fs = require('fs')
let async = require('async')
const isValidDomain = require('is-valid-domain')
let randomstring = require('randomstring')
let Docker = require('dockerode')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})

async function createBusyboxContainer (data, cb) {
	try {
		let busyboxName = randomstring.generate(24).toLowerCase()
		let {err, _data} = await docker.run('busybox', [`/bin/mkdir -p /mnt/${data.workspace}/${data.subpath}`], null, {
			AttachStdout: false,
			Tty: true,
			name: busyboxName,
			Image: 'busybox',
			OpenStdin: false,
			AutoRemove: true,
			Cmd: ['/bin/mkdir', '-p', `/mnt/${data.workspace}/${data.subpath}`],
			HostConfig: {DeviceRequests: [], Mounts: [{
				Type: 'volume',
				Source: data.rootName,
				Target: '/mnt',
				ReadOnly: false
			}]}
		}, null)
		return {err: null}
	} catch (err) {
		return {err: err}
	}
}


module.exports.get = async (containerName) => {
	try {
		let containerStatus = {err: null, data: null}

		let container = docker.getContainer(containerName)
		if (container) {
			let err, _container = await container.inspect()

			if (err) {
				containerStatus.err = err
			} else {
				containerStatus.data = _container
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

module.exports.drain = async (containerName) => {
	let container = docker.getContainer(containerName)
	if (container) {
		try {
			console.log('remove', containerName)
			await container.stop()
			await container.remove()	
		} catch (err) {
			console.log(err)
		}
	} 
	return container
}

module.exports.createVolume = async (volume) => {
	let data = {}
	let _vol = {}
	let _volRoot = {}
	console.log('--->', volume, volume.storage)
	volume.resource.subpath = volume.resource.subpath == undefined ? '' : volume.resource.subpath
	switch (volume.storage.kind.toLowerCase()) {
		case 'nfs':
			data = {
				rootName: 'dora.storage.' + volume.storageName + '.root',
				kind: volume.storage.kind.toLowerCase(),
				name: volume.name,
				workspace: volume.workspace == '/' ? volume.workspace.replace('/', '') : volume.workspace,
				server: volume.storage.endpoint,
				rootPath: volume.storage.mountpath[0] == '/' ? volume.storage.mountpath.replace('/', '') : volume.storage.mountpath,
				subpath: volume.resource.name + '/' + (volume.resource.subpath[0] == '/' ? volume.resource.subpath.replace('/', '') : volume.resource.subpath),
				policy: 'rw'
			}
			_vol = {
				Name: volume.name,
				Driver: 'local',
				DriverOpts: {
					type: data.kind,
 					o: `addr=${data.server},${volume.policy}`,
 					device: `:/${data.rootPath}/${data.workspace}/${volume.resource.name}`
				}
			}
			_volRoot = {
				Name: data.rootName,
				Driver: 'local',
				DriverOpts: {
					type: data.kind,
 					o: `addr=${data.server},${data.policy}`,
 					device: `:/${data.rootPath}`
				}
			}
			break
		case 'local':

			break 
	}

	try {
		await docker.createVolume(_volRoot)
		await createBusyboxContainer(data)				
		await docker.createVolume(_vol)
		return {err: null, data: []}
	} catch (err) {
		console.log('VOLUME ERR', err)
		return {err: err, data: []}
	}
}

module.exports.create = async (containerName, container) => {
	try {
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
		if (container.computed.gpus != undefined && container.computed.gpus != null) {
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
		} else {
			console.log('CPUS', container.computed.cpus)
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

		// Check if wants volumes 
		if (container.computed.volumes !== undefined) {
			for (var i = 0; i < container.computed.volumes.length; i += 1) {
				let volume = container.computed.volumes[i]
				//let volExist = await docker.getVolume(volume.name)
				//
				//if (volExist) {
				//	try {
				//		let {err, data} = await volExist.inspect()
				//		if (err) {
				//			volExist = false
				//		} else {
				//			volExist = true
				//		}
				//	} catch (err) {
				//		volExist = false
				//	}
				//} else {
				//	volExist = false
				//}
				//console.log('volExist', volExist)
				//if (volExist != true) {
				await self.createVolume(volume)	
				//}
				let readOnlyPolicyExist = volume.policy == undefined ? false : true
				workload.createOptions.HostConfig.Mounts.push({
					Type: 'volume',
					Source: volume.name,
					Target: volume.target[0] !== '/' ? '/' + volume.target : volume.target,
					ReadOnly: readOnlyPolicyExist ? (volume.policy.toLowerCase() == 'readonly' ? true : false) : false
				})
				console.log('######', workload.createOptions.HostConfig.Mounts)
			
			}
		}


		// Pull the image
		if (container.resource.image.pullPolicy !== undefined) {
			if (container.resource.image.pullPolicy == 'Always') {
				await docker.pull(container.Image)	
			} else if (container.resource.image.pullPolicy == 'IfNotPresent') {
				let imageIsPresent = false
				try {
					let localImage = await docker.getImage(workload.Image)	
					imageIsPresent = true
				} catch (err) {
					imageIsPresent = false
				}
				if (imageIsPresent == false) {
					await docker.pull(workload.Image)
				} 
			}
		} else {
			await docker.pull(workload.Image)	
		}
		
		let _container = await docker.createContainer(workload.createOptions)
  		let {err, data} = await _container.start({})
		console.log(workload, err, data)
		return {err: null}

	} catch (err) {
		console.log(err)
		return {err: err}
	}		
}

var self = module.exports