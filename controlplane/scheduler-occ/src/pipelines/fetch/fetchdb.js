'use strict'

const GE = require('../../../../libcommon').events
let api = {v1: require('../../../../libcommon').api}
let Models = require('../../../../libcommon').models
let User = Models.User


let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchdb').step('user', (pipe, job) => {
	api['v1']._get({kind: 'User'}, (err, _user) => {
		pipe.data.users = _user.map((user) => { return new User(user) })
		pipe.next()
	})
})

module.exports = scheduler