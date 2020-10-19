'use strict'

const GE = require('../../events/global')
let axios = require('axios')


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('launchWorkload')
let request = require('../fn/request')

async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.LAUNCHING
		workload._p.status.push(GE.status(GE.WORKLOAD.LAUNCHING, err))
		await workload.update()
	}
}

pipe.step('checkWorkloadStatus', async function (pipe, workload) {
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
		let node = pipe.data.nodes.filter((node) => {return node._p.metadata.name == workload._p.scheduler.node})
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
		pipe.end()
	})
})

pipe.step('launchRequest', async function (pipe, workload, args) {
	workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_LAUNCH))
	workload._p.currentStatus = GE.WORKLOAD.REQUESTED_LAUNCH
	let containerName = GE.containerName(workload._p)
	if (workload._p.scheduler.container == undefined || workload._p.scheduler.container.name == undefined) {
		workload._p.scheduler.container = {}
		workload._p.scheduler.container.name = containerName
		workload._p.scheduler.container.launchedRequest = []		
	}
	workload._p.scheduler.container.launchedRequest.push({node: args[0]._p.spec.address[0], date: new Date()})
	await workload.update()

	request({
		method: 'post',
		node: args[0],
		path: '/' + workload._p.apiVersion + '/' + workload._p.spec.driver + '/workloadcreate',
		body: {data: workload._p},
		then: async (res) => {
			if (res.data.started == true && res.data.stderr == '') {
				console.log('---> C R E A T E D', workload._p.metadata.name, res.data.container.id)
				workload._p.status.push(GE.status(GE.WORKLOAD.RUNNING))
				workload._p.currentStatus = GE.WORKLOAD.RUNNING
				workload._p.scheduler.container.id = res.data.container.id
				workload._p.scheduler.container.name = containerName
				workload._p.scheduler.container.pull = res.data.pullResult
				workload._p.scheduler.container.startDate = new Date()
				await workload.update()
			} else {
				console.log('#NOT# C R E A T E D')
			}
		},
		err: (res) => {
			console.log('NODE', args[0]._p.metadata.name, 'IS DEAD')
		}
	})
	pipe.end()
})



module.exports = scheduler