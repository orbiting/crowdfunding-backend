//
// This script checks if the sequenceNumber of memeberships are gapless
//
// usage
// cf_server  node script/checkSequence.js


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
