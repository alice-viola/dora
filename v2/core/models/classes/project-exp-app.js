'use strict'

'use strict'

let BaseResource = require('./base')

class Project extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Project


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
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,

		}
	}
}

class Application extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Application

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.workspace = args.workspace
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _FormatOne (data) {
		return {
			kind: data.kind,
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,

		}
	}
}

class Experiment extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Experiment

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.workspace = args.workspace
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _FormatOne (data) {
		return {
			kind: data.kind,
			workspace: data.workspace,
			name: data.name,
			desired: data.desired,

		}
	}
}

module.exports.Project = Project
module.exports.Experiment = Experiment
module.exports.Application = Application
