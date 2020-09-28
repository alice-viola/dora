'use strict'

let mongoose = require('mongoose')

let VolumeSchema = mongoose.model('Volume', {
        apiVersion: String,
        kind: String,
        metadata: {name: String, group: String},
        spec: {
        	selectors: Object,
        	mount: {
                nfs: Object,
                local: Object
            },
            accessMode: String
        },
        created: {type: Date, default: new Date()},
        bound:  {
            value: {type: Boolean, default: false},
            by: Array
        },
        locked: {type: Boolean, default: false}
})

module.exports = {
  model () {
    return VolumeSchema
  },
}