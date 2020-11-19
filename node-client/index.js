'use strict'

var https = require('https')
var pem = require('pem')
let express = require('express')
let expressFileUpload = require('express-fileupload')
let bodyParser = require('body-parser')
let Docker = require('dockerode')
let randomstring = require('randomstring')
let fs = require('fs')
let http = require('http')
let os = require('os')
let path = require('path')
let async = require('async')
let shell = require('shelljs')
const compressing = require('compressing')
const splitFile = require('split-file')

const si = require('systeminformation')
const homedir = require('os').homedir()
let api = require('./src/api')

let version = require('./version')

//  ____       _                    
// |  _ \ _ __(_)_   _____ _ __ ___ 
// | | | | '__| \ \ / / _ \ '__/ __|
// | |_| | |  | |\ V /  __/ |  \__ \
// |____/|_|  |_| \_/ \___|_|  |___/
//                                  
let drivers = {
	'pwm.docker': require('./src/drivers/docker/index'),
	'pwm.nvidiadocker': require('./src/drivers/docker/index')
}

let hasGpus = false

if (process.env.joinToken !== undefined) {
	axios({
	  method: 'POST',
	  url: `${process.env.apiAddress}/v1/node/apply`,
	  headers: {
	    'Authorization': `Bearer ${process.env.joinToken}`
	  },
	  data: {data: {
	  	apiVersion: 'v1',
	  	kind: 'Node',
	  	metadata: {
	  		name: os.hostname(),
	  	},
	  	spec: {
	  		maintenance: false,
	  		address: [process.env.address],
	  		allow: [process.env.allow]
	  	} 
	  }}
	}).then((res) => {
		console.log(res.data)
		process.exit()
	})	
}

let app = express()

//const server = http.createServer(app)

app.use(bodyParser.json({limit: '200mb', extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.raw({ type: 'application/gzip' }))

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/update', (req, res) => {
	let ota = require('./src/ota')
	ota.exec(hasGpus, (response) => {
		res.send(response)
	})
})

app.get('/alive', (req, res) => {
	res.sendStatus(200)
})

app.get('/:apiVersion/resource/status', async (req, res) => {
	let data = {}
	data.version = version
	data.sys = {}
	data.cpus = []
	data.gpus = []

	// Sys
	data.sys.arch = await os.arch()
	data.sys.cpus = await si.cpu()
	data.sys.currentLoad = await si.currentLoad()
	data.sys.mem = await si.mem()
	
	// Cpu
	let cpus = os.cpus()
	let index = 0
	cpus.forEach ((cpu) => {
		data.cpus.push({
			uuid: cpu.model + ' ' + index, 
			product_name: cpu.model,
			speed: cpu.speed,
			load: data.sys.currentLoad.cpus[index].load
		})
		index += 1
	})

	// Gpu
	api.gpu.info(null, (err, gpus) => {
		hasGpus = gpus.length > 0
		data.gpus = gpus
		res.json(data)
	})
})


app.post('/:apiVersion/:driver/:verb', (req, res) => {
	if (drivers[req.params.driver] && drivers[req.params.driver][req.params.verb]) {
		drivers[req.params.driver][req.params.verb](req.body.data, (response) => {
			res.json(response)
		})
	} else if (req.params.driver == 'batch') { 
		let quene = []
 		quene.push((st) => {
 			let _drivers = {}
			req.body.data.forEach((body) => {
				if (_drivers[body.spec.driver] == undefined) {
					_drivers[body.spec.driver] = []
				} 
				_drivers[body.spec.driver].push(body)
			})
			Object.keys(_drivers).forEach((driver) => {
				drivers[driver][req.params.verb](_drivers[driver], (result) => {
					st(null, result)
				})
			}) 

		})
		async.parallel(quene, (err, results) => {
			res.json(results.flat())	
		})
	} else {
		res.sendStatus(404)
	}
})

/**
*	Proxied routes
*/
app.post('/:apiVersion/:group/Workload/:operation/:name/:cname', (req, res) => {
	let dockerDriver = require('./src/drivers/docker/driver')
	dockerDriver[req.params.operation](req.params.cname, (response) => {
		res.send(response)
	})
})

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:id/:total/:index/:storage', function (req, res) {
	let tmp = require('os').tmpdir()
	if (req.params.index == 'end') {
		let compressedDir = tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + req.params.index
		let uncompressedDir = tmp + '/' + req.params.volumeName + '-' + req.params.id + '-extracted'

		let names = []
		for (var i = 1; i <= req.params.total; i += 1) {
			names.push( path.join(tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + i) )
		}
		splitFile.mergeFiles(names, compressedDir).then(async () => {
			let dockerDriver = require('./src/drivers/docker/driver')
			let storageData = JSON.parse(req.params.storage)
			storageData.archive = compressedDir
			dockerDriver.createVolume(storageData, (response) => {
				res.sendStatus(200)
			})
		}).catch((err) => {
			console.log('Error: ', err)
		})
	} else {
		req.pipe(fs.createWriteStream(path.join(tmp + '/' + req.params.volumeName + '-' + req.params.id + '-' + req.params.total + '-' + req.params.index)))	
		req.on('end', async () => {
			res.end('Upload complete')
		})
	}
})

app.post('/:apiVersion/:group/Volume/download/:volumeName/:storage', function (req, res) {
    let tmp = require('os').tmpdir()
    let dockerDriver = require('./src/drivers/docker/driver')
    let storageData = JSON.parse(req.params.storage)
    dockerDriver.getVolume(storageData, (status, response) => {
        if (status == true) {
          response.pipe(res)
        } else {
          res.sendStatus(404)
        }
    })
})

let privateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1YCGhvn7wKQzJJ4ZZRPnRoxfohVPB27qbfveRQvgmP3v9c1p
lKx74glcdVLU/SdAkADId6O3GB9LiKwOFJR0+JLSjTbn3cZe8X5tYu6l8g7uL68x
Aj0KCfKoNuJFylJ11214sjn3iUqQUOMTBaW50yeoBtNApWKdFogamv3fOkDIYJeo
SRZxy5byub+SkCRgoGsGCjt9N0rsAzeTxzVOn03qgL82OQfwRCXq1uA7JH0m04j4
p/kz5AHxukRR6f9KsfFPZZxt30ftmjcmygJTdld/h3NpSWKaS7OUxbsj29tm8o25
Erx8veb/UE2kRwjyH0twB7y2dtG1LCNS93EG3wIDAQABAoIBAC4i0e9FAeQFF5Ao
IfC3tliGaPwLgsJmc35E2SkugeBNr5b8Rn58L2EPCM3JkoEKBGeZ47gGxsANszLb
i0djNUup3pnpbX19KnMhEN46F94Q3+OqBfsn2Y2AxFzn1JD99L0SyOwqnpUqabkw
+KFVyKwae7LN38BdaPi/fJBVn/FkPQSH9pSWMCiBdZz7yAZKVqDk5i9I10PdWwr3
7KioBJDM0ZXoxAHUYIsgPXwDqHHs9l4djgq1d+Z/LPZ+bxZvPeUK5RpUtuUdoJMV
H1HHVz20dgySel8vBHS0UJa+0KF0UPegDxMN3QTzwMJnRlxX2JS/JyJWJe4uPCoz
uNKuPeECgYEA/hhfJm981efkAfs7wqq8yn1xc/Ggk8h6d5mK+gchsmC4CNGr7qag
97zcUHU/SXNVQgmGTKra9HAVLRXwq8Rcl5KIbZDgL1bQp6cC0xRJ1lIKNmewZhnC
6SkNCLWo2sQ0vzP7jAbUcemi8dyZO2sEMZOmQuC6gbU88fjtnWC/iocCgYEA1xpA
nx/CYEvvbCBtqw4IvYVto4TBsbVNM9+pEHduzW8dMhM/yRj+Q8WjLerhnRnwLS8r
DU7ef7vQXJAqC1wmAHLx+NaeXBK99UeXV9CkjNA3F5Neq6pf42Sm9SQAp3JzT2xp
or2neLhE9iqjgyZPNfXCY+W6p4AIVnGTb42G/ukCgYBfO901t6VvOql/gJ0mWf3G
WvvRu+c2XHZiKx8mlNOxWoS/cW5iVPuRvqxIT5l3uw1iYdV/GK5V3UhijI2Wo1Mc
0CPoBNuxgnVT0MnDOSBvfnIrb/NyYQdngiZLdGKkE9O9Mgt+sPSg+TNEOS0JUxPQ
TQmMmVPt13LPMkBEswU3MwKBgQCWOjyFpb2wWXhWkPNm8v9Btc1T1aUdgtzvbLZ7
zJ3zFjZSwcTbovv5wy9rI0781J+8PuQXgEy+8yHbc8gZdPsJdz3tp56j+Wb3xk85
wnsZ6VWAvqjwxaYAf0xniwR17eYAw1unkENFeZSYREE8mGXb7s8by9cnorCwBtSM
pVBx+QKBgE00X82igna4UCIZT5ja/NDjO1gvLzzL5ldNMdgiaUDKnGaLE/cvxN1t
rNWoRLlDo1VxUM2mRm1Yg91n96l9ZfsY5lrj5UE6dEkMc6TP/a4UW692p/51zGv4
SXgu/Rs1aNIG4YZUfMhK2mjrgmEWg8VhjcyRDVLlIVhxFwi/q72M
-----END RSA PRIVATE KEY----- 
`

let cert = `
-----BEGIN CERTIFICATE-----
MIIDnDCCAoSgAwIBAgIJAM8JpuH6elDZMA0GCSqGSIb3DQEBBQUAMBIxEDAOBgNV
BAMMBzAuMC4wLjAwHhcNMjAxMTE4MjE0NTU4WhcNNDgwNDA1MjE0NTU4WjCBiDEL
MAkGA1UEBhMCSVQxHDAaBgNVBAgME1RyZW50aW5vIEFsdG8gQWRpZ2UxETAPBgNV
BAcMCFJvdmVyZXRvMR4wHAYDVQQKDBVUcmVudGlubyBTdmlsdXBwbyBTcGExFjAU
BgNVBAsMDVByb00gRmFjaWxpdHkxEDAOBgNVBAMMBzAuMC4wLjAwggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQDVgIaG+fvApDMknhllE+dGjF+iFU8Hbupt
+95FC+CY/e/1zWmUrHviCVx1UtT9J0CQAMh3o7cYH0uIrA4UlHT4ktKNNufdxl7x
fm1i7qXyDu4vrzECPQoJ8qg24kXKUnXXbXiyOfeJSpBQ4xMFpbnTJ6gG00ClYp0W
iBqa/d86QMhgl6hJFnHLlvK5v5KQJGCgawYKO303SuwDN5PHNU6fTeqAvzY5B/BE
JerW4DskfSbTiPin+TPkAfG6RFHp/0qx8U9lnG3fR+2aNybKAlN2V3+Hc2lJYppL
s5TFuyPb22byjbkSvHy95v9QTaRHCPIfS3AHvLZ20bUsI1L3cQbfAgMBAAGjfjB8
MCwGA1UdIwQlMCOhFqQUMBIxEDAOBgNVBAMMBzAuMC4wLjCCCQC+eoiG8AgFODAJ
BgNVHRMEAjAAMAsGA1UdDwQEAwIEMDAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYB
BQUHAwIwFQYDVR0RBA4wDIcEAAAAAIcEAAAAADANBgkqhkiG9w0BAQUFAAOCAQEA
m/OCga+/gdy4bA0HQADp9rpM5YkVdU2U7sz7NLiFB/S3Lu3zjkPCArm2C67ds/Wx
7kD55TTD542LLJi4SODCPO6V2T2+8BnF69QzKNT6Qt45iLj8cjrTil7IWBgd85e6
FBJ6O0+t+w+owxRWFyGKcmdW7zsKUz7qtrXzmtyRIa4k1xqEf2MCjjC9tx06qGFb
tN0gWD5DK0qSbKmHHSs6zuD8yGh1KpqlQ2uemkT38GqWpyz5Y9RHu6gUTFciUeLM
ype9JSOFqmZ29ubTHFb/qjnqYX8MrId6UvQcbks5rsXL7TTYyAoSGJ6IiPfFlN/e
O/4rvXfhpI52FFO8DBAmxg==
-----END CERTIFICATE-----
`
/*pem.createCertificate({ days: 1, selfSigned: true }, function (err, keys) {
  	if (err) {
  	  throw err
  	}
  	console.log(keys.serviceKey, keys.certificate)
  	let server = https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(process.env.PORT || 3001)

	var DockerServer = require('./src/web-socket-docker-server')
	new DockerServer({
	  path: '/pwm/cshell',
	  port: process.env.PORT || 3001,
	  server: server,
	})
	//server.listen(process.env.PORT || 3001)
})*/

let server = https.createServer({ key: privateKey, cert: cert }, app).listen(process.env.PORT || 3001)

var DockerServer = require('./src/web-socket-docker-server')
new DockerServer({
  path: '/pwm/cshell',
  port: process.env.PORT || 3001,
  server: server,
})




