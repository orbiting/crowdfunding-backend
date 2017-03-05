const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema} = require('graphql-tools')

const Schema = require('./schema')
const Resolvers = require('./resolvers')

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})

const createLoaders = require('./loaders')

module.exports = (server, pgdb) => {
  server.use('/graphql',
    bodyParser.json(),
    graphqlExpress({
      schema: executableSchema,
      context: {
        loaders: createLoaders(pgdb),
        pgdb
      }
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }))
}
