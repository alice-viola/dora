'use strict'

let Database = require('./index').Model.Database
let Interface = require('./index').Model.Interface


async function test () {
	let client = Database.connectToKeyspace({keyspace: 'doratest01'})
	Interface.SetDatabaseClient(client)
	
	let insert1 = await Interface.Create(Interface.Kind.User, {
		kind: 'user',
		name: 'amedeo.setti',
		desired: 'run',
		observed: '{}',
		resource: '{}'
		
	})
	//console.log(insert1)

	let res1 = await Interface.Read(Interface.Kind.User)
	console.log(res1)
}


test()
