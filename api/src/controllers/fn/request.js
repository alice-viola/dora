'use strict'

let axios = require('axios')

module.exports = (args) => {
	let protocol = 'http'
	axios[args.method](protocol +'://' + args.node._p.spec.address[0] + args.path, args.body).then(res => {
		if (args.then !== undefined) {
			args.then(res)
		}
	}).catch((err) => {
		if (args.err !== undefined) {
			args.err(err)
		}
	}) 
}