'use strict'

let fs = require('fs')

module.exports.yaml = null 

module.exports.profile = {}

module.exports.profile.CFG = {}
module.exports.profile.cfgPath = null
module.exports.profile.cfgFolder = null

module.exports.project = {}

module.exports.profile.setCfgLocation = (path) => {
	self.profile.cfgPath = path 
}

module.exports.profile.setCfgFolder = (path) => {
	self.profile.cfgFolder = path 
}


module.exports.profile.get = () => {
	try {
		self.profile.CFG = self.yaml.load(fs.readFileSync(self.profile.cfgPath, 'utf8'))
		return [null, self.profile.CFG]
	} catch (err) {
		return [err, null]
	}
}

module.exports.profile.use = (profileToUse, cb) => {
	try {
		self.profile.CFG.profile = profileToUse
		let newCFG = self.yaml.dump(self.profile.CFG) 
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
		fs.mkdir(self.profile.cfgFolder, { recursive: true }, (err) => {
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
			fs.writeFile(self.profile.cfgPath, self.yaml.dump(jsonConfig) , 'utf8', (err) => {
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
		fs.writeFile(self.profile.cfgPath, self.yaml.dump(self.profile.CFG) , 'utf8', (err) => {
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
		fs.writeFile(self.profile.cfgPath, self.yaml.dump(self.profile.CFG) , 'utf8', (err) => {
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

module.exports.profile.save = (cfg, cb) => {
	try {
		fs.writeFile(self.profile.cfgPath, self.yaml.dump(cfg) , 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null, true)
			}
		})
	} catch (err) {
		cb(err)
	}
}

module.exports.profile.saveAsString = (cfgString, cb) => {
	try {
		fs.writeFile(self.profile.cfgPath, cfgString, 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null, true)
			}
		})
	} catch (err) {
		cb(err)
	}
}

module.exports.project.add = (args, cb) => {
	try {
		if (self.profile.CFG.projects == undefined) {
			self.profile.CFG.projects = []
		}
		self.profile.CFG.projects.push(args)

		fs.writeFile(self.profile.cfgPath, self.yaml.dump(self.profile.CFG) , 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null)
			}
		})
		
	} catch (err) {
		cb(err)
	}
}

module.exports.project.del = (args, cb) => {
	try {
		if (self.profile.CFG.projects[args.index] == undefined) {
			cb('Element not preset')
			return
		}
		self.profile.CFG.projects.splice(args.index, 1)
		fs.writeFile(self.profile.cfgPath, self.yaml.dump(self.profile.CFG) , 'utf8', (err) => {
			if (err) {
				cb(err)
			} else {
				cb(null)
			}
		})
		
	} catch (err) {
		cb(err)
	}
}

module.exports.profile.using = () => {
	
}

var self = module.exports