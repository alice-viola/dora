'use strict'

let BaseResource = require('./base')

class Volume extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Volume
	
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

	static _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			workspace: data.workspace,
			name: data.name,
			storage: data.resource.storage,
			policy: data.resource.policy,
			desired: data.desired,

		}
	}

}

module.exports = Volume