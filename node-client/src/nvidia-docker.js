'use strict'

let shell = require ('shelljs')

module.exports.exec = function (operation, args, cb) {
	switch (operation) {
		case 'run': 
			shell.exec(`CUDA_VISIBLE_DEVICES=${args.gpuNumber} nvidia-docker run -d  ${args.wkregistry}/${args.wkname}`)
	}

}