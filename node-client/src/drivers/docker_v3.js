'use strict'

let Pipe = require('piperunner').Pipe
let Runner = require('piperunner').Runner
let shell = require('shelljs')
let async = require('async')
let shellescape = require('shell-escape')
let randomstring = require('randomstring')
let fs = require('fs')
let level = require('level')
let workloadDb = level('pwmnodedb', { valueEncoding: 'json' })
let Docker = require('dockerode')

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: '/var/run/docker.sock'})

let STATUS = {
	START_PULL: 'PULLING',
	END_PULL: 'END PULL',
	ERROR_PULL: 'ERROR IN PULL',
	CREATING_VOLUMES: 'CREATING VOLUMES',
	ERROR_CREATING_VOLUMES: 'ERROR IN CREATING VOLUMES',
	CREATING_CONTAINER: 'CREATING CONTAINER',
	ERROR_CREATING_CONTAINER: 'ERROR CREATING CONTAINER',
	RUNNING: 'RUNNING',
	ERROR: 'ERROR',
	STOPPING_CONTAINER: 'STOPPING',
	STOPPED_CONTAINER: 'STOPPED BY USER',
	DELETING_CONTAINER: 'DELETING',
	DELETED_CONTAINER: 'DELETED BY USER',
}

async function insertWorkloadInDb (workload) {
	return await workloadDb.put(workload.scheduler.container.name, workload)
}

async function getWorkloadInDb (workload) {
	try {
		return await workloadDb.get(workload.scheduler.container.name)
	} catch (err) {
		return undefined
	}
}

async function deleteWorkloadInDb (workload) {
	return await workloadDb.del(workload.scheduler.container.name)
}

async function updateWorkloadStatus (workload, status, reason) {
	workload.scheduler.pwmnode.status = status
	workload.scheduler.pwmnode.reason = reason
	await insertWorkloadInDb (workload)
}

async function getContainerBatch (pipe, job) {
	let wk = await getWorkloadInDb(job)
	if (wk !== undefined) {
		let container = docker.getContainer(job.scheduler.container.name)
		if (container) {
			container.inspect(function (err, data) {
				if (err) {
					console.log('err', job.scheduler.container.name, data, err)
					pipe.data[job.scheduler.container.name] = wk.scheduler.pwmnode
				} else {
					// info = data
					// data.State
  					// Status: 'running',
  					// Running: true,
  					// Paused: false,
  					// Restarting: false,
  					// OOMKilled: false,
  					// Dead: false,
  					// Pid: 36774,
  					// ExitCode: 0,
  					// Error: '',
  					// StartedAt: '2020-10-24T11:10:06.6474025Z',
  					// FinishedAt: '0001-01-01T00:00:00Z'
					pipe.data[job.scheduler.container.name] = {status: data.State.Status.toUpperCase(), reason: null, id: data.Id}
				}
				pipe.next()			
			})
		} else {
			pipe.data[job.scheduler.container.name] = wk.scheduler.pwmnode
		}
	} else {
		pipe.data[job.scheduler.container.name] = {status: 'UNKNOWN', reason: 'UNKNOWN'}
		pipe.next()		
	}
}

async function pull (pipe, job) {
	if (job.scheduler.container.pullUid == undefined) {
		job.scheduler.container.pullUid = {date: new Date(), status: 'start'}
	}
	await updateWorkloadStatus(job, STATUS.START_PULL)
	docker.pull(job.scheduler.request.Image, async function (err, stream) {
		if (err) {
			job.scheduler.container.pullUid = {date: new Date(), status: 'error', data: err}
			await updateWorkloadStatus(job, STATUS.ERROR_PULL, err)
			pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	err ? reject(err) : resolve(res)
			  })
			})
			job.scheduler.container.pullUid = {date: new Date(), status: 'done', data: result}
			await updateWorkloadStatus(job, STATUS.END_PULL)
			pipe.next()
		}
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
	await updateWorkloadStatus(job, STATUS.CREATING_CONTAINER)
	let formattedWorkload = job.scheduler.request
	docker.createContainer(formattedWorkload.createOptions).then(async function(container) {
  		container.start({}, async function(err, data) {
			pipe.data.started = err == null ? true : false
			if (pipe.data.container == undefined) {
				pipe.data.container = {}
			}
			pipe.data.container.id = container.id
			await updateWorkloadStatus(job, STATUS.RUNNING)
			pipe.next()
  		})	  
	}).catch(async function(err) {
	  	console.log('Err creating', err)
		await updateWorkloadStatus(job, STATUS.ERROR_CREATING_CONTAINER, err)
	  	//Errors[formattedWorkload.createOptions.name] = err 
		pipe.data.started = false
		pipe.data.stderr = err 
		pipe.end()
	})
}

async function createVolumes (pipe, job) {
	await updateWorkloadStatus(job, STATUS.CREATING_VOLUMES)
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
				await updateWorkloadStatus(job, STATUS.ERROR_CREATING_VOLUMES, err)
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
				await updateWorkloadStatus(job, STATUS.ERROR_CREATING_VOLUMES, err)
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

async function stop (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		await updateWorkloadStatus(job, STATUS.STOPPING_CONTAINER)
		try {
			container.stop(async function (err) {
				if (err) {
					pipe.data.stopError = true
					pipe.data.stopErrorSpec = err
				} else {
					pipe.data.stop = true
				}
				await updateWorkloadStatus(job, STATUS.STOPPED_CONTAINER)
				pipe.next()
			})
		} catch (err) {
			pipe.next()
		}
	} else {
		await updateWorkloadStatus(job, STATUS.STOPPED_CONTAINER)	
		pipe.next()
	}	
}

async function preStop (pipe, job) {
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

async function deleteContainer (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.name)
	if (container) {
		try {
			await updateWorkloadStatus(job, STATUS.DELETING_CONTAINER)
			container.remove(async function (err, data) {
				if (err) {
			  		pipe.data.remove = 'error'
			  		pipe.data.info = data
				} else {
					pipe.data.remove = 'done'
			  		pipe.data.info = data
				}
				await updateWorkloadStatus(job, STATUS.DELETED_CONTAINER)
				pipe.next()			
			})		
		} catch (err) {
			pipe.next()
		}
	} else {
		await updateWorkloadStatus(job, STATUS.DELETED_CONTAINER)
		pipe.data.remove = 'notpresent'
		pipe.end()
	}
}

async function preDeleteContainer (pipe, job) {
	try {
		let container = docker.getContainer(job.scheduler.container.name)
		if (container) {
			try {
				//await updateWorkloadStatus(job, STATUS.DELETING_CONTAINER)
				container.remove(async function (err, data) {
					if (err) {
				  		pipe.data.remove = 'error'
				  		pipe.data.info = data
					} else {
						pipe.data.remove = 'done'
				  		pipe.data.info = data
					}
					//await updateWorkloadStatus(job, STATUS.DELETED_CONTAINER)
					pipe.next()			
				})		
			} catch (err) {
				pipe.next()
			}
		} else {
			//await updateWorkloadStatus(job, STATUS.DELETED_CONTAINER)
			pipe.end()
		}
	} catch (err) {}
}

module.exports.create = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		let alreadyPresent = await getWorkloadInDb(body[i])
		if (alreadyPresent == undefined) {
			await insertWorkloadInDb(body[i])	
		} else {
			await deleteWorkloadInDb(body[i])
		}
	}
	let pipe = new Pipe()
	pipe.step('pullnewcontainer', (pipe, job) => {
		pull(pipe, job)
	})
	pipe.step('stopcontainer', (pipe, job) => {
		preStop(pipe, job)
	})
	pipe.step('deletecontainer', (pipe, job) => {
		preDeleteContainer(pipe, job)
	})
	pipe.step('createVolumes', (pipe, job) => {
		createVolumes(pipe, job)
	})
	pipe.step('start', (pipe, job) => {
		createContainer(pipe, job)
	})
	//pipe.step('wait', (pipe, job) => {
	//	setTimeout(() => {
	//		pipe.next()
	//	}, 500)
	//})
	//pipe.setJob(body[i])
	//pipe.run()
	
	let runner = new Runner(body, pipe, () => {})
	cb(true)
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

module.exports.workloaddelete = async (body, cb) => {
	for (var i = 0; i < body.length; i += 1) {
		let alreadyPresent = await getWorkloadInDb(body[i])
		if (alreadyPresent != undefined) {
			await deleteWorkloadInDb(body[i])	
		} 
		console.log('RECEIVED STOP')
		let pipe = new Pipe()
		pipe.step('stopcontainer', (pipe, job) => {
			stop(pipe, job)
		})
		pipe.step('deletecontainer', (pipe, job) => {
			deleteContainer(pipe, job)
		})
		//pipe.step('wait', (pipe, job) => {
		//	setTimeout(() => {
		//		pipe.next()
		//	}, 500)
		//})
		pipe.setJob(body[i])
		pipe.run()
	}
	cb(true)
}