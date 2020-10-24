'use strict'

const GE = require('../../events/global')
let Pipe = require('piperunner').Pipeline
let axios = require('axios')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('cancelWorkload')
let request = require('../fn/request')

pipe.step('getNodeFromWorkload', async function (pipe, workload) {
	if (workload == undefined) {
		pipe.end()
		return
	}
	let node = pipe.data.nodes.filter((node) => {
		if (workload == undefined || ( workload !== undefined && workload._p !== undefined && workload._p.scheduler == undefined)) {
			return null
		} else {
			return node._p.metadata.name == workload._p.scheduler.node	
		}
	})
	if (node == null || workload._p.scheduler == undefined || workload._p.scheduler.container == undefined) {
		workload._p.status.push(GE.status('EXITED'))
		workload._p.currentStatus = 'EXITED'
		await workload.update()
		pipe.end()
	} else {
		pipe.next(node)
	}
})

pipe.step('pingNode', async function (pipe, workload, args) {
	axios.get('http://' + args[0]._p.spec.address[0] + '/alive', {timeout: 1000}).then((res) => {
		//statusWriter (workload, pipe, {err: null})
		pipe.next(args)
	}).catch((err) => {
		//statusWriter (workload, pipe, {err: GE.ERROR.NODE_UNREACHABLE})
		pipe.end()
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
	console.log('req cancel', workload._p.scheduler.container.name)

	request({
		method: 'post',
		node: args[0],
		path: '/' + workload._p.apiVersion + '/' + workload._p.spec.driver + '/workloaddelete',
		body: {data: workload._p},
		then: async (res) => {
			pipe.end()
		},
		err: (res) => {
			console.log('NODE', args[0]._p.metadata.name, 'IS DEAD')
			pipe.end()
		}
	})
})



module.exports = scheduler