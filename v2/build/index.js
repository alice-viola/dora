'use strict'

const { Command } = require('commander')
const build = require('./src/build')
const PROGRAM_NAME = 'dora.build'

const program = new Command()



program.command('build <targets...>')
.option('-v, --version <version>', 'Version')
.option('-r, --registry <registry...>', 'List of registry to push')
.option('-a, --arch <arch...>', 'List of archs to build')
.option('-s, --strict', 'Stop if any target fail')
.description('Build Dora targets')
.action(async (targets, cmdObj) => {
	await build.build(targets, cmdObj)
})

program.command('targets')
.description('List of available targets')
.action((targets, cmdObj) => {
	console.log(build.targets())
})

program.parse(process.argv)

module.exports = program