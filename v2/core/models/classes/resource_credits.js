'use strict'

let BaseResource = require('./base')

class ResourceCredit extends BaseResource {
	static Kind = BaseResource.Interface.Kind.ResourceCredit
	static IsZoned = true

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
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
			credit: data.resource.credits.perHour,
		}
	}

	static async _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			credit: data.resource.credits.perHour,

		}
	}
}

module.exports = Storage