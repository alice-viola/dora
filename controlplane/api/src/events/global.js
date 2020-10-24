'use strict'

let AwaitLock = require('await-lock')

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

/**
*	Macro
*/
module.exports.DEFAULT = {}
module.exports.LABEL = {}
module.exports.ERROR = {}
module.exports.WORKLOAD = {}
module.exports.VOLUME = {}
module.exports.NODE = {}
module.exports.LOCK = {}

module.exports.WORKLOAD.INSERTED  		  = 'INSERTED'
module.exports.WORKLOAD.ACCEPTED  		  = 'ACCEPTED'
module.exports.WORKLOAD.DENIED 	 		  = 'DENIED'
module.exports.WORKLOAD.QUENING 		  = 'QUENING' // TO REMOVE
module.exports.WORKLOAD.QUENED 			  = 'QUEUED'
module.exports.WORKLOAD.ASSIGNED 		  = 'QUEUED' //EX ASSIGNED
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

module.exports.VOLUME.INSERTED	 	      = 'INSERTED'
module.exports.VOLUME.CREATED	   	      = 'ASSIGNED'
module.exports.VOLUME.STUCK	   	  	      = 'STUCK'
module.exports.VOLUME.ERROR	   	  	      = 'ERROR'

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

module.exports.ERROR.WORKINGDIR_NOT_BOUND = 'WORKINGDIR_NOT_BOUND'

module.exports.ERROR.EMPTY_NODE_SELECTOR  = 'EMPTY_NODE_SELECTOR'
module.exports.ERROR.EMPTY_GPU_SELECTOR   = 'EMPTY_GPU_SELECTOR'
module.exports.ERROR.EMPTY_CPU_SELECTOR   = 'EMPTY_CPU_SELECTOR'
module.exports.ERROR.NO_GPU_FREE   		  = 'NO_GPU_FREE'
module.exports.ERROR.NO_GPUS_FREE         = 'NO_GPUS_FREE'
module.exports.ERROR.NO_CPU_FREE   		  = 'NO_CPU_FREE'
module.exports.ERROR.NO_CPUS_FREE         = 'NO_CPUS_FREE'
module.exports.ERROR.NO_GPU_AVAILABLE     = 'NO_GPU_AVAILABLE'
module.exports.ERROR.NO_GPUS_AVAILABLE    = 'NO_GPUS_AVAILABLE'
module.exports.ERROR.NO_VOLUME_MATCH   	  = 'NO_VOLUME_MATCH'
module.exports.ERROR.VOLUME_NOT_EXIST     = 'VOLUME_NOT_EXIST'
module.exports.ERROR.NO_STORAGE_MATCH     = 'NO_STORAGE_MATCH'
module.exports.ERROR.NO_STORAGE_TYPE_MATCH = 'NO_STORAGE_TYPE_MATCH'
module.exports.ERROR.NO_MATCHS	   	  	  = 'NO_MATCHS'

module.exports.NODE.NOT_READY			  = 'NOT_READY'
module.exports.NODE.READY			  	  = 'READY'
module.exports.NODE.MAINTENANCE			  = 'MAINTENANCE'

/**
* 	Defaults
*/
module.exports.DefaultApiVersion = 'v1'
module.exports.DEFAULT.API_VERSION = 'v1'
module.exports.DEFAULT.GPU_COMPUTE_TYPE	= 'C'
module.exports.DEFAULT.MS_BETWEEN_LAUNCH_ATTEMPTS = 20000
module.exports.DEFAULT.MAX_LAUNCH_ATTEMPTS   = 3
module.exports.DEFAULT.MIN_LAUNCH_ATTEMPTS   = 1

/**
*	Labels
*/
module.exports.LABEL.PWM_RESOURCE = 'pwm.resource'
module.exports.LABEL.PWM_ALL  = 'pwm.all'
module.exports.LABEL.PWM_ZERO = 'pwm.zero'

/**
*	Locks
*/
module.exports.LOCK.API = new AwaitLock.default()

module.exports.status = (_status, reason, mex) => {
	return {status: _status, data: new Date(), reason: reason, mex: mex}
}

/**
*	Modifiers
*/
module.exports.containerName = (resource) => {
	return 'pwm.' + resource.metadata.group + '.' + resource.metadata.name
}
