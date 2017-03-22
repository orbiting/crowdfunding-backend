const { PgDb } = require('pogi')
const cors = require('cors')
const express = require('express')
require('dotenv').config()

process.env.PORT = process.env.PORT || 3001

const auth = require('./src/auth')
const graphql = require('./graphql')
const raisenow = require('./src/raisenow')


PgDb.connect({connectionString: process.env.DATABASE_URL}).then( (pgdb) => {
  const server = express()

	//FIXME
  server.use('*', cors())

  // Once DB is available, setup sessions and routes for authentication
  auth.configure({
    server: server,
    users: pgdb['public']['users'],
    secret: process.env.SESSION_SECRET,
  })

  graphql(server, pgdb)

  raisenow(server, pgdb)

  //FIXME remove
  server.get('/test', function(req, res) {
    if(req.user) {
      res.end(JSON.stringify(req.user))
    } else {
      res.end("you are not logged in")
    }
  })

  // start the server
  server.listen(process.env.PORT, () => {
    console.log('server is running on http://localhost:'+process.env.PORT)
  })
})
