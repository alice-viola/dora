'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class Stat extends R.Resource {

    static _model = null

    model () {
        return Stat._model
    }

    static makeModel (kind) {
        if (this._model == null) {
            this._model = mongoose.model(kind, this.schema())
        }
    }

    static schema () {
        return {
            kind: String,
            computed: Object
        }
    }

    static async FindByZoneLastPeriod (zone, period, type, name) {
        let multiplicator = null
        const multKind = period[period.length - 1]
        let multValue = parseInt(period.slice(0, -1))
        if (multValue <= 0) {
            multValue = 1
        } 
        switch (multKind) {

            case 'm':
                multiplicator = multValue * 60 * 1000 
                break 

            case 'h':
                multiplicator = multValue * 60 * 60 * 1000 
                break

            case 'd': 
                multiplicator = multValue * 24 * 60 * 60 * 1000 
                break
                
            case 'w': 
                multiplicator = multValue * 7 * 24 * 60 * 60 * 1000 
                break

            case 'M': 
                multiplicator = multValue * 30 * 7 * 24 * 60 * 60 * 1000 
                break

            case 'y': 
                multiplicator = multValue * 365 * 7 * 24 * 60 * 60 * 1000 
                break

            default:
                multiplicator = 1 * 60 * 1000 
                break

        }
        let results =  await (Stat._model).find({'computed.zone': zone, 'computed.date': {
            $gte: new Date(new Date() - multiplicator)
        }}).lean(true)
        results = results.map((r) => {
            if (type == undefined || type == null || r.computed[type] == undefined) {
                return r.computed 
            } else {
                if (name !== undefined && name !== null) {
                    return r.computed[type][name]    
                } else {
                    return r.computed[type]
                }
            }            
        }) 
        return results
    }

    static async FindAll () {
        return await (Stat._model).find().lean(true) 
    }

    isGroupRelated () {
        return false
    }

    static isGroupRelated () {
        return false
    }

    validate () {
        let validationResult = {global: true, steps: []}
        this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
        this._valid = validationResult
        return this
    }

    _formatRes (res) {
        return res.computed
    }
} 