'use strict'

let async = require('async')

let randomstring = require('randomstring')
let fs = require('fs')
let Docker = require('dockerode')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)
if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})

let driverFn = {}

let STATUS = require('./global.js')

function createBusyboxContainer (data, cb) {
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
	  return container.remove()
	}).then(function(data) {
	  cb(null)
	}).catch(function(err) {
	  console.log('errr', err)
	  cb(true)
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

function createBusyboxCopyGetContainer (data, cb) {
	let busyboxName = randomstring.generate(24).toLowerCase()
	docker.run('busybox', [], null, {
		AttachStdout: false,
		Tty: true,
		name: busyboxName,
		Image: 'busybox',
		OpenStdin: false,
		AutoRemove: true,
		Cmd: ['/bin/mkdir', '/home/pwm'],
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

function createBusyboxListVolumeContainer (data, cb) {
	let busyboxName = randomstring.generate(24).toLowerCase()
	docker.run('busybox', [`/bin/ls /mnt/${data.pathToInspect}`], null, {
		AttachStdout: true,
		Tty: true,
		name: busyboxName,
		Image: 'busybox',
		OpenStdin: false,
		AutoRemove: true,
		Cmd: ['/bin/ls', `/mnt/${data.pathToInspect}`],
		HostConfig: {DeviceRequests: [], Mounts: [{
			Type: 'volume',
			Source: data.volumeName,
			Target: '/mnt',
			ReadOnly: true
		}]}
	}, null).then(function(_data) {
	  var output = _data[0]
	  var container = _data[1]
	  cb (output)
	}).then(function(data) {}).catch(function(err) {
	  console.log('errr', err)
	  cb(true)
	})
}


driverFn.getContainer = async (pipe, job) => {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
				pipe.data.containerStatus = null
			} else {
				pipe.data.containerId = data.Id
				pipe.data.containerStatus = data.State.Status.toUpperCase()
			}
			pipe.next()			
		})
	} else {
		pipe.data.containerStatus = null
	}
}

driverFn.pull = async (pipe, job) => {
	if (job.scheduler.container.pullUid == undefined) {
		job.scheduler.container.pullUid = {date: new Date(), status: 'start'}
	}
	docker.pull(job.scheduler.request.Image, async function (err, stream) {
		if (err) {
			job.scheduler.container.pullUid = {date: new Date(), status: 'error', data: err}
			pipe.data.status = STATUS.ERROR_PULL
			pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	err ? reject(err) : resolve(res)
			  })
			})
			job.scheduler.container.pullUid = {date: new Date(), status: 'done', data: result}
			pipe.data.status = STATUS.END_PULL
			pipe.next()
		}
	})
}

driverFn.createContainer = async (pipe, job) => {
	let formattedWorkload = job.scheduler.request
	docker.createContainer(formattedWorkload.createOptions).then(async function(container) {
  		container.start({}, async function(err, data) {
			pipe.data.started = err == null ? true : false
			if (pipe.data.container == undefined) {
				pipe.data.container = {}
			}
			pipe.data.container.id = container.id
			pipe.data.status = STATUS.RUNNING
			pipe.next()
  		})	  
	}).catch(async function(err) {
	  	console.log('Err creating', err)
	  	pipe.data.status = STATUS.ERROR_CREATING_CONTAINER
		pipe.data.started = false
		pipe.data.stderr = err 
		pipe.end()
	})
}

driverFn.createNetwork = async (pipe, job) => {
	let formattedWorkload = job.scheduler.request
	console.log(formattedWorkload.createOptions.HostConfig.PortBindings)
	docker.listNetworks().then(async function(networks) {
		if (networks.map((net) => { return net.Name } ).includes(formattedWorkload.createOptions.HostConfig.NetworkMode)) {
			pipe.next()
		} else {
			docker.createNetwork({Name: formattedWorkload.createOptions.HostConfig.NetworkMode, CheckDuplicate: true}).then(async function(container) {
				pipe.next() 
			}).catch(async function(err) {
			  	console.log('Err creating network', err)
			  	pipe.data.status = STATUS.ERROR_CREATING_NETWORK
				pipe.end()
			})
		}
	})
}

driverFn.createVolumes = (pipe, job) => {
	let formattedWorkload = job.scheduler.request
	let volumesToCreate = []
	let volumesRootsToCreate = []
	job.scheduler.volume.forEach ((vol) => {
		let data = {}
		let _vol = {}
		let _volRoot = null
		if (vol.kind == 'nfs') {
			data = {
				rootName: vol.storage._p.metadata.name + '-root',
				kind: vol.kind,
				name: vol.name,
				group: vol.vol._p.metadata.group[0] == '/' ? vol.vol._p.metadata.group.replace('/', '') : vol.vol._p.metadata.group,
				server: vol.storage._p.spec.nfs.server,
				rootPath: vol.storage._p.spec.nfs.path[0] == '/' ? vol.storage._p.spec.nfs.path.replace('/', '') : vol.storage._p.spec.nfs.path,
				subPath: vol.vol._p.spec.subPath[0] == '/' ? vol.vol._p.spec.subPath.replace('/', '') : vol.vol._p.spec.subPath,
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
			volumesRootsToCreate.push({vol: _volRoot, data: data})
			volumesToCreate.push({vol: _vol, data: data})
		} else {
			_vol = {
				Driver: 'local',
				Name: vol.name
			}
			volumesToCreate.push({vol: _vol})
		}
	})
	let rootQueue = []
	let volQueue = []
	volumesRootsToCreate.forEach((rootVol) => {
		rootQueue.push((cb) => {
			docker.createVolume(rootVol.vol).then(function(data) {
				createBusyboxContainer(rootVol.data, (res) => {
					cb(res)
				})				
			}).catch(async function(err) {
				
				pipe.data.status = STATUS.ERROR_CREATING_VOLUMES
				pipe.end()
			  	cb(true)
			})
		})
	})
	volumesToCreate.forEach((normalVol) => {
		volQueue.push((cb) => {
			docker.createVolume(normalVol.vol).then(function(data) {
				cb(null)
			}).catch(async function(err) {
				pipe.data.status = STATUS.ERROR_CREATING_VOLUMES
				pipe.end()
			  	cb(true)
			})
		})
	})

	async.series(rootQueue, (err, results) => {
		async.parallel(volQueue, (err, results) => {
			pipe.next()		
		})
	})
}

driverFn.stop = async (pipe, job) => {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		try {
			container.stop(async function (err) {
				if (err) {
					pipe.data.stopError = true
					pipe.data.stopErrorSpec = err
				} else {
					pipe.data.stop = true
				}
				pipe.next()
			})
		} catch (err) {
			pipe.next()
		}
	} else {
		pipe.next()
	}	
}

driverFn.preStop = async (pipe, job) => {
	try {
		let container = docker.getContainer(job.scheduler.container.name)
		if (container) {
			try {
				container.stop(async function (err) {
					if (err) {
						pipe.data.stopError = true
						pipe.data.stopErrorSpec = err
					} else {
						pipe.data.stop = true
					}
					pipe.next()
				})
			} catch (err) {
				pipe.next()
			}
		} else {
			pipe.next()
		}	
	} catch (err) {}
}

driverFn.deleteContainer = async (pipe, job) => {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		try {
			container.remove(async function (err, data) {
				pipe.next()			
			})		
		} catch (err) {
			pipe.next()
		}
	} else {
		pipe.end()
	}
}

driverFn.preDeleteContainer = async (pipe, job) => {
	try {
		let container = docker.getContainer(job.scheduler.container.name)
		if (container) {
			try {
				container.remove(async function (err, data) {
					pipe.next()			
				})		
			} catch (err) {
				pipe.next()
			}
		} else {
			pipe.end()
		}
	} catch (err) {
		pipe.end()
	}
}

driverFn.createVolume = (vol, endCb) => {
	let volumesToCreate = null
	let volumesRootsToCreate = null
	console.log('--->', vol)
	let data = {}
	let _vol = {}
	let _volRoot = null
	if (vol.kind == 'nfs') {
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
		createBusyboxCopyContainer(volumesRootsToCreate.data, (responseContainer) => {
			docker.createVolume(volumesToCreate.vol).then(async function(data) {
	  			let responseArchieve = await responseContainer.putArchive(vol.archive, {
	  				path: `/mnt/${volumesRootsToCreate.data.group}/${volumesRootsToCreate.data.subPath}`
	  			})
	  			responseContainer.remove()
				endCb(responseArchieve)	
			})
		})				
	})
}

driverFn.getVolume = (vol, endCb) => {
	let volumesToCreate = null
	let volumesRootsToCreate = null
	console.log('--->', vol)
	let data = {}
	let _vol = {}
	let _volRoot = null
	if (vol.kind == 'nfs') {
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
		createBusyboxCopyGetContainer(volumesRootsToCreate.data, (responseContainer) => {
			docker.createVolume(volumesToCreate.vol).then(async function(data) {
	  			responseContainer.getArchive({
	  				path: `/mnt/${volumesRootsToCreate.data.group}/${volumesRootsToCreate.data.subPath}`
	  			}, (err, responseArchieve) => {
				if (err == null) {
				  endCb(true, responseArchieve)
				} else {
				  endCb(false, null)
				}
				responseContainer.remove()
				})
			})
		})				
	})
}

driverFn.lsVolume = (vol, endCb) => {
	let data = {
		volumeName: vol.name,
		pathToInspect: vol.path,
	}
	createBusyboxListVolumeContainer(data, (responseOutput) => {
		console.log('--->', responseOutput)
		endCb(true, responseOutput)
	})				
}

driverFn.inspect = (containerName, endCb) => {
	let container = docker.getContainer(containerName)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
				endCb(err)
			} else {
				endCb(data.State)
			}
		})
	} else {
		endCb(null)
	}
}

driverFn.logs = (containerName, endCb) => {
	let container = docker.getContainer(containerName)
	if (container) {
		container.logs({follow: false, stdout: true, stderr: true}, function (err, data) {
			if (err) {
				endCb(err)
			} else {
				endCb(data)
			}
		})
	} else {
		endCb(null)
	}
}

driverFn.top = (containerName, endCb) => {
	let container = docker.getContainer(containerName)
	if (container) {
		container.top(function (err, data) {
			if (err) {
				endCb(err)
			} else {
				endCb(data)
			}
		})
	} else {
		endCb(null)
	}
}

driverFn.createBusyboxContainer = createBusyboxContainer
driverFn.createBusyboxCopyContainer = createBusyboxCopyContainer

module.exports = driverFn