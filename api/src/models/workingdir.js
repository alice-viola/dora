'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class WorkingDir extends R.Resource {

    static _model = null

    model () {
        return WorkingDir._model
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
                selectors: Object,
                volume: {
                    name: String,
                    subpath: String
                },
                accessModes: String
            },
            created: {type: Date, default: new Date()},
            bound:  {
                value: {type: Boolean, default: false},
                by: Array
            },
            status: Array,
            currentStatus: String,
            locked: {type: Boolean, default: false}
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
        return {
            kind: res.kind,
            name: res.metadata.name,
            volume: res.spec.volume.name,
            subpath: res.spec.volume.subpath,
            status: res.currentStatus
        }
    }
} 