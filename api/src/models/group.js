'use strict'

let mongoose = require('mongoose')

let GroupSchema = mongoose.model('Group', {
    apiVersion: String,
    kind: String,
    metadata: Object,
    created: {type: Date, default: new Date()}
})

module.exports = {
  model () {
    return GroupSchema
  },
}