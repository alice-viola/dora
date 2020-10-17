'use strict'

let Piperunner = require('piperunner')

let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('sendmessages')
let Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.telegramtoken)

function mongoGetConnection (cb) {
	const MongoClient = require('mongodb').MongoClient
	let conf = {
		host: process.env.dbhost || 'localhost',
		port: process.env.dbport || '27017',
		database: process.env.dbname || 'pwm-01',
	}
	const url = 'mongodb://' + conf.host + ':' + conf.port + '/' + conf.database + ''
	MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
	  	if (err) {
	  		cb(null)
	  		return
	  	} else {
	  		console.log("Connected successfully to server")
	  		cb(client)	
	  	}
	})
}

slimbot.on('message', (message) => {
	console.log(message, message.chat.id, message.text)
	if (message.text == '/start') {
		mongoGetConnection((client) => {
	  		const db = client.db(process.env.dbname)
	  		const telegramUsers = db.collection('telegramusers')
	  		telegramUsers.find({userId: message.from.id}).toArray(function(err, users) {
	  			if (users.length == 0) {
  					telegramUsers.insertOne({
  						userId: message.from.id,
  						chatId: message.chat.id,
  						messages: []
  					}, function(err, res) {
  					  	if (err) throw err
  					  	console.log("1 document inserted")
  					  	client.close()
  					})
  				} else {
  					console.log("User alredy present")
  					client.close()
  				}
  			})
		})
	} else if (message.text == '/stop') {
		// delete from db user
		//delete users[message.from.id]
	}
})
slimbot.startPolling()

pipe.step('workload', async (pipe, job) => {
	mongoGetConnection((client) => {
		if (client == null) {
			pipe.end()
			return
		}
	  	const db = client.db(process.env.dbname)
	  	const workloads = db.collection('workloads')
  		workloads.find().toArray(function(err, docs) {
	  		if (err) {
	  			pipe.end()
	  			return
	  		}
  		  	pipe.data.workloads = docs
  		  	const telegramUsers = db.collection('telegramusers')
  			telegramUsers.find().toArray(function(err, users) {
	  			if (err) {
	  				pipe.end()
	  				return
	  			}
	  			pipe.data.users = {}
	  			users.forEach((u) => {
	  				pipe.data.users[u.userId] = {userId: u.userId, chatId: u.chatId, messages: u.messages}
	  			})
  			  	client.close()
  			  	pipe.next()
  			})
  		})
	})
})

pipe.step('sendmessage-telegram', async (pipe, _job) => {
	pipe.data.workloads.forEach((job) => {
		if (job.spec.plugins !== undefined 
			&& job.spec.plugins.telegram !== undefined 
			&& job.spec.plugins.telegram.id !== undefined 
			&& pipe.data.users[job.spec.plugins.telegram.id] !== undefined) {
			job.spec.plugins.telegram.sendOn.forEach ((event) => {
				let mex = 'PWM: Workload id: ' + job._id  + ' name: ' + job.metadata.name + ' is:' + job.currentStatus
				if (job.currentStatus.toLowerCase() == event.toLowerCase() && !pipe.data.users[job.spec.plugins.telegram.id].messages.includes(mex)) {
					slimbot.sendMessage(pipe.data.users[job.spec.plugins.telegram.id].chatId, mex)
					  .then(message => {
						mongoGetConnection((client) => {
	  						const db = client.db(process.env.dbname)
	  						const telegramUsers = db.collection('telegramusers')
	  						pipe.data.users[job.spec.plugins.telegram.id].messages.push(mex)
	  						telegramUsers.updateOne({userId: job.spec.plugins.telegram.id}, { $set: {messages: pipe.data.users[job.spec.plugins.telegram.id].messages } }, function (err, res) {
	  							client.close()
	  						})
						})
					})
				}
			})
		}
	})
	pipe.end()
})

module.exports = scheduler