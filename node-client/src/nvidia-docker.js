'use strict'

/*
let shell = require ('shelljs')

module.exports.exec = function (operation, args, cb) {
	switch (operation) {
		case 'run': 
			shell.exec(`CUDA_VISIBLE_DEVICES=${args.gpuNumber} nvidia-docker run -d  ${args.wkregistry}/${args.wkname}`)
	}
}*/

let Docker = require('dockerode')
let docker = new Docker({socketPath: '/var/run/docker.sock'})

module.exports.list = (args, cb) => {
	docker.listContainers(function (err, containers) {
		cb (err, containers)
	})
}

module.exports.inspect = (args, cb) => {
	let container = docker.getContainer(args.id)
	docker.inspect(function (err, data) {
		cb (err, data)
	})
}

module.exports.start = (args, cb) => {
	docker.createContainer({
	  Image: args.image,
	}).then(function (container) {
		container.start(cb)
	})
}

module.exports.stop = (args, cb) => {
	let container = docker.getContainer(args.id)
	container.stop(cb)
}