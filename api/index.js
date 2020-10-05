'use strict'

let axios = require('axios')
let async = require('async')
let bodyParser = require('body-parser')
let express = require('express')
let api = {v1: require('./src/api')}

let httpProxy = require('http-proxy')
let apiProxy = httpProxy.createProxyServer()

if (process.env.generateApiToken !== undefined) {
	const crypto = require('crypto')
	console.log(crypto.randomBytes(256).toString('hex'))
	process.exit()
}

const GE = require('./src/events/global')

let controllers = {
	gpuScheduler: require('./src/controllers/gpu/gpu_scheduler')
}

let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.all('*', (req, res, next) => {
	// console.log('Checking auth', req.body.token)
	next()
})

app.post('/:apiVersion/:kind/apply', (req, res) => {
	api[req.params.apiVersion].apply(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/get', (req, res) => {
	api[req.params.apiVersion].get(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/getOne', (req, res) => {
	api[req.params.apiVersion].getOne(req.body.data, (err, result) => {
		res.json(result)
		GE.Emitter.emit(GE.ApiCall)
	})
})

app.post('/:apiVersion/:kind/delete', (req, res) => {
	api[req.params.apiVersion].delete(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.post('/:apiVersion/:kind/cancel', (req, res) => {
	api[req.params.apiVersion].cancel(req.body.data, (err, result) => {
		res.json(result)
	})
})

app.get('/wl/:operation', (req, res) => {
	let operation = req.params.operation
	// Write to DB
})

app.use('/:apiVersion/:node/:container', function (req, res) {
	//apiProxy.web(req, res, { target: 'http://localhost:8080'})
})


app.listen(3000)
GE.Emitter.emit(GE.SystemStarted)
