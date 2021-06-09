'use strict'

let fs = require('fs')
let async = require('async')
const isValidDomain = require('is-valid-domain')
let randomstring = require('randomstring')
let DockerDb = require('./inmemorydb.js')
let Docker = require('dockerode')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats, docker

try {
	stats = fs.statSync(socket)
	if (!stats.isSocket()) {
	  throw new Error('Docker is not running on this socket:', socket)
	}
	docker = new Docker({socketPath: socket})
} catch (err) {}

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

function createSyncContainer (data, cb) {
	let syncName = data.id || randomstring.generate(24).toLowerCase()
	let createOptions = {
		AttachStdout: false,
		Tty: true,
		name: syncName,
		Image: process.env.DORA_SYNC_IMAGE || 'promfacility/dora.sync:0.7.2',
		OpenStdin: false,
		ExposedPorts: {"3002/tcp": {}},
		HostConfig: {
			AutoRemove: true,
			PortBindings: {"3002/tcp": [{HostIp: "", HostPort: ""}]},
			DeviceRequests: [], Mounts: [{
			Type: 'volume',
			Source: data.name,
			Target: '/usr/src/app/smnt',
			ReadOnly: false
		}]}
	} 
	docker.createContainer(createOptions).then(async function(container) {
  		container.start({}, async function(err, data) {
  			if (err) {
  				cb(true, null)
  			} else {
  				cb (null, container) 
  			}
  		})
  	})
}

function createBusyboxCopyContainer (data, cb) {
	let busyboxName = randomstring.generate(24).toLowerCase()
	docker.run('busybox', [`/bin/mkdir -p /mnt/${data.group}/${data.subPath}`], null, {
		AttachStdout: false,
		Tty: true,
		name: busyboxName,
		Image: 'busybox',
		OpenStdin: false,
		AutoRemove: true,
		Cmd: ['/bin/mkdir', '-p', `/mnt/${data.group}/${data.subPath}`],
		HostConfig: {DeviceRequests: [], Mounts: [{
			Type: 'volume',
			Source: data.rootName,
			Target: '/mnt',
			ReadOnly: false
		}]}
	}, null).then(function(_data) {
	  var output = _data[0]
	  var container = _data[1]
	  cb (container)
	}).then(function(data) {}).catch(function(err) {
	  console.log('errr', err)
	  cb(true)
	})
}


module.exports.getRunningContainerByName = async (name, cb) => {
	let container = docker.getContainer(name)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
				cb(err)
			} else {
				if (data.State.Running == true) {
					cb(null, container)	
				} else {
					cb(err)
				}
			}
		})
	} else {
		cb(false)
	}
}

module.exports.createSyncContainer = async (vol, endCb) => {
	let volumesToCreate = null
	let volumesRootsToCreate = null
	let data = {}
	let _vol = {}
	let _volRoot = null
	if (vol.kind.toLowerCase() == 'nfs') {
		data = {
			rootName: vol.rootName + '-root',
			kind: vol.kind,
			name: vol.name,
			group: vol.group == '/' ? vol.group.replace('/', '') : vol.group,
			server: vol.server,
			rootPath: vol.rootPath[0] == '/' ? vol.rootPath.replace('/', '') : vol.rootPath,
			subPath: vol.subPath[0] == '/' ? vol.subPath.replace('/', '') : vol.subPath,
			policy: 'rw'
		}
		_vol = {
			Name: vol.name,
			Driver: 'local',
			DriverOpts: {
				type: data.kind,
 				o: `addr=${data.server},${data.policy}`,
 				device: `:/${data.rootPath}/${data.group}/${data.subPath}`
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
		volumesRootsToCreate = {vol: _volRoot, data: data}
		volumesToCreate = {vol: _vol, data: data}
	} else {
		_vol = {
			Driver: 'local',
			Name: vol.name
		}
		volumesToCreate = {vol: _vol}
	}
	docker.createVolume(volumesRootsToCreate.vol).then(function(data) {
		volumesRootsToCreate.data.id = vol.id
		createBusyboxCopyContainer(volumesRootsToCreate.data, (responseMkdirContainer) => {
			docker.createVolume(volumesToCreate.vol).then(async function(data) {
	  			createSyncContainer(volumesRootsToCreate.data, (err, responseContainer) => {
	  				endCb(err, responseContainer)	
	  			})
			})
		})			
	})
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
		let cpuSetsForWorkload = (kind, computed) => {
			let cpusSets = []
			let cpusSetsString = ''
			switch (kind) {
				case 'cpu':
					cpusSetsString = computed.cpus.join()
					break

				case 'gpu':
					let numberOfNodeCpus = computed.nodecpus
					let numberOfNodeGpus = computed.nodegpus
					let numberOfCpusPerGpus = parseInt(numberOfNodeCpus / numberOfNodeGpus)
					computed.gpus.forEach((gpu) => {
						let minorNumber = gpu
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
		
		let memSetsForWorkload = (kind, computed) => {
			let totalMemory = computed.nodememory
			let assignedMemory = 0
			switch (kind) {
				case 'cpu':
					assignedMemory = ( (totalMemory / computed.nodecpus) * computed.cpus.length).toFixed(0)
					break
				
				case 'gpu':
					assignedMemory = ( (totalMemory / computed.nodegpus) * computed.gpus.length).toFixed(0)
					break
			}
			//return 600000

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
		if (isValidDomain(container.name) == true) {
			workload.createOptions.Hostname = container.name.replace(/[^a-z0-9]/g,'')
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
		if (container.computed.gpus != undefined && container.computed.gpus != null && container.computed.gpus.length > 0) {
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
			workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('gpu', container.computed)	
			workload.createOptions.HostConfig.Memory = container.computed.memory == undefined ? memSetsForWorkload('gpu', container.computed) : container.computed.memory * 1073741824
		} else {
			if (isNaN(container.computed.cpus) == true) {
				workload.createOptions.HostConfig.NanoCpus = (container.computed.cpus.split('m')[0] / 1000) * 100000 * 10000 
			} else {
				workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('cpu', container.computed)	
			}
			//if (container.computed.cpus.length !== 0 /*&& body.scheduler.cpu[0].exclusive !== false*/) {
			//	//workload.createOptions.HostConfig.CpusetCpus = cpuSetsForWorkload('cpu', container.computed.cpus)	
			//} /*else {
			//	workload.createOptions.HostConfig.NanoCpus = cpusForWorkload('cpu', body)
			//}*/
			////workload.createOptions.HostConfig.Memory = body.spec.config.memory == undefined ? memSetsForWorkload('cpu', body) : body.spec.config.memory * 1073741824
			workload.createOptions.HostConfig.Memory = container.computed.memory == undefined ? memSetsForWorkload('cpu', container.computed) : container.computed.memory * 1073741824
		}

		// Other options
		if (container.computed.shmSize !== undefined) {
			workload.createOptions.HostConfig.ShmSize = parseInt(container.computed.shmSize)
		}

		// Check if wants volumes 
		if (container.computed.volumes !== undefined) {
			for (var i = 0; i < container.computed.volumes.length; i += 1) {
				let volume = container.computed.volumes[i]
				await self.createVolume(volume)	
				let readOnlyPolicyExist = volume.policy == undefined ? false : true
				workload.createOptions.HostConfig.Mounts.push({
					Type: 'volume',
					Source: volume.name,
					Target: volume.target[0] !== '/' ? '/' + volume.target : volume.target,
					ReadOnly: readOnlyPolicyExist ? (volume.policy.toLowerCase() == 'readonly' ? true : false) : false
				})
			}
		}

		// Pull the image
		let toPull = false
		if (container.resource.image.pullPolicy !== undefined) {
			if (container.resource.image.pullPolicy == 'Always') {
				await docker.pull(container.Image)	
			} else if (container.resource.image.pullPolicy == 'IfNotPresent') {
				let imageIsPresent = false
				try {
					let localImage = await docker.getImage(workload.Image)	
					imageIsPresent = true
					toPull = false
				} catch (err) {
					imageIsPresent = false
					toPull = true
				}
				if (imageIsPresent == false) {
					toPull = true
				} 
			}
		}  
		if (container.resource.image.pullPolicy == undefined || toPull == true) {
			DockerDb.set(containerName, container, 'pulling', null)
			let pullRes = await docker.pull(workload.Image, async function (err, stream) {
				if (err) {
					DockerDb.set(containerName, container, 'pull failed', null)
				} else {
					let result = await new Promise((resolve, reject) => {
					  docker.modem.followProgress(stream, (err, res) => {

					  	err ? reject(err) : resolve(res)
					  })
					}, (pullevent) => {
						console.log(pullevent)
					})
					let _container = await docker.createContainer(workload.createOptions)
  					let {err, data} = await _container.start({})
				}
			})
		} else {
			console.log('CREATING', workload.createOptions)
			let _container = await docker.createContainer(workload.createOptions)
  			console.log('CREATED')
  			let {err, data} = await _container.start({})			
  			console.log('STARTED')
		}

		

		return {err: null}

	} catch (err) {
		DockerDb.set(containerName, container, 'not_created', err)
		console.log(err)
		return {err: err}
	}		
}

var self = module.exports