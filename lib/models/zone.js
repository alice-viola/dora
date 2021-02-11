'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class Zone extends R.Resource {

    static _model = null

    model () {
        return Zone._model
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
                endpoints: Array
            },
            computed: {
                locked: {type: Boolean, default: false},
                wants: {type: String, default: 'RUN'},
                status: Array,
                currentStatus: String,
                resources: Array,
            },
            created: {type: Date, default: new Date()},
        }
    }

    isGroupRelated () {
        return true
    }

    static isGroupRelated () {
        return true
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
            group: res.metadata.group,
            name: res.metadata.name,
            type: res.spec.kind,
            endpoints: res.spec.endpoints,
        }
    }
} 