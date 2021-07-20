'use strict'

const { RateLimiterMemory } = require('rate-limiter-flexible');

let opts = {
	keyPrefix: process.env.rateLimiterPrefix || 'ratelimiter',
  	points: process.env.rateLimiterPoints || 100,
  	duration: process.env.rateLimiterDuration || 1,
}
  
let rateLimiter = new RateLimiterMemory(opts)

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

module.exports = rateLimiterMiddleware