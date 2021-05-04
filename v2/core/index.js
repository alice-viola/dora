'use strict'

module.exports.Model = {}
module.exports.Model.Interface = require('./models/dinterface/crud')
module.exports.Model.Database = require('./models/db') 

module.exports.Model.Class = {}
module.exports.Model.Class.User = require('./models/classes/user')
module.exports.Model.Class.Workspace = require('./models/classes/workspace')