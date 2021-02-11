'use strict'

const GE = require('../../../../../index').events
let api = {v1: require('../../../../../index').api}
let Models = require('../../../../../index').models
let User = Models.User
let Stat = Models.Stat

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.pipeline('fetchdb').step('user', (pipe, job) => {
	api['v1']._get({kind: 'User'}, (err, _user) => {
		pipe.data.users = _user.map((user) => { return new User(user) })
		pipe.next()
	})
})

scheduler.pipeline('fetchdb').step('user', async (pipe, job) => {
	if (process.env.zone !== undefined && (process.env.enable_gpu_inactivity_check == undefined  || process.env.enable_gpu_inactivity_check == true || process.env.enable_gpu_inactivity_check == 'true')) {
		let stat = await Stat.FindByZoneLastPeriod(process.env.zone, (process.env.max_inactivity_gpu_minutes || 15).toString() + 'm', 'gpus')
		pipe.data.gpusStats = stat
	} else {
		pipe.data.gpusStats = []
	}
	pipe.next()
})

module.exports = scheduler