'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class Node extends R.Resource {

  static #_model = null

  model () {
      return Node.#_model
  }

  static makeModel (kind) {
      if (this.#_model == null) {
          this.#_model = mongoose.model(kind, this.schema())
      }
  }

  static schema () {
      return {
        apiVersion: String,
        kind: String,
        metadata: Object,
        spec: Object,
        created: {type: Date, default: new Date()}
      }
  }

  isMaintenance () {
    return (this._p.spec.maintenance == null 
      || this._p.spec.maintenance == undefined 
      || this._p.spec.maintenance == false) ? false : true
  }

  address () {
    return this._p.spec.address[0]
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
            address: res.spec.address.map((a) => {return a}),
            maintenance: res.spec.maintenance
        }
    }
} 