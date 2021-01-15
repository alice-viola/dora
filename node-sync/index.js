'use strict'

let express = require('express')
let fs = require('fs')
let path = require('path')
let fileUpload = require('express-fileupload')

const app = express()

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:uploadInfo/:storage', async function (req, res) {
	let tmp = '/smnt/'
	let targetDir = JSON.parse(req.params.uploadInfo).targetDir
	let savePath = path.join(__dirname, tmp, targetDir, JSON.parse(req.params.uploadInfo).filename)
	let filePath = JSON.parse(req.params.uploadInfo).filename
	
  	if (JSON.parse(req.params.uploadInfo).isDirectory == true) {
  		console.log(path.join(__dirname, tmp, targetDir, filePath),)
		fs.mkdir(path.join(__dirname, tmp, targetDir, filePath), { recursive: true }, (err) => {
	  		if (err) {console.log('Error in mkdir', err)}
			res.end('Upload complete')
		})  		
  	} else {
		req.pipe(fs.createWriteStream(savePath))	
		req.on('end', async () => {
			res.end('Upload complete')
		})
  	}
})

app.listen(3002)