'use strict'

module.exports.translate = (src) => {
	let translated = {}
	translated.kind = src.kind.toLowerCase()
	if (src.metadata !== undefined) {
		if (src.metadata.name !== undefined) {
			translated.name = src.metadata.name		
		}
		if (src.metadata.group !== undefined && src.metadata.group !== '-') {
			translated.workspace = src.metadata.group		
		}
		if (src.metadata.zone !== undefined) {
			translated.zone = src.metadata.zone		
		}
	}
	if (src.owner !== undefined) {
		translated.owner = src.owner		
	}
	if (src.spec !== undefined) {
		translated.resource = src.spec
	}
	return translated 
} 