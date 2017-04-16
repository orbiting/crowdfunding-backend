const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const passport = require('passport')

exports.configure = ({
  server = null, // Express Server
  pgdb = null, // pogi connection
  // Secret used to encrypt session data on the server
  secret = null,
  // Specifies the value for the Domain Set-Cookie attribute
  domain = undefined,
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
  dev = false
} = {}) => {
  if (server === null) {
    throw new Error('server option must be an express server instance')
  }
  if (secret === null) {
    throw new Error('session secret option must be provided')
  }
  if (pgdb === null) {
    throw new Error('pgdb option must be a connected pogi instance')
  }
  // Sessions store for express-session (defaults to connect-pg-simple using DATABASE_URL)
  const store = new PgSession({
    tableName: 'sessions'
  })
  const Users = pgdb.public.users
  const Sessions = pgdb.public.sessions

  // Configure sessions
  server.use(session({
    secret,
    store,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    httpOnly: true,
    cookie: {
      domain,
      maxAge: maxAge,
      secure: !dev
    }
  }))

  // trust first proxy
  if(!dev) {
    server.set('trust proxy', 1)
  }

  // authenticate a token sent by email
  server.get('/auth/email/signin/:token', async (req, res) => {
    const token = req.params.token
    if (!token) {
      return res.status(400).end('token must be provided')
    }

    // Look up session by token
    const session = await Sessions.findOne({'sess @>': {token}})
    if (!session) {
      return res.status(400).end('token invalid')
    }

    const {email} = session.sess

    // verify and/or create the user
    let user = await Users.findOne({email})
    if (user) {
      if(!user.verified) {
        await Users.updateOne({id: user.id}, {verified: true})
      }
    } else {
      user = await Users.insertAndGet({email, verified: true})
    }

    //log in the session and delete token
    const sess = Object.assign({}, session.sess, {
      passport: {user: user.id},
      token: null
    })
    await Sessions.updateOne({sid: session.sid}, {sess})

    return res.status(200).end("Signin erfolgreich, Sie können dieses Fenster wieder schliessen")
  })


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
