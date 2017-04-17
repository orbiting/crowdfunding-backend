// developed for postfinance exports
// usage: cat data/export_Bewegungen_20170410.csv | node script/matchPayments.js

const PgDb = require('../lib/pgdb')
const rw = require('rw')
const {dsvFormat} = require('d3-dsv')
const csvParse = dsvFormat(';').parse
const csvFormat = dsvFormat(';').format
const {getFormatter} = require('../lib/translate')
const MESSAGES = require('../lib/translations.json').data
const generateMemberships = require('../lib/generateMemberships')
const sendPaymentSuccessful = require('../lib/sendPaymentSuccessful')

const t = getFormatter(MESSAGES)

require('dotenv').config()

const LOG_FAILED_INSERTS = false


getPaymentsInput = (path) => {
  //sanitize input
  //trash first 4 lines as they contain another table with (Buchungsart, Konto, etc)
  //trash rows without gutschrift (such as lastschrift and footer)
  //keys to lower case
  //trash uninteresting columns
  //parse columns
  //extract mitteilung
  const inputFile = rw.readFileSync(path, 'utf8')
  const includeColumns = ['Buchungsdatum', 'Valuta', 'Avisierungstext', 'Gutschrift']
  const parseDate = ['Buchungsdatum', 'Valuta']
  const parseAmount = ['Gutschrift']
  return csvParse( inputFile.split('\n').slice(4).join('\n') )
    .filter( row => row.Gutschrift )
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
                newRow['mitteilung'] = /.*?MITTEILUNGEN:\s(.*?)(\s|$)/g.exec(value)[1]
              } catch(e) {
                console.log("Cloud not extract mitteilung from row:")
                console.log(row)
              }
            }
            newRow[newKey] = value
          }
        }
      })
      return newRow
    })
}

writeReport = async (pgdb) => {
  const unmatched = await pgdb.public.postfinancePayments.find({
    matched: false
  })
  rw.writeFileSync(__dirname+'/data/unmatched.csv', csvFormat(unmatched), 'utf8')
  rw.writeFileSync(__dirname+'/data/unmatched.json', JSON.stringify(unmatched, null, 2), 'utf8')

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
  rw.writeFileSync(__dirname+'/data/investigate_pledges.json', JSON.stringify(investigatePledges, null, 2), 'utf8')
  rw.writeFileSync(__dirname+'/data/overdue_payments.json', JSON.stringify(overduePayments, null, 2), 'utf8')
}


PgDb.connect().then( async (pgdb) => {
  console.log("importing new payments...")

  const paymentsInput = getPaymentsInput('/dev/stdin')

  //insert into db, it it fails, the row exists
  //this could also be done inside of the following transaction,
  //but a insert error aborts it
  const numPFPaymentsBefore = await pgdb.public.postfinancePayments.count()
  await Promise.all(
    paymentsInput.map( payment => {
      return pgdb.public.postfinancePayments.insert(payment)
        .then( v => { return {payment, status: "resolved"} })
        .catch( e => { return {payment, e, status: "rejected"} })
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

  const transaction = await pgdb.transactionBegin()
  try {
    //count
    const numPFPaymentsAfter = await transaction.public.postfinancePayments.count()
    const numNewPayments = numPFPaymentsAfter-numPFPaymentsBefore
    console.log(`${numNewPayments} new payment(s) imported (${numPFPaymentsAfter} total)`)

    //load
    const postfinancePayments = await transaction.public.postfinancePayments.find({
      matched: false
    })
    const payments = await transaction.public.payments.find({
      method: 'PAYMENTSLIP',
      status: 'WAITING'
    })

    //match and update payments
    let matchedPostfinancePaymentIds = []
    const updatedPayments = payments.filter( payment => {
      const pfpayment = postfinancePayments.find( pfp => pfp.mitteilung === payment.hrid )
      if(!pfpayment)
        return null
      matchedPostfinancePaymentIds.push(pfpayment.id)
      payment.status = 'PAID'
      payment.total = pfpayment.gutschrift
      payment.pspPayload = pfpayment.avisierungstext
      return payment
    })
    console.log(`${updatedPayments.length} payment(s) matched`)

    if(updatedPayments.length > 0) {
      await Promise.all(updatedPayments.map( payment => {
        return transaction.public.payments.update({id: payment.id}, payment)
      }))
      await transaction.public.postfinancePayments.update({id: matchedPostfinancePaymentIds}, {matched: true})

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
