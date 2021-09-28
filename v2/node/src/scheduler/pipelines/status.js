'use strict'

const { StaticPool } = require('node-worker-threads-pool')
let axios = require('axios')
let shell = require ('shelljs')
let parseString = require ('xml2js').parseString

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('status')

let DockerDriver = require('../../../../core/index').Driver.Docker
let DockerDb = require('../../../../core/index').Driver.DockerDb

/// Used to send a complete report
/// to the control plane every 60 seconds
let completeUpdateInterval = 60000
let completeUpdateDate = null

// C:\Windows\System32\DriverStore\FileRepository\nvgridsw.inf_amd64_74f37ad0fe0c30e3
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
function getGPU (args, cb) {
	let cmd = 'nvidia-smi -x -q'
	if (process.env.WINDOWS) {
		cmd = 'cd ' + process.env.NVIDIA_SMI_PATH + " && .\\nvidia-smi.exe"
	}

	shell.exec(cmd, {silent: true, async: true}, (code, stdout, stderr) => {
		let strXml = stdout
		let gpus = []
		if (strXml !== null) {
			parseString(strXml, function (err, result) {
				if (result == null) {
					cb(null, [])
				} else {
			    	result.nvidia_smi_log.gpu.forEach((g) => {
			    		gpus.push({
			    			product_name: g.product_name[0], 
			    			uuid: g.uuid[0], 
			    			fb_memory_usage: g.fb_memory_usage[0].used[0], 
			    			fb_memory_total: g.fb_memory_usage[0].total[0],
			    			minor_number: g.minor_number[0],
			    			temperature: g.temperature[0],
			    			power_readings: g.power_readings[0],
			    			processes: g.processes[0]
						})
			    	})

			    	cb(null, gpus)
				}
			})
		} else {
			cb(null, [])
		}
	})
}
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

let https = require('https')
let fs = require('fs')

let instance
if (process.env.USE_CUSTOM_CA_SSL_CERT == true || process.env.USE_CUSTOM_CA_SSL_CERT == 'true') {
	const CA_CRT = fs.readFileSync(process.env.SSL_CA_CRT)
	instance = axios.create({
	  httpsAgent: new https.Agent({  
	    ca: [CA_CRT], 
		checkServerIdentity: function (host, cert) {
		    return undefined
		}
	  })
	})
} else {
	instance = axios.create({
	  httpsAgent: new https.Agent({  
		rejectUnauthorized: process.env.DENY_SELF_SIGNED_CERTS || false				
	  })
	})
}

function request (args) {
	let protocol = 'https'
	if (args.apiServerToken !== undefined) {
		instance.defaults.headers.common = {'Authorization': `Bearer ${args.apiServerToken}`}	
	}
	instance[args.method](args.apiServerAddress + args.apiServerPath, args.body).then(res => {
		if (args.then !== undefined) {
			args.then(res)
		}
	}).catch((err) => {
		if (args.err !== undefined) {
			args.err(err)
		}
	}) 
}

////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////

pipeline.step('fetch-status', async (pipe, job) => {
	const si = require('systeminformation')
	let os = require('os')
	
	let data = {}
	data.version = process.env.VERSION
	data.sys = {}
	data.cpus = []
	data.gpus = []
	
	// Sys
	data.sys.arch = await os.arch()
	data.sys.cpus = await si.cpu()
	data.sys.currentLoad = await si.currentLoad()
	data.sys.mem = await si.mem()
	
	// Cpu
	let cpus = os.cpus()
	let index = 0
	cpus.forEach ((cpu) => {
		data.cpus.push({
			uuid: cpu.model + ' ' + index, 
			product_name: cpu.model,
			speed: cpu.speed,
			load: data.sys.currentLoad.cpus[index].load
		})
		index += 1
	})

	let toDelete = []
	const maxContainerUpdateLimit = 5
	let toSendCount = 0
	if (completeUpdateDate == null || ((new Date() - completeUpdateDate) > completeUpdateInterval)) {
		console.log("Send Complete report")
		data.containers = DockerDb.get(function (c) {
			return true
		})
		completeUpdateDate = new Date()
	} else {
		data.containers = DockerDb.get(function (c) {
			const originalCvalue = c.update
			let toSend = false
			if (toSendCount > maxContainerUpdateLimit) {
				return false
			}
			if (originalCvalue !== c.updateSent) {
				toSend = true
				toSendCount += 1
				c.updateSent = originalCvalue
			}
			if (c.toDelete !== undefined && c.toDelete == true) {
				toDelete.push(c.job_id)
			}
			return toSend
		})
		toDelete.forEach((job_id) => {
			DockerDb.deleteOne(job_id)
		})
	}

	getGPU(null, (err, gpus) => {
		data.gpus = gpus
		pipe.data.nodeData = data
		pipe.next()
	})
})

pipeline.step('send-status', async (pipe, job) => {
	request({
		method: 'post',
		apiServerAddress: process.env.API_ENDPOINT,
		apiServerPath: '/v2/-/-/Node/report',
		apiServerToken: process.env.API_TOKEN,
		body: { 
			data: {
				kind: 'Node',
				operation: 'report',
				metadata: {
					name: process.env.NODE_NAME,
					zone: process.env.ZONE || null
				},
				observed: pipe.data.nodeData,
			}
		},
		then: (res) => {			
			pipe.data.containers = res.data.containers
			pipe.next()
		},
		err: (res) => {
			console.log(res)
			pipe.data.containers = []
			pipe.end()
		} 
	})
})

/**
 * Delete orphan containers, filter it by "Labels[dora.name]": so
 * does not touch non-Dora managed containers 
 */
pipeline.step('deleteForeignContainers', async (pipe, job) => {
	let containersNamesFromScheduler = pipe.data.containers.map((c) => {
		return 'dora.' + c.workspace + '.' + c.name 
	})
	//console.log('from scheduler', containersNamesFromScheduler)
	let containersOnNode = await DockerDriver.getAll({
		filters: {
			"status": ["running"],
			"is-task": ["false"]
		}
	})
	containersOnNode = containersOnNode.filter((c) => { return c.Labels["dora.name"] !== undefined})
	let containersOnNodeNames = containersOnNode.map((c) => {
		let name = c.Names
		if (name.length > 1) {
			name = name.map((cn) => {
				if (cn.charAt(0) === '/') {
					name = name.slice(1)
				}
			}).join('--')
		} else {
			name = name[0]
			if (name.charAt(0) === '/') {
				name = name.slice(1)
			}			
		}
		return name
	})
	//console.log("from node", containersOnNodeNames)
	for (let i = 0; i < containersOnNodeNames.length; i += 1) {
		let cName = containersOnNodeNames[i]
		if (!containersNamesFromScheduler.includes(cName)) {
			console.log("TO DELETE", cName)
			await DockerDriver.drain(cName)
		} 
	}
	pipe.next()
})

module.exports.getScheduler = () => { return scheduler }
module.exports.set = (args) => {
	db = args.db
} 