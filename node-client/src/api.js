'use strict'

let nvidiaSmi = require('./nvidia-smi')

module.exports.gpu = {}
module.exports.docker = {}

module.exports.gpu.info = function (args, cb) {
	nvidiaSmi.getGPU(args, cb)
}
