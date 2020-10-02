'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class GPU extends R.Resource {

  static #_model = null

  model () {
      return GPU.#_model
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

  address () {
    return this._p.spec.address[0]
  }

  validate () {
      let validationResult = {global: true, steps: []}
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
          product_name: res.spec.product_name,
          minor_number: res.spec.minor_number,
          fb_memory: res.spec.fb_memory_usage + ' / ' + res.spec.fb_memory_total,
          node: res.spec.node

      }
  }
} 