const bodyParser = require('body-parser')
const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const passport = require('passport')

exports.configure = ({
  server = null, // Express Server
  users: Users = null, // User model
  // Secret used to encrypt session data on the server
  secret = null,
  // Sessions store for express-session (defaults to connect-pg-simple using DATABASE_URL)
  store = new PgSession({
    tableName: 'sessions'
  }),
  // Max session age in ms (default is 4 weeks)
  // NB: With 'rolling: true' passed to session() the session expiry time will
  // be reset every time a user visits the site again before it expires.
  maxAge = 60000 * 60 * 24 * 7 * 4,
  // How often the client should revalidate the session in ms (default 60s)
  // Does not impact the session life on the server, but causes the client to
  // always refetch session info after N seconds has elapsed since last
  // checked. Sensible values are between 0 (always check the server) and a
  // few minutes.
  clientMaxAge = 60000,
  // is the server running in development
  dev = process.env.NODE_ENV !== 'production'
} = {}) => {
  if (server === null) {
    throw new Error('server option must be an express server instance')
  }
  if (Users === null) {
    throw new Error('users option must be a pogi user table')
  }

  // Load body parser to handle POST requests
  server.use(bodyParser.json())
  server.use(bodyParser.urlencoded({extended: true}))

  // Configure sessions
  server.use(session({
    secret: secret,
    store: store,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    httpOnly: true,
    cookie: {
      maxAge: maxAge,
      secure: !dev
    }
  }))

  // Tell Passport how to seralize/deseralize user accounts
  passport.serializeUser(function (user, next) {
    next(null, user.id)
  })

  passport.deserializeUser(async function (id, next) {
    const user = await Users.findOne({id})
    if (!user) {
      return next('user not found!')
    }
    // Note: We don't return all user profile fields to the client, just ones
    // that are whitelisted here to limit the amount of user data we expose.
    next(null, {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified
    })
  })

  // Initialise Passport
  server.use(passport.initialize())
  server.use(passport.session())

}
