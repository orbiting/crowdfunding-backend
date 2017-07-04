//
// This script imports a json seed file
// params
//   truncate: truncate tables before import
//   filename: the filenme to import
//
// usage
// cf_server  node seeds/seed.js [--truncate] --filename FILENAME
//

require('dotenv').config()
const PgDb = require('../lib/pgdb')

PgDb.connect().then(async (pgdb) => {
  const argv = require('minimist')(process.argv.slice(2))

  const {filename, truncate} = argv
  if (!filename) { throw new Error('filename must be provided as last argument') }

  const {rewards, crowdfundings} = require('./' + filename).default

  const tableNames = {
    Goodie: 'goodies',
    MembershipType: 'membershipTypes'
  }

  const transaction = await pgdb.transactionBegin()
  const now = new Date()
  try {
    if(truncate) {
      console.log('TRUNCATING tables')
      const tables = [
        'pledges',
        'packages',
        'rewards',
        'crowdfundings'
      ]
      for(let table of tables) {
        await transaction.query(`TRUNCATE TABLE ${table} CASCADE`)
      }
    }

    console.log('Importing...')

    for(let rewardType in rewards) {
      for(let reward of rewards[rewardType]) {
        const newReward = await transaction.public.rewards.insertAndGet({
          type: rewardType,
          createdAt: now,
          updatedAt: now
        })
        const table = transaction.public[tableNames[rewardType]]
        await table.insert(Object.assign({}, reward, {
          rewardId: newReward.id,
          rewardType: newReward.type,
          createdAt: now,
          updatedAt: now
        }))
      }
    }

    for(let crowdfunding of crowdfundings) {
      const newCrowdfunding = await transaction.public.crowdfundings.insertAndGet({
        name: crowdfunding.name,
        beginDate: crowdfunding.beginDate,
        endDate: crowdfunding.endDate,
        createdAt: now,
        updatedAt: now
      })

      for(let goal of crowdfunding.goals) {
        await transaction.public.crowdfundingGoals.insert( Object.assign({}, goal, {
          crowdfundingId: newCrowdfunding.id,
          createdAt: now,
          updatedAt: now
        }))
      }

      for(let pkg of crowdfunding.packages) {
        const newPackage = await transaction.public.packages.insertAndGet({
          name: pkg.name,
          crowdfundingId: newCrowdfunding.id,
          createdAt: now,
          updatedAt: now
        })
        for(let option of pkg.options) {
          let rewardId
          if(option.rewardType || option.rewardName) {
            const table = transaction.public[tableNames[option.rewardType]]
            const rewardEntity = await table.findOne({
              name: option.rewardName
            })
            rewardId = rewardEntity.rewardId
          }
          await transaction.public.packageOptions.insert({
            packageId: newPackage.id,
            rewardId,
            minAmount: option.minAmount,
            maxAmount: option.maxAmount,
            defaultAmount: option.defaultAmount,
            price: option.price,
            userPrice: option.userPrice,
            createdAt: now,
            updatedAt: now
          }, {skipUndefined: true})
        }
      }
    }

    console.log('finished.')
    await transaction.transactionCommit()

  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }
}).then(() => {
  process.exit()
}).catch(e => {
  console.error(e)
  process.exit(1)
})
