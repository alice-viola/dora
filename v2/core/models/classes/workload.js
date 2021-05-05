'use strict'

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
			image: data.resource.container.image,
			replica: runningReplicas + '/' + (data.resource.replica !== undefined ? (data.resource.replica.count || 1) : 1)  
		}
	}

}

module.exports = Workload