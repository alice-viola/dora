'use strict'

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.run({
	name: 'sendmessages', 
	pipeline: require('./pipelines/fetchdb').getPipeline('sendmessages'),
	run: {
		everyMs: 60000
	}
})

scheduler.log(false)