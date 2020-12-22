'use strict'

const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

let opts = {
	keyPrefix: process.env.rateLimiterPrefix || 'ratelimiter',
  	points: process.env.rateLimiterPoints || 50,
  	duration: process.env.rateLimiterDuration || 1,
}
  
let rateLimiter = null

const rateLimiterMiddleware = (req, res, next) => {
	if (rateLimiter == null || rateLimiter == undefined) {
		next()
		return
	}
	let ip = req.headers['x-original-forwarded-for'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
	rateLimiter.consume((ip || '').split(',')[0].trim())
		.then(() => {
	 	next()
	})
	.catch(() => {
	  res.sendStatus(429)
	})
}

rateLimiterMiddleware.setDbConn = (conn) => {
	opts.storeClient = conn
	rateLimiter = new RateLimiterMongo(opts)
}

module.exports = rateLimiterMiddleware