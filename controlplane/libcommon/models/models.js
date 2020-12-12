let model = {
	Node: require('./node'),
	Group: require('./group'),
	User: require('./user'),
	Workload: require('./workload'),
	GPU: require('./GPU'),
	CPU: require('./CPU'),
	Volume: require('./volume'),
	Storage: require('./storage'),
	ResourceCredit: require('./resourcecredit'),
	DeletedResource: require('./resource').DeletedResource,
	Bind: require('./bind'),
	Zone: require('./zone'),
}

Object.keys(model).forEach((m) => {
	model[m].makeModel(m)
})

module.exports = model