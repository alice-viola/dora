'use strict'

let client = null

const Operation = {
	
	create: async (tableKind, resourceKind, args) => {
		try {
			let query = `INSERT INTO ` + tableKind + ` (id, ` + Object.keys(args).join(',') + `) VALUES (uuid(), ` + Object.keys(args).map((k) => {return '?' }).toString() + `) IF NOT EXISTS`
			let params = Object.values(args)
			let res = await client.execute(query, 
				params, 
				{ prepare: true } 
			)
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	},

	read: async (tableKind, resourceKind, args) => {
		try {
			let query = `SELECT * FROM ` + tableKind + ` WHERE kind=?`
			let params = [resourceKind.toLowerCase()]
			if (args !== undefined && args !== null) {
				Object.keys(args).forEach((key) => {
					if (key !== 'kind') {
						query += ` AND ` + key + `=?`
						params.push(args[key]) 
					}
				})
			}
			let res = await client.execute(query, 
				params, 
				{ prepare: true } 
			)
			return {err: null, data: res.rows}
		} catch (err) {
			return {err: true, data: err}
		}
	},

	update:  async (tableKind, resourceKind, args, key, value) => {
		try {
			let query = `UPDATE ` + tableKind + ` SET ` + key + `=? WHERE kind=?`
			
			let params = [value, resourceKind.toLowerCase()]
			if (args !== undefined && args !== null) {
				Object.keys(args).forEach((key) => {
					if (key !== 'kind') {
						query += ` AND ` + key + `=?`
						params.push(args[key]) 
					}
				})
			}

			let res = await client.execute(query, 
				params, 
				{ prepare: true } 
			)
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	},

	delete:  async (tableKind, resourceKind, args) => {
		try {
			let query = `DELETE FROM ` + tableKind + ` WHERE kind=?`
			let params = [resourceKind.toLowerCase()]
			if (args !== undefined && args !== null) {
				Object.keys(args).forEach((key) => {
					if (key !== 'kind') {
						query += ` AND ` + key + `=?`
						params.push(args[key]) 
					}
				})
			}
			let res = await client.execute(query, 
				params, 
				{ prepare: true } 
			)
			return {err: null, data: res.rows}
		} catch (err) {
			return {err: true, data: err}
		}
	}
	
}

const MapKindToDatabaseTable = {

	Workspace: 'resources',
	User: 'resources',
	Zone: 'resources',
	Role: 'resources',

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
		let res = await Operation.create(MapKindToDatabaseTable[resourceKind], resourceKind, args)
		return res
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.Read = async (resourceKind, args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation.read(MapKindToDatabaseTable[resourceKind], resourceKind, args)
		return res
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.Update = async (resourceKind, args, key, value) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation.update(MapKindToDatabaseTable[resourceKind], resourceKind, args, key, value)
		return res
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.Delete = async (resourceKind, args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation.delete(MapKindToDatabaseTable[resourceKind], resourceKind, args)
		return res
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.Kind = Kind