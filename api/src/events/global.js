'use strict'

const EventEmitter = require('events').EventEmitter
module.exports.Emitter = new EventEmitter
/**
*	Events
*/
module.exports.SystemStarted = 'sysstart'
module.exports.WriteSysLog = 'writesyslog'
module.exports.ApiCall = 'apicall'
module.exports.GpuUpdate = 'gpupdate'
module.exports.RunGpuScheduler = 'rungpuscheduler'
