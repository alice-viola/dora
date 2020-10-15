const yaml = require('js-yaml')
const fs = require('fs')

function generateTemplate (name) {
  return `
---
apiVersion: v1
kind: Workload
metadata:
  name: ${'a-' + name}
spec:
  driver: pwm/docker
  selectors:
    cpu:
      product_name: Intel(R) Xeon(R) Gold 6132 CPU @ 2.60GHz
      count: 1
      exclusive: false
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  `
}



console.log()
let fileStr = ''
for (var i = 0; i < process.argv[2]; i+= 1) {
  fileStr += generateTemplate(process.argv[3] + '-' + i)
}

fs.writeFile('./test/' + process.argv[3] + '.yaml', fileStr, 'utf8', (err) => {

})