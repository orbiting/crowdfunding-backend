//
// This script imports additional crowdfunding goals
//
// usage
// cf_server  cat script/examples/goals.json | node script/importGoals.js
//

const PgDb = require('../lib/pgdb')
const rw = require('rw')

require('dotenv').config()

const CF_NAME = "REPUBLIK"

PgDb.connect().then( async (pgdb) => {
  const input = JSON.parse(rw.readFileSync('/dev/stdin', 'utf8'))
  if(!input || !input.goals) {
    console.error('input.goals required')
    process.exit(1)
  }
  console.log(`importing new goals...`)

  const transaction = await pgdb.transactionBegin()
  try {
    const crowdfundingId = await transaction.public.crowdfundings.findOneFieldOnly({name: CF_NAME}, 'id')

    await Promise.all(input.goals.map( async (goal) => {
      const {people, money, description} = goal

      if(await transaction.public.crowdfundingGoals.count({
        people,
        money,
        'id !=': goal.id
      }, {skipUndefined: true})) {
        console.error(goal)
        throw new Error('a goal already exists with the same number of people and money!')
      }

      if(goal.id) { //update existing
        if(!(await transaction.public.crowdfundingGoals.count({id: goal.id}))) {
          throw new Error('goal referenced by id not found')
        }
        await transaction.public.crowdfundingGoals.update({id: goal.id}, {
          crowdfundingId,
          people,
          money,
          description,
          updatedAt: new Date()
        }, {skipUndefined: true})
      } else {
        await transaction.public.crowdfundingGoals.insert({
          crowdfundingId,
          people,
          money,
          description
        }, {skipUndefined: true})
      }
    }))

    await transaction.transactionCommit()

    console.log('done! New goals:')
    console.log(await pgdb.public.crowdfundingGoals.find({}, {orderBy: ['people asc', 'money asc']}))
  } catch(e) {
    console.log('error in transaction! rolledback!')
    console.log(e)
    await transaction.transactionRollback()
  }
}).then( () => {
  process.exit()
}).catch( e => {
  console.log(e)
})
