'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class CPU extends R.Resource {

  static _model = null

  model () {
      return CPU._model
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
        lastSeen: {type: Date, default: new Date()},
        created: {type: Date, default: new Date()}
      }
  }

  isGroupRelated () {
    return false
  }

  static isGroupRelated () {
    return false
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
      function millisToMinutesAndSeconds(millis) {
          let minutes = Math.floor(millis / 60000)
          let seconds = ((millis % 60000) / 1000).toFixed(0)
          if (minutes > 60) {
              let hours = (minutes / 60).toFixed(0)
              if (hours > 24) {
                  return (hours / 24).toFixed(0) + ' d' + ' m ago'
              } else {
                  return hours + ' h' + ' m ago'
              }
          } else {
              if (seconds < 20 && minutes == 0) {
                return 'now'
              } else {
                return minutes + ":" + (seconds < 10 ? '0' : '') + seconds + ' m ago';  
              }
          }
      }
      return {
          kind: res.kind,
          name: res.metadata.name,
          product_name: res.spec.product_name,
          load: res.spec.load,
          node: res.spec.node,
          lastSeen: res.lastSeen !== undefined ? millisToMinutesAndSeconds(new Date() - res.lastSeen): '*****',
      }
  }
} 