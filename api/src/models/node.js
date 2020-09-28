'use strict'

let mongoose = require('mongoose')

let NodeSchema = mongoose.model('Node', {
        apiVersion: String,
        kind: String,
        metadata: Object,
        spec: Object,
        created: {type: Date, default: new Date()}
})

module.exports = {
  model () {
    return NodeSchema
  },

  fn: {
    async ls (query) {
      return await Userspace.find(query)
    },
    
    async lsOne (query) {
      return await Userspace.findOne(query)
    },

    async create (data) {
      let newUserspace = await Userspace.create(data)
      await newUserspace.save()
      return newUserspace
    },

    async update (data) {
      //let newUserspace = await Userspace.create(data)
      //await newUserspace.save()
      //return newUserspace
    },

    async delete (data) {
      return await Userspace.deleteOne(data)
    }
  }
}