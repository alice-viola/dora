'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let db = require('../db')
let pipeline = scheduler.pipeline('fetchWorkload')

pipeline.step('fetch', (pipe, job) => {
	pipe.data.workloads = db.workloads()
	pipe.end()
	//db.db.createReadStream().on('data', (entry) => {
	//    pipe.data.workloads.push(entry.value)
	//}).on('end', () => {
	//	pipe.end()	
	//})
})

module.exports = scheduler