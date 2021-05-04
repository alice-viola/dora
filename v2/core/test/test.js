'use strict'

var assert = require('assert')

const DB_NAME = 'doratest01'

describe('DB Initialization', function () {
	this.timeout(30000)
	let db = require ('../models/db')
  	
  	it('Connect and check to init', async function() {
  	  	db.connect({})
  		await db.drop({
  			dbName: DB_NAME
  		})
  	  	let toInit = await db.init({
  	  		dbName: DB_NAME
  	  	})
  	  	assert.equal(toInit, true)
  	})

  	it('Insert some datas', async function() {
  	  	let client = db.client()
  		for (var i = 0; i < 10; i += 1) {
  			await client.execute("INSERT INTO resources (kind, id, name, desired) VALUES ('user', uuid(), ?, 'run')", ['us-' + i], { prepare: true } )
  			//await client.execute("INSERT INTO resources (kind, name) VALUES ('workspace', ?)", ['ws-' + i], { prepare: true } )
  			//await client.execute("INSERT INTO resources (kind, name) VALUES ('zone', ?)", ['zone-' + i], { prepare: true })
  		}
  		for (var i = 0; i < 10; i += 1) {
  			//await client.execute("INSERT INTO zoned_resources (kind, zone, name) VALUES ('node', ?, ?)", ['zone-' + i, 'node-' + i], { prepare: true })
  		}
  	})


  	after(async function () {
  		db.disconnect()
  	})
  	
})