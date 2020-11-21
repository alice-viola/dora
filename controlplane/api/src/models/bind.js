'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class Bind extends R.Resource {

    static _model = null

    static async Create (from, to) {
        let newBind = new (Bind._model)({
            kind: 'Bind',
            metadata: {
                name: from._p.metadata.name + '-' + to._p.metadata.name,
                group: '---', // this is here only for test
            },
            spec: {
                from: {_id: from._p._id, kind: from._p.kind},
                to: {_id: to._p._id, kind: to._p.kind},
            }
        })
        await newBind.save()
        return newBind
    }

    static async Find (args) {
        let from = await (Bind._model).find({ 'spec.from._id': args._id}).lean(true) 
        let to = await (Bind._model).find({ 'spec.to._id': args._id}).lean(true)
        return {
            to: from.map((f) => { 
                return {bindId: f._id, resource: f.spec.to }}), 
            from: to.map((f) => { 
                return {bindId: f._id, resource: f.spec.from }})
        }
    }

    static async Drain (args) {
        let bindToDrain = await (Bind._model).findOne({ '_id': args._id}).lean(true) 
        if (bindToDrain !== undefined && bindToDrain._p !== null) {
            let b = new Bind(bindToDrain)
            b._p.wants = R.GE.RESOURCE.WANT_DRAIN
            await b.update()
        }
    }

    static async Delete (args) {
        let bindToDelete = await (Bind._model).findOne({ '_id': args._id}).lean(true) 
        if (bindToDelete !== undefined) {
            let b = new Bind(bindToDelete)
            await b.delete()
        }
    }

    async drain () {}

    model () {
        return Bind._model
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
                from: Object,
                to: Object
            },
            status: Array,
            wants: {type: String, default: 'RUN'},
            currentStatus: {type: String, default: R.GE.BIND.CREATED},
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
        this._validate(this._p.spec.from, R.RV.NOT_EQUAL, undefined, validationResult)
        this._validate(this._p.spec.to, R.RV.NOT_EQUAL, undefined, validationResult)
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
            group: res.metadata.group,
            name: res.metadata.name,
            from: res.spec.from._id,
            to: res.spec.to._id,
            status: res.currentStatus
        }
    }
} 