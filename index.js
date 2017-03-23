const { PgDb } = require('pogi')
const cors = require('cors')
const express = require('express')
const basicAuth = require('express-basic-auth')

const DEV = process.env.NODE_ENV && process.env.NODE_ENV !== 'production'
if (DEV) {
  require('dotenv').config()
}

process.env.PORT = process.env.PORT || 3001

const auth = require('./src/auth')
const graphql = require('./graphql')
const raisenow = require('./src/raisenow')


PgDb.connect({connectionString: process.env.DATABASE_URL}).then( (pgdb) => {
  const server = express()

  //isomorphic-fetch needs explicit CORS headers otherwise, cookies are not sent
  if(process.env.CORS_WHITELIST_URL) {
    const corsOptions = {
      origin: process.env.CORS_WHITELIST_URL,
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }
    server.use('*', cors(corsOptions))
  }

  if (process.env.BASIC_AUTH_PASS) {
    server.use(basicAuth({
      users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASS },
      challenge: true,
      realm: process.env.BASIC_AUTH_REALM
    }))
  }

  // Once DB is available, setup sessions and routes for authentication
  auth.configure({
    server: server,
    users: pgdb['public']['users'],
    secret: process.env.SESSION_SECRET,
    dev: DEV
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
