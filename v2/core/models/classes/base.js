'use strict'

let Database = require('../../index').Model.Database
let Interface = require('../../index').Model.Interface

let Client = Database.connectToKeyspace({keyspace: 'doratest01'})
Interface.SetDatabaseClient(Client)


/**
*	Every other class will extends this
*	base class
*/
class BaseResource {

	constructor (args) {
		this._p = args
		this._Client = Client
		this._Interface = Interface
	}

	static Interface = Interface
	static Client = Client

	/**
	*	In child class you need to
	*	override these static vars 
	*/
	static Kind = null	

	/**
	*	Public
	*/

	static async Get (asTable = false) {
		try {
			let res = await Interface.Read(this.Kind)
			res = this._Parse(res)
			if (asTable === true) {
				return (null, this._Format(res))
			}
			return (null, res)
		} catch (err) {
			return (true, err)
		}
	}
	
	static async GetOne (args, asTable = false) {
		try {
			let res = await Interface.Read(this.Kind, this._PartitionKeyFromArgs(args)) 
			res = this._Parse(res)
			if (asTable === true) {
				return (null, this._Format(res))
			}
			return (null, res)
		} catch (err) {
			return (true, err)
		}
	}

	async apply () {
		try {
			this._p.desired = 'run'
			let res = await Interface.Create(this.constructor.Kind, this.constructor._DumpOne(this._p)) 
			return (null, res)
		} catch (err) {
			return (true, err)
		}
	}
	
	async drain () {}
	
	async get () {}
	
	async getOne () {}
	
	async describe () {}

	/**
	*	Internal
	*/
	async $exist () {
		try {
			let res = await this.constructor.GetOne(this._p)
			if (res.length == 1) {
				return (null, true)
			} else if (res.length == 0) {
				return (null, false)
			} else {
				return (true, 'More than one result')
			}
		} catch (err) {
			return (true, err)
		}
		
	}

	properties () {
		return this._p
	}

	/**
	*	Private
	*/

	// To override for each class type
	static _PartitionKeyFromArgs (args) {
		return {
			kind: args.kind || this.Kind.toLowerCase(),
			name: args.name
		}
	}

	static _Format (data) {
		const formattedData = data.map((d) => {
			return this._FormatOne(d)
		})
		return formattedData
	}

	_format () {

	}

	static _FormatOne (data) {
		return {
			kind: data.kind,
			name: data.name,
			desired: data.desired
		}
	}

	_formatOne () {

	}


	static _Parse (data) {
		return data.map((d) => {
			return this._ParseOne(d)
		})
	}

	static _Dump (data) {
		return data.map((d) => {
			return this._DumpOne(d)
		})
	}

	static _ParseOne (d) {
		let parsed
		try {
			parsed = d	
			parsed.resource = JSON.parse(parsed.resource)
			parsed.observed = JSON.parse(parsed.observed)
			return d
		} catch (err) {
			return parsed
		}
	}

	static _DumpOne (d) {
		let parsed
		try {
			parsed = d	
			parsed.resource = JSON.stringify(parsed.resource)
			parsed.observed = JSON.stringify(parsed.observed)
			return d
		} catch (err) {
			return parsed
		}
	}

}

module.exports = BaseResource