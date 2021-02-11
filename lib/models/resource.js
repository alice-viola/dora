'use strict'

let GE = require('../events/global')
const mongoose = require('mongoose')

const ResourceValidation = {
	EQUAL: 'equal',
	NOT_EQUAL: 'not_equal',
    GREATER_THAN: 'greater_than'
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

    static async FindWorkloadsByUserInWindow (user, windowType) {
        let multiplicator = null
        switch (windowType) {
            case 'montly':
                multiplicator = 30 * 60 * 60 * 24 * 1000 
                break

            case 'weekly':
                multiplicator = 7 * 60 * 60 * 24 * 1000
                break

            case 'daily': 
                multiplicator = 60 * 60 * 24 * 1000  
                break
                
            case 'hourly': 
                multiplicator = 60 * 60 * 1 * 1000  
                break

            case 'minutes': 
                multiplicator = 60 * 1 * 1000  
                break

            default:
                multiplicator = 7 * 60 * 60 * 24 * 1000
                break

        }
        return await (DeletedResource._model).find({
            'spec.resource.kind': 'Workload', 
            'spec.resource.user.user': user,
            created: {
                $gte: new Date(new Date() - multiplicator)
            }
        }).lean(true) 
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

    isGroupRelated () {
        return true
    }

    static isGroupRelated () {
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

    _formatRes (res) {
        return res
    }

    _describeOneRes (res) {
        return res
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

    isZoneRelated () {
        return false
    }

    static isZoneRelated () {
        return false
    }

	hasSelector (selector) {
		if (this._p.spec == undefined || this._p.spec.selectors == undefined) {
			return false
		}
		return this._p.spec.selectors[selector] !== undefined ? true : false
	}

	canCancelIfLocked () {
		return false
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
        	} else if (args.metadata.group == args.user.defaultGroup) {
        		/**
        		*	If the request group is the same as the default user group,
        		*	pwm fetchs all the groups for the user
        		*/
        		let resAry = []
        		for (var group = 0; group < args._userDoc._p.spec.groups.length; group += 1) {
					let singleGroupRes = await this.model().find({ 'metadata.group': args._userDoc._p.spec.groups[group].name}).lean(true)  
        			resAry.push(singleGroupRes)
        		}
        		res = resAry.flat()
        	} else {
        		/** 
        		*	Else return only the request group
        		*/
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
            console.log('---->', args)
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

    async findAsResource (args, resourceClass) {
        let resourceToReturn = []
        if (this.isGroupRelated()) {
            let res = null
            if (args.metadata.group == GE.LABEL.PWM_ALL) {
                res = await this.model().find().lean(true)  
            } else if (args.metadata.group == args.user.defaultGroup) {
                /**
                *   If the request group is the same as the default user group,
                *   pwm fetchs all the groups for the user
                */
                let resAry = []
                for (var group = 0; group < args._userDoc._p.spec.groups.length; group += 1) {
                    let singleGroupRes = await this.model().find({ 'metadata.group': args._userDoc._p.spec.groups[group].name}).lean(true)  
                    resAry.push(singleGroupRes)
                }
                res = resAry.flat()
            } else {
                /** 
                *   Else return only the request group
                */
                res = await this.model().find({ 'metadata.group': args.metadata.group}).lean(true)  
            }
            res.forEach((oneRes) => {
                resourceToReturn.push(new resourceClass(res))
            })
        } else {
            let res = await this.model().find().lean(true)  
            res.forEach((oneRes) => {
                resourceToReturn.push(new resourceClass(res))
            })
        }
        return resourceToReturn
    }

	async getOne (args) {
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

	async describeOne (args) {
    	if (this.isGroupRelated()) {
        	let res = null
        	if (args.metadata.group == GE.LABEL.PWM_ALL) {
        	    res = await this.model().findOne({ 'metadata.name': args.metadata.name}).lean(true)  
        	} else {
        	    res = await this.model().findOne({metadata: args.metadata}).lean(true)  
        	}
        	return res
        } else {
			let res = await this.model().findOne({metadata: args.metadata}).lean(true)	
			return res
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

    cancel () {
        this._p.wants = GE.RESOURCE.WANT_STOP
    }

    async drain (bindModel) {
        let binds = await bindModel.Find({_id: this._p._id})
        
        for (var fromIndex = 0; fromIndex < binds.from.length; fromIndex += 1) {
            let bindToDelete = await bindModel.Delete({_id: binds.from[fromIndex].bindId})
        }
        for (var toIndex = 0; toIndex < binds.to.length; toIndex += 1) {
            let bindToDelete = await bindModel.Drain({_id: binds.to[toIndex].bindId})
        }
        this._p.wants = GE.RESOURCE.WANT_DRAIN
        return binds
    }

	async delete () {
        /**
        *   This is to avoid Mongo BSON serialization
        *   issues when label keys have dots :(
        */
        if (this._p.scheduler !== undefined 
            && this._p.scheduler.request !== undefined
            && this._p.scheduler.request.createOptions !== undefined
            && this._p.scheduler.request.createOptions.Labels !== undefined ) {
            this._p.scheduler.request.createOptions.Labels = []
        }
		let deleteResource = new DeletedResource({
			apiVersion: GE.DEFAULT.API_VERSION,
			kind: this._p.kind,
			metadata: this._p.metadata,
			spec: {
				resource: this._p
			},
            created: new Date()
		})
		await deleteResource.create() 
		await this.model().deleteOne({metadata: this._neededMetadata()})
	}

    async findOneIdAsResource (args, resourceClass) {
        let res = await this.model().findOne({ '_id': args._id}).lean(true)  
        return new resourceClass(res)
    }

	_validate (property, condition, value, validationResult) {
        if (validationResult.global == false) {
            return
        }
		let _res = false
		switch (condition) {
			case ResourceValidation.EQUAL:
				_res = property == value
				break

			case ResourceValidation.NOT_EQUAL:
				_res = property != value
				break

            case ResourceValidation.GREATER_THAN:
                _res = property > value
                break
		}
		if (validationResult.global == true && _res == false) {
            console.log('FAIL AT', property, condition, value)
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