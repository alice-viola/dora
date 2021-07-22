'use strict'

let shell = require ('shelljs')

let parseString = require ('xml2js').parseString

module.exports.getGPU = function (args, cb) {
	shell.exec('nvidia-smi -x -q', {silent: true, async: true}, (code, stdout, stderr) => {
		let strXml = stdout
		let gpus = []
		if (strXml !== null) {
			parseString(strXml, function (err, result) {
				if (result == null) {
					cb(null, [])
				} else {
			    	result.nvidia_smi_log.gpu.forEach((g) => {
			    		console.log('-----')
			    		console.log(g)
			    		gpus.push({
			    			product_name: g.product_name[0], 
			    			uuid: g.uuid[0], 
			    			fb_memory_usage: g.fb_memory_usage[0].used[0], 
			    			fb_memory_total: g.fb_memory_usage[0].total[0],
			    			minor_number: g.minor_number[0],
			    			temperature: g.temperature[0],
			    			power_readings: g.power_readings[0],
			    			processes: g.processes
						})
						console.log('####')
						console.log(g.processes)
						console.log('-----')
			    	})
			    	cb(null, gpus)
				}
			})
		} else {
			cb(null, [])
		}
	})
}