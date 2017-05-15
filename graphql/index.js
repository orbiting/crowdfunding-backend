const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema} = require('graphql-tools')
const OpticsAgent = require('optics-agent')
const logger = require('../lib/logger')
const LRU = require("lru-cache")
const {COUNTRIES_CACHE_TIMEOUT_SECS} = process.env

const Schema = require('./schema')
const Resolvers = require('./resolvers')

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})

//agent for optics.apollodata.com
OpticsAgent.configureAgent({
  reportIntervalMs: 20*1000
})
OpticsAgent.instrumentSchema(executableSchema)

//no args, thus max 1
const membershipStatsCountriesCache = LRU({
  max: 1,
  maxAge: (COUNTRIES_CACHE_TIMEOUT_SECS || 30 ) * 1000
})

module.exports = (server, pgdb, t) => {
  server.use(OpticsAgent.middleware())

  server.use('/graphql',
    bodyParser.json({limit: '8mb'}),
    graphqlExpress( (req) => {
      return {
        debug: true,
        formatError: function(error) {
          logger.error('error in graphql', { req: req._log(), error })
          return error
        },
        schema: executableSchema,
        context: {
          opticsContext: OpticsAgent.context(req),
          pgdb,
          user: req.user,
          req,
          t,
          membershipStatsCountriesCache
        }
      }
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }))
}
