'use strict'

let BaseResource = require('./base')

class Action extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Event

	static async Get (args) {
		try {
			let res = await this.Interface.GetActions(args) 
			if (res.err == null) {
				return {err: null, data: this._Parse(res.data)}	
			} else {
				return {err: res.err,  data: res.data}	
			}
			
		} catch (err) {
			return {err: true, data: err}
		}		
	}

	static async Insert (args) {
		try {
			let res = await this.Interface.InsertAction(this._DumpOne(args)) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}		
	}

	static async Delete (args) {
		try {
			let res = await this.Interface.DeleteAction(args) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}		
	}

	async $delete () {
		try {
			let res = await this.constructor.Interface.DeleteAction(this._p) 
			return {err: null, data: res.data}
		} catch (err) {
			return {err: true, data: err}
		}
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
			parsed.resource_pk = JSON.parse(parsed.resource_pk)
			return d
		} catch (err) {
			return parsed
		}
	}

	static _DumpOne (d) {
		let parsed
		try {
			parsed = d	
			parsed.resource_pk = JSON.stringify(parsed.resource_pk)
			return d
		} catch (err) {
			console.log('Base._DumpOne', err)
			return parsed
		}
	}
}

module.exports = Action