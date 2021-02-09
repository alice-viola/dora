'use strict'

const GE = require('../../../../libcommon').events
let api = {v1: require('../../../../libcommon').api}
let Models = require('../../../../libcommon').models
let Workload = Models.Workload
let User = Models.User
let Bind = Models.Bind
let DeletedResource = Models.DeletedResource
let ResourceCredit = Models.ResourceCredit
let Volume = Models.Volume

let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let fn = require ('../../fn/fn')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('assignWorkloadBatch')

async function statusWriter(workload, status, err) {
	if (workload._p.status[workload._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
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

pipe.step('userSelection', async (pipe, workloads) => {
	let queue = []
	pipe.data.userWorkload = {}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		queue.push((cb) => {
			api['v1']._getOne({kind: 'User', metadata: {name: workload._p.user.user, group: workload._p.user.userGroup}}, (err, _user) => {
				pipe.data.userWorkload[workload._p._id] = _user
				cb(null)
			})
		})
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN WORKLOAD BATCH IN USER FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
})

pipe.step('nodeSelectorsCheck', async (pipe, workloads) => {
	pipe.data.availableNodes = {}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		if (workload._p.spec.selectors == undefined) {
			workload._p.spec.selectors = {}
			workload._p.spec.selectors.cpu = {product_name: GE.LABEL.PWM_ALL, count: 1}
		}
		if (pipe.data.nodes == undefined) {
			pipe.endRunner()
			return
		}
	
		let availableNodes = JSON.parse(JSON.stringify(pipe.data.nodes))
		availableNodes = fn.filterNodeByUser(availableNodes, pipe.data.userWorkload[workload._p._id])
		
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_NODE_SELECTOR)
			continue
		}
		availableNodes = fn.filterNodeStatus(availableNodes)
		
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_NODE_SELECTOR)
			continue
		}
		//await statusWriter(workload, workload._p.currentStatus, null)
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
		pipe.data.availableNodes[workload._p._id] = availableNodes
	}
	pipe.next()
})

pipe.step('selectorsCheck', async (pipe, workloads) => {
	for (var workloadIndex = 0; workloadIndex < workloads.workloads.length; workloadIndex += 1) {
		let workload = workloads.workloads[workloadIndex]
		// User
		let selectedUser = null
		for (var userIndex = 0; userIndex < pipe.data.users.length; userIndex += 1) {
			if (pipe.data.users[userIndex]._p.metadata.name == workload._p.user.user) {
				selectedUser = pipe.data.users[userIndex]
				break
			}
		}

		// Check max count on concurrent workloads, if any
		let wks = await Workload.FindByUser(workload._p.user.user)
		if (fn.checkWorkloadCountLimit(wks.length, selectedUser)) {
			await statusWriter(workload, GE.WORKLOAD.DENIED, GE.LIMIT.TO_MANY_WORKLOADS)
			continue
		}

		// Check credits status
		if (selectedUser._p.account !== undefined 
			&& selectedUser._p.account.status !== undefined
			&& selectedUser._p.account.status.outOfCredit == true) {
			workload._p.locked = false
			await statusWriter(workload, GE.WORKLOAD.DENIED, GE.LIMIT.OUT_OF_CREDITS)
			continue
		}


		// Check node selector
		let availableNodes = pipe.data.availableNodes[workload._p._id]
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

		// After the previus selectors, check limits
		availableNodes = fn.filterNodesByLimits(availableNodes, selectedUser)
		if (availableNodes.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_NODE_SELECTOR)
			continue
		}

		// Now check available and numbers
		let requiredCpu = fn.getRequiredCpu(workload._p.spec.selectors)
		let requiredGpu = fn.getRequiredGpu(workload._p.spec.selectors)

		let finalRequirements = [] 
		availableNodes.forEach((node) => {
			let availableGpu = fn.gpuProcessStatus(node._p.properties.gpu, pipe.data.alreadyAssignedGpu)
			availableGpu = fn.gpuNumberStatus(availableGpu, workload._p, pipe.data.alreadyAssignedGpu)
			let availableCpu = fn.cpuNumberStatus(node._p.properties.cpu, workload._p, pipe.data.alreadyAssignedCpu)

			// Filter gpu and cpus by limits if any
			availableCpu = fn.filterCPUByLimits(availableCpu, selectedUser) 
			availableGpu = fn.filterGPUByLimits(availableGpu, selectedUser) 

			finalRequirements.push({
				_node: node,
				node: node._p.metadata.name,
				nodeProperties: node._p.properties,
				nodeAddress: node._p.spec.address,
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
		let selectedNode = null
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
				selectedNode = fr._node
				workload._p.scheduler.nodeId = fr.nodeId
				workload._p.scheduler.node = fr.node
				workload._p.scheduler.nodeProperties = fr.nodeProperties
				workload._p.scheduler.nodeProperties.address = fr.nodeAddress
				seletected = true
				return true
			} 
		})
		if (seletected == false) {
			workload._p.locked = false
			statusWriter(workload, GE.WORKLOAD.QUENED, GE.ERROR.NO_AVAILABLE_RESOURCES)
			continue
		} 
		// Create volumes
		let dataVolumes = []
		if (seletected == true && workload._p.spec.volumes !== undefined) {
			let alreadyPresentVolumesNames = pipe.data.volumes.map((vol) => { return vol._p.metadata.group + '.' + vol._p.metadata.name })
			for (var i = 0; i < workload._p.spec.volumes.length; i += 1) {
				let vol = workload._p.spec.volumes[i]
				// Check if user as access to the selected storage
				let availableStorage = fn.filterStorageByUser(pipe.data.storages, pipe.data.userWorkload[workload._p._id])
				if (availableStorage.length == 0) {
					await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_STORAGE_SELECTOR)
					seletected = false
					break
				} else {
					if (!availableStorage.map((storage) => { return storage._p.metadata.name }).includes(vol.storage)) {
						await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_STORAGE_SELECTOR)
						seletected = false
						break
					}
				}

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
						await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.VOLUME_NOT_EXIST)
						seletected = false
						continue
					}
				} else {
					let vol = workload._p.spec.volumes[i]
					let tmpVol = new Volume()
					let prevVol = await tmpVol.findOneAsResource({metadata: { name: vol.name, group: groupOverride }}, Volume)

					if (prevVol == undefined || prevVol._p == undefined || prevVol._p.currentStatus !== GE.VOLUME.CREATED) {
						await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.VOLUME_NOT_READY)
						seletected = false
						break
					} else {
						dataVolumes.push(fn.volumeData(prevVol, pipe.data.storages, pipe.data.nodes, vol.target))	
					}
				}
			}
		}
		if (seletected == true) {
			for (var k = 0; k < dataVolumes.length; k += 1) {
				let dataVolume = dataVolumes[k]
				if (dataVolume.errors.length !== 0) {				
					seletected = false
					workload._p.locked = false 
					await statusWriter(workload, GE.WORKLOAD.INSERTED, dataVolume.errors[0])
					continue
				}
			}
		}

		if (seletected == false) {
			continue
		} else {
			let resourcesToAssign = []
			if (workload._p.scheduler !== undefined) {
				workload._p.scheduler.volume = dataVolumes	
			}
			let containerName = GE.containerName(workload._p)
			if (workload._p.scheduler.container == undefined || workload._p.scheduler.container.name == undefined) {
				workload._p.scheduler.container = {}
				workload._p.scheduler.container.name = containerName
				workload._p.scheduler.container.launchedRequest = []		
				workload._p.scheduler.container.pullPolicy = workload._p.spec.image.pullPolicy || 'IfNotPresent'
			}
			await GE.LOCK.API.acquireAsync()
			if (workload._p.scheduler.gpu !== undefined) {
				workload._p.scheduler.gpu.forEach((gpu) => {
					resourcesToAssign.push(gpu.product_name)
					pipe.data.alreadyAssignedGpu.push(gpu.uuid)
				})
			}
			if (workload._p.scheduler.cpu !== undefined) {
				workload._p.scheduler.cpu.forEach((cpu) => {
					if (cpu.exclusive !== false) {
						resourcesToAssign.push(cpu.product_name)
						pipe.data.alreadyAssignedCpu.push(cpu.uuid)
					}
				})
			}


			let formattedWorkload = fn.formatWorkload(workload._p)
			if (formattedWorkload == null || formattedWorkload == undefined) {
				workload._p.locked = false
				await statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EXPECTION)
			} else {
				// Binds creation
				for (var volumeIndex = 0; volumeIndex < dataVolumes.length; volumeIndex += 1) {
					Bind.Create(dataVolumes[volumeIndex].vol, workload)
				}
				Bind.Create(selectedNode, workload)
				for (var groupIndex = 0; groupIndex < pipe.data.groups.length; groupIndex += 1) {
					if (pipe.data.groups[groupIndex]._p.metadata.name == workload._p.metadata.group) {
						Bind.Create(pipe.data.groups[groupIndex], workload)
						break
					}
				}
				Bind.Create(selectedUser, workload)
				/**
				*	Save assigned resources
				*/
				for (var resourcesToAssignIndex = 0; resourcesToAssignIndex < resourcesToAssign.length; resourcesToAssignIndex += 1) {
					workload._p.creditsPerHour += await ResourceCredit.CreditForResourcePerHour(resourcesToAssign[resourcesToAssignIndex]) 	
				}
				workload._p.locked = true
				workload._p.scheduler.request = formattedWorkload
				await statusWriter(workload, GE.WORKLOAD.ASSIGNED, null)
			}
			//await workload.update()
			GE.LOCK.API.release()
		}
	}
	pipe.next()
})
module.exports = scheduler