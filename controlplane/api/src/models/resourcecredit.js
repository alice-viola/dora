'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class ResourceCredit extends R.Resource {

    static _model = null

    model () {
        return ResourceCredit._model
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
    		metadata: Object,
            spec: Object,
            user: Object,
            wants: {type: String, default: 'RUN'},
            status: Array,
            currentStatus: String,
    		created: {type: Date, default: new Date()}
		}
  	}

    isGroupRelated () {
        return false
    }

    static isGroupRelated () {
        return false
    }

    static async CreditForResourcePerHour (resourceName) {
        let creditResource = await (ResourceCredit._model).findOne({'metadata.name': resourceName}).lean(true) 
        if (creditResource == null) {
            return 0
        } else {
            return creditResource.spec.credit.per.hour    
        }
    }

 	validate () {
 	    let validationResult = {global: true, steps: []}
 	    this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
 	    this._validate(this._p.metadata, R.RV.NOT_EQUAL, undefined, validationResult)
 	    this._validate(this._p.metadata.name, R.RV.NOT_EQUAL, undefined, validationResult)
 	    this._valid = validationResult
 	    return this
 	}

    _formatRes (res) {
        let result = []
        res.forEach((r) => {
            result.push(this._formatOneRes(r))
        })
        return result
    }

    _formatOneRes (res) {
        if (res == null) {
            return {error: 'Resource not exist'}
        }
        return {
            kind: res.kind,
            name: res.metadata.name,
            wants: res.wants || null,
            credit_per_hour: res.spec.credit.per.hour
        }
    }
} 