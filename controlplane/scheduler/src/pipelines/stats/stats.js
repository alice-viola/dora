'use strict'

const GE = require('../../../../libcommon').events
let fn = require('../../fn/fn')
let Models = require('../../../../libcommon').models
let Node = Models.Node
let Workload = Models.Workload
let Stat = Models.Stat

let axios = require('axios')
let randomstring = require('randomstring')
let async = require ('async')
let https = require ('https')

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('metric-server')

let lastWrite = null


pipe.step('precheck', async (pipe, job) => {
	if (lastWrite == null) {
		pipe.next()
	} else if (lastWrite !== null && (new Date() - lastWrite) > (process.env.STATS_WRITE_MS || 15000) ) {
		pipe.next()
	} else {
		pipe.end()
	}
})

pipe.step('workload', async (pipe, job) => {
	pipe.data.workloads = await Workload.FindByZone(process.env.zone)
	pipe.next()
})

pipe.step('metric', (pipe, job) => {
	let stats = {
		date: new Date(), 
		zone: process.env.zone, 
		counters: {}, 
		usage: {},
		nodes: {},
		gpus: {}
	}
	
	pipe.data.resources.forEach((node) => {
		stats.nodes[node.name] = {
			counters: {},
			usage: {}
		}	
		/** 
		*	Counters 
		*/
		// Workloads
		stats.counters.workloads = {}
		stats.counters.workloads.total = pipe.data.workloads.length
		stats.counters.workloads.running = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.RUNNING }).length
		stats.counters.workloads.queue = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.QUENED }).length
		stats.counters.workloads.denied = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.DENIED }).length
		stats.counters.workloads.inserted = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.INSERTED }).length
		stats.counters.workloads.paused = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.PAUSED }).length
		stats.counters.workloads.exited = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.EXITED }).length
		stats.counters.workloads.error = pipe.data.workloads.filter((wk) => {return wk.currentStatus == GE.WORKLOAD.ERROR }).length

		// Nodes
		if (stats.counters.nodes == undefined) {
			stats.counters.nodes = 0
		} 
		stats.counters.nodes += 1

		// Mem
		if (stats.counters.mem == undefined) {
			stats.counters.mem = 0
		} 
		if (stats.usage.avmem == undefined) {
			stats.usage.avmem = 0
		} 
		stats.nodes[node.name].counters.mem = node.sys.mem.total 
		stats.nodes[node.name].usage.avmem = node.sys.mem.available 
		stats.counters.mem += node.sys.mem.total 
		stats.usage.avmem += node.sys.mem.available 

		// CPUS
		if (stats.counters.cpus == undefined) {
			stats.counters.cpus = 0
		} 
		if (stats.usage.cpus == undefined) {
			stats.usage.cpusload = 0
		} 
		stats.nodes[node.name].counters.cpus = node.cpus.length
		stats.nodes[node.name].usage.cpusload = node.sys.currentLoad.currentload
		stats.counters.cpus += node.cpus.length
		stats.usage.cpusload += node.sys.currentLoad.currentload

		// GPUS
		if (stats.counters.gpus == undefined) {
			stats.counters.gpus = 0
		}
		if (stats.counters.gpusmem == undefined) {
			stats.counters.gpusmem = 0
		}
		if (stats.usage.gpusused == undefined) {
			stats.usage.gpusused = 0
		}
		if (stats.usage.gpusmemused == undefined) {
			stats.usage.gpusmemused = 0
		}
		stats.nodes[node.name].counters.gpu = node.gpus.length
		stats.counters.gpus += node.gpus.length
		let gpusused = 0
		let gpusmem = 0
		let gpusmemused = 0
		if (node.gpus.length > 0) {
			stats.nodes[node.name].usage.gpusused = (node.gpus.filter((gpu) => { return fn.isGPUUsed(gpu) })).length
			stats.nodes[node.name].usage.gpusmem = node.gpus.reduce( ( sum, { fb_memory_total } ) => sum + parseInt(fb_memory_total.split(' ')[0]), 0)
			stats.nodes[node.name].usage.gpusmemused = node.gpus.reduce( ( sum, { fb_memory_usage } ) => sum + parseInt(fb_memory_usage.split(' ')[0]), 0)
			stats.nodes[node.name].usage.gpusmem /= Math.pow(10,3)
			stats.nodes[node.name].usage.gpusmemused /= Math.pow(10,3)
			stats.usage.gpusused += stats.nodes[node.name].usage.gpusused
			stats.counters.gpusmem += stats.nodes[node.name].usage.gpusmem
			stats.usage.gpusmemused += stats.nodes[node.name].usage.gpusmemused

			node.gpus.forEach((gpu) => {
				stats.gpus[gpu.uuid] = {
					product_name: gpu.product_name,
					node: gpu.node,
					fb_memory_total: gpu.fb_memory_total.split(' ')[0] / Math.pow(10,3), 
					fb_memory_usage: gpu.fb_memory_usage.split(' ')[0] / Math.pow(10,3), 
					used: fn.isGPUUsed(gpu)}	
			})
			
		}

		stats.nodes[node.name].counters.mem /= Math.pow(10,9)
		stats.nodes[node.name].usage.memused = stats.nodes[node.name].counters.mem - (stats.nodes[node.name].usage.avmem / Math.pow(10,9))
	})

	stats.counters.mem /= Math.pow(10,9)
	stats.usage.memused = stats.counters.mem - (stats.usage.avmem / Math.pow(10,9))
	pipe.data.stats = stats
	pipe.next()
})

pipe.step('metric', async (pipe, job) => {
	let stat = new Stat({kind: 'Stat', computed: pipe.data.stats})
	await stat.create()
	lastWrite = new Date()
	pipe.end()
})

module.exports = scheduler





