let model = {
	Node: require('./node'),
	Group: require('./group'),
	Workload: require('./workload'),
	GPUWorkload: require('./gpuworkload'),
	CPUWorkload: require('./cpuworkload'),
	GPU: require('./GPU'),
	CPU: require('./CPU'),
	Volume: require('./volume'),
	WorkingDir: require('./workingdir')
}

Object.keys(model).forEach((m) => {
	model[m].makeModel(m)
})

module.exports = model