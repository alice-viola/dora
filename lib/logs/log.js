'use strict'

const log4js = require('log4js')
const path = require('path')

log4js.configure({
  appenders: { pwmapi: { type: 'file', filename: process.env.logLocation !== undefined ? path.join(process.env.logLocation, 'pwmapi.log') : path.join('./logs', 'pwmapi.log') } },
  categories: { default: { appenders: ['pwmapi'], level: "info" } }
})

module.exports.pwmapi = log4js.getLogger('pwmapi')