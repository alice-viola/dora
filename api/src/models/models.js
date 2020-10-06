let model = {
	Node: require('./node'),
	Group: require('./group'),
	GPUWorkload: require('./gpuworkload'),
	GPU: require('./GPU'),
	Volume: require('./volume')
}

Object.keys(model).forEach((m) => {
	model[m].makeModel(m)
})

module.exports = model