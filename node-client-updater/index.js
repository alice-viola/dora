'use strict'

let async = require('async')

let fs = require('fs')
let Docker = require('dockerode')
let shell = require('shelljs')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)
if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})

let driverFn = {}

let getContainer = async (name, cb) => {
	let container = docker.getContainer(name)
	if (container) {
		container.inspect(function (err, data) {
			if (!err) {
				cb(container, data)
			} else {
				cb (null, undefined)
			}
		})
	} else {
		cb (null, undefined)
	}
}


let pull = async (image, cb) => {
	docker.pull(image, async function (err, stream) {
		if (err) {
			cb(false)
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	err ? reject(err) : resolve(res)
			  })
			})
			cb(true)
		}
	})
}

let restart = async (name, cb) => {
	getContainer(name, (container) => {
		if (container == null) {
			cb(false)
		} else {
			console.log(container)
			container.restart(name, async function (err, stream) {
				console.log(err)
				if (err) {
					cb(false)
				} else {
					cb(true)
				}
			})
		}
	})
}

let stop = async (container, cb) => {
	container.stop(async function (err, stream) {
		container.remove(async function (err, data) {
			cb(true)		
		})	
	})
}


// docker run -d --gpus all  -v /var/run/docker.sock:/var/run/docker.sock -p3001:3001 --restart unless-stopped --name pwmnode registry.promfacility.eu/pwmnode
let start = (oldContainer, name) => {
	
	oldContainer = {HostConfig: {}}
	oldContainer.HostConfig.Binds = [
	   	"/var/run/docker.sock:/var/run/docker.sock"
	]
	oldContainer.ExposedPorts = {
	        "3001/tcp": {
	                "HostIp": "0.0.0.0",
	                "HostPort": "3001"
	            }
	    }
	oldContainer.HostConfig.PortBindings = {
	        "3001/tcp": [{
	                "HostIp": "",
	                "HostPort": "3001"
	            }]
	    }
	let strXml = shell.exec('nvidia-smi -x -q', {silent: true})
	console.log(strXml.code)
	if (strXml.code == '0') {
		oldContainer.HostConfig.DeviceRequests = [
		        {
		            "Driver": "",
		            "Count": -1,
		            "DeviceIDs": null,
		            "Capabilities": [
		                [
		                    "gpu"
		                ]
		            ],
		            "Options": {}
		        }
		    ]
	}
	
	docker.createContainer({
		AttachStdout: false,
		Tty: false,
		name: name,
		Image: process.env.PWM_IMAGE || 'registry.promfacility.eu/pwmnode',
		OpenStdin: false,
		AutoRemove: true,
		Cmd: ['npm', 'start'],
		ExposedPorts: oldContainer.ExposedPorts,
		HostConfig: {
			PidMode: 'host',
           	Binds: oldContainer.HostConfig.Binds,
           	PortBindings: oldContainer.HostConfig.PortBindings,
			DeviceRequests: oldContainer.HostConfig.DeviceRequests,
		}
	}).then(async function(container) {
  		container.start({}, async function(err, data) {})	  
	}).catch(async function(err) {

	})
}

let exec = () => {
	let containerName = process.env.PWM_C_NAME || 'pwmnode'
	pull(process.env.PWM_IMAGE || 'registry.promfacility.eu/pwmnode', (response) => {
		console.log('pull response', response)
		if (response == true) {
			getContainer(containerName, (container, oldContainerData) => {
				console.log('Get')
				if (container !== null) {
					stop(container, () => {
						console.log('Starting')
						start(oldContainerData, containerName)
					})
				} else {
					start(oldContainerData, containerName)
				}
			})
		} 
	})
}

exec()