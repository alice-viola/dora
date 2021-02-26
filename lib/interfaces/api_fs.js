/**
*	Remote FS sync 
*/
let tus = require('tus-js-client') 
let fs = require('fs') 
let path = require('path') 
module.exports.api = {}
module.exports.api.remote = {fs: {}}

class Upload {
    constructor (args) {
        this.src = args.src[args.src.length - 1] == '/' ? args.src.slice(0, -1) : args.src
        this.dst = args.dst
        this.dumpFile = args.dumpFile
        this.restore = args.restore
        this.endpoint = args.endpoint
        this.token = args.token
        this.chunkSize = args.chunkSize
        this.log = args.log == undefined ? (str) => {} : args.log
        this.onEnd = args.onEnd == undefined ? (str) => {} : args.onEnd
        this.statSrc = fs.lstatSync(this.src)
        this.tree = {}
        this.flattenTree = []
    }

    makeTree () {
        this.tree = this._dirTree(this.src)
    }

    dump (dst) {
        let dump = {
            src: this.src,
            dst: this.dst,
            flattenTree: this.flattenTree
        }
        fs.writeFileSync(dst, JSON.stringify(dump))
    }

    restoreFrom (src) {
        let jsonString = fs.readFileSync(src)
        let jsonParsed = JSON.parse(jsonString)
        this.src = jsonParsed.src
        this.dst = jsonParsed.dst
        this.flattenTree = jsonParsed.flattenTree
    }

    async send () {
        for (var i = 0; i < this.flattenTree.length; i += 1) {
            if (this.restore == true) {
                if (this.flattenTree[i].done == true) {
                    continue
                }
            }
            if (this.flattenTree[i].type == 'folder') {
                continue
            }
            this.log({total: this.flattenTree.length, current: i, name: this.flattenTree[i].name})
            let res = await this._tusUpload(this.flattenTree[i], this.src, this.endpoint, this.token)//'http://localhost:3002/v1/-/Volume/upload/' + this.flattenTree[i].name)
            if (this.dumpFile !== undefined) {
                this.flattenTree[i].done = true
                this.dump(this.dumpFile)
            }
        }
        this.onEnd()
    }

    _dirTree (filename) {
        var stats = fs.lstatSync(filename),
            info = {
                path: filename,
                name: path.basename(filename),
                done: false
            }

        if (info.remotePath == '') {
            info.remotePath = '/'
        } 
        
        if (stats.isDirectory()) {
            info.type = "folder"
            this.flattenTree.push(Object.assign({}, info))
            info.children = fs.readdirSync(filename).map(function (child) {
                return this._dirTree(filename + '/' + child)
            }.bind(this))
        } else {
            info.type = "file"
            info.file = info.name.split('.')[info.name.split('.').length - 1]
            this.flattenTree.push(info)
        }
        return info
    }

    async _tusUpload (file, src, endpoint, token) {
        let uploadPromise = new Promise(function (resolve, reject) {
            //let fileInstance = fs.readFileSync(file.path)
            let chunkSize = this.chunkSize
            let fileInstanceStream = fs.createReadStream(file.path)
            var size = fs.statSync(file.path).size
            var onlyPath = require('path').dirname(file.path)
            let remotePath = onlyPath.split(src)[1]
            if (remotePath == '' || remotePath == undefined) {
                remotePath = '/'
            } 

            var upload = new tus.Upload(fileInstanceStream, {
                endpoint: endpoint,
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
                chunkSize: (chunkSize || 50) * 1024 * 1024,
                metadata: {
                    filename: file.name,
                    filetype: file.type,
                    dst: remotePath
                },
                uploadSize: size,
                onError: function (error) {
                    resolve()
                },
                onChunkComplete: function (chunk, bytesUploaded,  bytesTotal) {
                    //console.log(bytesUploaded, bytesTotal)
                    this.log({progress: (bytesUploaded / bytesTotal * 100).toFixed(2) , name: file.name})
                }.bind(this),
                onProgress: function (bytesUploaded, bytesTotal) {
                    var percentage = (bytesUploaded / bytesTotal * 100).toFixed(2)
                    this.log({progress: percentage, name: file.name})

                }.bind(this),
                onSuccess: function() {
                    resolve()
                }
            })
        
            upload.start()
        }.bind(this))
        return uploadPromise
    }
}


module.exports.api.remote.fs.upload = async (args, cb) => {
    let upload = new Upload(args)
    if (args.restore !== undefined) {
        upload.restoreFrom(args.dumpFile)
    } else {
        upload.makeTree()    
    }
    if (args.dumpFile !== undefined) {
        upload.dump(args.dumpFile)
    }
    await upload.send()
}


var self = module.exports
