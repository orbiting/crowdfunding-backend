const express = require('express')
const authServer = require('@project-r/auth-server')
require('dotenv').config()
const graphql = require('./graphql')

process.env.PORT = process.env.PORT || 3001

//setup express
const server = express()

/*
server.use(function(req, res, next) {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
  console.log("new request")
  console.log(req)
  console.log("----------------------------------------------------------")
  next()
})
*/

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  server.use(express.static('dist/client_build'));
}

// TODO cleanup
//authServer.prepareDB( {dbUrl: process.env.USERS_DB_URL} )
const {User} = require('./graphql/connectors')
Promise.resolve(true)
.then((db) => {
  const authConfig = {
    //db: db,
    userModel: User,
    serverUrl: process.env.PUBLIC_URL,
    sessionRedisHost: process.env.SESSION_REDIS_HOST,
    sessionRedisPort: process.env.SESSION_REDIS_PORT,
    passwordlessRedisHost: process.env.PASSWORDLESS_REDIS_HOST,
    passwordlessRedisPort: process.env.PASSWORDLESS_REDIS_PORT,
    secret: process.env.SESSION_SECRET,
    mailUrl: process.env.MAIL_URL,
    mailFromAddress: process.env.MAIL_FROM_ADDRESS,
    mailSubject: 'Login to Project R',
    mailContent: function(link) {
      return `Ma’am, Sir,

you can now access your account here:
${link}

Your R-Crew`
    }
  }
  const { ensureLoggedIn, withUser } = authServer.configure(server, authConfig)

  graphql(server)

  server.get('/test', ensureLoggedIn, withUser, function(req, res) {
    console.log("/test")
    console.log(res.locals.user)
    res.end("you are logged in")
  })


	// in DEV the client is run via react-scripts via a separate server
	// requests that are not handled by this server have to be passed to the react-dev-server
  if(process.env.NODE_ENV !== 'production') {
    const httpProxy = require('http-proxy')
    var proxy = httpProxy.createProxyServer({target: process.env.CLIENT_DEV_SERVER_URL, ws: true});
    //proxy request
    server.use(function(req, res, next) {
      console.log("proxy request to CREATE-REACT-APP for: "+req.originalUrl)
      proxy.web(req, res)//, { target: 'http://localhost:3002' })
    })
		// proxy WebSocket requests as well (webpackHotDevClient)
		// (we don't use websockets for anything else than hot code reloading so far...)
    // DOESN'T WORK :(
    /*
		server.on('upgrade', function (req, socket, head) {
			proxy.ws(req, socket, head);
		})
    */
  }

  // start the server
  server.listen(3001, () => {
    console.log('new server is running on http://localhost:3001')
  })
})
