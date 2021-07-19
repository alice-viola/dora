'use strict'

module.exports.log = (...args) => {
	if (process.env.DEBUG == 'true') {
		console.log(args.join(' '))	
	}
}

module.exports.err = (...args) => {
	if (process.env.DEBUG == 'true') {
		console.log(args)	
	}
}