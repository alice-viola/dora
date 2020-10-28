'use strict'

let async = require('async')

let randomstring = require('randomstring')
let fs = require('fs')
let Docker = require('dockerode')
let shell = require('shelljs')
let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)
if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

let docker = new Docker({socketPath: socket})


module.exports.exec = (hasGpus, cb) => {
	console.log('exec update with gpu', hasGpus)
	let DeviceRequests = []
	if (hasGpus == true) {
		DeviceRequests = [
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
	docker.pull(process.env.PWM_UPDATE_IMAGE || 'registry.promfacility.eu/pwmnode-update', async function (err, stream) {
		if (err) {
			cb(err)
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	err ? reject(err) : resolve(res)
			  })
			})
			docker.createContainer({
				AttachStdout: false,
				Tty: false,
				name: randomstring.generate(24).toLowerCase(),
				Image: process.env.PWM_UPDATE_IMAGE || 'registry.promfacility.eu/pwmnode-update',
				OpenStdin: false,
				AutoRemove: true,
				Cmd: ['npm', 'start'],
				HostConfig: {
    		       	Binds: ["/var/run/docker.sock:/var/run/docker.sock"],
					DeviceRequests: DeviceRequests,
				}
			}).then(async function(container) {
				console.log('exec update', container)
  				container.start({}, async function(err, data) {
  					cb(true)
  					console.log('exec start', err)
  				})	  
			}).catch(async function(err) {
				cb(err)
			})	
		}
	})
}