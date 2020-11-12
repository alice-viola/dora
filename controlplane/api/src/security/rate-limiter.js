'use strict'

// TODO: use MongoStore

const {RateLimiterMemory} = require('rate-limiter-flexible')

const rateLimiter = new RateLimiterMemory({
  points: process.env.rateLimiterPoints || 10, 
  duration: process.env.rateLimiterDuration || 1, 
})

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.consume((req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim())
    .then(() => {
      next()
    })
    .catch(() => {
      res.sendStatus(429)
    })
}

module.exports = rateLimiterMiddleware