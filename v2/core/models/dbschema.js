'use strict'


const Action =
`\
CREATE TABLE actions (\ 
id UUID,\ 
zone text,\
resource_kind text,\
resource_pk text,\
action_type text,\
origin text,\
destination text,\
insdate text,\
owner text,\
PRIMARY KEY ((zone, resource_kind), destination, id)\
);\
`

const Resource = 
`\
CREATE TABLE resources (\ 
id UUID,\ 
kind text,\ 
name text,\ 
meta text,\
desired text,\ 
observed text,\ 
computed text,\
resource text,\ 
resource_hash text,\
versions list<text>,\ 
insdate timestamp,\
owner text,\
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
meta text,\
desired text,\ 
observed text,\ 
computed text,\
resource text,\ 
resource_hash text,\
versions list<text>,\
insdate timestamp,\
owner text,\
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
meta text,\ 
desired text,\ 
observed text,\ 
computed text,\
resource text,\ 
resource_hash text,\
versions list<text>,\ 
insdate timestamp,\
owner text,\
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
meta text,\  
name text,\ 
desired text,\ 
observed text,\ 
computed text,\
resource text,\ 
resource_hash text,\
versions list<text>,\
insdate timestamp,\
owner text,\
PRIMARY KEY ((kind, zone), workspace, name)\
);\
`

const Container = 
`\
CREATE TABLE containers (\ 
id UUID,\ 
kind text,\
zone text,\
workspace text,\  
meta text,\  
name text,\ 
workload_id UUID,\ 
node_id UUID,\ 
desired text,\ 
observed text,\ 
computed text,\
resource text,\ 
resource_hash text,\
versions list<text>,\
insdate timestamp,\
owner text,\
PRIMARY KEY ((kind, zone), workspace, name)\
);\
`

const ContainerToWorkload = 'CREATE INDEX workload_id ON containers(workload_id)'
const ContainerToNode = 'CREATE INDEX node_id ON containers(node_id)'

module.exports.get = (dbName) => {
	return [
		`CREATE KEYSPACE ` + dbName + ` WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'datacenter1' : 1 };`,

		`USE ` + dbName + `;`,

		Action,

		Resource,

		WorkspacedResource,

		ZonedResource,

		ZonedWorkspacedResource,

		Container,

		ContainerToWorkload,

		ContainerToNode

	]
}
