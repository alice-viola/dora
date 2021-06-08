const express = require('express')
const app = express()

app.use('/', express.static('public_v2'))

app.listen(4000)