const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const passport = require('passport')
const sendPendingPledgeConfirmations = require('../lib/sendPendingPledgeConfirmations')

exports.configure = ({
  server = null, // Express Server
  pgdb = null, // pogi connection
  t = null, // translater
  logger = null,
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
  if (t === null) {
    throw new Error('t option must be the translator')
  }
  if (logger === null) {
    throw new Error('logger required')
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

    // Look up session by token
    const session = await Sessions.findOne({'sess @>': {token}})
    if (!session) {
      logger.error('auth: no session', { req: req._log(), token })
      return res
        .set({'content-type': 'text/plain; charset=utf-8'})
        .status(200)
        .end(t('api/auth/error'))
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

    //singin hooks
    await sendPendingPledgeConfirmations(user.id, pgdb, t)

    return res
      .set({'content-type': 'text/plain; charset=utf-8'})
      .status(200)
      .end(t('api/auth/success'))
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
    next(null, user)
  })

  // Initialise Passport
  server.use(passport.initialize())
  server.use(passport.session())

}
