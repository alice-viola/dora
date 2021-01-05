'use strict'

let axios = require('axios')
let https = require('https')
let fs = require('fs')

const CA_CRT = fs.readFileSync(process.env.SSL_CA_CRT)

const instance = axios.create({
  httpsAgent: new https.Agent({  
    ca: CA_CRT,
	checkServerIdentity: function (host, cert) {
	    return host == cert.subject.CN ? undefined : false;
	}
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