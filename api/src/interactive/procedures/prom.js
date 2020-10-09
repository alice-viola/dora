'use strict'

let fn = {

	Init: [{
		type: 'list',
		message: 'Select resource',
		name: 'resourceKind',
		choices: [
		  'Workload'
	]}],

	Workload: [{
		type: 'list',
		message: 'Select workload kind',
		name: 'workloadKind',
		choices: [
		  'GPU',
		  'CPU',
	]}],

	GPU: [{
		type: 'list',
		message: 'Select gpu kind',
		name: 'gpuKind',
		default: 'any',
		choices: [
		  'Tesla V100-SXM2-16GB',
		  'Quadro RTX 6000',
		  'Dummy GPU'
	]}],

	CPU: [{
		type: 'list',
		message: 'Select cpu kind',
		name: 'cpuKind',
		default: 'any',
		choices: [
			'Intel(R) Core(TM) i7-8569U CPU @ 2.80GHz',
		  	'Intel(R) Core(TM) Xeon Gold @ 2.60Ghz',
		  	'Common KVM processor',
	]}],

	GPUNumber: [{
    	type: 'input',
    	name: 'numberOfGpu',
    	message: "Number of GPUS",
    	default: 1
	}],

	CPUNumber: [{
    	type: 'input',
    	name: 'numberOfCpu',
    	message: "Number of CPUS",
    	default: 1
	}],

	ImageRegistry: [{
		type: 'list',
		message: 'Select image registry',
		name: 'imageRegistry',
		choices: [
		  'Docker-hub registry',
		  'Custom registry',
	]}],

	CustomRegistry: [{
    	type: 'input',
    	name: 'customRegistryName',
    	message: "Insert the registry address",
	}],

	DockerHubRegistry: [{
    	type: 'input',
    	name: 'dockerHubImageName',
    	message: "Insert the image name",
	}],

	ImageName: [{
    	type: 'input',
    	name: 'customHubImageName',
    	message: "Insert the image name",
	}],

	VolumeName: [{
    	type: 'input',
    	name: 'volumeName',
    	message: "Insert a persistent volume name",
    	default: 'no volume'
	}],

	VolumePath: [{
    	type: 'input',
    	name: 'volumeTarget',
    	message: "Insert the persistent volume path",
    	default: '/home'
	}],

	WorkloadName: [{
    	type: 'input',
    	name: 'workloadName',
    	message: "Insert a workload name",
	}],
}

function execResults (responses) {
	let computeSelectors = (_responses) => {
		if (_responses.workloadKind == 'CPU') {
			return {
				cpu: {
					product_name: _responses.cpuKind,
					count: _responses.numberOfCpu
				}
			}
		}
		if (_responses.workloadKind == 'GPU') {
			return {
				gpu: {
					product_name: _responses.gpuKind,
					count: _responses.numberOfGpu
				}
			}
		}
	}
	let computeImage = (_responses) => {
		if (_responses.customRegistryName == undefined) {
			return {
				image: _responses.dockerHubImageName
			}
		}
		else {
			return {
				registry: _responses.customRegistryName,
				image: _responses.customHubImageName
			}
		}
	}
	let generatedName = responses.workloadName || generateName()
	return {
		apiVersion: 'v1',
		kind: 'Workload',
		metadata: {
			name: generatedName,
			group: 'prom-lab'
		},
		spec: {
			selectors: computeSelectors(responses),
			image: computeImage(responses),
			config: {
				cmd: '/bin/bash',
				startMode: '-itd'
			},
			volumes: [
				{name: responses.volumeName, target: responses.volumeTarget}
			]
		}
	}
}

module.exports = {fn: fn, exec: execResults}