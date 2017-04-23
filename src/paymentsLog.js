const server = require('express').Router()
const bodyParser = require('body-parser')

module.exports = (pgdb) => {

  //https://stripe.com/docs/webhooks
  server.post('/payments/stripe',
    bodyParser.json(),
    async function(req, res) {
      await pgdb.public.paymentsLog.insert({
        method: 'STRIPE',
        pspPayload: req.body
      })
      return res.send(200)
  })

  // https://developer.paypal.com/docs/integration/direct/webhooks/rest-webhooks/
  server.post('/payments/paypal',
    bodyParser.json(),
    async function(req, res) {
      await pgdb.public.paymentsLog.insert({
        method: 'PAYPAL',
        pspPayload: req.body
      })
      return res.send(200)
  })

  //https://e-payment-postfinance.v-psp.com/de/guides/integration%20guides/e-commerce/transaction-feedback#servertoserver-feedback
  server.get('/payments/pf', async function(req, res) {
    await pgdb.public.paymentsLog.insert({
      method: 'POSTFINANCECARD',
      pspPayload: req.query
    })
    return res.send(200)
  })

  return server
}
