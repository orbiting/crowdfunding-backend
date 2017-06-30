const {ascending} = require('d3-array')
const querystring = require('querystring')
const crypto = require('crypto')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const logger = require('../../../lib/logger')
const sendPendingPledgeConfirmations = require('../../../lib/sendPendingPledgeConfirmations')
const generateMemberships = require('../../../lib/generateMemberships')
const fetch = require('isomorphic-unfetch')

const PAYMENT_DEADLINE_DAYS = 10

module.exports = async (_, args, {pgdb, req, t}) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const { pledgePayment } = args

    // check pledgeId
    const pledge = await transaction.public.pledges.findOne({id: pledgePayment.pledgeId})
    if (!pledge) {
      logger.error(`pledge (${pledgePayment.pledgeId}) not found`, { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }
    if (pledge.status === 'SUCCESSFUL') {
      logger.error('pledge is already paid', { req: req._log(), args, pledge, pledgePayment })
      throw new Error(t('api/pledge/alreadyPaid'))
    }

    // load user
    const user = await transaction.public.users.findOne({id: pledge.userId})

    // check/charge payment
    let pledgeStatus
    let payment
    if (pledgePayment.method == 'PAYMENTSLIP') {
      if (!pledgePayment.address) {
        logger.error('PAYMENTSLIP payments must include an address', { req: req._log(), args, pledge, pledgeStatus, payment })
        throw new Error(t('api/unexpected'))
      }

      // insert address
      const address = await transaction.public.addresses.insertAndGet(pledgePayment.address)
      await transaction.public.users.updateAndGetOne({id: user.id}, {addressId: address.id})

      // only count PAYMENTSLIP payments up to CHF 1000.- immediately
      if (pledge.total > 100000) {
        pledgeStatus = 'WAITING_FOR_PAYMENT'
      } else {
        pledgeStatus = 'SUCCESSFUL'
      }
      const now = new Date()
      payment = await transaction.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'PAYMENTSLIP',
        total: pledge.total,
        status: 'WAITING',
        paperInvoice: pledgePayment.paperInvoice || false,
        dueDate: new Date(now).setDate(now.getDate() + PAYMENT_DEADLINE_DAYS)
      })
    } else if (pledgePayment.method == 'STRIPE') {
      if (!pledgePayment.sourceId) {
        logger.error('sourceId required', { req: req._log(), args, pledge, pledgeStatus, payment })
        throw new Error(t('api/unexpected'))
      }
      let charge = null
      try {
        charge = await stripe.charges.create({
          amount: pledge.total,
          currency: 'chf',
          source: pledgePayment.sourceId
        })
      } catch (e) {
        logger.info('stripe charge failed', { req: req._log(), args, pledge, pledgeStatus, payment, e })
        if (e.type === 'StripeCardError') {
          const translatedError = t('api/pay/stripe/' + e.code)
          if (translatedError) {
            throw new Error(translatedError)
          } else {
            logger.warn('translation not found for stripe error', { req: req._log(), args, pledge, pledgeStatus, payment, e })
            throw new Error(e.message)
          }
        } else {
          logger.error('unknown error on stripe charge', { req: req._log(), args, pledge, pledgeStatus, payment, e })
          throw new Error(t('api/unexpected'))
        }
      }
      // save payment ( outside of transaction to never loose it again)
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'STRIPE',
        total: charge.amount,
        status: 'PAID',
        pspId: charge.id,
        pspPayload: charge
      })
      pledgeStatus = 'SUCCESSFUL'
      // save sourceId to user
      await transaction.public.paymentSources.insert({
        method: 'STRIPE',
        userId: user.id,
        pspId: charge.source.id,
        pspPayload: charge.source
      })
    } else if (pledgePayment.method == 'POSTFINANCECARD') {
      let parsedPspPayload = null
      try {
        parsedPspPayload = JSON.parse(pledgePayment.pspPayload)
      } catch (e) {
        logger.error('failed to parse pspPayload', { req: req._log(), args, pledge })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }
      const pspPayload = parsedPspPayload
      if (!pspPayload) {
        logger.error('pspPayload required', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }

      // check SHA of postfinance
      const {SHASIGN, STATUS, PAYID} = pspPayload
      delete pspPayload.SHASIGN
      const secret = process.env.PF_SHA_OUT_SECRET
      // sort params based on upper case order (urgh!)
      const paramsString = Object.keys(pspPayload)
        .sort((a, b) => ascending(a.toUpperCase(), b.toUpperCase()))
        .filter(key => pspPayload[key])
        .map(key => `${key.toUpperCase()}=${pspPayload[key]}${secret}`)
        .join('')
      const shasum = crypto.createHash('sha1').update(paramsString).digest('hex').toUpperCase()
      if (SHASIGN !== shasum) {
        logger.error('SHASIGN not correct', { req: req._log(), args, pledge, shasum, SHASIGN, pspPayload })
        throw new Error(t('api/pay/pf/error', {id: pledge.id}))
      }

      // https://e-payment-postfinance.v-psp.com/de/guides/user%20guides/statuses-and-errors
      if (parseInt(STATUS) !== 9 && parseInt(STATUS) !== 91) {
        logger.error('STATUS not successfull', { req: req._log(), args, pledge, shasum, SHASIGN, pspPayload })
        throw new Error(t('api/pay/pf/error', {id: pledge.id}))
      }

      // check for replay attacks
      if (await pgdb.public.payments.count({pspId: PAYID})) {
        logger.error('this PAYID was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/paymentIdUsedAlready', {id: pledge.id}))
      }

      // save payment no matter what
      // PF amount is suddendly in franken
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'POSTFINANCECARD',
        total: pspPayload.amount * 100,
        status: 'PAID',
        pspId: PAYID,
        pspPayload: pspPayload
      })
      pledgeStatus = 'SUCCESSFUL'

      if (pspPayload.ALIAS) {
        const paymentSourceExists = await transaction.public.paymentSources.count({
          userId: user.id,
          pspId: pspPayload.ALIAS,
          method: 'POSTFINANCECARD'
        })
        if (!paymentSourceExists) {
          // save alias to user
          await transaction.public.paymentSources.insert({
            method: 'POSTFINANCECARD',
            userId: user.id,
            pspId: pspPayload.ALIAS,
            pspPayload: pspPayload
          })
        }
      }

      // check if amount is correct
      // PF amount is suddendly in franken
      if (pspPayload.amount * 100 !== pledge.total) {
        logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload })
        pledgeStatus = 'PAID_INVESTIGATE'
      }

      // save alias to user
      if (pspPayload.ALIAS) {
        await transaction.public.paymentSources.insert({
          method: 'POSTFINANCECARD',
          userId: user.id,
          pspId: pspPayload.ALIAS
        })
      }
    } else if (pledgePayment.method == 'PAYPAL') {
      let parsedPspPayload = null
      try {
        parsedPspPayload = JSON.parse(pledgePayment.pspPayload)
      } catch (e) {
        logger.error('failed to parse pspPayload', { req: req._log(), args, pledge })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }
      const pspPayload = parsedPspPayload
      if (!pspPayload || !pspPayload.tx) {
        logger.error('pspPayload(.tx) required', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }

      // check for replay attacks
      if (await pgdb.public.payments.count({pspId: pspPayload.tx})) {
        logger.error('this tx was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/paymentIdUsedAlready', {id: pledge.id}))
      }

      // https://developer.paypal.com/docs/classic/api/merchant/GetTransactionDetails_API_Operation_NVP/
      const transactionDetails = {
        'METHOD': 'GetTransactionDetails',
        'TRANSACTIONID': pspPayload.tx,
        'VERSION': '204.0',
        'USER': process.env.PAYPAL_USER,
        'PWD': process.env.PAYPAL_PWD,
        'SIGNATURE': process.env.PAYPAL_SIGNATURE
      }
      const form = querystring.stringify(transactionDetails)
      const contentLength = form.length
      const response = await fetch(process.env.PAYPAL_URL, {
        method: 'POST',
        headers: {
          'Content-Length': contentLength,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form
      })
      const responseDict = querystring.parse(await response.text())
      if (responseDict.PAYMENTSTATUS !== 'Completed') {
        logger.error('paypal transaction invalid', { req: req._log(), args, pledge, pspPayload, responseDict })
        switch (responseDict.PAYMENTSTATUS) {
          case 'Canceled_Reversal':
          case 'Refunded':
          case 'Reversed':
          case 'Processed':
          case 'Pending':
            throw new Error(t('api/paypal/contactUs', {id: pledge.id}))
          case 'Denied':
          case 'Expired':
          case 'Failed':
          case 'Voided':
            throw new Error(t('api/paypal/deny', {id: pledge.id}))
        }
        throw new Error(t('api/paypal/deny', {id: pledge.id}))
      }

      // get paypal amount (is decimal)
      const amount = parseFloat(responseDict.AMT) * 100

      // save payment no matter what
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'PAYPAL',
        total: amount,
        status: 'PAID',
        pspId: pspPayload.tx,
        pspPayload: responseDict
      })
      pledgeStatus = 'SUCCESSFUL'

      // check if amount is correct
      if (amount !== pledge.total) {
        logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload, payment })
        pledgeStatus = 'PAID_INVESTIGATE'
      }
    } else {
      logger.error('unsupported paymentMethod', { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }
    if (!payment || !pledgeStatus) {
      logger.error('payment or pledgeStatus undefined', { req: req._log(), args, pledge, payment, pledgeStatus })
      throw new Error(t('api/unexpected'))
    }

    // insert pledgePayment
    await transaction.public.pledgePayments.insert({
      pledgeId: pledge.id,
      paymentId: payment.id,
      paymentType: 'PLEDGE'
    })

    if (pledge.status !== pledgeStatus) {
      // generate Memberships
      if (pledgeStatus === 'SUCCESSFUL') {
        await generateMemberships(pledge.id, transaction, t, logger)
      }
      // update pledge status
      await transaction.public.pledges.updateAndGetOne({id: pledge.id}, {status: pledgeStatus})
    }

    // send a confirmation email for this pledge
    await transaction.public.pledges.updateOne({id: pledge.id}, {sendConfirmMail: true})
    // if the user is signed in, send mail immediately
    if (req.user) {
      sendPendingPledgeConfirmations(pledge.userId, transaction, t)
    }

    // commit transaction
    await transaction.transactionCommit()

    return {
      pledgeId: pledge.id
    }
  } catch (e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), error: e })
    throw e
  }
}
