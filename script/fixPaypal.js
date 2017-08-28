//
// This script fixes successfull paypal payments that were
// rejected and didn't result in a successfull pledge.
//
// usage
// read paypal's export into pg public.paypal
// cf_server   node script/fixPaypal.js
//
require('dotenv').config()
const querystring = require('querystring')
const fetch = require('isomorphic-unfetch')
const PgDb = require('../lib/pgdb')
const generateMemberships = require('../lib/generateMemberships')
const {timeParse} = require('d3-time-format')

const {getFormatter} = require('../lib/translate')
const MESSAGES = require('../lib/translations.json').data
const t = getFormatter(MESSAGES)

const datetimeParser = timeParse('%d.%m.%YT%H:%M:%S %Z')

const {
  PAYPAL_USER,
  PAYPAL_PWD,
  PAYPAL_SIGNATURE,
  PAYPAL_URL
} = process.env

PgDb.connect().then(async (pgdb) => {
  const transaction = await pgdb.transactionBegin()

  const jefferson = await transaction.public.users.findOne({email: 'jefferson@project-r.construction'})
  const pledgeIdsByJefferson = (await transaction.public.pledges.find({
    userId: jefferson.id
  })).map(pledge => pledge.id)
  const now = new Date()

  try {
    // paypal puts a "zero width no-break space" into the first column (date) name
    const paypalPayments = await pgdb.public.query(`
      select
        distinct(Transaktionscode) as tx,
        Artikelbezeichnung as "pledgeId",
        "\uFEFFdatum" as date,
        uhrzeit as time,
        zeitzone as timezone
      from
        paypal pp
      where
        pp.typ='Website-Zahlung' and
        length(pp.artikelbezeichnung) !=0 and
        pp.artikelbezeichnung in (
          SELECT id::text from pledges p where p.status != 'SUCCESSFUL'
        )
    `)
    /* investigate Transaktionscode <-> Artikelbezeichnung relationship
    let pledgeIds = []
    let _paypalPayments = {}
    for(let paypalPayment of paypalPayments) {
      if (pledgeIds.indexOf(paypalPayment.pledgeId)> -1) {
        console.log('conflict!!', paypalPayment, _paypalPayments[paypalPayment.pledgeId])
      }
      pledgeIds.push(paypalPayment.pledgeId)
      _paypalPayments[paypalPayment.pledgeId] = paypalPayment
    }
    return
    */

    let counterVoucher = 0
    let counterNew = 0
    for (let paypalPayment of paypalPayments) {
      // get payment from paypal
      const transactionDetails = {
        'METHOD': 'GetTransactionDetails',
        'TRANSACTIONID': paypalPayment.tx,
        'VERSION': '204.0',
        'USER': PAYPAL_USER,
        'PWD': PAYPAL_PWD,
        'SIGNATURE': PAYPAL_SIGNATURE
      }
      const form = querystring.stringify(transactionDetails)
      const contentLength = form.length
      const response = await fetch(PAYPAL_URL, {
        method: 'POST',
        headers: {
          'Content-Length': contentLength,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form
      })
      const responseDict = querystring.parse(await response.text())

      if (responseDict.PAYMENTSTATUS === 'Completed') {
        // load pledge
        const pledge = await transaction.public.pledges.findOne({
          id: paypalPayment.pledgeId
        })
        if (pledge.status === 'SUCCESSFUL') {
          console.log('pledge already SUCCESSFUL', pledge)
          console.log(responseDict)
          console.log('-----')
          continue
        }
        const membershipsGivenByJefferson = await transaction.public.memberships.find({
          userId: pledge.userId,
          pledgeId: pledgeIdsByJefferson
        })
        if (membershipsGivenByJefferson.length > 0) {
          console.log('user was already given a voucher')
          console.log(await transaction.public.users.findOne({id: pledge.userId}))
          console.log(membershipsGivenByJefferson)
          console.log('-----')
          counterVoucher += 1
          continue
        }

        counterNew += 1

        // get paypal amount (is decimal)
        const amount = parseFloat(responseDict.AMT) * 100

        // parse date
        const { date, time, timezone } = paypalPayment
        if (timezone !== 'CEST') {
          throw new Error('timezone in paypal export not CEST, please adapt this script')
        }
        const createdAt = datetimeParser(`${date}T${time} +02`)

        // save payment
        const payment = await transaction.public.payments.insertAndGet({
          type: 'PLEDGE',
          method: 'PAYPAL',
          total: amount,
          status: 'PAID',
          pspId: paypalPayments.tx,
          pspPayload: responseDict,
          updatedAt: now,
          createdAt
        })

        let pledgeStatus = 'SUCCESSFUL'
        // check if amount is correct
        if (amount !== pledge.total) {
          console.log('payed amount doesnt match with pledge', pledge, responseDict)
          pledgeStatus = 'PAID_INVESTIGATE'
        }

        // insert pledgePayment
        await transaction.public.pledgePayments.insert({
          pledgeId: pledge.id,
          paymentId: payment.id,
          paymentType: 'PLEDGE',
          updatedAt: now,
          createdAt
        })

        if (pledge.status !== pledgeStatus) {
          // generate Memberships
          if (pledgeStatus === 'SUCCESSFUL') {
            await generateMemberships(pledge.id, transaction, t)
          }
          // update pledge status
          await transaction.public.pledges.updateAndGetOne({
            id: pledge.id
          }, {
            status: pledgeStatus
          })
        }
      } else {
        console.log('payment not Completed, ignoring:')
        console.log(responseDict)
        console.log('-----')
      }
    }
    console.log(counterNew + ' payments inserted')
    console.log(counterVoucher + ' users where already given a voucher')

    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    console.error('transaction rollback')
    throw e
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
