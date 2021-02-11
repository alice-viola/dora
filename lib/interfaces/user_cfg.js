'use strict'

let fs = require('fs')

module.exports.yaml = null 

module.exports.profile = {}

module.exports.profile.CFG = {}
module.exports.profile.cfgPath = null

module.exports.profile.setCfgLocation = (path) => {
	self.profile.cfgPath = path 
}

module.exports.profile.get = () => {
	try {
		self.profile.CFG = self.yaml.safeLoad(fs.readFileSync(self.profile.cfgPath, 'utf8'))
		return [null, self.profile.CFG]
	} catch (err) {
		return [true, null]
	}
}

module.exports.profile.use = (profileToUse, cb) => {
	try {
		self.profile.CFG.profile = profileToUse
		let newCFG = self.yaml.safeDump(self.profile.CFG) 
  		fs.writeFile(self.profile.cfgPath, newCFG, 'utf8', (err) => {
  			if (err) {
  				cb(err)
  			} else {
  				cb(null, profileToUse)
  			}
  		})
	} catch (err) {
		return cb(err)
	}
}

module.exports.profile.init = (profileName, apiServer, token, cb) => {
	try {
		fs.mkdir(self.profile.cfgPath, { recursive: true }, (err) => {
		  	if (err) throw err
		  	let jsonConfig = {}
		  	jsonConfig.profile = profileName
		  	jsonConfig.api = {}
		  	jsonConfig.api[profileName] = {
		  		server: [apiServer],
		  		auth: {
		  			token: token
		  		}
		  	}
			fs.writeFile(self.profile.cfgPath, self.yaml.safeDump(jsonConfig) , 'utf8', (err) => {
				if (err) {
					cb(err)
				} else {
					cb(null, profileName)
				}
			})
		})
	} catch (err) {
		cb(err)
	}
}

module.exports.profile.add = (profileName, apiServer, token, cb) => {
	try {
		self.profile.CFG.api[profileName] = {
			server: [apiServer],
			auth: {
				token: token
			}
		}
		fs.writeFile(self.profile.cfgPath, self.yaml.safeDump(self.profile.CFG) , 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null, profileName)
			}
		})
		
	} catch (err) {
		cb(err)
	}
}

module.exports.profile.del = (profileName, cb) => {
	try {
		delete self.profile.CFG.api[profileName]
		fs.writeFile(self.profile.cfgPath, self.yaml.safeDump(self.profile.CFG) , 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null, profileName)
			}
		})
	} catch (err) {
		cb(err)
	}
}

module.exports.profile.using = () => {
	
}

var self = module.exports