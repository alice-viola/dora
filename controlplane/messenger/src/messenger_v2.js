'use strict'

const sendmail = require('sendmail')()
let EventLib = require('../../../lib/eventlib/events')
let GE = require('../../../lib/events/global')
let User = require('../../../lib/models/models').User


function sendMail (from, to, subject, text) {
	sendmail({
	    from: from,
	    to: to,
	    subject: subject,
	    html: text,
	  }, function(err, reply) {
	    console.log(err && err.stack)
	    console.dir(reply)
	})
}

async function onEvent (msg) {
	let user = await User.FindByNameAndGroup(msg.workload._p.user.user, msg.workload._p.user.userGroup)
	if (user !== null) {
		if (user.spec !== undefined 
			&& user.spec.contact !== undefined 
			&& user.spec.contact.email !== undefined 
			&& msg.workload._p.spec.notify !== undefined 
			&& msg.workload._p.spec.notify.byEmail !== undefined
			&& msg.workload._p.spec.notify.byEmail == true 
			&& msg.workload._p.scheduler !== undefined) {
			sendMail(process.env.email_from || 'bot@pwm.eu', 
				user.spec.contact.email, 
				'Workload status update',
				`Your workload <b>${msg.workload._p.metadata.name}</b> is now ${msg.workload._p.currentStatus} on node ${msg.workload._p.scheduler.node}`
				)
		}
	}
}

EventLib.connect()
setInterval(function () {
	let res = EventLib.onEventQueue(EventLib.events.WORKLOAD_STATUS_RUNNING, process.env.email_queue || 'pwm.workload.email', (msg) => {
		onEvent(msg)
	})
}, 5000)
