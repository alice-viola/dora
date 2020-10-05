'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipe
let axios = require('axios')
let pipe = new Pipe()


async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.REQUESTED_CANCEL
		workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_CANCEL, err))
		await workload.update()
		pipe.end()
	} else {
		//pipe.end()
	}
}

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload !== undefined && workload._p.currentStatus == GE.WORKLOAD.REQUESTED_CANCEL) {
		let node = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.gpu[0].node})
		pipe.next(node)
	} else {
		pipe.end()	 
	}
})

pipe.step('pingNode', async function (pipe, workload, args) {
	axios.get('http://' + args[0]._p.spec.address[0] + '/alive', {timeout: 1000}).then((res) => {
		statusWriter (workload, pipe, {err: null})
		pipe.next(args)
	}).catch((err) => {
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
	})
})

pipe.step('stopAndDelete', async function (pipe, workload, args) {
	if (workload._p.scheduler.container == undefined) {
		workload._p.status.push(GE.status('EXITED'))
		workload._p.currentStatus = 'EXITED'
		await workload.update()
		pipe.end()
		return
	}
	axios.post('http://' + args[0]._p.spec.address[0] + '/workload/delete', {
		name: workload._p.metadata.name,
		registry: workload._p.spec.image.registry,
		image: workload._p.spec.image.image,
		id: workload._p.scheduler.container.id
	}).then(async (res) => {
		console.log('--->', res.data)
		switch (res.data.remove) {
			case 'done':
				//statusWriter (workload, pipe, {err: res.data.info.State.Status})
				workload._p.status.push(GE.status('EXITED'))
				workload._p.currentStatus = 'EXITED'
				workload._p.scheduler.container.endDate = new Date()
				await workload.update()
				pipe.end()
				break

			case 'error':
				workload._p.status.push(GE.status(GE.WORKLOAD.UNKNOWN))
				workload._p.currentStatus = GE.WORKLOAD.UNKNOWN
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



module.exports = pipe