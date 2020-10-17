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
  selectors:
    cpu:
      product_name: pwm.all
      exclusive: false
  image: 
    image: centos
  config: 
    cmd: /bin/bash   
`
}

let fileStr = ''
for (var i = 0; i < process.argv[2]; i+= 1) {
  fileStr += generateTemplate(process.argv[3] + '-' + i)
}

fs.writeFile('./test/' + process.argv[3] + '.yaml', fileStr, 'utf8', (err) => {})
