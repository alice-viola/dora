'use strict'

let md5 = require('md5')
let check = require('check-types')
let BaseResource = require('./base')
let Container = require('./container')

class Workload extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Workload

	static IsReplicated = true
	static IsZoned = true
	static IsWorkspaced = true

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
		return pargs
	}

	static  async _FormatOne (data) {
		let runningReplicas = 0
		let cData = await Container.Get({
			workload_id: data.id
		})
		if (cData.err == null) {
			cData.data.forEach((c) => {
				if (c.observed !== null) {
					if (c.observed.state == 'running' /*&& (new Date() -  new Date(c.observed.lastSeen)) < 10000*/ ) {
						runningReplicas += 1
					}
				}
			})
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
		console.log(data.resource)
		return {
			kind: data.kind,
			zone: data.zone,
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,
			image: data.resource.image.image,
			gpu: data.resource.selectors !== undefined &&  data.resource.selectors.gpu !== undefined ? data.resource.selectors.gpu.count : 0, 
			replica: runningReplicas + '/' + (data.resource.replica !== undefined ? ((data.resource.replica.count == undefined || data.resource.replica.count == null) ? 1 : data.resource.replica.count) : 1),
			eta: eta
		}
	}

	static _ComputeResourceHash (resource) {
		try {
			let res = Object.assign({}, resource)
			if (res.replica !== undefined) {
				delete res.replica
			}
			return md5(this._DumpOneField(res))
		} catch (err) {
			return resource
		}	
	} 

	desiredReplica () {
		return (this._p.resource.replica !== undefined  && this._p.resource.replica !== null) ? ((this._p.resource.replica.count == undefined || this._p.resource.replica.count == null) ? 1 :  this._p.resource.replica.count) : 1
	}

	computedReplica () {
		return (this._p.computed !== undefined && this._p.computed !== null) ? (this._p.computed.replica !== undefined ? (this._p.computed.replica) || 0 : 0) : 0
	}

	/**
	*	Checks to do: 
	*	- zone exist
	*	- workspace exist
	*	- node exist
	*	- gpu/cpu kind exist
	*	- volume exist
	*/
	async $checkDependencies () {
		let checkAry = []
		const zone = this._p.zone
		const workspace = this._p.workspace
		const node = this._p.resource.selectors.node !== undefined ? this._p.resource.selectors.node.name : null
		const gpu = this._p.resource.selectors.gpu !== undefined ? this._p.resource.selectors.gpu.product_name : null
		const cpu = this._p.resource.selectors.cpu !== undefined ? this._p.resource.selectors.cpu.product_name : null

		const zoneExist = await this._checkOneDependency('Zone', {
			name: zone
		})
		const workspaceExist = await this._checkOneDependency('Workspace', {
			name: workspace
		})
		let nodeExist = [true]
		if (node !== 'pwm.all' && node !== 'All' && node !== null) {
			nodeExist = await this._checkOneDependency('Node', {
				name: node,
				zone: zone
			})
		}
		if (zoneExist.length == 1 && workspaceExist.length == 1 && nodeExist.length == 1) {
			return {err: null, data: []}
		} else {
			return {err: true, data: checkAry}	
		}
	}

	$check () {
		let checkAry = super.$check()
		this._check(checkAry, check.not.equal(this._p.resource, null), 						'Resource spec is not null')
		this._check(checkAry, check.not.equal(this._p.resource, undefined), 				'Resource spec is not undefined')
		this._check(checkAry, check.not.equal(this._p.resource.image, undefined), 			'Resource spec.image is not undefined')
		this._check(checkAry, check.not.equal(this._p.resource.image.image, undefined), 	'Resource spec.image.image is not undefined')
		this._check(checkAry, check.not.equal(this._p.resource.image.image,  null),  	    'Resource spec.image.image is not null')
		this._check(checkAry, check.not.equal(this._p.resource.driver, undefined),  		'Resource spec.driver is not undefined')
		this._check(checkAry, check.not.equal(this._p.resource.driver, null),  				'Resource spec.driver is not null')
		return checkAry
	}

}

module.exports = Workload