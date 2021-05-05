'use strict'

let Database = require('../../index').Model.Database
let Interface = require('../../index').Model.Interface

/**
* 	Translate between api versions
*/
let v1 = require('../translate/api_v1')

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

	static async Get (args, asTable = false) {
		try {
			let res = await Interface.Read(this.Kind, this._PartitionKeyFromArgs(args))
			if (res.err !== null) {
				return res
			}
			res = this._Parse(res.data)
			if (asTable === true) {
				return {err: null, data: this._Format(res)}
			}
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	}
	
	static async GetOne (args, asTable = false) {
		try {
			let res = await Interface.Read(this.Kind, this._PartitionKeyFromArgs(args)) 
			if (res.err !== null) {
				return res
			}
			res = this._Parse(res.data)
			if (asTable === true) {
				return {err: null, data: this._Format(res)}
			}
			return {err: null, data: res}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async save () {
		try {
			let res = await Interface.Create(this.constructor.Kind, this.constructor._DumpOne(this._p)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async updateDesired () {
		try {
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'desired', this._p.desired) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async updateObserved () {
		try {
			console.log(this._p.observed, this.constructor._DumpOne(this._p.observed))
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'observed', this.constructor._DumpOneField(this._p.observed)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async updateResource () {
		try {
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'resource', this.constructor._DumpOneField(this._p.resource)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async apply () {
		this._p.desired = 'run'
		return await this.save()
	}

	async drain () {
		this._p.desired = 'drain'
		return await this.save()
	}
	
	async get () {}
	
	async getOne () {}
	
	async describe () {}

	properties () {
		return this.constructor._ParseOne(this._p)
	}

	/**
	*	Internal
	*/
	static $Translate (apiVersion, src) {
		let toReturn = null
		switch (apiVersion) {
			case 'v1':
				toReturn = v1.translate(src)
				break
			default: 
				toReturn = src
		}
		return toReturn
	}

	async $delete () {
		try {
			let res = await Interface.Delete(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async $exist () {
		try {
			let res = await this.constructor.GetOne(this._p)
			if (res.data.length == 1) {
				return (null, true)
			} else if (res.data.length == 0) {
				return (null, false)
			} else {
				return (true, 'More than one result')
			}
		} catch (err) {
			return (true, err)
		}
		
	}

	/**
	*	Private
	*/

	// To override for each class type
	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
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

	static _DumpOneField (d) {
		try {
			return JSON.stringify(d)
		} catch (err) {
			return d
		}	
	} 

}

module.exports = BaseResource