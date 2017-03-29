const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema} = require('graphql-tools')
const OpticsAgent = require('optics-agent')

const Schema = require('./schema')
const Resolvers = require('./resolvers')

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})
const createLoaders = require('./loaders')

//agent for optics.apollodata.com
OpticsAgent.configureAgent({
  reportIntervalMs: 20*1000
})
OpticsAgent.instrumentSchema(executableSchema)


module.exports = (server, pgdb) => {
  server.use(OpticsAgent.middleware())

  server.use('/graphql',
    bodyParser.json(),
    graphqlExpress( (req) => {
      return {
        debug: true,
        formatError: function(error) {
          console.log(error)
          return error
        },
        schema: executableSchema,
        context: {
          opticsContext: OpticsAgent.context(req),
          loaders: createLoaders(pgdb),
          pgdb,
          user: req.user,
          req
        }
      }
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }))
}
