'use strict'

const GE = require('../events/global')
let async = require('async')
let api = {v1: require('../api')}

let Pipeline = require ('./pipeline')

let GPUWorkload = require ('../models/gpuworkload')
let Volume = require ('../models/volume')

let availableGpu = []
let runningWorkload = null

let WorkloadDiscoverInterval = undefined
let WorkloadDiscoverIntervalTimeMs = 1000

let alreadyAssignedGpu = []

function workloadFetch () {
	alreadyAssignedGpu = []
	api['v1']._get({kind: 'Volume'}, (err, _volumes) => {
		api['v1']._get({kind: 'GPUWorkload'}, (err, _workloads) => {
			let volumes = []
			_volumes.forEach((volume) => {
				let vol = new Volume(volume)
				volumes.push(vol)
			})
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
	if (args._p.spec.volumes !== undefined && args._p.spec.volumes.length > 0) {
		args._p.spec.volumes.forEach((requiredVolume) => {
			volumes.forEach((availableVolume) => {
				if (availableVolume._p.metadata.name == requiredVolume.name) {
					if (availableVolume._p.spec.mount.local !== undefined) {						
						matchedLocalNodes.push(availableVolume)
					} else if (availableVolume._p.spec.mount.nfs !== undefined) {						
						matchedNfsNodes.push(availableVolume)
					}
				} 
			})
		})
		if (agpu.length !== 0) {
			agpu.forEach((gpu) => {
				matchedLocalNodes.forEach((localNode) => {
					if (gpu.node == localNode._p.spec.mount.local.node) {
						if (localNode._p.spec.accessModes == 'ReadWriteMany' || localNode._p.bound.value == false) {
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
	workload._p.status.push(GE.status(GE.WORKLOAD.ASSIGNED))
	workload._p.currentStatus = GE.WORKLOAD.ASSIGNED
	workload._p.locked = true
	workload._p.scheduler = {
		gpu: agpu,
		volumes: volumes
	}
	volumes.forEach ((v) => {
		v._p.bound = {value: true, by: v._p.bound.by.concat([workload._p.metadata.name])}
		quene.push(async function (cb) {
			await v.update()
		})
	})
	async.parallel(quene, async function (err, res) {
		console.log('Assigned')
		await workload.update()
	})
}

async function processWorkloads (args) {
	let filteredGpu, volumesBound = []
	let volumes = args.volumes

	let pipe = new Pipeline(args.workloads)

	pipe.on('statusCheck', async function (workload, pipe, args) {
		if (filteredGpu.length == 0) {
			let err = args.err
			if (workload._p.status[workload._p.status.length -1].reason !== err) {
				workload._p.currentStatus = GE.WORKLOAD.INSERTED
				workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED, err))
				await workload.update()
				pipe.reset()
			}
		} else {
			pipe.next()
		}
	})
	
	pipe.define('initWork', async function (workload, pipe) {
		filteredGpu = []
		volumesBound = []
		pipe.next()
	})

	pipe.define('initializeWorkload', async function (workload, pipe) {
		if (workload._p.currentStatus == undefined) {
			workload._p.currentStatus = GE.WORKLOAD.INSERTED
			workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED))
			await workload.update()
			pipe.reset()
		} else {
			pipe.next()
		}
	})

	pipe.define('getAvailableGpu', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			filteredGpu = JSON.parse(JSON.stringify(availableGpu))
			if (workload.hasSelector('node')) {
				filteredGpu = nodeForWorkload(filteredGpu, workload._p)
			}
			pipe.emit('statusCheck', {err: GE.ERROR.EMPTY_NODE_SELECTOR})
		} else {
			pipe.next()
		}
	})

	pipe.define('gpuSelector', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			if (workload.hasSelector('gpu')) {
				filteredGpu = gpuForWorkload(filteredGpu, workload._p)
			}
			pipe.emit('statusCheck', {err: GE.ERROR.EMPTY_GPU_SELECTOR})
		} else {
			pipe.next()
		}
	})

	pipe.define('gpuMemory', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			filteredGpu = gpuMemoryStatus(filteredGpu)
			pipe.emit('statusCheck', {err: GE.ERROR.NO_GPU_FREE})
		} else {
			pipe.next()
		}
	})

	pipe.define('gpuNumberStatus', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			filteredGpu = gpuNumberStatus(filteredGpu, workload._p)
			pipe.emit('statusCheck', {err: GE.ERROR.NO_GPUS_FREE})
		} else {
			pipe.next()
		}
	})

	pipe.define('volumeRequirement', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			let gpuAndVolumes = volumeRequirement(filteredGpu, volumes, workload)
			filteredGpu = gpuAndVolumes.agpu
			volumesBound = gpuAndVolumes.volumes
			pipe.emit('statusCheck', {err: GE.ERROR.NO_VOLUME_MATCH})
		} else {
			pipe.next()
		}
	})

	pipe.define('assign', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
			assignGpuWorkload(filteredGpu, volumesBound, workload)
			pipe.next()
		} else {
			pipe.next()
		}
	})

	pipe.define('ok', async function (workload, pipe) {
		if (workload._p.currentStatus == GE.WORKLOAD.ASSIGNED) {
			pipe.end()
		}
	})

	pipe.run()
}

GE.Emitter.on(GE.GpuUpdate, function (agpu) {
	availableGpu = agpu
})
GE.Emitter.on(GE.RunGpuScheduler, workloadFetch)
GE.Emitter.on(GE.SystemStarted, () => {
	if (WorkloadDiscoverInterval == undefined) {
		workloadFetch()
		WorkloadDiscoverInterval = setInterval(workloadFetch, WorkloadDiscoverIntervalTimeMs)
	}
})

module.exports.stop = () => {
	if (GpuDiscoverInterval != undefined) {
		clearInterval(WorkloadDiscoverInterval)
	}
} 