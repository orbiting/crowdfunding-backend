const {ascending} = require('d3-array')
const querystring = require('querystring')
const crypto = require('crypto')
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const logger = require('../../lib/logger')
const sendMailTemplate = require('../../lib/sendMailTemplate')
const fetch = require('isomorphic-unfetch')

module.exports = async (_, args, {loaders, pgdb, req, t}) => {
  const transaction = await pgdb.transactionBegin()
  try {
    const { pledgePayment } = args

    //check pledgeId
    const pledge = await transaction.public.pledges.findOne({id: pledgePayment.pledgeId})
    if(!pledge) {
      logger.error(`pledge (${pledgePayment.pledgeId}) not found`, { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }
    if(pledge.status === 'SUCCESSFUL') {
      logger.error('pledge is already paid', { req: req._log(), args, pledge, pledgePayment })
      throw new Error(t('api/pledge/alreadyPaid'))
    }

    //load user
    const user = await transaction.public.users.findOne({id: pledge.userId})

    //check/charge payment
    let pledgeStatus
    let payment
    if(pledgePayment.method == 'PAYMENTSLIP') {
      if(!pledgePayment.address) {
        logger.error('PAYMENTSLIP payments must include an address', { req: req._log(), args, pledge, pledgeStatus, payment })
        throw new Error(t('api/unexpected'))
      }

      //insert address
      const address = await transaction.public.addresses.insertAndGet(pledgePayment.address)
      await transaction.public.users.updateAndGetOne({id: user.id}, {addressId: address.id})

      //only count PAYMENTSLIP payments up to CHF 1000.- immediately
      if(pledge.total > 100000) {
        pledgeStatus = 'WAITING_FOR_PAYMENT'
      } else {
        pledgeStatus = 'SUCCESSFUL'
      }
      payment = await transaction.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'PAYMENTSLIP',
        total: pledge.total,
        status: 'WAITING',
        paperInvoice: pledgePayment.paperInvoice || false
      })

    } else if(pledgePayment.method == 'STRIPE') {
      if(!pledgePayment.sourceId) {
        logger.error('sourceId required', { req: req._log(), args, pledge, pledgeStatus, payment })
        throw new Error(t('api/unexpected'))
      }
      let charge = null
      try {
        charge = await stripe.charges.create({
          amount: pledge.total,
          currency: "chf",
          source: pledgePayment.sourceId
        })
      } catch(e) {
        logger.info('stripe charge failed', { req: req._log(), args, pledge, pledgeStatus, payment, e })
        if(e.type === 'StripeCardError') {
          const translatedError = t('api/pay/'+e.code)
          if(translatedError) {
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
      //save payment ( outside of transaction to never loose it again)
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'STRIPE',
        total: charge.amount,
        status: 'PAID',
        pspId: charge.id,
        pspPayload: charge
      })
      pledgeStatus = 'SUCCESSFUL'
      //save sourceId to user
      await transaction.public.paymentSources.insert({
        method: 'STRIPE',
        userId: user.id,
        pspId: charge.source.id,
        pspPayload: charge.source
      })

    } else if(pledgePayment.method == 'POSTFINANCECARD') {
      let parsedPspPayload = null
      try {
        parsedPspPayload = JSON.parse(pledgePayment.pspPayload)
      } catch(e) {
        logger.error('failed to parse pspPayload', { req: req._log(), args, pledge })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }
      const pspPayload = parsedPspPayload
      if(!pspPayload) {
        logger.error('pspPayload required', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }

      //check SHA of postfinance
      const SHASIGN = pspPayload.SHASIGN
      delete pspPayload.SHASIGN
      const secret = process.env.PF_SHA_OUT_SECRET
      //sort params based on upper case order (urgh!)
      const paramsString = Object.keys(pspPayload)
        .sort( (a, b) => ascending(a.toUpperCase(), b.toUpperCase()))
        .filter(key => pspPayload[key])
        .map(key => `${key.toUpperCase()}=${pspPayload[key]}${secret}`)
        .join('')
      const shasum = crypto.createHash('sha1').update(paramsString).digest('hex').toUpperCase()
      if(SHASIGN!==shasum) {
        logger.error('SHASIGN not correct', { req: req._log(), args, pledge, shasum, SHASIGN, pspPayload })
        throw new Error(t('api/pay/pf/checksumError', {id: pledge.id}))
      }

      //check for replay attacks
      if(await pgdb.public.payments.count({pspId: pspPayload.PAYID})) {
        logger.error('this PAYID was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/paymentIdUsedAlready', {id: pledge.id}))
      }

      //save payment no matter what
      //PF amount is suddendly in franken
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'POSTFINANCECARD',
        total: pspPayload.amount*100,
        status: 'PAID',
        pspId: pspPayload.PAYID,
        pspPayload: pspPayload
      })
      pledgeStatus = 'SUCCESSFUL'

      //check if amount is correct
      //PF amount is suddendly in franken
      if(pspPayload.amount*100 !== pledge.total) {
        logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload })
        pledgeStatus = 'PAID_INVESTIGATE'
      }

      //save alias to user
      if(pspPayload.ALIAS) {
        await transaction.public.paymentSources.insert({
          method: 'POSTFINANCECARD',
          userId: user.id,
          pspId: pspPayload.ALIAS
        })
      }

    } else if(pledgePayment.method == 'PAYPAL') {
      let parsedPspPayload = null
      try {
        parsedPspPayload = JSON.parse(pledgePayment.pspPayload)
      } catch(e) {
        logger.error('failed to parse pspPayload', { req: req._log(), args, pledge })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }
      const pspPayload = parsedPspPayload
      if(!pspPayload || !pspPayload.tx) {
        logger.error('pspPayload(.tx) required', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/parseFailed', {id: pledge.id}))
      }

      //check for replay attacks
      if(await pgdb.public.payments.count({pspId: pspPayload.tx})) {
        logger.error('this tx was used already 😲😒😢', { req: req._log(), args, pledge, pspPayload })
        throw new Error(t('api/pay/paymentIdUsedAlready', {id: pledge.id}))
      }

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
      if(responseDict.ACK !== 'Success') {
        logger.error('paypal transaction invalid', { req: req._log(), args, pledge, pspPayload, responseDict })
        throw new Error(t('api/paypal/unknownError', {id: pledge.id}))
      }

      //get paypal amount (is decimal)
      const amount = parseFloat(responseDict.AMT)*100

      //save payment no matter what
      payment = await pgdb.public.payments.insertAndGet({
        type: 'PLEDGE',
        method: 'PAYPAL',
        total: amount,
        status: 'PAID',
        pspId: pspPayload.tx,
        pspPayload: responseDict
      })
      pledgeStatus = 'SUCCESSFUL'

      //check if amount is correct
      if(amount !== pledge.total) {
        logger.info('payed amount doesnt match with pledge', { req: req._log(), args, pledge, pspPayload, payment })
        pledgeStatus = 'PAID_INVESTIGATE'
      }
    } else {
      logger.error('unsupported paymentMethod', { req: req._log(), args, pledge })
      throw new Error(t('api/unexpected'))
    }
    if(!payment || !pledgeStatus) {
      logger.error('payment or pledgeStatus undefined', { req: req._log(), args, pledge, payment, pledgeStatus })
      throw new Error(t('api/unexpected'))
    }

    //insert pledgePayment
    await transaction.public.pledgePayments.insert({
      pledgeId: pledge.id,
      paymentId: payment.id,
      paymentType: 'PLEDGE'
    })

    if(pledge.status !== pledgeStatus) {
      //generate Memberships
      // TODO extract to function
      if(pledgeStatus === 'SUCCESSFUL') {
        // get augmented pledge options
        const pledgeOptions = await transaction.public.pledgeOptions.find({pledgeId: pledge.id})
        const packageOptions = await transaction.public.packageOptions.find({id: pledgeOptions.map( (plo) => plo.templateId)})
        const rewards = await transaction.public.rewards.find({id: packageOptions.map( (pko) => pko.rewardId)})
        if(rewards.length) { //otherwise it's a donation-only pledge
          const membershipTypes = await transaction.public.membershipTypes.find({rewardId: rewards.map( (r) => r.id)})
          // assemble tree
          rewards.forEach( (r) => {
            r.membershipType = membershipTypes.find( (mt) => r.id===mt.rewardId)
          })
          packageOptions.forEach( (pko) => {
            pko.reward = rewards.find( (r) => pko.rewardId===r.id)
          })
          pledgeOptions.forEach( (plo) => {
            plo.packageOption = packageOptions.find( (pko) => plo.templateId===pko.id)
          })

          //HACKHACK if the pledge has a negative donation:
          // 1) it's a one membership pledge
          // 2) this membership was bought for a reduced price
          // 3) this membership is not voucherable
          // voucherCodes get generated inside the db, but not for reducedPrice
          const reducedPrice = pledge.donation < 0

          const memberships = []
          pledgeOptions.forEach( (plo) => {
            if(plo.packageOption.reward.type === 'MembershipType') {
              for(let c=0; c<plo.amount; c++) {
                memberships.push({
                  userId: user.id,
                  pledgeId: pledge.id,
                  membershipTypeId: plo.packageOption.reward.membershipType.id,
                  beginDate: new Date(),
                  reducedPrice
                })
              }
            }
          })
          await transaction.public.memberships.insert(memberships)
        }
      }
      // update pledge status
      await transaction.public.pledges.updateAndGetOne({id: pledge.id}, {status: pledgeStatus})
    }

    //commit transaction
    await transaction.transactionCommit()

    const newPledge = await pgdb.public.pledges.findOne({id: pledge.id})
    const package = await pgdb.public.packages.findOne({id: newPledge.packageId})
    const memberships = await pgdb.public.memberships.find({pledgeId: newPledge.id})
    const newUser = await pgdb.public.users.findOne({id: user.id})
    const address = await pgdb.public.addresses.findOne({id: newUser.addressId})
    await sendMailTemplate({
      to: user.email,
      fromEmail: process.env.DEFAULT_MAIL_FROM_ADDRESS,
      subject: t('api/pledge/mail/subject'),
      templateName: 'cf_pledge',
      globalMergeVars: [
        { name: 'NAME',
          content: newUser.name
        },
        { name: 'WAITING_FOR_PAYMENT',
          content: newPledge.status==='WAITING_FOR_PAYMENT'
        },
        { name: 'PAPER_INVOICE',
          content: payment.paperInvoice
        },
        { name: 'PAYMENTSLIP',
          content: pledgePayment.method==='PAYMENTSLIP'
        },
        { name: 'ASK_PERSONAL_INFO',
          content: (!newUser.addressId || !newUser.birthday)
        },
        { name: 'VOUCHER_CODES',
          content: package.name==='ABO_GIVE'
            ? memberships.map( m => m.voucherCode ).join(', ')
            : null
        },
        { name: 'TOTAL',
          content: newPledge.total/100.0
        },
        { name: 'ADDRESS',
          content: address
            ? `<span>${address.name}<br/>
${address.line1}<br/>
${address.line2 ? address.line2+'<br/>' : ''}
${address.postalCode} ${address.city}<br/>
${address.country}</span>`
            : null
        },
      ]
    })
    return {
      pledgeId: pledge.id
    }
  } catch(e) {
    await transaction.transactionRollback()
    logger.info('transaction rollback', { req: req._log(), error: e })
    throw e
  }
}
