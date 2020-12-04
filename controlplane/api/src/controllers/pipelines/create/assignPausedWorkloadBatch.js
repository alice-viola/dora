'use strict'

const GE = require('../../../events/global')
let api = {v1: require('../../../api')}
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let fn = require ('../../fn/fn')
let Volume = require ('../../../models/volume')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('assignPausedWorkloadBatch')
let User = require ('../../../models/user')
let Workload = require ('../../../models/workload')
let request = require('../../fn/request')

async function statusWriter(workload, status, err) {
	if (workload._p.status[workload._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		workload._p.currentStatus = status
		workload._p.status.push(GE.status(status, err))
		await workload.update()
	}
}

pipe.step('userSelection', async (pipe, workloads) => {

	let queue = []
	pipe.data.userWorkload = {}
	for (var i = 0; i < workloads.workloads.length; i += 1) {
		let workload = workloads.workloads[i]
		queue.push((cb) => {
			api['v1']._getOne({kind: 'User', metadata: {name: workload._p.user.user, group: workload._p.user.userGroup}}, (err, _user) => {
				pipe.data.userWorkload[workload._p.id] = _user
				cb(null)
			})
		})
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN PAUSED WORKLOAD BATCH IN USER FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
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
			await statusWriter(workload, GE.WORKLOAD.PAUSED, GE.LIMIT.TO_MANY_WORKLOADS)
			continue
		}
	
		// Check credits status
		if (selectedUser._p.account !== undefined 
			&& selectedUser._p.account.status !== undefined
			&& selectedUser._p.account.status.outOfCredit == true) {
			workload._p.locked = false
			await statusWriter(workload, GE.WORKLOAD.PAUSED, GE.LIMIT.OUT_OF_CREDITS)
			continue
		}


		let resources = []
		let wkType = null
		if (workload._p.scheduler._cpu !== undefined) {
			wkType = 'cpu'
			resources = workload._p.scheduler._cpu
		} else if (workload._p.scheduler._gpu !== undefined) {
			wkType = 'gpu'
			resources = workload._p.scheduler._gpu
		} else {
			continue
		}
		let resourceType = null
		let resourceCount = resources.length
		resources.some((resource) => {
			resourceType = resource.product_name
			return true
		})
		let oldNode = workload._p.scheduler.nodeProperties
		let availableResources = null
		if (wkType == 'cpu') {
			availableResources = fn.cpuNumberStatus(oldNode.cpu, workload._p, pipe.data.alreadyAssignedCpu)	
		} else {
			availableResources = fn.gpuProcessStatus(oldNode.gpu, pipe.data.alreadyAssignedGpu)
			availableResources = fn.gpuNumberStatus(availableGpu, workload._p, pipe.data.alreadyAssignedGpu)			
		}

		if (availableResources == null || availableResources.length == 0) {
			await statusWriter(workload, GE.WORKLOAD.PAUSED, GE.ERROR.NO_AVAILABLE_RESOURCES)	
			continue
		}


		await GE.LOCK.API.acquireAsync()
		if (workload._p.scheduler.gpu !== undefined) {
			workload._p.scheduler.gpu = availableResources
			workload._p.scheduler.gpu.forEach((gpu) => {
				pipe.data.alreadyAssignedGpu.push(gpu.uuid)
			})
		}
		if (workload._p.scheduler.cpu !== undefined) {
			workload._p.scheduler.cpu = availableResources
			workload._p.scheduler.cpu.forEach((cpu) => {
				if (cpu.exclusive !== false) {
					pipe.data.alreadyAssignedCpu.push(cpu.uuid)
				}
			})
		}
		let formattedWorkload = fn.formatWorkload(workload._p)
		if (formattedWorkload == null) {
			GE.LOCK.API.release()
			await statusWriter(workload, GE.WORKLOAD.PAUSED, GE.ERROR.EXPECTION)
			continue
		}

		console.log('WWWW')
		workload._p.scheduler.request = formattedWorkload
		await statusWriter(workload, GE.WORKLOAD.ASSIGNED, null)	
		await workload.update()
		GE.LOCK.API.release()

	}
	pipe.next()
})

module.exports = scheduler