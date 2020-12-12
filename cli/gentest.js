const yaml = require('js-yaml')
const fs = require('fs')

function generateTemplate (name) {
  return `
---
apiVersion: v1
kind: Workload
metadata:
  name: ${name}
spec:
  driver: pwm.docker
  selectors:
    node:
      name: amedeomacbook
    cpu:
      product_name: pwm.all
      count: 1
      exclusive: false
  image: 
    image: registry.promfacility.eu/ubuntu:t1
  config: 
    cmd: /bin/bash
`
}

let fileStr = ''
for (var i = 0; i < process.argv[2]; i+= 1) {
  fileStr += generateTemplate(process.argv[3] + '-' + i)
}

fs.writeFile('./test/' + process.argv[3] + '.yaml', fileStr, 'utf8', (err) => {})
