'use strict'

const GE = require('../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let fn = require ('../fn/fn')
let Volume = require ('../../models/volume')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('assignWorkloadBatch')

async function statusWriter(workload, status, err) {
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = status
		workload._p.status.push(GE.status(status, err))
		await workload.update()
	}
}

pipe.step('initWorkload', async (pipe, workloads) => {
	if (workloads == undefined || workloads.workloads == undefined) {
		pipe.endRunner()
		return
	}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		if (workload._p.currentStatus == undefined) {
			workload._p.currentStatus = GE.WORKLOAD.INSERTED
			workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED))
			await workload.update()	
		}
	}
	pipe.next()
})

pipe.step('nodeSelectorsCheck', async (pipe, workloads) => {
	pipe.data.availableNodes = {}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		await statusWriter(workload, workload._p.currentStatus, null)
		if (workload._p.spec.selectors == undefined) {
			workload._p.spec.selectors = {}
			workload._p.spec.selectors.cpu = {product_name: 'pwm.all', count: 1}
		}
		if (pipe.data.nodes == undefined) {
			pipe.endRunner()
			return
		}
	
		let availableNodes = JSON.parse(JSON.stringify(pipe.data.nodes))
		availableNodes = fn.filterNodeStatus(availableNodes)
		let wantsCpu = fn.wantsCpu(workload._p.spec.selectors)
		let wantsGpu = fn.wantsGpu(workload._p.spec.selectors)
		if (wantsCpu == true && wantsGpu == true) {
			// filter both nodes
			availableNodes = fn.filterNodesByAllow(availableNodes, 'GPUWorkload')
			availableNodes = fn.filterNodesByAllow(availableNodes, 'CPUWorkload')
		} else if (wantsCpu == true && wantsGpu == false) {
			// filter cpu nodes
			availableNodes = fn.filterNodesByAllow(availableNodes, 'CPUWorkload')
		} else if (wantsCpu == false && wantsGpu == true) {
			// filter gpu nodes
			availableNodes = fn.filterNodesByAllow(availableNodes, 'GPUWorkload')
		} else if (wantsCpu == false && wantsGpu == false) {
			// every node is ok, but we choose cpu only
			availableNodes = fn.filterNodesByAllow(availableNodes, 'CPUWorkload')
		}

		pipe.data.availableNodes[workload._p.id] = availableNodes
	}
	pipe.next()
})

pipe.step('selectorsCheck', async (pipe, workloads) => {
	for (var workloadIndex = 0; workloadIndex < workloads.workloads.length; workloadIndex += 1) {
		let workload = workloads.workloads[workloadIndex]
		//console.log('Analyze', workloadIndex, workload._p.metadata.name)
		// Check node selector
		let availableNodes = pipe.data.availableNodes[workload._p.id]
		availableNodes = fn.nodeSelector(workload._p.spec.selectors, availableNodes)
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_NODE_SELECTOR)
			continue
		}
		// Check gpu selector
		availableNodes = fn.gpuSelector(workload._p.spec.selectors, availableNodes)
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_GPU_SELECTOR)
			continue
		}
		// Check cpu selector
		availableNodes = fn.cpuSelector(workload._p.spec.selectors, availableNodes)
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_CPU_SELECTOR)
			continue
		}
	
		// Now check available and numbers
		let requiredCpu = fn.getRequiredCpu(workload._p.spec.selectors)
		let requiredGpu = fn.getRequiredGpu(workload._p.spec.selectors)
	
		let finalRequirements = [] 
		availableNodes.forEach((node) => {
			//let availableGpu = fn.gpuMemoryStatus(node._p.properties.gpu)
			let availableGpu = fn.gpuProcessStatus(node._p.properties.gpu, pipe.data.alreadyAssignedGpu)
			availableGpu = fn.gpuNumberStatus(availableGpu, workload._p, pipe.data.alreadyAssignedGpu)
			let availableCpu = fn.cpuNumberStatus(node._p.properties.cpu, workload._p, pipe.data.alreadyAssignedCpu)
			finalRequirements.push({
				node: node._p.metadata.name,
				nodeProperties: node._p.properties,
				availableGpu: availableGpu,
				wantsGpu: fn.wantsGpu(workload._p.spec.selectors),
				availableCpu: availableCpu,
				wantsCpu: fn.wantsCpu(workload._p.spec.selectors),
				toSelect: false
			})
			let lfr = finalRequirements[finalRequirements.length - 1]
			if (lfr.wantsCpu == true && lfr.availableCpu.length > 0) {
				lfr.toSelect = lfr.availableCpu.length > 0 ? true : false
			} 
			if (lfr.wantsGpu == true && lfr.availableGpu.length > 0) {
				lfr.toSelect = lfr.availableGpu.length > 0 ? true : false
			} 
		})
	
		let seletected = false
		
		/** This randomize the selected node if 
		*	many are available
		*/
		if (finalRequirements.length > 0) {
    		function shuffleArr (array) {
    		    for (var i = array.length - 1; i > 0; i--) {
    		        var rand = Math.floor(Math.random() * (i + 1));
    		        [array[i], array[rand]] = [array[rand], array[i]]
    		    }
    		}
    		shuffleArr(finalRequirements)
		}
		finalRequirements.some ((fr) => {
			if (fr.toSelect == true) {
				workload._p.scheduler = {}
				if (fr.wantsCpu == true) {
					if (workload._p.spec.selectors.cpu !== undefined 
						&& workload._p.spec.selectors.cpu.exclusive !== undefined
						&& workload._p.spec.selectors.cpu.exclusive == false) {
						fr.availableCpu = fr.availableCpu.map((cpu) => { 
							cpu.exclusive = false
							return cpu
						})
					}  
					workload._p.scheduler.cpu = fr.availableCpu
				}
				if (fr.wantsGpu == true) {
					workload._p.scheduler.gpu = fr.availableGpu
				}
				if (workload._p.spec.volumes !== undefined) {
					workload._p.scheduler.volume = workload._p.spec.volumes
				}
				workload._p.scheduler.node = fr.node
				workload._p.scheduler.nodeProperties = fr.nodeProperties
				seletected = true
				return true
			} 
		})
		if (seletected == false) {
			workload._p.currentStatus = GE.WORKLOAD.DENIED
			workload._p.status.push(GE.status(GE.WORKLOAD.DENIED, GE.ERROR.NO_MATCHS))
			await workload.update()
			continue
		} 
		// Create volumes
		let dataVolumes = []
		if (seletected == true && workload._p.spec.volumes !== undefined) {
			let alreadyPresentVolumesNames = pipe.data.volumes.map((vol) => { return vol._p.metadata.group + '.' + vol._p.metadata.name })
			for (var i = 0; i < workload._p.spec.volumes.length; i += 1) {
				let vol = workload._p.spec.volumes[i]
				let groupOverride = vol.group !== undefined ? vol.group : workload._p.metadata.group
				if (groupOverride !== workload._p.metadata.group) {
					// Check user permission on this volume
				}
				if (!alreadyPresentVolumesNames.includes(groupOverride + '.' + vol.name)) {
					if (vol.autoCreate == true) {
						let newVol = new Volume ({
							apiVersion: 'v1',
							kind: 'Volume',
							metadata: {
								name: vol.name,
								group: groupOverride
							},
							spec: {
								storage: vol.storage !== undefined ? vol.storage : workload._p.scheduler.node + '-local', // Check if local node support volumes
								subPath: vol.subPath !== undefined ? vol.subPath : vol.name,
								policy: vol.policy !== undefined ? vol.policy : 'rw',
								group: groupOverride
							}
						})
						await newVol.create()
						dataVolumes.push(fn.volumeData(newVol, pipe.data.storages, pipe.data.nodes, vol.target))
					} else {
						workload._p.locked = false
						workload._p.currentStatus = GE.WORKLOAD.INSERTED
						workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED, GE.ERROR.VOLUME_NOT_EXIST))
						await workload.update()
						continue
					}
				} else {
					let vol = workload._p.spec.volumes[i]
					let tmpVol = new Volume()
					let prevVol = await tmpVol.findOneAsResource({metadata: { name: vol.name, group: groupOverride }}, Volume)
					dataVolumes.push(fn.volumeData(prevVol, pipe.data.storages, pipe.data.nodes, vol.target))
				}
			}
		}
		for (var k = 0; k < dataVolumes.length; k += 1) {
		//dataVolumes.forEach((dataVolume) => {
			let dataVolume = dataVolumes[k]
			if (dataVolume.errors.length !== 0) {
				workload._p.currentStatus = GE.WORKLOAD.INSERTED
				workload._p.locked = false 
				workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED, dataVolume.errors[0]))
				await workload.update()
				continue
			}
		//})
		}
		if (seletected == false) {
			continue
		} else {
			if (workload._p.scheduler !== undefined) {
				workload._p.scheduler.volume = dataVolumes	
			}
			let containerName = GE.containerName(workload._p)
			if (workload._p.scheduler.container == undefined || workload._p.scheduler.container.name == undefined) {
				workload._p.scheduler.container = {}
				workload._p.scheduler.container.name = containerName
				workload._p.scheduler.container.launchedRequest = []		
			}
			await GE.LOCK.API.acquireAsync()
			if (workload._p.scheduler.gpu !== undefined) {
				workload._p.scheduler.gpu.forEach((gpu) => {
					pipe.data.alreadyAssignedGpu.push(gpu.uuid)
				})
			}
			if (workload._p.scheduler.cpu !== undefined) {
				workload._p.scheduler.cpu.forEach((cpu) => {
					console.log('Pushing', cpu.uuid)
					if (cpu.exclusive !== false) {
						pipe.data.alreadyAssignedCpu.push(cpu.uuid)
					}
				})
			}
			GE.LOCK.API.release()
			workload._p.locked = true
			workload._p.currentStatus = GE.WORKLOAD.ASSIGNED
			workload._p.status.push(GE.status(GE.WORKLOAD.ASSIGNED, null))
			//console.log('-> Assign', workloadIndex, workload._p.metadata.name)
			let formattedWorkload = fn.formatWorkload(workload._p)
			workload._p.scheduler.request = formattedWorkload
			await workload.update()
		}
	}
	pipe.next()
})
module.exports = scheduler