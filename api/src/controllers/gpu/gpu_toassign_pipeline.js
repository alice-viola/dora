'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipe
let async = require('async')
let axios = require('axios')
let pipe = new Pipe()

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

function gpuNumberStatus (agpu, args, alreadyAssignedGpu) {
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

function assignGpuWorkload (agpu, volumes, workload, pipe) {
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
		pipe.endRunner()
	})
}

async function statusCheck (workload, pipe, args) {
	if (pipe.data.filteredGpu.length == 0) {
		let err = args.err
		if (workload._p.status[workload._p.status.length -1].reason !== err) {
			workload._p.currentStatus = GE.WORKLOAD.INSERTED
			workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED, err))
			await workload.update()
			pipe.endRunner()
		} else {
			pipe.end()
		}
	} else {
		pipe.next()
	}
}

pipe.step('initWork', async function (pipe, workload) {
	if (workload == undefined || pipe.data.availableGpu == undefined) {
		pipe.end()
		return
	}
	pipe.data.filteredGpu = []
	pipe.data.volumesBound = []
	pipe.next()
})

pipe.step('initializeWorkload', async function (pipe, workload) {
	if (workload._p.currentStatus == undefined) {
		workload._p.currentStatus = GE.WORKLOAD.INSERTED
		workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED))
		await workload.update()
		pipe.endRunner()
	} else {
		pipe.next()
	}
})

pipe.step('getAvailableGpu', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
		pipe.data.filteredGpu = JSON.parse(JSON.stringify(pipe.data.availableGpu))
		if (workload.hasSelector('node')) {
			pipe.data.filteredGpu = nodeForWorkload(pipe.data.filteredGpu, workload._p)
		}
		statusCheck(workload, pipe,  {err: GE.ERROR.EMPTY_NODE_SELECTOR})
	} else {
		pipe.next()
	}
})

pipe.step('gpuSelector', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.WORKLOAD.INSERTED) {
		if (workload.hasSelector('gpu')) {
			pipe.data.filteredGpu = gpuForWorkload(pipe.data.filteredGpu, workload._p)
		}
		statusCheck(workload, pipe,  {err: GE.ERROR.EMPTY_GPU_SELECTOR})
	} else {
		pipe.end()
	}
})

pipe.step('gpuMemory', async function (pipe, workload) {
	pipe.data.filteredGpu = gpuMemoryStatus(pipe.data.filteredGpu)
	statusCheck(workload, pipe,  {err: GE.ERROR.NO_GPU_FREE})
})

pipe.step('gpuNumberStatus', async function (pipe, workload) {
	pipe.data.filteredGpu = gpuNumberStatus(pipe.data.filteredGpu, workload._p, pipe.data.alreadyAssignedGpu)
	statusCheck(workload, pipe,  {err: GE.ERROR.NO_GPUS_FREE})
})

pipe.step('volumeRequirement', async function (pipe, workload) {
	let gpuAndVolumes = volumeRequirement(pipe.data.filteredGpu, pipe.data.volumes, workload)
	pipe.data.filteredGpu = gpuAndVolumes.agpu
	pipe.data.volumesBound = gpuAndVolumes.volumes
	statusCheck(workload, pipe,  {err: GE.ERROR.NO_VOLUME_MATCH})
})

pipe.step('assign', async function (pipe, workload) {
	assignGpuWorkload(pipe.data.filteredGpu, pipe.data.volumesBound, workload, pipe)
})


module.exports = pipe