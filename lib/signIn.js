const uuid = require('uuid/v4')
const rndWord = require('random-noun-generator-german')
const kraut = require('kraut')
const geoForIP = require('./geoForIP')
const sendMail = require('./sendMail')
const logger = require('./logger')

module.exports = (email, req, t) => {
  if(req.user) {
    //fail gracefully
    return {phrase: ''}
  }

  if(!email.match(/^.+@.+\..+$/)) {
    logger.info('invalid email', { req: req._log(), email })
    throw new Error(t('api/email/invalid'))
  }

  const token = uuid()
  const ua = req.headers['user-agent']
  const phrase = kraut.adjectives.random()+' '+kraut.verbs.random()+' '+rndWord()
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  const geo = geoForIP(ip)
  let geoString = ''
  if(geo) {
    geoString = 'Login Versuch aus: '+geo+'.\n\n'
  }

  req.session.email = email
  req.session.token = token
  req.session.ip = ip
  req.session.ua = ua
  if(geo) {
    req.session.geo = geo
  }

  const verificationUrl = (process.env.PUBLIC_URL || 'http://'+req.headers.host)+'/auth/email/signin/'+token
  sendMail({
    to: email,
    from: process.env.AUTH_MAIL_FROM_ADDRESS,
    subject: 'Login Link',
    text: `Ma’am, Sir,\n\n${geoString}Falls Ihnen dass Ihnen folgende Wörter angezeigt wurden: <${phrase}>,klicken Sie auf den folgenden Link um sich einzuloggen:\n${verificationUrl}\n`
  })

  return {phrase}
}
