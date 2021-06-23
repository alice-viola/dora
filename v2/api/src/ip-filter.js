'use strict'

let MAX_ATTEMPTS = process.env.MAX_ATTEMPTS || 3
let RELEASE_TIME_MS = process.env.RELEASE_TIME_MS || 120000
let ipBlacklist = []
let ipBlacklistMap = {}

/**
*	Every 60s check and release old
*	blacklist IP 
*/
setInterval (() => {
	let toRemove = []
	ipBlacklist.forEach((blacklistedIp, index) => {
		if (ipBlacklistMap[blacklistedIp] !== undefined
			&& ipBlacklistMap[blacklistedIp].blacklistDate !== undefined
			&& ((new Date).getTime() - ipBlacklistMap[blacklistedIp].blacklistDate.getTime()) > RELEASE_TIME_MS) {
			toRemove.push(index)
			delete ipBlacklistMap[blacklistedIp]
		}
	})
	toRemove.forEach((index) => {
		if (index > -1) {
			console.log('Deleted ip blacklist', ipBlacklist[index])
		  	ipBlacklist.splice(index, 1)
		}
	})
}, 60000) 

module.exports.ipBlacklist = () => {
	return ipBlacklist
}

module.exports.addIpToBlacklist = (ip) => {
	if (ipBlacklistMap[ip] == undefined) {
		ipBlacklistMap[ip] = {ip: ip, count: 1, firstInsertDate: new Date()}
	} else if (ipBlacklistMap[ip].count < MAX_ATTEMPTS) {
		ipBlacklistMap[ip].count += 1
	} else {
		ipBlacklistMap[ip].blacklistDate = new Date()
		ipBlacklist.push(ip)
	}
}