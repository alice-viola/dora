'use strict'

const ResourceValidation = {
	EQUAL: 'equal',
	NOT_EQUAL: 'not_equal',
}

let db = require('../models/mongo')
db.init({
	host: process.env.mongohost || 'localhost',  
	port: process.env.mongoport || 27017,  
	database: process.env.mongodb || 'pwm-01',  
}, (r) => {})


class Resource {
	constructor (args) {
		this._p = args
		this._kind = this.constructor.name
		this._db = db
		this._valid = null
	}	

	schema () {
		return {}
	}

	async exist () {
		if (this._p._id !== undefined) {
			return true
		} else {
			return await this._db.findOne(this._neededMetadata()).lean(true)
		}
	}

	hasSelector (selector) {
		if (this._p.spec == undefined || this._p.spec.selectors == undefined) {
			return false
		}
		return this._p.spec.selectors[selector] !== undefined ? true : false
	}

	hasVolumes (selector) {
		if (this._p.spec == undefined || this._p.spec.volumes == undefined) {
			return false
		}
		return true
	}


	async create () {
		
	}

	async update () {

	}

	async delete () {

	}

	_validate (property, condition, value, validationResult) {
		let _res = false
		switch (condition) {
			case ResourceValidation.EQUAL:
				_res = property == value
				break

			case ResourceValidation.NOT_EQUAL:
				_res = property != value
				break
		}
		if (validationResult.global == true && _res == false) {
			validationResult.global = false
		} 
		validationResult.steps.push({valid: _res, property: property})
	}

	_neededMetadata () {
		return this._p.metadata
	}
}

module.exports.Resource = Resource
module.exports.RV = ResourceValidation