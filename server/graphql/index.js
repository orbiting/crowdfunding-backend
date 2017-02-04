const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema, addMockFunctionsToSchema} = require('graphql-tools')

const Schema = require('./schema')
const Resolvers = require('./resolvers')

const executableSchema = makeExecutableSchema({
  typeDefs: Schema,
  resolvers: Resolvers
})

module.exports = server => {
  server.use(
    '/graphql',
    bodyParser.json(),
    graphqlExpress({
      schema: executableSchema
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }))
}
