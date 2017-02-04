import React from 'react'
import ReactDom from 'react-dom'
import { browserHistory, Router } from 'react-router'
import routes from './routes'

import ApolloClient, { createNetworkInterface } from 'apollo-client'
import { ApolloProvider } from 'react-apollo'
import { Client } from 'subscriptions-transport-ws'


//TODO remove this when addGraphQLSubscriptions in subscription-transport-ws is available
import { print } from 'graphql-tag/printer'

function addGraphQLSubscriptions(networkInterface, wsClient) {
  return Object.assign(networkInterface, {
    subscribe(request, handler) {
      return wsClient.subscribe({
        query: print(request.query),
        variables: request.variables,
      }, handler)
    },
    unsubscribe(id) {
      wsClient.unsubscribe(id)
    }
  })
}

const networkInterface = createNetworkInterface({
  uri: '/graphql',
  opts: {
    credentials: 'same-origin',
  },
})

const wsClient = new Client('ws://localhost:3002')
const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
  networkInterface,
  wsClient,
)

const client = new ApolloClient({
  networkInterface: networkInterfaceWithSubscriptions
//  networkInterface: networkInterface//networkInterfaceWithSubscriptions,
//  initialState: window.__APOLLO_STATE__, // eslint-disable-line no-underscore-dangle
//  ssrForceFetchDelay: 100,
})

ReactDom.render((
  <ApolloProvider client={client}>
    <Router history={browserHistory}>
      {routes}
    </Router>
  </ApolloProvider>
), document.getElementById('root'))


//ReactDom.render(
//  <Router history={browserHistory} routes={routes} />
//, document.getElementById('root'))
