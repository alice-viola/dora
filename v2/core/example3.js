'use strict'

let Class = require('./index').Model.Class

async function test () {
	let result = await Class.Storage.Get({
		zone: 'dc-test-01'
	}, true)
	console.log(result)

	let storage = new Class.Storage({
		kind: 'storage',
		name: 'pwmzfs01',
		zone: 'dc-test-01',
		resource: {
			kind: 'nfs',
			address: '192.168.186.5'
		}
	})
	let res = await storage.apply()
	

	storage.properties().desired = 'run'
	storage.properties().observed = {
		date: new Date(),
		status: 'running'
	}

	let res3 = await storage.updateObserved()
	let res2 = await storage.updateDesired()
	console.log(res2, res3)

	let res5 = await storage.$delete()
	console.log(res5)
}


test()
