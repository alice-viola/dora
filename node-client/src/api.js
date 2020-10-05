'use strict'

let nvidiaSmi = require('./nvidia-smi')
let nvidiaDocker = require('./nvidia-docker')

module.exports.gpu = {}
module.exports.docker = {}

module.exports.gpu.info = function (args, cb) {
	nvidiaSmi.getGPU(args, cb)
}

module.exports.docker.list = function (args, cb) {
	nvidiaDocker.list(args, cb)
}