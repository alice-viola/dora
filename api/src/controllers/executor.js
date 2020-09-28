'use strict'

let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let api = {v1: require('../api')}
let status = require ('../workload/status')

let availableGpu = []
let runningWorkload = null

let WorkloadDiscoverInterval = undefined
let WorkloadDiscoverIntervalTimeMs = 1000

function workloadFetch () {	
	api['v1'].get({kind: 'Node'}, (err, node) => {
		api['v1'].get({kind: 'GPUWorkload'}, (err, workloads) => {
			processWorkloads({
				node: node,
				workloads: workloads,
			})
		})
	})
}

function apiRequest (type, resource, verb, cb) {
	let body, query = null
	if (type == 'get') {
		query = resource
	} else {
		body = resource
	}
	try {
		axios[type](`${CFG.api.server[0]}/${resource.apiVersion}/${resource.kind}/${verb}`, body, query).then((res) => {
			cb(res.data)
		}).catch((err) => {
			console.log('Error in API SERVER')
		}) 	  		
	} catch (err) {}
}

async function processWorkloads (args) {
	let workloads = args.workloads
	let analyzeWorkloads = true
	let i = 0
	if (workloads.length == 0) {
		return
	}
	while (analyzeWorkloads == true) {
		let workload = workloads[i]
		switch (workload.currentStatus) {
			case status.WORKLOAD.ASSIGNED:
				//console.log('CMD', workload.switchheduler.gpu[0].node)

		}
		i += 1
		if (i == workloads.length) {
			analyzeWorkloads = false
		}
	}
}

module.exports.start = () => {
	if (WorkloadDiscoverInterval == undefined) {
		workloadFetch()
		WorkloadDiscoverInterval = setInterval(workloadFetch, WorkloadDiscoverIntervalTimeMs)
	}
} 

module.exports.stop = () => {
	if (GpuDiscoverInterval != undefined) {
		clearInterval(WorkloadDiscoverInterval)
	}
} 