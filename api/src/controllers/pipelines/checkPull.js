'use strict'

const GE = require('../../events/global')
let axios = require('axios')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('checkPull')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.REQUESTED_PULLING
		workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_PULLING, err))
		await workload.update()
	}
}

// TODO CHANGE THIS NAME AND TEST
pipe.step('checkWorkloadStatus', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
		return
	}
	if (workload._p.currentStatus == GE.WORKLOAD.REQUESTED_PULLING) {
		pipe.next()
	} else {
		pipe.end()	
	}
})

pipe.step('checkPullStatus', async function (pipe, workload) {
	// TODO for every GPU
	let numberOfRequest = workload._p.scheduler.container.launchedRequest.length
	let nodeAddress = workload._p.scheduler.container.launchedRequest[numberOfRequest - 1].node
	axios.post('http://' + nodeAddress + '/workload/pull/status', {
		registry: workload._p.spec.image.registry,
		image: workload._p.spec.image.image,
		pullUid: workload._p.scheduler.container.pullUid
	}, {timeout: 3000}).then(async function (res) {
		if (res.data.status == 'error') {
			workload._p.currentStatus = GE.WORKLOAD.ERROR
			workload._p.status.push(GE.status(GE.WORKLOAD.ERROR, GE.ERROR.PULL_FAILED))
			workload._p.status.locked = false
			await workload.update()
		} else if (res.data.status == 'done') {
			workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
			workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, null))
			await workload.update()
		}
	}).catch((err) => {
		console.log('NODE', nodeAddress ,'IS DEAD',err)
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
	pipe.end()
})

module.exports = scheduler