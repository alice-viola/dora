'use strict'

let check = require('check-types')
let BaseResource = require('./base')

class Workload extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Workload

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
			image: data.resource.image.image,
			replica: runningReplicas + '/' + (data.resource.replica !== undefined ? (data.resource.replica.count || 1) : 1)  
		}
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