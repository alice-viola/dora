'use strict'

module.exports.ERROR = {}
module.exports.WORKLOAD = {}
module.exports.DATASET = {}

module.exports.WORKLOAD.INSERTED  		= 'INSERTED'
module.exports.WORKLOAD.ACCEPTED  		= 'ACCEPTED'
module.exports.WORKLOAD.DENIED 	 		= 'DENIED'
module.exports.WORKLOAD.QUENING 		= 'QUENING'
module.exports.WORKLOAD.QUENED 			= 'QUENED'
module.exports.WORKLOAD.ASSIGNED 		= 'ASSIGNED'
module.exports.WORKLOAD.LAUNCHING 		= 'LAUNCHING'
module.exports.WORKLOAD.LAUNCHED 		= 'LAUNCHED'
module.exports.WORKLOAD.RUNNING 		= 'RUNNING'
module.exports.WORKLOAD.CRASHED 		= 'CRASHED'
module.exports.WORKLOAD.STOPPED 		= 'STOPPED'
module.exports.WORKLOAD.ENDDED 			= 'ENDDED'
module.exports.WORKLOAD.ERROR 			= 'ERROR'


module.exports.ERROR.GENERIC 			  = 'GENERIC_ERROR'
module.exports.ERROR.GROUP_NOT_ALLOWED 	  = 'GROUP_NOT_ALLOWED'
module.exports.ERROR.REGISTRY_UNREACHABLE = 'REGISTRY_UNREACHABLE'
module.exports.ERROR.IMAGE_NOT_PRESENT    = 'IMAGE_NOT_PRESENT'
module.exports.ERROR.NODE_UNREACHABLE 	  = 'NODE_UNREACHABLE'
module.exports.ERROR.DATASET_UNREACHABLE  = 'DATASET_UNREACHABLE'
module.exports.ERROR.MEMORY_LIMIT 		  = 'MEMORY_LIMIT'

module.exports.status = (_status, reason, mex) => {
	return {status: _status, data: new Date(), reason: reason, mex: mex}
}

//// Examples
//ws.status(ws.WORKLOAD.DENIED, ws.ERROR.GROUP_NOT_ALLOWED)
//
//ws.status(ws.WORKLOAD.QUENED)
//ws.status(ws.WORKLOAD.RUNNING)
//ws.status(ws.WORKLOAD.STOPPED, ws.ERROR.MEMORY_LIMIT)
//ws.status(ws.WORKLOAD.ERROR, ws.ERROR.NODE_UNREACHABLE)