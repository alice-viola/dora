const yaml = require('js-yaml')
const fs = require('fs')

function generateTemplate (name) {
  return `
---
apiVersion: v1
kind: Group
metadata:
  name: ${name}

---
apiVersion: v1
kind: User
metadata:
  name: ${name}
  group: pwm.users
spec:
  limits:
    credits:
      weekly: 800
    resources:
      gpus:
        perWorkload: 4
      cpus: 
        perWorkload: 2
      workloads:
        concurrently: 5
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
      User:
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
  - name: pwm.resource
    policy:
      Storage:
      - getOne
      - use
      Volume:
      - get
      - getOne
      - upload
      - download
      Node:
      - getOne
      - use
      Group:
      - describe
      - get
      - getOne
active: true

---
apiVersion: v1
kind: Volume
metadata:
  name: home
  group: ${name}
spec:
  storage: pwmzfs01
  group: pwm.resource
  subPath: /home
`
}

let fileStr = ''
let users = [ 
  /*'davide.zanella', 
  'wei.wang',
  'cristiano.saltori',
  'giacomo.zara',
  'enrico.fini',
  'zhun.zhong',
  'riccardo.franceschini',
  'willi.menapace',
  'yue.song',
  'hao.tang',
  'jichao.zhang',
  'maurizio.rossi',*/
  'virginia.boschetti',
  'b.vaheditorghabeh',
  'valter.cavecchia',
  'enrico.blanzieri'
]
for (var i = 0; i < users.length; i+= 1) {
  fileStr += generateTemplate(users[i])
}

fs.writeFile('./test/' + process.argv[2] + '.yaml', fileStr, 'utf8', (err) => {})
