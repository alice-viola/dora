'use strict'

const GE = require('../../events/global')
let axios = require('axios')
let randomstring = require('randomstring')


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('pullWorkload')

let request = require('../fn/request')


async function statusWriter (workload, pipe, args) {
	let err = args.err
	if (workload._p.status[workload._p.status.length -1].reason !== err) {
		workload._p.currentStatus = GE.WORKLOAD.PULLING
		workload._p.status.push(GE.status(GE.WORKLOAD.PULLING, err))
		await workload.update()
	}
}

pipe.step('checkWorkloadStatus', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
		return
	}
	if (workload._p.currentStatus == GE.WORKLOAD.ASSIGNED) {
		workload._p.status.push(GE.status(GE.WORKLOAD.PULLING))
		workload._p.currentStatus = GE.WORKLOAD.PULLING
		await workload.update()
		pipe.end()
	} else {
		pipe.next()	
	}
})

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload._p.currentStatus == GE.WORKLOAD.PULLING) {
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
		console.log('NODE', args[0]._p.metadata.name, 'IS DEAD')
		statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
	})
})

pipe.step('pullRequest', async function (pipe, workload, args) {
	workload._p.status.push(GE.status(GE.WORKLOAD.REQUESTED_PULLING))
	workload._p.currentStatus = GE.WORKLOAD.REQUESTED_PULLING
	if (workload._p.scheduler.container == undefined) {
		workload._p.scheduler.container = {}
		workload._p.scheduler.container.launchedRequest = []		
	}
	workload._p.scheduler.container.pullUid = randomstring.generate(24)
	workload._p.scheduler.container.launchedRequest.push({node: args[0]._p.spec.address[0], date: new Date()})
	await workload.update()
	request({
		method: 'post',
		node: args[0],
		path: '/' + workload._p.apiVersion + '/' + workload._p.spec.driver + '/pull',
		body: {data: workload._p},
		then: (res) => {

		},
		err: (res) => {
			console.log('NODE', args[0]._p.metadata.name, 'IS DEAD')
		}
	})
	//axios.post('http://' + args[0]._p.spec.address[0] + '/workload/pull', {
	//	registry: workload._p.spec.image.registry,
	//	image: workload._p.spec.image.image,
	//	pullUid: workload._p.scheduler.container.pullUid
	//}).then(async (res) => {
	//}).catch((err) => {
	//	console.log('NODE', args[0]._p.metadata.name, 'IS DEAD')
	//	pipe.end()
	//})
	pipe.end()
})

module.exports = scheduler