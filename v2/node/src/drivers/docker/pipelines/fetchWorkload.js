'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db = require('../db')
let pipeline = scheduler.pipeline('fetchWorkload')

pipeline.step('fetch', (pipe, job) => {
	pipe.data.workloads = db.workloads()
	pipe.end()
})

module.exports = scheduler