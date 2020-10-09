'use strict'

const GE = require('../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let fn = require ('../fn/fn')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('assignWorkload')

async function statusWriter(workload, status, err) {
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = status
		workload._p.status.push(GE.status(status, err))
		await workload.update()
	}
}

pipe.step('initWorkload', async (pipe, workload) => {
	if (workload == undefined) {
		pipe.end()
		return
	}
	//pipe.endRunner()
	pipe.next()
})

pipe.step('initWorkload', async (pipe, workload) => {
	if (workload._p.currentStatus == undefined) {
		workload._p.currentStatus = GE.WORKLOAD.INSERTED
		workload._p.status.push(GE.status(GE.WORKLOAD.INSERTED))
		await workload.update()	
		pipe.end()
	}
	pipe.next()
})

pipe.step('nodeSelectorsCheck', async (pipe, workload) => {
	if (workload._p.currentStatus != GE.WORKLOAD.INSERTED) {
		pipe.end()
		return
	}

	if (workload._p.spec.selectors == undefined) {
		workload._p.spec.selectors = {}
		workload._p.spec.selectors.cpu = {product_name: 'pwm.all', count: 1}
	}
	
	let availableNodes = JSON.parse(JSON.stringify(pipe.data.nodes))

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
	pipe.data.availableNodes = availableNodes
	pipe.next()
})

pipe.step('selectorsCheck', async (pipe, workload) => {
	// Check node selector
	let availableNodes = pipe.data.availableNodes
	availableNodes = fn.nodeSelector(workload._p.spec.selectors, availableNodes)
	if (availableNodes.length == 0) {
		statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_NODE_SELECTOR)
		pipe.end()
		return
	}
	// Check gpu selector
	availableNodes = fn.gpuSelector(workload._p.spec.selectors, availableNodes)
	if (availableNodes.length == 0) {
		statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_GPU_SELECTOR)
		pipe.end()
		return
	}
	// Check cpu selector
	availableNodes = fn.cpuSelector(workload._p.spec.selectors, availableNodes)
	if (availableNodes.length == 0) {
		statusWriter(workload, GE.WORKLOAD.INSERTED, GE.ERROR.EMPTY_CPU_SELECTOR)
		pipe.end()
		return
	}

	// Now check available and numbers
	let requiredCpu = fn.getRequiredCpu(workload._p.spec.selectors)
	let requiredGpu = fn.getRequiredGpu(workload._p.spec.selectors)

	let finalRequirements = [] 
	availableNodes.forEach((node) => {
		let availableGpu = fn.gpuMemoryStatus(node._p.properties.gpu)
		availableGpu = fn.gpuNumberStatus(availableGpu, workload._p, pipe.data.alreadyAssignedGpu)
		let availableCpu = fn.cpuNumberStatus(node._p.properties.cpu, workload._p, pipe.data.alreadyAssignedCpu)
		finalRequirements.push({
			node: node._p.metadata.name,
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
	//console.log(finalRequirements) 
	let seletected = false
	finalRequirements.some ((fr) => {
		if (fr.toSelect == true) {
			workload._p.scheduler = {}
			if (fr.wantsCpu == true) {
				workload._p.scheduler.cpu = fr.availableCpu
			}
			if (fr.wantsGpu == true) {
				workload._p.scheduler.gpu = fr.availableGpu
			}
			if (workload._p.spec.volumes !== undefined) {
				workload._p.scheduler.volume = workload._p.spec.volumes
			}
			workload._p.locked = true
			workload._p.scheduler.node = fr.node
			workload._p.currentStatus = GE.WORKLOAD.ASSIGNED
			workload._p.status.push(GE.status(GE.WORKLOAD.ASSIGNED, null))
			seletected = true
			return true
		}
	})
	if (seletected == false) {
		workload._p.currentStatus = GE.WORKLOAD.DENIED
		workload._p.status.push(GE.status(GE.WORKLOAD.DENIED, GE.ERROR.NO_MATCHS))
	}
	await workload.update()
	if (seletected == false) {
		pipe.end()
	} else {
		pipe.endRunner()
	}
})
module.exports = scheduler