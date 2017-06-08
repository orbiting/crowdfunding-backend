//
// This script takes a csv via stdin in the format ((payment)id, hrid)
// and updates the postfinancePayments table
//
// usage
// cf_server  cat script/local/asdf.csv | node script/updatePayments.js
//
require('dotenv').config()

const PgDb = require('../lib/pgdb')
const rw = require('rw')
const {dsvFormat} = require('d3-dsv')
const csvParse = dsvFormat(',').parse

PgDb.connect().then( async (pgdb) => {

  const inputFile = rw.readFileSync('/dev/stdin', 'utf8')
  const input = csvParse(inputFile)

  console.log(input)

  const transaction = await pgdb.transactionBegin()
  try {

    for(let update of input) {
      await pgdb.public.postfinancePayments.updateOne({
        id: update.id
      }, {
        mitteilung: update.mitteilung
      })
    }

    await transaction.transactionCommit()
  } catch(e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }

  console.log('done')
}).then( () => {
  process.exit()
}).catch( e => {
  console.log(e)
})
