'use strict'

let md5 = require('md5')
let check = require('check-types')
let BaseResource = require('./base')

class Container extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Container

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
		//if (args.workload_id !== undefined) {
		//	pargs.workload_id = args.workload_id
		//}
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
		let runningReplicas = 0
		if (data.observed !== undefined && data.observed !== null 
			&& data.observed.containers !== undefined) {
			runningReplicas = data.observed.containers.filter((c) => {c.status == 'RUNNING'}).length
		}
		return {
			kind: data.kind,
			zone: data.zone,
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,
			image: data.resource.image.image
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

	isRunning () {
		return this.isAssigned() 
			&& this._p.observed !== null
			&& this._p.observed !== undefined
			&& this._p.observed.status == this.constructor.GlobalStatus.STATUS.RUNNING
	}

	isAssigned () {
		return this._p.desired == this.constructor.GlobalStatus.DESIRED.RUN
			&& this._p.computed !== undefined 
			&& this._p.computed !== null
			&& this._p.computed.node !== undefined
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