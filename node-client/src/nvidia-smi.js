'use strict'

let shell = require ('shelljs')
let parseString = require ('xml2js').parseString

module.exports.getGPU = function (cb) {
	let strXml = shell.exec('nvidia-smi -x -q', {silent: true}).stdout
	let gpus = []
	parseString(strXml, function (err, result) {
	    result.nvidia_smi_log.gpu.forEach((g) => {
	    	gpus.push({
	    		product_name: g.product_name[0], 
	    		uuid: g.uuid[0], 
	    		fb_memory_usage: g.fb_memory_usage[0].used[0], 
	    		fb_memory_total: g.fb_memory_usage[0].total[0]
			})
	    })
	    cb(gpus)
	})
}