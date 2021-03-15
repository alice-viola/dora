'use strict'

const GE = require('../../../index').events
let Piperunner = require('piperunner')
const Sendmail = require('sendmail')()
let scheduler = new Piperunner.Scheduler()

function sendMail (from, to, subject, text, cb) {
	console.log(from, to, subject, text)
	Sendmail({
	    from: from,
	    to: to,
	    subject: subject,
	    html: text,
	  }, function(err, reply) {
	    console.log(err && err.stack)
	    console.dir(reply)
	    cb()
	})
}

GE.Emitter.setMaxListeners(20)

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetch/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: process.env.PIPELINE_OUT_OF_CREDIT_KILLER_MS || 10000,
		onEvents: [GE.SystemStarted, GE.ApiCall]
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {		

					scheduler.assignData('outOfCreditKiller', 'gpusStats', pipeline.data().gpusStats)
					scheduler.feed({
						name: 'outOfCreditKiller',
						data: pipeline.data().users
					})
					
					scheduler.emit('fetchdbEnd')
				}
			]
		}
	}
})

scheduler.run({
	name: 'outOfCreditKiller', 
	pipeline: require('./pipelines/killers/out_of_credit_killer').getPipeline('outOfCreditKiller'),
	run: {
		onEvents: ['fetchdbEnd']
	}
})

scheduler.log(false)

GE.Emitter.emit(GE.SystemStarted)

process.on('unhandledRejection', (reason, p) => {
	console.log('Exiting due', reason, p)
	if (process.env.alert_email !== undefined && process.env.alert_email_from !== undefined) {
		sendMail(process.env.alert_email_from, process.env.alert_email, 'SCHEDULER-OCC ERROR', reason.toString(), () => {
			process.exit()
		})		
	}
})