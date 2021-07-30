'use strict'


module.exports.agent = {}

/**
*	Args:
*
*	type: get, post
*	resource: api,Workload...
*	verb: apply,delete...
*	group: groupOverride OPT
*	token: tokenOverride OPT
*	body: body OPT
*	query: query OPT
*	server: server OPT
*/
module.exports.apiRequest = (args, cb) => {
	try {
		let apiVersion 
		if (args.apiVersion !== undefined) {
			apiVersion = args.apiVersion
		} else {
			apiVersion = args.body !== undefined ? (args.resource == 'batch' ? self.agent.DEFAULT_API_VERSION : args.body.apiVersion) : self.agent.DEFAULT_API_VERSION
		}
		if (apiVersion == undefined) {
			apiVersion = self.agent.DEFAULT_API_VERSION 
		}
		let bodyData = args.body == undefined ? null : {data: args.body}
		let zone = process.env.ZONE !== undefined ? process.env.ZONE : ((args.body !== undefined && args.body.metadata !== undefined && args.body.metadata.zone !== undefined) ? args.body.metadata.zone : '-')
		self.agent.axios.defaults.headers.common = {'Authorization': `Bearer ${args.token || self.agent.token}`}
		//console.log(`${args.server || self.agent.server}/${apiVersion}/${process.env.ZONE || '-'}/${args.group || '-'}/${args.resource}/${args.verb}`)
		self.agent.axios[args.type](`${args.server || self.agent.server}/${apiVersion}/${process.env.ZONE || '-'}/${args.group || '-'}/${args.resource}/${args.verb}`, 
			bodyData, args.query, {timeout: 1000}).then((res) => {
				if (res.err == null) {
					cb(null, res.data)		
				} else {
					cb(true, res.err)
				}
			
		}).catch((err) => {
			//console.log(err)
			if (process.env.DEBUG == 'true') {
				console.log(err)
			}
			if (err.code == 'ECONNREFUSED') {
				cb('Error connecting to API server ' + self.agent.server + '. Is the server online? Are you online?')
				// errorLog('Error connecting to API server ' + userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0])
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb('Error in response from API server: ' + err.response.statusText)
					//errorLog('Error in response from API server: ' + err.response.statusText) 	
				} else {
					cb('Error in response from API server: Unknown')
				}
			}
		}) 	
	} catch (err) {
		cb('HTTP AGENT internal error: ' +  err)
		//errorLog('CLI internal error: ' +  err)
	}
}


/**
*	Args:
*	
*	axios
*	DEFAULT_API_VERSION
*	server
*	token
*	
*/
module.exports.configureAgent = (args) => {
	Object.keys(args).forEach((key) => {
		self.agent[key] = args[key]
	})
}

var self = module.exports