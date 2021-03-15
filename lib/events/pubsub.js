'use strict'

var NRP    = require('node-redis-pubsub')
var config = {
	host: '0.0.0.0',
  	port  : 6380, 
  	scope : 'pwm'  
}

var nrp = new NRP(config)

module.exports.emit = (eventName, eventMessage) => {
	nrp.emit(eventName, eventMessage)
}

module.exports.onEvent = (eventName, cb) => {
	nrp.on(eventName, (data, channel) => {
	  	if (cb !== undefined && cb !== null && typeof cb == 'function') {
	  		cb(data)
	  	}
	})
	return true
}

