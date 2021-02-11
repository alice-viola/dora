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
		let apiVersion = args.body !== undefined ? (args.resource == 'batch' ? self.agent.DEFAULT_API_VERSION : args.body.apiVersion) : self.agent.DEFAULT_API_VERSION
		let bodyData = args.body == undefined ? null : {data: args.body}
		self.agent.axios.defaults.headers.common = {'Authorization': `Bearer ${args.token || self.agent.token}`}
		self.agent.axios[args.type](`${args.server || self.agent.server}/${apiVersion}/${args.group || '-'}/${args.resource}/${args.verb}`, 
			bodyData, args.query, {timeout: 1000}).then((res) => {
			cb(null, res.data)
		}).catch((err) => {
			if (err.code == 'ECONNREFUSED') {
				cb('Error connecting to API server ' + self.agent.server)
				// errorLog('Error connecting to API server ' + userCfg.profile.CFG.api[userCfg.profile.CFG.profile].server[0])
			} else {
				if (err.response !== undefined && err.response.statusText !== undefined) {
					cb('Error in response from API server: ' + err.response.statusText)
					//errorLog('Error in response from API server: ' + err.response.statusText) 	
				} else {
					cb('Error in response from API server: Unknown')
					//errorLog('Error in response from API server: Unknown') 	
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