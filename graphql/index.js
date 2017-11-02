const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema} = require('graphql-tools')
const logger = require('../lib/logger')
const LRU = require('lru-cache')
const {
  MSTATS_COUNTRIES_CACHE_TIMEOUT_SECS,
  ENGINE_API_KEY
} = process.env

const Schema = require('./schema')
const Resolvers = require('./resolvers/index')

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})

const caches = {
  // no args, thus max 1
  membershipStatsCountries: LRU({
    max: 1,
    maxAge: (MSTATS_COUNTRIES_CACHE_TIMEOUT_SECS || 30) * 1000
  })
}

module.exports = (server, pgdb, t) => {
  server.use('/graphql',
    bodyParser.json({limit: '8mb'}),
    graphqlExpress((req) => {
      return {
        debug: true,
        formatError: function (error) {
          logger.error('error in graphql', { req: req._log(), error })
          return error
        },
        schema: executableSchema,
        context: {
          pgdb,
          user: req.user,
          req,
          t,
          caches
        },
        tracing: !!ENGINE_API_KEY
      }
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }))
}
