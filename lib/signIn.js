const uuid = require('uuid/v4')
const randomWord = require('./randomWord')
const kraut = require('kraut')
const geoForIP = require('./geo/geoForIP')
const sendMailTemplate = require('./sendMailTemplate')
const logger = require('./logger')
const fetch = require('isomorphic-unfetch')
const querystring = require('querystring')
const isEmail = require('email-validator').validate

module.exports = async (_email, context, pgdb, req, t) => {
  if (req.user) {
    // fail gracefully
    return {phrase: ''}
  }

  if (!isEmail(_email)) {
    logger.info('invalid email', { req: req._log(), _email })
    throw new Error(t('api/email/invalid'))
  }

  // find existing email with different cases
  const email = (await pgdb.public.users.findOneFieldOnly({email: _email}, 'email')) || _email

  const token = uuid()
  const ua = req.headers['user-agent']
  const phrase = kraut.adjectives.random() + ' ' + kraut.verbs.random() + ' ' + randomWord()
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

  const {country, city} = geoForIP(ip)
  let geoString = country
  if (geoString === 'Schweiz') {
    geoString = 'der ' + geoString
  }

  req.session.email = email
  req.session.token = token
  req.session.ip = ip
  req.session.ua = ua
  if (country || city) {
    req.session.geo = {country, city}
  }

  await new Promise(function (resolve, reject) {
    req.session.save(function (err) {
      if (err) {
        logger.error('auth: error saving session', { req: req._log(), err })
        return reject((t('api/auth/errorSavingSession')))
      }
      return resolve()
    })
  })

  const verificationUrl = (process.env.PUBLIC_URL || 'http://' + req.headers.host) +
    '/auth/email/signin/?' +
    querystring.stringify({email, context, token})

  // AUTO_LOGIN for automated testing
  if (process.env.AUTO_LOGIN) {
    // email addresses @test.project-r.construction will be auto logged in
    // - email addresses containing «not» will neither be logged in nor send an sign request
    const testMatch = email.match(/^([a-zA-Z0-9._%+-]+)@test\.project-r\.construction$/)
    if (testMatch) {
      if (testMatch[1].indexOf('not') === -1) {
        setTimeout(() => {
          const {BASIC_AUTH_USER, BASIC_AUTH_PASS} = process.env
          if (BASIC_AUTH_PASS) {
            fetch(verificationUrl, {
              headers: {
                'Authorization': 'Basic ' + (new Buffer(BASIC_AUTH_USER + ':' + BASIC_AUTH_PASS).toString('base64'))
              }
            })
          } else {
            fetch(verificationUrl)
          }
        }, 2000)
      }

      return {phrase}
    }
  }

  await sendMailTemplate({
    to: email,
    fromEmail: process.env.AUTH_MAIL_FROM_ADDRESS,
    subject: t('api/signin/mail/subject'),
    templateName: 'cf_signin',
    globalMergeVars: [
      { name: 'LOCATION',
        content: geoString
      },
      { name: 'SECRET_WORDS',
        content: phrase
      },
      { name: 'LOGIN_LINK',
        content: verificationUrl
      }
    ]
  })

  return {phrase}
}
