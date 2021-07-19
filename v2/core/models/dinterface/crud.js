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
			console.log(err)
			return {err: true, data: err}
		}
	},

	read: async (tableKind, resourceKind, args, noKind) => {
		try {
			let query = ''
			let params = []
			if (noKind == true) {
				query = `SELECT * FROM ` + tableKind + ` WHERE `
				params = []
			} else {
				query = `SELECT * FROM ` + tableKind + ` WHERE kind=?`
				params = [resourceKind.toLowerCase()]
			}
			
			
			if (args !== undefined && args !== null) {
				Object.keys(args).forEach((key) => {
					if (key !== 'kind') {
						if (params.length > 0) {
							query += ` AND ` + key + `=?` 	
						} else {
							query += key + `=?`
						}
						
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

			query += ' IF EXISTS'
			let res = await client.execute(query, 
				params, 
				{ prepare: true } 
			)
			return {err: null, data: res}
		} catch (err) {
			console.log('UPDATE ERR', err)
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

	Project: 'zoned_workspaced_resources',
	Experiment: 'zoned_workspaced_resources',
	Application: 'zoned_workspaced_resources',

	Storage: 'zoned_resources',
	Node: 'zoned_resources',
	Resourcecredit: 'zoned_resources',
	Usercredit: 'zoned_resources',
	CPU: 'zoned_resources',
	GPU: 'zoned_resources',

	Volume: 'zoned_workspaced_resources',
	Workload: 'zoned_workspaced_resources',
	Container: 'containers',

	Event: 'events',
	Version: 'versions',
}

const Kind = {
	Workspace: 'Workspace',
	User: 'User',
	Zone: 'Zone',
	Role: 'Role',

	Project: 'Project',
	Experiment: 'Experiment',
	Application: 'Application',

	Storage: 'Storage',
	Node: 'Node',
	Resourcecredit: 'Resourcecredit',
	Usercredit: 'Usercredit',
	CPU: 'CPU',
	GPU: 'GPU',

	Volume: 'Volume',
	Workload: 'Workload',
	Container: 'Container',

	Event: 'Event',
	Version: 'Version',
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

module.exports.Read = async (resourceKind, args, noKind = false) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let res = await Operation.read(MapKindToDatabaseTable[resourceKind], resourceKind, args, noKind)
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

/**
*	Actions specifics
*/

module.exports.InsertAction = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `INSERT INTO actions (id, ` + Object.keys(args).join(',') + `) VALUES (uuid(), ` + Object.keys(args).map((k) => {return '?' }).toString() + `) IF NOT EXISTS`
		let params = Object.values(args)
		let res = await client.execute(query, 
			params, 
			{ prepare: true } 
		)
		return {err: null, data: res}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.GetActions = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `SELECT * FROM actions WHERE zone=? AND resource_kind=? AND destination=?`
		let res = await client.execute(query, 
			[args.zone, args.resource_kind, args.destination], 
			{ prepare: true } 
		)
		return {err: null, data: res.rows}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.DeleteAction = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `DELETE FROM actions WHERE zone=? AND resource_kind=? AND destination=? AND id=?`
		let res = await client.execute(query, 
			[args.zone, args.resource_kind, args.destination, args.id], 
			{ prepare: true } 
		)
		return {err: null, data: res}
	} catch (err) {
		return {err: true, data: err}
	}
}

/**
*	Events specific
*/
module.exports.GetEvents = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `SELECT * FROM events WHERE resource_kind=? AND zone=? AND resource_id=?`
		let res = await client.execute(query, 
			[args.resource_kind.toLowerCase(), args.zone, args.resource_id], 
			{ prepare: true } 
		)
		return {err: null, data: res.rows}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.DeleteEvents = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `DELETE FROM events WHERE resource_kind=? AND zone=? AND resource_id=?`
		let res = await client.execute(query, 
			[args.resource_kind.toLowerCase(), args.zone, args.resource_id], 
			{ prepare: true } 
		)
		return {err: null, data: res.rows}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.WriteEvent = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `INSERT INTO events (id, ` + Object.keys(args).join(',') + `) VALUES (uuid(), ` + Object.keys(args).map((k) => {return '?' }).toString() + `) IF NOT EXISTS`
		let params = Object.values(args)
		let res = await client.execute(query, 
			params, 
			{ prepare: true } 
		)
		return {err: null, data: res}
	} catch (err) {
		return {err: true, data: err}
	}
}

/**
*	Version specific
*/
module.exports.GetVersions = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `SELECT * FROM versions WHERE resource_kind=? AND zone=? AND resource_id=?`
		let res = await client.execute(query, 
			[args.resource_kind.toLowerCase(), args.zone, args.resource_id], 
			{ prepare: true } 
		)
		return {err: null, data: res.rows}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.WriteVersion = async (args) => {
	if (client == null) {
		return (true, 'Database client not loaded')
	}
	try {
		let query = `INSERT INTO versions (id, ` + Object.keys(args).join(',') + `) VALUES (uuid(), ` + Object.keys(args).map((k) => {return '?' }).toString() + `) IF NOT EXISTS`
		let params = Object.values(args)
		let res = await client.execute(query, 
			params, 
			{ prepare: true } 
		)
		return {err: null, data: res}
	} catch (err) {
		return {err: true, data: err}
	}
}

module.exports.Kind = Kind