'use strict'

let Pipe = require('Piperunner').Pipe
let shell = require('shelljs')
let shellescape = require('shell-escape')
let fs = require('fs')
let Docker = require('dockerode')
let docker = new Docker({socketPath: '/var/run/docker.sock'})

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Are you sure the docker is running?')
}

function getContainerByName(name) {
    // filter by name
    var opts = {
      "limit": 1,
      "filters": `{"name": ["${name}"]}`
    }

    return new Promise((resolve, reject)=>{
      docker.listContainers(opts, function(err, containers) {
        if(err) {
          reject(err)
        } else{
          resolve(containers && containers[0])
        }
      });
    })
}

async function getContainer (pipe, job) {
	let container = docker.getContainer(job.id)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
		  		pipe.data.inspect = 'error'
		  		pipe.data.info = data
		  		pipe.next()				
			} else {
				pipe.data.inspect = 'done'
		  		pipe.data.info = data
		  		pipe.next()			
			}
		})
		
	} else {
		pipe.data.inspect = 'notpresent'
		pipe.end()
	}
}

let Pulls = {}

async function pull (pipe, job) {
	console.log('Pulling')
	let image = job.registry == undefined ? job.image : job.registry + '/' + job.image

	if (Pulls[job.pullUid] == undefined) { // TODO generate random ID
		console.log('creating pull for', image)
		Pulls[job.pullUid] = {date: new Date(), status: 'start'}
	}
	console.log('--->', Pulls[image])
	docker.pull(image, async function (err, stream) {
		if (err) {
			console.log('pull err', err)
			pipe.data.pulled = false
			pipe.data.pullError = true
			pipe.data.pullError = err
			Pulls[job.pullUid] = {date: new Date(), status: 'error', data: pullError}
			pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	console.log(err, res)
			  	err ? reject(err) : resolve(res)
			  })
			})
			pipe.data.pulled = true
			pipe.data.pullResult = result
			Pulls[job.pullUid] = {date: new Date(), status: 'done', data: result}
			pipe.end()
		}
	})
}

async function remove (pipe, job) {
	shell.exec('docker rm ' + job.name)
	pipe.next()
}

async function create (pipe, job) {
	let previusContainer = await getContainerByName(job.name)
	console.log('PV', previusContainer)
	if (previusContainer) {
		let pC = docker.getContainer(previusContainer.Id)
		pC.remove(function (err, data) {
  			let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
			docker.createContainer({Tty: true, Image: image, name: job.name}, function (err, container) {
				if (err) {
					pipe.data.createError = true
					pipe.data.createErrorSpec = err
					pipe.end()
				} else {
					pipe.data.created = true
					pipe.data.container = container
					pipe.next(container)
				}
			})

		})
	} else {
		console.log('NO PV')
		let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
		docker.createContainer({Tty: true, Image: image, name: job.name}, function (err, container) {
			if (err) {
				pipe.data.createError = true
				pipe.data.createErrorSpec = err
				pipe.end()
			} else {
				pipe.data.created = true
				pipe.data.container = container
				pipe.next(container)
			}
		})
	}
}

async function start (pipe, job, container) {
	// docker run --gpus '"device=0"' -it --rm test_imgs_tf
	console.log('STARTING')
	let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
	let output = ''
	let startMode = (job.config !== undefined && job.config.startMode !== undefined) ? job.config.startMode : '-d'
	let cmd = (job.config !== undefined && job.config.cmd !== undefined) ? job.config.cmd : ''
	let cpus = (job.config !== undefined && job.config.cpus !== undefined) ? job.config.cpus : '1'
	//let memory = (job.config !== undefined && job.config.memory !== undefined) ? job.config.memory : '512m'
	let volume = (job.volume !== undefined) ? job.volume : null
	let shellCommand = ''
	let volumeCommand = ''

	console.log(volumeCommand)
	if (job.gpu == undefined) {
		shellCommand = ['docker', 'run', '--name', job.name, '--cpus=' + cpus]
		if (volume !== null) {
			volume.forEach((vol) => {
				shellCommand.push('--mount')
				shellCommand.push('source=' + vol.name + ',target=' + vol.target)
			})
		}
		shellCommand = shellCommand.concat([startMode, image, cmd])
	} else {
		//shellCommand = ['docker', 'run', '--name', job.name, '--memory=' + memory, '--cpus=' + cpus, '--gpus', '"device=' + job.gpu.minor_number +'"', volumeCommand, startMode, image, cmd]
		shellCommand = ['docker', 'run', '--name', job.name, '--cpus=' + cpus, '--gpus', '"device=' + job.gpu.minor_number +'"']
		if (volume !== null) {
			volume.forEach((vol) => {
				shellCommand.push('--mount')
				shellCommand.push('source=' + vol.name + ',target=' + vol.target)
			})
		}
		shellCommand = shellCommand.concat([startMode, image, cmd])
	}

	console.log('Cmd start:', shellescape(shellCommand))
	output = shell.exec(shellescape(shellCommand))
	console.log('->', output)
	pipe.data.started = true
	pipe.data.container = {}
	pipe.data.container.id = output.trim()
	pipe.next()	

	//docker.run(image, [], process.stdout, {}, {'-d', '--gpus': "'device=" + job.gpu.minor_number + "'"}, function (err, data, container) {
	//	if (err) {
	//		pipe.data.started = false
	//		pipe.data.startError = true
	//		pipe.data.startErrorSpec = err
	//		pipe.end()
	//	} else {
	//		pipe.data.started = true
	//		pipe.data.container = container		
	//		pipe.next()	
	//	}
	//})
	//pipe.data.container.start(function (err) {
	//	if (err) {
	//		pipe.data.startError = true
	//		pipe.data.startErrorSpec = err
	//		pipe.end()
	//	} else {
	//		pipe.data.started = true
	//		pipe.next()
	//	}
	//})
}

//start(null, {
//	image: 'ubuntu',
//	config: {startMode: '-itd', cmd: '/bin/bash'}
//}, null)

async function stop (pipe, job) {
	let container = docker.getContainer(job.id)
	if (container) {
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
	}
}

async function deleteContainer (pipe, job) {
	let container = docker.getContainer(job.id)
	if (container) {
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
	} else {
		pipe.data.remove = 'notpresent'
		pipe.end()
	}
}

module.exports.pull = (body, cb) => {
	console.log('A')
	let pipe = new Pipe()
	pipe.step('pull', (pipe, job) => {
		pull(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

module.exports.pullStatus = (body, cb) => {
	console.log('Available pulls:', Pulls)
	cb(Pulls[body.pullUid])
}

module.exports.launch = (body, cb) => {
	let pipe = new Pipe()

	pipe.step('remove', (pipe, job) => {
		start(pipe, job)
	})
	pipe.step('create', (pipe, job) => {
		create(pipe, job)
	})
	pipe.step('start', (pipe, job) => {
		start(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

module.exports.status = (body, cb) => {
	let pipe = new Pipe()
	pipe.step('getcontainer', (pipe, job) => {
		getContainer(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

module.exports.delete = (body, cb) => {
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

module.exports.createVolume = (body, cb) => {
	let output = shell.exec('docker volume create ' + body.name)
	console.log('--->', output)
	if (output.stderr == '') {
		cb(true)	
	} else {
		cb(false)
	}
}

module.exports.deleteVolume = (body, cb) => {
	let output = shell.exec('docker volume remove ' + body.name)
	console.log('--->', output)
	if (output.stderr == '') {
		cb(true)	
	} else {
		cb(false)
	}
}