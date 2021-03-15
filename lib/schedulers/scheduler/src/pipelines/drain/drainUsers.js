'use strict'

const GE = require('../../../../../index').events
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainUsers')

pipe.step('drainUsers', async function (pipe, data) {
	let users = data.users
	for (var userIndex = 0; userIndex < users.length; userIndex += 1) {
		await users[userIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 