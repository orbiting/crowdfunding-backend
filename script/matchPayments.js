//
// This script imports postfinance exports and our cash record exports
// check the examples folder to see the supported formats.
// Reports about unmatched payments, pledges in need for investigation
// and overdue payments are written to scripts/exports/
//
// usage Postfinance
// cf_server  cat script/examples/export_pf.csv | node script/matchPayments.js pf
//
// usage Cash
// cf_server  cat script/examples/export_cash.csv | node script/matchPayments.js cash
//
// if you just want to rematch payments from postfinancePayments/cashPayments
// without reading new ones, provide no-input as the second argument
// cf_server  node script/matchPayments.js pf no-input

require('dotenv').config()

const PgDb = require('../lib/pgdb')
const rw = require('rw')
const {dsvFormat} = require('d3-dsv')
const csvParse = dsvFormat(';').parse
const {getFormatter} = require('../lib/translate')
const MESSAGES = require('../lib/translations.json').data
const generateMemberships = require('../lib/generateMemberships')
const sendPaymentSuccessful = require('../lib/sendPaymentSuccessful')
//const sendMail = require('../lib/sendMail')

const t = getFormatter(MESSAGES)

const LOG_FAILED_INSERTS = false

const parseCashExport = (path) => {
  const inputFile = rw.readFileSync(path, 'utf8')
  return csvParse(inputFile)
    .filter( row => row.hrid )
}

const parsePostfinanceExport = (path) => {
  //sanitize input
  //keys to lower case
  //trash uninteresting columns
  //parse columns
  //extract mitteilung
  const inputFile = rw.readFileSync(path, 'utf8')
  const includeColumns = ['Buchungsdatum', 'Valuta', 'Avisierungstext', 'Gutschrift']
  const parseDate = ['Buchungsdatum', 'Valuta']
  const parseAmount = ['Gutschrift']
  return csvParse( inputFile )
    .filter( row => row.Gutschrift ) //trash rows without gutschrift (such as lastschrift and footer)
    .filter( row => !/^EINZAHLUNGSSCHEIN/g.exec(row.Avisierungstext) ) //trash useless EINZAHLUNGSSCHEIN
    .filter( row => !/^GUTSCHRIFT E-PAYMENT TRANSAKTION POSTFINANCE CARD/g.exec(row.Avisierungstext) ) //trash PF CARD
    .filter( row => !/^GUTSCHRIFT VON FREMDBANK (.*?) AUFTRAGGEBER: STRIPE/g.exec(row.Avisierungstext) ) //trash stripe payments
    .map( row => {
      let newRow = {}
      Object.keys(row).forEach( key => {
        const value = row[key]
        if(includeColumns.indexOf(key) > -1) {
          const newKey = key.toLowerCase()
          if(parseDate.indexOf(key) > -1) {
            newRow[newKey] = new Date(value)
          }
          else if(parseAmount.indexOf(key) > -1) {
            newRow[newKey] = parseInt( parseFloat(value)*100 )
          }
          else {
            if(key==='Avisierungstext') {
              try {
                newRow['mitteilung'] = /.*?MITTEILUNGEN:.*?\s([A-Za-z0-9]{6})(\s.*?|$)/g.exec(value)[1]
              } catch(e) {
                //console.log("Cloud not extract mitteilung from row:")
                //console.log(row)
              }
            }
            newRow[newKey] = value
          }
        }
      })
      return newRow
    })
}

const writeReport = async (pgdb) => {
  let investigatePledges = await pgdb.public.pledges.find({
    status: 'PAID_INVESTIGATE'
  })
  const overduePayments = await pgdb.public.payments.find({
    'dueDate <': new Date(),
    status: 'WAITING'
  })
  if(investigatePledges.length || overduePayments.length) {
    let find = {}
    const findPledgeIds = { pledgeId: investigatePledges.map( p => p.id ) }
    const findPaymentIds = { paymentId: overduePayments.map( p => p.id ) }
    if(investigatePledges.length && overduePayments.length) {
      find = { or: [ findPledgeIds, findPaymentIds ] }
    } else if(investigatePledges.length) {
      find = findPledgeIds
    } else {
      find = findPaymentIds
    }
    const pledgePayments = await pgdb.public.pledgePayments.find(find)

    const payments = await pgdb.public.payments.find({id: pledgePayments.map( p => p.paymentId )})
    const pledges = await pgdb.public.pledges.find({id: pledgePayments.map( p => p.pledgeId )})
    const users = await pgdb.public.users.find({id: pledges.map( p => p.userId )})
    const addresses = await pgdb.public.addresses.find({id: users.map( p => p.addressId )})
    users.forEach( user => {
      user.address = addresses.find( a => user.addressId === a.id )
    })
    pledges.forEach( pledge => {
      pledge.user = users.find( u => u.id === pledge.userId )
      pledge.pledgePayments = pledgePayments.filter( p => p.pledgeId === pledge.id )
      pledge.pledgePaymentsPaymentIds = pledge.pledgePayments.map( p => p.paymentId )
      pledge.payments = payments.filter( p => pledge.pledgePaymentsPaymentIds.indexOf(p.id) > -1 )
      delete pledge.pledgePaymentsPaymentIds
      delete pledge.pledgePayments
    })
    investigatePledges = investigatePledges.map( pledge => {
      return pledges.find( p => p.id === pledge.id )
    })
    overduePayments.forEach( payment => {
      const pledgePayment = pledgePayments.find( p => p.paymentId === payment.id )
      payment.pledge = pledges.find( p => p.id === pledgePayment.pledgeId )
    })
  }
  /*
  sendMail({
    to: 'admin@project-r.construction',
    from: 'admin@project-r.construction',
    subject: 'investigate_pledges.json',
    text: JSON.stringify(investigatePledges)
  })
  sendMail({
    to: 'admin@project-r.construction',
    from: 'admin@project-r.construction',
    subject: 'overdue_payments.json',
    text: JSON.stringify(overduePayments)
  })
  */
  const unmatchedPayments = await pgdb.public.postfinancePayments.find({
    matched: false
  })
  console.log("-------------------")
  console.log("investigatePledges")
  console.log(JSON.stringify(investigatePledges))
  console.log("-------------------")
  console.log("overduePayments")
  console.log(JSON.stringify(overduePayments))
  console.log("-------------------")
  console.log("unmatchedPayments")
  console.log(JSON.stringify(unmatchedPayments))
}

const insertPayments = async (paymentsInput, tableName, pgdb) => {
  const numPaymentsBefore = await pgdb.public[tableName].count()
  let numFailed = 0
  await Promise.all(
    paymentsInput.map( payment => {
      return pgdb.public[tableName].insert(payment)
        .then( () => { return {payment, status: "resolved"} })
        .catch( e => { numFailed+=1; return {payment, e, status: "rejected"} })
    })
  ).then( results => {
    if(LOG_FAILED_INSERTS) {
      const rejected = results.filter(x => x.status === "rejected")
      rejected.forEach( promise => {
        console.log("could not insert row:")
        console.log(promise.e.message)
        console.log(promise.payment)
        console.log('---------------------')
      })
    }
  })
  console.log(`Failed to insert ${numFailed} payments.`)
  return numPaymentsBefore
}

PgDb.connect().then( async (pgdb) => {

  const MODE = process.argv[2]
  if(!MODE || (MODE !== 'pf' && MODE !== 'cash')) {
    console.error('second parameter must be pf or cash')
    process.exit(1)
  }
  const PF = MODE === 'pf'


  let tName
  if(PF) {
    tName = 'postfinancePayments'
  }
  else {
    tName = 'cashPayments'
  }
  const tableName = tName
  console.log(`importing new ${tableName}...`)


  if(process.argv[3] === 'no-input') {
    console.log('not reading from input!')
  } else {
    console.log('reading from /dev/stdin')
    let input
    if(PF) {
      input = parsePostfinanceExport('/dev/stdin')
    }
    else {
      input = parseCashExport('/dev/stdin')
    }
    const paymentsInput = input

    //insert into db
    //this is done outside of transaction because it's
    //ment to throw on duplicate rows and doesn't change other records
    const numPaymentsBefore = await insertPayments(paymentsInput, tableName, pgdb)
    const numPaymentsAfter = await pgdb.public[tableName].count()
    console.log(`${numPaymentsAfter-numPaymentsBefore} new payment(s) imported (${numPaymentsAfter} total)`)
  }


  const transaction = await pgdb.transactionBegin()
  try {
    //load
    const unmatchedPayments = await transaction.public[tableName].find({
      matched: false
    })
    const payments = await transaction.public.payments.find({
      method: 'PAYMENTSLIP',
      status: 'WAITING'
    })

    //match and update payments
    let matchedPaymentIds = []
    const updatedPayments = payments.filter( payment => {
      if(PF) {
        const matchingPayment = unmatchedPayments.find( up => up.mitteilung === payment.hrid )
        if(!matchingPayment)
          return null
        matchedPaymentIds.push(matchingPayment.id)
        payment.total = matchingPayment.gutschrift
        payment.pspPayload = matchingPayment.avisierungstext
      } else {
        const matchingPayment = unmatchedPayments.find( up => up.hrid === payment.hrid )
        if(!matchingPayment)
          return null
        matchedPaymentIds.push(matchingPayment.id)
        payment.pspPayload = 'CASH'
      }
      payment.status = 'PAID'
      payment.updatedAt = new Date()
      return payment
    })
    console.log(`${updatedPayments.length} payment(s) matched`)

    if(updatedPayments.length > 0) { //else we are done
      //write updatedPayments and matchedPayments
      await Promise.all(updatedPayments.map( payment => {
        return transaction.public.payments.update({id: payment.id}, payment)
      }))
      await transaction.public[tableName].update({id: matchedPaymentIds}, {matched: true})

      //update pledges
      const pledgePayments = await transaction.public.pledgePayments.find({paymentId: updatedPayments.map(p => p.id)})
      const pledges = await transaction.public.pledges.find({id: pledgePayments.map(p => p.pledgeId)})
      let numUpdatedPledges = 0
      let numPaymentsSuccessful = 0
      await Promise.all(updatedPayments.map( async (payment) => {
        const pledgePayment = pledgePayments.find( p => p.paymentId === payment.id )
        const pledge = pledges.find( p => p.id === pledgePayment.pledgeId )
        if(!pledgePayment || !pledge) { throw new Error('could not find pledge for payment')}

        let newStatus
        if(payment.total >= pledge.total)
          newStatus = 'SUCCESSFUL'
        else
          newStatus = 'PAID_INVESTIGATE'

        if(pledge.status !== newStatus) {
          if(newStatus === 'SUCCESSFUL') {
            await generateMemberships(pledge.id, transaction, t)
          }
          await transaction.public.pledges.update({id: pledge.id}, {
            status: newStatus
          })
          numUpdatedPledges += 1
        }

        if(newStatus === 'SUCCESSFUL') {
          await sendPaymentSuccessful(pledge.id, transaction, t)
          numPaymentsSuccessful += 1
        }

      }))
      console.log(`${numUpdatedPledges} pledge(s) updated`)
      console.log(`${numPaymentsSuccessful} payments SUCCESSFUL (confirmations sent)`)
    }

    await transaction.transactionCommit()
  } catch(e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }

  console.log('writing reports...')
  await writeReport(pgdb)
  console.log('done')
}).then( () => {
  process.exit()
}).catch( e => {
  console.log(e)
})
