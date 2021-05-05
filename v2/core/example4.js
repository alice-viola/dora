'use strict'

let Class = require('./index').Model.Class

async function test () {
	//let zone = new Class.Zone({
	//	kind: 'zone',
	//	name: 'dc-test-01',
	//	resource: {
	//		desc: 'Datacenter Rovereto-Prom Dev',
	//		endpoint: 'https://pwmapi.promfacility.eu'
	//	}
	//})
//
	//let ws = new Class.Workspace({
	//	kind: 'workspace',
	//	name: 'prom'
	//})
//
	//console.log(await zone.apply())
	//console.log(await ws.apply())
//
	//for (var i = 0; i < 10000; i += 1) {
	//	let wks = new Class.Workload({
	//		kind: 'workload',
	//		zone: 'dc-test-01',
	//		workspace: 'prom',
	//		name: 'wk' + i,
	//		resource: {
	//			replicas: {
	//				count: 1
	//			},
	//			selectors: {
	//				node: {
	//					name: 'All'
	//				},
	//				gpu: {
	//					product_name: 'All',
	//					count: 1
	//				}
	//			},
	//			image: 'tensorflow',
	//			cmd: '/bin/bash'
	//		}
	//	})
	//	await wks.apply()
	//	console.log('->', i, 'done')
	//}
	let result = await Class.Workload.Get({
		zone: 'dc-test-01',
		kind: 'workload'
	}, true)
	console.log(result)

}


test()
