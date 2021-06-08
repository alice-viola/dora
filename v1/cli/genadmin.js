const yaml = require('js-yaml')
const fs = require('fs')

function generateTemplate (name) {
  return `
---
apiVersion: v1
kind: User
metadata:
  name: ${name}
  group: pwm.users
spec:
  limits:
    credits:
      weekly: 5000
    resources:
      workloads:
        concurrently: 100
  groups:
  - name: ${name}
    policy:
      Workload:
      - get
      - getOne
      - apply
      - delete
      - describe
      - shell
      - cancel
      - top
      - commit
      - pause
      - unpause
      - inspect
      - logs
      - token
      Storage:
      - get
      - getOne
      - describe
      Volume:
      - apply
      - delete
      - get
      - getOne
      - upload
      - download
      - describe
      - ls
      Node:
      - get
      - getOne
      Group:
      - get
      - getOne
      - describe
      User:
      - get
      - getOne
      - validate
      - groups
      - status
      CPU:
      - get
      - getOne
      GPU:
      - get
      - getOne
      Bind:
      - get
      - getOne
      - status
      - delete
  - name: pwm.resource
    policy:
      ResourceCredit: 
      - apply
      - delete
      - inspect
      - get
      - getOne
      - describe  
      Storage:
      - apply
      - delete
      - describe
      - get
      - getOne
      - use
      Volume:
      - apply
      - delete
      - get
      - getOne
      - upload
      - download
      Node:
      - apply
      - delete
      - describe
      - get
      - getOne
      - use
      Group:
      - apply
      - delete
      - describe
      - get
      - getOne
  - name: pwm.users
    policy:
      User:
      - apply
      - delete
      - describe
      - get
      - getOne
      - validate
  - name: pwm.all
    policy: pwm.all
active: true
`
}

let fileStr = ''
let users = [ 
  'amedeo.setti', 
  'paolo.rota',
  'nicola.peghini',
]
for (var i = 0; i < users.length; i+= 1) {
  fileStr += generateTemplate(users[i])
}

fs.writeFile('./test/' + process.argv[2] + '.yaml', fileStr, 'utf8', (err) => {})
