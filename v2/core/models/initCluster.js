'use strict'

let Interface = require('../index').Api.Interface

let WorkspaceAdmin = {
	"apiVersion": "v1",
	"kind": "Workspace",
	"metadata": {
		"name": "admin"
	}
}

let Zone = {
  "apiVersion": "v1",
  "kind": "Zone",
  "metadata": {
    "name": process.env.ZONE
  }
}

let RoleAdmin = {
  "apiVersion": "v1",
  "kind": "Role",
  "metadata": {
    "name": "admin"
  },
  "spec": {
    "default": {
      "workspace": "admin",
      "zone": process.env.ZONE
    },
    "permission": {
      "Zone": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "Workspace": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "User": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "Role": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "Workload": [
        "Apply",
        "Delete",
        "Get",
        "GetOne",
        "Describe",
        "Pause",
        "Resume"
      ],
      "Container": [
        "Apply",
        "Delete",
        "Get",
        "GetOne",
        "Describe",
        "Pause",
        "Resume",
        "Shell",
        "Token"
      ],
      "Storage": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "Volume": [
        "Apply",
        "Delete",
        "Get",
        "Describe",
        "Use",
        "Upload",
        "Download",
        "Ls",
        "Sync"
      ],
      "Node": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "CPU": [
        "Get"
      ],
      "GPU": [
        "Get"
      ],
      "Project": [
        "Apply",
        "Delete",
        "Get",
        "Describe"
      ],
      "Token": [
        "Create"
      ]
    }
	}
}

let UserAdmin = {
  "apiVersion": "v1",
  "kind": "User",
  "metadata": {
    "name": "admin"
  },
  "spec": {
    "resources": [
      {
        "kind": "All",
        "zone": "All",
        "workspace": "All",
        "role": "admin"
      }
    ]
  }
}

module.exports = async (args) => {
	Interface.apply('v1', WorkspaceAdmin, () => {
		Interface.apply('v1', RoleAdmin, () => {
			Interface.apply('v1', UserAdmin, () => {
		
			})	
		})		
	})
}