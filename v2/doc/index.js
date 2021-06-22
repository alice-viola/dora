const express = require('express')
const app = express()

app.use('/', express.static('docs/v0.7'))
app.use('/v0.7', express.static('docs/v0.7'))

app.listen(4001)