'use strict'

let Class = require('./index').Model.Class

async function test () {
	let result = await Class.User.Get(true)
	console.log(result)

	let result2 = await Class.User.GetOne({
		name: 'amedeo.setti'
	}, true)
	console.log(result2)


	let newUser = new Class.User({
		kind: 'user',
		name: 'maurizio.rossi',
	})

	if (await newUser.$exist() == false) {
		let ress = await newUser.apply()
		console.log(ress)
	}

	let newWorkspace = new Class.Workspace({
		kind: 'workspace',
		name: 'nicola.peghini',
		resource: {
			maxAllowedUsers: 50,
			disableNodes: ['node1', 'node2']
		}
	})

	if (await newWorkspace.$exist() == false) {
		let ress = await newWorkspace.apply()
		console.log(ress)
	}

	let resultWorkspace = await Class.Workspace.Get(true)
	console.log(resultWorkspace)


}


test()
