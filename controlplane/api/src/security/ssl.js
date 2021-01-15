'use strict'

/**
* 	Use of OpenSSL trough shell is temp,
*	we will use node library PEM.
*/

let shell = require('shelljs')

module.exports.CAKey = () => {
	shell.exec('openssl genrsa 2048 > pwm-key.pem')
}

module.exports.CACrt = (args) => {
	shell.exec(`openssl req -new -x509 -nodes -days 365000 -key pwm-key.pem -out pwm-cert.pem -subj "/C=${args.C || 'IT'}/ST=${args.ST || 'pwmcontrolplane'}/O=${args.O || 'pwmcontrolplane'}/CN=${args.CN || 'pwmcontrolplane'}"`)
}