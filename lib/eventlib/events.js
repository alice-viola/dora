'use strict'

const NATS = require('nats')
let nc 
let ncConnectInterval = null
let ncConnected = false

function connectNats () {
	let server = process.env.nats_server || '0.0.0.0:4222'
	console.log('Try to connect', server)
	nc = NATS.connect({servers: [server] , json: true })
	nc.on('error', (err) => {
		console.log(err)
	})
	nc.on('connect', () => {
		console.log('connect', ncConnectInterval)
		ncConnected = true
		if (ncConnectInterval !== null && ncConnectInterval !== undefined) {
			console.log('Clearing interval')
			clearInterval(ncConnectInterval)	
			ncConnectInterval = null	
		}
	})
	nc.on('disconnect', function () {
		console.log('disconnect', ncConnectInterval)
		ncConnected = false
		if (ncConnectInterval == null || ncConnectInterval == undefined) {
			ncConnectInterval = setInterval(connectNats, 1000)
		}
	})
	nc.on('close', function () {
		console.log('close')
		ncConnected = false
		if (ncConnectInterval == null || ncConnectInterval == undefined) {
			ncConnectInterval = setInterval(connectNats, 1000)
		}
	})
}


module.exports.events = {
	WORKLOAD_STATUS_RUNNING: 'WORKLOAD_STATUS_RUNNING'
}

module.exports.connect = () => {
	try {
		ncConnectInterval = setInterval(connectNats, 1000)
	} catch (err) {
		console.log(err)
	}
}

module.exports.emit = (eventName, eventMessage) => {
	if (ncConnected == false) {
		return false
	}
	nc.publish(eventName, eventMessage)
	return true
}

module.exports.onEvent = (eventName, cb) => {
	if (ncConnected == false) {
		return false
	}
	nc.subscribe(eventName, function (msg) {
	  	if (cb !== undefined && cb !== null && typeof cb == 'function') {
	  		cb(msg)
	  	}
	})
	return true
}

module.exports.onEventQueue = (eventName, queueName, cb) => {
	if (ncConnected == false) {
		return false
	}
	nc.subscribe(eventName, {queue: queueName}, function (msg) {
	  	if (cb !== undefined && cb !== null && typeof cb == 'function') {
	  		cb(msg)
	  	}
	})
	return true
}