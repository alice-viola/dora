'use strict'

let inquirer = require('inquirer')



let FN = {} 

function generatePipe () {
	return {
		Init: 				{fn: FN.Init, next: (res) => { return pipe[res] }},
		Workload: 			{fn: FN.Workload, next: (res) => { return pipe[res] }},
		GPU: 				{fn: FN.GPU, next: (res) => { return pipe.GPUNumber }},
		GPUNumber: 			{fn: FN.GPUNumber, next: (res) => { return pipe.ImageRegistry }},
		ImageRegistry: 		{fn: FN.ImageRegistry, next: (res) => { return res == 'Custom registry' ? pipe.CustomRegistry : pipe.DockerHubRegistry }},
		CustomRegistry: 	{fn: FN.CustomRegistry, next: (res) => { return pipe.ImageName }},
		DockerHubRegistry: 	{fn: FN.DockerHubRegistry, next: (res) => { return pipe.VolumeName }},
		ImageName: 			{fn: FN.ImageName, next: (res) => { return pipe.VolumeName }},
		CPU: 				{fn: FN.CPU, next: (res) => { return pipe.CPUNumber }},
		CPUNumber: 			{fn: FN.CPUNumber, next: (res) => { return pipe.ImageRegistry }},
		WorkloadName: 		{fn: FN.WorkloadName, next: (res) => { return undefined }},
		VolumeName: 		{fn: FN.VolumeName, next: (res) => { return res == 'no volume' ? pipe.WorkloadName : pipe.VolumePath }},
		VolumePath: 		{fn: FN.VolumePath, next: (res) => { return pipe.WorkloadName }},
	}
}
let pipe = {}

async function start () {
	pipe = generatePipe()
	let responses = {}
	let toReturn = ''
	let goOn = true
	let key = 'Init'
	let fnp = pipe[key]
	let fn = fnp.fn
	while (goOn) {
		let res = await inquirer.prompt(fn)
		responses[Object.keys(res)[0]] = Object.values(res)[0]
		fnp = fnp.next(Object.values(res)[0])
		if (fnp == undefined) {
			goOn = false
			toReturn = responses
		} else {
			fn = fnp.fn	
		}
	}
	return toReturn
}

module.exports.setFn = (_fn) => { FN = _fn} 
module.exports.start = start