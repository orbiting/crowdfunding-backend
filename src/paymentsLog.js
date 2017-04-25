const server = require('express').Router()
const bodyParser = require('body-parser')

module.exports = (pgdb) => {

  //https://stripe.com/docs/webhooks
  server.post('/payments/stripe',
    bodyParser.json(),
    async (req, res) => {
      await pgdb.public.paymentsLog.insert({
        method: 'STRIPE',
        pspPayload: req.body
      })
      return res.sendStatus(200)
  })

  // https://developer.paypal.com/docs/integration/direct/webhooks/rest-webhooks/
  server.post('/payments/paypal',
    bodyParser.urlencoded({extended: true}),
    async (req, res) => {
      await pgdb.public.paymentsLog.insert({
        method: 'PAYPAL',
        pspPayload: req.body
      })
      return res.sendStatus(200)
  })

  //https://e-payment-postfinance.v-psp.com/de/guides/integration%20guides/e-commerce/transaction-feedback#servertoserver-feedback
  server.post('/payments/pf', async (req, res) => {
    bodyParser.urlencoded({extended: true}),
    await pgdb.public.paymentsLog.insert({
      method: 'POSTFINANCECARD',
      pspPayload: req.body
    })
    return res.sendStatus(200)
  })

  return server
}
