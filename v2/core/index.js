'use strict'


module.exports.Model = {}
module.exports.Model.Interface = require('./models/dinterface/crud')
module.exports.Model.Database = require('./models/db') 

module.exports.Model.Class = {}
module.exports.Model.Class.User = require('./models/classes/user')
module.exports.Model.Class.Workspace = require('./models/classes/workspace')
module.exports.Model.Class.Workload = require('./models/classes/workload')
module.exports.Model.Class.Zone = require('./models/classes/zone')
module.exports.Model.Class.Storage = require('./models/classes/storage')
module.exports.Model.Class.Node = require('./models/classes/node')
module.exports.Model.Class.Volume = require('./models/classes/volume')
module.exports.Model.Class.Role = require('./models/classes/role')
module.exports.Model.Class.Project = require('./models/classes/project-exp-app').Project
module.exports.Model.Class.Experiment = require('./models/classes/project-exp-app').Experiment
module.exports.Model.Class.Application = require('./models/classes/project-exp-app').Application

module.exports.Api = {}
module.exports.Api.Interface = require('./api/interface')
