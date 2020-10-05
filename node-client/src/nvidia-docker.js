'use strict'

let Pipe = require('Piperunner').Pipe
let shell = require('shelljs')
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

async function pull (pipe, job) {
	let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
	// TODO: await and cb... wrong
	let pullRes = await docker.pull(image, async function (err, stream) {
		if (err) {
			pipe.data.pullError = true
			pipe.data.pullErrorSpec = err
			pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res))
			})
			pipe.data.pulled = true
			pipe.data.pullResult = result
			pipe.next()
		}
	})
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
	if (process.env.mode == 'dummy') {
		output = shell.exec(`docker run -d ${image}`)
	} else {
		output = shell.exec(`docker run --gpus '"device=${job.gpu.minor_number}"' -d ${image}`)
	}
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

module.exports.launch = (body, cb) => {
	console.log('A')
	let pipe = new Pipe()
	pipe.step('pull', (pipe, job) => {
		pull(pipe, job)
	})
	pipe.step('create', (pipe, job) => {
		console.log('C')
		create(pipe, job)
	})
	pipe.step('start', (pipe, job) => {
		console.log('D')
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