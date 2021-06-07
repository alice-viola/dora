'use strict'

let md5 = require('md5')
let check = require('check-types')
let BaseResource = require('./base')

class Container extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Container

	static async GetByNodeId (node_id, asTable = false) {
		try {
			let res = await this.Interface.Read(this.Kind, {node_id: node_id}, true)
			if (res.err !== null) {
				return res
			}
			res = this._Parse(res.data)
			if (asTable === true) {
				return {err: null, data: await this._Format(res)}
			}
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.workspace !== undefined) {
			pargs.workspace = args.workspace
		}
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.workspace !== undefined) {
			pargs.workspace = args.workspace
		}
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		if (args.workload_id !== undefined) {
			pargs.workload_id = args.workload_id
		}
		return pargs
	}

	static _FormatOne (data) {
		let lastSeen = 'never'
		if (data.observed !== undefined && data.observed !== null) {
			lastSeen = parseInt((new Date() - new Date(data.observed.lastSeen)) / 1000)
			if (lastSeen < 20) {
				lastSeen = 'now'
			} else {
				lastSeen = lastSeen + 's ago'
			}
		}
		let eta = parseInt((new Date() - new Date(data.insdate)) / 1000) // s
		if (eta < 60) {
			eta += 's' 
		} else if (eta < 3600) {
			eta = parseInt(eta/60) + 'm' 
		} else if (eta < 86400) {
			eta = parseInt(eta/3600) + 'h' 
		} else {
			eta = parseInt(eta/86400) + 'd' 
		}
		return {
			kind: data.kind,
			zone: data.zone,
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,
			image: data.resource !== null ? data.resource.image.image : null,
			node: (data.computed !== undefined && data.computed !== null) ? data.computed.node : '',
			status: (data.observed !== undefined && data.observed !== null) ? data.observed.state : 'unknown',
			lastSeen: lastSeen,
			eta: eta,
			reason: (data.observed !== undefined && data.observed !== null) ? data.observed.reason : null,
		}
	}

	static _ComputeResourceHash (resource) {
		try {
			let res = Object.assign(resource, {})
			if (res.replica !== undefined) {
				delete res.replica
			}
			return md5(this._DumpOneField(res))
		} catch (err) {
			return d
		}	
	} 

	computed () {
		return (this._p.computed == undefined || this._p.computed == null) ? {
			assignedCpus: [],
			assignedGpus: [],
		} : this._p.computed
	}

	observed () {
		return (this._p.observed == undefined || this._p.observed == null) ? {
			status: null
		} : this._p.observed
	}

	setNodeAndAssignedResources (node, resources) {
		if (this._p.computed == undefined || this._p.computed == null) {
			this._p.computed = {}
		} 
		this._p.computed = {
			node: node.name()
		}
		Object.keys(resources).forEach(function (key) {
			this._p.computed[key] = resources[key]
		}.bind(this))
	}

	restartPolicy () {
		return (this._p.resource !== undefined && this._p.resource.image !== undefined) ? this._p.resource.image.restartPolicy : 'Never' 
	}

	isRunning () {
		return this.isAssigned() 
			&& this._p.observed !== null
			&& this._p.observed !== undefined
			&& this._p.observed.state == this.constructor.GlobalStatus.STATUS.RUNNING
	}

	isAssigned () {
		return this._p.desired == this.constructor.GlobalStatus.DESIRED.RUN
			&& this._p.computed !== undefined 
			&& this._p.computed !== null
			&& this._p.computed.node !== undefined
	}

	isToAssign () {
		return this._p.desired == this.constructor.GlobalStatus.DESIRED.RUN
			&& (this._p.computed == undefined 
			|| this._p.computed == null)
	}

	isDraining () {
		return this._p.desired == this.constructor.GlobalStatus.DESIRED.DRAIN
	}

	wantGpu () {
		return this._p.resource !== undefined 
			&& this._p.resource.selectors !== undefined 
			&& this._p.resource.selectors.gpu !== undefined
			&& this._p.resource.selectors.gpu.product_name !== undefined
			&& (this._p.resource.selectors.gpu.count !== undefined ? this._p.resource.selectors.gpu.count > 0 : true) 
	}

	hasNodeSelector () {
		return this._p.resource !== undefined 
			&& this._p.resource.selectors !== undefined 
			&& this._p.resource.selectors.node !== undefined
			&& this._p.resource.selectors.node.name !== undefined
			&& this._p.resource.selectors.node.name.toLowerCase() !== this.constructor.GlobalStatus.SELECTOR.ALL
	}

	nodeSelector () {
		return this._p.resource.selectors.node.name
	}

	hasGpuSelector () {
		return this._p.resource !== undefined 
			&& this._p.resource.selectors !== undefined 
			&& this._p.resource.selectors.gpu !== undefined
			&& this._p.resource.selectors.gpu.product_name !== undefined
			&& this._p.resource.selectors.gpu.product_name.toLowerCase() !== this.constructor.GlobalStatus.SELECTOR.ALL
	}

	hasCpuSelector () {
		return this._p.resource !== undefined 
			&& this._p.resource.selectors !== undefined 
			&& this._p.resource.selectors.cpu !== undefined
			&& this._p.resource.selectors.cpu.product_name !== undefined
			&& this._p.resource.selectors.cpu.product_name.toLowerCase() !== this.constructor.GlobalStatus.SELECTOR.ALL
	}

	requireVolumes () {
		console.log('###', this._p.resource, this._p.resource["volumes"])
		return this._p.resource.volumes !== undefined
	}

	requiredVolumes () {
		return this._p.resource.volumes
	}


	requiredCpuKind () {
		try {
			return this._p.resource.selectors.cpu.product_name
		} catch (err) {
			return 1
		}
	}

	requiredGpuKind () {
		try {
			return this._p.resource.selectors.gpu.product_name
		} catch (err) {
			return 1
		}
	}

	requiredCpuCount () {
		try {
			return this._p.resource.selectors.cpu.count
		} catch (err) {
			return 1
		}
	}

	requiredGpuCount () {
		try {
			return this._p.resource.selectors.gpu.count
		} catch (err) {
			return 1
		}
	}

	assignedCpuCount () {
		try {
			return this._p.computed.cpus.length
		} catch (err) {
			return 0
		}
	}

	assignedGpuCount () {
		try {
			return this._p.computed.gpus.length
		} catch (err) {
			return 0
		}
	}

	assignedCpu () {
		try {
			return this._p.computed.cpus
		} catch (err) {
			return []
		}
	}

	assignedGpu () {
		try {
			return this._p.computed.gpus
		} catch (err) {
			return []
		}
	}

}

module.exports = Container