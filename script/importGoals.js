//
// This script imports additional crowdfunding goals
//
// usage
// cf_server  cat script/examples/goals.json | node script/importGoals.js
//

const PgDb = require('../lib/pgdb')
const rw = require('rw')

require('dotenv').config()

const CF_NAME = 'REPUBLIK'

PgDb.connect().then(async (pgdb) => {
  const input = JSON.parse(rw.readFileSync('/dev/stdin', 'utf8'))
  if (!input || !input.goals) {
    console.error('input.goals required')
    process.exit(1)
  }
  console.log(`importing new goals...`)

  const transaction = await pgdb.transactionBegin()
  try {
    const crowdfundingId = await transaction.public.crowdfundings.findOneFieldOnly({name: CF_NAME}, 'id')

    for (let goal of input.goals) {
      const {name, people, money, description} = goal

      const existingGoal = await transaction.public.crowdfundingGoals.findOne({name})

      if (existingGoal) { // update existing
        await transaction.public.crowdfundingGoals.update({id: existingGoal.id}, {
          people,
          money,
          description,
          updatedAt: new Date()
        }, {skipUndefined: true})
      } else {
        await transaction.public.crowdfundingGoals.insert({
          crowdfundingId,
          name,
          people,
          money,
          description
        }, {skipUndefined: true})
      }
    }

    await transaction.transactionCommit()

    console.log('done! New goals:')
    console.log(await pgdb.public.crowdfundingGoals.find({}, {orderBy: ['people asc', 'money asc']}))
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
