'use strict'

let procedures = {
	'workload-prom': require('./procedures/prom'),
	'website': require('./procedures/website'),
	'ai-lab': require('./procedures/ai-lab'),
	'ai-lab-dev': require('./procedures/ai-lab-dev'),
}

module.exports.get = (name) => {
	if (procedures[name] == undefined) {
		return {nopipe: true}
	}
	return procedures[name].fn['Init']
}

module.exports.next = (name, key, res) => {
	if (procedures[name] == undefined) {
		return {nopipe: true}
	}
	return procedures[name].next(key, res)
}

module.exports.apply = (name, responses) => {
	let res = procedures[name].exec(responses)
	return res
}