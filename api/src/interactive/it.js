'use strict'

let procedures = {
	'workload-prom': require('./procedures/prom') 
}

module.exports.get = (name) => {
	if (procedures[name] == undefined) {
		return {nopipe: true}
	}
	return procedures[name].fn
}

module.exports.apply = (name, responses) => {
	let res = procedures[name].exec(responses)
	return res
}