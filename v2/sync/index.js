'use strict'

let express = require('express')
let fs = require('fs')
let path = require('path')
let fileUpload = require('express-fileupload')
const tus = require('./src/tus-node-server/index')
const compressing = require('compressing')
const server = new tus.Server()

let storageFolder = path.join(process.cwd(), '/smnt') 
let _TmpStorageFolder = require('os').tmpdir()

server.datastore = new tus.FileStore({
    path: `/${storageFolder}`
})

const app = express()
const uploadApp = express()

app.all('*', (req, res, next) => {
	console.log(req.url)
	next()
})

uploadApp.all('*', server.handle.bind(server))

app.post('/:apiVersion/:group/Volume/upload/:volumeName/:uploadInfo/:storage', async function (req, res) {
	console.log('Old sync')
	let tmp = '/smnt/'
	let targetDir = JSON.parse(req.params.uploadInfo).targetDir
	let savePath = path.join(__dirname, tmp, targetDir, JSON.parse(req.params.uploadInfo).filename)
	let filePath = JSON.parse(req.params.uploadInfo).filename
	
  	if (JSON.parse(req.params.uploadInfo).isDirectory == true) {
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

/**
*	List
*/
app.post('/v1.experimental/:group/Volume/ls/:volumeName/:path/:storage', (req, res) => {
	let pathToLs = path.join(storageFolder, req.params.path)

	try {
		let exist = fs.existsSync(pathToLs)
	  	if (exist) {
			var stats = fs.statSync(pathToLs)
			if (stats.isDirectory()) {
				fs.readdir(pathToLs, (err, files) => {
					if (err) {
						console.log(err)
						res.json(err)
					} else {
						res.json(files)
					}
				})
			} else {
				res.json([])
			}
	  	} else {
	  		res.json([])			
	  	}
	} catch(err) {
	  res.json([])
	}
}) 

/**
*	Download
*/
app.post('/v1.experimental/:group/Volume/download/:volumeName/:path/:storage', async (req, res) => {
	console.log('DOWNLOAD')
	let pathToDownload = path.join(storageFolder, req.params.path)
	let archivePath = path.join(_TmpStorageFolder, 'download')
	await compressing.tar.compressDir(pathToDownload, archivePath)
	res.download(archivePath)
}) 

/**
* 	Upload
*/
app.use('/v1.experimental/:group/Volume/upload/:volumeName/:info/:uploadId/:storage', uploadApp)

app.use('/upload', uploadApp)
const metadataStringToObject = (stringValue) => {
	const keyValuePairList = stringValue.split(',')
	return keyValuePairList.reduce((metadata, keyValuePair) => {
	let [key, base64Value] = keyValuePair.split(' ')
	metadata[key] = new Buffer(base64Value, "base64").toString("ascii")
	return metadata
}, {})
}

server.on(tus.EVENTS.EVENT_UPLOAD_COMPLETE, (event) => {
	let uploadMetadata = metadataStringToObject(event.file.upload_metadata)
	console.log(uploadMetadata)
	let pathToSave = path.join(storageFolder, uploadMetadata.dst)
	if (!fs.existsSync(pathToSave)) {
	    fs.mkdirSync(pathToSave, { recursive: true })
	}
  	fs.rename(`${storageFolder}/${event.file.id}`, `${pathToSave}/${metadataStringToObject(event.file.upload_metadata).filename}`, (err) => {
  		if (err) {console.log(err)}
  	})
})

app.listen(process.env.port || 3002)