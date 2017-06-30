//
// This script imports additional votings
//
// usage
// cf_server  cat script/data/votings.json | node script/importVotings.js
//

const PgDb = require('../lib/pgdb')
const rw = require('rw')

require('dotenv').config()

PgDb.connect().then(async (pgdb) => {
  const input = JSON.parse(rw.readFileSync('/dev/stdin', 'utf8'))
  if (!input || !input.votings) {
    console.error('input.votings required')
    process.exit(1)
  }
  console.log(`importing new votings...`)

  const transaction = await pgdb.transactionBegin()
  try {
    for (let voting of input.votings) {
      const {name, beginDate, endDate, options} = voting

      const existingVoting = await transaction.public.votings.findOne({name})
      let newVoting

      if (existingVoting) { // update existing
        newVoting = await transaction.public.votings.updateAndGetOne({id: existingVoting.id}, {
          beginDate: beginDate ? new Date(beginDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          updatedAt: new Date()
        }, {skipUndefined: true})
      } else {
        newVoting = await transaction.public.votings.insertAndGet({
          name,
          beginDate: beginDate ? new Date(beginDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        }, {skipUndefined: true})
      }

      for (let option of options) {
        const existingOption = await transaction.public.votingOptions.findOne({
          votingId: newVoting.id,
          name: option.name
        })
        if (!existingOption) {
          await transaction.public.votingOptions.insert({
            votingId: newVoting.id,
            name: option.name
          })
        }
      }
    }

    await transaction.transactionCommit()

    console.log('done! New votings:')
    console.log(await pgdb.public.votings.find({}, {orderBy: ['createdAt desc']}))
  } catch (e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.log(e)
})
