'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class User extends R.Resource {

    static _model = null

    model () {
        return User._model
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
            spec: {
                groups: Array
            },
            active: {type: Boolean, default: true},
    		created: {type: Date, default: new Date()}
		}
  	}

    hasGroup (groupToCheck) {
        return this._p.spec.groups.map((g) => {return g.name}).includes(groupToCheck) 
    }

    policyForGroup (groupToCheck) {
        let group = this._p.spec.groups.filter((g) => {return g.name == groupToCheck})
        return group[0].policy
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
        return {
            kind: res.kind,
            name: res.metadata.name,
            groups: res.spec.groups.map((g) => {return g.name}),
            active: res.active
        }
    }
} 