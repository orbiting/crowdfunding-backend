const { PgDb } = require('pogi')
const cors = require('cors')
const express = require('express')
const basicAuth = require('express-basic-auth')
const logger = require('./lib/logger')
const {getFormatter} = require('./lib/translate')
const MESSAGES = require('./lib/translations.json').data

const DEV = process.env.NODE_ENV && process.env.NODE_ENV !== 'production'
if (DEV) {
  require('dotenv').config()
}

process.env.PORT = process.env.PORT || 3001

const auth = require('./src/auth')
const graphql = require('./graphql')
const postfinance = require('./src/postfinance')
const newsletter = require('./src/newsletter')

const t = getFormatter(MESSAGES)

PgDb.connect({connectionString: process.env.DATABASE_URL}).then( (pgdb) => {
  const server = express()

  //fetch needs explicit CORS headers otherwise, cookies are not sent
  if(process.env.CORS_WHITELIST_URL) {
    const corsOptions = {
      origin: process.env.CORS_WHITELIST_URL,
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }
    server.use('*', cors(corsOptions))
  }

  //add a logger to request
  server.use(function(req, res, next) {
    req._log = function() {
      const log = {
        body: this.body,
        headers: this.headers,
        url: this.url,
        method: this.method,
        query: this.query,
        user: this.user
      }
      if(log.headers.cookie) {
        log.headers.cookie = "REMOVED"
      }
      return log
    }
    next()
  })

  // postfinance doesn't support basic-auth for webhooks
  postfinance(server, pgdb)

  server.use(newsletter(t))

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
    secret: process.env.SESSION_SECRET,
    domain: process.env.COOKIE_DOMAIN || undefined,
    dev: DEV,
    pgdb: pgdb
  })

  graphql(server, pgdb, t)

  // start the server
  server.listen(process.env.PORT, () => {
    logger.info('server is running on http://localhost:'+process.env.PORT)
  })
})
