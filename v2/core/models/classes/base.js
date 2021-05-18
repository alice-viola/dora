'use strict'

let md5 = require('md5')
let check = require('check-types')

let Database = require('../../index').Model.Database
let Interface = require('../../index').Model.Interface
let Global = require('../../globals/status')
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

	static GlobalStatus = Global

	/**
	*	In child class you need to
	*	override these static vars 
	*/
	static Kind = null	

	static IsReplicated = false

	/**
	*	Public
	*/
	static async Get (args, asTable = false) {
		try {
			let res = await Interface.Read(this.Kind, this._PartitionKeyFromArgsForRead(args))
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
			let res = await Interface.Read(this.Kind, this._PartitionKeyFromArgsForRead(args)) 
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

	/**
	*	Properties 
	*	accessor
	*/
	id () {
		return this._p.id
	}

	name () {
		return this._p.name
	}

	workspace () {
		return this._p.workspace
	}

	zone () {
		return this._p.zone
	}

	desired () {
		return this._p.desired
	}

	resource () {
		return this._p.resource	
	}

	resource_hash () {
		return this._p.resource_hash
	}

	computed () {
		return (this._p.computed == undefined || this._p.computed == null) ? {
			
		} : this._p.computed
	}

	observed () {
		return (this._p.observed == undefined || this._p.observed == null) ? {

		} : this._p.observed
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
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'observed', this.constructor._DumpOneField(this._p.observed)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async updateComputed () {
		try {
			console.log(this._p.computed, this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'computed', this.constructor._DumpOneField(this._p.computed))
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'computed', this.constructor._DumpOneField(this._p.computed)) 
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

	async updateResourceHash () {
		try {
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), 'resource_hash', this.constructor._ComputeResourceHash(this._p.resource)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
	}

	async updateKey (key, value) {
		try {
			let res = await Interface.Update(this.constructor.Kind, this.constructor._PartitionKeyFromArgs(this._p), key, value) 
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
		return await this.updateDesired()
	}

	/**
	*	Set internal _p status
	*/
	set (key, value) {
		this._p[key] = value
	}

	properties () {
		return this.constructor._ParseOne(this._p)
	}

	/**
	*	Internal
	*/
	$validate (checks) {
		const check = checks.filter((c) => {
			return c.result == false
		}).map((c) => { return c.desc })
		if (check.length !== 0) {
			return {err: true, data: check}
		} else {
			return {err: null, data: check}
		}
	}

	// To override (calling super before) 
	// for each resource kind
	//
	// You need to call this after
	// calling translate
	$check () {
		// Check base fields
		let checkAry = []
		this._check(checkAry, check.not.equal(this._p.kind, null), 				'Resource kind is not null')
		this._check(checkAry, check.not.equal(this._p.kind, undefined), 		'Resource kind is not undefined')
		this._check(checkAry, check.equal(this._p.kind.toLowerCase(), this.constructor.Kind.toLowerCase()), 	'Resource kind is of the right type')
		this._check(checkAry, check.not.equal(this._p.name, null), 				'Resource name is not null')
		this._check(checkAry, check.not.equal(this._p.name, undefined), 		'Resource name is not undefined')
		return checkAry
	}

	async $checkDependencies () {
		let checkAry = []
		return {err: null, data: checkAry}
	}

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
				return {err: null, data: {exist: true, data: this.constructor._ParseOne(res.data[0])}}
			} else if (res.data.length == 0) {
				return {err: null, data: {exist: false, data: null}}
			} else {
				return {err: true, data: {exist: false, data: 'More than one result'}}
			}
		} catch (err) {
			return {err: true, data: err}
		}
		
	}

	/**
	*	Private
	*/

	async _checkOneDependency (kind, args) {
		try {
			let res = await Interface.Read(kind, args) 
			if (res.err == null) {
				return res.data
			} else {
				return null
			}
		} catch (err) {
			return null
		}
	}


	// To override for each class type
	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {
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

	static _ParseOne (d) {
		let parsed
		try {
			parsed = d	
			parsed.resource = JSON.parse(parsed.resource)
			parsed.observed = JSON.parse(parsed.observed)
			parsed.computed = JSON.parse(parsed.computed)
			return d
		} catch (err) {
			return parsed
		}
	}

	static _DumpOne (d) {
		let parsed
		try {
			parsed = d	
			parsed.observed = JSON.stringify(parsed.observed)
			parsed.computed = JSON.stringify(parsed.computed)
			if (parsed.resource !== undefined) {
				parsed.resource_hash = this._ComputeResourceHash(parsed.resource)
				parsed.resource = JSON.stringify(parsed.resource)
			}
			return d
		} catch (err) {
			console.log('Base._DumpOne', err)
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

	// Can be overridden 
	static _ComputeResourceHash (resource) {
		try {
			return md5(this._DumpOneField(resource))
		} catch (err) {
			return d
		}	
	} 

	_check (checkAry, expr, checkDesc) {
		checkAry.push({result: expr, desc: checkDesc})
	}
}

module.exports = BaseResource