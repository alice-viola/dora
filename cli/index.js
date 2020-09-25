const yaml = require('js-yaml')
const fs   = require('fs')
const shell   = require('shelljs')
const { Command } = require('commander')
const program = new Command()
program.version('0.0.1', '-v, --vers', '')

/*
program.command('upload <name> <dataset>')
.option('-t, --type <type>', 'Dataset source type')
.description('upload')
.action((name, dataset, cmdObj) => {
  	console.log(name, dataset, cmdObj.type)
})*/

program.command('apply')
.option('-f, --file <file>', 'File to apply')
.option('--v, --verbose', 'Verbose')
.option('-b, --build', 'Build image')
.description('apply')
.action((cmdObj) => {
	try {
	  	const doc = yaml.safeLoad(fs.readFileSync(cmdObj.file, 'utf8'))
	  	console.log(doc, !cmdObj.verbose)
	  	if (cmdObj.build == true) {
			shell.exec(`docker build ${doc.spec.image.context} -t ${doc.spec.image.name}`, {silent: !cmdObj.verbose})
			shell.exec(`docker tag ${doc.spec.image.name} ${doc.spec.image.registry}/${doc.spec.image.name}`, {silent: !cmdObj.verbose})
	  		shell.exec(`docker push ${doc.spec.image.registry}/${doc.spec.image.name}`, {silent: !cmdObj.verbose})	  	
	  	}
	} catch (e) {
	  console.log(e)
	}
})

program.command('download <name> <outputDir>')
.description('download')
.action((name, outputDir) => {
  	console.log(name, outputDir)
})

program.command('build <name> <inputDir>')
.description('build')
.action((name, inputDir) => {
  	console.log(name, outputDir)
})

program.command('push <name>')
.option('-r, --registry <registry>', 'Registry to push')
.option('-i, --input-dataset <inputdatasetname>', 'Dataset to use')
.description('push')
.action((name, cmdObj) => {
  	console.log(name, cmdObj.registry)
})

program.command('status <name>')
.description('status')
.action((name) => {
  	console.log(name)
})

program.command('cancel <name>')
.description('cancel')
.action((name) => {
  	console.log(name)
})

program.command('login <username> <api>')
.description('cancel')
.action((name) => {
  	console.log(name)
})

program.parse(process.argv)
