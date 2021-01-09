'use strict'

let axios = require('axios')
let https = require('https')
let fs = require('fs')

let instance
if (process.env.USE_CUSTOM_CA_SSL_CERT == true || process.env.USE_CUSTOM_CA_SSL_CERT == 'true') {
	const CA_CRT = fs.readFileSync(process.env.SSL_CA_CRT)
	instance = axios.create({
	  httpsAgent: new https.Agent({  
	    ca: [CA_CRT], 
		checkServerIdentity: function (host, cert) {
		    return host == cert.subject.CN ? undefined : false;
		}
	  })
	})
} else {
	instance = axios.create({
	  httpsAgent: new https.Agent({  
		rejectUnauthorized: process.env.DENY_SELF_SIGNED_CERTS || false				
	  })
	})
}

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