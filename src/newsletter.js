const server = require('express').Router()
const bodyParser = require('body-parser')
const subscribeToken = require('../lib/subscribeToken')
const subscribeEmail = require('../lib/subscribeEmail')

module.exports = (t) =>
  server.get('/newsletter/subscribe', bodyParser.json(), async (req, res) => {
    const {list, email, token, successMessage} = req.query
    const {FRONTEND_BASE_URL} = process.env

    const invalidUrl = `${FRONTEND_BASE_URL}/newsletter/welcome?message=${encodeURIComponent(t('api/newsletter/invalidRequest'))}`

    if (!list || !email || !token) {
      return res.redirect(invalidUrl)
    }

    const sha = subscribeToken(list, email)

    if (sha !== token) {
      return res.redirect(invalidUrl)
    }

    const response = await subscribeEmail(email, list, t)

    const message = response.message || successMessage || ''
    return res.redirect([
      FRONTEND_BASE_URL,
      '/newsletter/welcome',
      `?message=${encodeURIComponent(message)}`
    ].join(''))
  })
