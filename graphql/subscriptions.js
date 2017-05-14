const { SubscriptionManager, PubSub } = require('graphql-subscriptions')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const pubsub = new PubSub()
const {WS_PORT, DATABASE_URL, NODE_ENV} = process.env
const DEV = NODE_ENV && NODE_ENV !== 'production'
const { createServer } = DEV
  ? require('http')
  : require('https')
const pg  = require('pg')


exports.start = (executableSchema) => {

  const subscriptionManager = new SubscriptionManager({
    schema: executableSchema,
    pubsub,
  })

  const websocketServer = createServer((request, response) => {
    response.writeHead(404)
    response.end()
  })
  websocketServer.listen(WS_PORT, () => console.log(
    `Websocket Server is now running on port ${WS_PORT}`
  ))

  const subscriptionServer = new SubscriptionServer(
    {
      subscriptionManager: subscriptionManager
    },
    {
      server: websocketServer,
      path: '/'
    }
  )

  //TODO error handling and reconnect
  pg.connect(DATABASE_URL, function(err, client, done) {
    client.on('notification', (message) => {
      const notification = JSON.parse(message.payload)
      pubsub.publish(notification.channel, notification.payload)
    })
    const query = client.query('LISTEN crowdfunding')
  })

}

exports.publish = (pgdb) => async (channel, payload) => {
  const notification = JSON.stringify({
    channel,
    payload
  })
  return pgdb.query(`NOTIFY crowdfunding, '${notification}'`)
}
