'use strict'

const ResourceValidation = {
	EQUAL: 'equal',
	NOT_EQUAL: 'not_equal',
}

let db = require('./mongo')
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

	async exist () {
		if (this._p._id !== undefined) {
			return true
		} else {
			let res = await this.model().findOne({metadata: this._p.metadata}).lean(true)
			if (res == null) {
				return false
			} else {
				return true
			}
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
		let instance = new (this.model())(this._p)
		await instance.save()
	}

	async find () {
		let res = await this.model().find().lean(true)	
		return this._formatRes(res)
	}

	async findOne (args) {
		let res = await this.model().findOne({metadata: args.metadata}).lean(true)
		if (res == null) {
			return {}
		}
		return this._formatOneRes(res)
	}

	async describeOne (args) {
		let res = await this.model().findOne({metadata: args.metadata}).lean(true)
		if (res == null) {
			return {}
		}
		return this._describeOneRes(res)
	}

	async update () {
		try {
			let instance = await this.model().findOneAndUpdate({metadata: this._neededMetadata()}, this._p)
			if (instance) {
				await instance.save()	
			}
		} catch (err) {
			console.log(err, this)
		}
	}

	async delete () {
		await this.model().deleteOne({metadata: this._neededMetadata()})
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

	_formatRes (res) {
		return res
	}

	_describeOneRes (res) {
		return res
	}
}

module.exports.Resource = Resource
module.exports.RV = ResourceValidation