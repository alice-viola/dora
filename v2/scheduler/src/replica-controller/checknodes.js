'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class CheckNodes {
	constructor () {
		
	}

	async check () {
		console.log('CheckNodes')
		let nodes = await Class.Node.Get({
			zone: process.env.zone
		})
		if (nodes.err != null) {
			console.log('Error in checkNodes', nodes.err)
			return 
		}

		nodes.data.forEach(async function (node) {
			await this.checkNode(node)
		}.bind(this))
	}

	async checkNode (node) {
		let NodeIsReady = Class.Node.isReady(node)
		if (NodeIsReady.lastSeen !== 'now' && NodeIsReady.status !== 'READY' && NodeIsReady.status !== 'READY, SCHEDULING DISABLED') {
			// Signal containers
			let containersForNode = await Class.Container.GetByNodeId(node.id)
			if (containersForNode.err !== null) {
				console.log('Error in checkNodes, containers for node', containersForNode.err)
				return 
			}
			containersForNode.data.forEach(async function (c) {
				// console.log(node.name, c.name)
				let container = new Class.Container(c)
				container._p.observed.reason = 'Node not reachable, unknow status. Last node seen: ' + NodeIsReady.lastSeen
				container._p.observed.status = 'unknow'
				await container.updateObserved()
			})
		}
	}
}

module.exports = CheckNodes

