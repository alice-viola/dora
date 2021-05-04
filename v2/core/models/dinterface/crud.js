'use strict'

let client = null

const Operation = {
	resources: {
		create: async (resourceKind, args) => {
			try {
				let query = `INSERT INTO resources (id, ` + Object.keys(args).join(',') + `) VALUES (uuid(), ` + Object.keys(args).map((k) => {return '?' }).toString() + `)`
				let params = Object.values(args)
				let res = await client.execute(query, 
					params, 
					{ prepare: true } 
				)
				return (null, res)
			} catch (err) {
				return (true, err)
			}
		},
		read: async (resourceKind, args) => {
			try {
				let query = `SELECT * FROM resources WHERE kind=?`
				let params = [resourceKind.toLowerCase()]
				if (args !== undefined && args !== null) {
					Object.keys(args).forEach((key) => {
						query += ` AND ` + key + `=?`
						params.push(args[key]) 
					})
				}
				let res = await client.execute(query, 
					params, 
					{ prepare: true } 
				)
				return (null, res)
			} catch (err) {
				return (true, err)
			}
		}
	}
}

const MapKindToDatabaseTable = {

	Workspace: 'resources',
	User: 'resources',
	Zone: 'resources',

	Storage: 'zoned_resources',
	Node: 'zoned_resources',
	ResourceCredits: 'zoned_resources',
	CPU: 'zoned_resources',
	GPU: 'zoned_resources',

	Volume: 'zoned_workspaced_resources',
	Workload: 'zoned_workspaced_resources',
	Container: 'zoned_workspaced_resources',

}

const Kind = {
	Workspace: 'Workspace',
	User: 'User',
	Zone: 'Zone',

	Storage: 'Storage',
	Node: 'Node',
	ResourceCredits: 'ResourceCredits',
	CPU: 'CPU',
	GPU: 'GPU',

	Volume: 'Volume',
	Workload: 'Workload',
	Container: 'Container',
}

module.exports.SetDatabaseClient = (databaseClient) => {
	client = databaseClient
} 

module.exports.Create = async (resourceKind, args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation[MapKindToDatabaseTable[resourceKind]].create(resourceKind, args)
		return (null, res)
	} catch (err) {
		return (true, err)
	}
}

module.exports.Read = async (resourceKind, args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation[MapKindToDatabaseTable[resourceKind]].read(resourceKind, args)
		return (null, res.rows)
	} catch (err) {
		return (true, err)
	}
}

module.exports.Update = async (resourceKind) => {

}

module.exports.Delete = async (resourceKind) => {

}

module.exports.Kind = Kind