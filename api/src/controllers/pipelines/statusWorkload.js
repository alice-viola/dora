'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipeline
let axios = require('axios')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('statusWorkload')


async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.RUNNING
		workload._p.status.push(GE.status(GE.WORKLOAD.RUNNING, err))
		await workload.update()
		//pipe.end()
	} 
}

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload !== undefined && workload._p.currentStatus == GE.WORKLOAD.RUNNING) {
		let node = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.node})
		pipe.next(node)
	} else {
		pipe.end()	 
	}
})

pipe.step('pingNode', async function (pipe, workload, args) {
	axios.get('http://' + args[0]._p.spec.address[0] + '/alive', {timeout: 3000}).then((res) => {
		statusWriter (workload, pipe, {err: null})
		pipe.next(args)
		statusWriter (workload, pipe, {err: null})
	}).catch((err) => {
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
})

pipe.step('statusRequest', async function (pipe, workload, args) {
	axios.post('http://' + args[0]._p.spec.address[0] + '/workload/status', {
		name: workload._p.metadata.name,
		registry: workload._p.spec.image.registry,
		image: workload._p.spec.image.image,
		id: workload._p.scheduler.container.id
	}).then(async (res) => {
		switch (res.data.inspect) {
			case 'done':
				let lastStatus = workload._p.status[workload._p.status.length -1]
				if (lastStatus.status !== res.data.info.State.Status.toUpperCase()) {
					workload._p.status.push(GE.status(res.data.info.State.Status.toUpperCase()))
					workload._p.locked = false
					workload._p.currentStatus = res.data.info.State.Status.toUpperCase()
					workload._p.scheduler.container.endDate = new Date()
					await workload.update()
				}
				pipe.end()
				break

			case 'error':
				workload._p.status.push(GE.status(GE.WORKLOAD.CRASHED))
				workload._p.currentStatus = GE.WORKLOAD.CRASHED
				workload._p.locked = false
				workload._p.scheduler.container.endDate = new Date()
				await workload.update()
				pipe.end()
				break

			case 'notpresent':
				workload._p.status.push(GE.status(GE.WORKLOAD.UNKNOWN))
				workload._p.currentStatus = GE.WORKLOAD.UNKNOWN
				workload._p.locked = false
				workload._p.scheduler.container.endDate = new Date()
				await workload.update()
				pipe.end()
				break
		}
	}).catch((err) => {
		console.log('NODE', args[0]._p.metadata.name, 'IS DEAD', err)
		//statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
})



module.exports = scheduler