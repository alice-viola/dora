'use strict'

let BaseResource = require('./base')

class Storage extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Storage

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			endpoint: data.resource.endpoint,
			type: data.resource.kind, 
			desired: data.desired,

		}
	}
}

module.exports = Storage