'use strict'

let axios = require('axios')
let https = require('https')

const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
})

module.exports = (args) => {
	let protocol = 'https'
	instance[args.method](protocol +'://' + args.node._p.spec.address[0] + args.path, args.body).then(res => {
		if (args.then !== undefined) {
			args.then(res)
		}
	}).catch((err) => {
		if (args.err !== undefined) {
			args.err(err)
		}
	}) 
}