let assert = require('assert')


function getAnAgent () {
  	let interfaceApi = require('../../lib/interfaces/api')
    let request = require('../../lib/ajax/request')
    request.agent.axios = require('axios')
    request.agent.DEFAULT_API_VERSION = 'v1'
    request.agent.server = process.env.server
    request.agent.token = process.env.token
    interfaceApi.api.request = request.apiRequest
    return interfaceApi
}


describe('api interface', function() {
  	let interfaceApi = require('../../lib/interfaces/api')
    
    it('default api version', function () {
      	assert.equal(interfaceApi.DEFAULT_API_VERSION, 'v1')
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
    it('server api version response', function (done) {
    	interfaceApi.api.version(function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			done()
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
    it('server get resource with valid group', function (done) {
    	interfaceApi.api.get.one('Workload', {group: '-'}, function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			done()
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
    it('server get resource with invalid group is rejected', function (done) {
    	interfaceApi.api.get.one('Workload', {group: 'NOT_A_VALID_GROUP'}, function (err, data) {
    		if (err == 'Error in response from API server: Unauthorized') {
    			done()
    		} else {
    			done(err)
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
    it('server get resource with valid group and name', function (done) {
    	interfaceApi.api.get.named('Workload', 'ciao.ciao', {group: 'pwm.all'}, function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			done()
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
    it('create an user token', function (done) {
    	interfaceApi.api.token.create('as', 'as', 'as', 1, function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			done()
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
	this.timeout(15000)
    it('create workload', function (done) {
    	let doc = {
  			"apiVersion": "v1",
  			"kind": "Workload",
  			"metadata": {
  			  "name": "cpuw-0"
  			},
  			"spec": {
  			  "driver": "pwm.docker",
  			  "selectors": {
  			    "node": {
  			      "name": "emcprom09"
  			    },
  			    "cpu": {
  			      "product_name": "pwm.all",
  			      "count": 1,
  			      "exclusive": false
  			    }
  			  },
  			  "image": {
  			    "image": "ubuntu"
  			  },
  			  "config": {
  			    "cmd": "/bin/bash"
  			  }
  			}
		}
    	interfaceApi.api.apply.one(doc, {}, function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			setTimeout(() => {
    			interfaceApi.api.remove.named('Workload', 'cpuw-0', {group: '-'}, (err, data) => {
    				done()	
    			}) 
    		}, 10000)
    		}
    	})
      	
    })
})

describe('api interface', function() {
	let interfaceApi = getAnAgent()
	this.timeout(15000)
    it('delete workload', function (done) {
    	let doc = {
  			"apiVersion": "v1",
  			"kind": "Workload",
  			"metadata": {
  			  "name": "cpuw-0"
  			},
  			"spec": {
  			  "driver": "pwm.docker",
  			  "selectors": {
  			    "node": {
  			      "name": "emcprom09"
  			    },
  			    "cpu": {
  			      "product_name": "pwm.all",
  			      "count": 1,
  			      "exclusive": false
  			    }
  			  },
  			  "image": {
  			    "image": "ubuntu"
  			  },
  			  "config": {
  			    "cmd": "/bin/bash"
  			  }
  			}
		}
    	interfaceApi.api.apply.one(doc, {}, function (err, data) {
    		if (err) {
    			done(err)
    		} else {
    			setTimeout(() => {
    			interfaceApi.api.remove.named('Workload', 'cpuw-0', {group: '-'}, (err, data) => {
    				if (err) {
    					done(err)
    				} else {
    					done()
    				}	
    			}) 
    		}, 10000)
    		}
    	})
    })
})

