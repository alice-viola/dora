'use strict'

let BaseResource = require('./base')

class Usercredit extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Usercredit
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
			'credits/week': data.computed !== null ? Math.round(data.computed.weekly * 100) / 100 : 0,
			'credits/total': data.computed !== null ? Math.round(data.computed.total * 100) / 100 : 0,
		}
	}

	static async _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			'credits/week': data.computed !== null ? Math.round(data.computed.weekly * 100) / 100: 0,
			'credits/total': data.computed !== null ? Math.round(data.computed.total * 100) / 100 : 0,

		}
	}
}

module.exports = Usercredit