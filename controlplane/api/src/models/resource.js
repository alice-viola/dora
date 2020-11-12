'use strict'

let GE = require('../events/global')
const mongoose = require('mongoose')

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

class DeletedResource {
	constructor (args) {
		this._p = args
		this._kind = this.constructor.name
		this._db = db
		this._valid = null
	}	

    model () {
        return DeletedResource._model
    }

    static makeModel (kind) {
        if (this._model == null) {
            this._model = mongoose.model(kind, this.schema())
        }
    }

    static schema () {
        return {
            apiVersion: String,
            kind: String,
            metadata: {name: String, group: String},
            spec: {
                resource: Object
            },
            created: {type: Date, default: new Date()}
        }
    }

	async create () {
		let instance = new (this.model())(this._p)
		await instance.save()
	}

    async find (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().find().lean(true)  
        	} else {
        	    res = await this.model().find({ 'metadata.group': args.metadata.group}).lean(true)  
        	}
        	return this._formatRes(res)
        } else {
			let res = await this.model().find().lean(true)	
			return this._formatRes(res)
        }
    }

    async findOne (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return this._formatOneRes(res)
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return this._formatOneRes(res)
        }
    }

    async findOneAsResource (args, resourceClass) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return new resourceClass(res)
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return new resourceClass(res)
        }
    }

	async describeOne (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return this._formatOneRes(res)
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return this._formatOneRes(res)
        }
	}

}

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

	isGroupRelated () {
		return false
	}

	static isGroupRelated () {
		return false
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

    async find (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().find().lean(true)  
        	} else {
        	    res = await this.model().find({ 'metadata.group': args.metadata.group}).lean(true)  
        	}
        	return this._formatRes(res)
        } else {
			let res = await this.model().find().lean(true)	
			return this._formatRes(res)
        }
    }

    async findOne (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return this._formatOneRes(res)
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return this._formatOneRes(res)
        }
    }

    async findOneAsResource (args, resourceClass) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return new resourceClass(res)
        } else {
        	console.log(args.metadata)
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return new resourceClass(res)
        }
    }

	async describeOne (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return this._formatOneRes(res)
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return this._formatOneRes(res)
        }
	}

	async update () {
		try {
			let instance = await this.model().findOneAndUpdate({metadata: this._neededMetadata()}, this._p)
			if (instance) {
				await instance.save()	
				return true
			} else {
				return false
			}
		} catch (err) {
			console.log(err, this)
		}
	}

	async delete () {
		let deleteResource = new DeletedResource({
			apiVersion: GE.DEFAULT.API_VERSION,
			kind: this._p.kind,
			metadata: this._p.metadata,
			spec: {
				resource: this._p
			}
		})
		await deleteResource.create() 
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
module.exports.DeletedResource = DeletedResource
module.exports.RV = ResourceValidation
module.exports.GE = GE