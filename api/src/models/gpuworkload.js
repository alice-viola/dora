'use strict'

let mongoose = require('mongoose')

let GPUWorkloadSchema = mongoose.model('GPUWorkload', {
        apiVersion: String,
        kind: String,
        metadata: {name: String, group: String},
        spec: {
        	selectors: {
        		gpu: Object,
        		node: Object,
        		label: String
        	},
        	image: Object,
        	volumes: Array
        },
        created: {type: Date, default: new Date()},
        status: Array,
        currentStatus: String,
        scheduler: Object,
        locked: {type: Boolean, default: false}
})

module.exports = {
  model () {
    return GPUWorkloadSchema
  },
}