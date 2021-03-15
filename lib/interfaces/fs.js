'use strict'

let fs = require('fs')
let path = require('path')

function dirTree (filename) {

    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            name: path.basename(filename)
        }

    if (stats.isDirectory()) {
        info.type = "folder"
        info.children = fs.readdirSync(filename).map(function(child) {
            return dirTree(filename + '/' + child)
        })
    } else {
        info.type = "file"
        info.file = info.name.split('.')[info.name.split('.').length - 1]
    }
    return info
}

function dirTreeAsync (filename) {

    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            name: path.basename(filename)
        }

    if (stats.isDirectory()) {
        info.type = "folder"
        info.children = fs.readdirSync(filename).map(function(child) {
            return dirTreeAsync(filename + '/' + child)
        })
    } else {
        info.type = "file"
        info.file = info.name.split('.')[info.name.split('.').length - 1]
    }
    return info
}

module.exports.tree = async (folder, cb) => {
	let tree = dirTree(folder)
	cb(null, tree)
}

module.exports.ls = (folder, cb) => {
	fs.readdir(folder, {withFileTypes: true}, function (err, files) {
    	if (err) {
    		cb(err, null)
    	} else {
    		cb (null, files)	
    	}
	})
}

module.exports.cat = (file, cb) => {
	fs.readFile(file, 'utf8', function (err, file) {
    	if (err) {
    		cb(err, null)
    	} else {
    		cb (null, file.toString())	
    	}
	})
}

module.exports.write = (file, content, cb) => {
	fs.writeFile(file, content, 'utf8', function (err, file) {
    	if (err) {
    		cb(err, null)
    	} else {
    		cb (null, true)	
    	}
	})
}


var self = module.exports