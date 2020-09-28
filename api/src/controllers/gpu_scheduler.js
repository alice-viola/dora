'use strict'

const GE = require('../events/global')
let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let api = {v1: require('../api')}
let status = require ('../workload/status')

let GPUWorkload = require ('../in_memory/gpuworkload')

let availableGpu = []
let runningWorkload = null

let WorkloadDiscoverInterval = undefined
let WorkloadDiscoverIntervalTimeMs = 1000

let alreadyAssignedGpu = []

function workloadFetch () {
	console.log('Workload fetch')
	alreadyAssignedGpu = []
	api['v1'].get({kind: 'Volume'}, (err, volumes) => {
		api['v1'].get({kind: 'GPUWorkload'}, (err, _workloads) => {
			let workloads = []
			_workloads.forEach((workload) => {
				let wk = new GPUWorkload(workload)
				if (wk.hasGpuAssigned()) {
					alreadyAssignedGpu.push(wk.assignedGpu())
				}
				workloads.push(wk)
			})
			alreadyAssignedGpu = alreadyAssignedGpu.flat()
			processWorkloads({
				workloads: workloads,
				volumes: volumes,
			})
		})
	})
}

function updateWorkload (args, cb) {
	api['v1'].apply(args, (err, result) => {
		cb(err, result)
	})
}

function workloadSelector (args) {
	let need = {
		gpu: args.spec.selectors.gpu !== undefined ? true : false, 
		node: args.spec.selectors.node !== undefined ? true : false,
		volumes: args.spec.volumes !== undefined ? true : false
	}
	return need
}

function nodeForWorkload (agpu, args) {
	let nodeAvailableGpu = []
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (gpu.node == args.spec.selectors.node.name) {
				nodeAvailableGpu.push(gpu)
			} 
		})
	}
	return nodeAvailableGpu
}

function gpuForWorkload (agpu, args) {
	let productAvailableGpu = []
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (gpu.product_name == args.spec.selectors.gpu.product_name) {
				productAvailableGpu.push(gpu)
			} 
		})
	}
	return productAvailableGpu
}

function gpuMemoryStatus (agpu, args) {
	let freeAvailableGpu = []
	if (agpu.length !== 0) {
		agpu.forEach((gpu) => {
			if (gpu.fb_memory_usage == '0 MiB' ) {
				freeAvailableGpu.push(gpu)
			} 
		})
	}
	return freeAvailableGpu
}

function gpuNumberStatus (agpu, args) {
	let gpuCount = 1
	if (args.spec.selectors.gpu.count != undefined) {
		gpuCount = args.spec.selectors.gpu.count
	}
	let freeAvailableGpu = agpu.filter((gpu) => {
		return !alreadyAssignedGpu.includes(gpu.uuid)
	})
	if (freeAvailableGpu.length >= gpuCount) {
		return freeAvailableGpu.filter((fAG, idx) => idx < gpuCount)	
	} else {
		return []
	}
}

function volumeRequirement (agpu, volumes, args) {
	let freeAvailableGpu = []
	let matchedLocalNodes = []
	let matchedNfsNodes = []
	if (args.spec.volumes !== undefined && args.spec.volumes.length > 0) {
		args.spec.volumes.forEach((requiredVolume) => {
			volumes.forEach((availableVolume) => {
				if (availableVolume.metadata.name == requiredVolume.name) {
					//console.log('Found Volume', requiredVolume.name)
					if (availableVolume.spec.mount.local !== undefined) {						
						matchedLocalNodes.push(availableVolume)
					} else if (availableVolume.spec.mount.nfs !== undefined) {						
						matchedNfsNodes.push(availableVolume)
					}
				} 
			})
		})
		if (agpu.length !== 0) {
			agpu.forEach((gpu) => {
				matchedLocalNodes.forEach((localNode) => {
					if (gpu.node == localNode.spec.mount.local.node) {
						if (localNode.spec.accessModes == 'ReadWriteMany' || localNode.bound.value == false) {
							freeAvailableGpu.push(gpu)	
						}
					}
				})
			})
		}
		return {agpu: freeAvailableGpu, volumes: matchedLocalNodes}
	} else {
		return {agpu: agpu, volumes: []}
	}
}

function assignGpuWorkload (agpu, volumes, workload) {
	let quene = []
	workload.status.push(status.status(status.WORKLOAD.ASSIGNED))
	workload.currentStatus = status.WORKLOAD.ASSIGNED
	workload.locked = true
	workload.scheduler = {
		gpu: agpu,
		volumes: volumes
	}
	volumes.forEach ((v) => {
		v.bound = {value: true, by: v.bound.by.concat([workload.metadata.name])}
		quene.push((cb) => {
			updateWorkload(v, (err, result) => {
				cb(null)
			})
		})
	})
	async.parallel(quene, (err, res) => {
		updateWorkload(workload, workloadFetch)
	})
	
}

async function processWorkloads (args) {
	let workloads = args.workloads
	let volumes = args.volumes
	let analyzeWorkloads = true
	let i = 0
	if (workloads.length == 0) {
		return
	}
	while (analyzeWorkloads == true) {
		let workload = workloads[i]
		switch (workload._p.currentStatus) {

			case undefined:
				workload._p.currentStatus = status.WORKLOAD.INSERTED
				workload._p.status.push(status.status(status.WORKLOAD.INSERTED))
				// TODO
				await workload.update()
				updateWorkload(workload, workloadFetch)
				analyzeWorkloads = false
				break

			case status.WORKLOAD.INSERTED:
				let filteredGpu = JSON.parse(JSON.stringify(availableGpu))
				if (workload.hasSelector('node')) {
					filteredGpu = nodeForWorkload(filteredGpu, workload._p)
				}
				if (workload.hasSelector('gpu')) {
					filteredGpu = gpuForWorkload(filteredGpu, workload._p)
				}

				filteredGpu = gpuMemoryStatus(filteredGpu)
				filteredGpu = gpuNumberStatus(filteredGpu, workload._p)
				
				if (workload.hasVolumes()) {
					filteredGpu = gpuForWorkload(filteredGpu, workload._p)
				}
				// TODO

				//let gpuAndVolumes = volumeRequirement(filteredGpu, volumes, workload)
				//filteredGpu = gpuAndVolumes.agpu
				//let volumesBound = gpuAndVolumes.volumes
				//if (filteredGpu.length > 0) {
				//	assignGpuWorkload(filteredGpu, volumesBound, workload)
				//	analyzeWorkloads = false
				//}
				break

		}
		i += 1
		if (i == workloads.length) {
			analyzeWorkloads = false
		}
	}
}


GE.Emitter.on(GE.ApiCall, workloadFetch)
GE.Emitter.on(GE.GpuUpdate, workloadFetch)
GE.Emitter.on(GE.SystemStarted, workloadFetch)

module.exports.gpuStatus = (gpu) => {
	availableGpu = gpu
}

module.exports.start = () => {
	if (WorkloadDiscoverInterval == undefined) {
		workloadFetch()
		//WorkloadDiscoverInterval = setInterval(workloadFetch, WorkloadDiscoverIntervalTimeMs)
	}
} 

module.exports.stop = () => {
	if (GpuDiscoverInterval != undefined) {
		clearInterval(WorkloadDiscoverInterval)
	}
} 
