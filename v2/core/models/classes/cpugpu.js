'use strict'

let BaseResource = require('./base')

class GPU extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Node

	static IsZoned = true
	
	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
		let pargs = {}
		pargs.kind = this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	/**
	*	Public
	*/
	static async Get (args, asTable = false) {
		try {
			let res = await BaseResource.Interface.Read(this.Kind, this._PartitionKeyFromArgsForRead(args))
			if (res.err !== null) {
				return res
			}
			res = this._Parse(res.data)
			if (asTable === true) {
				let gpus = []
				for (var i = 0; i < res.length; i += 1) {
					let node = res[i]
					if (node.observed !== null && node.observed.gpus.length > 0) {
						let containerOnNode = await BaseResource.Interface.Read('Container', this._PartitionKeyFromArgsForRead({
							node_id: node.node_id
						}))
						if (containerOnNode.err !== null) {
							return res
						}
						let containerOnNodeParsed = this._Parse(containerOnNode.data)
						let bookedGpusForNode = []
						containerOnNodeParsed.forEach((c) => {
							if (c.computed !== null && c.computed !== undefined) {
								if (c.computed.gpus !== null && c.computed.gpus !== undefined && c.computed.gpus.length > 0) {
									bookedGpusForNode = bookedGpusForNode.concat(c.computed.gpus)
								}	
							}
						})
						node.observed.gpus.forEach((gpu) => {
							gpus.push({
								kind: 'gpu',
								zone: node.zone,
								node: node.name,
								product_name: gpu.product_name,
								minor_number: gpu.minor_number,
								temperature: gpu.temperature.gpu_temp + '/' + gpu.temperature.gpu_temp_max_threshold,
								power: gpu.power_readings.power_draw + '/' + gpu.power_readings.power_limit,
								memory: gpu.fb_memory_usage + '/' + gpu.fb_memory_total,
								booked: bookedGpusForNode.includes(gpu.minor_number),
								allowed: node.resource.allow !== undefined && node.resource.allow.includes('GPUWorkload')
							})
						})
					}
				}
				return {err: null, data: gpus}
			}
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	}
}

class CPU extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Node

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
		let pargs = {}
		pargs.kind = this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	/**
	*	Public
	*/
	static async Get (args, asTable = false) {
		try {
			let res = await BaseResource.Interface.Read(this.Kind, this._PartitionKeyFromArgsForRead(args))
			if (res.err !== null) {
				return res
			}
			res = this._Parse(res.data)
			if (asTable === true) {
				let cpus = []
				res.forEach((node) => {
					if (node.observed !== null && node.observed.cpus.length > 0 && (new Date() - new Date(node.observed.lastSeen) < 20000)) {
						node.observed.cpus.forEach((cpu, idcpu) => {
							cpus.push({
								kind: 'cpu',
								zone: node.zone,
								node: node.name,
								product_name: cpu.product_name,
								minor_number: idcpu,
								load: cpu.load,
								allowed: node.resource.allow !== undefined && node.resource.allow.includes('CPUWorkload')
							})
						})
					}
				})
				return {err: null, data: cpus}
			}
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	}
}

module.exports.CPU = CPU
module.exports.GPU = GPU
