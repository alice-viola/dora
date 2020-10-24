'use strict'

let Pipe = require('piperunner').Pipe
let Runner = require('piperunner').Runner
let shell = require('shelljs')
let async = require('async')
let shellescape = require('shell-escape')
let randomstring = require('randomstring')
let fs = require('fs')
let Docker = require('dockerode')

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: '/var/run/docker.sock'})

let Pulls = {}
let Errors = {}

async function getContainerBatch (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
				console.log('FUCK ERROR', err)
				pipe.data[job.scheduler.container.name] = {
					name: job.scheduler.container.name,
					inspect: 'error',
					info: data,
					error: Errors[job.scheduler.container.name]
				}
		
			} else {
				pipe.data[job.scheduler.container.name] = {
					name: job.scheduler.container.name,
					inspect: 'done',
					info: data
				}
			}
			pipe.next()			
		})
	} else {
		pipe.data[job.scheduler.container.name] = {
			name: job.scheduler.container.name,
			inspect: 'notpresent',
		}
		pipe.next()
	}
}

async function pull (job) {
	if (Pulls[job.scheduler.container.pullUid] == undefined) {
		console.log('creating pull for', job.scheduler.request.Image)
		Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'start'}
	}
	docker.pull(job.scheduler.request.Image, async function (err, stream) {
		if (err) {
			console.log('pull err', err)
			Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'error', data: err}
			//pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	err ? reject(err) : resolve(res)
			  })

			})
			console.log('END PULLING')
			Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'done', data: result}
			//pipe.end()
		}
	})
}

async function runContainer (pipe, job) {
	let formattedWorkload = job.scheduler.request
	docker.run(formattedWorkload.Image, [formattedWorkload.Cmd], null, formattedWorkload.createOptions, formattedWorkload.startOptions).then(function(data) {
	  	var output = data[0]
	  	var container = data[1]
		pipe.data.started = output.StatusCode == 0 ? true : false
		pipe.data.container.id = data[1]
		pipe.data.stdout = output 
	  
	}).catch(function(err) {
	  	console.log('Err creating', err)
		pipe.data.started = false
		pipe.data.stderr = err 
	})
}

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

async function createContainer (pipe, job) {
	let formattedWorkload = job.scheduler.request
	docker.createContainer(formattedWorkload.createOptions).then(function(container) {
  		container.start({}, function(err, data) {
			pipe.data.started = err == null ? true : false
			if (pipe.data.container == undefined) {
				pipe.data.container = {}
			}
			pipe.data.container.id = container.id
			pipe.next()
  		})	  
	}).catch(function(err) {
	  	console.log('Err creating', err)
	  	Errors[formattedWorkload.createOptions.name] = err 
		pipe.data.started = false
		pipe.data.stderr = err 
		pipe.end()
	})
}

async function createVolumes (pipe, job) {
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
			}).catch(function(err) {
				console.log(err)
			  	cb(true)
			})
		})
	})
	volumesToCreate.forEach((normalVol) => {
		volQueue.push((cb) => {
			docker.createVolume(normalVol.vol).then(function(data) {
				cb(null)
			}).catch(function(err) {
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

async function stop (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		try {
			container.stop(function (err) {
				if (err) {
					pipe.data.stopError = true
					pipe.data.stopErrorSpec = err
					pipe.next()
				} else {
					pipe.data.stop = true
					pipe.next()
				}
			})
		} catch (err) {}
	}
}

async function deleteContainer (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		try {
			container.remove(function (err, data) {
				if (err) {
			  		pipe.data.remove = 'error'
			  		pipe.data.info = data
			  		console.log(err)
			  		pipe.next()				
				} else {
					pipe.data.remove = 'done'
			  		pipe.data.info = data
			  		pipe.next()			
				}
			})		
		} catch (err) {}
	} else {
		pipe.data.remove = 'notpresent'
		pipe.end()
	}
}

module.exports.pull = (body, cb) => {
	body.forEach((workload) => {
		pull(workload)
	})
	cb()
}

module.exports.pullstatus = (body, cb) => {
	let results = {}
	body.forEach((workload) => {
		results[workload.metadata.name] = {}
		results[workload.metadata.name] = Pulls[workload.scheduler.container.pullUid]
		results[workload.metadata.name].name = workload.metadata.name
	})
	cb(results)
}

module.exports.workloadcreate = (body, cb) => {
	let pipe = new Pipe()

	pipe.step('stopcontainer', (pipe, job) => {
		stop(pipe, job)
	})
	pipe.step('deletecontainer', (pipe, job) => {
		deleteContainer(pipe, job)
	})
	pipe.step('createVolumes', (pipe, job) => {
		createVolumes(pipe, job)
	})
	pipe.step('start', (pipe, job) => {
		createContainer(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

module.exports.workloadstatus = (body, cb) => {
	let pipe = new Pipe()
	pipe.data = {}
	pipe.step('getcontainer', (pipe, job) => {
		getContainerBatch(pipe, job)
	})
	let runner = new Runner(body, pipe, () => {
		cb(pipe.data)
	})
}

module.exports.workloaddelete = (body, cb) => {
	let pipe = new Pipe()
	pipe.step('stopcontainer', (pipe, job) => {
		stop(pipe, job)
	})
	pipe.step('deletecontainer', (pipe, job) => {
		deleteContainer(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}