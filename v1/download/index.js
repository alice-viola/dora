const express = require('express')
const app = express()

app.use('/downloads', express.static('public'))

app.get('/', (req, res) => {
    res.send('PWM')
})

app.listen(4000)