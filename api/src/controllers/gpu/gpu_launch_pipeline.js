'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipe
let axios = require('axios')
let pipe = new Pipe()


async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
		workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, err))
		await workload.update()
		pipe.end()
	} else {
		//pipe.end()
	}
}

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
		return
	}
	if (workload._p.currentStatus == GE.WORKLOAD.ASSIGNED) {
		workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING))
		workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
		await workload.update()
		pipe.end()
	} else {
		pipe.next()	
	}
})

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.WORKLOAD.LAUNCHING) {
		let node = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.gpu[0].node})
		pipe.next(node)
	} else {
		pipe.end()	 
	}
})

pipe.step('pingNode', async function (pipe, workload, args) {
	console.log('READY TO LAUNCH ON NODE', args[0]._p.metadata.name)
	axios.get('http://' + args[0]._p.spec.address[0] + '/alive', {timeout: 1000}).then((res) => {
		console.log('NODE', args[0]._p.metadata.name, 'IS ALIVE')
		statusWriter (workload, pipe, {err: null})
		pipe.next(args)
	}).catch((err) => {
		console.log('NODE', args[0]._p.metadata.name, 'IS DEAD', err)
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
	})
})

pipe.step('launchRequest', async function (pipe, workload, args) {
	console.log('LAUNCHING ON NODE', args[0]._p.metadata.name, args[0]._p.spec.address[0])

	axios.post('http://' + args[0]._p.spec.address[0] + '/workload/create', {
		name: workload._p.metadata.name,
		registry: workload._p.spec.image.registry,
		image: workload._p.spec.image.image
	}).then(async (res) => {
		if (res.data.started == true) {
			console.log('C R E A T E D', res.data.container.id)
			workload._p.status.push(GE.status(GE.WORKLOAD.RUNNING))
			workload._p.currentStatus = GE.WORKLOAD.RUNNING
			workload._p.scheduler.container = {}
			workload._p.scheduler.container.id = res.data.container.id
			workload._p.scheduler.container.pull = res.data.pullResult
			await workload.update()
			pipe.end()
		} else {
			console.log('#NOT# C R E A T E D')
			pipe.end()
		}
	}).catch((err) => {
		console.log('NODE', args[0]._p.metadata.name, 'IS DEAD', err)
		//statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
})



module.exports = pipe