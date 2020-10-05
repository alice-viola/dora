'use strict'

const GE = require('../../events/global')
let axios = require('axios')


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('gpuCheckRequestedLaunchWorkload')


async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.REQUESTED_LAUNCH
		workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_LAUNCH, err))
		await workload.update()
	}
}

// TODO CHANGE THIS NAME AND TEST
pipe.step('checkWorkloadStatus', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
		return
	}
	if (workload._p.currentStatus == GE.WORKLOAD.REQUESTED_LAUNCH) {
		pipe.next()
	} else {
		pipe.end()	
	}
})

pipe.step('requestedLaunchNumberCheck', async function (pipe, workload) {
	
	let numberOfRequest = workload._p.scheduler.container.launchedRequest.length
	console.log('-->', numberOfRequest)
	if (numberOfRequest - 1 < GE.DEFAULT.MAX_LAUNCH_ATTEMPTS) {
		console.log('--> checking time', 
			new Date - new Date(workload._p.scheduler.container.launchedRequest[numberOfRequest - 1].date) )
		if (new Date - new Date(workload._p.scheduler.container.launchedRequest[numberOfRequest - 1].date) 
			> GE.DEFAULT.MS_BETWEEN_LAUNCH_ATTEMPTS) {
			console.log('Retry')
		  	pipe.next()
		} 
	} else {
		workload._p.currentStatus = GE.WORKLOAD.STUCK
		workload._p.status.push(GE.status(GE.WORKLOAD.STUCK, GE.ERROR.MAX_RETRY_REACH))
		workload._p.locked = false
		await workload.update()
	}
	pipe.end()
})

pipe.step('pingNode', async function (pipe, workload) {
	// TODO for every GPU
	let numberOfRequest = workload._p.scheduler.container.launchedRequest.length
	let nodeAddress = workload._p.scheduler.container.launchedRequest[numberOfRequest - 1].node
	axios.get('http://' + nodeAddress + '/alive', {timeout: 3000}).then(function (res) {
		axios.post('http://' + nodeAddress + '/workload/status', {
			name: workload._p.metadata.name,
			registry: workload._p.spec.image.registry,
			image: workload._p.spec.image.image,
			gpu: {
				minor_number: workload._p.scheduler.gpu[0].minor_number
			}
		}, {timeout: 5000}).then(async (res) => {
			console.log('---> REQ LAUNCH S T A T U S', res.data.inspect)
			if (res.data.inspect == 'error') {
				workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
				workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, GE.ERROR.UNKNOWN ))
				workload._p.scheduler.container.launchedRequest.push({date: new Date(), node: nodeAddress})
				await workload.update()
				pipe.end()	
			} else {
				console.log('VIP::', res.data.inspect)
				pipe.end()
			}
		}).catch((err) => {
			console.log('STATUS CHECK', err)
			statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
			pipe.end()
		})
	}).catch((err) => {
		console.log('NODE', nodeAddress ,'IS DEAD')
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
})

module.exports = scheduler