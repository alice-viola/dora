'use strict'

let Scheduler = require('../scheduler')
let scheduler = new Scheduler()

scheduler.addLine('fetchGpuDataFromDb', 
	require('./gpu_fetch_db_pipeline'), [], {
	runEveryMs: 1000
})

scheduler.addLine('fetchGpuFromNodes', 
	require('./gpu_fetch_nodes_pipeline'), [], {
	runEveryMs: 10000
})

scheduler.addLine('gpuAssignedToLaunch', 
	require('./gpu_toassign_pipeline'), [], {
	runOnEvent: 'gpuFetchCompleted'
})

scheduler.addLine('gpuLaunchWorkload', 
	require('./gpu_launch_pipeline'), [], {
	runEveryMs: 3000
	//runOnEvent: 'gpuFetchCompleted'
})

scheduler.addLine('gpuStatusWorkload', 
	require('./gpu_container_state_cntl_pipeline'), [], {
	runEveryMs: 10000
})

scheduler.addLine('gpuCancelWorkload', 
	require('./gpu_cancel_pipeline'), [], {
	runEveryMs: 10000
})
