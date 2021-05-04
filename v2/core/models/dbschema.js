'use strict'


const Resource = 
`\
CREATE TABLE resources (\ 
id UUID,\ 
kind text,\ 
name text,\ 
desired text,\ 
observed text,\ 
resource text,\ 
versions list<text>,\ 
insdate timestamp,\
PRIMARY KEY (kind, name)\
);\
`

const WorkspacedResource = 
`\
CREATE TABLE workspaced_resources (\ 
id UUID,\ 
kind text,\
workspace text,\  
name text,\ 
desired text,\ 
observed text,\ 
resource text,\ 
versions list<text>,\ 
insdate timestamp,\
PRIMARY KEY ((kind, workspace), name)\
);\
`

const ZonedResource = 
`\
CREATE TABLE zoned_resources (\ 
id UUID,\ 
kind text,\
zone text,\  
name text,\ 
desired text,\ 
observed text,\ 
resource text,\ 
versions list<text>,\ 
insdate timestamp,\
PRIMARY KEY ((kind, zone), name)\
);\
`

const ZonedWorkspacedResource = 
`\
CREATE TABLE zoned_workspaced_resources (\ 
id UUID,\ 
kind text,\
zone text,\
workspace text,\    
name text,\ 
desired text,\ 
observed text,\ 
resource text,\ 
versions list<text>,\ 
insdate timestamp,
PRIMARY KEY ((kind, zone), workspace, name)\
);\
`

module.exports.get = (dbName) => {
	return [
		`CREATE KEYSPACE ` + dbName + ` WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'datacenter1' : 1 };`,

		`USE ` + dbName + `;`,

		Resource,

		WorkspacedResource,

		ZonedResource,

		ZonedWorkspacedResource

	]
}
