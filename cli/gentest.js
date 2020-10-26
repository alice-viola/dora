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
      name: AmedeoMacbook
    cpu:
      product_name: pwm.all
      count: 1
      exclusive: false
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  #volumes:
  #  - name: home
  #    storager: pwmzfs01
  #    target: /home
`
}

let fileStr = ''
for (var i = 0; i < process.argv[2]; i+= 1) {
  fileStr += generateTemplate(process.argv[3] + '-' + i)
}

fs.writeFile('./test/' + process.argv[3] + '.yaml', fileStr, 'utf8', (err) => {})
