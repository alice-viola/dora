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

module.exports.DEFAULT = {}
module.exports.ERROR = {}
module.exports.WORKLOAD = {}
module.exports.DATASET = {}

module.exports.WORKLOAD.INSERTED  		  = 'INSERTED'
module.exports.WORKLOAD.ACCEPTED  		  = 'ACCEPTED'
module.exports.WORKLOAD.DENIED 	 		  = 'DENIED'
module.exports.WORKLOAD.QUENING 		  = 'QUENING'
module.exports.WORKLOAD.QUENED 			  = 'QUENED'
module.exports.WORKLOAD.ASSIGNED 		  = 'ASSIGNED'
module.exports.WORKLOAD.PULLING 		  = 'PULLING'
module.exports.WORKLOAD.REQUESTED_PULLING = 'REQUESTED_PULLING'
module.exports.WORKLOAD.LAUNCHING 		  = 'LAUNCHING'
module.exports.WORKLOAD.REQUESTED_LAUNCH  = 'REQUESTED_LAUNCH'
module.exports.WORKLOAD.LAUNCHED 		  = 'LAUNCHED'
module.exports.WORKLOAD.RUNNING 		  = 'RUNNING'
module.exports.WORKLOAD.CRASHED 		  = 'CRASHED'
module.exports.WORKLOAD.STOPPED 		  = 'STOPPED'
module.exports.WORKLOAD.ENDDED 			  = 'ENDDED'
module.exports.WORKLOAD.ERROR 			  = 'ERROR'
module.exports.WORKLOAD.UNKNOWN 		  = 'UNKNOWN'
module.exports.WORKLOAD.REQUESTED_CANCEL  = 'REQUESTED_CANCEL'
module.exports.WORKLOAD.STUCK	 		  = 'STUCK'

module.exports.ERROR.GENERIC 			  = 'GENERIC_ERROR'
module.exports.ERROR.GROUP_NOT_ALLOWED 	  = 'GROUP_NOT_ALLOWED'
module.exports.ERROR.REGISTRY_UNREACHABLE = 'REGISTRY_UNREACHABLE'
module.exports.ERROR.PULL_FAILED 		  = 'PULL_FAILED'
module.exports.ERROR.IMAGE_NOT_PRESENT    = 'IMAGE_NOT_PRESENT'
module.exports.ERROR.NODE_UNREACHABLE 	  = 'NODE_UNREACHABLE'
module.exports.ERROR.DATASET_UNREACHABLE  = 'DATASET_UNREACHABLE'
module.exports.ERROR.MEMORY_LIMIT 		  = 'MEMORY_LIMIT'
module.exports.ERROR.UNKNOWN 			  = 'UNKNOWN_ERROR'
module.exports.ERROR.MAX_RETRY_REACH	  = 'MAX_RETRY_REACH'

module.exports.ERROR.EMPTY_NODE_SELECTOR  = 'EMPTY_NODE_SELECTOR'
module.exports.ERROR.EMPTY_GPU_SELECTOR   = 'EMPTY_GPU_SELECTOR'
module.exports.ERROR.NO_GPU_FREE   		  = 'NO_GPU_FREE'
module.exports.ERROR.NO_GPUS_FREE         = 'NO_GPUS_FREE'
module.exports.ERROR.NO_GPU_AVAILABLE     = 'NO_GPU_AVAILABLE'
module.exports.ERROR.NO_GPUS_AVAILABLE    = 'NO_GPUS_AVAILABLE'
module.exports.ERROR.NO_VOLUME_MATCH   	  = 'NO_VOLUME_MATCH'

module.exports.DEFAULT.MS_BETWEEN_LAUNCH_ATTEMPTS = 20000
module.exports.DEFAULT.MAX_LAUNCH_ATTEMPTS   = 3
module.exports.DEFAULT.MIN_LAUNCH_ATTEMPTS   = 1


module.exports.status = (_status, reason, mex) => {
	return {status: _status, data: new Date(), reason: reason, mex: mex}
}