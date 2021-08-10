'use strict'

let Core = require('../../../core/index')
let ApiInterface = Core.Api.Interface
let Class = Core.Model.Class

class CheckNodes {
	constructor (args) {
		this.firstRun = false
		this.firstRun = args.firstRun
		this.nodeDownMap = {}
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
		try {
			let NodeIsReady = Class.Node.isReady(node)
			if (NodeIsReady.lastSeen !== 'now' && NodeIsReady.status !== 'READY' && NodeIsReady.status !== 'READY, SCHEDULING DISABLED') {
				this.nodeDownMap[node.id] = true 
				// Signal containers
				let containersForNode = await Class.Container.GetByNodeId(node.id)
				if (containersForNode.err !== null) {
					console.log('Error in checkNodes, containers for node', containersForNode.err)
					return 
				}
				containersForNode.data.forEach(async function (c) {
					// console.log(node.name, c.name)
					let container = new Class.Container(c)
					if (container._p.observed == null) {
						container._p.observed = {}
					}
					//container._p.observed.reason = 'Node not reachable, unknow status. Last node seen: ' + NodeIsReady.lastSeen
					//await container.updateObserved()
				})
			} else if (this.firstRun || (this.nodeDownMap[node.id] !== undefined && this.nodeDownMap[node.id] == true)) {
				
				// Signal containers
				let containersForNode = await Class.Container.GetByNodeId(node.id)
				if (containersForNode.err !== null) {
					console.log('Error in checkNodes, containers for node', containersForNode.err)
					return 
				}
				containersForNode.data.forEach(async function (c) {			
					let container = new Class.Container(c)
					if (container._p.observed == null) {
						container._p.observed = {}
					}			
					if (container._p.observed.reason !== undefined && container._p.observed.reason !== null && container._p.observed.reason.includes('Node not reachable, unknow status.')) {
						container._p.observed.reason = ''
						await container.updateObserved()	
					}
				})
				this.nodeDownMap[node.id] = false
			}
		} catch (err) {
			console.log('Error in checkNodes signal', err)
		}
	}
}

module.exports = CheckNodes

