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


const PgDb = require('../lib/pgdb')

require('dotenv').config()

PgDb.connect().then( async (pgdb) => {

  let counter = 0
  const memberships = await pgdb.public.memberships.find({}, {orderBy: ['sequenceNumber asc']})
  for(let membership of memberships) {
    counter += 1
    if(membership.sequenceNumber !== counter) {
      console.log(counter)
      console.log(membership)
      counter = membership.sequenceNumber
    }
  }

  console.log('done')
}).then( () => {
  process.exit()
}).catch( e => {
  console.log(e)
})
