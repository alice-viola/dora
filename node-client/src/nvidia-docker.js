'use strict'

let Pipe = require('Piperunner').Pipe
let Docker = require('dockerode')
let docker = new Docker({socketPath: '/var/run/docker.sock'})

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

async function pull (pipe, job) {
	let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
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
	console.log('previuse container ->', previusContainer)
	if (previusContainer) {
		let pC = docker.getContainer(previusContainer.Id)
		pC.remove(function (err, data) {
  			let image = job.registry == undefined ? job.image : job.registry + '/' + job.image
  			console.log('image ', image)
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
	console.log('Starting')
	pipe.data.container.start(function (err) {
		if (err) {
			pipe.data.startError = true
			pipe.data.startErrorSpec = err
			pipe.end()
		} else {
			pipe.data.started = true
			pipe.next()
		}
	})
}

module.exports.launch = (body, cb) => {
	let pipe = new Pipe()
	pipe.step('pull', (pipe, job) => {
		pull(pipe, job)
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