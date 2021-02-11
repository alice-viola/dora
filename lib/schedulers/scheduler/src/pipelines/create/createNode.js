'use strict'

const GE = require('../../../../../index').events
let fn = require ('../../fn/fn')
let async = require ('async')
let Models = require('../../../../../index').models
let Group = Models.Group
let Bind = Models.Bind
let api = {v1: require('../../../../../index').api}

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('createNode')

let request = require('../../fn/request')

async function statusWriter(node, status, err) {
	if (node._p.status.length == 0 || node._p.status[node._p.status.length -1].reason !== err || workload._p.currentStatus !== status) {
		node._p.currentStatus = status
		node._p.status.push(GE.status(status, err))
		await node.update()
	}
}

pipe.step('checkGroupNode', async (pipe, data) => {
	if (data == undefined || data.nodes == undefined) {
		pipe.endRunner()
		return
	}
	let queue = []
	pipe.data.groupForNode = []
	for (var i = 0; i < data.nodes.length; i += 1) {
		let node = data.nodes[i]
		if (node._p.metadata.group !== undefined) {
			queue.push((cb) => {
				api['v1']._getOneModel({kind: 'Group', metadata: {name: node._p.metadata.group}}, (err, group) => {
					pipe.data.nodesGroup.push({group: group, node: node})
					cb(null)
				})
			}) 
		} else {
			await statusWriter(node, GE.NODE.INSERTED, GE.ERROR.NO_GROUP_SPECIFIED)
		}
	}
	async.parallel(queue, (err, result) => {
		if (err) {
			console.log('ERROR IN ASSIGN NODE IN GROUP FETCH')
			pipe.end()
		} else {
			pipe.next()
		}
	})
})

pipe.step('initNode', async (pipe, data) => {
	for (var nodeIndexKey = 0; nodeIndexKey < pipe.data.groupForNode.length; nodeIndexKey += 1) {
		let groupForNode = pipe.data.groupForNode[nodeIndexKey].group
		if (groupForNode == null || groupForNode._p._id == null) {
			await statusWriter(pipe.data.groupForNode[nodeIndexKey].node, GE.NODE.INSERTED, GE.NODE.NO_GROUP_MATCH)
		} else {
			let node = pipe.data.groupForNode[nodeIndexKey].node
			if (node._p.currentStatus == undefined) {
				node._p.currentStatus = GE.NODE.INSERTED
				node._p.status.push(GE.status(GE.NODE.INSERTED))
				await node.update()	
			} else if (node._p.currentStatus == GE.NODE.INSERTED) {
				node._p.currentStatus = GE.NODE.CREATED
				node._p.locked = true
				node._p.status.push(GE.status(GE.NODE.CREATED))
				await node.update()	
				Bind.Create(groupForNode, node)
			}
		}
	}
	pipe.end()
})

module.exports = scheduler




