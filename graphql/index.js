const bodyParser = require('body-parser')
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express')
const {makeExecutableSchema} = require('graphql-tools')
const OpticsAgent = require('optics-agent')
const logger = require('../lib/logger')

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




const { SubscriptionManager, PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub();

const subscriptionManager = new SubscriptionManager({
  schema: executableSchema,
  pubsub,
})


const { createServer } = require('http')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const {WS_PORT} = process.env
// Create WebSocket listener server
const websocketServer = createServer((request, response) => {
  response.writeHead(404)
  response.end()
})
// Bind it to port and start listening
websocketServer.listen(WS_PORT, () => console.log(
  `Websocket Server is now running on port ${WS_PORT}`
))

const subscriptionServer = new SubscriptionServer(
  {
    onConnect: async (connectionParams) => {
      // Implement if you need to handle and manage connection
			console.log('ws onConnect:')
			console.log(connectionParams)
    },
    subscriptionManager: subscriptionManager
  },
  {
    server: websocketServer,
    path: '/'
  }
);




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
          pubsub
        }
      }
    })
  )

  server.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: process.env.PUBLIC_WS_URL
  }))
}
